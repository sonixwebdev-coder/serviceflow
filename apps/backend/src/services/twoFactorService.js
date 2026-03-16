const { generateSecret, generateURI, verifySync } = require('otplib');
const QRCode = require('qrcode');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../../lib/prisma');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

const APP_NAME = 'ForjaIt';
const BACKUP_CODE_COUNT = 8;
const MAX_2FA_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Generate a new TOTP setup for a user (secret + QR code).
 * Does NOT enable 2FA — the user must verify a code first.
 */
async function generateSetup(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, twoFactorEnabled: true } });
  if (!user) throw new AppError('User not found', 404);
  if (user.twoFactorEnabled) throw new AppError('2FA este deja activat', 400);

  const secret = generateSecret();

  // Store the secret (unverified) so we can verify the code later
  await prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } });

  const otpauthUrl = generateURI({ strategy: 'totp', label: user.email, issuer: APP_NAME, secret });
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  return { secret, qrCodeDataUrl, otpauthUrl };
}

/**
 * Verify a TOTP code against the stored secret and enable 2FA.
 * Returns backup codes (shown once).
 */
async function verifyAndEnable(userId, token) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  });

  if (!user) throw new AppError('User not found', 404);
  if (user.twoFactorEnabled) throw new AppError('2FA este deja activat', 400);
  if (!user.twoFactorSecret) throw new AppError('Initializeaza setup-ul 2FA mai intai', 400);

  const isValid = verifySync({ token, secret: user.twoFactorSecret }).valid;
  if (!isValid) throw new AppError('Codul este invalid. Incearca din nou.', 400);

  // Generate backup codes
  const backupCodes = generateBackupCodes();
  const hashedCodes = await Promise.all(
    backupCodes.map(async (code) => ({
      hash: await bcrypt.hash(code, 10),
      used: false,
    }))
  );

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: true,
      twoFactorBackupCodes: hashedCodes,
      twoFactorFailedAttempts: 0,
    },
  });

  return { backupCodes };
}

/**
 * Verify a TOTP code or backup code during login.
 * Includes replay prevention and failed-attempt lockout.
 * Returns true if valid.
 */
async function verifyToken(userId, token) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      twoFactorSecret: true,
      twoFactorEnabled: true,
      twoFactorBackupCodes: true,
      twoFactorLastUsedAt: true,
      twoFactorFailedAttempts: true,
      lockedUntil: true,
    },
  });

  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    throw new AppError('2FA nu este activat', 400);
  }

  // Check if account is locked from too many failed 2FA attempts
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil - new Date()) / 60000);
    throw new AppError(
      `Contul este blocat temporar. Incercati din nou in ${minutesLeft} minute.`,
      429
    );
  }

  // Try TOTP first
  if (verifySync({ token, secret: user.twoFactorSecret }).valid) {
    // Replay prevention: reject if the same TOTP window was already used
    const currentWindow = Math.floor(Date.now() / 30000);
    const lastUsedWindow = user.twoFactorLastUsedAt
      ? Math.floor(new Date(user.twoFactorLastUsedAt).getTime() / 30000)
      : -1;

    if (currentWindow === lastUsedWindow) {
      throw new AppError('Codul a fost deja utilizat. Asteapta urmatorul cod.', 400);
    }

    // Mark TOTP as used and reset failed attempts
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorLastUsedAt: new Date(),
        twoFactorFailedAttempts: 0,
      },
    });
    return true;
  }

  // Try backup codes
  const backupCodes = user.twoFactorBackupCodes || [];
  for (let i = 0; i < backupCodes.length; i++) {
    if (backupCodes[i].used) continue;
    const match = await bcrypt.compare(token, backupCodes[i].hash);
    if (match) {
      // Mark backup code as used and reset failed attempts
      backupCodes[i].used = true;
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorBackupCodes: backupCodes,
          twoFactorFailedAttempts: 0,
        },
      });
      return true;
    }
  }

  // Invalid code — increment failed attempts and potentially lock account
  const attempts = (user.twoFactorFailedAttempts || 0) + 1;
  const updateData = { twoFactorFailedAttempts: attempts };

  if (attempts >= MAX_2FA_FAILED_ATTEMPTS) {
    updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    logger.warn(`Account locked after ${attempts} failed 2FA attempts`, { userId });
  }

  await prisma.user.update({ where: { id: userId }, data: updateData });

  throw new AppError('Codul este invalid', 400);
}

/**
 * Disable 2FA for a user. Requires password + TOTP verification.
 */
async function disable(userId, password, token) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true, twoFactorSecret: true, twoFactorEnabled: true },
  });

  if (!user) throw new AppError('User not found', 404);
  if (!user.twoFactorEnabled) throw new AppError('2FA nu este activat', 400);

  const passwordValid = await bcrypt.compare(password, user.password);
  if (!passwordValid) throw new AppError('Parola incorecta', 400);

  const tokenValid = verifySync({ token, secret: user.twoFactorSecret }).valid;
  if (!tokenValid) throw new AppError('Codul 2FA este invalid', 400);

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null,
      twoFactorLastUsedAt: null,
      twoFactorFailedAttempts: 0,
    },
  });

  return { success: true };
}

/**
 * Generate random backup codes.
 */
function generateBackupCodes() {
  const codes = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    // 8-char alphanumeric codes, formatted as xxxx-xxxx
    const raw = crypto.randomBytes(4).toString('hex');
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
  }
  return codes;
}

module.exports = {
  generateSetup,
  verifyAndEnable,
  verifyToken,
  disable,
};

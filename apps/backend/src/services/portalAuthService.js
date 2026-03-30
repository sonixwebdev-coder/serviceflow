const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');
const { signAccessToken, verifyAccessToken, generateRefreshToken, REFRESH_TOKEN_TTL_DAYS } = require('../utils/token');
const { getSectorConfig } = require('../constants/activitySectors');
const { sendPasswordResetEmail, sendWelcomeEmail, sendVerificationEmail } = require('./email/emailService');
const { getCompanySettings } = require('./companySettingService');

const SALT_ROUNDS = 10;

/**
 * Build a minimal client response for auth endpoints (login/refresh).
 * Only includes fields the portal frontend actually uses.
 * Sensitive/unused fields (phone, organizationId, org.id, org.slug, org.activitySector) are excluded.
 */
const buildClientResponse = (client, sectorConfig) => ({
  id: client.id,
  firstName: client.firstName,
  lastName: client.lastName,
  companyName: client.companyName,
  email: client.email,
  type: client.type,
  organization: {
    name: client.organization?.name || null,
    sectorConfig,
  },
});

/**
 * Hash a password
 */
const hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Verify a password
 */
const verifyPassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

/**
 * Generate a secure token
 */
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Register a new client account
 */
const registerClient = async (prisma, { email, password, clientId, referralCode }) => {
  // Check if client exists
  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });

  if (!client) {
    throw new AppError('Clientul nu a fost gasit', 404);
  }

  // Check if account already exists
  const existingAccount = await prisma.clientAccount.findFirst({
    where: {
      OR: [
        { email: email.toLowerCase() },
        { clientId },
      ],
    },
  });

  if (existingAccount) {
    if (existingAccount.clientId === clientId) {
      throw new AppError('Acest client are deja un cont', 400);
    }
    throw new AppError('Un cont cu aceasta adresa de email exista deja', 400);
  }

  const hashedPassword = await hashPassword(password);
  const verificationToken = generateToken();

  const account = await prisma.clientAccount.create({
    data: {
      clientId,
      email: email.toLowerCase(),
      password: hashedPassword,
      verificationToken,
    },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyName: true,
          type: true,
          organizationId: true,
        },
      },
    },
  });

  // Process referral if code provided (fire-and-forget)
  if (referralCode && account.client?.organizationId) {
    try {
      const loyaltyService = require('./loyaltyService');
      loyaltyService.processReferral(prisma, {
        newClientId: clientId,
        referralCode,
        organizationId: account.client.organizationId,
      });
    } catch (err) {
      logger.error('[LOYALTY] Failed to process referral:', err.message);
    }
  }

  // Send verification email (fire-and-forget)
  if (account.client?.organizationId) {
    const orgSlug = await prisma.organization.findUnique({
      where: { id: account.client.organizationId },
      select: { slug: true },
    });
    const portalUrl = process.env.CLIENT_PORTAL_URL || process.env.PORTAL_URL || 'http://localhost:5174';
    const verificationLink = `${portalUrl}/${orgSlug?.slug || ''}/verify-email?token=${verificationToken}`;

    const clientName = account.client.type === 'SRL'
      ? account.client.companyName
      : `${account.client.firstName || ''} ${account.client.lastName || ''}`.trim() || 'Client';

    getCompanySettings(account.client.organizationId).then((companySettings) => {
      sendVerificationEmail(prisma, {
        email: email.toLowerCase(),
        clientName,
        verificationLink,
        companySettings,
        organizationId: account.client.organizationId,
      }).catch((err) => logger.error('[EMAIL] Verification email failed:', err.message));
    }).catch(() => {});
  }

  return {
    id: account.id,
    email: account.email,
    isVerified: account.isVerified,
    client: account.client,
  };
};

/**
 * Login a client
 */
const loginClient = async (prisma, { email, password, userAgent, ipAddress }) => {
  const account = await prisma.clientAccount.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyName: true,
          type: true,
          email: true,
          phone: true,
          organizationId: true,
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              activitySector: true,
              settings: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!account) {
    throw new AppError('Email sau parola invalide', 401);
  }

  // Check if account is locked (brute-force protection)
  if (account.lockedUntil && account.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((account.lockedUntil - new Date()) / 60000);
    throw new AppError(
      `Contul este blocat temporar. Incercati din nou in ${minutesLeft} minute.`,
      429,
      null,
      'ACCOUNT_LOCKED'
    );
  }

  const isValid = await verifyPassword(password, account.password);
  if (!isValid) {
    // Increment failed attempts, lock after 5 consecutive failures
    const attempts = (account.failedLoginAttempts || 0) + 1;
    const updateData = { failedLoginAttempts: attempts };

    if (attempts >= 5) {
      updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      logger.warn(`Client account locked after ${attempts} failed attempts`, { email });
    }

    prisma.clientAccount.update({ where: { id: account.id }, data: updateData }).catch(() => {});
    throw new AppError('Email sau parola invalide', 401);
  }

  // Reset failed attempts on successful login
  if (account.failedLoginAttempts > 0 || account.lockedUntil) {
    prisma.clientAccount.update({
      where: { id: account.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    }).catch(() => {});
  }

  // Check email verification
  if (!account.isVerified) {
    throw new AppError('Adresa de email nu a fost verificata. Verificati email-ul pentru linkul de confirmare.', 403, null, 'EMAIL_NOT_VERIFIED');
  }

  // Check organization status
  const orgStatus = account.client?.organization?.status;
  if (orgStatus === 'SUSPENDED' || orgStatus === 'CANCELLED') {
    throw new AppError('Organizatia nu este activa in acest moment', 403);
  }

  // Create JWT access token with client-specific payload
  const payload = {
    sub: account.id,
    clientId: account.client.id,
    email: account.email,
    organizationId: account.client.organizationId,
    type: 'client', // Distinguish from CRM user tokens
  };

  const accessToken = signAccessToken(payload);
  const { token: refreshToken, expiresAt } = generateRefreshToken();

  // Store refresh token in database
  await prisma.clientRefreshToken.create({
    data: {
      accountId: account.id,
      token: refreshToken,
      expiresAt,
      userAgent,
      ipAddress,
    },
  });

  // Update last login
  await prisma.clientAccount.update({
    where: { id: account.id },
    data: { lastLoginAt: new Date() },
  });

  // Get sector configuration from activity sector
  const activitySector = account.client.organization?.activitySector;
  const sectorConfig = getSectorConfig(activitySector);

  return {
    accessToken,
    refreshToken,
    client: buildClientResponse(account.client, sectorConfig),
  };
};

/**
 * Logout a client - revokes refresh token
 */
const logoutClient = async (prisma, refreshToken) => {
  await prisma.clientRefreshToken.updateMany({
    where: { token: refreshToken, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return { success: true };
};

/**
 * Refresh client session - returns new access token and rotates refresh token
 */
const refreshClientSession = async (prisma, { token, userAgent, ipAddress }) => {
  const stored = await prisma.clientRefreshToken.findUnique({
    where: { token },
    include: {
      account: {
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              type: true,
              email: true,
              phone: true,
              organizationId: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  activitySector: true,
                  settings: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new AppError('Token de reimprospatare invalid sau expirat', 401);
  }

  // Create new JWT access token
  const payload = {
    sub: stored.account.id,
    clientId: stored.account.client.id,
    email: stored.account.email,
    organizationId: stored.account.client.organizationId,
    type: 'client',
  };

  const accessToken = signAccessToken(payload);
  const { token: newRefreshToken, expiresAt } = generateRefreshToken();

  // Atomic token rotation - revoke old + create new in single transaction
  await prisma.$transaction([
    prisma.clientRefreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    }),
    prisma.clientRefreshToken.create({
      data: {
        accountId: stored.account.id,
        token: newRefreshToken,
        expiresAt,
        userAgent,
        ipAddress,
      },
    }),
  ]);

  // Get sector configuration from activity sector
  const activitySector = stored.account.client.organization?.activitySector;
  const sectorConfig = getSectorConfig(activitySector);

  return {
    accessToken,
    refreshToken: newRefreshToken,
    client: buildClientResponse(stored.account.client, sectorConfig),
  };
};

/**
 * Verify email
 */
const verifyEmail = async (prisma, verificationToken) => {
  const account = await prisma.clientAccount.findFirst({
    where: { verificationToken },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyName: true,
          email: true,
          type: true,
          organizationId: true,
        },
      },
    },
  });

  if (!account) {
    throw new AppError('Token de verificare invalid', 400);
  }

  await prisma.clientAccount.update({
    where: { id: account.id },
    data: {
      isVerified: true,
      verificationToken: null,
    },
  });

  // Send welcome email after verification (fire-and-forget)
  if (account.client?.email && account.client?.organizationId) {
    getCompanySettings(account.client.organizationId).then((companySettings) => {
      sendWelcomeEmail(prisma, {
        client: account.client,
        companySettings,
        organizationId: account.client.organizationId,
      }).catch((err) => logger.error('[EMAIL] Post-verification welcome email failed:', err.message));
    }).catch(() => {});
  }

  return { success: true };
};

/**
 * Request password reset
 */
const requestPasswordReset = async (prisma, email, organizationSlug) => {
  const account = await prisma.clientAccount.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      client: true,
    },
  });

  if (!account) {
    // Don't reveal if account exists
    return { success: true };
  }

  const resetToken = generateToken();
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.clientAccount.update({
    where: { id: account.id },
    data: {
      resetToken,
      resetTokenExpiry,
    },
  });

  // Get organization settings for email branding
  const organization = await prisma.organization.findFirst({
    where: { slug: organizationSlug },
    select: {
      id: true,
      name: true,
      settings: true,
    },
  });

  // Build reset link
  const portalUrl = process.env.CLIENT_PORTAL_URL || process.env.PORTAL_URL || 'http://localhost:5174';
  const resetLink = `${portalUrl}/${organizationSlug}/reset-password?token=${resetToken}`;

  // Get client name
  const client = account.client;
  const clientName = client?.type === 'SRL'
    ? client.companyName
    : `${client?.firstName || ''} ${client?.lastName || ''}`.trim() || 'Client';

  // Send password reset email
  try {
    await sendPasswordResetEmail(prisma, {
      email: account.email,
      clientName,
      resetLink,
      expiresIn: '1 ora',
      companySettings: {
        name: organization?.name || 'ForjaIt',
        phone: organization?.settings?.phone,
      },
      organizationId: organization?.id,
    });
    logger.info(`Password reset email sent to ${email}`);
  } catch (emailError) {
    logger.error(`Failed to send password reset email to ${email}:`, emailError);
    // Don't fail the request if email fails
  }

  return { success: true };
};

/**
 * Reset password
 */
const resetPassword = async (prisma, { resetToken, newPassword }) => {
  const account = await prisma.clientAccount.findFirst({
    where: {
      resetToken,
      resetTokenExpiry: { gt: new Date() },
    },
  });

  if (!account) {
    throw new AppError('Token de resetare invalid sau expirat', 400);
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.clientAccount.update({
    where: { id: account.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  // Revoke all refresh tokens
  await prisma.clientRefreshToken.updateMany({
    where: { accountId: account.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  // Invalidate all sessions
  await prisma.clientSession.deleteMany({
    where: { accountId: account.id },
  });

  return { success: true };
};

/**
 * Verify JWT access token and get account/client data
 */
const getAccountByToken = async (prisma, accessToken) => {
  try {
    // Verify the JWT token
    const payload = verifyAccessToken(accessToken);

    // Ensure this is a client token
    if (!payload || payload.type !== 'client' || !payload.clientId) {
      return null;
    }

    // Fetch the account and client data
    const account = await prisma.clientAccount.findUnique({
      where: { id: payload.sub },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            type: true,
            email: true,
            phone: true,
            organizationId: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                activitySector: true,
                settings: true,
              },
            },
          },
        },
      },
    });

    if (!account || !account.client) {
      return null;
    }

    // Get sector configuration from activity sector
    const activitySector = account.client.organization?.activitySector;
    const sectorConfig = getSectorConfig(activitySector);

    return {
      account: {
        id: account.id,
        email: account.email,
        isVerified: account.isVerified,
      },
      client: {
        ...account.client,
        organization: {
          id: account.client.organization?.id,
          name: account.client.organization?.name,
          slug: account.client.organization?.slug,
          activitySector,
          sectorConfig,
        },
      },
    };
  } catch (error) {
    // Token verification failed (expired, invalid, etc.)
    return null;
  }
};

/**
 * Change password
 */
const changePassword = async (prisma, { accountId, currentPassword, newPassword }) => {
  const account = await prisma.clientAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new AppError('Contul nu a fost gasit', 404);
  }

  const isValid = await verifyPassword(currentPassword, account.password);
  if (!isValid) {
    throw new AppError('Parola curenta este incorecta', 400);
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.clientAccount.update({
    where: { id: accountId },
    data: { password: hashedPassword },
  });

  // Revoke all refresh tokens (force re-login on other devices)
  await prisma.clientRefreshToken.updateMany({
    where: { accountId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return { success: true };
};

module.exports = {
  registerClient,
  loginClient,
  logoutClient,
  refreshClientSession,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  getAccountByToken,
  changePassword,
  hashPassword,
  verifyPassword,
  generateToken,
};

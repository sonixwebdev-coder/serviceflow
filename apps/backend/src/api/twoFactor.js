const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const { verifyAccessToken } = require('../utils/token');
const { signAccessToken, generateRefreshToken } = require('../utils/token');
const { AppError } = require('../utils/errors');
const { ok } = require('../utils/http');
const { setRefreshCookie } = require('../utils/cookies');
const twoFactorService = require('../services/twoFactorService');
const prisma = require('../../lib/prisma');

const router = express.Router();

/** Reusable role include — same as authService */
const authRoleInclude = {
  roles: { include: { role: { select: { id: true, key: true, name: true } } } },
};

// --- Authenticated routes ---

// GET /auth/2fa/status
router.get('/status', authenticate, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { twoFactorEnabled: true },
  });
  return ok(res, { enabled: user?.twoFactorEnabled || false });
}));

// POST /auth/2fa/setup — returns QR code + secret
router.post('/setup', authenticate, asyncHandler(async (req, res) => {
  const result = await twoFactorService.generateSetup(req.user.id);
  return ok(res, result);
}));

// POST /auth/2fa/verify-setup — enables 2FA after verifying code
router.post('/verify-setup', authenticate, asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code) throw new AppError('Codul este obligatoriu', 400);
  const result = await twoFactorService.verifyAndEnable(req.user.id, code.replace(/\s/g, ''));
  return ok(res, result, '2FA activat cu succes');
}));

// POST /auth/2fa/disable — disables 2FA (requires password + TOTP)
router.post('/disable', authenticate, asyncHandler(async (req, res) => {
  const { password, code } = req.body;
  if (!password || !code) throw new AppError('Parola si codul sunt obligatorii', 400);
  await twoFactorService.disable(req.user.id, password, code.replace(/\s/g, ''));
  return ok(res, { success: true }, '2FA dezactivat cu succes');
}));

// --- Unauthenticated login-time route ---

// POST /auth/2fa/verify — verifies TOTP during login, returns access+refresh tokens
router.post('/verify', asyncHandler(async (req, res) => {
  const { tempToken, code } = req.body;
  if (!tempToken || !code) throw new AppError('Token-ul temporar si codul sunt obligatorii', 400);

  // Verify the temp token
  let payload;
  try {
    payload = verifyAccessToken(tempToken);
  } catch {
    throw new AppError('Token-ul temporar este invalid sau expirat', 401);
  }

  if (payload.purpose !== '2fa') {
    throw new AppError('Token invalid', 401);
  }

  // Verify the TOTP code
  await twoFactorService.verifyToken(payload.sub, code.replace(/\s/g, ''));

  // Fetch user for token generation
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: {
      organization: { select: { status: true } },
      ...authRoleInclude,
    },
  });

  if (!user || !user.isActive) {
    throw new AppError('User not found or inactive', 401);
  }

  // Generate full auth tokens
  const tokenPayload = {
    sub: user.id,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    roles: user.roles.map((assignment) => assignment.role.key),
    organizationId: user.organizationId,
  };

  const accessToken = signAccessToken(tokenPayload);
  const { token: refreshToken, expiresAt } = generateRefreshToken();

  await prisma.refreshToken.create({
    data: { userId: user.id, token: refreshToken, expiresAt },
  });

  // Map user for response (same shape as authService)
  const primaryRole = user.roles?.[0]?.role?.key || user.role || null;
  const mappedRoles = user.roles.map((assignment) => ({
    id: assignment.roleId || assignment.id,
    key: assignment.role?.key || null,
    name: assignment.role?.name || null,
  }));

  const mappedUser = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: primaryRole,
    roles: mappedRoles,
    isActive: user.isActive,
    isSuperAdmin: user.isSuperAdmin || false,
    orgStatus: user.organization?.status || null,
  };

  const cookieName = req.body.context === 'admin' ? 'sf_admin_refresh' : 'sf_refresh';
  setRefreshCookie(res, refreshToken, cookieName);

  return ok(res, { user: mappedUser, accessToken }, '2FA verificat cu succes');
}));

module.exports = router;

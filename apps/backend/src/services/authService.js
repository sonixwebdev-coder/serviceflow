const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../../lib/prisma');
const { AppError } = require('../utils/errors');
const { signAccessToken, generateRefreshToken } = require('../utils/token');
const { sendCrmPasswordResetEmail } = require('./email/emailService');
const cache = require('../utils/cache');
const logger = require('../utils/logger');

/** Reusable role include — only fetches fields mapAuthUser actually uses */
const authRoleInclude = {
  roles: { include: { role: { select: { id: true, key: true, name: true } } } },
};

/**
 * Generate a secure token
 */
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Map user data for auth responses (login/refresh).
 * Returns ONLY the fields the frontend actually uses.
 * Sensitive/unused fields (hourlyRate, dateOfBirth, leaveBalance, permissions, etc.)
 * are excluded to minimize data exposure.
 */
const mapAuthUser = (user) => {
  if (!user) return null;

  const primaryRole = user.roles?.[0]?.role?.key || user.role || null;
  const mappedRoles = user.roles
    ? user.roles.map((assignment) => ({
        id: assignment.roleId || assignment.id,
        key: assignment.role?.key || null,
        name: assignment.role?.name || null,
      }))
    : [];

  return {
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
};

const loginUser = async ({ email, password, context }) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      organization: { select: { status: true } },
      ...authRoleInclude,
    },
  });

  // Return same error for non-existent or inactive accounts to prevent enumeration
  if (!user || !user.isActive) {
    throw new AppError('Invalid credentials', 401);
  }

  // Check if account is locked (brute-force protection)
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil - new Date()) / 60000);
    throw new AppError(
      `Contul este blocat temporar. Incercati din nou in ${minutesLeft} minute.`,
      429,
      null,
      'ACCOUNT_LOCKED'
    );
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    // Increment failed attempts, lock after 5 consecutive failures
    const attempts = (user.failedLoginAttempts || 0) + 1;
    const updateData = { failedLoginAttempts: attempts };

    if (attempts >= 5) {
      updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
      logger.warn(`Account locked after ${attempts} failed attempts`, { email, userId: user.id });
    }

    prisma.user.update({ where: { id: user.id }, data: updateData }).catch(() => {});
    throw new AppError('Invalid credentials', 401);
  }

  // Reset failed attempts on successful login
  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    }).catch(() => {});
  }

  // Context-based login separation
  if (context === 'admin' && !user.isSuperAdmin) {
    throw new AppError('Acces interzis: nu esti super admin', 403);
  }
  if (context === 'crm' && user.isSuperAdmin) {
    throw new AppError('Acest cont nu poate fi folosit aici', 403);
  }

  // Check organization status for non-super-admin users
  if (!user.isSuperAdmin && user.organization) {
    const orgStatus = user.organization.status;
    if (orgStatus === 'SUSPENDED' || orgStatus === 'CANCELLED') {
      const isAdmin = user.roles?.some((r) => r.role?.key === 'admin');
      if (isAdmin) {
        throw new AppError(
          'Organizatia dvs. a fost dezactivata. Contactati suportul pentru reactivare.',
          403,
          null,
          'ORG_DEACTIVATED_ADMIN'
        );
      } else {
        throw new AppError(
          'Organizatia dvs. a fost dezactivata. Contactati administratorul organizatiei.',
          403,
          null,
          'ORG_DEACTIVATED'
        );
      }
    }
  }

  // Track last login time (fire-and-forget)
  prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {});

  // If 2FA is enabled, return a short-lived temp token instead of full session
  if (user.twoFactorEnabled) {
    const tempToken = signAccessToken(
      { sub: user.id, purpose: '2fa' },
      { expiresIn: '5m' }
    );
    return { requiresTwoFactor: true, tempToken };
  }

  const tokenType = context || (user.isSuperAdmin ? 'admin' : 'crm');

  const payload = {
    sub: user.id,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    roles: user.roles.map((assignment) => assignment.role.key),
    organizationId: user.organizationId,
    type: tokenType,
  };

  const accessToken = signAccessToken(payload);
  const { token: refreshToken, expiresAt } = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt,
      context: tokenType,
    },
  });

  return {
    user: mapAuthUser(user),
    accessToken,
    refreshToken,
  };
};

const refreshSession = async ({ token }) => {
  const stored = await prisma.refreshToken.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          organization: { select: { status: true } },
          ...authRoleInclude,
        },
      },
    },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new AppError('Invalid refresh token', 401);
  }

  // Reject refresh for deactivated users
  if (!stored.user.isActive) {
    // Revoke the token so it can't be retried
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    throw new AppError('Contul este dezactivat', 401);
  }

  // Reject refresh for suspended/cancelled organizations
  if (!stored.user.isSuperAdmin && stored.user.organization) {
    const orgStatus = stored.user.organization.status;
    if (orgStatus === 'SUSPENDED' || orgStatus === 'CANCELLED') {
      await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
      throw new AppError('Organizatia nu este activa', 403);
    }
  }

  // Preserve token type from the stored refresh token, or infer from user
  const tokenType = stored.context || (stored.user.isSuperAdmin ? 'admin' : 'crm');

  const payload = {
    sub: stored.user.id,
    email: stored.user.email,
    name: `${stored.user.firstName} ${stored.user.lastName}`,
    roles: stored.user.roles.map((assignment) => assignment.role.key),
    organizationId: stored.user.organizationId,
    type: tokenType,
  };

  const accessToken = signAccessToken(payload);
  const { token: nextToken, expiresAt } = generateRefreshToken();

  // Batch revoke old + create new token in a single transaction
  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    }),
    prisma.refreshToken.create({
      data: {
        userId: stored.user.id,
        token: nextToken,
        expiresAt,
        context: tokenType,
      },
    }),
  ]);

  return {
    user: mapAuthUser(stored.user),
    accessToken,
    refreshToken: nextToken,
  };
};

const revokeRefreshToken = async ({ token }) => {
  await prisma.refreshToken.updateMany({
    where: { token, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

/**
 * Request password reset for CRM user - sends email with reset link
 * Uses system-level email template (not customizable by org admins)
 */
const requestPasswordReset = async (email) => {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          settings: true,
        },
      },
    },
  });

  if (!user) {
    // Don't reveal if account exists
    return { success: true };
  }

  const resetToken = generateToken();
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken,
      resetTokenExpiry,
    },
  });

  // Build reset link
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

  // Get user name
  const userName = `${user.firstName} ${user.lastName}`.trim();

  // Send CRM password reset email (system-level, not customizable by org admins)
  try {
    await sendCrmPasswordResetEmail({
      email: user.email,
      userName,
      resetLink,
      expiresIn: '1 ora',
    });
    logger.info(`Password reset email sent to CRM user ${email}`);
  } catch (emailError) {
    logger.error(`Failed to send password reset email to CRM user ${email}:`, emailError);
    // Don't fail the request if email fails
  }

  return { success: true };
};

/**
 * Reset password with token
 */
const resetPassword = async ({ resetToken, newPassword }) => {
  const user = await prisma.user.findFirst({
    where: {
      resetToken,
      resetTokenExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  const hash = await bcrypt.hash(newPassword, parseInt(process.env.HASH_SALT_ROUNDS || '10', 10));

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hash,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  // Invalidate all refresh tokens for this user
  await prisma.refreshToken.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  // Clear auth cache so existing access tokens are re-validated
  await cache.del(`auth:${user.id}`);

  return { success: true };
};

module.exports = {
  loginUser,
  refreshSession,
  revokeRefreshToken,
  requestPasswordReset,
  resetPassword,
};

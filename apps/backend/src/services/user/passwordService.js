const bcrypt = require('bcryptjs');
const { AppError } = require('../../utils/errors');
const cache = require('../../utils/cache');
const logger = require('../../utils/logger');

/**
 * Change a user's password after verifying the current password.
 * Failed attempts are rate-limited and successful changes revoke refresh tokens.
 */
const changePassword = async (prisma, userId, { currentPassword, newPassword }) => {
  const lockoutKey = `password_lockout:${userId}`;
  const failedAttemptsKey = `password_failed:${userId}`;

  const lockoutExpiry = await cache.get(lockoutKey);
  if (lockoutExpiry) {
    const remainingTime = Math.ceil((lockoutExpiry - Date.now()) / 60000);
    logger.warn('Password change blocked - account locked', {
      userId,
      remainingMinutes: remainingTime,
    });
    throw new AppError(
      `Account temporarily locked due to multiple failed attempts. Try again in ${remainingTime} minutes.`,
      429
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      password: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });

  // Always compare against a real hash so missing users do not have a faster path.
  const dummyHash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU0qKFXhQ2me';
  const isMatch = await bcrypt.compare(currentPassword, user ? user.password : dummyHash);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (!isMatch) {
    const failedAttempts = (await cache.get(failedAttemptsKey)) || 0;
    const nextAttempt = failedAttempts + 1;

    logger.warn('Failed password change attempt', {
      userId,
      email: user.email,
      attempt: nextAttempt,
      maxAttempts: 5,
    });

    if (nextAttempt >= 5) {
      const lockoutExpires = Date.now() + 15 * 60 * 1000;
      await cache.set(lockoutKey, lockoutExpires, 15 * 60);
      await cache.del(failedAttemptsKey);
      logger.error('Account locked due to failed password change attempts', {
        userId,
        email: user.email,
        failedAttempts: 5,
      });
      throw new AppError('Too many failed attempts. Account locked for 15 minutes.', 429);
    }

    await cache.set(failedAttemptsKey, nextAttempt, 60 * 60);
    throw new AppError('Current password is incorrect', 401);
  }

  await cache.del(failedAttemptsKey);

  const hash = await bcrypt.hash(newPassword, parseInt(process.env.HASH_SALT_ROUNDS || '10', 10));
  await prisma.user.update({
    where: { id: userId },
    data: { password: hash },
  });

  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await cache.del(cache.userWithRolesKey(userId));
  logger.info(`Password changed successfully for user ${userId} (${user.email})`);

  return { message: 'Password changed successfully' };
};

module.exports = { changePassword };

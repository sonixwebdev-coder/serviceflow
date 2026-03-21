const prisma = require('../../lib/prisma');
const { verifyAccessToken } = require('../utils/token');
const { AppError } = require('../utils/errors');
const cache = require('../utils/cache');

const AUTH_CACHE_TTL = cache.TTL.SHORT; // 60 seconds

const fetchUserForAuth = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      organization: {
        select: { id: true, status: true, trialEndsAt: true },
      },
      roles: {
        select: {
          role: {
            select: {
              key: true,
              permissions: {
                select: {
                  permission: {
                    select: { key: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user || !user.isActive) return null;

  const roles = user.roles.map((assignment) => assignment.role.key);

  // Collect unique permissions from all assigned roles
  const permissionSet = new Set();
  for (const assignment of user.roles) {
    for (const rp of assignment.role.permissions) {
      permissionSet.add(rp.permission.key);
    }
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    organizationId: user.organizationId,
    orgStatus: user.organization?.status,
    orgTrialEndsAt: user.organization?.trialEndsAt,
    roles,
    permissions: Array.from(permissionSet),
  };
};

const authenticate = async (req, res, next) => {
  try {
    const header = req.header('Authorization');

    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError('No authentication token provided', 401);
    }

    const token = header.replace('Bearer ', '');
    const payload = verifyAccessToken(token);

    // Reject non-CRM tokens (e.g. admin tokens) from CRM routes
    if (payload.type && payload.type !== 'crm') {
      throw new AppError('Token invalid pentru aceasta aplicatie', 401);
    }

    // Check if token was revoked (logout)
    if (await cache.isTokenBlacklisted(token)) {
      throw new AppError('Token revoked', 401);
    }

    const cacheKey = `auth:${payload.sub}`;
    const userData = await cache.wrap(
      cacheKey,
      () => fetchUserForAuth(payload.sub),
      AUTH_CACHE_TTL
    );

    if (!userData) {
      throw new AppError('User not found or inactive', 401);
    }

    if (!userData.orgStatus || userData.orgStatus === 'SUSPENDED' || userData.orgStatus === 'CANCELLED') {
      throw new AppError('Organization is not active', 403);
    }

    // Lazy trial expiry: transition expired TRIAL → PAYMENT_REQUIRED
    if (userData.orgStatus === 'TRIAL' && userData.orgTrialEndsAt && new Date() > new Date(userData.orgTrialEndsAt)) {
      await prisma.organization.update({
        where: { id: userData.organizationId },
        data: { status: 'PAYMENT_REQUIRED' },
      });
      userData.orgStatus = 'PAYMENT_REQUIRED';
      // Invalidate cached auth data so next request gets fresh status
      await cache.del(cacheKey);
    }

    // PAYMENT_REQUIRED: restrict to billing, settings, auth, and user profile routes
    if (userData.orgStatus === 'PAYMENT_REQUIRED') {
      const allowedPrefixes = ['/api/billing', '/api/settings', '/api/auth', '/api/users/me', '/api/organizations/me'];
      const isAllowed = allowedPrefixes.some(p => req.originalUrl.startsWith(p));
      if (!isAllowed) {
        return res.status(402).json({
          error: 'Plata necesara',
          code: 'PAYMENT_REQUIRED',
          message: 'Abonamentul a expirat. Actualizeaza facturarea pentru a continua.',
        });
      }
    }

    req.user = {
      id: userData.id,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      name: `${userData.firstName} ${userData.lastName}`,
      organizationId: userData.organizationId,
      orgStatus: userData.orgStatus,
      roles: userData.roles,
      permissions: userData.permissions || [],
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new AppError(error.message, 401));
    }
    next(error);
  }
};

module.exports = authenticate;

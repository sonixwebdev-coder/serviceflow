const { getAccountByToken } = require('../services/portalAuthService');
const { verifyAccessToken } = require('../utils/token');
const { AppError } = require('../utils/errors');
const prisma = require('../../lib/prisma');

/**
 * Middleware to authenticate client portal requests using JWT
 */
const authenticateClient = async (req, res, next) => {
  try {
    const header = req.header('Authorization');

    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError('No authentication token provided', 401, 'AUTH_MISSING_TOKEN');
    }

    const token = header.replace('Bearer ', '');

    // First try to verify the token to get better error messages
    try {
      const payload = verifyAccessToken(token);
      if (payload.type !== 'client') {
        throw new AppError('Invalid token type', 401, 'AUTH_INVALID_TOKEN');
      }
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        throw new AppError('Token expired', 401, 'AUTH_TOKEN_EXPIRED');
      }
      throw new AppError('Invalid token', 401, 'AUTH_INVALID_TOKEN');
    }

    // Now get full account data
    const data = await getAccountByToken(prisma, token);

    if (!data) {
      throw new AppError('Invalid or expired session', 401, 'AUTH_INVALID_TOKEN');
    }

    // Attach client data to request
    req.clientAccount = data.account;
    req.client = data.client;

    // Also set organizationId for tenant scoping
    req.organizationId = data.client.organizationId;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticateClient;

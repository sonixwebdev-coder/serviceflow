const prisma = require('../../lib/prisma');
const { verifyAccessToken } = require('../utils/token');
const { AppError } = require('../utils/errors');

const authenticateSuperAdmin = async (req, res, next) => {
  try {
    const header = req.header('Authorization');

    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError('No authentication token provided', 401);
    }

    const token = header.replace('Bearer ', '');
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 401);
    }

    if (!user.isSuperAdmin) {
      throw new AppError('Forbidden: super admin access required', 403);
    }

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`,
      isSuperAdmin: true,
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new AppError(error.message, 401));
    }
    next(error);
  }
};

module.exports = authenticateSuperAdmin;

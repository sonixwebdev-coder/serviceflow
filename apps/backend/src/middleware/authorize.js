const { AppError } = require('../utils/errors');

const authorize = ({ roles = [], permissions = [] } = {}) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (roles.length) {
      const hasRole = req.user.roles?.some((role) => roles.includes(role));
      if (!hasRole) {
        return next(new AppError('Insufficient role permissions', 403));
      }
    }

    if (permissions.length) {
      const hasPermission = req.user.permissions?.some((perm) => permissions.includes(perm));
      if (!hasPermission) {
        return next(new AppError('Insufficient permissions', 403));
      }
    }

    next();
  };
};

module.exports = authorize;

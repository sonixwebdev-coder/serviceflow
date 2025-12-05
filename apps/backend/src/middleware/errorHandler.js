const { AppError } = require('../utils/errors');

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const status = err instanceof AppError ? err.status : err.status || 500;
  const message = err.message || 'Something went wrong';

  res.status(status).json({
    success: false,
    message,
    ...(err.details ? { errors: err.details } : {}),
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
};

module.exports = errorHandler;

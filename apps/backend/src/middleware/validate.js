const { AppError } = require('../utils/errors');

const validate =
  (schema, property = 'body') =>
  (req, res, next) => {
    try {
      const result = schema.parse(req[property]);
      req[property] = result;
      next();
    } catch (error) {
      next(new AppError('Validation failed', 400, error.errors || error.issues));
    }
  };

module.exports = validate;

const { AppError } = require('../utils/errors');

/**
 * Middleware factory for request validation using Zod schemas
 * @param {ZodSchema} schema - Zod validation schema
 * @param {string} source - Where to get data from ('query', 'body', 'params')
 */
const validateRequest = (schema, source = 'query') => {
  return (req, res, next) => {
    const dataToValidate = req[source];

    const result = schema.safeParse(dataToValidate);

    if (!result.success) {
      const errors = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      return next(new AppError(
        `Validation failed: ${errors.map(e => e.message).join(', ')}`,
        400
      ));
    }

    // Attach validated data to request
    req.validated = result.data;
    next();
  };
};

module.exports = validateRequest;

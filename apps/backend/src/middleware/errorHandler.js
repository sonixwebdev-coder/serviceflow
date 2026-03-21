const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');
const { captureException } = require('../utils/sentry');

/**
 * Sanitize error messages for user display
 * Returns a user-friendly message while logging the technical details
 */
const sanitizeErrorMessage = (err) => {
  const originalMessage = err.message || '';

  // If it's an AppError, the developer intentionally set a user-friendly message
  if (err instanceof AppError) {
    return originalMessage;
  }

  // Prisma-specific errors
  if (err.name === 'PrismaClientValidationError' || originalMessage.includes('Invalid `')) {
    return 'A apărut o eroare la procesarea datelor. Te rugăm să încerci din nou.';
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    // Handle specific Prisma error codes
    switch (err.code) {
      case 'P2002': {
        const fields = err.meta?.target;
        if (fields && (fields.includes('email') || (Array.isArray(fields) && fields.some(f => f.includes('email'))))) {
          return 'Această adresă de email este deja înregistrată. Te rugăm să folosești o altă adresă de email.';
        }
        return 'Această înregistrare există deja. Te rugăm să verifici datele introduse.';
      }
      case 'P2025':
        return 'Înregistrarea nu a fost găsită. Este posibil să fi fost ștearsă.';
      case 'P2003':
        return 'Nu se poate efectua operația deoarece există date asociate.';
      case 'P2014':
        return 'Operația ar încălca o constrângere în baza de date.';
      default:
        return 'A apărut o eroare la accesarea bazei de date. Te rugăm să încerci din nou.';
    }
  }

  // JWT/Authentication errors
  if (originalMessage.toLowerCase().includes('jwt') || originalMessage.toLowerCase().includes('token')) {
    return 'Sesiunea a expirat. Te rugăm să te autentifici din nou.';
  }

  // Network/Connection errors
  if (originalMessage.includes('ECONNREFUSED') || originalMessage.includes('ETIMEDOUT')) {
    return 'Nu se poate conecta la server. Te rugăm să verifici conexiunea.';
  }

  // Validation errors
  if (originalMessage.toLowerCase().includes('validation') || originalMessage.toLowerCase().includes('invalid')) {
    return 'Datele introduse nu sunt valide. Te rugăm să verifici și să încerci din nou.';
  }

  // File upload errors
  if (originalMessage.includes('File too large') || originalMessage.includes('file size')) {
    return 'Fișierul este prea mare. Te rugăm să alegi un fișier mai mic.';
  }

  if (originalMessage.includes('File type not allowed')) {
    return 'Tipul de fișier nu este permis. Te rugăm să alegi alt format.';
  }

  // Generic error patterns - keep it vague for security
  if (originalMessage.includes('Unknown argument') || originalMessage.includes('Unknown field')) {
    return 'A apărut o eroare la procesarea datelor. Te rugăm să încerci din nou.';
  }

  // For unknown errors in production, return generic message
  if (process.env.NODE_ENV === 'production') {
    return 'A apărut o eroare neașteptată. Te rugăm să încerci din nou.';
  }

  // In development, return the original message but sanitized
  return originalMessage;
};

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const status = err instanceof AppError ? err.status : err.status || err.statusCode || 500;

  // Report to Sentry (no-op if DSN not configured)
  captureException(err, {
    path: req.path,
    method: req.method,
    userId: req.user?.id,
  });

  // Log the full error for debugging (with request context)
  logger.error(err.message, {
    name: err.name,
    code: err.code,
    statusCode: status,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
  });
  const userFriendlyMessage = sanitizeErrorMessage(err);

  res.status(status).json({
    success: false,
    message: userFriendlyMessage,
    ...(err instanceof AppError && err.code ? { code: err.code } : {}),
    ...(err.details ? { errors: err.details } : {}),
    // Only include technical details in development
    ...(process.env.NODE_ENV === 'development' ? {
      _debug: {
        originalMessage: err.message,
        stack: err.stack,
        code: err.code,
      }
    } : {}),
  });
};

module.exports = errorHandler;

const { doubleCsrf } = require('csrf-csrf');
const logger = require('../utils/logger');

/**
 * CSRF Protection Middleware
 *
 * This middleware implements Double Submit Cookie CSRF protection following OWASP guidelines.
 *
 * How it works:
 * 1. Server generates a CSRF token and sets it in a secure HTTP-only cookie
 * 2. Server also sends the token in the response body
 * 3. Client stores the token and includes it in the header of state-changing requests
 * 4. Server validates that the token in the cookie matches the token in the header
 *
 * Industry Standards:
 * - Uses Double Submit Cookie pattern (OWASP recommended)
 * - Secure, HttpOnly cookies in production
 * - SameSite=Strict cookie policy
 * - Only validates POST, PUT, PATCH, DELETE requests
 * - GET, HEAD, OPTIONS are exempt (as they should be idempotent)
 */

// Get CSRF secret from environment or generate a random one
const csrfSecret = process.env.CSRF_SECRET || require('crypto').randomBytes(32).toString('hex');

if (!process.env.CSRF_SECRET) {
  logger.warn(
    'CSRF_SECRET not set in environment - using random secret (will invalidate on restart)'
  );
}

// Configure CSRF protection
const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => csrfSecret,
  cookieName: process.env.NODE_ENV === 'production' ? '__Host-csrf-token' : 'csrf-token',
  cookieOptions: {
    sameSite: 'strict', // Strict same-site policy
    path: '/',
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent JavaScript access
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
  size: 64, // Token size in bytes
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'], // Only validate state-changing methods
  getSessionIdentifier: (req) => {
    // Use user ID from JWT if authenticated, otherwise use IP address
    // This prevents token reuse across different sessions
    return req.user?.id || req.ip || '';
  },
});

/**
 * List of paths that should be exempt from CSRF protection
 * These are typically public endpoints that don't require authentication
 */
const CSRF_EXEMPT_PATHS = [
  '/health',
  '/',
  '/api/csrf-token',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/portal/auth/login',
  '/api/portal/auth/register',
  '/api/portal/auth/refresh',
  '/api/organizations/signup',
  '/api/organizations/validate-vat',
  '/api/organizations/check-slug',
  '/files', // Static file serving
  '/api/webhooks/stripe', // Stripe webhook (uses signature verification instead)
  '/api/sites/:subdomain/lead', // Public contact form (rate-limited + validated)
  '/api/sites/:subdomain/review', // Public review submission (rate-limited + validated)
  '/api/portal/public/:slug/book', // Public booking from website (unauthenticated, rate-limited)
  '/api/portal/public/:slug', // Public org info for booking widget
  '/api/portal/public/:slug/dates', // Public available dates
  '/api/portal/public/:slug/slots', // Public available time slots
  '/api/portal/auth/forgot-password', // Password reset request
  '/api/portal/auth/reset-password', // Password reset confirmation
  '/api/auth/forgot-password', // Admin password reset request
  '/api/auth/reset-password', // Admin password reset confirmation
  '/api/contact', // Public contact form (rate-limited + validated)
  '/api/pricing', // Public pricing display (rate-limited, read-only)
];

/**
 * Check if a request path should be exempt from CSRF protection
 * @param {string} path - Request path
 * @returns {boolean} - True if path is exempt
 */
const isPathExempt = (path) => {
  return CSRF_EXEMPT_PATHS.some((exemptPath) => {
    // Exact match
    if (path === exemptPath) {
      return true;
    }

    // Prefix match (e.g., /files/*)
    if (path.startsWith(exemptPath + '/')) {
      return true;
    }

    // Dynamic path matching (e.g., /api/organizations/check-slug/:slug)
    if (exemptPath.includes(':')) {
      const pathRegex = new RegExp(`^${exemptPath.replace(/:[^/]+/g, '[^/]+')}$`);
      return pathRegex.test(path);
    }

    return false;
  });
};

/**
 * CSRF Protection Middleware
 * Apply this middleware to protect routes from CSRF attacks
 */
const csrfProtection = (req, res, next) => {
  // Skip CSRF protection for exempt paths
  if (isPathExempt(req.path)) {
    return next();
  }

  // Skip CSRF for GET, HEAD, OPTIONS requests (handled by doubleCsrf config)
  // These methods should be idempotent and safe
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Apply CSRF validation
  doubleCsrfProtection(req, res, (err) => {
    if (err) {
      logger.warn('CSRF validation failed', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        error: err.message,
      });

      return res.status(403).json({
        success: false,
        message: 'CSRF validation failed. Please refresh the page and try again.',
        code: 'CSRF_VALIDATION_FAILED',
      });
    }

    next();
  });
};

/**
 * CSRF Token Generation Endpoint Handler
 * Use this to create an endpoint that generates and returns CSRF tokens
 */
const generateToken = (req, res) => {
  const token = generateCsrfToken(req, res);

  return res.json({
    csrfToken: token,
    message: 'CSRF token generated successfully',
  });
};

module.exports = {
  csrfProtection,
  generateToken,
  generateCsrfToken,
};

const path = require('path');
// Load .env from root monorepo first, then backend-local overrides
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config(); // backend-local .env (won't overwrite already-set vars)
const validateEnv = require('./src/utils/validateEnv');
validateEnv();

const { initSentry } = require('./src/utils/sentry');
initSentry();

const http = require('http');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const prisma = require('./lib/prisma');
const { initRedis, getRedisClient, closeRedis } = require('./src/lib/redis');
const apiRouter = require('./src/api');
const errorHandler = require('./src/middleware/errorHandler');
const createSocketServer = require('./src/realtime');
const logger = require('./src/utils/logger');

// Initialize Redis early so the rate limiter Redis store can use it
initRedis();

// Helper: create a Redis-backed rate limit store, falling back to in-memory when Redis is unavailable
const makeRateLimitStore = (prefix) => {
  const client = getRedisClient();
  if (!client) return undefined; // express-rate-limit defaults to in-memory
  return new RedisStore({
    sendCommand: (...args) => client.call(...args),
    prefix: `rl:${prefix}:`,
  });
};

// Handle uncaught exceptions — log then exit so the process manager can restart cleanly
process.on('uncaughtException', async (err) => {
  logger.system('Uncaught Exception', { stack: err.stack, name: err.name, message: err.message });
  await logger.flush();
  process.exit(1);
});

process.on('unhandledRejection', async (reason) => {
  logger.system('Unhandled Rejection', { reason: String(reason) });
  await logger.flush();
  process.exit(1);
});

const app = express();

// Trust one proxy hop (nginx) so req.ip returns the real client IP for rate limiting
app.set('trust proxy', 1);

const fileStorageRoot = process.env.FILE_STORAGE_ROOT || path.resolve(__dirname, 'storage');

// CORS configuration (defined early for use in multiple places)
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.CORS_ORIGINS || 'https://forja.it.com,https://portal.forja.it.com').split(',').map(s => s.trim())
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'],
  credentials: true
};

// Static file serving MUST come BEFORE helmet to avoid CSP blocking PDF iframes
// This route is exempt from CSP headers to allow PDF embedding
const { verifyAccessToken } = require('./src/utils/token');

const staticCorsMiddleware = (req, res, next) => {
  // Set CORS headers for cross-origin access
  const origin = req.headers.origin;
  const allowedOrigins = Array.isArray(corsOptions.origin) ? corsOptions.origin : [corsOptions.origin];
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  // Don't set CSP headers for static files (PDFs, images)
  res.locals.skipCSP = true;
  next();
};

// Lightweight auth for private static files (chat attachments, invoices, uploads)
// Allows public access to logos and website assets only
// Accepts token from: Authorization header, ?token= query param (for <img>, <a>, <audio>)
const staticAuthMiddleware = (req, res, next) => {
  // Public paths — logos and website assets don't require auth
  if (req.path.startsWith('/logos/') || req.path.startsWith('/websites/')) {
    return next();
  }

  // Check token from Authorization header or query param
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7)
    : (typeof req.query.token === 'string' ? req.query.token : null);

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    verifyAccessToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

app.use('/files', staticCorsMiddleware, staticAuthMiddleware, express.static(fileStorageRoot));

// Serve uploaded files (messages, attachments)
const uploadsRoot = path.resolve(__dirname, 'uploads');
app.use('/uploads', staticCorsMiddleware, staticAuthMiddleware, express.static(uploadsRoot));

// Security headers with helmet (applied after /files route)
// Instantiate once at startup — not per-request — to avoid unnecessary object allocation
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      frameSrc: ["'self'"], // Allow iframes from same origin for PDF preview
      frameAncestors: ["'self'"], // Allow being framed by same origin
    },
  },
  frameguard: { action: 'sameorigin' },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

app.use((req, res, next) => {
  if (res.locals.skipCSP) return next();
  helmetMiddleware(req, res, next);
});

// Permissions-Policy header
app.use((req, res, next) => {
  if (!res.locals.skipCSP) {
    res.setHeader('Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
    );
  }
  next();
});

// Remove X-Powered-By header
app.disable('x-powered-by');

// Global request timeout (30s default, export routes get longer)
app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    if (!res.headersSent) {
      res.status(503).json({ success: false, message: 'Request timeout' });
    }
  });
  next();
});

// CORS middleware for API routes
app.use(cors(corsOptions));

// Stripe webhook route — MUST be mounted before body-parser (needs raw body)
const stripeWebhookRouter = require('./src/api/webhooks');
app.use('/api/webhooks', stripeWebhookRouter);

// Body parser middleware with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie parser middleware (required for CSRF protection)
app.use(cookieParser());

// CSRF Protection - Import middleware
const { csrfProtection, generateToken } = require('./src/middleware/csrfProtection');

// CSRF token endpoint (must be before CSRF protection middleware)
app.get('/api/csrf-token', generateToken);

// Apply CSRF protection to all routes
app.use(csrfProtection);

// Global baseline rate limiter — covers all /api routes not already limited
// Keyed by authenticated user ID when available, otherwise by IP
const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 requests/min per user — well above normal usage, blocks abusive clients
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  store: makeRateLimitStore('global'),
  skip: (req) => req.path.startsWith('/api/auth'), // auth routes have their own tighter limits
});

// Auth routes — strict limits to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRateLimitStore('auth'),
});

// Token refresh — higher limit for seamless session continuation
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: 'Too many refresh attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRateLimitStore('refresh'),
});

// Profile updates
const profileUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many profile update attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRateLimitStore('profile'),
});

// Password change — very strict
const passwordChangeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many password change attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRateLimitStore('pwd-change'),
});

// Forgot password — enumeration prevention
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many password reset attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRateLimitStore('forgot-pwd'),
});

// Exports — CPU/DB intensive, limit tightly
const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many export requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  store: makeRateLimitStore('exports'),
});

// Analytics — expensive queries, limit to prevent runaway load
const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many analytics requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  store: makeRateLimitStore('analytics'),
});

// 2FA verification — very strict per-IP to slow brute force (account lockout handles per-user)
const twoFaVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many 2FA verification attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRateLimitStore('2fa-verify'),
});

// Apply rate limits — most specific routes first, then broader catch-alls
app.use('/api/auth/2fa/verify', twoFaVerifyLimiter);
app.use('/api/auth/forgot-password', forgotPasswordLimiter);
app.use('/api/portal/auth/forgot-password', forgotPasswordLimiter);
app.use('/api/auth/refresh', refreshLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/portal/auth', authLimiter);

app.use('/api/users/profile', (req, res, next) => {
  if (req.path === '/password' && req.method === 'PUT') return passwordChangeLimiter(req, res, next);
  if (req.method === 'PUT') return profileUpdateLimiter(req, res, next);
  next();
});

app.use('/api/analytics', analyticsLimiter);

// Global baseline limiter applied to all remaining /api routes
app.use('/api', globalApiLimiter);

// Super admin API
const superAdminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests to admin API, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRateLimitStore('super-admin'),
});

// Super Admin API (mounted before main API to bypass tenant/location scoping)
const superAdminRouter = require('./src/api/superAdmin');
app.use('/api/super-admin', superAdminLimiter, superAdminRouter);

// Prisma-powered API
app.use('/api', apiRouter);

// Health check
app.get('/health', async (req, res) => {
  const checks = { db: false, redis: false };
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = true;
  } catch {}
  try {
    const redisClient = getRedisClient();
    if (redisClient) { await redisClient.ping(); checks.redis = true; }
    else { checks.redis = null; }
  } catch {}
  const healthy = checks.db;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'OK' : 'DEGRADED',
    checks,
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'ForjaIt API',
    version: '2.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
    }
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await prisma.$connect();
    console.log('✅ Prisma connected to PostgreSQL');

    // Ensure PlatformSettings singleton exists
    await prisma.platformSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton' },
      update: {},
    });
  } catch (error) {
    console.error('❌ Prisma connection error:', error);
    process.exit(1);
  }

  // Redis is already initialized at module load (before rate limiters)

  // Initialize background jobs (cleanup crons, etc.)
  const { initializeJobs, stopAllJobs: stopJobs } = require('./src/jobs');
  initializeJobs();

  const httpServer = http.createServer(app);
  createSocketServer(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API: http://localhost:${PORT}`);
  });

  const gracefulShutdown = async (signal) => {
    logger.system(`${signal} received, shutting down gracefully`);
    stopJobs();

    // Force exit after 10 seconds if connections don't drain
    const forceExit = setTimeout(() => {
      logger.system('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
    forceExit.unref();

    httpServer.close(async () => {
      await logger.flush();
      await Promise.all([
        prisma.$disconnect(),
        closeRedis(),
      ]);
      process.exit(0);
    });

    // Close idle keep-alive connections immediately (Node 18.2+)
    if (httpServer.closeAllConnections) {
      httpServer.closeAllConnections();
    }
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

startServer();

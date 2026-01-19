require('dotenv').config();
const http = require('http');
const express = require('express');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const prisma = require('./lib/prisma');
const { initRedis, closeRedis } = require('./src/lib/redis');
const apiRouter = require('./src/api');
const errorHandler = require('./src/middleware/errorHandler');
const createSocketServer = require('./src/realtime');

// Handle uncaught exceptions to prevent server crashes
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error(err.stack);
  // Don't exit - keep the server running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  // Don't exit - keep the server running
});

const app = express();

const fileStorageRoot = process.env.FILE_STORAGE_ROOT || path.resolve(__dirname, 'storage');

// CORS configuration (defined early for use in multiple places)
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://viperx.online', 'https://portal.viperx.online']
    : ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
};

// Static file serving MUST come BEFORE helmet to avoid CSP blocking PDF iframes
// This route is exempt from CSP headers to allow PDF embedding
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

app.use('/files', staticCorsMiddleware, express.static(fileStorageRoot));

// Serve uploaded files (messages, attachments)
const uploadsRoot = path.resolve(__dirname, 'uploads');
app.use('/uploads', staticCorsMiddleware, express.static(uploadsRoot));

// Security headers with helmet (applied after /files route)
app.use((req, res, next) => {
  // Skip helmet CSP for /files routes
  if (res.locals.skipCSP) {
    return next();
  }

  helmet({
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
    frameguard: false, // Disable X-Frame-Options to allow PDF embedding
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  })(req, res, next);
});

// Remove X-Powered-By header
app.disable('x-powered-by');

// CORS middleware for API routes
app.use(cors(corsOptions));

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

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window (increased for socket reconnection scenarios)
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for token refresh to allow seamless session continuation
  skip: (req) => req.path === '/api/auth/refresh',
});

// Rate limiting for profile update endpoints (CRITICAL SECURITY)
const profileUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: 'Too many profile update attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for password change endpoint (CRITICAL SECURITY)
const passwordChangeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: 'Too many password change attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for export endpoints (CRITICAL SECURITY - DoS prevention)
const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 export requests per window per user
  message: 'Too many export requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  // Use user ID if authenticated, otherwise IP address
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

// Apply rate limit to auth routes
app.use('/api/auth', authLimiter);
app.use('/api/portal/auth', authLimiter);

// Apply rate limiting to profile endpoints (CRITICAL SECURITY)
app.use('/api/users/profile', (req, res, next) => {
  // More restrictive rate limit for password changes
  if (req.path === '/password' && req.method === 'PUT') {
    return passwordChangeLimiter(req, res, next);
  }
  // Standard profile update rate limit
  if (req.method === 'PUT') {
    return profileUpdateLimiter(req, res, next);
  }
  next();
});

// Prisma-powered API
app.use('/api', apiRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'ServiceFlow API',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'ServiceFlow API',
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
  } catch (error) {
    console.error('❌ Prisma connection error:', error);
    process.exit(1);
  }

  // Initialize Redis (optional - app works without it)
  initRedis();

  const httpServer = http.createServer(app);
  createSocketServer(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API: http://localhost:${PORT}`);
  });

  const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    await Promise.all([
      prisma.$disconnect(),
      closeRedis(),
    ]);
    httpServer.close(() => {
      console.log('🛑 HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

startServer();

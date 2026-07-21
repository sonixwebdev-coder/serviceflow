const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const fs = require('fs');
const path = require('path');

/**
 * Prisma client singleton to avoid exhausting DB connections
 * during local development with hot-reloads.
 *
 * Connection pooling is provided by node-postgres through Prisma's PostgreSQL
 * driver adapter. Pool size and connection timeout remain environment driven.
 */
const isDev = process.env.NODE_ENV !== 'production';
const SLOW_QUERY_THRESHOLD = Number(process.env.SLOW_QUERY_THRESHOLD) || 500; // ms

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL || '',
  max: Number(process.env.DB_POOL_SIZE) || 20,
  connectionTimeoutMillis: (Number(process.env.DB_POOL_TIMEOUT) || 30) * 1000,
});

// --- Slow query file logger ---

const LOG_DIR = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const slowQueryLogPath = path.join(LOG_DIR, 'slow-queries.log');
let slowQueryStream = null;

const getSlowQueryStream = () => {
  if (!slowQueryStream) {
    slowQueryStream = fs.createWriteStream(slowQueryLogPath, { flags: 'a' });
  }
  return slowQueryStream;
};

const logSlowQuery = (e) => {
  const timestamp = new Date().toISOString();
  const line =
    `[${timestamp}] ${e.duration}ms | ${e.query}` +
    (e.params && e.params !== '[]' ? ` | params: ${e.params}` : '') +
    '\n';
  getSlowQueryStream().write(line);
};

// --- Prisma client ---

const prisma =
  global.__prisma ||
  new PrismaClient({
    adapter,
    log: [{ level: 'query', emit: 'event' }],
  });

// Log slow queries to dedicated file (all environments)
prisma.$on('query', (e) => {
  if (e.duration > SLOW_QUERY_THRESHOLD) {
    logSlowQuery(e);
  }
});

if (isDev) {
  global.__prisma = prisma;
}

module.exports = prisma;

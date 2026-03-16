const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../logs');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// --- File logging (date-based) ---

const getLogFilePath = () => {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(LOG_DIR, `${date}.log`);
};

let currentLogDate = null;
let logStream = null;

const getOrCreateStream = () => {
  const today = new Date().toISOString().split('T')[0];
  if (logStream && currentLogDate === today) return logStream;
  if (logStream) logStream.end();
  currentLogDate = today;
  logStream = fs.createWriteStream(path.join(LOG_DIR, `${today}.log`), { flags: 'a' });
  logStream.on('error', (err) => console.error('Log stream error:', err.message));
  return logStream;
};

const writeToFile = (message) => {
  try {
    getOrCreateStream().write(message + '\n');
  } catch (error) {
    console.error('Failed to write to log file:', error.message);
  }
};

const formatTimestamp = () => new Date().toISOString();

const serializeData = (data) => {
  if (!data) return '';
  try {
    if (data instanceof Error) {
      return JSON.stringify({
        name: data.name,
        message: data.message,
        stack: data.stack,
        ...Object.getOwnPropertyNames(data).reduce((acc, key) => {
          if (!['name', 'message', 'stack'].includes(key)) acc[key] = data[key];
          return acc;
        }, {}),
      }, null, 2);
    }
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
};

const writeFileLog = (level, category, message, data) => {
  const timestamp = formatTimestamp();
  const line = `[${timestamp}] [${level}] [${category}] ${message}`;
  writeToFile(line);
  if (data) writeToFile(serializeData(data));
};

// --- Database write buffer ---

let buffer = [];
let flushTimer = null;
let prisma = null;

const FLUSH_INTERVAL_MS = 2000;
const FLUSH_THRESHOLD = 50;

const getPrisma = () => {
  if (!prisma) {
    prisma = require('../../lib/prisma');
  }
  return prisma;
};

let flushing = false;

const flushBuffer = async () => {
  if (buffer.length === 0 || flushing) return;
  flushing = true;

  const entries = buffer.splice(0, buffer.length);

  try {
    const db = getPrisma();
    await db.systemLog.createMany({ data: entries });
  } catch (error) {
    // Fallback: log the failure and the entries to file
    console.error('Failed to flush logs to database:', error.message);
    for (const entry of entries) {
      writeFileLog(entry.level, entry.category, `[DB_FALLBACK] ${entry.message}`, entry.data);
    }
  } finally {
    flushing = false;
  }
};

const scheduleFlush = () => {
  if (flushTimer) return;
  flushTimer = setTimeout(async () => {
    flushTimer = null;
    await flushBuffer();
  }, FLUSH_INTERVAL_MS);
};

const enqueue = (entry) => {
  buffer.push(entry);
  if (buffer.length >= FLUSH_THRESHOLD) {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    flushBuffer();
  } else {
    scheduleFlush();
  }
};

// --- Core log function ---

const log = (level, category, message, extra = {}) => {
  // Normalize extra to a plain object to prevent spread issues
  // (e.g. spreading a string produces {"0":"c","1":"h",...})
  if (extra instanceof Error) {
    extra = {
      error: extra.message,
      stack: extra.stack,
      ...(extra.code && { code: extra.code }),
      ...(extra.statusCode && { statusCode: extra.statusCode }),
    };
  } else if (typeof extra !== 'object' || extra === null || Array.isArray(extra)) {
    extra = extra != null ? { value: extra } : {};
  }

  const { stack, path: reqPath, method, userId, ip, duration, ...rest } = extra;

  // Always write to date-based file
  writeFileLog(level, category, message, Object.keys(extra).length > 0 ? extra : null);

  // Enqueue for DB write
  enqueue({
    level,
    category,
    message: String(message).slice(0, 2000),
    data: Object.keys(rest).length > 0 ? rest : undefined,
    stack: stack || undefined,
    path: reqPath || undefined,
    method: method || undefined,
    userId: userId || undefined,
    ip: ip || undefined,
    duration: duration != null ? Number(duration) : undefined,
  });
};

// --- Public API ---

const logger = {
  // Generic level methods (default to SYSTEM / ERROR category)
  info: (message, data) => log('INFO', 'SYSTEM', message, data || {}),
  warn: (message, data) => log('WARN', 'SYSTEM', message, data || {}),
  error: (message, data) => log('ERROR', 'ERROR', message, data || {}),
  debug: (message, data) => log('DEBUG', 'SYSTEM', message, data || {}),

  // Category-specific methods
  request: (message, data = {}) => log('INFO', 'REQUEST', message, data),
  auth: (message, data = {}) => log('INFO', 'AUTH', message, data),
  system: (message, data = {}) => log('INFO', 'SYSTEM', message, data),
  email: (message, data = {}) => log('INFO', 'EMAIL', message, data),
  realtime: (message, data = {}) => log('INFO', 'REALTIME', message, data),
  notification: (message, data = {}) => log('INFO', 'NOTIFICATION', message, data),

  // Flush buffered logs (for graceful shutdown)
  flush: () => {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    return flushBuffer();
  },
};

module.exports = logger;

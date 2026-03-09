const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient = null;
let isRedisAvailable = false;

/**
 * Initialize Redis client (optional)
 * If Redis is not available, app will work without caching
 */
const initRedis = () => {
  // Skip if Redis URL not configured
  if (!process.env.REDIS_URL) {
    logger.info('Redis not configured - running without cache');
    return null;
  }

  try {
    const client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.warn('Redis connection failed after 3 retries - running without cache');
          return null; // Stop retrying
        }
        return Math.min(times * 100, 2000); // Exponential backoff
      },
    });

    // Handle connection events
    client.on('connect', () => {
      isRedisAvailable = true;
      logger.info('Redis connected successfully');
    });

    client.on('error', (err) => {
      isRedisAvailable = false;
      logger.warn('Redis error (app will continue without cache):', err.message);
    });

    client.on('close', () => {
      isRedisAvailable = false;
      logger.warn('Redis connection closed - running without cache');
    });

    client.on('ready', () => {
      isRedisAvailable = true;
      logger.info('Redis ready — caching re-enabled');
    });

    // Attempt to connect
    client.connect().catch((err) => {
      logger.warn('Redis connection failed - running without cache:', err.message);
      isRedisAvailable = false;
    });

    redisClient = client;
    return client;
  } catch (error) {
    logger.warn('Redis initialization failed - running without cache:', error.message);
    return null;
  }
};

/**
 * Get Redis client (returns null if not available)
 */
const getRedisClient = () => {
  return isRedisAvailable ? redisClient : null;
};

/**
 * Check if Redis is available
 */
const isAvailable = () => {
  return isRedisAvailable;
};

/**
 * Gracefully shutdown Redis
 */
const closeRedis = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis:', error.message);
    }
  }
};

module.exports = {
  initRedis,
  getRedisClient,
  isAvailable,
  closeRedis,
};

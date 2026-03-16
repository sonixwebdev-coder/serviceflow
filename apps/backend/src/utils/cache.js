const { getRedisClient, isAvailable } = require('../lib/redis');
const logger = require('./logger');

// Default TTL values (in seconds)
const TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 1800, // 30 minutes
  VERY_LONG: 3600, // 1 hour
};

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Cached value or null
 */
const get = async (key) => {
  if (!isAvailable()) return null;

  try {
    const redis = getRedisClient();
    const value = await redis.get(key);
    if (value) {
      return JSON.parse(value);
    }
    return null;
  } catch (error) {
    logger.warn(`Cache get error for key ${key}:`, error.message);
    return null;
  }
};

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds (default: MEDIUM)
 * @returns {Promise<boolean>} Success status
 */
const set = async (key, value, ttl = TTL.MEDIUM) => {
  if (!isAvailable()) return false;

  try {
    const redis = getRedisClient();
    await redis.setex(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.warn(`Cache set error for key ${key}:`, error.message);
    return false;
  }
};

/**
 * Delete value from cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} Success status
 */
const del = async (key) => {
  if (!isAvailable()) return false;

  try {
    const redis = getRedisClient();
    await redis.del(key);
    return true;
  } catch (error) {
    logger.warn(`Cache delete error for key ${key}:`, error.message);
    return false;
  }
};

/**
 * Delete multiple keys matching pattern
 * @param {string} pattern - Key pattern (e.g., "user:*")
 * @returns {Promise<number>} Number of keys deleted
 */
const delPattern = async (pattern) => {
  if (!isAvailable()) return 0;

  try {
    const redis = getRedisClient();
    // Use cursor-based SCAN instead of KEYS to avoid blocking Redis during keyspace scan
    let cursor = '0';
    const keysToDelete = [];
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      keysToDelete.push(...keys);
    } while (cursor !== '0');

    if (keysToDelete.length === 0) return 0;
    await redis.del(...keysToDelete);
    return keysToDelete.length;
  } catch (error) {
    logger.warn(`Cache delete pattern error for ${pattern}:`, error.message);
    return 0;
  }
};

// In-flight request deduplication — prevents thundering herd on simultaneous cache misses
const inFlight = new Map();

/**
 * Wrap a function with caching
 * @param {string} key - Cache key
 * @param {Function} fn - Function to execute if cache miss
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<any>} Cached or fresh value
 */
const wrap = async (key, fn, ttl = TTL.MEDIUM) => {
  // Try to get from cache
  const cached = await get(key);
  if (cached !== null) {
    return cached;
  }

  // Deduplicate concurrent cache misses: reuse the in-flight promise instead of launching another DB fetch
  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const promise = fn()
    .then(async (result) => {
      inFlight.delete(key);
      set(key, result, ttl).catch(() => {});
      return result;
    })
    .catch((err) => {
      inFlight.delete(key);
      throw err;
    });

  inFlight.set(key, promise);
  return promise;
};

/**
 * Clear all cache (use with caution!)
 * @returns {Promise<boolean>} Success status
 */
const clearAll = async () => {
  if (!isAvailable()) return false;

  try {
    const redis = getRedisClient();
    await redis.flushdb();
    logger.info('Cache cleared');
    return true;
  } catch (error) {
    logger.error('Cache clear error:', error.message);
    return false;
  }
};

/**
 * Blacklist an access token (used on logout to prevent reuse until expiry).
 * @param {string} token - The raw JWT access token
 * @param {number} remainingTtl - Seconds until the token would naturally expire
 * @returns {Promise<boolean>} Success status
 */
const blacklistToken = async (token, remainingTtl) => {
  if (remainingTtl <= 0) return true; // already expired
  const hash = require('crypto').createHash('sha256').update(token).digest('hex');
  return set(`token:bl:${hash}`, 1, remainingTtl);
};

/**
 * Check if a token has been blacklisted.
 * @param {string} token - The raw JWT access token
 * @returns {Promise<boolean>} True if blacklisted
 */
const isTokenBlacklisted = async (token) => {
  const hash = require('crypto').createHash('sha256').update(token).digest('hex');
  const val = await get(`token:bl:${hash}`);
  return val !== null;
};

/**
 * Generate cache key for user
 * @param {string} userId - User ID
 * @returns {string} Cache key
 */
const userKey = (userId) => `user:${userId}`;

/**
 * Generate cache key for user with roles
 * @param {string} userId - User ID
 * @returns {string} Cache key
 */
const userWithRolesKey = (userId) => `user:roles:${userId}`;

/**
 * Generate cache key for company settings
 * @returns {string} Cache key
 */
const companySettingsKey = () => 'company:settings';

/**
 * Generate cache key for active users
 * @returns {string} Cache key
 */
const activeUsersKey = () => 'users:active';

/**
 * Generate cache key for all roles
 * @returns {string} Cache key
 */
const rolesKey = () => 'roles:all';

/**
 * Generate cache key for user list with filters
 * @param {object} filters - Filter parameters
 * @returns {string} Cache key
 */
const userListKey = (filters = {}) => {
  const { search, role, isActive, organizationId, locationId } = filters;
  const parts = ['users:list'];
  if (organizationId) parts.push(`org:${organizationId}`);
  if (locationId) parts.push(`loc:${locationId}`);
  if (search) parts.push(`search:${search}`);
  if (role) parts.push(`role:${role}`);
  if (typeof isActive === 'boolean') parts.push(`active:${isActive}`);
  return parts.join(':');
};

/**
 * Generate cache key for user tasks
 * @param {string} userId - User ID
 * @param {object} filters - Filter parameters
 * @returns {string} Cache key
 */
const userTasksKey = (userId, filters = {}) => {
  const { status, priority } = filters;
  const parts = [`tasks:user:${userId}`];
  if (status) parts.push(`status:${status}`);
  if (priority) parts.push(`priority:${priority}`);
  return parts.join(':');
};

/**
 * Generate cache key for dashboard stats
 * @param {string} userId - User ID
 * @returns {string} Cache key
 */
const dashboardStatsKey = (userId) => `dashboard:stats:${userId}`;

/**
 * Generate cache key for appointment count
 * @param {string} userId - User ID
 * @param {string} date - Date string
 * @returns {string} Cache key
 */
const appointmentCountKey = (userId, date) => `appointments:count:${userId}:${date}`;

/**
 * Generate cache key for VAT validation result
 * @param {string} countryCode - Country code (e.g. 'RO')
 * @param {string} number - VAT number without prefix
 * @returns {string} Cache key
 */
const vatKey = (countryCode, number) => `vat:${countryCode.toUpperCase()}:${String(number).replace(/\s/g, '')}`;

module.exports = {
  TTL,
  get,
  set,
  del,
  delPattern,
  wrap,
  clearAll,
  // Token blacklist
  blacklistToken,
  isTokenBlacklisted,
  // Key generators
  userKey,
  userWithRolesKey,
  companySettingsKey,
  activeUsersKey,
  rolesKey,
  userListKey,
  userTasksKey,
  dashboardStatsKey,
  appointmentCountKey,
  vatKey,
};

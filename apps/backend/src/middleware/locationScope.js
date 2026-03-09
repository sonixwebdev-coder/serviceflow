const prisma = require('../../lib/prisma');
const cache = require('../utils/cache');

/**
 * Helper to check if a user has any of the specified roles
 * @param {Object} user - User object with roles
 * @param {string[]} roleKeys - Array of role keys to check
 * @returns {boolean}
 */
const hasRole = (user, roleKeys) => {
  if (!user || !roleKeys?.length) return false;

  const normalizedKeys = roleKeys.map((k) => k.toLowerCase());

  // Check user.roles array (nested role object format)
  if (Array.isArray(user.roles)) {
    for (const entry of user.roles) {
      const key = entry?.role?.key || entry?.key || (typeof entry === 'string' ? entry : null);
      if (key && normalizedKeys.includes(key.toLowerCase())) {
        return true;
      }
    }
  }

  // Check user.role string/object
  if (user.role) {
    const key = typeof user.role === 'string' ? user.role : user.role?.key;
    if (key && normalizedKeys.includes(key.toLowerCase())) {
      return true;
    }
  }

  return false;
};

// Cache for user location data to avoid repeated DB queries within a request
const locationDataCache = new WeakMap();

/**
 * Fetch and cache user location data
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} Location data
 */
const getLocationData = async (req) => {
  if (!req.user) {
    return {
      locationIds: [],
      primaryLocationId: null,
      currentLocationId: null,
      canSwitchLocations: false,
    };
  }

  // Check per-request cache first (avoids multiple calls within the same request)
  if (locationDataCache.has(req)) {
    return locationDataCache.get(req);
  }

  // Fetch user's location assignments (Redis-cached across requests to avoid a DB hit per request)
  const userLocations = await cache.wrap(
    `user:locations:${req.user.id}`,
    () => prisma.userLocation.findMany({
      where: { userId: req.user.id },
      select: { locationId: true, isPrimary: true },
    }),
    cache.TTL.MEDIUM // 5 minutes — invalidate via cache.del(`user:locations:${userId}`) on assignment changes
  );

  // Extract location IDs
  const locationIds = userLocations.map((ul) => ul.locationId);

  // Find primary location
  const primaryLocation = userLocations.find((ul) => ul.isPrimary);
  const primaryLocationId = primaryLocation?.locationId || locationIds[0] || null;

  // Check if user can switch locations (admin/manager)
  const canSwitchLocations = hasRole(req.user, ['admin', 'manager']);

  // Get requested location from header
  const requestedLocationId = req.headers['x-location-id'];
  let currentLocationId = primaryLocationId;

  if (requestedLocationId) {
    // User requested a specific location
    if (locationIds.includes(requestedLocationId)) {
      // User is assigned to this location
      currentLocationId = requestedLocationId;
    } else if (canSwitchLocations) {
      // Admin/manager can access any org location - verify it belongs to org
      const orgLocation = await prisma.location.findFirst({
        where: {
          id: requestedLocationId,
          organizationId: req.user.organizationId,
        },
      });
      if (orgLocation) {
        currentLocationId = requestedLocationId;
      }
      // If invalid, fall back to primary (don't block the request here)
    }
    // Non-admin trying to access unassigned location: fall back to primary
  }

  const data = {
    locationIds,
    primaryLocationId,
    currentLocationId,
    canSwitchLocations,
  };

  // Cache the result for this request
  locationDataCache.set(req, data);

  return data;
};

/**
 * Middleware to set up location-scoped access helpers on the request object.
 *
 * IMPORTANT: This middleware runs BEFORE authenticate middleware (since it's applied globally),
 * so req.user may not be available yet. The helpers are designed to work lazily -
 * they fetch location data when called, not when the middleware runs.
 *
 * After this middleware runs, the request will have:
 * - req.getLocationFilter(): Async function to get Prisma where clause for location filtering
 * - req.hasLocationAccess(locationId): Async function to check if user has access to a location
 * - req.getLocationContext(): Async function to get full location context
 */
const locationScope = async (req, res, next) => {
  /**
   * Get full location context (lazy - fetches data when called)
   * @returns {Promise<Object>} Location context with all data
   */
  req.getLocationContext = async () => {
    const data = await getLocationData(req);
    return {
      userLocationIds: data.locationIds,
      primaryLocationId: data.primaryLocationId,
      currentLocationId: data.currentLocationId,
      canSwitchLocations: data.canSwitchLocations,
    };
  };

  /**
   * Check if user has access to a specific location (lazy)
   * @param {string} locationId - Location ID to check
   * @returns {Promise<boolean>}
   */
  req.hasLocationAccess = async (locationId) => {
    if (!locationId) return true; // Allow null locationId (legacy data)

    const data = await getLocationData(req);
    if (data.canSwitchLocations) return true; // Admin/manager can access any
    return data.locationIds.includes(locationId);
  };

  /**
   * Get location filter for Prisma queries (lazy - fetches data when called)
   * Returns a where clause object that can be spread into Prisma queries
   *
   * @param {Object} options
   * @param {boolean} options.includeNull - Include records with null locationId (legacy data)
   * @returns {Promise<Object>} Prisma where clause
   */
  req.getLocationFilter = async (options = {}) => {
    const { includeNull = false } = options;

    const data = await getLocationData(req);
    const { currentLocationId } = data;

    // If no current location selected, don't filter
    if (!currentLocationId) {
      return {};
    }

    // Filter by current location
    if (includeNull) {
      return {
        OR: [{ locationId: currentLocationId }, { locationId: null }],
      };
    }

    return { locationId: currentLocationId };
  };

  // For backward compatibility, also set these sync properties
  // They will be overwritten if/when getLocationContext is called
  req.userLocationIds = [];
  req.primaryLocationId = null;
  req.currentLocationId = null;
  req.canSwitchLocations = false;

  next();
};

/**
 * Express middleware factory that enforces location-scoped access
 * Use this when you want to restrict access to specific locations
 */
const requireLocationAccess = () => {
  return async (req, res, next) => {
    const locationId = req.params.locationId || req.body.locationId || req.query.locationId;

    if (locationId) {
      const hasAccess = await req.hasLocationAccess(locationId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Nu aveti acces la aceasta locatie',
        });
      }
    }

    next();
  };
};

module.exports = { locationScope, requireLocationAccess, hasRole };

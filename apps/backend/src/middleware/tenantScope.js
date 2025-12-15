const { createTenantPrisma } = require('../lib/tenantPrisma');

/**
 * Middleware to attach tenant-scoped Prisma client to request
 * Uses a lazy getter so it works even when authenticate middleware runs after this
 * This ensures all database queries are automatically filtered by organizationId
 */
const tenantScope = (req, res, next) => {
  // Use a lazy getter to create tenantPrisma only when accessed
  // This allows it to work even when authenticate middleware runs later in the chain
  let _tenantPrisma = null;

  Object.defineProperty(req, 'tenantPrisma', {
    get() {
      // Create tenant prisma on first access (after authenticate has run)
      if (!_tenantPrisma && req.user?.organizationId) {
        _tenantPrisma = createTenantPrisma(req.user.organizationId);
      }
      return _tenantPrisma;
    },
    // Allow setting if needed
    set(value) {
      _tenantPrisma = value;
    },
    enumerable: true,
    configurable: true
  });

  next();
};

module.exports = tenantScope;

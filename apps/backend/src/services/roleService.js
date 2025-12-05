const prisma = require('../../lib/prisma');
const cache = require('../utils/cache');
const { AppError } = require('../utils/errors');

// Whitelist of allowed roles in the system
const ALLOWED_ROLES = ['admin', 'manager', 'sales', 'technician'];

const toTitleCase = (value = '') =>
  value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');

const normalizeRoleKey = (key) => (key ? key.toLowerCase().replace(/\s+/g, '-') : 'technician');

/**
 * Get all roles (cached for 1 hour - roles rarely change)
 */
const getAllRoles = async (options = {}) => {
  const { skipCache = false } = options;

  if (!skipCache) {
    const cached = await cache.get(cache.rolesKey());
    if (cached) {
      return cached;
    }
  }

  const roles = await prisma.role.findMany({
    orderBy: { name: 'asc' },
  });

  // Cache for 1 hour - roles very rarely change
  await cache.set(cache.rolesKey(), roles, cache.TTL.VERY_LONG);

  return roles;
};

const ensureRole = async (key, tx = prisma) => {
  const roleKey = normalizeRoleKey(key);

  // Validate role against whitelist
  if (!ALLOWED_ROLES.includes(roleKey)) {
    throw new AppError(
      `Invalid role "${key}". Allowed roles are: ${ALLOWED_ROLES.join(', ')}`,
      400
    );
  }

  const roleName = toTitleCase(roleKey);

  const role = await tx.role.upsert({
    where: { key: roleKey },
    update: {},
    create: {
      key: roleKey,
      name: roleName,
    },
  });

  // Only invalidate cache if not in a transaction (tx === prisma)
  // If in a transaction, let the caller invalidate after commit
  if (tx === prisma) {
    await cache.del(cache.rolesKey());
  }

  return role;
};

module.exports = {
  ensureRole,
  normalizeRoleKey,
  getAllRoles,
  ALLOWED_ROLES,
};

const prisma = require('../../lib/prisma');

// Models that require organization scoping
const TENANT_MODELS = [
  'user',
  'client',
  'vehicle',
  'asset',
  'resource',
  'appointment',
  'serviceOrder',
  'invoice',
  'payment',
  'schedule',
  'task',
  'timeEntry',
  'timeOffRequest',
  'notification',
  'auditLog',
  'registrationRequest',
];

/**
 * Create a tenant-scoped Prisma client
 * All queries on tenant models will be automatically filtered by organizationId
 * Reuses the global Prisma instance to avoid connection pool exhaustion
 *
 * @param {string} organizationId - The organization ID to scope queries to
 * @returns {PrismaClient} - Extended Prisma client with automatic tenant scoping
 */
function createTenantPrisma(organizationId) {
  // Reuse global prisma instance instead of creating new one

  // Build query extensions for all tenant models
  const queryExtensions = {};

  TENANT_MODELS.forEach((model) => {
    queryExtensions[model] = {
      // Scope all READ queries
      async findMany({ args, query }) {
        args.where = { ...args.where, organizationId };
        return query(args);
      },

      async findFirst({ args, query }) {
        args.where = { ...args.where, organizationId };
        return query(args);
      },

      async findUnique({ args, query }) {
        // For findUnique, we need to convert to findFirst since we're adding a condition
        const where = args.where;
        return prisma[model].findFirst({
          where: { ...where, organizationId },
          include: args.include,
          select: args.select,
        });
      },

      async count({ args, query }) {
        args.where = { ...args.where, organizationId };
        return query(args);
      },

      async aggregate({ args, query }) {
        args.where = { ...args.where, organizationId };
        return query(args);
      },

      async groupBy({ args, query }) {
        args.where = { ...args.where, organizationId };
        return query(args);
      },

      // Scope all WRITE queries
      async create({ args, query }) {
        args.data = { ...args.data, organizationId };
        return query(args);
      },

      async createMany({ args, query }) {
        if (Array.isArray(args.data)) {
          args.data = args.data.map((item) => ({ ...item, organizationId }));
        } else {
          args.data = { ...args.data, organizationId };
        }
        return query(args);
      },

      async update({ args, query }) {
        args.where = { ...args.where, organizationId };
        return query(args);
      },

      async updateMany({ args, query }) {
        args.where = { ...args.where, organizationId };
        return query(args);
      },

      async upsert({ args, query }) {
        args.where = { ...args.where, organizationId };
        args.create = { ...args.create, organizationId };
        args.update = { ...args.update };
        return query(args);
      },

      async delete({ args, query }) {
        args.where = { ...args.where, organizationId };
        return query(args);
      },

      async deleteMany({ args, query }) {
        args.where = { ...args.where, organizationId };
        return query(args);
      },
    };
  });

  return prisma.$extends({
    query: queryExtensions,
  });
}

module.exports = { createTenantPrisma, TENANT_MODELS };

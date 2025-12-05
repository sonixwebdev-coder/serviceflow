const { PrismaClient } = require('@prisma/client');

/**
 * Prisma client singleton to avoid exhausting DB connections
 * during local development with hot-reloads.
 */
const prisma = global.__prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

module.exports = prisma;

/**
 * Audit Log Service
 * Provides functions for logging and retrieving audit trail entries
 */

const { broadcastAuditLog } = require('../realtime/events');
const logger = require('../utils/logger');

/**
 * Log an audit action
 * @param {PrismaClient} prisma - Prisma client (tenant-scoped or global)
 * @param {Object} params - Audit log parameters
 * @param {string} params.actorId - ID of the user performing the action
 * @param {string} params.action - Action type (CREATE, UPDATE, DELETE, etc.)
 * @param {string} params.entityType - Type of entity (Client, Appointment, Invoice, etc.)
 * @param {string} params.entityId - ID of the affected entity
 * @param {string} params.description - Human-readable description
 * @param {Object} params.metadata - Additional context data
 * @param {string} params.ipAddress - IP address of the request
 * @param {string} params.organizationId - Organization ID for tenant scoping
 */
const logAction = async (
  prisma,
  {
    actorId,
    action,
    entityType,
    entityId,
    description,
    metadata = null,
    ipAddress = null,
    organizationId,
  }
) => {
  try {
    const auditLog = await prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        description,
        metadata,
        ipAddress,
        organizationId,
      },
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Broadcast to organization for real-time updates
    if (organizationId) {
      broadcastAuditLog(organizationId, auditLog);
    }

    return auditLog;
  } catch (error) {
    // Log but don't throw - audit logging should not break main operations
    logger.error('Failed to create audit log', { error: error.message });
    return null;
  }
};

/**
 * List audit logs with filtering and pagination
 * @param {PrismaClient} prisma - Tenant-scoped Prisma client
 * @param {Object} filters - Filter parameters
 */
const listAuditLogs = async (
  prisma,
  { entityType, entityId, actorId, action, dateFrom, dateTo, page = 1, limit = 50 } = {}
) => {
  const take = Math.min(limit, 100);
  const skip = (page - 1) * take;

  const where = {};

  if (entityType) {
    where.entityType = entityType;
  }

  if (entityId) {
    where.entityId = entityId;
  }

  if (actorId) {
    where.actorId = actorId;
  }

  if (action) {
    where.action = action;
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) {
      where.createdAt.gte = new Date(dateFrom);
    }
    if (dateTo) {
      where.createdAt.lte = new Date(dateTo);
    }
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit: take,
      total,
      pages: Math.ceil(total / take) || 1,
    },
  };
};

/**
 * Get activity for a specific entity
 * @param {PrismaClient} prisma - Tenant-scoped Prisma client
 * @param {string} entityType - Entity type
 * @param {string} entityId - Entity ID
 * @param {number} limit - Max items to return
 */
const getEntityActivity = async (prisma, entityType, entityId, limit = 20) => {
  return prisma.auditLog.findMany({
    where: {
      entityType,
      entityId,
    },
    include: {
      actor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: Math.min(limit, 50),
  });
};

/**
 * Get recent activity feed for the organization
 * @param {PrismaClient} prisma - Tenant-scoped Prisma client
 * @param {Object} options - Options
 */
const getActivityFeed = async (prisma, { limit = 30, entityTypes = null } = {}) => {
  const where = {};

  if (entityTypes && entityTypes.length > 0) {
    where.entityType = { in: entityTypes };
  }

  return prisma.auditLog.findMany({
    where,
    include: {
      actor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: Math.min(limit, 100),
  });
};

/**
 * Helper to create audit log from request context
 * @param {Object} req - Express request object
 * @param {Object} params - Audit parameters
 */
const logFromRequest = async (req, { action, entityType, entityId, description, metadata }) => {
  const prisma = req.tenantPrisma || require('../../lib/prisma');

  return logAction(prisma, {
    actorId: req.user?.id,
    action,
    entityType,
    entityId,
    description,
    metadata,
    ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
    organizationId: req.user?.organizationId,
  });
};

// Entity type constants for consistency
const ENTITY_TYPES = {
  CLIENT: 'Client',
  APPOINTMENT: 'Appointment',
  INVOICE: 'Invoice',
  TASK: 'Task',
  USER: 'User',
  ASSET: 'Asset',
  PAYMENT: 'Payment',
  TIME_OFF: 'TimeOffRequest',
  CHAT_CHANNEL: 'ChatChannel',
  CHAT_MESSAGE: 'ChatMessage',
};

// Action descriptions in Romanian
const ACTION_DESCRIPTIONS = {
  CREATE: {
    Client: 'a creat un client nou',
    Appointment: 'a creat o programare noua',
    Invoice: 'a creat o factura noua',
    Task: 'a creat un task nou',
    Asset: 'a adaugat un activ nou',
    Payment: 'a inregistrat o plata',
    TimeOffRequest: 'a solicitat concediu',
    ChatChannel: 'a creat un canal de chat',
  },
  UPDATE: {
    Client: 'a actualizat un client',
    Appointment: 'a modificat o programare',
    Invoice: 'a actualizat o factura',
    Task: 'a actualizat un task',
    Asset: 'a actualizat un activ',
    Payment: 'a modificat o plata',
    TimeOffRequest: 'a modificat cererea de concediu',
  },
  DELETE: {
    Client: 'a sters un client',
    Appointment: 'a anulat o programare',
    Invoice: 'a sters o factura',
    Task: 'a sters un task',
    Asset: 'a sters un activ',
  },
  APPROVE: {
    TimeOffRequest: 'a aprobat cererea de concediu',
  },
  REJECT: {
    TimeOffRequest: 'a respins cererea de concediu',
  },
};

/**
 * Get human-readable description for an action
 */
const getActionDescription = (action, entityType, entityName = '') => {
  const description = ACTION_DESCRIPTIONS[action]?.[entityType];
  if (description && entityName) {
    return `${description}: ${entityName}`;
  }
  return description || `${action} ${entityType}`;
};

module.exports = {
  logAction,
  listAuditLogs,
  getEntityActivity,
  getActivityFeed,
  logFromRequest,
  getActionDescription,
  ENTITY_TYPES,
};

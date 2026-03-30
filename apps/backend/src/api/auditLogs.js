const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { ok } = require('../utils/http');
const {
  listAuditLogs,
  getEntityActivity,
  getActivityFeed,
} = require('../services/auditLogService');

const router = express.Router();

// Restrict audit log routes - only admins and managers
router.use(authenticate, authorize({ permissions: ['audit:read'] }));

/**
 * GET /audit-logs
 * List audit logs with filtering
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const {
      entityType,
      entityId,
      actorId,
      action,
      dateFrom,
      dateTo,
      page,
      limit,
    } = req.query;

    const result = await listAuditLogs(req.tenantPrisma, {
      entityType,
      entityId,
      actorId,
      action,
      dateFrom,
      dateTo,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });

    return ok(res, result);
  })
);

/**
 * GET /audit-logs/feed
 * Get recent activity feed
 */
router.get(
  '/feed',
  authenticate,
  asyncHandler(async (req, res) => {
    const { limit, types } = req.query;

    const entityTypes = types ? types.split(',') : null;

    const items = await getActivityFeed(req.tenantPrisma, {
      limit: limit ? parseInt(limit) : 30,
      entityTypes,
    });

    return ok(res, items);
  })
);

/**
 * GET /audit-logs/entity/:entityType/:entityId
 * Get activity for a specific entity
 */
router.get(
  '/entity/:entityType/:entityId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { entityType, entityId } = req.params;
    const { limit } = req.query;

    const items = await getEntityActivity(
      req.tenantPrisma,
      entityType,
      entityId,
      limit ? parseInt(limit) : 20
    );

    return ok(res, items);
  })
);

module.exports = router;

const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { ok, noContent } = require('../utils/http');
const { listNotifications, markNotificationRead } = require('../services/notificationService');
const { z } = require('zod');

const listQuerySchema = z
  .object({
    isRead: z
      .string()
      .transform((value) => value === 'true')
      .optional(),
  })
  .optional();

const router = express.Router();

router.get(
  '/',
  authenticate,
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const notifications = await listNotifications(req.tenantPrisma, req.user.id, req.query || {});
    return ok(res, notifications);
  })
);

router.put(
  '/:notificationId/read',
  authenticate,
  asyncHandler(async (req, res) => {
    await markNotificationRead(req.tenantPrisma, req.params.notificationId, req.user.id);
    return noContent(res);
  })
);

module.exports = router;

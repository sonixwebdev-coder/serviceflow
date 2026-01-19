const express = require('express');
const router = express.Router();
const asyncHandler = require('../../middleware/asyncHandler');
const authenticateClient = require('../../middleware/authenticateClient');
const {
  listClientNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} = require('../../services/clientNotificationService');

/**
 * GET /api/portal/notifications
 * Get client's notifications
 */
router.get(
  '/',
  authenticateClient,
  asyncHandler(async (req, res) => {
    const { limit = 50, isRead } = req.query;

    const notifications = await listClientNotifications(req.client.id, {
      limit: parseInt(limit, 10),
      isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
    });

    res.json(notifications);
  })
);

/**
 * GET /api/portal/notifications/unread-count
 * Get unread notification count
 */
router.get(
  '/unread-count',
  authenticateClient,
  asyncHandler(async (req, res) => {
    const count = await getUnreadCount(req.client.id);
    res.json({ count });
  })
);

/**
 * POST /api/portal/notifications/:id/read
 * Mark a notification as read
 */
router.post(
  '/:id/read',
  authenticateClient,
  asyncHandler(async (req, res) => {
    const notification = await markNotificationRead(req.client.id, req.params.id);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true });
  })
);

/**
 * POST /api/portal/notifications/read-all
 * Mark all notifications as read
 */
router.post(
  '/read-all',
  authenticateClient,
  asyncHandler(async (req, res) => {
    const result = await markAllNotificationsRead(req.client.id);
    res.json(result);
  })
);

module.exports = router;

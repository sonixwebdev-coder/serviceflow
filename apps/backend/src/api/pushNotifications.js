const express = require('express');
const { z } = require('zod');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { ok, created } = require('../utils/http');
const {
  getVapidPublicKey,
  subscribeToPush,
  unsubscribeFromPush,
  getUserSubscriptions,
  getNotificationPreferences,
  updateNotificationPreferences,
} = require('../services/pushNotificationService');

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
  userAgent: z.string().optional(),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

const preferencesSchema = z.object({
  enablePushNotifications: z.boolean().optional(),
  enableAppointments: z.boolean().optional(),
  enableLeaveRequests: z.boolean().optional(),
  enableTasks: z.boolean().optional(),
  enableReminders: z.boolean().optional(),
  enableMessages: z.boolean().optional(),
  enablePayments: z.boolean().optional(),
});

const router = express.Router();

// Get VAPID public key for frontend
router.get(
  '/vapid-public-key',
  asyncHandler(async (req, res) => {
    const publicKey = getVapidPublicKey();
    return ok(res, { publicKey });
  })
);

// Subscribe to push notifications
router.post(
  '/subscribe',
  authenticate,
  validate(subscribeSchema),
  asyncHandler(async (req, res) => {
    const subscription = await subscribeToPush(req.user.id, req.body);
    return created(res, subscription, 'Successfully subscribed to push notifications');
  })
);

// Unsubscribe from push notifications
router.post(
  '/unsubscribe',
  authenticate,
  validate(unsubscribeSchema),
  asyncHandler(async (req, res) => {
    await unsubscribeFromPush(req.user.id, req.body.endpoint);
    return ok(res, { success: true }, 'Successfully unsubscribed');
  })
);

// Get user's subscriptions
router.get(
  '/subscriptions',
  authenticate,
  asyncHandler(async (req, res) => {
    const subscriptions = await getUserSubscriptions(req.user.id);
    return ok(res, subscriptions);
  })
);

// Get notification preferences
router.get(
  '/preferences',
  authenticate,
  asyncHandler(async (req, res) => {
    const preferences = await getNotificationPreferences(req.user.id);
    return ok(res, preferences);
  })
);

// Update notification preferences
router.put(
  '/preferences',
  authenticate,
  validate(preferencesSchema),
  asyncHandler(async (req, res) => {
    const preferences = await updateNotificationPreferences(req.user.id, req.body);
    return ok(res, preferences, 'Preferences updated successfully');
  })
);

module.exports = router;

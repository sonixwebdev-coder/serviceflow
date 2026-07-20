const webpush = require('web-push');
const prisma = require('../../lib/prisma');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');
const { getPlatformConfig } = require('../config/platform');
const {
  serializePushPayload,
  summarizeSubscriptionDeliveries,
  summarizeUserDeliveries,
  toWebPushSubscription,
} = require('./pushNotification/delivery');
const {
  buildAppointmentMessagePayload,
  buildAppointmentNotification,
  buildChatMessagePayload,
  buildLeaveRequestPayload,
  buildReminderPayload,
  buildTaskNotification,
} = require('./pushNotification/payloads');
const { isNotificationTypeEnabled, isPushEnabled } = require('./pushNotification/preferences');

// VAPID keys should be generated once and stored in environment variables
// For now, we'll generate them if not set (you should generate permanent keys)
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || `mailto:${getPlatformConfig().contactEmail}`;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

/**
 * Get VAPID public key for frontend
 */
const getVapidPublicKey = () => {
  if (!vapidPublicKey) {
    throw new AppError('VAPID keys not configured', 500);
  }
  return vapidPublicKey;
};

/**
 * Subscribe user to push notifications
 */
const subscribeToPush = async (userId, subscription) => {
  try {
    const { endpoint, keys } = subscription;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      throw new AppError('Invalid subscription data', 400);
    }

    // Check if subscription already exists
    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint },
    });

    if (existing) {
      // Update if it's for a different user or was inactive
      if (existing.userId !== userId || !existing.isActive) {
        await prisma.pushSubscription.update({
          where: { endpoint },
          data: {
            userId,
            keys,
            isActive: true,
            updatedAt: new Date(),
          },
        });
      }
      return existing;
    }

    // Create new subscription
    const pushSubscription = await prisma.pushSubscription.create({
      data: {
        userId,
        endpoint,
        keys,
        isActive: true,
      },
    });

    return pushSubscription;
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError('Subscription already exists', 409);
    }
    throw error;
  }
};

/**
 * Unsubscribe from push notifications
 */
const unsubscribeFromPush = async (userId, endpoint) => {
  const subscription = await prisma.pushSubscription.findFirst({
    where: {
      userId,
      endpoint,
    },
  });

  if (!subscription) {
    throw new AppError('Subscription not found', 404);
  }

  await prisma.pushSubscription.update({
    where: { id: subscription.id },
    data: { isActive: false },
  });

  return { success: true };
};

/**
 * Get user's push subscriptions
 */
const getUserSubscriptions = async (userId) => {
  return prisma.pushSubscription.findMany({
    where: {
      userId,
      isActive: true,
    },
    select: {
      id: true,
      endpoint: true,
      userAgent: true,
      createdAt: true,
    },
  });
};

/**
 * Get or create notification preferences for user
 */
const getNotificationPreferences = async (userId) => {
  let preferences = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  if (!preferences) {
    // Create default preferences
    preferences = await prisma.notificationPreference.create({
      data: { userId },
    });
  }

  return preferences;
};

/**
 * Update notification preferences
 */
const updateNotificationPreferences = async (userId, updates) => {
  const preferences = await prisma.notificationPreference.upsert({
    where: { userId },
    update: updates,
    create: {
      userId,
      ...updates,
    },
  });

  return preferences;
};

/**
 * Send push notification to specific user
 */
const sendPushToUser = async (userId, payload) => {
  // Check if user has push enabled
  const preferences = await getNotificationPreferences(userId);
  if (!isPushEnabled(preferences)) {
    return { sent: 0, failed: 0 };
  }

  // Get all active subscriptions for user
  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      userId,
      isActive: true,
    },
  });

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(toWebPushSubscription(sub), serializePushPayload(payload));
        return { success: true, subscriptionId: sub.id };
      } catch (error) {
        // If subscription is invalid (410 Gone), mark it as inactive
        if (error.statusCode === 410) {
          await prisma.pushSubscription.update({
            where: { id: sub.id },
            data: { isActive: false },
          });
        }
        return { success: false, subscriptionId: sub.id, error: error.message };
      }
    })
  );

  return summarizeSubscriptionDeliveries(results);
};

/**
 * Send push notification to multiple users
 */
const sendPushToUsers = async (userIds, payload) => {
  const results = await Promise.allSettled(
    userIds.map((userId) => sendPushToUser(userId, payload))
  );

  return summarizeUserDeliveries(results);
};

/**
 * Send notification for new appointment
 */
const sendAppointmentNotification = async (appointment, type = 'created') => {
  const notification = buildAppointmentNotification(appointment, type);
  if (!notification || notification.recipientIds.length === 0) return;

  // Check preferences for each recipient
  for (const userId of notification.recipientIds) {
    const preferences = await getNotificationPreferences(userId);
    if (!isNotificationTypeEnabled(preferences, 'enableAppointments')) {
      continue;
    }

    await sendPushToUser(userId, notification.payload);
  }
};

/**
 * Send notification for leave request
 */
const sendLeaveRequestNotification = async (request, type = 'created', recipientIds = []) => {
  const payload = buildLeaveRequestPayload(request, type);
  if (!payload) return;
  if (recipientIds.length === 0) return;

  for (const userId of recipientIds) {
    const preferences = await getNotificationPreferences(userId);
    if (!isNotificationTypeEnabled(preferences, 'enableLeaveRequests')) {
      continue;
    }

    await sendPushToUser(userId, payload);
  }
};

/**
 * Send notification for task
 */
const sendTaskNotification = async (task, type = 'assigned') => {
  const notification = buildTaskNotification(task, type);
  if (!notification || notification.recipientIds.length === 0) return;

  for (const userId of notification.recipientIds) {
    const preferences = await getNotificationPreferences(userId);
    if (!isNotificationTypeEnabled(preferences, 'enableTasks')) {
      continue;
    }

    await sendPushToUser(userId, notification.payload);
  }
};

/**
 * Send notification for reminder (personal todo)
 */
const sendReminderNotification = async (todo) => {
  const preferences = await getNotificationPreferences(todo.userId);
  if (!isNotificationTypeEnabled(preferences, 'enableReminders')) {
    return;
  }

  await sendPushToUser(todo.userId, buildReminderPayload(todo));
};

/**
 * Send notification for chat message
 * @param {Object} message - The chat message object
 * @param {Object} channel - The chat channel object
 * @param {Array} recipientIds - User IDs to notify (excluding message author)
 */
const sendChatMessageNotification = async (message, channel, recipientIds) => {
  if (!recipientIds || recipientIds.length === 0) return;
  const payload = buildChatMessagePayload(message, channel);

  for (const userId of recipientIds) {
    try {
      const preferences = await getNotificationPreferences(userId);
      if (!isNotificationTypeEnabled(preferences, 'enableMessages')) {
        continue;
      }

      await sendPushToUser(userId, payload);
    } catch (error) {
      logger.error('Failed to send chat notification', { userId, error: error.message });
    }
  }
};

/**
 * Send push notification for appointment message
 * @param {Object} params - Notification parameters
 * @param {string} params.appointmentId - The appointment ID
 * @param {string} params.appointmentTitle - The appointment title
 * @param {Object} params.author - The message author (user or client)
 * @param {string} params.messageBody - The message body
 * @param {string} params.messageType - The message type (TEXT, FILE, etc.)
 * @param {Array} params.recipientIds - User IDs to notify
 * @param {boolean} params.isFromClient - Whether the message is from a client
 */
const sendAppointmentMessageNotification = async ({
  appointmentId,
  appointmentTitle,
  author,
  messageBody,
  messageType,
  recipientIds,
  isFromClient = false,
}) => {
  if (!recipientIds || recipientIds.length === 0) return;
  const payload = buildAppointmentMessagePayload({
    appointmentId,
    appointmentTitle,
    author,
    messageBody,
    messageType,
    isFromClient,
  });

  for (const userId of recipientIds) {
    try {
      const preferences = await getNotificationPreferences(userId);
      if (!isNotificationTypeEnabled(preferences, 'enableMessages')) {
        continue;
      }

      await sendPushToUser(userId, payload);
    } catch (error) {
      logger.error('Failed to send appointment message notification', {
        userId,
        error: error.message,
      });
    }
  }
};

module.exports = {
  getVapidPublicKey,
  subscribeToPush,
  unsubscribeFromPush,
  getUserSubscriptions,
  getNotificationPreferences,
  updateNotificationPreferences,
  sendPushToUser,
  sendPushToUsers,
  sendAppointmentNotification,
  sendLeaveRequestNotification,
  sendTaskNotification,
  sendReminderNotification,
  sendChatMessageNotification,
  sendAppointmentMessageNotification,
};

const webpush = require('web-push');
const prisma = require('../../lib/prisma');
const { AppError } = require('../utils/errors');

// VAPID keys should be generated once and stored in environment variables
// For now, we'll generate them if not set (you should generate permanent keys)
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@viperx.ro';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );
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
  if (!preferences.enablePushNotifications) {
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
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          JSON.stringify(payload)
        );
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

  const sent = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.length - sent;

  return { sent, failed, total: results.length };
};

/**
 * Send push notification to multiple users
 */
const sendPushToUsers = async (userIds, payload) => {
  const results = await Promise.allSettled(
    userIds.map((userId) => sendPushToUser(userId, payload))
  );

  const summary = results.reduce(
    (acc, result) => {
      if (result.status === 'fulfilled') {
        acc.sent += result.value.sent;
        acc.failed += result.value.failed;
      } else {
        acc.errors.push(result.reason.message);
      }
      return acc;
    },
    { sent: 0, failed: 0, errors: [] }
  );

  return summary;
};

/**
 * Send notification for new appointment
 */
const sendAppointmentNotification = async (appointment, type = 'created') => {
  // Determine recipients based on type
  let recipientIds = [];
  let title = '';
  let body = '';
  let icon = '/icons/appointment.png';

  switch (type) {
    case 'created':
      // Notify assignees
      recipientIds = appointment.assignees?.map(a => a.userId || a.user?.id).filter(Boolean) || [];
      title = 'Programare noua';
      body = `Ai fost alocat la: ${appointment.title}`;
      break;
    case 'updated':
      recipientIds = appointment.assignees?.map(a => a.userId || a.user?.id).filter(Boolean) || [];
      title = 'Programare actualizata';
      body = `Programarea "${appointment.title}" a fost modificata`;
      break;
    case 'cancelled':
      recipientIds = appointment.assignees?.map(a => a.userId || a.user?.id).filter(Boolean) || [];
      title = 'Programare anulata';
      body = `Programarea "${appointment.title}" a fost anulata`;
      break;
    case 'message':
      recipientIds = appointment.assignees?.map(a => a.userId || a.user?.id).filter(Boolean) || [];
      title = 'Mesaj nou';
      body = `Mesaj nou la programarea "${appointment.title}"`;
      icon = '/icons/message.png';
      break;
    default:
      return;
  }

  if (recipientIds.length === 0) return;

  // Check preferences for each recipient
  for (const userId of recipientIds) {
    const preferences = await getNotificationPreferences(userId);
    if (!preferences.enablePushNotifications || !preferences.enableAppointments) {
      continue;
    }

    await sendPushToUser(userId, {
      title,
      body,
      icon,
      badge: '/icons/badge.png',
      data: {
        type: 'appointment',
        appointmentId: appointment.id,
        url: `/appointments?id=${appointment.id}`,
      },
    });
  }
};

/**
 * Send notification for leave request
 */
const sendLeaveRequestNotification = async (request, type = 'created', recipientIds = []) => {
  let title = '';
  let body = '';
  const icon = '/icons/leave.png';

  switch (type) {
    case 'created':
      title = 'Cerere de concediu noua';
      body = `${request.employee?.firstName} ${request.employee?.lastName} a solicitat concediu`;
      break;
    case 'approved':
      title = 'Cerere aprobata';
      body = 'Cererea ta de concediu a fost aprobata';
      break;
    case 'rejected':
      title = 'Cerere respinsa';
      body = 'Cererea ta de concediu a fost respinsa';
      break;
    default:
      return;
  }

  if (recipientIds.length === 0) return;

  for (const userId of recipientIds) {
    const preferences = await getNotificationPreferences(userId);
    if (!preferences.enablePushNotifications || !preferences.enableLeaveRequests) {
      continue;
    }

    await sendPushToUser(userId, {
      title,
      body,
      icon,
      badge: '/icons/badge.png',
      data: {
        type: 'leave',
        leaveRequestId: request.id,
        url: '/leave-requests',
      },
    });
  }
};

/**
 * Send notification for task
 */
const sendTaskNotification = async (task, type = 'assigned') => {
  let recipientIds = [];
  let title = '';
  let body = '';
  const icon = '/icons/task.png';

  switch (type) {
    case 'assigned':
      recipientIds = task.assignees?.map(a => a.userId).filter(Boolean) || [];
      title = 'Task nou alocat';
      body = `Ai fost alocat la: ${task.title}`;
      break;
    case 'updated':
      recipientIds = task.assignees?.map(a => a.userId).filter(Boolean) || [];
      title = 'Task actualizat';
      body = `Task-ul "${task.title}" a fost modificat`;
      break;
    case 'comment':
      recipientIds = task.assignees?.map(a => a.userId).filter(Boolean) || [];
      title = 'Comentariu nou';
      body = `Comentariu nou la task-ul "${task.title}"`;
      break;
    default:
      return;
  }

  if (recipientIds.length === 0) return;

  for (const userId of recipientIds) {
    const preferences = await getNotificationPreferences(userId);
    if (!preferences.enablePushNotifications || !preferences.enableTasks) {
      continue;
    }

    await sendPushToUser(userId, {
      title,
      body,
      icon,
      badge: '/icons/badge.png',
      data: {
        type: 'task',
        taskId: task.id,
        url: `/tasks?id=${task.id}`,
      },
    });
  }
};

/**
 * Send notification for reminder (personal todo)
 */
const sendReminderNotification = async (todo) => {
  const preferences = await getNotificationPreferences(todo.userId);
  if (!preferences.enablePushNotifications || !preferences.enableReminders) {
    return;
  }

  await sendPushToUser(todo.userId, {
    title: 'Reminder',
    body: todo.title,
    icon: '/icons/reminder.png',
    badge: '/icons/badge.png',
    data: {
      type: 'reminder',
      todoId: todo.id,
      url: '/dashboard',
    },
  });
};

/**
 * Send notification for chat message
 * @param {Object} message - The chat message object
 * @param {Object} channel - The chat channel object
 * @param {Array} recipientIds - User IDs to notify (excluding message author)
 */
const sendChatMessageNotification = async (message, channel, recipientIds) => {
  if (!recipientIds || recipientIds.length === 0) return;

  const authorName = `${message.author?.firstName || ''} ${message.author?.lastName || ''}`.trim() || 'Cineva';
  const channelName = channel.name || (channel.type === 'DIRECT' ? 'Mesaj direct' : 'Chat');

  let title = '';
  let body = '';
  const icon = '/icons/message.png';

  // Customize message based on channel type
  if (channel.type === 'DIRECT') {
    title = authorName;
    body = message.type === 'TEXT' ? message.body : getMessageTypeLabel(message.type);
  } else {
    title = `${channelName}`;
    body = `${authorName}: ${message.type === 'TEXT' ? message.body : getMessageTypeLabel(message.type)}`;
  }

  // Truncate body if too long
  if (body.length > 100) {
    body = body.substring(0, 97) + '...';
  }

  for (const userId of recipientIds) {
    try {
      const preferences = await getNotificationPreferences(userId);
      if (!preferences.enablePushNotifications || !preferences.enableMessages) {
        continue;
      }

      await sendPushToUser(userId, {
        title,
        body,
        icon,
        badge: '/icons/badge.png',
        tag: `chat-${channel.id}`, // Group notifications from same channel
        data: {
          type: 'chat',
          channelId: channel.id,
          messageId: message.id,
          url: `/chat?channel=${channel.id}`,
        },
      });
    } catch (error) {
      console.error(`Failed to send chat notification to user ${userId}:`, error);
    }
  }
};

/**
 * Get human-readable label for message type
 */
const getMessageTypeLabel = (type) => {
  switch (type) {
    case 'IMAGE':
      return 'A trimis o imagine';
    case 'FILE':
      return 'A trimis un fișier';
    case 'VOICE':
      return 'A trimis un mesaj vocal';
    default:
      return 'A trimis un mesaj';
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
};

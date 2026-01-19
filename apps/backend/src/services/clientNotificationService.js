const prisma = require('../../lib/prisma');
const { emitToClient } = require('../realtime/emitter');
const logger = require('../utils/logger');

/**
 * Create a notification for a client
 */
const createClientNotification = async ({
  clientId,
  title,
  message,
  type = 'MESSAGE',
  entityType,
  entityId,
  metadata,
}) => {
  try {
    const notification = await prisma.clientNotification.create({
      data: {
        clientId,
        title,
        message,
        type: type.toUpperCase().replace(/-/g, '_'),
        entityType,
        entityId,
        metadata,
      },
    });

    // Broadcast to client via socket
    emitToClient(clientId, 'portal:notification:new', {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      entityType: notification.entityType,
      entityId: notification.entityId,
      metadata: notification.metadata,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    });

    logger.info('[CLIENT_NOTIFICATION] Created notification', {
      notificationId: notification.id,
      clientId,
      type,
    });

    return notification;
  } catch (error) {
    logger.error('[CLIENT_NOTIFICATION] Failed to create notification', {
      error: error.message,
      clientId,
    });
    throw error;
  }
};

/**
 * List notifications for a client
 */
const listClientNotifications = async (clientId, { limit = 50, isRead } = {}) => {
  const notifications = await prisma.clientNotification.findMany({
    where: {
      clientId,
      ...(typeof isRead === 'boolean' ? { isRead } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return notifications.map((n) => ({
    id: n.id,
    _id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    entityType: n.entityType,
    entityId: n.entityId,
    metadata: n.metadata,
    isRead: n.isRead,
    readAt: n.readAt,
    createdAt: n.createdAt,
  }));
};

/**
 * Get unread notification count for a client
 */
const getUnreadCount = async (clientId) => {
  return prisma.clientNotification.count({
    where: {
      clientId,
      isRead: false,
    },
  });
};

/**
 * Mark a notification as read
 */
const markNotificationRead = async (clientId, notificationId) => {
  const notification = await prisma.clientNotification.findFirst({
    where: {
      id: notificationId,
      clientId,
    },
  });

  if (!notification) {
    return null;
  }

  return prisma.clientNotification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
};

/**
 * Mark all notifications as read for a client
 */
const markAllNotificationsRead = async (clientId) => {
  const result = await prisma.clientNotification.updateMany({
    where: {
      clientId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return { markedCount: result.count };
};

module.exports = {
  createClientNotification,
  listClientNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
};

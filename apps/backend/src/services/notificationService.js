const prisma = require('../../lib/prisma');
const { mapNotification } = require('../utils/transform');
const { AppError } = require('../utils/errors');
const { broadcastNotification } = require('../realtime/events');
const logger = require('../utils/logger');

const createNotification = async ({ recipientId, title, message, type, entityType, entityId, metadata, organizationId }) => {
  if (!recipientId) {
    logger.error('Cannot create notification without recipientId', { title, entityType, entityId });
    return null;
  }

  // Get organization ID from recipient if not provided
  let orgId = organizationId;
  if (!orgId) {
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { organizationId: true },
    });
    orgId = recipient?.organizationId;
  }

  if (!orgId) {
    logger.error('Cannot create notification without organizationId', { recipientId });
    return null;
  }

  const notification = await prisma.notification.create({
    data: {
      recipientId,
      title,
      message,
      type: type ? type.toUpperCase().replace(/-/g, '_') : 'SYSTEM',
      entityType,
      entityId,
      metadata,
      organizationId: orgId,
    },
    include: {
      recipient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  });

  const mapped = mapNotification(notification);
  broadcastNotification(mapped);
  return mapped;
};

const listNotifications = async (prisma, userId, { isRead } = {}) => {
  const notifications = await prisma.notification.findMany({
    where: {
      recipientId: userId,
      ...(typeof isRead === 'boolean' ? { isRead } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 100, // Safety limit — UI paginates or shows recent only
    include: {
      recipient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  });

  return notifications.map(mapNotification);
};

const markNotificationRead = async (prisma, notificationId, userId) => {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification || notification.recipientId !== userId) {
    throw new AppError('Notification not found', 404);
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  });
};

module.exports = {
  createNotification,
  listNotifications,
  markNotificationRead,
};

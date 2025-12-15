const { mapNotification } = require('../utils/transform');
const { AppError } = require('../utils/errors');
const { broadcastNotification } = require('../realtime/events');

const createNotification = async ({ recipientId, title, message, type, entityType, entityId, metadata }) => {
  const notification = await prisma.notification.create({
    data: {
      recipientId,
      title,
      message,
      type: type ? type.toUpperCase().replace(/-/g, '_') : 'SYSTEM',
      entityType,
      entityId,
      metadata,
    },
    include: {
      recipient: {
        include: {
          roles: {
            include: {
              role: true,
            },
          },
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
    include: {
      recipient: {
        include: {
          roles: {
            include: {
              role: true,
            },
          },
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

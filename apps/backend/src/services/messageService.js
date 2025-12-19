const { AppError } = require('../utils/errors');
const { mapUser } = require('../utils/transform');
const { broadcastMessage } = require('../realtime/events');
const { createNotification } = require('./notificationService');
const logger = require('../utils/logger');

const includeConfig = {
  author: {
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  },
  readReceipts: {
    include: {
      user: true,
    },
  },
};

const ensureAppointmentAccess = async (prisma, appointmentId, currentUser) => {
  const where = currentUser.organizationId
    ? { id: appointmentId, organizationId: currentUser.organizationId }
    : { id: appointmentId };

  const appointment = await prisma.appointment.findFirst({
    where,
    include: {
      assignees: true,
    },
  });

  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  const managerial = currentUser.roles?.some((role) => ['admin', 'manager'].includes(role));

  if (managerial) {
    return appointment;
  }

  const isAssignee = appointment.assignees.some((assignee) => assignee.userId === currentUser.id);

  if (!isAssignee) {
    throw new AppError('You do not have access to this appointment', 403);
  }

  return appointment;
};

const listMessages = async (prisma, appointmentId, currentUser) => {
  await ensureAppointmentAccess(prisma, appointmentId, currentUser);

  const messages = await prisma.message.findMany({
    where: { appointmentId },
    orderBy: { createdAt: 'asc' },
    include: includeConfig,
  });

  return messages.map((message) => ({
    id: message.id,
    _id: message.id,
    appointmentId: message.appointmentId,
    author: mapUser(message.author),
    authorId: message.authorId,
    body: message.body,
    type: message.type?.toLowerCase() || 'text',
    metadata: message.metadata,
    readReceipts: message.readReceipts.map((receipt) => ({
      userId: receipt.userId,
      readAt: receipt.readAt,
    })),
    isRead: message.readReceipts.some((receipt) => receipt.userId === currentUser.id),
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  }));
};

const createMessage = async (prisma, appointmentId, currentUser, { body, type, metadata }) => {
  if (!body?.trim()) {
    throw new AppError('Message body is required', 400);
  }

  const appointment = await ensureAppointmentAccess(prisma, appointmentId, currentUser);

  const message = await prisma.message.create({
    data: {
      appointmentId,
      authorId: currentUser.id,
      body,
      type: type ? type.toUpperCase() : 'TEXT',
      metadata,
    },
    include: includeConfig,
  });

  const payload = {
    id: message.id,
    _id: message.id,
    appointmentId: message.appointmentId,
    author: mapUser(message.author),
    authorId: message.authorId,
    body: message.body,
    type: message.type?.toLowerCase() || 'text',
    metadata: message.metadata,
    readReceipts: [],
    isRead: false,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };

  broadcastMessage(appointment.organizationId, appointmentId, payload);

  // Create notifications for all users with access except the author
  try {
    const recipientIds = new Set();

    // Add all assignees
    appointment.assignees?.forEach((assignee) => {
      if (assignee.userId !== currentUser.id) {
        recipientIds.add(assignee.userId);
      }
    });

    // Add admins
    const adminUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        roles: {
          some: {
            role: {
              key: {
                in: ['admin', 'ADMIN', 'Admin'],
              },
            },
          },
        },
      },
      select: { id: true },
    });

    adminUsers.forEach((admin) => {
      if (admin.id !== currentUser.id) {
        recipientIds.add(admin.id);
      }
    });

    // Get full appointment details for notification
    const fullAppointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: true,
        vehicle: true,
      },
    });

    const appointmentTitle = fullAppointment?.title || 'Programare';
    const authorName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Un utilizator';
    const messagePreview = body.substring(0, 80);

    // Create notifications
    const notificationPromises = Array.from(recipientIds).map((recipientId) =>
      createNotification(prisma, {
        recipientId,
        title: 'Mesaj nou',
        message: `${authorName} in "${appointmentTitle}": ${messagePreview}${body.length > 80 ? '...' : ''}`,
        type: 'MESSAGE',
        entityType: 'appointment',
        entityId: appointmentId,
        metadata: {
          messageId: message.id,
          appointmentId,
          appointmentTitle,
        },
      })
    );

    await Promise.all(notificationPromises);
    logger.info('[MESSAGE] Created notifications for new message', {
      messageId: message.id,
      appointmentId,
      recipientCount: recipientIds.size,
    });
  } catch (notificationError) {
    logger.error('[MESSAGE] Failed to create notifications', {
      error: notificationError.message,
      messageId: message.id,
    });
  }

  return payload;
};

const markMessagesAsRead = async (prisma, appointmentId, currentUser) => {
  await ensureAppointmentAccess(prisma, appointmentId, currentUser);

  // Get all messages in this appointment that aren't authored by the current user
  // and that the user hasn't already read
  const messages = await prisma.message.findMany({
    where: {
      appointmentId,
      authorId: { not: currentUser.id },
      readReceipts: {
        none: {
          userId: currentUser.id,
        },
      },
    },
    select: { id: true },
  });

  if (messages.length === 0) {
    return { markedCount: 0 };
  }

  // Create read receipts for all unread messages
  await prisma.messageReadReceipt.createMany({
    data: messages.map((msg) => ({
      messageId: msg.id,
      userId: currentUser.id,
    })),
    skipDuplicates: true,
  });

  logger.info('[MESSAGE] Marked messages as read', {
    appointmentId,
    userId: currentUser.id,
    count: messages.length,
  });

  return { markedCount: messages.length };
};

const getUnreadMessageCount = async (prisma, appointmentId, currentUser) => {
  await ensureAppointmentAccess(prisma, appointmentId, currentUser);

  const count = await prisma.message.count({
    where: {
      appointmentId,
      authorId: { not: currentUser.id },
      readReceipts: {
        none: {
          userId: currentUser.id,
        },
      },
    },
  });

  return count;
};

module.exports = {
  listMessages,
  createMessage,
  markMessagesAsRead,
  getUnreadMessageCount,
};

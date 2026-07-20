const { AppError } = require('../utils/errors');
const { broadcastMessage, broadcastMessageToClient } = require('../realtime/events');
const { createNotification } = require('./notificationService');
const { createClientNotification } = require('./clientNotificationService');
const { sendAppointmentMessageNotification } = require('./pushNotificationService');
const {
  MESSAGE_INCLUDE,
  mapCreatedFileMessage,
  mapCreatedTextMessage,
  mapListedMessage,
} = require('./message/messagePresentation');
const logger = require('../utils/logger');

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
    include: MESSAGE_INCLUDE,
  });

  return messages.map((message) => mapListedMessage(message, currentUser.id));
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
    include: MESSAGE_INCLUDE,
  });

  const payload = mapCreatedTextMessage(message);

  // Broadcast to CRM organization room
  broadcastMessage(appointment.organizationId, appointmentId, payload);

  // Also broadcast to client portal if appointment has a client
  if (appointment.clientId) {
    broadcastMessageToClient(appointment.clientId, appointmentId, payload);

    // Create a persistent notification for the client
    try {
      const fullAppointmentForClient = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { title: true },
      });
      const appointmentTitleForClient = fullAppointmentForClient?.title || 'Programare';
      const authorNameForClient =
        `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Echipa';
      const messagePreviewForClient = body.substring(0, 80);

      await createClientNotification({
        clientId: appointment.clientId,
        title: 'Mesaj nou',
        message: `${authorNameForClient} in "${appointmentTitleForClient}": ${messagePreviewForClient}${body.length > 80 ? '...' : ''}`,
        type: 'MESSAGE',
        entityType: 'appointment',
        entityId: appointmentId,
        metadata: {
          messageId: message.id,
          appointmentId,
          appointmentTitle: appointmentTitleForClient,
        },
      });
    } catch (clientNotificationError) {
      logger.error('[MESSAGE] Failed to create client notification', {
        error: clientNotificationError.message,
        messageId: message.id,
        clientId: appointment.clientId,
      });
    }
  }

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
        asset: true,
      },
    });

    const appointmentTitle = fullAppointment?.title || 'Programare';
    const authorName =
      `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Un utilizator';
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

    // Send push notifications
    await sendAppointmentMessageNotification({
      appointmentId,
      appointmentTitle,
      author: currentUser,
      messageBody: body,
      messageType: type?.toUpperCase() || 'TEXT',
      recipientIds: Array.from(recipientIds),
      isFromClient: false,
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
  // (including client-authored messages) and that the user hasn't already read
  const messages = await prisma.message.findMany({
    where: {
      appointmentId,
      OR: [{ authorId: { not: currentUser.id } }, { clientAuthorId: { not: null } }],
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
      OR: [{ authorId: { not: currentUser.id } }, { clientAuthorId: { not: null } }],
      readReceipts: {
        none: {
          userId: currentUser.id,
        },
      },
    },
  });

  return count;
};

/**
 * Create a file attachment message
 */
const createFileMessage = async (
  prisma,
  appointmentId,
  currentUser,
  { fileName, fileUrl, fileType, fileSize, isVoice, duration }
) => {
  const appointment = await ensureAppointmentAccess(prisma, appointmentId, currentUser);

  const message = await prisma.message.create({
    data: {
      appointmentId,
      authorId: currentUser.id,
      body: fileName,
      type: 'FILE',
      metadata: isVoice ? { isVoice: true, duration } : null,
      attachments: {
        create: {
          fileName,
          fileUrl,
          fileType,
          fileSize,
        },
      },
    },
    include: MESSAGE_INCLUDE,
  });

  const payload = mapCreatedFileMessage(message);

  // Broadcast to CRM organization room
  broadcastMessage(appointment.organizationId, appointmentId, payload);

  // Also broadcast to client portal if appointment has a client
  if (appointment.clientId) {
    broadcastMessageToClient(appointment.clientId, appointmentId, payload);

    // Create a persistent notification for the client
    try {
      const fullAppointmentForClient = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { title: true },
      });
      const appointmentTitleForClient = fullAppointmentForClient?.title || 'Programare';
      const authorNameForClient =
        `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Echipa';
      const isVoiceMessage = isVoice;
      const messageText = isVoiceMessage
        ? `${authorNameForClient} a trimis un mesaj vocal in "${appointmentTitleForClient}"`
        : `${authorNameForClient} a trimis un fisier in "${appointmentTitleForClient}"`;

      await createClientNotification({
        clientId: appointment.clientId,
        title: isVoiceMessage ? 'Mesaj vocal nou' : 'Fisier nou',
        message: messageText,
        type: 'MESSAGE',
        entityType: 'appointment',
        entityId: appointmentId,
        metadata: {
          messageId: message.id,
          appointmentId,
          appointmentTitle: appointmentTitleForClient,
          isVoice: isVoiceMessage,
        },
      });
    } catch (clientNotificationError) {
      logger.error('[MESSAGE] Failed to create client notification for file', {
        error: clientNotificationError.message,
        messageId: message.id,
        clientId: appointment.clientId,
      });
    }
  }

  // Create notifications for file messages
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

    if (recipientIds.size > 0) {
      const fullAppointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });

      const appointmentTitle = fullAppointment?.title || 'Programare';

      const recipientList = Array.from(recipientIds);
      const authorName =
        `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Utilizator';

      // Create in-app notifications
      await Promise.all(
        recipientList.map((recipientId) =>
          createNotification({
            recipientId,
            title: 'Fisier nou',
            message: `${authorName} a trimis un fisier in "${appointmentTitle}"`,
            type: 'MESSAGE',
            entityType: 'appointment',
            entityId: appointmentId,
            organizationId: currentUser.organizationId,
          }).catch(() => {})
        )
      );

      // Send push notifications for file
      await sendAppointmentMessageNotification({
        appointmentId,
        appointmentTitle,
        author: currentUser,
        messageBody: fileName,
        messageType: 'FILE',
        recipientIds: recipientList,
        isFromClient: false,
      });
    }
  } catch (notificationError) {
    logger.error('[MESSAGE] Failed to create file message notifications', {
      error: notificationError.message,
      messageId: message.id,
    });
  }

  return payload;
};

module.exports = {
  listMessages,
  createMessage,
  markMessagesAsRead,
  getUnreadMessageCount,
  createFileMessage,
};

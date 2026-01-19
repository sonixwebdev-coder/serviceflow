const { AppError } = require('../utils/errors');
const { mapUser } = require('../utils/transform');
const { broadcastMessage, broadcastMessageToClient } = require('../realtime/events');
const { createNotification } = require('./notificationService');
const { sendAppointmentMessageNotification } = require('./pushNotificationService');
const logger = require('../utils/logger');

/**
 * Include config for messages - includes both user and client author data
 */
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
  clientAuthor: true,
  readReceipts: {
    include: {
      user: true,
      client: true,
    },
  },
  attachments: true,
};

/**
 * Map a client to author format
 */
const mapClientAuthor = (client) => {
  if (!client) return null;

  const displayName = client.companyName ||
    [client.firstName, client.lastName].filter(Boolean).join(' ') ||
    'Client';

  return {
    id: client.id,
    _id: client.id,
    firstName: client.firstName || displayName,
    lastName: client.lastName || '',
    email: client.email,
    avatarUrl: null,
    type: 'client',
  };
};

/**
 * Map message to response format (handles both user and client authors)
 */
const mapMessage = (message, currentClientId = null) => {
  const isClientAuthor = !!message.clientAuthorId;

  return {
    id: message.id,
    _id: message.id,
    appointmentId: message.appointmentId,
    author: isClientAuthor
      ? mapClientAuthor(message.clientAuthor)
      : { ...mapUser(message.author), type: 'user' },
    authorId: message.authorId,
    clientAuthorId: message.clientAuthorId,
    body: message.body,
    type: message.type?.toLowerCase() || 'text',
    metadata: message.metadata,
    attachments: message.attachments?.map(att => ({
      id: att.id,
      fileName: att.fileName,
      fileUrl: att.fileUrl,
      fileType: att.fileType,
      fileSize: att.fileSize,
    })) || [],
    readReceipts: message.readReceipts?.map((receipt) => ({
      id: receipt.id,
      userId: receipt.userId,
      clientId: receipt.clientId,
      readAt: receipt.readAt,
    })) || [],
    isRead: currentClientId
      ? message.readReceipts?.some((receipt) => receipt.clientId === currentClientId)
      : false,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
};

/**
 * Verify that a client owns the specified appointment
 */
const ensureClientOwnsAppointment = async (prisma, clientId, appointmentId) => {
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      clientId: clientId,
    },
    include: {
      assignees: {
        include: {
          user: true,
        },
      },
      client: true,
    },
  });

  if (!appointment) {
    throw new AppError('Appointment not found or access denied', 404);
  }

  return appointment;
};

/**
 * List messages for an appointment (client portal)
 */
const listMessages = async (prisma, clientId, appointmentId) => {
  await ensureClientOwnsAppointment(prisma, clientId, appointmentId);

  const messages = await prisma.message.findMany({
    where: { appointmentId },
    orderBy: { createdAt: 'asc' },
    include: includeConfig,
  });

  return messages.map((message) => mapMessage(message, clientId));
};

/**
 * Create a message from a client (client portal)
 */
const createMessage = async (prisma, clientId, appointmentId, { body, type, metadata }) => {
  if (!body?.trim()) {
    throw new AppError('Message body is required', 400);
  }

  const appointment = await ensureClientOwnsAppointment(prisma, clientId, appointmentId);

  // Get client details for the message
  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });

  const message = await prisma.message.create({
    data: {
      appointmentId,
      clientAuthorId: clientId,
      body,
      type: type ? type.toUpperCase() : 'TEXT',
      metadata,
    },
    include: includeConfig,
  });

  const payload = mapMessage(message, clientId);

  // Broadcast to CRM organization room
  logger.info('[PORTAL_MESSAGE] Broadcasting message to CRM', {
    appointmentId,
    organizationId: appointment.organizationId,
    messageId: message.id,
  });

  if (appointment.organizationId) {
    broadcastMessage(appointment.organizationId, appointmentId, payload);
  } else {
    logger.warn('[PORTAL_MESSAGE] No organizationId, cannot broadcast to CRM');
  }

  // Create notifications for assigned staff
  try {
    const recipientIds = new Set();

    // Add all assignees
    appointment.assignees?.forEach((assignee) => {
      recipientIds.add(assignee.userId);
    });

    // Add admins from the organization
    if (appointment.organizationId) {
      const adminUsers = await prisma.user.findMany({
        where: {
          organizationId: appointment.organizationId,
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
        recipientIds.add(admin.id);
      });
    }

    const clientName = client?.companyName ||
      [client?.firstName, client?.lastName].filter(Boolean).join(' ') ||
      'Un client';
    const appointmentTitle = appointment.title || 'Programare';
    const messagePreview = body.substring(0, 80);

    // Create notifications
    const notificationPromises = Array.from(recipientIds).map((recipientId) =>
      createNotification(prisma, {
        recipientId,
        title: 'Mesaj nou de la client',
        message: `${clientName} in "${appointmentTitle}": ${messagePreview}${body.length > 80 ? '...' : ''}`,
        type: 'MESSAGE',
        entityType: 'appointment',
        entityId: appointmentId,
        metadata: {
          messageId: message.id,
          appointmentId,
          appointmentTitle,
          clientId,
          source: 'portal',
        },
        organizationId: appointment.organizationId,
      })
    );

    await Promise.all(notificationPromises);
    logger.info('[PORTAL_MESSAGE] Created notifications for client message', {
      messageId: message.id,
      appointmentId,
      clientId,
      recipientCount: recipientIds.size,
    });

    // Send push notifications to CRM staff
    await sendAppointmentMessageNotification({
      appointmentId,
      appointmentTitle,
      author: client,
      messageBody: body,
      messageType: type?.toUpperCase() || 'TEXT',
      recipientIds: Array.from(recipientIds),
      isFromClient: true,
    });
  } catch (notificationError) {
    logger.error('[PORTAL_MESSAGE] Failed to create notifications', {
      error: notificationError.message,
      messageId: message.id,
    });
  }

  return payload;
};

/**
 * Mark messages as read by client
 */
const markMessagesAsRead = async (prisma, clientId, appointmentId) => {
  await ensureClientOwnsAppointment(prisma, clientId, appointmentId);

  // Get all messages in this appointment that aren't authored by the client
  // and that the client hasn't already read
  const messages = await prisma.message.findMany({
    where: {
      appointmentId,
      clientAuthorId: { not: clientId },
      readReceipts: {
        none: {
          clientId: clientId,
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
      clientId: clientId,
    })),
    skipDuplicates: true,
  });

  logger.info('[PORTAL_MESSAGE] Marked messages as read by client', {
    appointmentId,
    clientId,
    count: messages.length,
  });

  return { markedCount: messages.length };
};

/**
 * Get unread message count for client
 */
const getUnreadMessageCount = async (prisma, clientId, appointmentId) => {
  await ensureClientOwnsAppointment(prisma, clientId, appointmentId);

  const count = await prisma.message.count({
    where: {
      appointmentId,
      clientAuthorId: { not: clientId },
      readReceipts: {
        none: {
          clientId: clientId,
        },
      },
    },
  });

  return count;
};

/**
 * Create a file attachment message
 */
const createFileMessage = async (prisma, clientId, appointmentId, { fileName, fileUrl, fileType, fileSize }) => {
  const appointment = await ensureClientOwnsAppointment(prisma, clientId, appointmentId);

  const message = await prisma.message.create({
    data: {
      appointmentId,
      clientAuthorId: clientId,
      body: fileName,
      type: 'FILE',
      attachments: {
        create: {
          fileName,
          fileUrl,
          fileType,
          fileSize,
        },
      },
    },
    include: includeConfig,
  });

  const payload = mapMessage(message, clientId);

  // Broadcast to CRM organization room
  if (appointment.organizationId) {
    broadcastMessage(appointment.organizationId, appointmentId, payload);
  }

  // Create notifications for file messages from client
  try {
    const recipientIds = new Set();

    // Add all assignees
    appointment.assignees?.forEach((assignee) => {
      recipientIds.add(assignee.userId);
    });

    // Add admins from the organization
    if (appointment.organizationId) {
      const adminUsers = await prisma.user.findMany({
        where: {
          organizationId: appointment.organizationId,
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
        recipientIds.add(admin.id);
      });
    }

    if (recipientIds.size > 0) {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
      });

      const appointmentTitle = appointment.title || 'Programare';

      // Send push notifications
      await sendAppointmentMessageNotification({
        appointmentId,
        appointmentTitle,
        author: client,
        messageBody: fileName,
        messageType: 'FILE',
        recipientIds: Array.from(recipientIds),
        isFromClient: true,
      });
    }
  } catch (notificationError) {
    logger.error('[PORTAL_MESSAGE] Failed to create file message notifications', {
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
  ensureClientOwnsAppointment,
  mapMessage,
  mapClientAuthor,
};

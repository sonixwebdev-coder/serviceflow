const { AppError } = require('../utils/errors');
const { writeFile, removeFile } = require('../utils/storage');
const { ensureChannelAccess } = require('./chatService');
const crypto = require('crypto');
const path = require('path');

/**
 * Chat Message Service
 * Handles message CRUD, attachments, read receipts, and pagination
 */

/**
 * List messages in a channel with pagination
 * @param {PrismaClient} prisma - Tenant-scoped Prisma client
 * @param {string} channelId - Channel ID
 * @param {Object} options - Pagination options
 * @param {number} options.limit - Number of messages to fetch
 * @param {string} options.before - Message ID to load messages before
 * @param {string} options.after - Message ID to load messages after
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} Paginated messages
 */
async function listMessages(prisma, channelId, options = {}, currentUser) {
  // Ensure user has access to channel
  await ensureChannelAccess(prisma, channelId, currentUser);

  const { limit = 50, before = null, after = null } = options;

  const where = {
    channelId,
    isDeleted: false,
  };

  // Cursor-based pagination
  if (before) {
    const beforeMessage = await prisma.chatMessage.findUnique({
      where: { id: before },
    });
    if (beforeMessage) {
      where.createdAt = { lt: beforeMessage.createdAt };
    }
  }

  if (after) {
    const afterMessage = await prisma.chatMessage.findUnique({
      where: { id: after },
    });
    if (afterMessage) {
      where.createdAt = { gt: afterMessage.createdAt };
    }
  }

  const messages = await prisma.chatMessage.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
        },
      },
      attachments: true,
      readReceipts: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });

  // Return in chronological order (oldest first)
  return messages.reverse();
}

/**
 * Create a new message in a channel
 * @param {PrismaClient} prisma - Tenant-scoped Prisma client
 * @param {string} channelId - Channel ID
 * @param {Object} data - Message data
 * @param {string} data.body - Message body
 * @param {string} data.type - Message type (TEXT, FILE, VOICE, IMAGE, SYSTEM)
 * @param {Object} data.metadata - Optional metadata
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} Created message
 */
async function createMessage(prisma, channelId, data, currentUser) {
  // Ensure user has access to channel
  await ensureChannelAccess(prisma, channelId, currentUser);

  const { body, type = 'TEXT', metadata = null } = data;

  if (!body || body.trim().length === 0) {
    throw new AppError('Message body cannot be empty', 400);
  }

  // Create message and update channel timestamp
  const message = await prisma.$transaction(async (tx) => {
    const newMessage = await tx.chatMessage.create({
      data: {
        channelId,
        authorId: currentUser.id,
        body: body.trim(),
        type,
        metadata,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        attachments: true,
      },
    });

    // Update channel's updatedAt timestamp
    await tx.chatChannel.update({
      where: { id: channelId },
      data: { updatedAt: new Date() },
    });

    return newMessage;
  });

  return message;
}

/**
 * Update a message
 * @param {PrismaClient} prisma - Tenant-scoped Prisma client
 * @param {string} messageId - Message ID
 * @param {Object} updates - Fields to update
 * @param {string} updates.body - New message body
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} Updated message
 */
async function updateMessage(prisma, messageId, updates, currentUser) {
  const { body } = updates;

  if (!body || body.trim().length === 0) {
    throw new AppError('Message body cannot be empty', 400);
  }

  // Get message and verify ownership
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    include: { channel: true },
  });

  if (!message) {
    throw new AppError('Message not found', 404);
  }

  if (message.authorId !== currentUser.id) {
    throw new AppError('You can only edit your own messages', 403);
  }

  // Ensure user still has access to channel
  await ensureChannelAccess(prisma, message.channelId, currentUser);

  const updatedMessage = await prisma.chatMessage.update({
    where: { id: messageId },
    data: {
      body: body.trim(),
      editedAt: new Date(),
    },
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
        },
      },
      attachments: true,
    },
  });

  return updatedMessage;
}

/**
 * Delete a message (soft delete)
 * @param {PrismaClient} prisma - Tenant-scoped Prisma client
 * @param {string} messageId - Message ID
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} Deleted message info
 */
async function deleteMessage(prisma, messageId, currentUser) {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    include: {
      channel: {
        include: {
          members: {
            where: { userId: currentUser.id },
          },
        },
      },
      attachments: true,
    },
  });

  if (!message) {
    throw new AppError('Message not found', 404);
  }

  // Check if user can delete (owner or admin)
  const member = message.channel.members[0];
  const canDelete = message.authorId === currentUser.id || ['OWNER', 'ADMIN'].includes(member?.role);

  if (!canDelete) {
    throw new AppError('You can only delete your own messages', 403);
  }

  // Soft delete message and delete attachments
  await prisma.$transaction(async (tx) => {
    // Soft delete the message
    await tx.chatMessage.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        body: '[deleted]',
      },
    });

    // Delete attachments from filesystem
    for (const attachment of message.attachments) {
      try {
        await removeFile(attachment.fileUrl);
      } catch (error) {
        console.error(`Failed to delete file: ${attachment.fileUrl}`, error);
      }
    }

    // Delete attachment records
    await tx.chatAttachment.deleteMany({
      where: { messageId },
    });
  });

  return { id: messageId, channelId: message.channelId };
}

/**
 * Save file attachment
 * @param {Object} file - Multer file object
 * @param {string} organizationId - Organization ID
 * @param {string} channelId - Channel ID
 * @returns {Promise<Object>} Attachment metadata
 */
async function saveAttachment(file, organizationId, channelId) {
  const fileHash = crypto.randomBytes(16).toString('hex');
  const ext = path.extname(file.originalname);
  const fileName = `${fileHash}${ext}`;
  const relativePath = `chat/${organizationId}/${channelId}/files/${fileName}`;

  await writeFile(relativePath, file.buffer);

  return {
    fileName: file.originalname,
    fileUrl: relativePath,
    fileType: file.mimetype,
    fileSize: file.size,
  };
}

/**
 * Save voice message
 * @param {Object} file - Multer file object
 * @param {string} organizationId - Organization ID
 * @param {string} channelId - Channel ID
 * @returns {Promise<Object>} Voice message metadata
 */
async function saveVoiceMessage(file, organizationId, channelId) {
  const fileHash = crypto.randomBytes(16).toString('hex');
  const ext = path.extname(file.originalname) || '.webm';
  const fileName = `voice-${fileHash}${ext}`;
  const relativePath = `chat/${organizationId}/${channelId}/voice/${fileName}`;

  await writeFile(relativePath, file.buffer);

  return {
    fileName: fileName,
    fileUrl: relativePath,
    fileType: file.mimetype,
    fileSize: file.size,
  };
}

/**
 * Create attachment for a message
 * @param {PrismaClient} prisma - Tenant-scoped Prisma client
 * @param {string} messageId - Message ID
 * @param {Object} attachmentData - Attachment metadata
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} Created attachment
 */
async function createAttachment(prisma, messageId, attachmentData, currentUser) {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    throw new AppError('Message not found', 404);
  }

  if (message.authorId !== currentUser.id) {
    throw new AppError('You can only add attachments to your own messages', 403);
  }

  const attachment = await prisma.chatAttachment.create({
    data: {
      messageId,
      ...attachmentData,
    },
  });

  return attachment;
}

/**
 * Delete an attachment
 * @param {PrismaClient} prisma - Tenant-scoped Prisma client
 * @param {string} attachmentId - Attachment ID
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<void>}
 */
async function deleteAttachment(prisma, attachmentId, currentUser) {
  const attachment = await prisma.chatAttachment.findUnique({
    where: { id: attachmentId },
    include: {
      message: true,
    },
  });

  if (!attachment) {
    throw new AppError('Attachment not found', 404);
  }

  if (attachment.message.authorId !== currentUser.id) {
    throw new AppError('You can only delete your own attachments', 403);
  }

  // Delete from filesystem
  await removeFile(attachment.fileUrl);

  // Delete from database
  await prisma.chatAttachment.delete({
    where: { id: attachmentId },
  });
}

/**
 * Mark channel as read for the current user
 * @param {PrismaClient} prisma - Tenant-scoped Prisma client
 * @param {string} channelId - Channel ID
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<void>}
 */
async function markChannelAsRead(prisma, channelId, currentUser) {
  await ensureChannelAccess(prisma, channelId, currentUser);

  // Update member's lastReadAt timestamp
  await prisma.chatMember.update({
    where: {
      channelId_userId: {
        channelId,
        userId: currentUser.id,
      },
    },
    data: {
      lastReadAt: new Date(),
    },
  });
}

/**
 * Get unread message count for a channel
 * @param {PrismaClient} prisma - Tenant-scoped Prisma client
 * @param {string} channelId - Channel ID
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<number>} Unread message count
 */
async function getUnreadCount(prisma, channelId, currentUser) {
  const member = await prisma.chatMember.findUnique({
    where: {
      channelId_userId: {
        channelId,
        userId: currentUser.id,
      },
    },
  });

  if (!member) {
    return 0;
  }

  const lastReadAt = member.lastReadAt || new Date(0);

  const count = await prisma.chatMessage.count({
    where: {
      channelId,
      createdAt: { gt: lastReadAt },
      authorId: { not: currentUser.id }, // Don't count own messages
      isDeleted: false,
    },
  });

  return count;
}

/**
 * Get unread counts for all channels
 * @param {PrismaClient} prisma - Tenant-scoped Prisma client
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} Map of channelId to unread count
 */
async function getAllUnreadCounts(prisma, currentUser) {
  const memberships = await prisma.chatMember.findMany({
    where: {
      userId: currentUser.id,
    },
    include: {
      channel: {
        select: {
          id: true,
          isArchived: true,
        },
      },
    },
  });

  const unreadCounts = {};

  for (const membership of memberships) {
    if (membership.channel.isArchived) {
      continue;
    }

    const lastReadAt = membership.lastReadAt || new Date(0);
    const count = await prisma.chatMessage.count({
      where: {
        channelId: membership.channelId,
        createdAt: { gt: lastReadAt },
        authorId: { not: currentUser.id },
        isDeleted: false,
      },
    });

    unreadCounts[membership.channelId] = count;
  }

  return unreadCounts;
}

/**
 * Create read receipt for a message
 * @param {PrismaClient} prisma - Tenant-scoped Prisma client
 * @param {string} messageId - Message ID
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} Created read receipt
 */
async function createReadReceipt(prisma, messageId, currentUser) {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    throw new AppError('Message not found', 404);
  }

  await ensureChannelAccess(prisma, message.channelId, currentUser);

  const receipt = await prisma.chatReadReceipt.upsert({
    where: {
      messageId_userId: {
        messageId,
        userId: currentUser.id,
      },
    },
    create: {
      messageId,
      userId: currentUser.id,
    },
    update: {
      readAt: new Date(),
    },
  });

  return receipt;
}

module.exports = {
  listMessages,
  createMessage,
  updateMessage,
  deleteMessage,
  saveAttachment,
  saveVoiceMessage,
  createAttachment,
  deleteAttachment,
  markChannelAsRead,
  getUnreadCount,
  getAllUnreadCounts,
  createReadReceipt,
};

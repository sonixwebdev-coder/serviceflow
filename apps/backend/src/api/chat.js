const express = require('express');
const multer = require('multer');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const { AppError } = require('../utils/errors');
const { ok, created } = require('../utils/http');

const chatService = require('../services/chatService');
const chatMessageService = require('../services/chatMessageService');
const { createNotification } = require('../services/notificationService');
const { sendChatMessageNotification } = require('../services/pushNotificationService');
const logger = require('../utils/logger');
const {
  broadcastChatMessage,
  broadcastChatMessageUpdate,
  broadcastChatMessageDelete,
  broadcastChannelCreated,
} = require('../realtime/chatEvents');

const {
  createChannelSchema,
  updateChannelSchema,
  addMembersSchema,
  updateMemberRoleSchema,
  listChannelsQuerySchema,
  listMessagesQuerySchema,
  createMessageSchema,
  updateMessageSchema,
  createDMSchema,
  createGroupDMSchema,
} = require('../schemas/chatSchema');

const router = express.Router();

// Multer configuration for file uploads
const fileUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Block only dangerous executable types
    const blockedTypes = [
      'application/x-executable',
      'application/x-msdownload',
      'application/x-msdos-program',
    ];
    const blockedExtensions = /\.(exe|bat|cmd|sh|msi|dll|com|scr|pif|vbs|js|wsf|ps1)$/i;

    if (blockedTypes.includes(file.mimetype) || blockedExtensions.test(file.originalname)) {
      cb(new AppError('File type not allowed', 400), false);
    } else {
      cb(null, true);
    }
  },
});

// Multer configuration for voice messages
const voiceUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav'];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Only audio files allowed for voice messages', 400), false);
    }
  },
});

// ========== CHANNELS ==========

/**
 * GET /api/chat/channels
 * List channels user has access to
 */
router.get(
  '/channels',
  authenticate,
  validate(listChannelsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const channels = await chatService.listChannels(req.tenantPrisma, req.query, req.user);
    return ok(res, channels);
  })
);

/**
 * POST /api/chat/channels
 * Create a new channel
 */
router.post(
  '/channels',
  authenticate,
  validate(createChannelSchema),
  asyncHandler(async (req, res) => {
    const channel = await chatService.createChannel(req.tenantPrisma, req.body, req.user);

    // Broadcast new channel to organization so other users see it
    if (channel) {
      broadcastChannelCreated(req.user.organizationId, channel);
    }

    return created(res, channel);
  })
);

/**
 * GET /api/chat/channels/:channelId
 * Get channel details
 */
router.get(
  '/channels/:channelId',
  authenticate,
  asyncHandler(async (req, res) => {
    const channel = await chatService.getChannelById(req.tenantPrisma, req.params.channelId, req.user);
    return ok(res, channel);
  })
);

/**
 * PATCH /api/chat/channels/:channelId
 * Update channel
 */
router.patch(
  '/channels/:channelId',
  authenticate,
  validate(updateChannelSchema),
  asyncHandler(async (req, res) => {
    const channel = await chatService.updateChannel(req.tenantPrisma, req.params.channelId, req.body, req.user);
    return ok(res, channel);
  })
);

/**
 * POST /api/chat/channels/:channelId/archive
 * Archive a channel
 */
router.post(
  '/channels/:channelId/archive',
  authenticate,
  asyncHandler(async (req, res) => {
    const channel = await chatService.archiveChannel(req.tenantPrisma, req.params.channelId, req.user);
    return ok(res, channel);
  })
);

// ========== MEMBERS ==========

/**
 * GET /api/chat/channels/:channelId/members
 * List channel members
 */
router.get(
  '/channels/:channelId/members',
  authenticate,
  asyncHandler(async (req, res) => {
    const channel = await chatService.getChannelById(req.tenantPrisma, req.params.channelId, req.user);
    return ok(res, channel.members);
  })
);

/**
 * POST /api/chat/channels/:channelId/members
 * Add members to channel
 */
router.post(
  '/channels/:channelId/members',
  authenticate,
  validate(addMembersSchema),
  asyncHandler(async (req, res) => {
    await chatService.addMembers(req.tenantPrisma, req.params.channelId, req.body.userIds, req.user);
    return ok(res, { message: 'Members added successfully' });
  })
);

/**
 * DELETE /api/chat/channels/:channelId/members/:userId
 * Remove a member from channel
 */
router.delete(
  '/channels/:channelId/members/:userId',
  authenticate,
  asyncHandler(async (req, res) => {
    await chatService.removeMember(req.tenantPrisma, req.params.channelId, req.params.userId, req.user);
    return ok(res, { message: 'Member removed successfully' });
  })
);

/**
 * PATCH /api/chat/channels/:channelId/members/:userId/role
 * Update member role
 */
router.patch(
  '/channels/:channelId/members/:userId/role',
  authenticate,
  validate(updateMemberRoleSchema),
  asyncHandler(async (req, res) => {
    const member = await chatService.updateMemberRole(
      req.tenantPrisma,
      req.params.channelId,
      req.params.userId,
      req.body.role,
      req.user
    );
    return ok(res, member);
  })
);

/**
 * POST /api/chat/channels/:channelId/leave
 * Leave a channel
 */
router.post(
  '/channels/:channelId/leave',
  authenticate,
  asyncHandler(async (req, res) => {
    await chatService.leaveChannel(req.tenantPrisma, req.params.channelId, req.user);
    return ok(res, { message: 'Left channel successfully' });
  })
);

// ========== MESSAGES ==========

/**
 * GET /api/chat/channels/:channelId/messages
 * Get paginated messages
 */
router.get(
  '/channels/:channelId/messages',
  authenticate,
  validate(listMessagesQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const messages = await chatMessageService.listMessages(req.tenantPrisma, req.params.channelId, req.query, req.user);
    return ok(res, messages);
  })
);

/**
 * POST /api/chat/channels/:channelId/messages
 * Send a message
 */
router.post(
  '/channels/:channelId/messages',
  authenticate,
  validate(createMessageSchema),
  asyncHandler(async (req, res) => {
    const message = await chatMessageService.createMessage(req.tenantPrisma, req.params.channelId, req.body, req.user);

    // Broadcast message in real-time
    broadcastChatMessage(req.user.organizationId, req.params.channelId, message);

    // Get channel info for notifications
    const channel = await req.tenantPrisma.chatChannel.findUnique({
      where: { id: req.params.channelId },
      include: {
        members: {
          select: { userId: true },
        },
      },
    });

    if (channel) {
      // Get recipient IDs (all members except the author)
      const recipientIds = channel.members
        .map((m) => m.userId)
        .filter((userId) => userId !== req.user.id);

      // Create DB notifications and send push notifications in background
      // Don't await to avoid blocking the response
      (async () => {
        try {
          const authorName = `${req.user.firstName} ${req.user.lastName}`;
          const channelName = channel.name || (channel.type === 'DIRECT' ? 'Mesaj direct' : 'Chat');
          const messagePreview = message.type === 'TEXT'
            ? (message.body.length > 50 ? message.body.substring(0, 47) + '...' : message.body)
            : getMessageTypeLabel(message.type);

          // Create DB notifications for each recipient
          await Promise.all(
            recipientIds.map((recipientId) =>
              createNotification({
                recipientId,
                title: channel.type === 'DIRECT' ? authorName : channelName,
                message: channel.type === 'DIRECT' ? messagePreview : `${authorName}: ${messagePreview}`,
                type: 'MESSAGE',
                entityType: 'CHAT_MESSAGE',
                entityId: message.id,
                metadata: {
                  channelId: channel.id,
                  messageId: message.id,
                  authorId: req.user.id,
                  authorName,
                },
                organizationId: req.user.organizationId,
              }).catch((err) => logger.error('Failed to create chat notification:', err))
            )
          );

          // Send push notifications
          await sendChatMessageNotification(message, channel, recipientIds);
        } catch (error) {
          logger.error('Failed to send chat notifications:', error);
        }
      })();
    }

    return created(res, message);
  })
);

// Helper function for message type labels
function getMessageTypeLabel(type) {
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
}

/**
 * PATCH /api/chat/messages/:messageId
 * Edit a message
 */
router.patch(
  '/messages/:messageId',
  authenticate,
  validate(updateMessageSchema),
  asyncHandler(async (req, res) => {
    const message = await chatMessageService.updateMessage(req.tenantPrisma, req.params.messageId, req.body, req.user);

    // Broadcast message update
    broadcastChatMessageUpdate(req.user.organizationId, message.channelId, message);

    return ok(res, message);
  })
);

/**
 * DELETE /api/chat/messages/:messageId
 * Delete a message
 */
router.delete(
  '/messages/:messageId',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await chatMessageService.deleteMessage(req.tenantPrisma, req.params.messageId, req.user);

    // Broadcast message deletion
    broadcastChatMessageDelete(req.user.organizationId, result.channelId, result.id);

    return ok(res, { message: 'Message deleted successfully' });
  })
);

// ========== ATTACHMENTS ==========

/**
 * POST /api/chat/messages/:messageId/attachments
 * Upload file attachment
 */
router.post(
  '/messages/:messageId/attachments',
  authenticate,
  (req, res, next) => {
    fileUpload.single('file')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          return next(err);
        }
        return next(new AppError(err.message || 'File upload failed', 400));
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    // Get message to retrieve channelId
    const message = await req.tenantPrisma.chatMessage.findUnique({
      where: { id: req.params.messageId },
    });

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    // Save file to storage
    const attachmentData = await chatMessageService.saveAttachment(req.file, req.user.organizationId, message.channelId);

    // Create attachment record
    const attachment = await chatMessageService.createAttachment(
      req.tenantPrisma,
      req.params.messageId,
      attachmentData,
      req.user
    );

    return created(res, attachment);
  })
);

/**
 * POST /api/chat/channels/:channelId/upload-file
 * Upload file with message
 */
router.post(
  '/channels/:channelId/upload-file',
  authenticate,
  (req, res, next) => {
    fileUpload.single('file')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          return next(err);
        }
        return next(new AppError(err.message || 'File upload failed', 400));
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    // Save file to storage
    const fileData = await chatMessageService.saveAttachment(
      req.file,
      req.user.organizationId,
      req.params.channelId
    );

    // Determine message type
    const messageType = req.file.mimetype.startsWith('image/') ? 'IMAGE' : 'FILE';
    const messageBody = req.body.body || `Sent a file: ${req.file.originalname}`;

    // Create message with file attachment
    const message = await chatMessageService.createMessage(
      req.tenantPrisma,
      req.params.channelId,
      {
        body: messageBody,
        type: messageType,
      },
      req.user
    );

    // Create attachment
    const attachment = await chatMessageService.createAttachment(
      req.tenantPrisma,
      message.id,
      fileData,
      req.user
    );

    // Broadcast message with attachment
    const messageWithAttachment = { ...message, attachments: [attachment] };
    broadcastChatMessage(req.user.organizationId, req.params.channelId, messageWithAttachment);

    // Get channel info for notifications
    const channel = await req.tenantPrisma.chatChannel.findUnique({
      where: { id: req.params.channelId },
      include: {
        members: {
          select: { userId: true },
        },
      },
    });

    if (channel) {
      // Get recipient IDs (all members except the author)
      const recipientIds = channel.members
        .map((m) => m.userId)
        .filter((userId) => userId !== req.user.id);

      // Create DB notifications and send push notifications in background
      (async () => {
        try {
          const authorName = `${req.user.firstName} ${req.user.lastName}`;
          const channelName = channel.name || (channel.type === 'DIRECT' ? 'Mesaj direct' : 'Chat');
          const messagePreview = messageType === 'IMAGE' ? 'A trimis o imagine' : 'A trimis un fișier';

          // Create DB notifications for each recipient
          await Promise.all(
            recipientIds.map((recipientId) =>
              createNotification({
                recipientId,
                title: channel.type === 'DIRECT' ? authorName : channelName,
                message: channel.type === 'DIRECT' ? messagePreview : `${authorName}: ${messagePreview}`,
                type: 'MESSAGE',
                entityType: 'CHAT_MESSAGE',
                entityId: message.id,
                metadata: {
                  channelId: channel.id,
                  messageId: message.id,
                  authorId: req.user.id,
                  authorName,
                },
                organizationId: req.user.organizationId,
              }).catch((err) => logger.error('Failed to create chat notification:', err))
            )
          );

          // Send push notifications
          await sendChatMessageNotification(messageWithAttachment, channel, recipientIds);
        } catch (error) {
          logger.error('Failed to send chat notifications:', error);
        }
      })();
    }

    return created(res, { message, attachment });
  })
);

/**
 * POST /api/chat/channels/:channelId/upload-voice
 * Upload voice message
 */
router.post(
  '/channels/:channelId/upload-voice',
  authenticate,
  (req, res, next) => {
    voiceUpload.single('voice')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          return next(err);
        }
        return next(new AppError(err.message || 'Voice upload failed', 400));
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError('No voice file uploaded', 400);
    }

    // Save voice file to storage
    const voiceData = await chatMessageService.saveVoiceMessage(
      req.file,
      req.user.organizationId,
      req.params.channelId
    );

    // Create message with voice attachment
    const message = await chatMessageService.createMessage(
      req.tenantPrisma,
      req.params.channelId,
      {
        body: '[Voice Message]',
        type: 'VOICE',
      },
      req.user
    );

    // Create attachment
    const attachment = await chatMessageService.createAttachment(
      req.tenantPrisma,
      message.id,
      {
        ...voiceData,
        duration: null, // Could be extracted from audio metadata
      },
      req.user
    );

    // Broadcast voice message
    const messageWithAttachment = { ...message, attachments: [attachment] };
    broadcastChatMessage(req.user.organizationId, req.params.channelId, messageWithAttachment);

    // Get channel info for notifications
    const channel = await req.tenantPrisma.chatChannel.findUnique({
      where: { id: req.params.channelId },
      include: {
        members: {
          select: { userId: true },
        },
      },
    });

    if (channel) {
      // Get recipient IDs (all members except the author)
      const recipientIds = channel.members
        .map((m) => m.userId)
        .filter((userId) => userId !== req.user.id);

      // Create DB notifications and send push notifications in background
      (async () => {
        try {
          const authorName = `${req.user.firstName} ${req.user.lastName}`;
          const channelName = channel.name || (channel.type === 'DIRECT' ? 'Mesaj direct' : 'Chat');
          const messagePreview = 'A trimis un mesaj vocal';

          // Create DB notifications for each recipient
          await Promise.all(
            recipientIds.map((recipientId) =>
              createNotification({
                recipientId,
                title: channel.type === 'DIRECT' ? authorName : channelName,
                message: channel.type === 'DIRECT' ? messagePreview : `${authorName}: ${messagePreview}`,
                type: 'MESSAGE',
                entityType: 'CHAT_MESSAGE',
                entityId: message.id,
                metadata: {
                  channelId: channel.id,
                  messageId: message.id,
                  authorId: req.user.id,
                  authorName,
                },
                organizationId: req.user.organizationId,
              }).catch((err) => logger.error('Failed to create chat notification:', err))
            )
          );

          // Send push notifications
          await sendChatMessageNotification(messageWithAttachment, channel, recipientIds);
        } catch (error) {
          logger.error('Failed to send chat notifications:', error);
        }
      })();
    }

    return created(res, { message, attachment });
  })
);

// ========== READ RECEIPTS ==========

/**
 * POST /api/chat/channels/:channelId/read
 * Mark channel as read
 */
router.post(
  '/channels/:channelId/read',
  authenticate,
  asyncHandler(async (req, res) => {
    await chatMessageService.markChannelAsRead(req.tenantPrisma, req.params.channelId, req.user);
    return ok(res, { message: 'Channel marked as read' });
  })
);

/**
 * GET /api/chat/channels/:channelId/unread-count
 * Get unread message count for a channel
 */
router.get(
  '/channels/:channelId/unread-count',
  authenticate,
  asyncHandler(async (req, res) => {
    const count = await chatMessageService.getUnreadCount(req.tenantPrisma, req.params.channelId, req.user);
    return ok(res, { count });
  })
);

/**
 * GET /api/chat/unread
 * Get unread counts for all channels
 */
router.get(
  '/unread',
  authenticate,
  asyncHandler(async (req, res) => {
    const unreadCounts = await chatMessageService.getAllUnreadCounts(req.tenantPrisma, req.user);
    return ok(res, unreadCounts);
  })
);

// ========== DIRECT MESSAGES ==========

/**
 * POST /api/chat/dm
 * Create or get DM channel
 */
router.post(
  '/dm',
  authenticate,
  validate(createDMSchema),
  asyncHandler(async (req, res) => {
    const channel = await chatService.getOrCreateDMChannel(
      req.tenantPrisma,
      [req.user.id, req.body.userId],
      req.user
    );
    return ok(res, channel);
  })
);

/**
 * POST /api/chat/group-dm
 * Create group DM channel
 */
router.post(
  '/group-dm',
  authenticate,
  validate(createGroupDMSchema),
  asyncHandler(async (req, res) => {
    const channel = await chatService.getOrCreateGroupDM(
      req.tenantPrisma,
      req.body.userIds,
      req.body.name,
      req.user
    );
    return created(res, channel);
  })
);

module.exports = router;

const express = require('express');
const router = express.Router({ mergeParams: true });
const asyncHandler = require('../../middleware/asyncHandler');
const authenticateClient = require('../../middleware/authenticateClient');
const prisma = require('../../../lib/prisma');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const {
  listMessages,
  createMessage,
  markMessagesAsRead,
  getUnreadMessageCount,
  createFileMessage,
} = require('../../services/portalMessageService');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'messages');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const hash = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${hash}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

const voiceFilter = (req, file, cb) => {
  // Allowed voice types
  const allowedTypes = [
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Audio file type not allowed'), false);
  }
};

const uploadFile = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

const uploadVoice = multer({
  storage,
  fileFilter: voiceFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for voice
  },
});

/**
 * GET /api/portal/appointments/:appointmentId/messages
 * Get messages for an appointment
 */
router.get(
  '/',
  authenticateClient,
  asyncHandler(async (req, res) => {
    const { appointmentId } = req.params;
    const messages = await listMessages(prisma, req.client.id, appointmentId);
    res.json(messages);
  })
);

/**
 * POST /api/portal/appointments/:appointmentId/messages
 * Send a message
 */
router.post(
  '/',
  authenticateClient,
  asyncHandler(async (req, res) => {
    const { appointmentId } = req.params;
    const { body, type, metadata } = req.body;

    const message = await createMessage(prisma, req.client.id, appointmentId, {
      body,
      type,
      metadata,
    });

    res.status(201).json(message);
  })
);

/**
 * POST /api/portal/appointments/:appointmentId/messages/mark-read
 * Mark messages as read
 */
router.post(
  '/mark-read',
  authenticateClient,
  asyncHandler(async (req, res) => {
    const { appointmentId } = req.params;
    const result = await markMessagesAsRead(prisma, req.client.id, appointmentId);
    res.json(result);
  })
);

/**
 * GET /api/portal/appointments/:appointmentId/messages/unread-count
 * Get unread message count
 */
router.get(
  '/unread-count',
  authenticateClient,
  asyncHandler(async (req, res) => {
    const { appointmentId } = req.params;
    const count = await getUnreadMessageCount(prisma, req.client.id, appointmentId);
    res.json({ count });
  })
);

/**
 * POST /api/portal/appointments/:appointmentId/upload-file
 * Upload a file attachment
 */
router.post(
  '/upload-file',
  authenticateClient,
  uploadFile.single('file'),
  asyncHandler(async (req, res) => {
    const { appointmentId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/messages/${req.file.filename}`;

    const message = await createFileMessage(prisma, req.client.id, appointmentId, {
      fileName: req.file.originalname,
      fileUrl,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
    });

    res.status(201).json(message);
  })
);

/**
 * POST /api/portal/appointments/:appointmentId/upload-voice
 * Upload a voice message
 */
router.post(
  '/upload-voice',
  authenticateClient,
  uploadVoice.single('audio'),
  asyncHandler(async (req, res) => {
    const { appointmentId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const fileUrl = `/uploads/messages/${req.file.filename}`;

    const message = await createFileMessage(prisma, req.client.id, appointmentId, {
      fileName: req.file.originalname || 'voice-message',
      fileUrl,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
    });

    // Add voice-specific metadata
    const updatedMessage = await prisma.message.update({
      where: { id: message.id },
      data: {
        type: 'FILE',
        metadata: {
          ...message.metadata,
          isVoice: true,
          duration: req.body.duration ? parseInt(req.body.duration, 10) : null,
        },
      },
    });

    res.status(201).json({
      ...message,
      metadata: updatedMessage.metadata,
    });
  })
);

module.exports = router;

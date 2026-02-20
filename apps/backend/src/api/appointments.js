const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const asyncHandler = require('../middleware/asyncHandler');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const {
  createAppointmentSchema,
  updateAppointmentSchema,
  listAppointmentsQuerySchema,
  recordPaymentSchema,
} = require('../schemas/appointmentSchema');
const {
  listAppointments,
  createAppointment,
  getAppointmentById,
  updateAppointment,
  cancelAppointment,
  recordAdvancePayment,
  recordFinalPayment,
  getPaymentStatus,
} = require('../services/appointmentService');
const { listMessages, createMessage, markMessagesAsRead, getUnreadMessageCount, createFileMessage } = require('../services/messageService');
const { broadcastTyping } = require('../realtime/events');
const { getServiceOrder, upsertServiceOrder, generateServiceOrderPdf } = require('../services/serviceOrderService');
const { logFromRequest, ENTITY_TYPES, getActionDescription } = require('../services/auditLogService');
const { ok, created } = require('../utils/http');
const { createMessageSchema } = require('../schemas/messageSchema');
const { z } = require('zod');

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
  const allowedTypes = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Audio file type not allowed'), false);
  }
};

const uploadFile = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const uploadVoice = multer({
  storage,
  fileFilter: voiceFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const SERVICE_ORDER_STATUSES = ['DRAFT', 'GENERATED', 'SENT', 'SIGNED', 'CANCELLED'];

const router = express.Router();

router.get(
  '/',
  authenticate,
  validate(listAppointmentsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    // Enable pagination if page or limit is provided
    const paginate = Boolean(req.query.page || req.query.limit);
    const locationFilter = await req.getLocationFilter({ includeNull: true });
    const minimal = req.query.fields === 'calendar';
    const appointments = await listAppointments(req.tenantPrisma, req.query, { paginate, locationFilter, minimal });
    return ok(res, appointments);
  })
);

router.post(
  '/',
  authenticate,
  validate(createAppointmentSchema),
  asyncHandler(async (req, res) => {
    const locationContext = await req.getLocationContext();
    const appointment = await createAppointment(req.tenantPrisma, req.body, req.user, {
      locationId: locationContext.currentLocationId,
    });

    // Log the creation
    await logFromRequest(req, {
      action: 'CREATE',
      entityType: ENTITY_TYPES.APPOINTMENT,
      entityId: appointment.id,
      description: getActionDescription('CREATE', ENTITY_TYPES.APPOINTMENT, appointment.title || 'Programare'),
      metadata: { clientId: appointment.clientId, locationId: appointment.locationId },
    });

    return created(res, appointment, 'Appointment created successfully');
  })
);

router.get(
  '/:appointmentId',
  authenticate,
  asyncHandler(async (req, res) => {
    const appointment = await getAppointmentById(req.tenantPrisma, req.params.appointmentId);
    return ok(res, appointment);
  })
);

router.patch(
  '/:appointmentId',
  authenticate,
  validate(updateAppointmentSchema),
  asyncHandler(async (req, res) => {
    const appointment = await updateAppointment(req.tenantPrisma, req.params.appointmentId, req.body, req.user);

    // Log the update
    await logFromRequest(req, {
      action: 'UPDATE',
      entityType: ENTITY_TYPES.APPOINTMENT,
      entityId: appointment.id,
      description: getActionDescription('UPDATE', ENTITY_TYPES.APPOINTMENT, appointment.title || 'Programare'),
      metadata: { clientId: appointment.clientId, changes: Object.keys(req.body) },
    });

    return ok(res, appointment, 'Appointment updated successfully');
  })
);

router.post(
  '/:appointmentId/cancel',
  authenticate,
  validate(z.object({ reason: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const appointment = await cancelAppointment(req.tenantPrisma, req.params.appointmentId, req.body.reason, req.user);

    // Log the cancellation
    await logFromRequest(req, {
      action: 'DELETE',
      entityType: ENTITY_TYPES.APPOINTMENT,
      entityId: appointment.id,
      description: `Anulat programare: ${appointment.title || 'Programare'}`,
      metadata: { clientId: appointment.clientId, reason: req.body.reason },
    });

    return ok(res, appointment, 'Appointment cancelled');
  })
);

router.get(
  '/:appointmentId/messages',
  authenticate,
  asyncHandler(async (req, res) => {
    const messages = await listMessages(req.tenantPrisma, req.params.appointmentId, req.user);
    return ok(res, messages);
  })
);

router.post(
  '/:appointmentId/messages',
  authenticate,
  validate(createMessageSchema),
  asyncHandler(async (req, res) => {
    const message = await createMessage(req.tenantPrisma, req.params.appointmentId, req.user, req.body);
    return created(res, message, 'Message sent');
  })
);

router.post(
  '/:appointmentId/messages/mark-read',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await markMessagesAsRead(req.tenantPrisma, req.params.appointmentId, req.user);
    return ok(res, result, 'Messages marked as read');
  })
);

router.get(
  '/:appointmentId/messages/unread-count',
  authenticate,
  asyncHandler(async (req, res) => {
    const count = await getUnreadMessageCount(req.tenantPrisma, req.params.appointmentId, req.user);
    return ok(res, { count });
  })
);

router.post(
  '/:appointmentId/messages/typing',
  authenticate,
  validate(z.object({ isTyping: z.boolean() })),
  asyncHandler(async (req, res) => {
    broadcastTyping(req.user.organizationId, req.params.appointmentId, req.user, req.body.isTyping);
    return ok(res, { success: true });
  })
);

router.post(
  '/:appointmentId/messages/upload-file',
  authenticate,
  uploadFile.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/messages/${req.file.filename}`;
    const message = await createFileMessage(req.tenantPrisma, req.params.appointmentId, req.user, {
      fileName: req.file.originalname,
      fileUrl,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
    });

    return created(res, message, 'File uploaded');
  })
);

router.post(
  '/:appointmentId/messages/upload-voice',
  authenticate,
  uploadVoice.single('audio'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No audio file uploaded' });
    }

    const fileUrl = `/uploads/messages/${req.file.filename}`;
    const message = await createFileMessage(req.tenantPrisma, req.params.appointmentId, req.user, {
      fileName: req.file.originalname || 'voice-message',
      fileUrl,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      isVoice: true,
      duration: req.body.duration ? parseInt(req.body.duration, 10) : null,
    });

    return created(res, message, 'Voice message uploaded');
  })
);

router.get(
  '/:appointmentId/service-order',
  authenticate,
  asyncHandler(async (req, res) => {
    const serviceOrder = await getServiceOrder(req.tenantPrisma, req.params.appointmentId);
    return ok(res, serviceOrder);
  })
);

router.get(
  '/:appointmentId/service-order/pdf',
  authenticate,
  asyncHandler(async (req, res) => {
    const refresh = ['1', 'true', 'yes'].includes(String(req.query.refresh || '').toLowerCase());
    const { buffer, filename } = await generateServiceOrderPdf(req.tenantPrisma, req.params.appointmentId, { refresh });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    // Remove CSP to allow iframe embedding from frontend
    res.removeHeader('Content-Security-Policy');
    return res.send(buffer);
  })
);

router.put(
  '/:appointmentId/service-order',
  authenticate,
  authorize({ roles: ['admin', 'sales'] }),
  validate(
    z.object({
      status: z
        .string()
        .trim()
        .optional()
        .transform((value) => (value ? value.toUpperCase() : value))
        .refine(
          (value) => !value || SERVICE_ORDER_STATUSES.includes(value),
          `Status must be one of: ${SERVICE_ORDER_STATUSES.join(', ')}`
        ),
      notes: z.string().max(2000).optional(),
      metadata: z.record(z.any()).nullable().optional(),
      tax: z.number().nonnegative().optional(),
      lineItems: z
        .array(
          z.object({
            id: z.string().optional(),
            name: z.string().min(1),
            description: z.string().optional(),
            quantity: z.number().nonnegative().optional(),
            unitPrice: z.number().nonnegative().optional(),
            hardwareQuantity: z.number().nonnegative().optional(),
            laborQuantity: z.number().nonnegative().optional(),
            hardwarePrice: z.number().nonnegative().optional(),
            laborPrice: z.number().nonnegative().optional(),
            hardwareUnit: z.string().optional(),
            laborUnit: z.string().optional(),
          })
        )
        .optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const order = await upsertServiceOrder(req.tenantPrisma, req.params.appointmentId, req.body);

    await logFromRequest(req, {
      action: 'UPDATE',
      entityType: 'ServiceOrder',
      entityId: order.id,
      description: `Actualizat deviz pentru programare`,
      metadata: { appointmentId: req.params.appointmentId, status: req.body.status },
    });

    return ok(res, order, 'Service order saved');
  })
);

router.post(
  '/:appointmentId/payments/advance',
  authenticate,
  authorize({ roles: ['admin', 'sales'] }),
  validate(recordPaymentSchema),
  asyncHandler(async (req, res) => {
    const result = await recordAdvancePayment(req.tenantPrisma, req.params.appointmentId, req.body.amount, req.user.id);

    await logFromRequest(req, {
      action: 'CREATE',
      entityType: ENTITY_TYPES.PAYMENT,
      entityId: result.payment?.id || req.params.appointmentId,
      description: `Inregistrat avans: ${req.body.amount} RON`,
      metadata: { appointmentId: req.params.appointmentId, amount: req.body.amount, type: 'advance' },
    });

    return ok(res, result, 'Advance payment recorded successfully');
  })
);

router.post(
  '/:appointmentId/payments/final',
  authenticate,
  authorize({ roles: ['admin', 'sales'] }),
  validate(recordPaymentSchema),
  asyncHandler(async (req, res) => {
    const result = await recordFinalPayment(req.tenantPrisma, req.params.appointmentId, req.body.amount, req.user.id);

    await logFromRequest(req, {
      action: 'CREATE',
      entityType: ENTITY_TYPES.PAYMENT,
      entityId: result.payment?.id || req.params.appointmentId,
      description: `Inregistrat plata finala: ${req.body.amount} RON`,
      metadata: { appointmentId: req.params.appointmentId, amount: req.body.amount, type: 'final' },
    });

    return ok(res, result, 'Final payment recorded successfully');
  })
);

router.get(
  '/:appointmentId/payment-status',
  authenticate,
  asyncHandler(async (req, res) => {
    const status = await getPaymentStatus(req.tenantPrisma, req.params.appointmentId);
    return ok(res, status);
  })
);

module.exports = router;

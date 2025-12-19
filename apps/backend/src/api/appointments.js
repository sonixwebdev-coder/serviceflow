const express = require('express');
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
const { listMessages, createMessage, markMessagesAsRead, getUnreadMessageCount } = require('../services/messageService');
const { broadcastTyping } = require('../realtime/events');
const { getServiceOrder, upsertServiceOrder, generateServiceOrderPdf } = require('../services/serviceOrderService');
const { ok, created } = require('../utils/http');
const { createMessageSchema } = require('../schemas/messageSchema');
const { z } = require('zod');

const SERVICE_ORDER_STATUSES = ['DRAFT', 'GENERATED', 'SENT', 'SIGNED', 'CANCELLED'];

const router = express.Router();

router.get(
  '/',
  authenticate,
  validate(listAppointmentsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    // Enable pagination if page or limit is provided
    const paginate = Boolean(req.query.page || req.query.limit);
    const appointments = await listAppointments(req.tenantPrisma, req.query, { paginate });
    return ok(res, appointments);
  })
);

router.post(
  '/',
  authenticate,
  validate(createAppointmentSchema),
  asyncHandler(async (req, res) => {
    const appointment = await createAppointment(req.tenantPrisma, req.body, req.user);
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
    return ok(res, appointment, 'Appointment updated successfully');
  })
);

router.post(
  '/:appointmentId/cancel',
  authenticate,
  validate(z.object({ reason: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const appointment = await cancelAppointment(req.tenantPrisma, req.params.appointmentId, req.body.reason, req.user);
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

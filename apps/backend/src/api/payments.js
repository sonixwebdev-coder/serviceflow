const express = require('express');
const { z } = require('zod');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { ok, created } = require('../utils/http');
const {
  createPayment,
  getPaymentsByAppointment,
  getPaymentById,
  deletePayment,
} = require('../services/paymentService');
const { generateServiceOrderPdf } = require('../services/serviceOrderService');
const { logFromRequest, ENTITY_TYPES } = require('../services/auditLogService');

// Validation schemas
const createPaymentSchema = z.object({
  appointmentId: z.string().cuid('Invalid appointment ID'),
  invoiceId: z.string().cuid('Invalid invoice ID').optional(),
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.enum(['CASH', 'CARD', 'BANK_TRANSFER', 'OTHER']).default('CASH'),
  type: z.enum(['REGULAR', 'PREPAYMENT', 'TVA_ADJUSTMENT']).optional(),
  paymentDate: z.string().datetime().optional().or(z.date()).optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * @route   POST /api/payments
 * @desc    Create a new payment
 * @access  Private (authenticated users)
 */
router.post(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const validated = createPaymentSchema.parse(req.body);

    const payment = await createPayment(req.tenantPrisma, {
      ...validated,
      paymentDate: validated.paymentDate ? new Date(validated.paymentDate) : new Date(),
      createdById: req.user.id,
    });

    await logFromRequest(req, {
      action: 'CREATE',
      entityType: ENTITY_TYPES.PAYMENT,
      entityId: payment.id,
      description: `Inregistrat plata: ${validated.amount} RON (${validated.paymentMethod || 'CASH'})`,
      metadata: { appointmentId: validated.appointmentId, amount: validated.amount, method: validated.paymentMethod },
    });

    // Regenerate service order PDF to reflect new payment (async, don't block response)
    setImmediate(async () => {
      try {
        // Check if service order exists before attempting PDF regeneration
        const serviceOrder = await req.tenantPrisma.serviceOrder.findUnique({
          where: { appointmentId: payment.appointmentId },
          select: { id: true },
        });
        if (serviceOrder) {
          await generateServiceOrderPdf(req.tenantPrisma, payment.appointmentId, { refresh: true });
        }
      } catch (pdfError) {
        console.error('❌ Failed to regenerate service order PDF after payment creation:', pdfError);
      }
    });

    return created(res, payment, 'Payment created successfully');
  })
);

/**
 * @route   GET /api/payments/appointment/:appointmentId
 * @desc    Get all payments for an appointment
 * @access  Private (authenticated users)
 */
router.get(
  '/appointment/:appointmentId',
  authenticate,
  asyncHandler(async (req, res) => {
    const payments = await getPaymentsByAppointment(req.tenantPrisma, req.params.appointmentId);
    return ok(res, payments);
  })
);

/**
 * @route   GET /api/payments/:id
 * @desc    Get payment by ID
 * @access  Private (authenticated users)
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const payment = await getPaymentById(req.tenantPrisma, req.params.id);
    return ok(res, payment);
  })
);

/**
 * @route   DELETE /api/payments/:id
 * @desc    Delete a payment
 * @access  Private (admin only)
 */
router.delete(
  '/:id',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    // Get payment first to access appointmentId
    const paymentToDelete = await getPaymentById(req.tenantPrisma, req.params.id);
    const appointmentId = paymentToDelete.appointmentId;

    const payment = await deletePayment(req.tenantPrisma, req.params.id);

    await logFromRequest(req, {
      action: 'DELETE',
      entityType: ENTITY_TYPES.PAYMENT,
      entityId: req.params.id,
      description: `Sters plata: ${paymentToDelete.amount} RON`,
      metadata: { appointmentId, amount: paymentToDelete.amount },
    });

    // Regenerate service order PDF to reflect payment deletion (async, don't block response)
    setImmediate(async () => {
      try {
        const serviceOrder = await req.tenantPrisma.serviceOrder.findUnique({
          where: { appointmentId },
          select: { id: true },
        });
        if (serviceOrder) {
          await generateServiceOrderPdf(req.tenantPrisma, appointmentId, { refresh: true });
        }
      } catch (pdfError) {
        console.error('❌ Failed to regenerate service order PDF after payment deletion:', pdfError);
      }
    });

    return ok(res, payment, 'Payment deleted successfully');
  })
);

module.exports = router;

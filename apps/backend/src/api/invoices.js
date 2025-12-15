const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const {
  createInvoiceSchema,
  updateInvoiceSchema,
  listInvoicesQuerySchema,
} = require('../schemas/invoiceSchema');
const {
  listInvoices,
  createInvoice,
  createInvoiceFromServiceOrder,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  generateInvoicePdf,
  markInvoiceAsSent,
  markInvoiceAsPaid,
  getInvoicesByAppointment,
} = require('../services/invoiceService');
const { ok, created } = require('../utils/http');

const router = express.Router();

// List all invoices with pagination and filters (admin/manager only)
router.get(
  '/',
  authenticate,
  authorize({ roles: ['admin', 'manager'] }),
  validate(listInvoicesQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const paginate = Boolean(req.query.page || req.query.limit);
    const invoices = await listInvoices(req.tenantPrisma, req.query, { paginate });
    return ok(res, invoices);
  })
);

// Create new invoice
router.post(
  '/',
  authenticate,
  authorize({ roles: ['admin', 'manager', 'sales'] }),
  validate(createInvoiceSchema),
  asyncHandler(async (req, res) => {
    const invoice = await createInvoice(req.tenantPrisma, req.body);
    return created(res, invoice, 'Invoice created successfully');
  })
);

// Create invoice from service order
router.post(
  '/from-service-order/:serviceOrderId',
  authenticate,
  authorize({ roles: ['admin', 'manager', 'sales'] }),
  asyncHandler(async (req, res) => {
    const invoice = await createInvoiceFromServiceOrder(req.tenantPrisma, req.params.serviceOrderId);
    return created(res, invoice, 'Invoice created from service order successfully');
  })
);

// Get invoice by ID (admin/manager only)
router.get(
  '/:id',
  authenticate,
  authorize({ roles: ['admin', 'manager'] }),
  asyncHandler(async (req, res) => {
    const invoice = await getInvoiceById(req.tenantPrisma, req.params.id);
    return ok(res, invoice);
  })
);

// Update invoice
router.put(
  '/:id',
  authenticate,
  authorize({ roles: ['admin', 'manager', 'sales'] }),
  validate(updateInvoiceSchema),
  asyncHandler(async (req, res) => {
    const invoice = await updateInvoice(req.tenantPrisma, req.params.id, req.body, { userId: req.user.id });
    return ok(res, invoice, 'Invoice updated successfully');
  })
);

// Delete invoice
router.delete(
  '/:id',
  authenticate,
  authorize({ roles: ['admin', 'manager'] }),
  asyncHandler(async (req, res) => {
    await deleteInvoice(req.tenantPrisma, req.params.id);
    return ok(res, { success: true }, 'Invoice deleted successfully');
  })
);

// Generate/view PDF (admin/manager only)
router.get(
  '/:id/pdf',
  authenticate,
  authorize({ roles: ['admin', 'manager'] }),
  asyncHandler(async (req, res) => {
    const refresh = ['1', 'true', 'yes'].includes(String(req.query.refresh || '').toLowerCase());
    const { buffer, filename } = await generateInvoicePdf(req.tenantPrisma, req.params.id, { refresh });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    // Remove CSP to allow iframe embedding from frontend
    res.removeHeader('Content-Security-Policy');
    return res.send(buffer);
  })
);

// Mark invoice as sent
router.post(
  '/:id/send',
  authenticate,
  authorize({ roles: ['admin', 'manager', 'sales'] }),
  asyncHandler(async (req, res) => {
    const invoice = await markInvoiceAsSent(req.tenantPrisma, req.params.id);
    return ok(res, invoice, 'Invoice marked as sent');
  })
);

// Mark invoice as paid
router.post(
  '/:id/mark-paid',
  authenticate,
  authorize({ roles: ['admin', 'manager', 'sales'] }),
  asyncHandler(async (req, res) => {
    const invoice = await markInvoiceAsPaid(req.tenantPrisma, req.params.id, { userId: req.user.id });
    return ok(res, invoice, 'Invoice marked as paid');
  })
);

// Get invoices by appointment (admin/manager only)
router.get(
  '/appointment/:appointmentId',
  authenticate,
  authorize({ roles: ['admin', 'manager'] }),
  asyncHandler(async (req, res) => {
    const invoices = await getInvoicesByAppointment(req.tenantPrisma, req.params.appointmentId);
    return ok(res, invoices);
  })
);

module.exports = router;

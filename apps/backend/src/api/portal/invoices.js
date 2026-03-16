const express = require('express');
const router = express.Router();
const asyncHandler = require('../../middleware/asyncHandler');
const authenticateClient = require('../../middleware/authenticateClient');
const prisma = require('../../../lib/prisma');
const { generateInvoicePdf } = require('../../services/invoiceService');

/**
 * GET /api/portal/invoices
 * Get client's invoices
 */
router.get(
  '/',
  authenticateClient,
  asyncHandler(async (req, res) => {
    const ALLOWED_STATUSES = ['DRAFT', 'GENERATED', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];
    const rawPage = Math.max(1, parseInt(req.query.page, 10) || 1);
    const rawLimit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const status = req.query.status?.toUpperCase();

    const where = {
      clientId: req.client.id,
    };

    if (status) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
      where.status = status;
    }

    const skip = (rawPage - 1) * rawLimit;
    const take = rawLimit;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          issueDate: true,
          dueDate: true,
          subtotal: true,
          tax: true,
          total: true,
          paidAt: true,
          pdfUrl: true,
          paymentStatus: true,
          createdAt: true,
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    // Transform decimal values
    const transformedInvoices = invoices.map((inv) => ({
      ...inv,
      subtotal: Number(inv.subtotal),
      tax: Number(inv.tax),
      total: Number(inv.total),
    }));

    res.json({
      items: transformedInvoices,
      pagination: {
        page: rawPage,
        limit: rawLimit,
        total,
        pages: Math.ceil(total / rawLimit),
      },
    });
  })
);

/**
 * GET /api/portal/invoices/:id
 * Get a specific invoice
 */
router.get(
  '/:id',
  authenticateClient,
  asyncHandler(async (req, res) => {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: req.params.id,
        clientId: req.client.id,
      },
      include: {
        lineItems: true,
        payments: {
          select: {
            id: true,
            amount: true,
            paymentDate: true,
            paymentMethod: true,
          },
        },
        appointment: {
          select: {
            id: true,
            title: true,
            scheduledStart: true,
          },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Transform decimal values
    const transformedInvoice = {
      ...invoice,
      subtotal: Number(invoice.subtotal),
      tax: Number(invoice.tax),
      total: Number(invoice.total),
      lineItems: invoice.lineItems.map((item) => ({
        ...item,
        totalPrice: Number(item.totalPrice),
        hardwarePrice: Number(item.hardwarePrice),
        laborPrice: Number(item.laborPrice),
      })),
      payments: invoice.payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
      })),
    };

    res.json(transformedInvoice);
  })
);

/**
 * GET /api/portal/invoices/:id/pdf
 * Download a specific invoice as PDF (client portal)
 */
router.get(
  '/:id/pdf',
  authenticateClient,
  asyncHandler(async (req, res) => {
    // Verify invoice belongs to the authenticated client
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, clientId: req.client.id },
      select: { id: true },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const { buffer, filename } = await generateInvoicePdf(prisma, req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.removeHeader('Content-Security-Policy');
    return res.send(buffer);
  })
);

/**
 * GET /api/portal/invoices/summary
 * Get invoices summary
 */
router.get(
  '/list/summary',
  authenticateClient,
  asyncHandler(async (req, res) => {
    const [unpaid, overdue, paid] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          clientId: req.client.id,
          status: { in: ['DRAFT', 'GENERATED', 'SENT'] },
        },
        _sum: { total: true },
        _count: true,
      }),
      prisma.invoice.aggregate({
        where: {
          clientId: req.client.id,
          status: 'OVERDUE',
        },
        _sum: { total: true },
        _count: true,
      }),
      prisma.invoice.aggregate({
        where: {
          clientId: req.client.id,
          status: 'PAID',
        },
        _sum: { total: true },
        _count: true,
      }),
    ]);

    res.json({
      unpaid: {
        count: unpaid._count,
        total: Number(unpaid._sum.total || 0),
      },
      overdue: {
        count: overdue._count,
        total: Number(overdue._sum.total || 0),
      },
      paid: {
        count: paid._count,
        total: Number(paid._sum.total || 0),
      },
    });
  })
);

module.exports = router;

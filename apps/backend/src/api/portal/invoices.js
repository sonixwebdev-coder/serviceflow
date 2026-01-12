const express = require('express');
const router = express.Router();
const asyncHandler = require('../../middleware/asyncHandler');
const authenticateClient = require('../../middleware/authenticateClient');
const prisma = require('../../../lib/prisma');

/**
 * GET /api/portal/invoices
 * Get client's invoices
 */
router.get(
  '/',
  authenticateClient,
  asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;

    const where = {
      clientId: req.client.id,
    };

    if (status) {
      where.status = status.toUpperCase();
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

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
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10)),
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

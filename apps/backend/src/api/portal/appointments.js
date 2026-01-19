const express = require('express');
const router = express.Router();
const asyncHandler = require('../../middleware/asyncHandler');
const authenticateClient = require('../../middleware/authenticateClient');
const prisma = require('../../../lib/prisma');
const messagesRouter = require('./messages');

/**
 * GET /api/portal/appointments
 * Get client's appointments
 */
router.get(
  '/',
  authenticateClient,
  asyncHandler(async (req, res) => {
    const { status, from, to, page = 1, limit = 20 } = req.query;

    const where = {
      clientId: req.client.id,
    };

    if (status) {
      where.status = status.toUpperCase();
    }

    if (from || to) {
      where.scheduledStart = {};
      if (from) where.scheduledStart.gte = new Date(from);
      if (to) where.scheduledStart.lte = new Date(to);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        orderBy: { scheduledStart: 'desc' },
        skip,
        take,
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          scheduledStart: true,
          scheduledEnd: true,
          location: true,
          paymentStatus: true,
          createdAt: true,
          asset: {
            select: {
              id: true,
              name: true,
              type: true,
              identifier: true,
              manufacturer: true,
              model: true,
            },
          },
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    res.json({
      items: appointments,
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
 * GET /api/portal/appointments/:id
 * Get a specific appointment
 */
router.get(
  '/:id',
  authenticateClient,
  asyncHandler(async (req, res) => {
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: req.params.id,
        clientId: req.client.id,
      },
      include: {
        asset: true,
        serviceOrder: {
          include: {
            lineItems: true,
          },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            total: true,
            pdfUrl: true,
          },
        },
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(appointment);
  })
);

/**
 * GET /api/portal/appointments/upcoming
 * Get upcoming appointments
 */
router.get(
  '/list/upcoming',
  authenticateClient,
  asyncHandler(async (req, res) => {
    const appointments = await prisma.appointment.findMany({
      where: {
        clientId: req.client.id,
        scheduledStart: { gte: new Date() },
        status: { not: 'CANCELLED' },
      },
      orderBy: { scheduledStart: 'asc' },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        scheduledStart: true,
        scheduledEnd: true,
        location: true,
      },
    });

    res.json(appointments);
  })
);

// Mount messages routes under /appointments/:appointmentId/messages
router.use('/:appointmentId/messages', messagesRouter);

module.exports = router;

const express = require('express');
const router = express.Router();
const asyncHandler = require('../../middleware/asyncHandler');
const authenticateClient = require('../../middleware/authenticateClient');
const validate = require('../../middleware/validate');
const prisma = require('../../../lib/prisma');
const messagesRouter = require('./messages');
const { portalCreateAppointmentSchema } = require('../../schemas/appointmentSchema');
const { resolveAsset } = require('../../services/assetService');
const { broadcastAppointmentCreated } = require('../../realtime/events');
const { createNotification } = require('../../services/notificationService');
const { sendPushToUser } = require('../../services/pushNotificationService');
const { getCompanySettings } = require('../../services/companySettingService');
const logger = require('../../utils/logger');

const DEFAULT_WORK_START = 9; // 9 AM
const DEFAULT_WORK_END = 18; // 6 PM
const DEFAULT_SLOT_INTERVAL = 30; // 30 minutes
const DEFAULT_SLOT_DURATION = 60; // 60 minutes

/**
 * Get available dates for booking (next N days)
 */
const getAvailableDatesForClient = async (organizationId, days = 30) => {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });

  const pbSettings = organization?.settings?.publicBooking || {};
  const allowWeekends = pbSettings.allowWeekends ?? false;

  const dates = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    const dayOfWeek = date.getDay();
    if (!allowWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      continue;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    dates.push({
      date: `${year}-${month}-${day}`,
      dayOfWeek: date.toLocaleDateString('ro-RO', { weekday: 'long' }),
      formatted: date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }),
    });
  }

  return dates;
};

/**
 * Get available time slots for a specific date
 */
const getAvailableSlotsForClient = async (organizationId, date, duration = DEFAULT_SLOT_DURATION, locationId = null) => {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });

  const pbSettings = organization?.settings?.publicBooking || {};
  const workStart = pbSettings.workingHours?.start ?? DEFAULT_WORK_START;
  const workEnd = pbSettings.workingHours?.end ?? DEFAULT_WORK_END;

  // Get capacity - either from resources at location or company settings
  let totalCapacity = 1;
  if (locationId) {
    const resources = await prisma.resource.findMany({
      where: { organizationId, locationId, isActive: true },
      select: { capacity: true },
    });
    totalCapacity = resources.reduce((sum, r) => sum + r.capacity, 0) || 1;
  } else {
    const settings = await getCompanySettings();
    totalCapacity = Number(settings?.rampCount) || 1;
  }

  // Parse date as local date
  const [year, month, day] = date.split('-').map(Number);

  // Check if this is today by comparing date strings (avoid timezone issues)
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isToday = date === todayStr;
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

  // Build appointment query with optional location filter
  const appointmentWhere = {
    organizationId,
    scheduledStart: { gte: startOfDay, lte: endOfDay },
    status: { not: 'CANCELLED' },
  };
  if (locationId) {
    appointmentWhere.locationId = locationId;
  }

  // Get existing appointments for the day
  const existingAppointments = await prisma.appointment.findMany({
    where: appointmentWhere,
    select: {
      scheduledStart: true,
      scheduledEnd: true,
    },
  });

  const slots = [];

  for (let hour = workStart; hour < workEnd; hour++) {
    for (let minute = 0; minute < 60; minute += DEFAULT_SLOT_INTERVAL) {
      // Skip past slots only for today (compare hours/minutes directly)
      if (isToday) {
        if (hour < currentHour || (hour === currentHour && minute <= currentMinute)) {
          continue;
        }
      }

      const slotStart = new Date(year, month - 1, day, hour, minute, 0, 0);
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + duration);

      // Skip if slot ends after work hours
      if (slotEnd.getHours() > workEnd || (slotEnd.getHours() === workEnd && slotEnd.getMinutes() > 0)) {
        continue;
      }

      // Count overlapping appointments
      const overlappingCount = existingAppointments.filter((apt) => {
        const aptStart = new Date(apt.scheduledStart);
        const aptEnd = new Date(apt.scheduledEnd);
        return (
          (slotStart >= aptStart && slotStart < aptEnd) ||
          (slotEnd > aptStart && slotEnd <= aptEnd) ||
          (slotStart <= aptStart && slotEnd >= aptEnd)
        );
      }).length;

      const availableCapacity = totalCapacity - overlappingCount;
      if (availableCapacity > 0) {
        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          formatted: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
          availableCapacity,
        });
      }
    }
  }

  return slots;
};

/**
 * Check availability for a time slot
 */
const checkAvailability = async (organizationId, scheduledStart, scheduledEnd) => {
  const settings = await getCompanySettings();
  const rampCount = Number(settings?.rampCount) || 0;

  if (!rampCount) {
    // No ramp limit configured - always available
    return { available: true, rampCount: 0, occupiedRamps: 0 };
  }

  const overlapping = await prisma.appointment.count({
    where: {
      organizationId,
      status: { not: 'CANCELLED' },
      scheduledStart: { lt: scheduledEnd },
      scheduledEnd: { gt: scheduledStart },
    },
  });

  return {
    available: overlapping < rampCount,
    rampCount,
    occupiedRamps: overlapping,
    availableRamps: Math.max(0, rampCount - overlapping),
  };
};

/**
 * GET /api/portal/appointments/locations
 * Get organization's active locations for booking
 */
router.get(
  '/locations',
  authenticateClient,
  asyncHandler(async (req, res) => {
    const locations = await prisma.location.findMany({
      where: {
        organizationId: req.client.organizationId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        city: true,
        county: true,
        phone: true,
        isPrimary: true,
      },
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    });

    res.json({
      locations,
      hasMultipleLocations: locations.length > 1,
    });
  })
);

/**
 * GET /api/portal/appointments/available-dates
 * Get available dates for the next N days
 */
router.get(
  '/available-dates',
  authenticateClient,
  asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;
    const dates = await getAvailableDatesForClient(req.client.organizationId, parseInt(days, 10));
    res.json(dates);
  })
);

/**
 * GET /api/portal/appointments/available-slots
 * Get available time slots for a specific date
 */
router.get(
  '/available-slots',
  authenticateClient,
  asyncHandler(async (req, res) => {
    const { date, duration, locationId } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Data este obligatorie' });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Format data invalid. Folositi YYYY-MM-DD' });
    }

    const slots = await getAvailableSlotsForClient(
      req.client.organizationId,
      date,
      duration ? parseInt(duration, 10) : DEFAULT_SLOT_DURATION,
      locationId || null
    );
    res.json(slots);
  })
);

/**
 * GET /api/portal/appointments/check-availability
 * Check if a time slot is available
 */
router.get(
  '/check-availability',
  authenticateClient,
  asyncHandler(async (req, res) => {
    const { scheduledStart, scheduledEnd } = req.query;

    if (!scheduledStart || !scheduledEnd) {
      return res.status(400).json({ error: 'scheduledStart si scheduledEnd sunt obligatorii' });
    }

    const start = new Date(scheduledStart);
    const end = new Date(scheduledEnd);

    if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) {
      return res.status(400).json({ error: 'Date invalide' });
    }

    if (end <= start) {
      return res.status(400).json({ error: 'Data de sfarsit trebuie sa fie dupa data de inceput' });
    }

    const availability = await checkAvailability(req.client.organizationId, start, end);
    res.json(availability);
  })
);

/**
 * POST /api/portal/appointments
 * Create a new appointment from the client portal
 */
router.post(
  '/',
  authenticateClient,
  validate(portalCreateAppointmentSchema),
  asyncHandler(async (req, res) => {
    const client = req.client;
    const organizationId = client.organizationId;
    const { title, description, scheduledStart, scheduledEnd, location, assetId, asset, locationId } = req.body;

    // Validate dates
    const start = new Date(scheduledStart);
    const end = new Date(scheduledEnd);

    if (!(start instanceof Date && !Number.isNaN(start.valueOf()))) {
      return res.status(400).json({ error: 'Data si ora de inceput sunt invalide' });
    }
    if (!(end instanceof Date && !Number.isNaN(end.valueOf()))) {
      return res.status(400).json({ error: 'Data si ora de sfarsit sunt invalide' });
    }
    if (end <= start) {
      return res.status(400).json({ error: 'Data de sfarsit trebuie sa fie dupa data de inceput' });
    }

    // Check availability
    const availability = await checkAvailability(organizationId, start, end);
    if (!availability.available) {
      return res.status(409).json({
        error: 'Nu exista locuri disponibile in intervalul orar selectat. Va rugam alegeti alt interval.',
        availability,
      });
    }

    // Find admin users in the organization for notifications
    const adminUsers = await prisma.user.findMany({
      where: {
        organizationId,
        roles: {
          some: {
            role: {
              key: 'admin',
            },
          },
        },
      },
      select: { id: true },
    });

    if (adminUsers.length === 0) {
      logger.error('No admin user found for organization', { organizationId });
      return res.status(500).json({ error: 'Configuratie organizatie invalida' });
    }

    const creatorAdminId = adminUsers[0].id;

    // Resolve asset if provided
    let resolvedAssetId = assetId || null;
    if (asset && !assetId) {
      try {
        const resolvedAsset = await resolveAsset(
          prisma,
          client.id,
          asset,
          null,
          organizationId
        );
        resolvedAssetId = resolvedAsset?.id || null;
      } catch (error) {
        logger.warn('Failed to resolve asset for portal appointment', { error: error.message });
      }
    }

    // Create the appointment
    const appointment = await prisma.appointment.create({
      data: {
        title,
        description,
        status: 'PENDING',
        scheduledStart: start,
        scheduledEnd: end,
        location,
        locationId: locationId || null,
        clientId: client.id,
        assetId: resolvedAssetId,
        createdById: creatorAdminId,
        updatedById: creatorAdminId,
        organizationId,
        metadata: {
          createdFromPortal: true,
          portalClientId: client.id,
        },
      },
      include: {
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
    });

    // Create an empty service order so it exists for future payments/PDF generation
    try {
      const soCount = await prisma.serviceOrder.count({ where: { organizationId } });
      const orderNumber = `CS-${String(soCount + 1).padStart(5, '0')}`;
      await prisma.serviceOrder.create({
        data: {
          appointmentId: appointment.id,
          organizationId,
          orderNumber,
          status: 'DRAFT',
          subtotal: 0,
          tax: 0,
          total: 0,
        },
      });
    } catch (soError) {
      logger.warn('Failed to create service order for portal appointment', { error: soError.message });
    }

    logger.info('Portal appointment created', {
      appointmentId: appointment.id,
      clientId: client.id,
      organizationId,
    });

    // Get client name for notifications
    const clientName = client.type === 'SRL'
      ? client.companyName
      : `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Client';

    // Format date for notification
    const dateStr = start.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = start.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });

    // Broadcast to CRM users (real-time update)
    try {
      broadcastAppointmentCreated(organizationId, {
        ...appointment,
        client: {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          companyName: client.companyName,
          type: client.type,
        },
      });
    } catch (error) {
      logger.warn('Failed to broadcast portal appointment creation', { error: error.message });
    }

    // Create bell notifications and send push to all admin users
    const notificationPromises = adminUsers.map(async (admin) => {
      try {
        // Bell notification
        await createNotification({
          recipientId: admin.id,
          title: 'Programare noua din portal',
          message: `${clientName} a creat o programare: ${title} - ${dateStr} ${timeStr}`,
          type: 'APPOINTMENT',
          entityType: 'APPOINTMENT',
          entityId: appointment.id,
          metadata: {
            appointmentId: appointment.id,
            clientId: client.id,
            clientName,
            scheduledStart: start,
            createdFromPortal: true,
          },
          organizationId,
        });

        // Web push notification
        await sendPushToUser(admin.id, {
          title: 'Programare noua din portal',
          body: `${clientName}: ${title} - ${dateStr} ${timeStr}`,
          icon: '/icons/calendar.png',
          badge: '/icons/badge.png',
          data: {
            type: 'appointment',
            appointmentId: appointment.id,
            url: `/appointments?id=${appointment.id}`,
          },
        });
      } catch (error) {
        logger.warn(`Failed to send notification to admin ${admin.id}`, { error: error.message });
      }
    });

    // Don't wait for notifications to complete
    Promise.all(notificationPromises).catch((error) => {
      logger.warn('Some notifications failed', { error: error.message });
    });

    res.status(201).json(appointment);
  })
);

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

const express = require('express');
const router = express.Router();
const asyncHandler = require('../../middleware/asyncHandler');
const publicBookingService = require('../../services/publicBookingService');
const prisma = require('../../../lib/prisma');

/**
 * GET /api/portal/public/:slug
 * Get organization info by slug
 */
router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const organization = await publicBookingService.getOrganizationBySlug(prisma, slug);
    res.json(organization);
  })
);

/**
 * GET /api/portal/public/:slug/dates
 * Get available dates for booking
 */
router.get(
  '/:slug/dates',
  asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const { days = 30 } = req.query;

    const organization = await publicBookingService.getOrganizationBySlug(prisma, slug);
    const dates = await publicBookingService.getAvailableDates(prisma, {
      organizationId: organization.id,
      days: parseInt(days, 10),
      settings: organization.publicBookingSettings,
    });

    res.json(dates);
  })
);

/**
 * GET /api/portal/public/:slug/slots
 * Get available time slots for a specific date
 */
router.get(
  '/:slug/slots',
  asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const { date, duration, locationId } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const organization = await publicBookingService.getOrganizationBySlug(prisma, slug);
    const slotDuration = duration
      ? parseInt(duration, 10)
      : organization.publicBookingSettings?.slotDuration || 60;

    const slots = await publicBookingService.getAvailableSlots(prisma, {
      organizationId: organization.id,
      date,
      duration: slotDuration,
      settings: organization.publicBookingSettings,
      locationId: locationId || null,
    });

    res.json(slots);
  })
);

/**
 * POST /api/portal/public/:slug/book
 * Create a public booking
 */
router.post(
  '/:slug/book',
  asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const { client, appointment, asset, createAccount, password, locationId } = req.body;

    // Validate required fields
    if (!client?.firstName || !client?.lastName || !client?.email || !client?.phone) {
      return res.status(400).json({
        error: 'Client information is required (firstName, lastName, email, phone)',
      });
    }

    if (!appointment?.scheduledStart) {
      return res.status(400).json({
        error: 'Appointment date/time is required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(client.email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password if creating account
    if (createAccount && (!password || password.length < 6)) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters',
      });
    }

    const organization = await publicBookingService.getOrganizationBySlug(prisma, slug);

    const result = await publicBookingService.createPublicBooking(prisma, {
      organizationId: organization.id,
      clientData: client,
      appointmentData: appointment,
      assetData: asset,
      createAccount,
      password,
      locationId: locationId || null,
    });

    res.status(201).json(result);
  })
);

module.exports = router;

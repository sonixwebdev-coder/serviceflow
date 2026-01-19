const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const asyncHandler = require('../middleware/asyncHandler');
const googleOAuthService = require('../services/google/googleOAuthService');
const googleCalendarService = require('../services/google/googleCalendarService');
const logger = require('../utils/logger');
const prisma = require('../../lib/prisma'); // Global prisma for unauthenticated callback

/**
 * GET /api/integrations/google/connect
 * Start Google OAuth flow
 */
router.get(
  '/google/connect',
  authenticate,
  asyncHandler(async (req, res) => {
    const state = Buffer.from(
      JSON.stringify({
        userId: req.user.id,
        returnUrl: req.query.returnUrl || '/profile',
      })
    ).toString('base64');

    const authUrl = googleOAuthService.getAuthUrl(state);
    res.json({ authUrl });
  })
);

/**
 * GET /api/integrations/google/callback
 * Handle OAuth callback (unauthenticated - called by Google)
 */
router.get(
  '/google/callback',
  asyncHandler(async (req, res) => {
    const { code, state, error } = req.query;

    // Parse state to get user info
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch (e) {
      logger.error('Invalid OAuth state:', e);
      return res.redirect('/profile?error=invalid_state');
    }

    if (error) {
      logger.error('Google OAuth error:', error);
      return res.redirect(`${stateData.returnUrl || '/profile'}?error=${error}`);
    }

    try {
      // Exchange code for tokens
      const tokens = await googleOAuthService.exchangeCodeForTokens(code);

      // Store config using global prisma (no tenant context in callback)
      await googleOAuthService.storeCalendarConfig(prisma, stateData.userId, tokens);

      logger.info(`Google Calendar connected for user ${stateData.userId}`);

      // Redirect back to the app
      const returnUrl = stateData.returnUrl || '/profile';
      res.redirect(`${process.env.FRONTEND_URL || ''}${returnUrl}?google_connected=true`);
    } catch (err) {
      logger.error('Failed to complete Google OAuth:', err);
      res.redirect(`${stateData.returnUrl || '/profile'}?error=oauth_failed`);
    }
  })
);

/**
 * GET /api/integrations/google/status
 * Get Google Calendar connection status
 */
router.get(
  '/google/status',
  authenticate,
  asyncHandler(async (req, res) => {
    const status = await googleOAuthService.getConnectionStatus(req.tenantPrisma, req.user.id);
    res.json(status);
  })
);

/**
 * POST /api/integrations/google/disconnect
 * Disconnect Google Calendar
 */
router.post(
  '/google/disconnect',
  authenticate,
  asyncHandler(async (req, res) => {
    await googleOAuthService.disconnectCalendar(req.tenantPrisma, req.user.id);
    res.json({ success: true, message: 'Google Calendar disconnected' });
  })
);

/**
 * GET /api/integrations/google/calendars
 * List user's Google calendars
 */
router.get(
  '/google/calendars',
  authenticate,
  asyncHandler(async (req, res) => {
    const calendars = await googleCalendarService.listCalendars(req.tenantPrisma, req.user.id);
    res.json(calendars);
  })
);

/**
 * PUT /api/integrations/google/settings
 * Update sync settings
 */
router.put(
  '/google/settings',
  authenticate,
  asyncHandler(async (req, res) => {
    const { calendarId, syncEnabled } = req.body;
    const config = await googleCalendarService.updateSyncSettings(req.tenantPrisma, req.user.id, {
      calendarId,
      syncEnabled,
    });
    res.json(config);
  })
);

/**
 * POST /api/integrations/google/sync
 * Manually trigger sync
 */
router.post(
  '/google/sync',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await googleCalendarService.syncAllAppointments(req.tenantPrisma, req.user.id);
    res.json(result);
  })
);

/**
 * POST /api/integrations/google/sync/:appointmentId
 * Sync a specific appointment
 */
router.post(
  '/google/sync/:appointmentId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { appointmentId } = req.params;

    const appointment = await req.tenantPrisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { client: true },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const result = await googleCalendarService.createEvent(
      req.tenantPrisma,
      req.user.id,
      appointment,
      appointment.client
    );

    res.json(result || { success: false, error: 'Failed to sync' });
  })
);

/**
 * GET /api/integrations/google/sync-status/:appointmentId
 * Get sync status for an appointment
 */
router.get(
  '/google/sync-status/:appointmentId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { appointmentId } = req.params;
    const status = await googleCalendarService.getAppointmentSyncStatus(
      req.tenantPrisma,
      req.user.id,
      appointmentId
    );
    res.json(status || { synced: false });
  })
);

/**
 * POST /api/integrations/google/import
 * Import events from Google Calendar to CRM
 */
router.post(
  '/google/import',
  authenticate,
  asyncHandler(async (req, res) => {
    const { timeMin, timeMax, maxResults } = req.body;
    const options = {};

    if (timeMin) options.timeMin = new Date(timeMin);
    if (timeMax) options.timeMax = new Date(timeMax);
    if (maxResults) options.maxResults = parseInt(maxResults, 10);

    const result = await googleCalendarService.importEventsFromGoogle(
      req.tenantPrisma,
      req.user.id,
      options
    );
    res.json(result);
  })
);

/**
 * POST /api/integrations/google/sync-bidirectional
 * Two-way sync: Export CRM appointments to Google and import Google events to CRM
 */
router.post(
  '/google/sync-bidirectional',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await googleCalendarService.syncBidirectional(
      req.tenantPrisma,
      req.user.id
    );
    res.json(result);
  })
);

module.exports = router;

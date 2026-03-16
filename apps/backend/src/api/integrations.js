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
    // Validate returnUrl is a safe relative path (prevent open redirect)
    const rawReturnUrl = req.query.returnUrl || '/profile';
    const returnUrl = /^\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/.test(rawReturnUrl) && !rawReturnUrl.startsWith('//')
      ? rawReturnUrl
      : '/profile';

    const state = Buffer.from(
      JSON.stringify({
        userId: req.user.id,
        returnUrl,
        locationId: req.query.locationId || null,
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
/**
 * Send an HTML page that redirects via JavaScript instead of a 302 redirect.
 * This avoids ERR_FAILED issues when redirecting cross-port (e.g. 5000 → 5173)
 * after a chain of OAuth redirects through Google.
 */
const sendRedirectPage = (res, url) => {
  const safeUrl = url.replace(/"/g, '&quot;').replace(/</g, '&lt;');
  res.type('html').send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="2;url=${safeUrl}"><script>window.location.replace("${safeUrl.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}");</script></head><body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;color:#666"><p>Se redirectioneaza...</p></body></html>`);
};

router.get(
  '/google/callback',
  asyncHandler(async (req, res) => {
    const { code, state, error, error_description } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Parse state to get user info
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch (e) {
      logger.error('Invalid OAuth state:', e);
      return sendRedirectPage(res, `${frontendUrl}/profile?error=invalid_state`);
    }

    const returnUrl = stateData.returnUrl || '/profile';

    if (error) {
      logger.error('Google OAuth error:', { error, error_description, userId: stateData.userId });
      return sendRedirectPage(res, `${frontendUrl}${returnUrl}?error=${error}`);
    }

    try {
      // Exchange code for tokens
      const tokens = await googleOAuthService.exchangeCodeForTokens(code);

      // Store config using global prisma (no tenant context in callback)
      await googleOAuthService.storeCalendarConfig(prisma, stateData.userId, tokens, stateData.locationId || null);

      logger.info(`Google Calendar connected for user ${stateData.userId} (location: ${stateData.locationId || 'default'})`);

      // Redirect back to the app, include locationId so frontend can restore the active location
      const locParam = stateData.locationId ? `&locationId=${stateData.locationId}` : '';
      sendRedirectPage(res, `${frontendUrl}${returnUrl}?google_connected=true${locParam}`);
    } catch (err) {
      logger.error('Failed to complete Google OAuth:', {
        message: err.message,
        name: err.name,
        stack: err.stack,
        userId: stateData.userId,
        locationId: stateData.locationId,
      });
      sendRedirectPage(res, `${frontendUrl}${returnUrl}?error=oauth_failed&detail=${encodeURIComponent(err.message || 'unknown')}`);
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
 * Disconnect Google Calendar for a specific location (or default)
 */
router.post(
  '/google/disconnect',
  authenticate,
  asyncHandler(async (req, res) => {
    const locationId = req.query.locationId || null;
    await googleOAuthService.disconnectCalendar(req.tenantPrisma, req.user.id, locationId);
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
    const locationId = req.query.locationId || null;
    const calendars = await googleCalendarService.listCalendars(req.tenantPrisma, req.user.id, locationId);
    res.json(calendars);
  })
);

/**
 * PUT /api/integrations/google/settings
 * Update sync settings for a specific location (or default)
 */
router.put(
  '/google/settings',
  authenticate,
  asyncHandler(async (req, res) => {
    const { calendarId, syncEnabled, locationId } = req.body;
    const config = await googleCalendarService.updateSyncSettings(req.tenantPrisma, req.user.id, {
      calendarId,
      syncEnabled,
      locationId: locationId || null,
    });
    res.json(config);
  })
);

/**
 * POST /api/integrations/google/sync
 * Manually trigger sync (optionally for a specific location)
 */
router.post(
  '/google/sync',
  authenticate,
  asyncHandler(async (req, res) => {
    const { locationId } = req.body;
    const result = await googleCalendarService.syncAllAppointments(req.tenantPrisma, req.user.id, locationId);
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

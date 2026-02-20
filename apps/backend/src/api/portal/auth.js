const express = require('express');
const router = express.Router();
const asyncHandler = require('../../middleware/asyncHandler');
const authenticateClient = require('../../middleware/authenticateClient');
const portalAuthService = require('../../services/portalAuthService');
const prisma = require('../../../lib/prisma');
const { setRefreshCookie, clearRefreshCookie } = require('../../utils/cookies');

const PORTAL_COOKIE = 'sf_portal_refresh';

/**
 * POST /api/portal/auth/login
 * Login to client portal
 */
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await portalAuthService.loginClient(prisma, {
      email,
      password,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    setRefreshCookie(res, result.refreshToken, PORTAL_COOKIE);
    const { refreshToken: _rt, ...body } = result;
    res.json(body);
  })
);

/**
 * POST /api/portal/auth/register
 * Register a new client account (requires existing client)
 */
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { email, password, clientId, referralCode } = req.body;

    if (!email || !password || !clientId) {
      return res.status(400).json({ error: 'Email, password, and clientId are required' });
    }

    const result = await portalAuthService.registerClient(prisma, {
      email,
      password,
      clientId,
      referralCode,
    });

    res.status(201).json(result);
  })
);

/**
 * POST /api/portal/auth/logout
 * Logout from client portal
 */
router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies[PORTAL_COOKIE];

    if (refreshToken) {
      await portalAuthService.logoutClient(prisma, refreshToken);
    }

    clearRefreshCookie(res, PORTAL_COOKIE);
    res.json({ success: true });
  })
);

/**
 * POST /api/portal/auth/refresh
 * Refresh access token using refresh token from httpOnly cookie
 */
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies[PORTAL_COOKIE];

    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token', code: 'AUTH_TOKEN_EXPIRED' });
    }

    try {
      const result = await portalAuthService.refreshClientSession(prisma, {
        token: refreshToken,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      setRefreshCookie(res, result.refreshToken, PORTAL_COOKIE);
      const { refreshToken: _rt, ...body } = result;
      res.json(body);
    } catch (error) {
      // Return 401 for token errors to trigger re-login on frontend
      if (error.statusCode === 401) {
        clearRefreshCookie(res, PORTAL_COOKIE);
        return res.status(401).json({ error: error.message, code: 'AUTH_TOKEN_EXPIRED' });
      }
      throw error;
    }
  })
);

/**
 * GET /api/portal/auth/me
 * Get current client account
 */
router.get(
  '/me',
  authenticateClient,
  asyncHandler(async (req, res) => {
    res.json({
      account: req.clientAccount,
      client: req.client,
    });
  })
);

/**
 * POST /api/portal/auth/verify-email
 * Verify email address
 */
router.post(
  '/verify-email',
  asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    await portalAuthService.verifyEmail(prisma, token);
    res.json({ success: true });
  })
);

/**
 * POST /api/portal/auth/forgot-password
 * Request password reset
 */
router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    await portalAuthService.requestPasswordReset(prisma, email);
    res.json({ success: true, message: 'If an account exists, a reset email has been sent' });
  })
);

/**
 * POST /api/portal/auth/reset-password
 * Reset password with token
 */
router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    await portalAuthService.resetPassword(prisma, {
      resetToken: token,
      newPassword: password,
    });

    res.json({ success: true });
  })
);

/**
 * POST /api/portal/auth/change-password
 * Change password (authenticated)
 */
router.post(
  '/change-password',
  authenticateClient,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    await portalAuthService.changePassword(prisma, {
      accountId: req.clientAccount.id,
      currentPassword,
      newPassword,
    });

    res.json({ success: true });
  })
);

module.exports = router;

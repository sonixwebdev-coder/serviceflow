const express = require('express');
const { z } = require('zod');
const router = express.Router();
const asyncHandler = require('../../middleware/asyncHandler');
const authenticateClient = require('../../middleware/authenticateClient');
const portalAuthService = require('../../services/portalAuthService');
const prisma = require('../../../lib/prisma');
const { setRefreshCookie, clearRefreshCookie } = require('../../utils/cookies');
const { verifyAccessToken } = require('../../utils/token');
const cache = require('../../utils/cache');

const emailSchema = z.string().email('Invalid email format').max(254);
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters').max(128);

const portalLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128),
});

const portalRegisterSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  clientId: z.string().uuid('Invalid clientId'),
  referralCode: z.string().max(20).optional(),
});

const PORTAL_COOKIE = 'sf_portal_refresh';

/**
 * POST /api/portal/auth/login
 * Login to client portal
 */
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parsed = portalLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }
    const { email, password } = parsed.data;

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
    const parsed = portalRegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }
    const { email, password, clientId, referralCode } = parsed.data;

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

    // Blacklist the access token so it can't be reused until expiry
    const authHeader = req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const accessToken = authHeader.replace('Bearer ', '');
      try {
        const payload = verifyAccessToken(accessToken);
        const remainingTtl = Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
        await cache.blacklistToken(accessToken, remainingTtl);
      } catch {
        // Token already expired or invalid — no need to blacklist
      }
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
      return res.status(400).json({ error: 'Token-ul de verificare este obligatoriu' });
    }

    await portalAuthService.verifyEmail(prisma, token);
    res.json({ success: true });
  })
);

/**
 * POST /api/portal/auth/resend-verification
 * Resend verification email
 */
router.post(
  '/resend-verification',
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Adresa de email este obligatorie' });
    }

    const account = await prisma.clientAccount.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            type: true,
            organizationId: true,
          },
        },
      },
    });

    // Always return success to prevent email enumeration
    if (!account || account.isVerified || !account.verificationToken) {
      return res.json({ success: true, message: 'Daca exista un cont neverificat, email-ul de verificare a fost retrimis' });
    }

    // Send verification email
    const { sendVerificationEmail } = require('../../services/email/emailService');
    const { getCompanySettings } = require('../../services/companySettingService');

    if (account.client?.organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: account.client.organizationId },
        select: { slug: true },
      });
      const portalUrl = process.env.CLIENT_PORTAL_URL || process.env.PORTAL_URL || 'http://localhost:5174';
      const verificationLink = `${portalUrl}/${org?.slug || ''}/verify-email?token=${account.verificationToken}`;

      const clientName = account.client.type === 'SRL'
        ? account.client.companyName
        : `${account.client.firstName || ''} ${account.client.lastName || ''}`.trim() || 'Client';

      try {
        const companySettings = await getCompanySettings(account.client.organizationId);
        await sendVerificationEmail(prisma, {
          email: account.email,
          clientName,
          verificationLink,
          companySettings,
          organizationId: account.client.organizationId,
        });
      } catch (err) {
        // Don't fail the request if email fails
      }
    }

    res.json({ success: true, message: 'Daca exista un cont neverificat, email-ul de verificare a fost retrimis' });
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
      return res.status(400).json({ error: 'Adresa de email este obligatorie' });
    }

    await portalAuthService.requestPasswordReset(prisma, email);
    res.json({ success: true, message: 'Daca exista un cont, un email de resetare a fost trimis' });
  })
);

/**
 * POST /api/portal/auth/reset-password
 * Reset password with token
 */
router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const schema = z.object({ token: z.string().min(1), password: passwordSchema });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    await portalAuthService.resetPassword(prisma, {
      resetToken: parsed.data.token,
      newPassword: parsed.data.password,
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
    const schema = z.object({ currentPassword: z.string().min(1), newPassword: passwordSchema });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    await portalAuthService.changePassword(prisma, {
      accountId: req.clientAccount.id,
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });

    res.json({ success: true });
  })
);

module.exports = router;

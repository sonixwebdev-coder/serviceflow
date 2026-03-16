const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const { loginSchema, forgotPasswordSchema, resetPasswordSchema } = require('../schemas/authSchema');
const { loginUser, refreshSession, revokeRefreshToken, requestPasswordReset, resetPassword } = require('../services/authService');
const { ok, noContent } = require('../utils/http');
const { setRefreshCookie, clearRefreshCookie } = require('../utils/cookies');
const cache = require('../utils/cache');
const { verifyAccessToken } = require('../utils/token');

const twoFactorRouter = require('./twoFactor');

const router = express.Router();

// Mount 2FA routes
router.use('/2fa', twoFactorRouter);

// Cookie name per context: admin panel uses a separate cookie so sessions don't collide
const getCookieName = (context) => context === 'admin' ? 'sf_admin_refresh' : 'sf_refresh';

// Resolve which cookie is present (for refresh/logout which don't receive context)
const resolveRefreshCookie = (cookies) => {
  if (cookies['sf_admin_refresh']) return { token: cookies['sf_admin_refresh'], cookieName: 'sf_admin_refresh' };
  if (cookies['sf_refresh']) return { token: cookies['sf_refresh'], cookieName: 'sf_refresh' };
  return { token: null, cookieName: 'sf_refresh' };
};

router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const auth = await loginUser(req.body);

    // If 2FA is required, don't issue tokens — return temp token for 2FA verification
    if (auth.requiresTwoFactor) {
      return ok(res, { requiresTwoFactor: true, tempToken: auth.tempToken }, '2FA required');
    }

    const cookieName = getCookieName(req.body.context);
    setRefreshCookie(res, auth.refreshToken, cookieName);
    return ok(res, { user: auth.user, accessToken: auth.accessToken }, 'Login successful');
  })
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    // If context is provided, use the specific cookie; otherwise auto-detect
    const context = req.body?.context;
    let token, cookieName;
    if (context) {
      cookieName = getCookieName(context);
      token = req.cookies[cookieName] || null;
    } else {
      ({ token, cookieName } = resolveRefreshCookie(req.cookies));
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'No refresh token', code: 'AUTH_TOKEN_EXPIRED' });
    }
    const auth = await refreshSession({ token });
    setRefreshCookie(res, auth.refreshToken, cookieName);
    return ok(res, { user: auth.user, accessToken: auth.accessToken }, 'Token refreshed');
  })
);

router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    const context = req.body?.context;
    let token, cookieName;
    if (context) {
      cookieName = getCookieName(context);
      token = req.cookies[cookieName] || null;
    } else {
      ({ token, cookieName } = resolveRefreshCookie(req.cookies));
    }
    if (token) {
      await revokeRefreshToken({ token });
    }
    // Clear auth cache for this user
    await cache.del(`auth:${req.user.id}`);
    // Blacklist the access token so it can't be reused until expiry
    const authHeader = req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const accessToken = authHeader.replace('Bearer ', '');
      try {
        const payload = verifyAccessToken(accessToken);
        const remainingTtl = Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
        await cache.blacklistToken(accessToken, remainingTtl);
      } catch {
        // Token already expired or invalid
      }
    }
    clearRefreshCookie(res, cookieName);
    return noContent(res);
  })
);

router.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    await requestPasswordReset(req.body.email);
    return ok(res, { success: true }, 'If the email exists, a reset link has been sent');
  })
);

router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    await resetPassword({ resetToken: req.body.token, newPassword: req.body.password });
    return ok(res, { success: true }, 'Password has been reset successfully');
  })
);

module.exports = router;

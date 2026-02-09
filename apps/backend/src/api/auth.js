const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const { loginSchema, forgotPasswordSchema, resetPasswordSchema } = require('../schemas/authSchema');
const { loginUser, refreshSession, revokeRefreshToken, requestPasswordReset, resetPassword } = require('../services/authService');
const { ok, noContent } = require('../utils/http');
const { setRefreshCookie, clearRefreshCookie } = require('../utils/cookies');

const router = express.Router();

router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const auth = await loginUser(req.body);
    setRefreshCookie(res, auth.refreshToken);
    return ok(res, { user: auth.user, accessToken: auth.accessToken }, 'Login successful');
  })
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const token = req.cookies['sf_refresh'];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No refresh token', code: 'AUTH_TOKEN_EXPIRED' });
    }
    const auth = await refreshSession({ token });
    setRefreshCookie(res, auth.refreshToken);
    return ok(res, { user: auth.user, accessToken: auth.accessToken }, 'Token refreshed');
  })
);

router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    const token = req.cookies['sf_refresh'];
    if (token) {
      await revokeRefreshToken({ token });
    }
    clearRefreshCookie(res);
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

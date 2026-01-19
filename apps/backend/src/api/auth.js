const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const { loginSchema, refreshSchema, forgotPasswordSchema, resetPasswordSchema } = require('../schemas/authSchema');
const { loginUser, refreshSession, revokeRefreshToken, requestPasswordReset, resetPassword } = require('../services/authService');
const { ok, noContent } = require('../utils/http');

const router = express.Router();

router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const auth = await loginUser(req.body);
    return ok(res, auth, 'Login successful');
  })
);

router.post(
  '/refresh',
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    const auth = await refreshSession({ token: req.body.refreshToken });
    return ok(res, auth, 'Token refreshed');
  })
);

router.post(
  '/logout',
  authenticate,
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    await revokeRefreshToken({ token: req.body.refreshToken });
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

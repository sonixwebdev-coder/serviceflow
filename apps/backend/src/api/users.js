const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const {
  listUsersQuerySchema,
  updateUserStatusSchema,
  createUserSchema,
  updateUserSchema,
  updateProfileSchema,
  changePasswordSchema,
} = require('../schemas/userSchema');
const {
  listUsers,
  getUserById,
  updateUserStatus,
  getCurrentUser,
  createUser,
  updateUser,
  deactivateUser,
  updateProfile,
  changePassword,
} = require('../services/userService');
const { ok, created, noContent } = require('../utils/http');

const router = express.Router();

router.get(
  '/',
  authenticate,
  validate(listUsersQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const users = await listUsers(req.query, req.user);
    return ok(res, users);
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await getCurrentUser(req.user.id);
    return ok(res, user);
  })
);

// Profile management routes - must come before /:userId to avoid route conflicts
router.get(
  '/profile',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await getCurrentUser(req.user.id);
    return ok(res, user);
  })
);

router.put(
  '/profile',
  authenticate,
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const user = await updateProfile(req.user.id, req.body);
    return ok(res, user, 'Profile updated successfully');
  })
);

router.put(
  '/profile/password',
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const result = await changePassword(req.user.id, req.body);
    return ok(res, result, result.message);
  })
);

router.get(
  '/:userId',
  authenticate,
  authorize({ roles: ['admin', 'manager'] }),
  asyncHandler(async (req, res) => {
    const user = await getUserById(req.params.userId);
    return ok(res, user);
  })
);

router.post(
  '/',
  authenticate,
  authorize({ roles: ['admin'] }),
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const user = await createUser(req.body);
    return created(res, user, 'User created successfully');
  })
);

router.put(
  '/:userId',
  authenticate,
  authorize({ roles: ['admin', 'manager'] }),
  validate(updateUserSchema),
  asyncHandler(async (req, res) => {
    const user = await updateUser(req.params.userId, req.body);
    return ok(res, user, 'User updated successfully');
  })
);

router.patch(
  '/:userId/status',
  authenticate,
  authorize({ roles: ['admin'] }),
  validate(updateUserStatusSchema),
  asyncHandler(async (req, res) => {
    const user = await updateUserStatus({ userId: req.params.userId, isActive: req.body.isActive });
    return ok(res, user, 'User status updated');
  })
);

router.delete(
  '/:userId',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    await deactivateUser(req.params.userId);
    return noContent(res);
  })
);

module.exports = router;

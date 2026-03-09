const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const cache = require('../utils/cache');
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
const { logFromRequest, ENTITY_TYPES } = require('../services/auditLogService');
const { ok, created, noContent } = require('../utils/http');

const router = express.Router();

router.get(
  '/',
  authenticate,
  validate(listUsersQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const locationContext = await req.getLocationContext();
    const users = await listUsers(req.tenantPrisma, req.query, req.user, {
      locationId: locationContext.currentLocationId,
    });
    return ok(res, users);
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await getCurrentUser(req.tenantPrisma, req.user.id);
    return ok(res, user);
  })
);

// Profile management routes - must come before /:userId to avoid route conflicts
router.get(
  '/profile',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await getCurrentUser(req.tenantPrisma, req.user.id);
    return ok(res, user);
  })
);

router.put(
  '/profile',
  authenticate,
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const user = await updateProfile(req.tenantPrisma, req.user.id, req.body);
    return ok(res, user, 'Profile updated successfully');
  })
);

router.put(
  '/profile/password',
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const result = await changePassword(req.tenantPrisma, req.user.id, req.body);
    return ok(res, result, result.message);
  })
);

router.get(
  '/:userId',
  authenticate,
  authorize({ roles: ['admin', 'manager'] }),
  asyncHandler(async (req, res) => {
    const user = await getUserById(req.tenantPrisma, req.params.userId);
    return ok(res, user);
  })
);

router.post(
  '/',
  authenticate,
  authorize({ roles: ['admin'] }),
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const user = await createUser(req.tenantPrisma, req.body, req.user.organizationId);

    await logFromRequest(req, {
      action: 'CREATE',
      entityType: ENTITY_TYPES.USER,
      entityId: user.id,
      description: `Creat angajat nou: ${user.firstName} ${user.lastName}`,
      metadata: { email: user.email, role: user.role },
    });

    return created(res, user, 'User created successfully');
  })
);

router.put(
  '/:userId',
  authenticate,
  authorize({ roles: ['admin', 'manager'] }),
  validate(updateUserSchema),
  asyncHandler(async (req, res) => {
    const user = await updateUser(req.tenantPrisma, req.params.userId, req.body, req.user.organizationId);
    await cache.del(`auth:${req.params.userId}`);

    await logFromRequest(req, {
      action: 'UPDATE',
      entityType: ENTITY_TYPES.USER,
      entityId: user.id,
      description: `Actualizat angajat: ${user.firstName} ${user.lastName}`,
      metadata: { changes: Object.keys(req.body) },
    });

    return ok(res, user, 'User updated successfully');
  })
);

router.patch(
  '/:userId/status',
  authenticate,
  authorize({ roles: ['admin'] }),
  validate(updateUserStatusSchema),
  asyncHandler(async (req, res) => {
    const user = await updateUserStatus(req.tenantPrisma, { userId: req.params.userId, isActive: req.body.isActive });
    await cache.del(`auth:${req.params.userId}`);

    await logFromRequest(req, {
      action: 'UPDATE',
      entityType: ENTITY_TYPES.USER,
      entityId: user.id,
      description: req.body.isActive
        ? `Activat angajat: ${user.firstName} ${user.lastName}`
        : `Dezactivat angajat: ${user.firstName} ${user.lastName}`,
      metadata: { isActive: req.body.isActive },
    });

    return ok(res, user, 'User status updated');
  })
);

router.delete(
  '/:userId',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const user = await getUserById(req.tenantPrisma, req.params.userId);
    await deactivateUser(req.tenantPrisma, req.params.userId);
    await cache.del(`auth:${req.params.userId}`);

    await logFromRequest(req, {
      action: 'DELETE',
      entityType: ENTITY_TYPES.USER,
      entityId: req.params.userId,
      description: `Dezactivat angajat: ${user.firstName} ${user.lastName}`,
    });

    return noContent(res);
  })
);

module.exports = router;

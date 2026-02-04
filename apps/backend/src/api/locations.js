const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  listLocations,
  createLocation,
  getLocationById,
  updateLocation,
  deleteLocation,
  assignUsersToLocation,
  removeUsersFromLocation,
  getLocationUsers,
  getUserLocations,
} = require('../services/locationService');
const {
  createLocationSchema,
  updateLocationSchema,
  listLocationQuerySchema,
  assignUsersSchema,
  removeUsersSchema,
} = require('../schemas/locationSchema');
const { logFromRequest } = require('../services/auditLogService');
const { ok, created } = require('../utils/http');

const router = express.Router();

/**
 * GET /api/locations
 * List all locations for the organization
 */
router.get(
  '/',
  authenticate,
  validate(listLocationQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await listLocations(req.tenantPrisma, req.query);
    return ok(res, result);
  })
);

/**
 * GET /api/locations/my
 * Get locations accessible to the current user
 */
router.get(
  '/my',
  authenticate,
  asyncHandler(async (req, res) => {
    const locations = await getUserLocations(req.tenantPrisma, req.user.id);
    return ok(res, locations);
  })
);

/**
 * POST /api/locations
 * Create a new location (admin only)
 */
router.post(
  '/',
  authenticate,
  authorize({ roles: ['admin'] }),
  validate(createLocationSchema),
  asyncHandler(async (req, res) => {
    const location = await createLocation(req.tenantPrisma, req.body, req.user.organizationId);

    await logFromRequest(req, {
      action: 'CREATE',
      entityType: 'Location',
      entityId: location.id,
      description: `Creata locatie noua: ${location.name}`,
      metadata: { slug: location.slug, isPrimary: location.isPrimary },
    });

    return created(res, location, 'Locatia a fost creata cu succes');
  })
);

/**
 * GET /api/locations/:locationId
 * Get location details
 */
router.get(
  '/:locationId',
  authenticate,
  asyncHandler(async (req, res) => {
    const location = await getLocationById(req.tenantPrisma, req.params.locationId);
    return ok(res, location);
  })
);

/**
 * PATCH /api/locations/:locationId
 * Update a location (admin only)
 */
router.patch(
  '/:locationId',
  authenticate,
  authorize({ roles: ['admin'] }),
  validate(updateLocationSchema),
  asyncHandler(async (req, res) => {
    const location = await updateLocation(
      req.tenantPrisma,
      req.params.locationId,
      req.body,
      req.user.organizationId
    );

    await logFromRequest(req, {
      action: 'UPDATE',
      entityType: 'Location',
      entityId: location.id,
      description: `Actualizata locatia: ${location.name}`,
      metadata: { changes: Object.keys(req.body) },
    });

    return ok(res, location, 'Locatia a fost actualizata cu succes');
  })
);

/**
 * DELETE /api/locations/:locationId
 * Delete a location (admin only)
 */
router.delete(
  '/:locationId',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const location = await getLocationById(req.tenantPrisma, req.params.locationId);
    const result = await deleteLocation(req.tenantPrisma, req.params.locationId, req.user.organizationId);

    await logFromRequest(req, {
      action: 'DELETE',
      entityType: 'Location',
      entityId: req.params.locationId,
      description: `Stearsa locatia: ${location.name}`,
    });

    return ok(res, result);
  })
);

/**
 * GET /api/locations/:locationId/users
 * Get users assigned to a location
 */
router.get(
  '/:locationId/users',
  authenticate,
  asyncHandler(async (req, res) => {
    const users = await getLocationUsers(req.tenantPrisma, req.params.locationId);
    return ok(res, users);
  })
);

/**
 * POST /api/locations/:locationId/users
 * Assign users to a location (admin only)
 */
router.post(
  '/:locationId/users',
  authenticate,
  authorize({ roles: ['admin'] }),
  validate(assignUsersSchema),
  asyncHandler(async (req, res) => {
    const { userIds, setPrimary } = req.body;
    const result = await assignUsersToLocation(req.tenantPrisma, req.params.locationId, userIds, {
      setPrimary,
    });

    await logFromRequest(req, {
      action: 'UPDATE',
      entityType: 'Location',
      entityId: req.params.locationId,
      description: `Asignati ${userIds.length} utilizator(i) la locatie`,
      metadata: { userIds, setPrimary },
    });

    return ok(res, result);
  })
);

/**
 * DELETE /api/locations/:locationId/users
 * Remove users from a location (admin only)
 */
router.delete(
  '/:locationId/users',
  authenticate,
  authorize({ roles: ['admin'] }),
  validate(removeUsersSchema),
  asyncHandler(async (req, res) => {
    const { userIds } = req.body;
    const result = await removeUsersFromLocation(req.tenantPrisma, req.params.locationId, userIds);

    await logFromRequest(req, {
      action: 'UPDATE',
      entityType: 'Location',
      entityId: req.params.locationId,
      description: `Eliminati ${userIds.length} utilizator(i) din locatie`,
      metadata: { userIds },
    });

    return ok(res, result);
  })
);

module.exports = router;

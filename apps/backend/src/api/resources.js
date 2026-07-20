const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const {
  listResources,
  createResource,
  getResourceById,
  updateResource,
  deleteResource,
  getAvailableResources,
} = require('../services/resourceService');
const { logFromRequest } = require('../services/auditLogService');
const { ok, created } = require('../utils/http');

const router = express.Router();

// Get available resources for a time slot
router.get(
  '/available',
  authenticate,
  asyncHandler(async (req, res) => {
    const { startTime, endTime, type } = req.query;

    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'startTime and endTime are required',
      });
    }

    const locationFilter = await req.getLocationFilter({ includeNull: true });
    const resources = await getAvailableResources(
      req.tenantPrisma,
      {
        startTime,
        endTime,
        type,
      },
      { locationFilter }
    );

    return ok(res, resources);
  })
);

// List all resources with pagination and filtering
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const locationFilter = await req.getLocationFilter({ includeNull: true });
    const result = await listResources(req.tenantPrisma, { ...req.query, locationFilter });
    return ok(res, result);
  })
);

// Create a new resource
router.post(
  '/',
  authenticate,
  authorize({ roles: ['admin', 'manager'] }),
  asyncHandler(async (req, res) => {
    const locationContext = await req.getLocationContext();
    const resource = await createResource(req.tenantPrisma, {
      ...req.body,
      locationId: req.body.locationId || locationContext.currentLocationId,
    });

    await logFromRequest(req, {
      action: 'CREATE',
      entityType: 'Resource',
      entityId: resource.id,
      description: `Creat resursa noua: ${resource.name}`,
      metadata: { type: resource.type },
    });

    return created(res, resource, 'Resource created successfully');
  })
);

// Get resource by ID
router.get(
  '/:resourceId',
  authenticate,
  asyncHandler(async (req, res) => {
    const resource = await getResourceById(req.tenantPrisma, req.params.resourceId);
    return ok(res, resource);
  })
);

// Update a resource
router.patch(
  '/:resourceId',
  authenticate,
  authorize({ roles: ['admin', 'manager'] }),
  asyncHandler(async (req, res) => {
    const resource = await updateResource(req.tenantPrisma, req.params.resourceId, req.body);

    await logFromRequest(req, {
      action: 'UPDATE',
      entityType: 'Resource',
      entityId: resource.id,
      description: `Actualizat resursa: ${resource.name}`,
      metadata: { changes: Object.keys(req.body) },
    });

    return ok(res, resource, 'Resource updated successfully');
  })
);

// Delete a resource
router.delete(
  '/:resourceId',
  authenticate,
  authorize({ roles: ['admin', 'manager'] }),
  asyncHandler(async (req, res) => {
    const resource = await getResourceById(req.tenantPrisma, req.params.resourceId);
    const result = await deleteResource(req.tenantPrisma, req.params.resourceId);

    await logFromRequest(req, {
      action: 'DELETE',
      entityType: 'Resource',
      entityId: req.params.resourceId,
      description: `Sters resursa: ${resource.name}`,
    });

    return ok(res, result, 'Resource deleted successfully');
  })
);

module.exports = router;

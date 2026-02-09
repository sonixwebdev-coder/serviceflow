const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const {
  listAssets,
  createAsset,
  getAssetById,
  updateAsset,
  deleteAsset,
  getAssetsByClientId,
} = require('../services/assetService');
const { logFromRequest, ENTITY_TYPES, getActionDescription } = require('../services/auditLogService');
const { ok, created } = require('../utils/http');

const router = express.Router();

// List all assets with pagination and filtering
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const locationFilter = await req.getLocationFilter({ includeNull: true });
    const result = await listAssets(req.tenantPrisma, req.query, { locationFilter });
    return ok(res, result);
  })
);

// Create a new asset
router.post(
  '/',
  authenticate,
  authorize({ roles: ['admin', 'manager', 'technician'] }),
  asyncHandler(async (req, res) => {
    const asset = await createAsset(req.tenantPrisma, req.body);

    await logFromRequest(req, {
      action: 'CREATE',
      entityType: ENTITY_TYPES.ASSET,
      entityId: asset.id,
      description: getActionDescription('CREATE', ENTITY_TYPES.ASSET, asset.name),
      metadata: { clientId: asset.clientId, type: asset.type },
    });

    return created(res, asset, 'Asset created successfully');
  })
);

// Get asset by ID
router.get(
  '/:assetId',
  authenticate,
  asyncHandler(async (req, res) => {
    const asset = await getAssetById(req.tenantPrisma, req.params.assetId);
    return ok(res, asset);
  })
);

// Update an asset
router.patch(
  '/:assetId',
  authenticate,
  authorize({ roles: ['admin', 'manager', 'technician'] }),
  asyncHandler(async (req, res) => {
    const asset = await updateAsset(req.tenantPrisma, req.params.assetId, req.body);

    await logFromRequest(req, {
      action: 'UPDATE',
      entityType: ENTITY_TYPES.ASSET,
      entityId: asset.id,
      description: getActionDescription('UPDATE', ENTITY_TYPES.ASSET, asset.name),
      metadata: { changes: Object.keys(req.body) },
    });

    return ok(res, asset, 'Asset updated successfully');
  })
);

// Delete an asset
router.delete(
  '/:assetId',
  authenticate,
  authorize({ roles: ['admin', 'manager'] }),
  asyncHandler(async (req, res) => {
    const asset = await getAssetById(req.tenantPrisma, req.params.assetId);
    const result = await deleteAsset(req.tenantPrisma, req.params.assetId);

    await logFromRequest(req, {
      action: 'DELETE',
      entityType: ENTITY_TYPES.ASSET,
      entityId: req.params.assetId,
      description: getActionDescription('DELETE', ENTITY_TYPES.ASSET, asset.name),
    });

    return ok(res, result, 'Asset deleted successfully');
  })
);

// Get all assets for a specific client
router.get(
  '/client/:clientId',
  authenticate,
  asyncHandler(async (req, res) => {
    const assets = await getAssetsByClientId(req.tenantPrisma, req.params.clientId);
    return ok(res, assets);
  })
);

module.exports = router;

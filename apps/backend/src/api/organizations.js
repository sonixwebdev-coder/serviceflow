const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  createOrganization,
  getOrganizationById,
  updateOrganization,
  getOrganizationStats,
} = require('../services/organizationService');
const {
  getOrganizationSettings,
  updateOrganizationSettings,
  updateTerminology,
  updateFeatures,
  updateAssetFieldConfig,
} = require('../services/organizationSettingsService');
const {
  updateOrganizationSettingsSchema,
  terminologySchema,
  featuresSchema,
  assetFieldConfigSchema,
} = require('../schemas/organizationSettingsSchema');
const { ok, created } = require('../utils/http');

const router = express.Router();

/**
 * Organization signup endpoint
 * This is public - allows new organizations to register
 */
router.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const result = await createOrganization(req.body);
    return created(res, result, 'Organization created successfully');
  })
);

/**
 * Get current user's organization details
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const organization = await getOrganizationById(req.user.organizationId);
    return ok(res, organization);
  })
);

/**
 * Get current organization's statistics
 */
router.get(
  '/me/stats',
  authenticate,
  asyncHandler(async (req, res) => {
    const stats = await getOrganizationStats(req.user.organizationId);
    return ok(res, stats);
  })
);

/**
 * Update current user's organization
 * Only admins can update organization settings
 */
router.patch(
  '/me',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const organization = await updateOrganization(req.user.organizationId, req.body);
    return ok(res, organization, 'Organization updated successfully');
  })
);

/**
 * Get organization settings (terminology, features, etc.)
 */
router.get(
  '/me/settings',
  authenticate,
  asyncHandler(async (req, res) => {
    const settings = await getOrganizationSettings(req.tenantPrisma, req.user.organizationId);
    return ok(res, settings);
  })
);

/**
 * Update organization settings (complete)
 * Only admins can update settings
 */
router.put(
  '/me/settings',
  authenticate,
  authorize({ roles: ['admin'] }),
  validate(updateOrganizationSettingsSchema),
  asyncHandler(async (req, res) => {
    const settings = await updateOrganizationSettings(
      req.tenantPrisma,
      req.user.organizationId,
      req.body
    );
    return ok(res, settings, 'Settings updated successfully');
  })
);

/**
 * Update only terminology settings
 * Only admins can update terminology
 */
router.patch(
  '/me/settings/terminology',
  authenticate,
  authorize({ roles: ['admin'] }),
  validate(terminologySchema),
  asyncHandler(async (req, res) => {
    const settings = await updateTerminology(
      req.tenantPrisma,
      req.user.organizationId,
      req.body
    );
    return ok(res, settings, 'Terminology updated successfully');
  })
);

/**
 * Update only feature flags
 * Only admins can update features
 */
router.patch(
  '/me/settings/features',
  authenticate,
  authorize({ roles: ['admin'] }),
  validate(featuresSchema),
  asyncHandler(async (req, res) => {
    const settings = await updateFeatures(
      req.tenantPrisma,
      req.user.organizationId,
      req.body
    );
    return ok(res, settings, 'Features updated successfully');
  })
);

/**
 * Update asset field configuration
 * Only admins can update asset field config
 */
router.patch(
  '/me/settings/assetFieldConfig',
  authenticate,
  authorize({ roles: ['admin'] }),
  validate(assetFieldConfigSchema),
  asyncHandler(async (req, res) => {
    const settings = await updateAssetFieldConfig(
      req.tenantPrisma,
      req.user.organizationId,
      req.body
    );
    return ok(res, settings, 'Asset field configuration updated successfully');
  })
);

/**
 * Check if organization slug is available
 * This is public - allows checking slug availability during signup
 */
router.get(
  '/check-slug/:slug',
  asyncHandler(async (req, res) => {
    const prisma = require('../../lib/prisma');
    const { slug } = req.params;

    const existing = await prisma.organization.findUnique({
      where: { slug },
    });

    return ok(res, {
      available: !existing,
      slug,
    });
  })
);

module.exports = router;

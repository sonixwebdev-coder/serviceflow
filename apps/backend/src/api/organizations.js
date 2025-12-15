const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const {
  createOrganization,
  getOrganizationById,
  updateOrganization,
  getOrganizationStats,
} = require('../services/organizationService');
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

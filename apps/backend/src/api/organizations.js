const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const {
  createOrganization,
  getOrganizationById,
  updateOrganization,
  getOrganizationStats,
} = require('../services/organizationService');
const { setRefreshCookie } = require('../utils/cookies');
const {
  getOrganizationSettings,
  getSectorInfo,
  updatePublicBooking,
  getServices,
  updateServices,
} = require('../services/organizationSettingsService');
const { publicBookingSchema, servicesArraySchema } = require('../schemas/organizationSettingsSchema');
const { logFromRequest } = require('../services/auditLogService');
const { ok, created } = require('../utils/http');

const router = express.Router();

// Rate limiter for slug check (prevent enumeration attacks)
const slugCheckLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: 'Too many slug check requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation schema for slug
const slugSchema = z.object({
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(63, 'Slug must be at most 63 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .regex(/^[a-z0-9]/, 'Slug must start with a letter or number')
    .regex(/[a-z0-9]$/, 'Slug must end with a letter or number')
    .refine((val) => !val.includes('--'), 'Slug cannot contain consecutive hyphens'),
});

/**
 * Organization signup endpoint
 * This is public - allows new organizations to register
 */
router.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const result = await createOrganization(req.body);
    setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _rt, ...body } = result;
    return created(res, body, 'Organization created successfully');
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
 * Get organization sector info (activity sector, asset type, terminology)
 */
router.get(
  '/me/sector',
  authenticate,
  asyncHandler(async (req, res) => {
    const sectorInfo = await getSectorInfo(req.tenantPrisma, req.user.organizationId);
    return ok(res, sectorInfo);
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

    await logFromRequest(req, {
      action: 'UPDATE',
      entityType: 'Organization',
      entityId: req.user.organizationId,
      description: `Actualizat setari organizatie`,
      metadata: { changes: Object.keys(req.body) },
    });

    return ok(res, organization, 'Organization updated successfully');
  })
);

/**
 * Get organization settings
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
 * Update public booking settings
 * Only admins can update public booking settings
 * This is the only editable settings after onboarding
 */
router.patch(
  '/me/settings/publicBooking',
  authenticate,
  authorize({ roles: ['admin'] }),
  validate(publicBookingSchema),
  asyncHandler(async (req, res) => {
    const settings = await updatePublicBooking(
      req.tenantPrisma,
      req.user.organizationId,
      req.body
    );

    await logFromRequest(req, {
      action: 'UPDATE',
      entityType: 'Organization',
      entityId: req.user.organizationId,
      description: `Actualizat setari programari publice`,
      metadata: req.body,
    });

    return ok(res, settings, 'Public booking settings updated successfully');
  })
);

/**
 * Get organization services
 */
router.get(
  '/me/settings/services',
  authenticate,
  asyncHandler(async (req, res) => {
    const services = await getServices(req.tenantPrisma, req.user.organizationId);
    return ok(res, services);
  })
);

/**
 * Update organization services
 * Only admins can update services
 */
router.put(
  '/me/settings/services',
  authenticate,
  authorize({ roles: ['admin'] }),
  validate(servicesArraySchema),
  asyncHandler(async (req, res) => {
    const services = await updateServices(
      req.tenantPrisma,
      req.user.organizationId,
      req.body.services
    );

    await logFromRequest(req, {
      action: 'UPDATE',
      entityType: 'Organization',
      entityId: req.user.organizationId,
      description: `Actualizat servicii organizatie`,
      metadata: { servicesCount: req.body.services.length },
    });

    return ok(res, services, 'Services updated successfully');
  })
);

/**
 * Check if organization slug is available
 * This is public - allows checking slug availability during signup
 * Rate limited and includes timing attack prevention
 */
router.get(
  '/check-slug/:slug',
  slugCheckLimiter,
  validate(slugSchema, 'params'),
  asyncHandler(async (req, res) => {
    const prisma = require('../../lib/prisma');
    const { slug } = req.params;

    // Add random delay (50-100ms) to prevent timing attacks
    const delay = 50 + Math.random() * 50;
    await new Promise((resolve) => setTimeout(resolve, delay));

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

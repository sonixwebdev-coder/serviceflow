const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const asyncHandler = require('../../middleware/asyncHandler');
const validate = require('../../middleware/validate');
const {
  listOrganizations,
  getOrganizationDetail,
  getMarketplaceStats,
  getMarketplaceFilters,
} = require('../../services/marketplaceService');
const { listOrganizationsSchema } = require('../../schemas/marketplaceSchema');
const { ok } = require('../../utils/http');
const prisma = require('../../../lib/prisma');

// Rate limiter for listing: 30 requests per minute per IP
const listLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, message: 'Prea multe cereri. Va rugam asteptati un minut.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for stats/filters: 60 requests per minute per IP
const infoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, message: 'Prea multe cereri. Va rugam asteptati un minut.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * GET /api/portal/public/marketplace/stats
 * Platform statistics for landing page
 */
router.get(
  '/stats',
  infoLimiter,
  asyncHandler(async (req, res) => {
    const stats = await getMarketplaceStats(prisma);
    return ok(res, stats);
  })
);

/**
 * GET /api/portal/public/marketplace/filters
 * Available filter options
 */
router.get(
  '/filters',
  infoLimiter,
  asyncHandler(async (req, res) => {
    const filters = await getMarketplaceFilters(prisma);
    return ok(res, filters);
  })
);

/**
 * GET /api/portal/public/marketplace/:slug
 * Organization detail
 */
router.get(
  '/:slug',
  listLimiter,
  asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const org = await getOrganizationDetail(prisma, slug);

    if (!org) {
      return res.status(404).json({
        success: false,
        message: 'Organizatia nu a fost gasita',
      });
    }

    return ok(res, org);
  })
);

/**
 * GET /api/portal/public/marketplace
 * List organizations (paginated, filtered)
 */
router.get(
  '/',
  listLimiter,
  validate(listOrganizationsSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await listOrganizations(prisma, req.query);
    return ok(res, result);
  })
);

module.exports = router;

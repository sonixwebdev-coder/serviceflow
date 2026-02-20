const express = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const asyncHandler = require('../middleware/asyncHandler');
const { ok, errorResponse } = require('../utils/http');
const prisma = require('../../lib/prisma');
const billingService = require('../services/billingService');

const router = express.Router();

// All billing routes require authentication + admin role
router.use(authenticate);
router.use(authorize({ roles: ['admin'] }));

/**
 * POST /api/billing/checkout
 * Create a Stripe Checkout session and return the URL
 * Body: { plan: 'STARTER'|'PROFESSIONAL'|'ENTERPRISE', interval: 'monthly'|'annual' }
 */
router.post(
  '/checkout',
  asyncHandler(async (req, res) => {
    const { plan, interval = 'monthly' } = req.body;

    if (!plan || !['STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(plan)) {
      return errorResponse(res, 400, 'Invalid plan. Must be STARTER, PROFESSIONAL, or ENTERPRISE.');
    }

    if (!['monthly', 'annual'].includes(interval)) {
      return errorResponse(res, 400, 'Invalid interval. Must be monthly or annual.');
    }

    const org = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
    });

    if (!org) {
      return errorResponse(res, 404, 'Organization not found.');
    }

    const url = await billingService.createCheckoutSession(org, plan, interval);
    return ok(res, { url }, 'Checkout session created');
  })
);

/**
 * POST /api/billing/portal
 * Create a Stripe Customer Portal session and return the URL
 */
router.post(
  '/portal',
  asyncHandler(async (req, res) => {
    const org = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
    });

    if (!org) {
      return errorResponse(res, 404, 'Organization not found.');
    }

    const url = await billingService.createPortalSession(org);
    return ok(res, { url }, 'Portal session created');
  })
);

/**
 * GET /api/billing/status
 * Return current billing status, plan, usage, and next invoice info
 */
router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const org = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
    });

    if (!org) {
      return errorResponse(res, 404, 'Organization not found.');
    }

    const status = await billingService.getBillingStatus(org);
    return ok(res, status, 'Billing status retrieved');
  })
);

module.exports = router;

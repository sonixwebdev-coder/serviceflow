const express = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const asyncHandler = require('../middleware/asyncHandler');
const { ok, errorResponse } = require('../utils/http');
const prisma = require('../../lib/prisma');
const billingService = require('../services/billingService');
const addonService = require('../services/addonService');
const { getQuotaUsage } = require('../services/organizationService');
const { getStripe } = require('../utils/stripe');
const logger = require('../utils/logger');

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

/**
 * GET /api/billing/quota
 * Return current quota usage for all resources
 */
router.get(
  '/quota',
  asyncHandler(async (req, res) => {
    const usage = await getQuotaUsage(req.user.organizationId);
    return ok(res, usage, 'Quota usage retrieved');
  })
);

/**
 * GET /api/billing/addons
 * Return available add-on packs with prices
 */
router.get(
  '/addons',
  asyncHandler(async (req, res) => {
    const addons = await addonService.getAvailableAddons();
    return ok(res, addons, 'Available add-ons retrieved');
  })
);

/**
 * GET /api/billing/addons/active
 * Return organization's active add-ons
 */
router.get(
  '/addons/active',
  asyncHandler(async (req, res) => {
    const addons = await addonService.getActiveAddons(req.user.organizationId);
    return ok(res, addons, 'Active add-ons retrieved');
  })
);

/**
 * POST /api/billing/addons/checkout
 * Create a Stripe Checkout session for add-on purchase
 * Body: { addonType: 'CLIENTS_100' | 'CLIENTS_300' | 'APPOINTMENTS_200' | 'APPOINTMENTS_500' }
 */
router.post(
  '/addons/checkout',
  asyncHandler(async (req, res) => {
    const { addonType } = req.body;

    if (!addonType) {
      return errorResponse(res, 400, 'addonType is required');
    }

    const org = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
    });

    if (!org) {
      return errorResponse(res, 404, 'Organization not found.');
    }

    const url = await addonService.createAddonCheckout(org, addonType);
    return ok(res, { url }, 'Add-on checkout session created');
  })
);

/**
 * POST /api/billing/verify-checkout
 * Verify a completed Stripe Checkout session and sync the subscription.
 * Called by the frontend after redirect from Stripe to ensure the org
 * status is updated even if the webhook was delayed or missed.
 * Body: { sessionId: string }
 */
router.post(
  '/verify-checkout',
  asyncHandler(async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) {
      return errorResponse(res, 400, 'sessionId is required');
    }

    const stripe = await getStripe();
    if (!stripe) {
      return errorResponse(res, 503, 'Billing is not configured');
    }

    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (err) {
      logger.warn('verify-checkout: failed to retrieve session', { sessionId, error: err.message });
      return errorResponse(res, 400, 'Invalid checkout session');
    }

    // Only process subscription checkout sessions (not addon payments)
    if (session.mode !== 'subscription') {
      return errorResponse(res, 400, 'This endpoint only handles subscription checkout sessions');
    }

    // Verify this session belongs to the current user's org
    if (session.metadata?.organizationId !== req.user.organizationId) {
      return errorResponse(res, 403, 'Session does not belong to this organization');
    }

    if (session.payment_status !== 'paid') {
      return errorResponse(res, 400, 'Payment has not been completed');
    }

    // Sync the subscription if present
    if (session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      await billingService.syncSubscription(subscription);

      // Store subscription start date (only on initial subscription, not upgrades) and billing interval
      const existingOrg = await prisma.organization.findUnique({ where: { id: req.user.organizationId }, select: { subscriptionStartedAt: true } });
      const updateData = { stripeCustomerId: session.customer };
      if (!existingOrg?.subscriptionStartedAt) {
        updateData.subscriptionStartedAt = new Date();
      }
      const interval = subscription.items?.data?.[0]?.price?.recurring?.interval;
      if (interval) updateData.billingInterval = interval;

      await prisma.organization.update({
        where: { id: req.user.organizationId },
        data: updateData,
      });

      logger.info('verify-checkout: subscription synced', {
        sessionId,
        orgId: req.user.organizationId,
        subscriptionId: subscription.id,
      });
    }

    // Return fresh billing status
    const org = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
    });
    const status = await billingService.getBillingStatus(org);
    return ok(res, status, 'Checkout verified and subscription synced');
  })
);

module.exports = router;

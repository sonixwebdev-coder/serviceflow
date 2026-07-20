const { getStripe } = require('../utils/stripe');
const prisma = require('../../lib/prisma');
const { AppError } = require('../utils/errors');
const { getStripePriceId, getPlanFromPriceId } = require('../utils/stripePrices');
const { getSettings } = require('./platformSettingsService');
const { getAllPlanLimits } = require('../utils/planLimits');
const logger = require('../utils/logger');
const { sendOrgSuspendedEmail, sendPaymentRequiredEmail } = require('./email/emailService');
const cache = require('../utils/cache');
const { invalidateOrganizationAuthCache } = require('./billing/authCache');
const {
  applyDisplayPrices,
  applyStripeSubscription,
  applyUpcomingInvoice,
  applyUsageAndLimits,
  buildSubscriptionUpdateData,
  createBillingStatus,
  getOrganizationStatus,
} = require('./billing/billingDomain');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Get or create a Stripe customer for an organization
 */
const getOrCreateStripeCustomer = async (org) => {
  const stripe = await getStripe();
  if (!stripe) throw new AppError('Billing is not configured', 503);

  if (org.stripeCustomerId) {
    return org.stripeCustomerId;
  }

  const adminUser = await prisma.user.findFirst({
    where: {
      organizationId: org.id,
      roles: { some: { role: { key: 'admin' } } },
    },
  });

  const customer = await stripe.customers.create({
    name: org.name,
    email: adminUser?.email || undefined,
    metadata: {
      organizationId: org.id,
      slug: org.slug,
    },
  });

  await prisma.organization.update({
    where: { id: org.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
};

/**
 * Create a Stripe Checkout session for subscribing to a plan.
 * If the org already has an active subscription, it will be cancelled
 * immediately once the new subscription is created (via webhook/verify-checkout).
 */
const createCheckoutSession = async (org, plan, interval = 'monthly') => {
  const stripe = await getStripe();
  if (!stripe) throw new AppError('Billing is not configured', 503);

  const priceId = await getStripePriceId(plan, interval);
  if (!priceId) {
    throw new AppError(`No Stripe price configured for plan ${plan} (${interval})`, 400);
  }

  const customerId = await getOrCreateStripeCustomer(org);

  // Platform-managed trial - never use Stripe trial_period_days
  const sessionParams = {
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${FRONTEND_URL}/settings/billing?session_id={CHECKOUT_SESSION_ID}&status=success`,
    cancel_url: `${FRONTEND_URL}/settings/billing?status=cancelled`,
    metadata: {
      organizationId: org.id,
      plan,
      interval,
      previousSubscriptionId: org.subscriptionId || '',
    },
    subscription_data: {
      metadata: { organizationId: org.id },
    },
  };

  const session = await stripe.checkout.sessions.create(sessionParams);
  return session.url;
};

/**
 * Cancel the previous subscription when upgrading/downgrading.
 * Called after a new subscription is successfully synced.
 */
const cancelPreviousSubscription = async (previousSubId, newSubId) => {
  if (!previousSubId || previousSubId === newSubId) return;

  const stripe = await getStripe();
  if (!stripe) return;

  try {
    const sub = await stripe.subscriptions.retrieve(previousSubId);
    if (sub.status !== 'canceled') {
      await stripe.subscriptions.cancel(previousSubId);
      logger.info('cancelPreviousSubscription: cancelled old subscription', {
        previousSubId,
        newSubId,
      });
    }
  } catch (err) {
    // Log but don't throw - the new subscription is already active
    logger.warn('cancelPreviousSubscription: failed to cancel old subscription', {
      previousSubId,
      error: err.message,
    });
  }
};

/**
 * Create a Stripe Customer Portal session for managing subscription
 */
const createPortalSession = async (org) => {
  const stripe = await getStripe();
  if (!stripe) throw new AppError('Billing is not configured', 503);

  if (!org.stripeCustomerId) {
    throw new AppError('No billing account found. Please subscribe to a plan first.', 400);
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${FRONTEND_URL}/settings/billing`,
  });

  return session.url;
};

/**
 * Get current billing status for an organization
 */
const getBillingStatus = async (org) => {
  const stripe = await getStripe();
  const result = createBillingStatus(org);

  if (stripe && org.stripeCustomerId && org.subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(org.subscriptionId);
      applyStripeSubscription(result, subscription);

      try {
        const upcoming = await stripe.invoices.retrieveUpcoming({
          customer: org.stripeCustomerId,
        });
        applyUpcomingInvoice(result, upcoming);
      } catch {
        // No upcoming invoice
      }
    } catch {
      // Subscription not found on Stripe
    }
  }

  const [userCount, clientCount, appointmentCount] = await Promise.all([
    prisma.user.count({ where: { organizationId: org.id } }),
    prisma.client.count({ where: { organizationId: org.id } }),
    prisma.appointment.count({ where: { organizationId: org.id } }),
  ]);

  const limits = getAllPlanLimits(org.plan);
  applyUsageAndLimits(result, { userCount, clientCount, appointmentCount }, limits);

  // Dynamic display prices from admin settings (convert Decimal to plain numbers)
  const settings = await getSettings();
  applyDisplayPrices(result, settings);

  return result;
};

/**
 * Sync a Stripe subscription state to the Organization in the database.
 */
const syncSubscription = async (stripeSubscription) => {
  const orgId = stripeSubscription.metadata?.organizationId;
  if (!orgId) {
    logger.warn('syncSubscription: no organizationId in subscription metadata', {
      subscriptionId: stripeSubscription.id,
    });
    return;
  }

  // Guard: do not overwrite manually granted plans
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { planOverride: true, subscriptionId: true },
  });
  if (org?.planOverride) {
    logger.info('syncSubscription: skipping - plan override active', { orgId });
    return;
  }

  const previousSubscriptionId = org?.subscriptionId;

  // Guard: if the org already has a different subscription and this one is being
  // cancelled/unpaid, skip - it's an old subscription being cleaned up after upgrade/downgrade.
  if (
    org?.subscriptionId &&
    org.subscriptionId !== stripeSubscription.id &&
    ['canceled', 'unpaid'].includes(stripeSubscription.status)
  ) {
    logger.info('syncSubscription: skipping stale subscription event', {
      orgId,
      staleSubId: stripeSubscription.id,
      currentSubId: org.subscriptionId,
      status: stripeSubscription.status,
    });
    return;
  }

  const priceId = stripeSubscription.items?.data?.[0]?.price?.id;
  const plan = await getPlanFromPriceId(priceId);

  if (!plan) {
    logger.warn('syncSubscription: could not resolve plan from price', { priceId });
    return;
  }

  const orgStatus = getOrganizationStatus(stripeSubscription.status);
  const limits = getAllPlanLimits(plan);
  const updateData = buildSubscriptionUpdateData(stripeSubscription, plan, limits);

  await prisma.organization.update({
    where: { id: orgId },
    data: updateData,
  });

  // Invalidate auth cache for all users in the org so they pick up the new status immediately
  await invalidateOrganizationAuthCache(prisma, cache, orgId);

  // Cancel the previous subscription if this is an upgrade/downgrade
  if (previousSubscriptionId && previousSubscriptionId !== stripeSubscription.id) {
    await cancelPreviousSubscription(previousSubscriptionId, stripeSubscription.id);
  }

  logger.info('syncSubscription: updated organization', {
    orgId,
    plan,
    status: orgStatus,
    subscriptionId: stripeSubscription.id,
  });
};

/**
 * Handle subscription deletion - downgrade to FREE
 */
const handleSubscriptionDeleted = async (stripeSubscription) => {
  const orgId = stripeSubscription.metadata?.organizationId;
  if (!orgId) return;

  // Guard: do not downgrade manually granted plans
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { planOverride: true, subscriptionId: true },
  });
  if (org?.planOverride) {
    logger.info('handleSubscriptionDeleted: skipping - plan override active', { orgId });
    return;
  }

  // Guard: if the org already has a different (newer) subscription,
  // this deletion is for an old subscription that was replaced during upgrade/downgrade.
  // Do NOT overwrite the new subscription data.
  if (org?.subscriptionId && org.subscriptionId !== stripeSubscription.id) {
    logger.info('handleSubscriptionDeleted: skipping - org has a newer subscription', {
      orgId,
      deletedSubId: stripeSubscription.id,
      currentSubId: org.subscriptionId,
    });
    return;
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      status: 'PAYMENT_REQUIRED',
      subscriptionId: null,
      subscriptionEndsAt: new Date(),
      // Keep current plan/limits frozen - org retains data but cannot access it
    },
  });

  // Invalidate auth cache for all users in the org
  await invalidateOrganizationAuthCache(prisma, cache, orgId);

  logger.info('handleSubscriptionDeleted: set PAYMENT_REQUIRED', { orgId });
};

/**
 * Handle failed payment - suspend after final retry
 */
const handlePaymentFailed = async (invoice) => {
  if (!invoice.subscription) return;

  const customerId = invoice.customer;

  const org = await prisma.organization.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!org) return;

  // Guard: do not suspend manually granted plans
  if (org.planOverride) {
    logger.info('handlePaymentFailed: skipping - plan override active', { orgId: org.id });
    return;
  }

  // Notify org admin via email (fire-and-forget)
  const admin = await prisma.user.findFirst({
    where: { organizationId: org.id, roles: { some: { role: { key: 'admin' } } } },
    select: { email: true, firstName: true, lastName: true },
  });

  if (invoice.attempt_count >= 3) {
    await prisma.organization.update({
      where: { id: org.id },
      data: { status: 'SUSPENDED' },
    });
    await invalidateOrganizationAuthCache(prisma, cache, org.id);

    logger.warn('handlePaymentFailed: organization suspended after failed payments', {
      orgId: org.id,
      attemptCount: invoice.attempt_count,
    });

    if (admin?.email) {
      sendOrgSuspendedEmail({
        email: admin.email,
        userName: `${admin.firstName} ${admin.lastName}`,
        organizationName: org.name || 'Organizatia ta',
        reason: 'Plata nu a putut fi procesata dupa mai multe incercari.',
      }).catch((err) => logger.error('[EMAIL] Org suspended email failed:', err.message));
    }
  } else {
    // Set PAYMENT_REQUIRED on first/second failure as warning
    await prisma.organization.update({
      where: { id: org.id },
      data: { status: 'PAYMENT_REQUIRED' },
    });
    await invalidateOrganizationAuthCache(prisma, cache, org.id);

    logger.warn('handlePaymentFailed: set PAYMENT_REQUIRED', {
      orgId: org.id,
      attemptCount: invoice.attempt_count,
    });

    if (admin?.email) {
      sendPaymentRequiredEmail({
        email: admin.email,
        userName: `${admin.firstName} ${admin.lastName}`,
        organizationName: org.name || 'Organizatia ta',
      }).catch((err) => logger.error('[EMAIL] Payment required email failed:', err.message));
    }
  }
};

/**
 * Process refund for annual plans within the 3-day refund window
 */
const processRefund = async (organizationId) => {
  const stripe = await getStripe();
  if (!stripe) throw new AppError('Facturarea nu este configurata', 503);

  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) throw new AppError('Organizatia nu a fost gasita', 404);

  if (!org.subscriptionStartedAt || org.billingInterval !== 'year') {
    throw new AppError('Rambursarea este disponibila doar pentru planurile anuale', 400);
  }

  const daysSinceStart =
    (Date.now() - new Date(org.subscriptionStartedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceStart > 3) {
    throw new AppError('Perioada de rambursare (3 zile) a expirat', 400);
  }

  // Get latest invoice and refund via Stripe
  const invoices = await stripe.invoices.list({ subscription: org.subscriptionId, limit: 1 });
  if (!invoices.data.length || !invoices.data[0].payment_intent) {
    throw new AppError('Nu s-a gasit o factura pentru rambursare', 400);
  }

  const refund = await stripe.refunds.create({
    payment_intent: invoices.data[0].payment_intent,
  });

  // Cancel subscription after refund
  await stripe.subscriptions.cancel(org.subscriptionId);

  logger.info('processRefund: refund processed and subscription cancelled', {
    orgId: organizationId,
    refundId: refund.id,
  });

  return refund;
};

module.exports = {
  getOrCreateStripeCustomer,
  createCheckoutSession,
  createPortalSession,
  getBillingStatus,
  syncSubscription,
  cancelPreviousSubscription,
  handleSubscriptionDeleted,
  handlePaymentFailed,
  processRefund,
};

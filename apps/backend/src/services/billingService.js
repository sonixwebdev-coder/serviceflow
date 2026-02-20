const { getStripe } = require('../utils/stripe');
const prisma = require('../../lib/prisma');
const { AppError } = require('../utils/errors');
const { getStripePriceId, getPlanFromPriceId } = require('../utils/stripePrices');
const { getSettings } = require('./platformSettingsService');
const { getAllPlanLimits } = require('../utils/planLimits');
const logger = require('../utils/logger');

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
 * Create a Stripe Checkout session for subscribing to a plan
 */
const createCheckoutSession = async (org, plan, interval = 'monthly') => {
  const stripe = await getStripe();
  if (!stripe) throw new AppError('Billing is not configured', 503);

  const priceId = await getStripePriceId(plan, interval);
  if (!priceId) {
    throw new AppError(`No Stripe price configured for plan ${plan} (${interval})`, 400);
  }

  const customerId = await getOrCreateStripeCustomer(org);

  const hadSubscription = Boolean(org.subscriptionId);

  const settings = await getSettings();
  const trialDays = settings?.trialDays || 14;

  const sessionParams = {
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${FRONTEND_URL}/settings/billing?billing=success`,
    cancel_url: `${FRONTEND_URL}/pricing`,
    metadata: {
      organizationId: org.id,
      plan,
      interval,
    },
  };

  if (!hadSubscription) {
    sessionParams.subscription_data = {
      trial_period_days: trialDays,
      metadata: { organizationId: org.id },
    };
  } else {
    sessionParams.subscription_data = {
      metadata: { organizationId: org.id },
    };
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  return session.url;
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

  const result = {
    plan: org.plan,
    status: org.status,
    trialEndsAt: org.trialEndsAt,
    subscriptionId: org.subscriptionId,
    subscriptionEndsAt: org.subscriptionEndsAt,
    hasStripeCustomer: Boolean(org.stripeCustomerId),
    nextInvoice: null,
  };

  if (stripe && org.stripeCustomerId && org.subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(org.subscriptionId);
      result.stripeStatus = subscription.status;
      result.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
      result.cancelAtPeriodEnd = subscription.cancel_at_period_end;

      if (subscription.status === 'trialing') {
        result.trialEnd = new Date(subscription.trial_end * 1000);
      }

      try {
        const upcoming = await stripe.invoices.retrieveUpcoming({
          customer: org.stripeCustomerId,
        });
        result.nextInvoice = {
          amount: upcoming.amount_due / 100,
          currency: upcoming.currency,
          date: new Date(upcoming.next_payment_attempt * 1000),
        };
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

  const toMax = (v) => (v === Infinity ? -1 : v);

  result.usage = {
    users: { current: userCount, max: toMax(limits.maxUsers) },
    clients: { current: clientCount, max: toMax(limits.maxClients) },
    appointments: { current: appointmentCount, max: toMax(limits.maxAppointments) },
  };

  result.planLimits = {
    ...limits,
    maxLocations: toMax(limits.maxLocations),
    maxUsers: toMax(limits.maxUsers),
    maxClients: toMax(limits.maxClients),
    maxAppointments: toMax(limits.maxAppointments),
    maxWebsitePages: toMax(limits.maxWebsitePages),
  };

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

  const priceId = stripeSubscription.items?.data?.[0]?.price?.id;
  const plan = await getPlanFromPriceId(priceId);

  if (!plan) {
    logger.warn('syncSubscription: could not resolve plan from price', { priceId });
    return;
  }

  let orgStatus;
  switch (stripeSubscription.status) {
    case 'trialing':
      orgStatus = 'TRIAL';
      break;
    case 'active':
      orgStatus = 'ACTIVE';
      break;
    case 'past_due':
      orgStatus = 'ACTIVE';
      break;
    case 'canceled':
    case 'unpaid':
      orgStatus = 'CANCELLED';
      break;
    default:
      orgStatus = 'ACTIVE';
  }

  const limits = getAllPlanLimits(plan);

  const updateData = {
    plan,
    status: orgStatus,
    subscriptionId: stripeSubscription.id,
    subscriptionEndsAt: stripeSubscription.current_period_end
      ? new Date(stripeSubscription.current_period_end * 1000)
      : null,
    maxUsers: limits.maxUsers === Infinity ? 999999 : limits.maxUsers,
    maxClients: limits.maxClients === Infinity ? 999999 : limits.maxClients,
    maxAppointments: limits.maxAppointments === Infinity ? 999999 : limits.maxAppointments,
  };

  if (stripeSubscription.trial_end) {
    updateData.trialEndsAt = new Date(stripeSubscription.trial_end * 1000);
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: updateData,
  });

  logger.info('syncSubscription: updated organization', {
    orgId,
    plan,
    status: orgStatus,
    subscriptionId: stripeSubscription.id,
  });
};

/**
 * Handle subscription deletion — downgrade to FREE
 */
const handleSubscriptionDeleted = async (stripeSubscription) => {
  const orgId = stripeSubscription.metadata?.organizationId;
  if (!orgId) return;

  const freeLimits = getAllPlanLimits('FREE');

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      plan: 'FREE',
      status: 'ACTIVE',
      subscriptionId: null,
      subscriptionEndsAt: null,
      maxUsers: freeLimits.maxUsers,
      maxClients: freeLimits.maxClients,
      maxAppointments: freeLimits.maxAppointments,
    },
  });

  logger.info('handleSubscriptionDeleted: downgraded to FREE', { orgId });
};

/**
 * Handle failed payment — suspend after final retry
 */
const handlePaymentFailed = async (invoice) => {
  if (!invoice.subscription) return;

  const customerId = invoice.customer;

  const org = await prisma.organization.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!org) return;

  if (invoice.attempt_count >= 3) {
    await prisma.organization.update({
      where: { id: org.id },
      data: { status: 'SUSPENDED' },
    });

    logger.warn('handlePaymentFailed: organization suspended after failed payments', {
      orgId: org.id,
      attemptCount: invoice.attempt_count,
    });
  }
};

module.exports = {
  getOrCreateStripeCustomer,
  createCheckoutSession,
  createPortalSession,
  getBillingStatus,
  syncSubscription,
  handleSubscriptionDeleted,
  handlePaymentFailed,
};

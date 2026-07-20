const express = require('express');
const { getStripe } = require('../utils/stripe');
const { getSettings } = require('../services/platformSettingsService');
const logger = require('../utils/logger');
const billingService = require('../services/billingService');
const prisma = require('../../lib/prisma');
const { getRedisClient, isAvailable: isRedisAvailable } = require('../lib/redis');

// Idempotency: skip events already processed (24h TTL)
const WEBHOOK_IDEMPOTENCY_TTL = 86400;

async function isEventProcessed(eventId) {
  if (!isRedisAvailable()) return false;
  try {
    const redis = getRedisClient();
    const key = `webhook:stripe:${eventId}`;
    // SETNX returns 1 if key was set (new event), 0 if already exists (duplicate)
    const result = await redis.set(key, '1', 'EX', WEBHOOK_IDEMPOTENCY_TTL, 'NX');
    return result === null; // null means key already existed = already processed
  } catch {
    return false; // On error, allow processing
  }
}
const {
  sendTrialEndingEmail,
  sendSubscriptionActivatedEmail,
  sendSubscriptionCancelledEmail,
  sendSubscriptionRenewedEmail,
} = require('../services/email/emailService');
const { getPlanFromPriceId } = require('../utils/stripePrices');
const addonService = require('../services/addonService');

const router = express.Router();

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = await getStripe();
  if (!stripe) {
    return res.status(503).json({ error: 'Billing not configured' });
  }

  const sig = req.headers['stripe-signature'];
  const settings = await getSettings();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || settings?.stripeWebhookSecret;

  if (!webhookSecret) {
    logger.warn('Stripe webhook secret not configured, webhook ignored');
    return res.status(400).json({ error: 'Webhook secret not configured' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    logger.warn('Stripe webhook signature verification failed', { error: err.message });
    return res.status(400).json({ error: 'Invalid signature' });
  }

  res.status(200).json({ received: true });

  // Idempotency check: skip duplicate events
  if (await isEventProcessed(event.id)) {
    logger.info('Stripe webhook duplicate skipped', { eventId: event.id, type: event.type });
    return;
  }

  try {
    await handleWebhookEvent(event, stripe);
  } catch (err) {
    logger.error('Error processing Stripe webhook', {
      eventType: event.type,
      eventId: event.id,
      error: err.message,
      stack: err.stack,
    });
  }
});

/**
 * Get org admin email info for subscription notifications
 */
async function getOrgAdminForEmail(orgId) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, plan: true, trialEndsAt: true, planOverride: true },
  });
  if (!org) return null;

  const admin = await prisma.user.findFirst({
    where: { organizationId: orgId, roles: { some: { role: { key: 'admin' } } } },
    select: { email: true, firstName: true, lastName: true },
  });
  if (!admin?.email) return null;

  return { org, admin, userName: `${admin.firstName} ${admin.lastName}`.trim() };
}

async function handleWebhookEvent(event, stripe) {
  const { type, data } = event;

  switch (type) {
    case 'checkout.session.completed': {
      const session = data.object;

      // Handle add-on pack purchase
      if (session.metadata?.addonType) {
        if (session.metadata.organizationId && session.customer) {
          await prisma.organization.update({
            where: { id: session.metadata.organizationId },
            data: { stripeCustomerId: session.customer },
          });
        }
        await addonService.handleAddonPayment(session);
        logger.info('Webhook: checkout.session.completed (addon)', {
          sessionId: session.id,
          addonType: session.metadata.addonType,
          orgId: session.metadata.organizationId,
        });
        break;
      }

      // Handle subscription checkout
      if (session.metadata?.organizationId && session.customer) {
        await prisma.organization.update({
          where: { id: session.metadata.organizationId },
          data: { stripeCustomerId: session.customer },
        });
      }
      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        await billingService.syncSubscription(subscription);

        // Store subscription start date (only on initial subscription, not upgrades) and billing interval
        if (session.metadata?.organizationId) {
          const existingOrg = await prisma.organization.findUnique({
            where: { id: session.metadata.organizationId },
            select: { subscriptionStartedAt: true },
          });
          const updateData = {};
          if (!existingOrg?.subscriptionStartedAt) {
            updateData.subscriptionStartedAt = new Date();
          }
          const interval = subscription.items?.data?.[0]?.price?.recurring?.interval;
          if (interval) updateData.billingInterval = interval;
          await prisma.organization.update({
            where: { id: session.metadata.organizationId },
            data: updateData,
          });
        }
      }
      logger.info('Webhook: checkout.session.completed', {
        sessionId: session.id,
        orgId: session.metadata?.organizationId,
      });
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = data.object;
      await billingService.syncSubscription(subscription);
      logger.info(`Webhook: ${type}`, {
        subscriptionId: subscription.id,
        status: subscription.status,
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = data.object;
      const delOrgId = subscription.metadata?.organizationId;

      // Send cancellation email before downgrading (fire-and-forget)
      if (delOrgId) {
        const info = await getOrgAdminForEmail(delOrgId);
        if (info && !info.org.planOverride) {
          sendSubscriptionCancelledEmail({
            email: info.admin.email,
            userName: info.userName,
            organizationName: info.org.name,
          }).catch((err) =>
            logger.error('[EMAIL] Subscription cancelled email failed:', err.message)
          );
        }
      }

      await billingService.handleSubscriptionDeleted(subscription);
      logger.info('Webhook: customer.subscription.deleted', {
        subscriptionId: subscription.id,
      });
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = data.object;
      if (invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const orgId = subscription.metadata?.organizationId;
        if (orgId) {
          await prisma.organization.update({
            where: { id: orgId },
            data: {
              subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
            },
          });

          // Send subscription email (fire-and-forget)
          const info = await getOrgAdminForEmail(orgId);
          if (info && !info.org.planOverride) {
            const priceId = subscription.items?.data?.[0]?.price?.id;
            const plan = await getPlanFromPriceId(priceId);
            const amount = invoice.amount_paid
              ? `${(invoice.amount_paid / 100).toFixed(2)} ${(invoice.currency || 'RON').toUpperCase()}`
              : 'N/A';
            const nextBillingDate = subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toLocaleDateString('ro-RO')
              : 'N/A';

            // First payment = activated, subsequent = renewed
            const isFirstPayment = invoice.billing_reason === 'subscription_create';
            const emailFn = isFirstPayment
              ? sendSubscriptionActivatedEmail
              : sendSubscriptionRenewedEmail;

            emailFn({
              email: info.admin.email,
              userName: info.userName,
              organizationName: info.org.name,
              plan: plan || info.org.plan,
              amount,
              nextBillingDate,
            }).catch((err) =>
              logger.error('[EMAIL] Subscription payment email failed:', err.message)
            );
          }
        }
      }
      logger.info('Webhook: invoice.payment_succeeded', {
        invoiceId: invoice.id,
        amount: invoice.amount_paid,
      });
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = data.object;
      await billingService.handlePaymentFailed(invoice);
      logger.info('Webhook: invoice.payment_failed', {
        invoiceId: invoice.id,
        attemptCount: invoice.attempt_count,
      });
      break;
    }

    case 'customer.subscription.trial_will_end': {
      const subscription = data.object;
      const trialOrgId = subscription.metadata?.organizationId;
      if (trialOrgId) {
        const info = await getOrgAdminForEmail(trialOrgId);
        if (info && !info.org.planOverride) {
          const trialEnd = subscription.trial_end
            ? new Date(subscription.trial_end * 1000)
            : info.org.trialEndsAt;
          const daysLeft = trialEnd
            ? Math.max(0, Math.ceil((trialEnd - new Date()) / (1000 * 60 * 60 * 24)))
            : 3;

          sendTrialEndingEmail({
            email: info.admin.email,
            userName: info.userName,
            organizationName: info.org.name,
            plan: info.org.plan,
            daysLeft,
            trialEndDate: trialEnd ? trialEnd.toLocaleDateString('ro-RO') : 'N/A',
          }).catch((err) => logger.error('[EMAIL] Trial ending email failed:', err.message));
        }
        logger.info('Webhook: trial_will_end, notification sent', { orgId: trialOrgId });
      }
      break;
    }

    default:
      break;
  }
}

module.exports = router;

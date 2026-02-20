const express = require('express');
const { getStripe } = require('../utils/stripe');
const { getSettings } = require('../services/platformSettingsService');
const logger = require('../utils/logger');
const billingService = require('../services/billingService');
const prisma = require('../../lib/prisma');

const router = express.Router();

router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const stripe = await getStripe();
    if (!stripe) {
      return res.status(503).json({ error: 'Billing not configured' });
    }

    const sig = req.headers['stripe-signature'];
    const settings = await getSettings();
    const webhookSecret = settings?.stripeWebhookSecret;

    if (!webhookSecret) {
      logger.warn('Stripe webhook secret not configured — webhook ignored');
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
  }
);

async function handleWebhookEvent(event, stripe) {
  const { type, data } = event;

  switch (type) {
    case 'checkout.session.completed': {
      const session = data.object;
      if (session.metadata?.organizationId && session.customer) {
        await prisma.organization.update({
          where: { id: session.metadata.organizationId },
          data: { stripeCustomerId: session.customer },
        });
      }
      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        await billingService.syncSubscription(subscription);
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
      const orgId = subscription.metadata?.organizationId;
      if (orgId) {
        logger.info('Webhook: trial_will_end — notification should be sent', { orgId });
      }
      break;
    }

    default:
      break;
  }
}

module.exports = router;

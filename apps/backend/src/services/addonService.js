const prisma = require('../../lib/prisma');
const { getStripe } = require('../utils/stripe');
const { getAddonPack, getAvailableAddons: getAvailableAddonsList } = require('../utils/addonPacks');
const { getSettings } = require('./platformSettingsService');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Create a Stripe Checkout session for an add-on purchase
 */
const createAddonCheckout = async (organization, addonType) => {
  const settings = await getSettings();
  const pack = getAddonPack(addonType, settings);
  if (!pack) {
    throw new AppError('Tipul de pachet suplimentar este invalid', 400);
  }

  const stripe = await getStripe();
  if (!stripe) {
    throw new AppError('Sistemul de plata nu este configurat', 503);
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  // Use Stripe Price ID if configured, otherwise fall back to inline price_data
  const lineItem = pack.stripePriceId
    ? { price: pack.stripePriceId, quantity: 1 }
    : {
        price_data: {
          currency: 'ron',
          unit_amount: pack.price,
          product_data: {
            name: pack.label,
            description: pack.permanent
              ? 'Pachet permanent — creste limita contului'
              : 'Pachet valabil luna curenta',
          },
        },
        quantity: 1,
      };

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: organization.stripeCustomerId || undefined,
    line_items: [lineItem],
    metadata: {
      addonType,
      organizationId: organization.id,
    },
    success_url: `${frontendUrl}/settings/billing?status=addon_success`,
    cancel_url: `${frontendUrl}/settings/billing?status=cancelled`,
  });

  // Store stripeCustomerId if this is the first purchase and customer was created
  if (!organization.stripeCustomerId && session.customer) {
    await prisma.organization.update({
      where: { id: organization.id },
      data: { stripeCustomerId: session.customer },
    });
  }

  return session.url;
};

/**
 * Handle successful add-on payment from webhook
 */
const handleAddonPayment = async (session) => {
  const { addonType, organizationId } = session.metadata;

  const settings = await getSettings();
  const pack = getAddonPack(addonType, settings);
  if (!pack) {
    logger.error('[ADDON] Unknown addon type in webhook', { addonType });
    return;
  }

  // Calculate expiry: end of current month for appointments, null for clients
  let expiresAt = null;
  if (!pack.permanent) {
    const now = new Date();
    expiresAt = new Date(now.getFullYear(), now.getMonth() + 1, 1); // 1st of next month
  }

  await prisma.quotaAddon.create({
    data: {
      organizationId,
      type: addonType,
      resource: pack.resource,
      amount: pack.amount,
      expiresAt,
      stripePaymentId: session.payment_intent || session.id,
    },
  });

  logger.info('[ADDON] Add-on pack activated', {
    organizationId,
    addonType,
    amount: pack.amount,
    resource: pack.resource,
    expiresAt,
  });
};

/**
 * Get active add-ons for an organization
 */
const getActiveAddons = async (organizationId) => {
  const now = new Date();
  return prisma.quotaAddon.findMany({
    where: {
      organizationId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { purchasedAt: 'desc' },
  });
};

/**
 * Get available addons with current prices from settings
 */
const getAvailableAddons = async () => {
  const settings = await getSettings();
  return getAvailableAddonsList(settings);
};

module.exports = {
  createAddonCheckout,
  handleAddonPayment,
  getActiveAddons,
  getAvailableAddons,
};

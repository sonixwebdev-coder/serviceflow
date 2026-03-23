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
    success_url: `${frontendUrl}/settings/billing?session_id={CHECKOUT_SESSION_ID}&status=addon_success`,
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

  const paymentId = session.payment_intent || session.id;

  // Idempotency: skip if addon was already created (e.g. by verify-addon endpoint)
  const existing = await prisma.quotaAddon.findFirst({
    where: { stripePaymentId: paymentId },
  });
  if (existing) {
    logger.info('[ADDON] Addon already exists for payment, skipping', { paymentId, addonType });
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
      stripePaymentId: paymentId,
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
 * Verify a completed addon checkout session and activate the addon.
 * Safety net for when the webhook is delayed or fails.
 */
const verifyAddonCheckout = async (sessionId, organizationId) => {
  const stripe = await getStripe();
  if (!stripe) {
    throw new AppError('Sistemul de plata nu este configurat', 503);
  }

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (err) {
    logger.warn('[ADDON] verify: failed to retrieve session', { sessionId, error: err.message });
    throw new AppError('Sesiunea de plata este invalida', 400);
  }

  // Verify this is an addon payment session belonging to this org
  if (session.mode !== 'payment' || !session.metadata?.addonType) {
    throw new AppError('Aceasta sesiune nu este o achizitie de pachet suplimentar', 400);
  }

  if (session.metadata.organizationId !== organizationId) {
    throw new AppError('Sesiunea nu apartine acestei organizatii', 403);
  }

  if (session.payment_status !== 'paid') {
    throw new AppError('Plata nu a fost finalizata', 400);
  }

  // Check if addon was already created (by webhook or previous verify call)
  const paymentId = session.payment_intent || session.id;
  const existing = await prisma.quotaAddon.findFirst({
    where: { stripePaymentId: paymentId },
  });

  if (existing) {
    logger.debug('[ADDON] verify: addon already exists', { sessionId, paymentId });
    return existing;
  }

  // Store stripeCustomerId if needed
  if (session.customer) {
    await prisma.organization.update({
      where: { id: organizationId },
      data: { stripeCustomerId: session.customer },
    });
  }

  // Create the addon (same logic as handleAddonPayment)
  const settings = await getSettings();
  const pack = getAddonPack(session.metadata.addonType, settings);
  if (!pack) {
    throw new AppError('Tipul de pachet suplimentar este invalid', 400);
  }

  let expiresAt = null;
  if (!pack.permanent) {
    const now = new Date();
    expiresAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  const addon = await prisma.quotaAddon.create({
    data: {
      organizationId,
      type: session.metadata.addonType,
      resource: pack.resource,
      amount: pack.amount,
      expiresAt,
      stripePaymentId: paymentId,
    },
  });

  logger.info('[ADDON] verify: add-on pack activated via verify', {
    organizationId,
    addonType: session.metadata.addonType,
    amount: pack.amount,
  });

  return addon;
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
  verifyAddonCheckout,
  getActiveAddons,
  getAvailableAddons,
};

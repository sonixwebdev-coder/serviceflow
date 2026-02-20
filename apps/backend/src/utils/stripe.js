const Stripe = require('stripe');
const { getSettings } = require('../services/platformSettingsService');

let cachedStripe = null;
let cachedKey = null;

/**
 * Returns a Stripe instance using the secret key from PlatformSettings.
 * Caches the instance and recreates it only if the key changes.
 * Returns null if no key is configured.
 */
const getStripe = async () => {
  const settings = await getSettings();
  const key = settings?.stripeSecretKey;

  if (!key) return null;

  if (cachedStripe && cachedKey === key) {
    return cachedStripe;
  }

  cachedStripe = new Stripe(key, { apiVersion: '2024-12-18.acacia' });
  cachedKey = key;
  return cachedStripe;
};

const invalidateStripe = () => {
  cachedStripe = null;
  cachedKey = null;
};

module.exports = { getStripe, invalidateStripe };

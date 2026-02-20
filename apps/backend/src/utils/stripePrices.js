const { getSettings } = require('../services/platformSettingsService');

/**
 * Resolve which Stripe Price ID to use for a given plan + interval.
 * Reads from PlatformSettings in DB.
 */
async function getStripePriceId(plan, interval = 'monthly') {
  const settings = await getSettings();
  if (!settings) return null;

  const key = `price${plan.charAt(0) + plan.slice(1).toLowerCase()}${interval.charAt(0).toUpperCase() + interval.slice(1)}`;
  return settings[key] || null;
}

/**
 * Given a Stripe Price ID, return the matching plan name.
 */
async function getPlanFromPriceId(priceId) {
  if (!priceId) return null;

  const settings = await getSettings();
  if (!settings) return null;

  const mapping = {
    STARTER: [settings.priceStarterMonthly, settings.priceStarterAnnual],
    PROFESSIONAL: [settings.priceProfessionalMonthly, settings.priceProfessionalAnnual],
    ENTERPRISE: [settings.priceEnterpriseMonthly, settings.priceEnterpriseAnnual],
  };

  for (const [plan, prices] of Object.entries(mapping)) {
    if (prices.includes(priceId)) return plan;
  }

  return null;
}

module.exports = {
  getStripePriceId,
  getPlanFromPriceId,
};

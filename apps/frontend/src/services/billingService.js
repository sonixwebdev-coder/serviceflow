import API from '../utils/api';

/**
 * Create a Stripe Checkout session and redirect to the hosted payment page.
 * @param {string} plan  - STARTER | PROFESSIONAL | ENTERPRISE
 * @param {'monthly'|'annual'} interval
 */
export const createCheckoutSession = async (plan, interval = 'monthly') => {
  const response = await API.post('/billing/checkout', { plan, interval });
  const url = response.data?.data?.url || response.data?.url;
  if (url) {
    window.location.href = url;
  }
  return url;
};

/**
 * Create a Stripe Customer Portal session and redirect to it.
 */
export const createPortalSession = async () => {
  const response = await API.post('/billing/portal');
  const url = response.data?.data?.url || response.data?.url;
  if (url) {
    window.location.href = url;
  }
  return url;
};

/**
 * Get current billing status (plan, usage, next invoice, etc.)
 */
export const getBillingStatus = async () => {
  const response = await API.get('/billing/status');
  return response.data?.data || response.data;
};

/**
 * Get current quota usage for all resources
 */
export const getQuotaUsage = async () => {
  const response = await API.get('/billing/quota');
  return response.data?.data || response.data;
};

/**
 * Get available add-on packs
 */
export const getAvailableAddons = async () => {
  const response = await API.get('/billing/addons');
  return response.data?.data || response.data;
};

/**
 * Get organization's active add-ons
 */
export const getActiveAddons = async () => {
  const response = await API.get('/billing/addons/active');
  return response.data?.data || response.data;
};

/**
 * Verify a completed Stripe Checkout session and sync the subscription.
 * @param {string} sessionId - Stripe Checkout session ID from redirect URL
 */
export const verifyCheckout = async (sessionId) => {
  const response = await API.post('/billing/verify-checkout', { sessionId });
  return response.data?.data || response.data;
};

/**
 * Purchase an add-on pack — creates checkout and redirects
 */
export const purchaseAddon = async (addonType) => {
  const response = await API.post('/billing/addons/checkout', { addonType });
  const url = response.data?.data?.url || response.data?.url;
  if (url) {
    window.location.href = url;
  }
  return url;
};

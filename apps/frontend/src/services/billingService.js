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

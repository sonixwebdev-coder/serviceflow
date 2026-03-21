import API from '../utils/api';

export const signupOrganization = async (payload) => {
  const response = await API.post('/organizations/signup', payload);
  return response.data?.data || response.data;
};

export const fetchCurrentOrganization = async () => {
  const response = await API.get('/organizations/me');
  return response.data?.data || response.data;
};

export const fetchOrganizationStats = async () => {
  const response = await API.get('/organizations/me/stats');
  return response.data?.data || response.data;
};

export const updateOrganization = async (payload) => {
  const response = await API.patch('/organizations/me', payload);
  return response.data?.data || response.data;
};

export const checkSlugAvailability = async (slug) => {
  const response = await API.get(`/organizations/check-slug/${slug}`);
  return response.data?.data || response.data;
};

export const validateVatPublic = async (vatNumber) => {
  const response = await API.post('/organizations/validate-vat', { vatNumber });
  return response.data?.data || response.data;
};

export const fetchServices = async () => {
  const response = await API.get('/organizations/me/settings/services');
  return response.data?.data || response.data;
};

export const updateServices = async (services) => {
  const response = await API.put('/organizations/me/settings/services', { services });
  return response.data?.data || response.data;
};

/**
 * Fetch public display pricing (no auth required).
 * Returns { starter?: { monthly?, annual? }, professional?: {...}, enterprise?: {...} }
 * Only includes non-null values configured by the super admin.
 * Cached in-memory so multiple components share one request.
 */
let pricingPromise = null;
export const fetchPricing = () => {
  if (!pricingPromise) {
    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
    pricingPromise = fetch(`${baseUrl}/pricing`, { method: 'GET' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch pricing');
        return res.json();
      })
      .then((json) => json.data || json)
      .catch((err) => {
        pricingPromise = null; // allow retry on error
        throw err;
      });
  }
  return pricingPromise;
};

export default {
  signupOrganization,
  fetchCurrentOrganization,
  fetchOrganizationStats,
  updateOrganization,
  checkSlugAvailability,
  fetchServices,
  updateServices,
  fetchPricing,
};

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

export default {
  signupOrganization,
  fetchCurrentOrganization,
  fetchOrganizationStats,
  updateOrganization,
  checkSlugAvailability,
};

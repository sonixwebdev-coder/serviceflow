import API from '../utils/api';

export const fetchCompanySettings = async () => {
  const response = await API.get('/settings/company');
  return response.data?.data || response.data;
};

export const updateCompanySettings = async (payload) => {
  const response = await API.put('/settings/company', payload);
  return response.data?.data || response.data;
};

export const validateVatNumber = async (vatNumber) => {
  const response = await API.post('/settings/validate-vat', { vatNumber });
  return response.data?.data || response.data;
};

export default {
  fetchCompanySettings,
  updateCompanySettings,
  validateVatNumber,
};

import api from '../utils/api';

export const getLoyaltyProgram = async () => {
  const response = await api.get('/loyalty/program');
  return response.data?.data ?? response.data;
};

export const updateLoyaltyProgram = async (config) => {
  const response = await api.put('/loyalty/program', config);
  return response.data;
};

export const getLoyaltyAccounts = async (params = {}) => {
  const response = await api.get('/loyalty/accounts', { params });
  return response.data;
};

export const getClientLoyaltyAccount = async (clientId) => {
  const response = await api.get(`/loyalty/accounts/${clientId}`);
  return response.data?.data ?? response.data;
};

export const adjustPoints = async (clientId, data) => {
  const response = await api.post(`/loyalty/accounts/${clientId}/adjust`, data);
  return response.data;
};

export const getLoyaltyTransactions = async (params = {}) => {
  const response = await api.get('/loyalty/transactions', { params });
  return response.data;
};

export const getLoyaltyAnalytics = async (params = {}) => {
  const response = await api.get('/loyalty/analytics', { params });
  return response.data;
};

export const lookupByQR = async (code) => {
  const response = await api.get(`/loyalty/lookup/${encodeURIComponent(code)}`);
  return response.data;
};

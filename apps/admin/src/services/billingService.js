import api from '@/utils/api';

const BASE = '/api/super-admin/billing';

export const getBillingOverview = async () => {
  const { data } = await api.get(`${BASE}/overview`);
  return data.data;
};

export const getBillingStats = async () => {
  const { data } = await api.get(`${BASE}/stats`);
  return data.data;
};

export const getSubscriptions = async (params) => {
  const { data } = await api.get(`${BASE}/subscriptions`, { params });
  return data.data;
};

export const changePlan = async ({ orgId, plan }) => {
  const { data } = await api.post(`${BASE}/organizations/${orgId}/change-plan`, { plan });
  return data.data;
};

export const extendTrial = async ({ orgId, days }) => {
  const { data } = await api.put(`${BASE}/organizations/${orgId}/extend-trial`, { days });
  return data.data;
};

export const overridePlan = async ({ orgId, plan, reason }) => {
  const { data } = await api.put(`${BASE}/organizations/${orgId}/override-plan`, { plan, reason });
  return data.data;
};

export const processRefund = async ({ orgId }) => {
  const { data } = await api.post(`${BASE}/organizations/${orgId}/refund`);
  return data.data;
};

export const cancelSubscription = async ({ orgId }) => {
  const { data } = await api.post(`${BASE}/organizations/${orgId}/cancel-subscription`);
  return data.data;
};

export const reactivateOrg = async ({ orgId, days }) => {
  const { data } = await api.post(`${BASE}/organizations/${orgId}/reactivate`, { days });
  return data.data;
};

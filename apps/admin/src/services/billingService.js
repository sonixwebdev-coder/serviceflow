import api from '@/utils/api';

const BASE = '/api/super-admin/billing';

export const getBillingOverview = async () => {
  const { data } = await api.get(`${BASE}/overview`);
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

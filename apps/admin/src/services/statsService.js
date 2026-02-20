import api from '@/utils/api';

const BASE = '/api/super-admin/stats';

export const getOverview = async () => {
  const { data } = await api.get(`${BASE}/overview`);
  return data.data;
};

export const getGrowth = async () => {
  const { data } = await api.get(`${BASE}/growth`);
  return data.data;
};

export const getPlans = async () => {
  const { data } = await api.get(`${BASE}/plans`);
  return data.data;
};

export const getSectors = async () => {
  const { data } = await api.get(`${BASE}/sectors`);
  return data.data;
};

export const getActivity = async () => {
  const { data } = await api.get(`${BASE}/activity`);
  return data.data;
};

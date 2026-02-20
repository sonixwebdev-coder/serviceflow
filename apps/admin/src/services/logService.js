import api from '@/utils/api';

const BASE = '/api/super-admin/logs';

export const getLogs = async (params = {}) => {
  const { data } = await api.get(BASE, { params });
  return data.data;
};

export const getLogStats = async () => {
  const { data } = await api.get(`${BASE}/stats`);
  return data.data;
};

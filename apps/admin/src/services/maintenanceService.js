import api from '@/utils/api';

const BASE = '/api/super-admin/maintenance';

export const getMaintenanceStats = async () => {
  const { data } = await api.get(`${BASE}/stats`);
  return data.data;
};

export const runCleanup = async (body) => {
  const { data } = await api.post(`${BASE}/cleanup`, body);
  return data.data;
};

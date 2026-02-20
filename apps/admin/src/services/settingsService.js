import api from '@/utils/api';

const BASE = '/api/super-admin/settings';

export const getSettings = async () => {
  const { data } = await api.get(BASE);
  return data.data;
};

export const updateSettings = async (payload) => {
  const { data } = await api.patch(BASE, payload);
  return data.data;
};

import api from '@/utils/api';

const BASE = '/api/super-admin/contact-messages';

export const getMessages = async (params) => {
  const { data } = await api.get(BASE, { params });
  return data.data;
};

export const getStats = async () => {
  const { data } = await api.get(`${BASE}/stats`);
  return data.data;
};

export const updateMessage = async ({ id, ...payload }) => {
  const { data } = await api.patch(`${BASE}/${id}`, payload);
  return data.data;
};

export const deleteMessage = async (id) => {
  const { data } = await api.delete(`${BASE}/${id}`);
  return data.data;
};

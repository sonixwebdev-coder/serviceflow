import api from '@/utils/api';

const BASE = '/api/super-admin/tickets';

export const getTickets = async (params) => {
  const { data } = await api.get(BASE, { params });
  return data.data;
};

export const getTicketStats = async () => {
  const { data } = await api.get(`${BASE}/stats`);
  return data.data;
};

export const getTicket = async (id) => {
  const { data } = await api.get(`${BASE}/${id}`);
  return data.data;
};

export const updateTicket = async ({ id, ...payload }) => {
  const { data } = await api.patch(`${BASE}/${id}`, payload);
  return data.data;
};

export const sendMessage = async ({ ticketId, content }) => {
  const { data } = await api.post(`${BASE}/${ticketId}/messages`, { content });
  return data.data;
};

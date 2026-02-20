import API from '../utils/api';

export const getTickets = async (params) => {
  const { data } = await API.get('/support/tickets', { params });
  return data.data;
};

export const getTicket = async (id) => {
  const { data } = await API.get(`/support/tickets/${id}`);
  return data.data;
};

export const createTicket = async (payload) => {
  const { data } = await API.post('/support/tickets', payload);
  return data.data;
};

export const sendMessage = async ({ ticketId, content }) => {
  const { data } = await API.post(`/support/tickets/${ticketId}/messages`, { content });
  return data.data;
};

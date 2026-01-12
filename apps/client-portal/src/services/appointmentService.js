import api from '../utils/api';

export const appointmentService = {
  async getAppointments({ status, from, to, page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    params.append('page', page);
    params.append('limit', limit);

    const response = await api.get(`/portal/appointments?${params.toString()}`);
    return response.data;
  },

  async getAppointment(id) {
    const response = await api.get(`/portal/appointments/${id}`);
    return response.data;
  },

  async getUpcomingAppointments() {
    const response = await api.get('/portal/appointments/list/upcoming');
    return response.data;
  },
};

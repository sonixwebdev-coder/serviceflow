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

  async createAppointment(data) {
    const response = await api.post('/portal/appointments', data);
    return response.data;
  },

  async checkAvailability(scheduledStart, scheduledEnd) {
    const params = new URLSearchParams();
    params.append('scheduledStart', scheduledStart);
    params.append('scheduledEnd', scheduledEnd);
    const response = await api.get(`/portal/appointments/check-availability?${params.toString()}`);
    return response.data;
  },

  async getLocations() {
    const response = await api.get('/portal/appointments/locations');
    return response.data;
  },

  async getAvailableDates(days = 30) {
    const response = await api.get(`/portal/appointments/available-dates?days=${days}`);
    return response.data;
  },

  async getAvailableSlots(date, duration = 60, locationId = null) {
    const params = new URLSearchParams();
    params.append('date', date);
    params.append('duration', duration);
    if (locationId) params.append('locationId', locationId);
    const response = await api.get(`/portal/appointments/available-slots?${params.toString()}`);
    return response.data;
  },
};

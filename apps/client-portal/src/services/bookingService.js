import api from '../utils/api';

export const bookingService = {
  async getOrganization(slug) {
    const response = await api.get(`/portal/public/${slug}`);
    return response.data;
  },

  async getAvailableDates(slug, days = 30) {
    const response = await api.get(`/portal/public/${slug}/dates`, {
      params: { days },
    });
    return response.data;
  },

  async getAvailableSlots(slug, date, duration = 60) {
    const response = await api.get(`/portal/public/${slug}/slots`, {
      params: { date, duration },
    });
    return response.data;
  },

  async createBooking(slug, data) {
    const response = await api.post(`/portal/public/${slug}/book`, data);
    return response.data;
  },
};

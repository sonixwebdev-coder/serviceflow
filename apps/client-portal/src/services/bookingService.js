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

  async getAvailableSlots(slug, date, locationId = null, duration = 60) {
    const params = { date, duration };
    if (locationId) {
      params.locationId = locationId;
    }
    const response = await api.get(`/portal/public/${slug}/slots`, { params });
    return response.data;
  },

  async createBooking(slug, data) {
    const response = await api.post(`/portal/public/${slug}/book`, data);
    return response.data;
  },
};

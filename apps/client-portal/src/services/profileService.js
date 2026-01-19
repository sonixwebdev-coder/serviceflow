import api from '../utils/api';

export const profileService = {
  async getProfile() {
    const response = await api.get('/portal/profile');
    return response.data;
  },

  async updateProfile(data) {
    const response = await api.put('/portal/profile', data);
    return response.data;
  },

  async getAssets() {
    const response = await api.get('/portal/profile/assets');
    return response.data;
  },

  async updateEmail(email, password) {
    const response = await api.put('/portal/profile/email', { email, password });
    return response.data;
  },
};

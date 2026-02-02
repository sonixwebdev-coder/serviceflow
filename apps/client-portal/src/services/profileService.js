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

  async createAsset(data) {
    const response = await api.post('/portal/profile/assets', data);
    return response.data;
  },

  async updateAsset(id, data) {
    const response = await api.put(`/portal/profile/assets/${id}`, data);
    return response.data;
  },

  async deleteAsset(id) {
    const response = await api.delete(`/portal/profile/assets/${id}`);
    return response.data;
  },

  async updateEmail(email, password) {
    const response = await api.put('/portal/profile/email', { email, password });
    return response.data;
  },
};

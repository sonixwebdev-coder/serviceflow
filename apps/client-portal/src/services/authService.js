import api from '../utils/api';

export const authService = {
  async login(email, password) {
    const response = await api.post('/portal/auth/login', { email, password });
    const { accessToken, client } = response.data;
    return { accessToken, client };
  },

  async register(email, password, clientId) {
    const response = await api.post('/portal/auth/register', { email, password, clientId });
    return response.data;
  },

  async logout() {
    try {
      await api.post('/portal/auth/logout');
    } catch {
      // Ignore logout errors
    }
  },

  async getMe() {
    const response = await api.get('/portal/auth/me');
    return response.data;
  },

  async verifyEmail(token) {
    const response = await api.post('/portal/auth/verify-email', { token });
    return response.data;
  },

  async forgotPassword(email) {
    const response = await api.post('/portal/auth/forgot-password', { email });
    return response.data;
  },

  async resetPassword(token, password) {
    const response = await api.post('/portal/auth/reset-password', { token, password });
    return response.data;
  },

  async changePassword(currentPassword, newPassword) {
    const response = await api.post('/portal/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
};

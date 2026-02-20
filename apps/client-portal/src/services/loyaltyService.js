import api from '@/utils/api';

export const loyaltyService = {
  async getDashboard() {
    const response = await api.get('/portal/loyalty/dashboard');
    return response.data;
  },

  async getTransactions({ page = 1, limit = 10 } = {}) {
    const response = await api.get('/portal/loyalty/transactions', { params: { page, limit } });
    return response.data;
  },

  async getReferral() {
    const response = await api.get('/portal/loyalty/referral');
    return response.data;
  },

  async validateReferralCode(code) {
    const response = await api.post('/portal/loyalty/referral/validate', { referralCode: code });
    return response.data;
  },
};

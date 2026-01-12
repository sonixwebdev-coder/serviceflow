import api from '../utils/api';

export const invoiceService = {
  async getInvoices({ status, page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('page', page);
    params.append('limit', limit);

    const response = await api.get(`/portal/invoices?${params.toString()}`);
    return response.data;
  },

  async getInvoice(id) {
    const response = await api.get(`/portal/invoices/${id}`);
    return response.data;
  },

  async getInvoiceSummary() {
    const response = await api.get('/portal/invoices/list/summary');
    return response.data;
  },
};

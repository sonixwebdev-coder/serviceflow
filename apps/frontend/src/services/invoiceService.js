import API from '../utils/api';

export const fetchInvoices = async (params = {}) => {
  const response = await API.get('/invoices', { params });
  // Check if response has paginated structure (data.data.meta exists)
  if (response.data.data?.meta) {
    return { data: response.data.data.data, meta: response.data.data.meta }; // Paginated
  }
  return { data: response.data?.data || response.data, meta: null }; // Backward compatible
};

export const fetchInvoiceById = async (invoiceId) => {
  const response = await API.get(`/invoices/${invoiceId}`);
  return response.data?.data || response.data;
};

export const createInvoice = async (payload) => {
  const response = await API.post('/invoices', payload);
  return response.data?.data || response.data;
};

export const updateInvoice = async (invoiceId, payload) => {
  const response = await API.put(`/invoices/${invoiceId}`, payload);
  return response.data?.data || response.data;
};

export const deleteInvoice = async (invoiceId) => {
  const response = await API.delete(`/invoices/${invoiceId}`);
  return response.data?.data || response.data;
};

export const downloadInvoicePdf = async (invoiceId, options = {}) => {
  const params = {};
  if (options.refresh) {
    params.refresh = 'true';
  }

  const response = await API.get(`/invoices/${invoiceId}/pdf`, {
    responseType: 'blob',
    headers: {
      Accept: 'application/pdf',
    },
    params,
  });
  return response.data;
};

export const markInvoiceAsSent = async (invoiceId) => {
  const response = await API.post(`/invoices/${invoiceId}/send`);
  return response.data?.data || response.data;
};

export const markInvoiceAsPaid = async (invoiceId) => {
  const response = await API.post(`/invoices/${invoiceId}/mark-paid`);
  return response.data?.data || response.data;
};

export const fetchInvoicesByAppointment = async (appointmentId) => {
  const response = await API.get(`/invoices/appointment/${appointmentId}`);
  return response.data?.data || response.data;
};

export default {
  fetchInvoices,
  fetchInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  downloadInvoicePdf,
  markInvoiceAsSent,
  markInvoiceAsPaid,
  fetchInvoicesByAppointment,
};

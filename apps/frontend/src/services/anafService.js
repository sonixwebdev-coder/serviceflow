import API from '../utils/api';

// Configuration Management
export const getAnafConfig = async () => {
  const response = await API.get('/anaf/config');
  return response.data?.data || response.data;
};

export const getAnafConfigById = async (configId) => {
  const response = await API.get(`/anaf/config/${configId}`);
  return response.data?.data || response.data;
};

export const updateAnafConfig = async (configId, payload) => {
  const response = await API.put(`/anaf/config/${configId}`, payload);
  return response.data?.data || response.data;
};

export const createAnafConfig = async (payload) => {
  const response = await API.post('/anaf/config', payload);
  return response.data?.data || response.data;
};

export const deleteAnafConfig = async (configId) => {
  const response = await API.delete(`/anaf/config/${configId}`);
  return response.data?.data || response.data;
};

// Company Management
export const getAnafCompanies = async () => {
  const response = await API.get('/anaf/companies');
  return response.data?.data || response.data;
};

export const getAnafCompanyById = async (companyId) => {
  const response = await API.get(`/anaf/companies/${companyId}`);
  return response.data?.data || response.data;
};

export const createAnafCompany = async (payload) => {
  const response = await API.post('/anaf/companies', payload);
  return response.data?.data || response.data;
};

export const updateAnafCompany = async (companyId, payload) => {
  const response = await API.put(`/anaf/companies/${companyId}`, payload);
  return response.data?.data || response.data;
};

// Authentication
export const getAuthorizationUrl = async (configId) => {
  const response = await API.get('/anaf/auth/url', { params: { configId } });
  return response.data?.data || response.data;
};

export const handleOAuthCallback = async (code, configId) => {
  const response = await API.post('/anaf/auth/callback', { code, configId });
  return response.data?.data || response.data;
};

export const refreshAnafToken = async (configId) => {
  const response = await API.post('/anaf/auth/refresh', { configId });
  return response.data?.data || response.data;
};

export const testAnafConnection = async () => {
  const response = await API.get('/anaf/auth/health');
  return response.data?.data || response.data;
};

// Invoice Operations
export const getInvoiceSyncStatus = async (invoiceId) => {
  const response = await API.get(`/anaf/invoices/${invoiceId}/status`);
  return response.data?.data || response.data;
};

export const submitInvoiceToAnaf = async (invoiceId, options = {}) => {
  const response = await API.post(`/anaf/invoices/${invoiceId}/submit`, options);
  return response.data?.data || response.data;
};

export const syncInvoiceStatus = async (invoiceId) => {
  const response = await API.post(`/anaf/invoices/${invoiceId}/sync`);
  return response.data?.data || response.data;
};

export const retryInvoiceSubmission = async (invoiceId) => {
  const response = await API.post(`/anaf/invoices/${invoiceId}/retry`);
  return response.data?.data || response.data;
};

export const validateInvoiceXml = async (invoiceId) => {
  const response = await API.get(`/anaf/invoices/${invoiceId}/validate-xml`);
  return response.data?.data || response.data;
};

export const downloadInvoiceXml = async (invoiceId) => {
  const response = await API.get(`/anaf/invoices/${invoiceId}/xml`, {
    responseType: 'blob',
    headers: {
      Accept: 'application/xml',
    },
  });
  return response.data;
};

// Sync Operations
export const batchSyncInvoices = async () => {
  const response = await API.post('/anaf/sync/batch');
  return response.data?.data || response.data;
};

export const getSyncStatistics = async () => {
  const response = await API.get('/anaf/sync/stats');
  return response.data?.data || response.data;
};

export const getSyncRecords = async (params = {}) => {
  const response = await API.get('/anaf/sync', { params });
  return response.data?.data || response.data;
};

// Messages
export const getAnafMessages = async (params = {}) => {
  const response = await API.get('/anaf/messages', { params });
  return response.data?.data || response.data;
};

export const getAnafMessageById = async (messageId) => {
  const response = await API.get(`/anaf/messages/${messageId}`);
  return response.data?.data || response.data;
};

export const downloadAnafMessage = async (messageId) => {
  const response = await API.get(`/anaf/messages/${messageId}/download`, {
    responseType: 'blob',
    headers: {
      Accept: 'application/zip',
    },
  });
  return response.data;
};

export default {
  getAnafConfig,
  getAnafConfigById,
  updateAnafConfig,
  createAnafConfig,
  deleteAnafConfig,
  getAnafCompanies,
  getAnafCompanyById,
  createAnafCompany,
  updateAnafCompany,
  getAuthorizationUrl,
  handleOAuthCallback,
  refreshAnafToken,
  testAnafConnection,
  getInvoiceSyncStatus,
  submitInvoiceToAnaf,
  syncInvoiceStatus,
  retryInvoiceSubmission,
  validateInvoiceXml,
  downloadInvoiceXml,
  batchSyncInvoices,
  getSyncStatistics,
  getSyncRecords,
  getAnafMessages,
  getAnafMessageById,
  downloadAnafMessage,
};

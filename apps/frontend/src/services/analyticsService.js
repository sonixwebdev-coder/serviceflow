import api from '../utils/api';

/**
 * Get dashboard overview metrics
 */
export const fetchOverview = async () => {
  const response = await api.get('/analytics/overview');
  return response.data;
};

/**
 * Get revenue trends
 * @param {Object} params - { startDate, endDate, groupBy }
 */
export const fetchRevenueTrends = async (params = {}) => {
  const response = await api.get('/analytics/revenue', { params });
  return response.data;
};

/**
 * Get appointment statistics
 * @param {Object} params - { startDate, endDate }
 */
export const fetchAppointmentStats = async (params = {}) => {
  const response = await api.get('/analytics/appointments', { params });
  return response.data;
};

/**
 * Get client acquisition metrics
 * @param {Object} params - { startDate, endDate, groupBy }
 */
export const fetchClientAcquisition = async (params = {}) => {
  const response = await api.get('/analytics/clients', { params });
  return response.data;
};

/**
 * Get invoice aging report
 */
export const fetchInvoiceAging = async () => {
  const response = await api.get('/analytics/invoices/aging');
  return response.data;
};

/**
 * Get top clients by revenue
 * @param {Object} params - { startDate, endDate, limit }
 */
export const fetchTopClients = async (params = {}) => {
  const response = await api.get('/analytics/clients/top', { params });
  return response.data;
};

/**
 * Get location comparison analytics (admin/manager only)
 * @param {Object} params - { startDate, endDate }
 */
export const fetchLocationComparison = async (params = {}) => {
  const response = await api.get('/analytics/locations/comparison', { params });
  return response.data;
};

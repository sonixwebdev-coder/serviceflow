import api from '../utils/api';

/**
 * Global search across all entities
 * @param {string} query - Search term
 * @param {Object} options - { limit, types }
 */
export const globalSearch = async (query, options = {}) => {
  const params = new URLSearchParams();
  params.append('q', query);
  if (options.limit) params.append('limit', options.limit);
  if (options.types) params.append('types', options.types);

  const response = await api.get(`/search?${params.toString()}`);
  return response.data;
};

/**
 * Get quick actions for command palette
 */
export const getQuickActions = async () => {
  const response = await api.get('/search/quick-actions');
  return response.data;
};

/**
 * Get navigation shortcuts
 */
export const getNavigationShortcuts = async () => {
  const response = await api.get('/search/navigation');
  return response.data;
};

/**
 * Search clients
 */
export const searchClients = async (query, limit = 10) => {
  const response = await api.get(`/search/clients?q=${encodeURIComponent(query)}&limit=${limit}`);
  return response.data;
};

/**
 * Search appointments
 */
export const searchAppointments = async (query, limit = 10) => {
  const response = await api.get(`/search/appointments?q=${encodeURIComponent(query)}&limit=${limit}`);
  return response.data;
};

/**
 * Search tasks
 */
export const searchTasks = async (query, limit = 10) => {
  const response = await api.get(`/search/tasks?q=${encodeURIComponent(query)}&limit=${limit}`);
  return response.data;
};

/**
 * Search invoices
 */
export const searchInvoices = async (query, limit = 10) => {
  const response = await api.get(`/search/invoices?q=${encodeURIComponent(query)}&limit=${limit}`);
  return response.data;
};

/**
 * Search users
 */
export const searchUsers = async (query, limit = 10) => {
  const response = await api.get(`/search/users?q=${encodeURIComponent(query)}&limit=${limit}`);
  return response.data;
};

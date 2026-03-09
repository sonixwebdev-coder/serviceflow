import API from '../utils/api';

/**
 * Download a blob as a file
 * @param {Blob} blob - The blob to download
 * @param {string} filename - The filename to save as
 */
export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Export appointments data
 * @param {string} format - Export format ('csv', 'excel', 'json', 'pdf')
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Blob>}
 */
export const exportAppointments = async (format, filters = {}) => {
  const queryParams = new URLSearchParams();
  queryParams.append('format', format);

  // Add filters to query parameters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      queryParams.append(key, value);
    }
  });

  const response = await API.get(`/exports/appointments?${queryParams.toString()}`, {
    responseType: 'blob',
  });

  return response.data;
};

/**
 * Export invoices data
 * @param {string} format - Export format ('csv', 'excel', 'json', 'pdf')
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Blob>}
 */
export const exportInvoices = async (format, filters = {}) => {
  const queryParams = new URLSearchParams();
  queryParams.append('format', format);

  // Add filters to query parameters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      queryParams.append(key, value);
    }
  });

  const response = await API.get(`/exports/invoices?${queryParams.toString()}`, {
    responseType: 'blob',
  });

  return response.data;
};

/**
 * Export clients data
 * @param {string} format - Export format ('csv', 'excel', 'json', 'pdf')
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Blob>}
 */
export const exportClients = async (format, filters = {}) => {
  const queryParams = new URLSearchParams();
  queryParams.append('format', format);

  // Add filters to query parameters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      queryParams.append(key, value);
    }
  });

  const response = await API.get(`/exports/clients?${queryParams.toString()}`, {
    responseType: 'blob',
  });

  return response.data;
};

/**
 * Export users data
 * @param {string} format - Export format ('csv', 'excel', 'json', 'pdf')
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Blob>}
 */
export const exportUsers = async (format, filters = {}) => {
  const queryParams = new URLSearchParams();
  queryParams.append('format', format);

  // Add filters to query parameters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      queryParams.append(key, value);
    }
  });

  const response = await API.get(`/exports/users?${queryParams.toString()}`, {
    responseType: 'blob',
  });

  return response.data;
};

/**
 * Export leave requests data
 * @param {string} format - Export format ('csv', 'excel', 'json', 'pdf')
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Blob>}
 */
export const exportLeaveRequests = async (format, filters = {}) => {
  const queryParams = new URLSearchParams();
  queryParams.append('format', format);

  // Add filters to query parameters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      queryParams.append(key, value);
    }
  });

  const response = await API.get(`/exports/leave-requests?${queryParams.toString()}`, {
    responseType: 'blob',
  });

  return response.data;
};

/**
 * Export time tracking data
 * @param {string} format - Export format ('csv', 'excel', 'json', 'pdf')
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Blob>}
 */
export const exportTimeTracking = async (format, filters = {}) => {
  const queryParams = new URLSearchParams();
  queryParams.append('format', format);

  // Add filters to query parameters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      queryParams.append(key, value);
    }
  });

  const response = await API.get(`/exports/time-tracking?${queryParams.toString()}`, {
    responseType: 'blob',
  });

  return response.data;
};

/**
 * Export selected invoices as ANAF UBL XML ZIP
 * @param {string[]} invoiceIds - Array of invoice IDs to export
 * @returns {Promise<Blob>}
 */
export const exportInvoicesAnafXML = async (invoiceIds) => {
  const response = await API.post('/exports/invoices/anaf-xml', { invoiceIds }, {
    responseType: 'blob',
    timeout: 60000,
  });
  return response.data;
};

/**
 * Export all company data as a ZIP file
 * @returns {Promise<Blob>}
 */
export const exportAllData = async () => {
  const response = await API.post('/exports/all-data', {}, {
    responseType: 'blob',
    timeout: 120000, // 2 minutes timeout for large exports
  });

  return response.data;
};

export default {
  exportAppointments,
  exportInvoices,
  exportClients,
  exportUsers,
  exportLeaveRequests,
  exportTimeTracking,
  exportAllData,
  exportInvoicesAnafXML,
  downloadFile,
};

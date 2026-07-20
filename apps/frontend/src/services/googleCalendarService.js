import API from '../utils/api';

/**
 * Get the Google OAuth authorization URL to initiate connection
 * @param {string} returnUrl - URL to redirect to after OAuth completion
 * @param {string} [locationId] - Optional location ID to associate the connection with
 */
export const getConnectUrl = async (returnUrl = '/settings', locationId) => {
  let url = `/integrations/google/connect?returnUrl=${encodeURIComponent(returnUrl)}`;
  if (locationId) {
    url += `&locationId=${encodeURIComponent(locationId)}`;
  }
  const response = await API.get(url);
  return response.data?.data || response.data;
};

/**
 * Get current Google Calendar connection status
 */
export const getConnectionStatus = async () => {
  const response = await API.get('/integrations/google/status');
  return response.data?.data || response.data;
};

/**
 * Disconnect Google Calendar integration
 * @param {string} [locationId] - Optional location ID to disconnect a specific location config
 */
export const disconnect = async (locationId) => {
  let url = '/integrations/google/disconnect';
  if (locationId) {
    url += `?locationId=${encodeURIComponent(locationId)}`;
  }
  const response = await API.post(url);
  return response.data?.data || response.data;
};

/**
 * List available Google Calendars for a specific location config
 * @param {string} [locationId] - Optional location ID
 */
export const listCalendars = async (locationId) => {
  let url = '/integrations/google/calendars';
  if (locationId) {
    url += `?locationId=${encodeURIComponent(locationId)}`;
  }
  const response = await API.get(url);
  return response.data?.data || response.data;
};

/**
 * Update Google Calendar sync settings
 * @param {Object} settings - Settings object
 * @param {string} settings.calendarId - Selected calendar ID
 * @param {boolean} settings.syncEnabled - Whether sync is enabled
 * @param {string} [settings.locationId] - Optional location ID for location-specific settings
 */
export const updateSettings = async (settings) => {
  const response = await API.put('/integrations/google/settings', settings);
  return response.data?.data || response.data;
};

/**
 * Manually trigger sync of all appointments for a location
 * @param {string} [locationId] - Optional location ID
 */
export const syncAll = async (locationId) => {
  const response = await API.post('/integrations/google/sync', {
    locationId: locationId || undefined,
  });
  return response.data?.data || response.data;
};

/**
 * Sync a specific appointment to Google Calendar
 * @param {string} appointmentId - The appointment ID to sync
 */
export const syncAppointment = async (appointmentId) => {
  const response = await API.post(`/integrations/google/sync/${appointmentId}`);
  return response.data?.data || response.data;
};

/**
 * Get sync status for a specific appointment
 * @param {string} appointmentId - The appointment ID
 */
export const getSyncStatus = async (appointmentId) => {
  const response = await API.get(`/integrations/google/sync-status/${appointmentId}`);
  return response.data?.data || response.data;
};

/**
 * Import events from Google Calendar to CRM
 * @param {Object} options - Import options
 * @param {Date} options.timeMin - Start date for events
 * @param {Date} options.timeMax - End date for events
 * @param {number} options.maxResults - Maximum events to fetch
 */
export const importFromGoogle = async (options = {}) => {
  const response = await API.post('/integrations/google/import', options);
  return response.data?.data || response.data;
};

/**
 * Two-way sync: Export CRM appointments to Google and import Google events to CRM
 */
export const syncBidirectional = async () => {
  const response = await API.post('/integrations/google/sync-bidirectional');
  return response.data?.data || response.data;
};

export default {
  getConnectUrl,
  getConnectionStatus,
  disconnect,
  listCalendars,
  updateSettings,
  syncAll,
  syncAppointment,
  getSyncStatus,
  importFromGoogle,
  syncBidirectional,
};

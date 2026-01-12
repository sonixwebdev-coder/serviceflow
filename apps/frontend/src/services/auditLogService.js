import API from '../utils/api';

/**
 * Fetch audit logs with filtering
 */
export const fetchAuditLogs = async (params = {}) => {
  const response = await API.get('/audit-logs', { params });
  return response.data.data;
};

/**
 * Fetch activity feed
 */
export const fetchActivityFeed = async (params = {}) => {
  const response = await API.get('/audit-logs/feed', { params });
  return response.data.data;
};

/**
 * Fetch activity for a specific entity
 */
export const fetchEntityActivity = async (entityType, entityId, limit = 20) => {
  const response = await API.get(`/audit-logs/entity/${entityType}/${entityId}`, {
    params: { limit },
  });
  return response.data.data;
};

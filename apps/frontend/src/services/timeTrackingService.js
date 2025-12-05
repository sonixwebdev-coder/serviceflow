import API from '../utils/api';

export const clockIn = async (payload = {}) => {
  const response = await API.post('/time-tracking/clock-in', payload);
  return response.data.data;
};

export const clockOut = async (recordId, payload = {}) => {
  const response = await API.put(`/time-tracking/${recordId}/clock-out`, payload);
  return response.data.data;
};

export const fetchTimeTracking = async (params = {}) => {
  const response = await API.get('/time-tracking', { params });
  // Check if response has paginated structure (data.data.meta exists)
  if (response.data.data?.meta) {
    return { data: response.data.data.data, meta: response.data.data.meta }; // Paginated
  }
  return { data: response.data.data, meta: null }; // Backward compatible
};

export const deleteTimeTrackingRecord = async (recordId) => {
  await API.delete(`/time-tracking/${recordId}`);
};

export default {
  clockIn,
  clockOut,
  fetchTimeTracking,
  deleteTimeTrackingRecord,
};

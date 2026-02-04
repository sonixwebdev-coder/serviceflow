import API from '../utils/api';

export const fetchLocations = async (params = {}) => {
  const response = await API.get('/locations', { params });
  return response.data?.data || response.data;
};

export const fetchMyLocations = async () => {
  const response = await API.get('/locations/my');
  return response.data?.data || response.data;
};

export const fetchLocationById = async (locationId) => {
  const response = await API.get(`/locations/${locationId}`);
  return response.data?.data || response.data;
};

export const createLocation = async (payload) => {
  const response = await API.post('/locations', payload);
  return response.data?.data || response.data;
};

export const updateLocation = async (locationId, payload) => {
  const response = await API.patch(`/locations/${locationId}`, payload);
  return response.data?.data || response.data;
};

export const deleteLocation = async (locationId) => {
  const response = await API.delete(`/locations/${locationId}`);
  return response.data?.data || response.data;
};

export const fetchLocationUsers = async (locationId) => {
  const response = await API.get(`/locations/${locationId}/users`);
  return response.data?.data || response.data;
};

export const assignUsersToLocation = async (locationId, userIds, setPrimary = false) => {
  const response = await API.post(`/locations/${locationId}/users`, { userIds, setPrimary });
  return response.data?.data || response.data;
};

export const removeUsersFromLocation = async (locationId, userIds) => {
  const response = await API.delete(`/locations/${locationId}/users`, { data: { userIds } });
  return response.data?.data || response.data;
};

export default {
  fetchLocations,
  fetchMyLocations,
  fetchLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
  fetchLocationUsers,
  assignUsersToLocation,
  removeUsersFromLocation,
};

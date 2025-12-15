import API from '../utils/api';

export const fetchResources = async (params = {}) => {
  const response = await API.get('/resources', { params });
  return response.data?.data || response.data;
};

export const fetchResourceById = async (resourceId) => {
  const response = await API.get(`/resources/${resourceId}`);
  return response.data?.data || response.data;
};

export const fetchAvailableResources = async (params = {}) => {
  const response = await API.get('/resources/available', { params });
  return response.data?.data || response.data;
};

export const createResource = async (payload) => {
  const response = await API.post('/resources', payload);
  return response.data?.data || response.data;
};

export const updateResource = async (resourceId, payload) => {
  const response = await API.patch(`/resources/${resourceId}`, payload);
  return response.data?.data || response.data;
};

export const deleteResource = async (resourceId) => {
  const response = await API.delete(`/resources/${resourceId}`);
  return response.data?.data || response.data;
};

export default {
  fetchResources,
  fetchResourceById,
  fetchAvailableResources,
  createResource,
  updateResource,
  deleteResource,
};

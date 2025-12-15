import API from '../utils/api';

export const fetchAssets = async (params = {}) => {
  const response = await API.get('/assets', { params });
  return response.data?.data || response.data;
};

export const fetchAssetById = async (assetId) => {
  const response = await API.get(`/assets/${assetId}`);
  return response.data?.data || response.data;
};

export const fetchAssetsByClientId = async (clientId) => {
  const response = await API.get(`/assets/client/${clientId}`);
  return response.data?.data || response.data;
};

export const createAsset = async (payload) => {
  const response = await API.post('/assets', payload);
  return response.data?.data || response.data;
};

export const updateAsset = async (assetId, payload) => {
  const response = await API.patch(`/assets/${assetId}`, payload);
  return response.data?.data || response.data;
};

export const deleteAsset = async (assetId) => {
  const response = await API.delete(`/assets/${assetId}`);
  return response.data?.data || response.data;
};

export default {
  fetchAssets,
  fetchAssetById,
  fetchAssetsByClientId,
  createAsset,
  updateAsset,
  deleteAsset,
};

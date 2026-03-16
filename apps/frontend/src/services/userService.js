import API from '../utils/api';

export const fetchUsers = async (params = {}) => {
  const response = await API.get('/users', { params });
  return response.data.data;
};

export const fetchCurrentUser = async () => {
  const response = await API.get('/users/me');
  return response.data.data;
};

export const fetchUserById = async (userId) => {
  const response = await API.get(`/users/${userId}`);
  return response.data.data;
};

export const updateUser = async (userId, payload) => {
  const response = await API.put(`/users/${userId}`, payload);
  return response.data.data;
};

export const createUser = async (payload) => {
  const response = await API.post('/users', payload);
  return response.data.data;
};

export const deactivateUser = async (userId) => {
  await API.delete(`/users/${userId}`);
};

export const updateProfile = async (payload) => {
  const response = await API.put('/users/profile', payload);
  return response.data.data;
};

export const changePassword = async (payload) => {
  const response = await API.put('/users/profile/password', payload);
  return response.data;
};

export const fetchProfile = async () => {
  const response = await API.get('/users/profile');
  return response.data.data;
};

// 2FA functions
export const get2FAStatus = async () => {
  const response = await API.get('/auth/2fa/status');
  return response.data.data;
};

export const setup2FA = async () => {
  const response = await API.post('/auth/2fa/setup');
  return response.data.data;
};

export const verifySetup2FA = async (code) => {
  const response = await API.post('/auth/2fa/verify-setup', { code });
  return response.data.data;
};

export const disable2FA = async (password, code) => {
  const response = await API.post('/auth/2fa/disable', { password, code });
  return response.data.data;
};

export const verifyTwoFactorLogin = async (tempToken, code, context = 'crm') => {
  const response = await API.post('/auth/2fa/verify', { tempToken, code, context });
  return response.data?.data || response.data;
};

export default {
  fetchUsers,
  fetchCurrentUser,
  fetchUserById,
  updateUser,
  createUser,
  deactivateUser,
  updateProfile,
  changePassword,
  fetchProfile,
  get2FAStatus,
  setup2FA,
  verifySetup2FA,
  disable2FA,
  verifyTwoFactorLogin,
};

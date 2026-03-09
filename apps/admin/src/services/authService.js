import api from '@/utils/api';

export const login = async ({ email, password }) => {
  const { data } = await api.post('/api/auth/login', { email, password, context: 'admin' });
  return data.data;
};

export const refresh = async () => {
  const { data } = await api.post('/api/auth/refresh', { context: 'admin' });
  return data.data;
};

export const logout = async () => {
  try {
    await api.post('/api/auth/logout', { context: 'admin' });
  } catch {
    // Ignore logout errors
  }
};

export const changePassword = async ({ currentPassword, newPassword }) => {
  const { data } = await api.put('/api/super-admin/password', { currentPassword, newPassword });
  return data;
};

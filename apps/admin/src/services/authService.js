import api from '@/utils/api';

export const login = async ({ email, password }) => {
  const { data } = await api.post('/api/auth/login', { email, password });
  return data.data;
};

export const refresh = async () => {
  const { data } = await api.post('/api/auth/refresh');
  return data.data;
};

export const logout = async () => {
  try {
    await api.post('/api/auth/logout');
  } catch {
    // Ignore logout errors
  }
};

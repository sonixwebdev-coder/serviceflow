import axios from 'axios';
import { useAuthStore } from '../state/useAuthStore.js';
import { updateSocketToken } from '../lib/socket.js';

const normalizeBaseUrl = (baseUrl) => {
  const fallback = 'http://localhost:5000/api';
  const value = baseUrl || fallback;
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_URL);

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise = null;

const clearSession = () => {
  const { clear } = useAuthStore.getState();
  clear();
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

const performTokenRefresh = async () => {
  const { refreshToken, setSession } = useAuthStore.getState();
  const token = refreshToken || localStorage.getItem('refreshToken');

  if (!token) {
    clearSession();
    throw Object.assign(new Error('Session expired'), { code: 'NO_REFRESH_TOKEN' });
  }

  const { data } = await refreshClient.post('/auth/refresh', { refreshToken: token });
  const payload = data.data || data;
  const { user, accessToken: nextAccessToken, refreshToken: nextRefreshToken } = payload;

  setSession({ user, accessToken: nextAccessToken, refreshToken: nextRefreshToken });
  localStorage.setItem('accessToken', nextAccessToken);
  localStorage.setItem('refreshToken', nextRefreshToken);
  localStorage.setItem('user', JSON.stringify(user));

  updateSocketToken(nextAccessToken);

  return payload;
};

const queueTokenRefresh = () => {
  if (!refreshPromise) {
    refreshPromise = performTokenRefresh()
      .catch((error) => {
        clearSession();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

API.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();
    const token = accessToken || localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;
    if (!response) {
      return Promise.reject({ message: 'Network error. Please check your connection.' });
    }

    // Don't try to refresh token on login/register endpoints
    if (config.url?.includes('/auth/login') || config.url?.includes('/auth/register')) {
      return Promise.reject(response.data || error);
    }

    if (response.status !== 401 || config._retry) {
      return Promise.reject(response.data || { message: 'Request failed' });
    }

    try {
      const refreshed = await queueTokenRefresh();
      const nextAccessToken = refreshed.accessToken || refreshed.accessTokenToken || refreshed.accessToken;
      config._retry = true;
      config.headers.Authorization = `Bearer ${nextAccessToken}`;
      return API(config);
    } catch (refreshError) {
      window.location.href = '/login';
      return Promise.reject(refreshError.response?.data || { message: 'Session expired' });
    }
  }
);

export const refreshAuthSession = async () => queueTokenRefresh();

export default API;

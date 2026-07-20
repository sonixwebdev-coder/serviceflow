import axios from 'axios';
import useAuthStore from '@/state/useAuthStore';
import { runtimeConfig } from '@/config/runtime';

const API_BASE = runtimeConfig.serverUrl;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

let csrfToken = null;

// Attach access token + CSRF from memory (not localStorage)
api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
    config.headers['x-csrf-token'] = csrfToken;
  }

  return config;
});

// Handle 401 → try refresh via httpOnly cookie
let refreshPromise = null;

const performTokenRefresh = async () => {
  const { data } = await refreshClient.post(`${API_BASE}/api/auth/refresh`, { context: 'admin' });

  const { accessToken: newToken, user } = data.data || data;

  const store = useAuthStore.getState();
  store.login({ user, accessToken: newToken });

  return newToken;
};

const queueTokenRefresh = () => {
  if (!refreshPromise) {
    refreshPromise = performTokenRefresh()
      .catch((error) => {
        useAuthStore.getState().logout();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 → refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await queueTokenRefresh();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }

    // 403 CSRF → refresh CSRF token and retry once
    if (
      error.response?.status === 403 &&
      error.response?.data?.code === 'CSRF_VALIDATION_FAILED' &&
      !originalRequest._csrfRetry
    ) {
      originalRequest._csrfRetry = true;
      await fetchCsrfToken();
      originalRequest.headers['x-csrf-token'] = csrfToken;
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

// Fetch CSRF token on init
export const fetchCsrfToken = async () => {
  try {
    const { data } = await api.get('/api/csrf-token');
    if (data.csrfToken) {
      csrfToken = data.csrfToken;
    }
  } catch {
    // Non-critical
  }
};

/**
 * Bootstrap auth on app load - attempt refresh via httpOnly cookie.
 * If successful, the admin is still logged in. Otherwise, redirect to login.
 */
export const bootstrapAuth = async () => {
  try {
    await queueTokenRefresh();
    return true;
  } catch {
    return false;
  }
};

export default api;

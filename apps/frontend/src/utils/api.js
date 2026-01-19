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
  withCredentials: true, // Required for CSRF cookie
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Required for CSRF cookie
});

let refreshPromise = null;
let csrfToken = null;

// Fetch CSRF token from server
const fetchCsrfToken = async () => {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/csrf-token`, {
      withCredentials: true, // Required to receive CSRF cookie
    });
    csrfToken = data.csrfToken;
    return csrfToken;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    return null;
  }
};

// Initialize CSRF token on app load
fetchCsrfToken();

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

    // Add CSRF token for state-changing requests
    if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
      config.headers['x-csrf-token'] = csrfToken;
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

    // Handle CSRF token errors (403 Forbidden)
    if (response.status === 403 && !config._csrfRetry) {
      const isCSRFError =
        response.data?.code === 'CSRF_VALIDATION_FAILED' ||
        response.data?.message?.toLowerCase().includes('csrf');

      if (isCSRFError) {
        try {
          // Fetch fresh CSRF token
          await fetchCsrfToken();
          config._csrfRetry = true;

          // Retry request with new token
          if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
            config.headers['x-csrf-token'] = csrfToken;
          }

          return API(config);
        } catch (csrfError) {
          console.error('CSRF token refresh failed:', csrfError);
          return Promise.reject(response.data || {
            message: 'Security validation failed. Please refresh the page and try again.',
            code: 'CSRF_VALIDATION_FAILED'
          });
        }
      }
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
export const refreshCsrfToken = fetchCsrfToken;

/**
 * Get the base URL for static files (uploads)
 * Removes /api from the API_BASE_URL
 */
export const getFileBaseUrl = () => {
  return API_BASE_URL.replace(/\/api\/?$/, '');
};

/**
 * Get full URL for a file path
 * @param {string} filePath - Relative file path like /uploads/messages/file.png
 * @returns {string} Full URL like http://localhost:5000/uploads/messages/file.png
 */
export const getFileUrl = (filePath) => {
  if (!filePath) return '';
  // If already a full URL, return as is
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  const baseUrl = getFileBaseUrl();
  // Ensure single slash between base URL and path
  const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  return `${baseUrl}${normalizedPath}`;
};

export default API;

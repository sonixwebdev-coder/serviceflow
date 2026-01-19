import axios from 'axios';
import { useAuthStore } from '../state/useAuthStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let csrfToken = null;
let isRefreshing = false;
let refreshSubscribers = [];

// Subscribe to token refresh
const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

// Notify subscribers when token is refreshed
const onTokenRefreshed = (accessToken) => {
  refreshSubscribers.forEach((callback) => callback(accessToken));
  refreshSubscribers = [];
};

// Fetch CSRF token from server
const fetchCsrfToken = async () => {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/csrf-token`, {
      withCredentials: true,
    });
    csrfToken = data.csrfToken;
    return csrfToken;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    return null;
  }
};

// Refresh auth session
const refreshAuthSession = async () => {
  const { refreshToken } = useAuthStore.getState();

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await axios.post(
    `${API_BASE_URL}/portal/auth/refresh`,
    { refreshToken },
    { withCredentials: true }
  );

  const { accessToken, refreshToken: newRefreshToken, account, client } = response.data;

  // Update store
  useAuthStore.getState().setAuth({ accessToken, refreshToken: newRefreshToken, account, client });

  return { accessToken, refreshToken: newRefreshToken };
};

// Initialize CSRF token on app load
fetchCsrfToken();

// Request interceptor to add auth token and CSRF token
api.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Add CSRF token for state-changing requests
    if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
      config.headers['x-csrf-token'] = csrfToken;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors and CSRF errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;

    if (!response) {
      return Promise.reject({ message: 'Network error. Please check your connection.' });
    }

    // Handle CSRF token errors (403 Forbidden)
    if (response.status === 403 && !config._csrfRetry) {
      const isCSRFError =
        response.data?.code === 'CSRF_VALIDATION_FAILED' ||
        response.data?.message?.toLowerCase().includes('csrf');

      if (isCSRFError) {
        try {
          await fetchCsrfToken();
          config._csrfRetry = true;

          if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
            config.headers['x-csrf-token'] = csrfToken;
          }

          return api(config);
        } catch (csrfError) {
          console.error('CSRF token refresh failed:', csrfError);
          return Promise.reject(response.data || {
            message: 'Security validation failed. Please refresh the page and try again.',
            code: 'CSRF_VALIDATION_FAILED'
          });
        }
      }
    }

    // Handle auth errors - try to refresh token
    if (response.status === 401 && !config._authRetry) {
      const code = response.data?.code;

      // If token expired, try to refresh
      if (code === 'AUTH_TOKEN_EXPIRED' || code === 'AUTH_INVALID_TOKEN') {
        if (isRefreshing) {
          // Wait for the refresh to complete
          return new Promise((resolve) => {
            subscribeTokenRefresh((accessToken) => {
              config.headers.Authorization = `Bearer ${accessToken}`;
              config._authRetry = true;
              resolve(api(config));
            });
          });
        }

        isRefreshing = true;

        try {
          const { accessToken } = await refreshAuthSession();
          isRefreshing = false;
          onTokenRefreshed(accessToken);

          // Retry the original request
          config.headers.Authorization = `Bearer ${accessToken}`;
          config._authRetry = true;
          return api(config);
        } catch (refreshError) {
          isRefreshing = false;
          refreshSubscribers = [];

          // Refresh failed, logout and redirect
          useAuthStore.getState().logout();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      // Other auth errors, logout immediately
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

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

export { fetchCsrfToken, refreshAuthSession };
export default api;

import axios from 'axios';
import { useAuthStore } from '../state/useAuthStore.js';
import { updateSocketToken } from '../lib/socket.js';
import useLocationStore from '../state/useLocationStore.js';

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
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

let refreshPromise = null;
let csrfToken = null;

// Fetch CSRF token from server
const fetchCsrfToken = async () => {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/csrf-token`, {
      withCredentials: true,
    });
    csrfToken = data.csrfToken;
    return csrfToken;
  } catch {
    return null;
  }
};

// Initialize CSRF token on app load
fetchCsrfToken();

const clearSession = () => {
  const { clear } = useAuthStore.getState();
  clear();
  localStorage.removeItem('user');
};

const performTokenRefresh = async () => {
  const { setSession } = useAuthStore.getState();

  const { data } = await refreshClient.post('/auth/refresh', { context: 'crm' });
  const payload = data.data || data;
  const { user, accessToken: nextAccessToken } = payload;

  setSession({ user, accessToken: nextAccessToken });
  // Only cache minimal display fields in localStorage (no sensitive data)
  localStorage.setItem('user', JSON.stringify({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    role: user.role,
  }));

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
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Add CSRF token for state-changing requests
    if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
      config.headers['x-csrf-token'] = csrfToken;
    }

    // Add location header for location-scoped requests
    const { currentLocationId } = useLocationStore.getState();
    if (currentLocationId) {
      config.headers['X-Location-Id'] = currentLocationId;
    }

    // Let the browser set the correct Content-Type with boundary for FormData
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
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
      return Promise.reject(new Error('Network error. Please check your connection.'));
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
        } catch {
          return Promise.reject(response.data || {
            message: 'Security validation failed. Please refresh the page and try again.',
            code: 'CSRF_VALIDATION_FAILED'
          });
        }
      }
    }

    // Handle 402 Payment Required - update orgStatus so ProtectedRoute handles the redirect
    if (response.status === 402) {
      const { user, setSession, accessToken } = useAuthStore.getState();
      if (user && user.orgStatus !== 'PAYMENT_REQUIRED') {
        setSession({ user: { ...user, orgStatus: 'PAYMENT_REQUIRED' }, accessToken });
      }
      return Promise.reject(response.data || { message: 'Plata necesara', code: 'PAYMENT_REQUIRED' });
    }

    if (response.status !== 401 || config._retry) {
      return Promise.reject(response.data || { message: 'Request failed' });
    }

    // Skip token refresh if user is not logged in (public page requests)
    const { accessToken: currentToken } = useAuthStore.getState();
    if (!currentToken) {
      return Promise.reject(response.data || { message: 'Unauthorized' });
    }

    try {
      const refreshed = await queueTokenRefresh();
      const nextAccessToken = refreshed.accessToken;
      config._retry = true;
      config.headers.Authorization = `Bearer ${nextAccessToken}`;
      return API(config);
    } catch (refreshError) {
      useAuthStore.getState().clear();
      useLocationStore.getState().reset();
      window.location.href = '/login';
      return Promise.reject(refreshError.response?.data || new Error('Session expired'));
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
  let normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;

  // Paths stored as bare storage-relative paths (e.g. "chat/orgId/channelId/files/hash")
  // need the /files/ URL prefix to reach the static file server.
  // Paths already starting with /files/ or /uploads/ are already correct.
  if (!normalizedPath.startsWith('/files/') && !normalizedPath.startsWith('/uploads/')) {
    normalizedPath = `/files${normalizedPath}`;
  }

  const url = `${baseUrl}${normalizedPath}`;

  // Public paths don't need auth token
  if (normalizedPath.startsWith('/files/logos/') || normalizedPath.startsWith('/files/websites/')) {
    return url;
  }

  // Append access token for authenticated static file access
  const token = useAuthStore.getState().accessToken;
  if (token) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${encodeURIComponent(token)}`;
  }
  return url;
};

export default API;

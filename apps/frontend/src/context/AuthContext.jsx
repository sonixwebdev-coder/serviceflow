import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API, { refreshAuthSession } from '../utils/api';
import AuthContext from './AuthContext';
import { useAuthStore } from '../state/useAuthStore.js';

/**
 * Cache only minimal, non-sensitive user fields in localStorage.
 * Used for instant UI hydration during silent refresh (~200ms).
 */
const cacheUserForDisplay = (user) => {
  if (!user) return;
  localStorage.setItem('user', JSON.stringify({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    role: user.role,
  }));
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const { user, accessToken, setSession, setUser, hydrate, clear } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Clean up stale localStorage keys from pre-migration auth
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');

    // On mount, try to restore session via httpOnly cookie refresh
    const storedUser = localStorage.getItem('user');

    if (storedUser) {
      try {
        // Hydrate cached user for instant UI, then refresh to get access token
        hydrate({ user: JSON.parse(storedUser), accessToken: null });
      } catch {
        localStorage.removeItem('user');
      }
    }

    // Attempt silent refresh to get a fresh access token from cookie
    refreshAuthSession()
      .catch(() => {
        // No valid refresh cookie - user needs to re-login
        clear();
        localStorage.removeItem('user');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [hydrate, clear]);

  const login = async (email, password) => {
    try {
      const response = await API.post('/auth/login', { email, password });
      const payload = response.data?.data || response.data;
      setSession({ user: payload.user, accessToken: payload.accessToken });
      // Only cache minimal display fields in localStorage (no sensitive data)
      cacheUserForDisplay(payload.user);

      return { success: true };
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Login failed. Please try again.';
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      await API.post('/auth/logout');
    } catch (error) {
      console.warn('Failed to revoke refresh token:', error?.message || error);
    } finally {
      clear();
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  const hasRole = (...roles) => {
    if (!roles.length) return true;

    const required = roles.filter(role => role).map((role) => role.toLowerCase());
    const owned = new Set();

    if (user?.role) {
      owned.add(user.role.toLowerCase());
    }

    user?.roles?.forEach((assignment) => {
      const key = assignment?.role?.key || assignment?.key || assignment?.role;
      if (typeof key === 'string') {
        owned.add(key.toLowerCase());
      }
    });

    return required.some((role) => owned.has(role));
  };

  const value = {
    user,
    setUser,
    accessToken,
    loading,
    login,
    logout,
    hasRole,
    isAuthenticated: Boolean(user && accessToken),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

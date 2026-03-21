import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API, { refreshAuthSession } from '../utils/api';
import AuthContext from './AuthContext';
import { useAuthStore } from '../state/useAuthStore.js';
import { queryClient } from '../lib/queryClient';
import useLocationStore from '../state/useLocationStore';
import { verifyTwoFactorLogin } from '../services/userService';

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

  // Cross-tab session sync: detect login/logout from other tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key !== 'user') return;

      const currentUserId = useAuthStore.getState().user?.id;

      if (!e.newValue) {
        // Another tab logged out — clear this tab too
        clear();
        queryClient.clear();
        navigate('/login');
        return;
      }

      try {
        const newUser = JSON.parse(e.newValue);
        if (newUser.id && newUser.id !== currentUserId) {
          // Different user logged in on another tab — reload to sync session
          window.location.reload();
        }
      } catch {
        // Malformed data, ignore
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [clear, navigate]);

  const login = async (email, password) => {
    try {
      const response = await API.post('/auth/login', { email, password, context: 'crm' });
      const payload = response.data?.data || response.data;

      // If 2FA is required, return temp token for the login page to handle
      if (payload.requiresTwoFactor) {
        return { success: false, requiresTwoFactor: true, tempToken: payload.tempToken };
      }

      setSession({ user: payload.user, accessToken: payload.accessToken });
      cacheUserForDisplay(payload.user);

      return { success: true };
    } catch (error) {
      const data = error?.response?.data;
      const message = data?.message || error?.message || 'Login failed. Please try again.';
      const code = data?.code || null;
      return { success: false, message, code };
    }
  };

  const verifyTwoFactor = async (tempToken, code) => {
    try {
      const payload = await verifyTwoFactorLogin(tempToken, code, 'crm');
      setSession({ user: payload.user, accessToken: payload.accessToken });
      cacheUserForDisplay(payload.user);
      return { success: true };
    } catch (error) {
      const data = error?.response?.data;
      const message = data?.message || error?.message || 'Cod invalid';
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      await API.post('/auth/logout', { context: 'crm' });
    } catch (error) {
      console.warn('Failed to revoke refresh token:', error?.message || error);
    } finally {
      // Clear auth state
      clear();
      localStorage.removeItem('user');
      // Reset location store so the next user starts fresh (clears persisted currentLocationId)
      useLocationStore.getState().reset();
      // Clear all cached query data so the next user doesn't see stale data
      queryClient.clear();
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
    verifyTwoFactor,
    isAuthenticated: Boolean(user && accessToken),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

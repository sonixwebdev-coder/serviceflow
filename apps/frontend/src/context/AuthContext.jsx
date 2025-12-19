import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import AuthContext from './AuthContext';
import { useAuthStore } from '../state/useAuthStore.js';

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const { user, accessToken, refreshToken, setSession, setUser, hydrate, clear } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedAccessToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');

    if (storedAccessToken && storedRefreshToken && storedUser) {
      try {
        hydrate({
          user: JSON.parse(storedUser),
          accessToken: storedAccessToken,
          refreshToken: storedRefreshToken,
        });
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      }
    }

    setLoading(false);
  }, [hydrate]);

  const persistSession = ({ user: userData, accessToken: nextAccessToken, refreshToken: nextRefreshToken }) => {
    setSession({
      user: userData,
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
    });
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('accessToken', nextAccessToken);
    localStorage.setItem('refreshToken', nextRefreshToken);
  };

  const login = async (email, password) => {
    try {
      const response = await API.post('/auth/login', { email, password });
      const payload = response.data?.data || response.data;
      persistSession(payload);

      // Trigger event to refresh terminology settings
      window.dispatchEvent(new Event('userLoggedIn'));

      return { success: true };
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Login failed. Please try again.';
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      if (refreshToken) {
        await API.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.warn('Failed to revoke refresh token:', error?.message || error);
    } finally {
      clear();
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
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
    refreshToken,
    loading,
    login,
    logout,
    hasRole,
    isAuthenticated: Boolean(user && accessToken),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

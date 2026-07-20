import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('sf_admin_user') || 'null'),
  accessToken: null, // In-memory only - not persisted to localStorage
  isAuthenticated: false,

  login: ({ user, accessToken }) => {
    // Only persist non-sensitive display fields
    localStorage.setItem('sf_admin_user', JSON.stringify(user));
    set({ user, accessToken, isAuthenticated: true });
  },

  setAccessToken: (accessToken) => {
    set({ accessToken, isAuthenticated: !!accessToken });
  },

  logout: () => {
    localStorage.removeItem('sf_admin_user');
    localStorage.removeItem('sf_admin_csrf');
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  hydrate: () => {
    const user = JSON.parse(localStorage.getItem('sf_admin_user') || 'null');
    // Token must be re-acquired via refresh - not persisted
    set({ user, accessToken: null, isAuthenticated: false });
  },
}));

export default useAuthStore;

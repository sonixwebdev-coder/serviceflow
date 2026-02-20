import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('sf_admin_user') || 'null'),
  accessToken: localStorage.getItem('sf_admin_token') || null,
  isAuthenticated: !!localStorage.getItem('sf_admin_token'),

  login: ({ user, accessToken }) => {
    localStorage.setItem('sf_admin_token', accessToken);
    localStorage.setItem('sf_admin_user', JSON.stringify(user));
    set({ user, accessToken, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('sf_admin_token');
    localStorage.removeItem('sf_admin_user');
    localStorage.removeItem('sf_admin_csrf');
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  hydrate: () => {
    const token = localStorage.getItem('sf_admin_token');
    const user = JSON.parse(localStorage.getItem('sf_admin_user') || 'null');
    set({ user, accessToken: token, isAuthenticated: !!token });
  },
}));

export default useAuthStore;

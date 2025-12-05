import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  setSession: ({ user, accessToken, refreshToken }) =>
    set({ user, accessToken, refreshToken }),
  setUser: (user) => set({ user }),
  hydrate: (payload) =>
    set({
      user: payload?.user || null,
      accessToken: payload?.accessToken || null,
      refreshToken: payload?.refreshToken || null,
    }),
  clear: () => set({ user: null, accessToken: null, refreshToken: null }),
}));

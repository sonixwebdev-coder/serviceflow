import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  setSession: ({ user, accessToken }) =>
    set({ user, accessToken }),
  setUser: (user) => set({ user }),
  hydrate: (payload) =>
    set({
      user: payload?.user || null,
      accessToken: payload?.accessToken || null,
    }),
  clear: () => set({ user: null, accessToken: null }),
}));

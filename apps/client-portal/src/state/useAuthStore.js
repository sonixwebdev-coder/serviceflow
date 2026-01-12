import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      account: null,
      client: null,
      isAuthenticated: false,

      setAuth: ({ accessToken, refreshToken, account, client }) => {
        set({
          accessToken,
          refreshToken,
          account,
          client,
          isAuthenticated: true,
        });
      },

      setTokens: ({ accessToken, refreshToken }) => {
        set({ accessToken, refreshToken });
      },

      logout: () => {
        set({
          accessToken: null,
          refreshToken: null,
          account: null,
          client: null,
          isAuthenticated: false,
        });
      },

      updateClient: (clientData) => {
        set((state) => ({
          client: { ...state.client, ...clientData },
        }));
      },

      // For backward compatibility during migration
      get token() {
        return get().accessToken;
      },
    }),
    {
      name: 'portal-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        account: state.account,
        client: state.client,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

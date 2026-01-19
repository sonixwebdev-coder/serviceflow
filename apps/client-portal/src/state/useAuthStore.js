import { create } from 'zustand';

export const useAuthStore = create((set, get) => ({
  accessToken: null,
  refreshToken: null,
  account: null,
  client: null,
  isAuthenticated: false,
  loading: true,

  setAuth: ({ accessToken, refreshToken, account, client }) => {
    // Persist to localStorage
    localStorage.setItem('portal-accessToken', accessToken);
    localStorage.setItem('portal-refreshToken', refreshToken);
    localStorage.setItem('portal-account', JSON.stringify(account));
    localStorage.setItem('portal-client', JSON.stringify(client));

    set({
      accessToken,
      refreshToken,
      account,
      client,
      isAuthenticated: true,
    });
  },

  setTokens: ({ accessToken, refreshToken }) => {
    localStorage.setItem('portal-accessToken', accessToken);
    localStorage.setItem('portal-refreshToken', refreshToken);
    set({ accessToken, refreshToken });
  },

  logout: () => {
    // Clear localStorage
    localStorage.removeItem('portal-accessToken');
    localStorage.removeItem('portal-refreshToken');
    localStorage.removeItem('portal-account');
    localStorage.removeItem('portal-client');

    set({
      accessToken: null,
      refreshToken: null,
      account: null,
      client: null,
      isAuthenticated: false,
    });
  },

  updateClient: (clientData) => {
    set((state) => {
      const updatedClient = { ...state.client, ...clientData };
      localStorage.setItem('portal-client', JSON.stringify(updatedClient));
      return { client: updatedClient };
    });
  },

  // Hydrate from localStorage on app start
  hydrate: () => {
    try {
      const accessToken = localStorage.getItem('portal-accessToken');
      const refreshToken = localStorage.getItem('portal-refreshToken');
      const accountStr = localStorage.getItem('portal-account');
      const clientStr = localStorage.getItem('portal-client');

      if (accessToken && refreshToken) {
        const account = accountStr ? JSON.parse(accountStr) : null;
        const client = clientStr ? JSON.parse(clientStr) : null;

        set({
          accessToken,
          refreshToken,
          account,
          client,
          isAuthenticated: true,
          loading: false,
        });
      } else {
        set({ loading: false });
      }
    } catch (error) {
      console.error('Error hydrating auth state:', error);
      // Clear corrupted data
      localStorage.removeItem('portal-accessToken');
      localStorage.removeItem('portal-refreshToken');
      localStorage.removeItem('portal-account');
      localStorage.removeItem('portal-client');
      set({ loading: false });
    }
  },

  // For backward compatibility
  get token() {
    return get().accessToken;
  },
}));

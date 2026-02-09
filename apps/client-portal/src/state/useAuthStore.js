import { create } from 'zustand';

export const useAuthStore = create((set, get) => ({
  accessToken: null,
  client: null,
  isAuthenticated: false,
  loading: true,

  setAuth: ({ accessToken, client }) => {
    // Only cache minimal display fields in localStorage (no sensitive data)
    localStorage.setItem('portal-client', JSON.stringify({
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      companyName: client.companyName,
    }));

    set({
      accessToken,
      client,
      isAuthenticated: true,
    });
  },

  setTokens: ({ accessToken }) => {
    set({ accessToken });
  },

  logout: () => {
    localStorage.removeItem('portal-client');

    set({
      accessToken: null,
      client: null,
      isAuthenticated: false,
    });
  },

  updateClient: (clientData) => {
    set((state) => {
      const updatedClient = { ...state.client, ...clientData };
      // Update localStorage cache with only display fields
      localStorage.setItem('portal-client', JSON.stringify({
        id: updatedClient.id,
        firstName: updatedClient.firstName,
        lastName: updatedClient.lastName,
        companyName: updatedClient.companyName,
      }));
      return { client: updatedClient };
    });
  },

  // Hydrate cached UI data from localStorage, then refresh via cookie
  hydrate: () => {
    try {
      const clientStr = localStorage.getItem('portal-client');

      if (clientStr) {
        const client = JSON.parse(clientStr);

        set({
          client,
          // Don't set isAuthenticated yet - need access token from refresh
          isAuthenticated: false,
          loading: true,
        });
      } else {
        set({ loading: false });
      }
    } catch {
      localStorage.removeItem('portal-client');
      set({ loading: false });
    }
  },

  setLoading: (loading) => set({ loading }),

  // For backward compatibility
  get token() {
    return get().accessToken;
  },
}));

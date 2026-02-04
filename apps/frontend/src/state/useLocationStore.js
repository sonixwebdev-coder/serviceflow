import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { queryClient } from '../lib/queryClient';

const useLocationStore = create(
  persist(
    (set, get) => ({
      // State
      locations: [],
      currentLocationId: null,
      isLoading: false,
      isSwitching: false, // True when actively switching locations
      error: null,

      // Actions
      setLocations: (locations, options = {}) => {
        const { isAllOrgLocations = false } = options;
        set({ locations });

        // Auto-select primary location if no current selection
        const current = get().currentLocationId;
        if (!current && locations.length > 0) {
          const primary = locations.find((l) => l.isPrimaryForUser) || locations[0];
          set({ currentLocationId: primary?.id || null });
        }
        // Only reset location if it's not in the list AND this is the full org locations list
        // This prevents resetting when admin has selected a location not in their personal assignments
        if (current && isAllOrgLocations && !locations.find((l) => l.id === current)) {
          const primary = locations.find((l) => l.isPrimaryForUser) || locations[0];
          set({ currentLocationId: primary?.id || null });
        }
      },

      setCurrentLocation: async (locationId) => {
        const previousId = get().currentLocationId;
        if (previousId === locationId) return;

        // Set switching state
        set({ currentLocationId: locationId, isSwitching: true });

        console.log('[LocationStore] Location changed from', previousId, 'to', locationId, '- invalidating queries');
        try {
          // Invalidate and refetch all queries
          await queryClient.invalidateQueries({ refetchType: 'all' });
          // Wait a brief moment for queries to start refetching
          await new Promise((resolve) => setTimeout(resolve, 300));
          console.log('[LocationStore] Queries invalidated successfully');
        } catch (error) {
          console.error('[LocationStore] Error invalidating queries:', error);
        } finally {
          set({ isSwitching: false });
        }
      },

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      // Computed-like getters
      getCurrentLocation: () => {
        const { locations, currentLocationId } = get();
        return locations.find((l) => l.id === currentLocationId) || null;
      },

      // Check if user has multiple locations
      hasMultipleLocations: () => {
        const { locations } = get();
        return locations.length > 1;
      },

      // Reset store
      reset: () => {
        set({
          locations: [],
          currentLocationId: null,
          isLoading: false,
          isSwitching: false,
          error: null,
        });
      },
    }),
    {
      name: 'location-storage',
      partialize: (state) => ({
        currentLocationId: state.currentLocationId,
      }),
    }
  )
);

export default useLocationStore;

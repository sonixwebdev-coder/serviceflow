import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { queryClient } from '../lib/queryClient';

// Query keys that depend on the current location and must be refetched on switch
const LOCATION_DEPENDENT_KEYS = [
  'appointments', 'invoices', 'clients', 'services', 'users',
  'analytics', 'tasks', 'resources', 'time-tracking', 'loyalty',
  'service-orders', 'online-clients',
];

const useLocationStore = create(
  persist(
    (set, get) => ({
      // State
      locations: [],
      currentLocationId: null,
      isLoading: false,
      isSwitching: false, // True when actively switching locations
      error: null,
      // Map of userId -> locationId for cross-session persistence
      userLocationMap: {},

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

      // Silently initialize location on first load without showing the switching overlay.
      // Invalidates queries so data is refetched with the correct X-Location-Id header.
      initLocation: (locationId) => {
        if (get().currentLocationId || !locationId) return;
        set({ currentLocationId: locationId });
        LOCATION_DEPENDENT_KEYS.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: [key] }).catch(() => {});
        });
      },

      setCurrentLocation: async (locationId) => {
        const previousId = get().currentLocationId;
        if (previousId === locationId) return;

        // Set switching state
        set({ currentLocationId: locationId, isSwitching: true });

        // Persist to user-location map
        const userId = get()._activeUserId;
        if (userId) {
          set((s) => ({ userLocationMap: { ...s.userLocationMap, [userId]: locationId } }));
        }

        try {
          // Invalidate only location-dependent queries
          await Promise.all(
            LOCATION_DEPENDENT_KEYS.map((key) =>
              queryClient.invalidateQueries({ queryKey: [key] })
            )
          );
          // Wait a brief moment for queries to start refetching
          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch (error) {
          // Silently handle invalidation errors
        } finally {
          set({ isSwitching: false });
        }
      },

      /**
       * Called on login to restore the user's previously selected location.
       * If a stored preference exists and matches available locations, use it.
       * Otherwise falls back to primary or first location.
       */
      restoreForUser: (userId, locations) => {
        set({ _activeUserId: userId, locations });
        const stored = get().userLocationMap[userId];
        if (stored && locations.find((l) => l.id === stored)) {
          set({ currentLocationId: stored });
        } else {
          const primary = locations.find((l) => l.isPrimaryForUser) || locations[0];
          set({ currentLocationId: primary?.id || null });
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

      // Reset transient state on logout - preserves userLocationMap
      reset: () => {
        // Save current location to map before clearing
        const { _activeUserId, currentLocationId, userLocationMap } = get();
        const updatedMap = _activeUserId && currentLocationId
          ? { ...userLocationMap, [_activeUserId]: currentLocationId }
          : userLocationMap;

        set({
          locations: [],
          currentLocationId: null,
          isLoading: false,
          isSwitching: false,
          error: null,
          _activeUserId: null,
          userLocationMap: updatedMap,
        });
      },
    }),
    {
      name: 'location-storage',
      partialize: (state) => ({
        currentLocationId: state.currentLocationId,
        userLocationMap: state.userLocationMap,
      }),
    }
  )
);

export default useLocationStore;

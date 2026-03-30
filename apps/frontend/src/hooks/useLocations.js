import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchLocations,
  fetchMyLocations,
  fetchLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
  assignUsersToLocation,
  removeUsersFromLocation,
} from '../services/locationService';
import useLocationStore from '../state/useLocationStore';
import { useAuthStore } from '../state/useAuthStore';

/**
 * Hook to manage user's accessible locations
 * Automatically syncs with the location store
 */
export const useMyLocations = (options = {}) => {
  const { enabled = true } = options;
  const { setLocations, setLoading, setError, restoreForUser } = useLocationStore();
  const user = useAuthStore((s) => s.user);
  const restoredRef = useRef(null); // track which userId we already restored for

  const query = useQuery({
    queryKey: ['my-locations'],
    queryFn: fetchMyLocations,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Sync with store - on first load per user, restore persisted location
  useEffect(() => {
    if (query.data) {
      if (user?.id && restoredRef.current !== user.id) {
        restoredRef.current = user.id;
        restoreForUser(user.id, query.data);
      } else {
        setLocations(query.data);
      }
    }
  }, [query.data, setLocations, restoreForUser, user?.id]);

  useEffect(() => {
    setLoading(query.isLoading);
  }, [query.isLoading, setLoading]);

  useEffect(() => {
    if (query.error) {
      setError(query.error.message || 'Failed to load locations');
    }
  }, [query.error, setError]);

  return {
    locations: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    refresh: query.refetch,
  };
};

/**
 * Hook to manage all locations (admin view)
 */
export const useLocations = (initialFilters = {}, options = {}) => {
  const { enabled = true } = options;
  const [filters, setFilters] = useState(initialFilters);
  const queryKey = useMemo(() => ['locations', filters], [filters]);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchLocations(filters),
    enabled,
  });

  const errorMessage = useMemo(
    () => query.error?.message || (query.error ? String(query.error) : null),
    [query.error]
  );

  return {
    locations: query.data?.items || [],
    pagination: query.data?.pagination || null,
    loading: query.isLoading,
    error: errorMessage,
    filters,
    setFilters,
    refresh: query.refetch,
  };
};

/**
 * Hook to fetch all organization locations (for admin location switcher)
 * Returns all locations without pagination
 */
export const useAllOrgLocations = (options = {}) => {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: ['all-locations'],
    queryFn: () => fetchLocations({ limit: 100 }),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    locations: query.data?.items || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    refresh: query.refetch,
  };
};

/**
 * Hook to manage a single location
 */
export const useLocation = (locationId, options = {}) => {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: ['location', locationId],
    queryFn: () => fetchLocationById(locationId),
    enabled: enabled && !!locationId,
  });

  return {
    location: query.data || null,
    loading: query.isLoading,
    error: query.error?.message || null,
    refresh: query.refetch,
  };
};

/**
 * Hook for location mutations (create, update, delete)
 */
export const useLocationMutations = () => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['my-locations'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ locationId, data }) => updateLocation(locationId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['my-locations'] });
      queryClient.invalidateQueries({ queryKey: ['location', variables.locationId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['my-locations'] });
    },
  });

  const assignUsersMutation = useMutation({
    mutationFn: ({ locationId, userIds, setPrimary }) =>
      assignUsersToLocation(locationId, userIds, setPrimary),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['location', variables.locationId] });
      queryClient.invalidateQueries({ queryKey: ['my-locations'] });
    },
  });

  const removeUsersMutation = useMutation({
    mutationFn: ({ locationId, userIds }) => removeUsersFromLocation(locationId, userIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['location', variables.locationId] });
      queryClient.invalidateQueries({ queryKey: ['my-locations'] });
    },
  });

  return {
    createLocation: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error?.message || null,

    updateLocation: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error?.message || null,

    deleteLocation: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error?.message || null,

    assignUsers: assignUsersMutation.mutateAsync,
    isAssigning: assignUsersMutation.isPending,
    assignError: assignUsersMutation.error?.message || null,

    removeUsers: removeUsersMutation.mutateAsync,
    isRemoving: removeUsersMutation.isPending,
    removeError: removeUsersMutation.error?.message || null,
  };
};

export default useLocations;

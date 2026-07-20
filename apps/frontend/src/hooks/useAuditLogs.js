import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchAuditLogs,
  fetchActivityFeed,
  fetchEntityActivity,
} from '../services/auditLogService';

/**
 * Hook for fetching paginated audit logs with filtering
 */
export function useAuditLogs(filters = {}) {
  return useQuery({
    queryKey: ['auditLogs', filters],
    queryFn: () => fetchAuditLogs(filters),
    staleTime: 30000,
  });
}

/**
 * Hook for fetching activity feed
 */
export function useActivityFeed(options = {}) {
  const { limit = 30, types = null, enabled = true } = options;

  return useQuery({
    queryKey: ['activityFeed', { limit, types }],
    queryFn: () => fetchActivityFeed({ limit, types: types?.join(',') }),
    staleTime: 10000,
    refetchInterval: 30000,
    enabled,
  });
}

/**
 * Hook for fetching entity-specific activity
 */
export function useEntityActivity(entityType, entityId, options = {}) {
  const { limit = 20, enabled = true } = options;

  return useQuery({
    queryKey: ['entityActivity', entityType, entityId, limit],
    queryFn: () => fetchEntityActivity(entityType, entityId, limit),
    staleTime: 30000,
    enabled: enabled && !!entityType && !!entityId,
  });
}

/**
 * Hook to invalidate audit log queries (for real-time updates)
 */
export function useInvalidateAuditLogs() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
      queryClient.invalidateQueries({ queryKey: ['activityFeed'] });
    },
    invalidateEntity: (entityType, entityId) => {
      queryClient.invalidateQueries({ queryKey: ['entityActivity', entityType, entityId] });
    },
    addToFeed: (auditLog) => {
      // Optimistically add new audit log to feed
      queryClient.setQueryData(['activityFeed', { limit: 30, types: null }], (old) => {
        if (!old) return [auditLog];
        return [auditLog, ...old.slice(0, 29)];
      });
    },
  };
}

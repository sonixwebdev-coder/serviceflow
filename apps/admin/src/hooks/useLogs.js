import { useQuery } from '@tanstack/react-query';
import * as logService from '@/services/logService';

export function useLogs(params = {}, { autoRefresh = false } = {}) {
  return useQuery({
    queryKey: ['logs', params],
    queryFn: () => logService.getLogs(params),
    refetchInterval: autoRefresh ? 10_000 : false,
  });
}

export function useLogStats({ autoRefresh = true } = {}) {
  return useQuery({
    queryKey: ['logs', 'stats'],
    queryFn: logService.getLogStats,
    refetchInterval: autoRefresh ? 30_000 : false,
  });
}

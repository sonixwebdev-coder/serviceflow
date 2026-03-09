import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as maintenanceService from '@/services/maintenanceService';

export function useMaintenanceStats() {
  return useQuery({
    queryKey: ['maintenance-stats'],
    queryFn: maintenanceService.getMaintenanceStats,
  });
}

export function useRunCleanup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: maintenanceService.runCleanup,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance-stats'] });
    },
  });
}

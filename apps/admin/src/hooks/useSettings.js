import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as settingsService from '@/services/settingsService';

export function useSettings() {
  return useQuery({
    queryKey: ['platformSettings'],
    queryFn: settingsService.getSettings,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: settingsService.updateSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platformSettings'] });
    },
  });
}

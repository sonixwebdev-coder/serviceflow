import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCompanySettings, updateCompanySettings } from '../services/settingsService';

export const useCompanySettings = (options = {}) => {
  return useQuery({
    queryKey: ['company-settings'],
    queryFn: fetchCompanySettings,
    ...options,
  });
};

export const useUpdateCompanySettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCompanySettings,
    onSuccess: (data) => {
      queryClient.setQueryData(['company-settings'], data);
    },
  });
};

export default useCompanySettings;

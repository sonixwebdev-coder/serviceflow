import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchServices, updateServices } from '../services/organizationService';

export const useServices = () => {
  const query = useQuery({
    queryKey: ['services'],
    queryFn: fetchServices,
  });

  return {
    services: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    refresh: query.refetch,
  };
};

export const useServicesMutation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateServices,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });

  return {
    updateServices: mutation.mutateAsync,
    isSaving: mutation.isPending,
    error: mutation.error?.message || null,
  };
};

export default useServices;

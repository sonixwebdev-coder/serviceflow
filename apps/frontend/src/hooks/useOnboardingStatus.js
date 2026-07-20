import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCurrentOrganization, updateOrganization } from '../services/organizationService';
import { fetchLocations } from '../services/locationService';
import { fetchServices } from '../services/organizationService';
import useAuth from '../context/useAuth';
import { USER_ROLES } from '../utils/constants';

export const useOnboardingStatus = () => {
  const { isAuthenticated, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = hasRole(USER_ROLES.ADMIN);
  const enabled = isAuthenticated && isAdmin;

  const orgQuery = useQuery({
    queryKey: ['organization-me'],
    queryFn: fetchCurrentOrganization,
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const locationsQuery = useQuery({
    queryKey: ['locations-check'],
    queryFn: () => fetchLocations({ limit: 1 }),
    enabled: enabled && orgQuery.isSuccess && !orgQuery.data?.settings?.onboardingCompleted,
    staleTime: 5 * 60 * 1000,
  });

  const servicesQuery = useQuery({
    queryKey: ['services-check'],
    queryFn: fetchServices,
    enabled: enabled && orgQuery.isSuccess && !orgQuery.data?.settings?.onboardingCompleted,
    staleTime: 5 * 60 * 1000,
  });

  const hasExistingSetup = () => {
    const hasLocations = (locationsQuery.data?.items?.length || 0) > 0;
    const hasServices = (servicesQuery.data?.length || 0) > 0;
    return hasLocations || hasServices;
  };

  const isOnboardingCompleted =
    !enabled ||
    orgQuery.data?.settings?.onboardingCompleted === true ||
    (orgQuery.isSuccess && hasExistingSetup());

  const isLoading =
    enabled &&
    (orgQuery.isLoading ||
      (!orgQuery.data?.settings?.onboardingCompleted &&
        (locationsQuery.isLoading || servicesQuery.isLoading)));

  const markCompletedMutation = useMutation({
    mutationFn: async () => {
      // Fetch fresh org data to avoid overwriting settings saved by other endpoints (e.g. services)
      const freshOrg = await fetchCurrentOrganization();
      const existingSettings = freshOrg?.settings || {};
      return updateOrganization({
        settings: { ...existingSettings, onboardingCompleted: true },
      });
    },
    onSuccess: (updatedOrg) => {
      // Update cache immediately so ProtectedRoute sees the change before refetch
      queryClient.setQueryData(['organization-me'], (old) => ({
        ...old,
        ...updatedOrg,
        settings: { ...old?.settings, ...updatedOrg?.settings, onboardingCompleted: true },
      }));
    },
  });

  return {
    isOnboardingCompleted,
    isLoading,
    isAdmin,
    organization: orgQuery.data,
    markCompleted: markCompletedMutation.mutateAsync,
    isMarkingCompleted: markCompletedMutation.isPending,
  };
};

export default useOnboardingStatus;

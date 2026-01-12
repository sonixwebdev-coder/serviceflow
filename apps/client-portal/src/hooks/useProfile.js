import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService } from '../services/profileService';
import { useAuthStore } from '../state/useAuthStore';

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => profileService.getProfile(),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const updateClient = useAuthStore((state) => state.updateClient);

  return useMutation({
    mutationFn: (data) => profileService.updateProfile(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      updateClient(data);
    },
  });
}

export function useVehicles() {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: () => profileService.getVehicles(),
  });
}

export function useAssets() {
  return useQuery({
    queryKey: ['assets'],
    queryFn: () => profileService.getAssets(),
  });
}

export function useUpdateEmail() {
  return useMutation({
    mutationFn: ({ email, password }) => profileService.updateEmail(email, password),
  });
}

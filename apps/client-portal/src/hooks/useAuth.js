import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { useAuthStore } from '../state/useAuthStore';

/**
 * Simple hook to access current auth state
 */
export function useAuth() {
  const { client, accessToken, isAuthenticated } = useAuthStore();
  return { client, accessToken, isAuthenticated };
}

export function useLogin() {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: ({ email, password }) => authService.login(email, password),
    onSuccess: (data) => {
      setAuth(data);
    },
  });
}

export function useLogout() {
  const logout = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      logout();
      queryClient.clear();
    },
  });
}

export function useMe() {
  const { accessToken } = useAuthStore();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const data = await authService.getMe();
      setAuth({ accessToken, client: data.client });
      return data;
    },
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email) => authService.forgotPassword(email),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, password }) => authService.resetPassword(token, password),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }) =>
      authService.changePassword(currentPassword, newPassword),
  });
}

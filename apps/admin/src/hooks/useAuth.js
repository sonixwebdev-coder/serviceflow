import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@/state/useAuthStore';
import * as authService from '@/services/authService';

export function useLogin() {
  const loginStore = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      if (!data.user?.isSuperAdmin) {
        throw new Error('Access denied: not a super admin');
      }
      loginStore({ user: data.user, accessToken: data.accessToken });
      navigate('/', { replace: true });
    },
  });
}

export function useLogout() {
  const logoutStore = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authService.logout,
    onSettled: () => {
      logoutStore();
      navigate('/login', { replace: true });
    },
  });
}

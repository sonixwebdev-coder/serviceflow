import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loyaltyService } from '@/services/loyaltyService';

export function useLoyaltyDashboard() {
  return useQuery({
    queryKey: ['loyalty-dashboard'],
    queryFn: () => loyaltyService.getDashboard(),
    staleTime: 30_000,
  });
}

export function useLoyaltyTransactions(params = {}) {
  return useQuery({
    queryKey: ['loyalty-transactions', params],
    queryFn: () => loyaltyService.getTransactions(params),
    staleTime: 30_000,
  });
}

export function useLoyaltyReferral() {
  return useQuery({
    queryKey: ['loyalty-referral'],
    queryFn: () => loyaltyService.getReferral(),
    staleTime: 30_000,
  });
}

export function useApplyReferral() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code) => loyaltyService.applyReferralCode(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty-referral'] });
    },
  });
}

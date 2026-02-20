import { useQuery } from '@tanstack/react-query';
import { loyaltyService } from '@/services/loyaltyService';

export function useLoyaltyDashboard() {
  return useQuery({
    queryKey: ['loyalty-dashboard'],
    queryFn: () => loyaltyService.getDashboard(),
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useLoyaltyTransactions(params = {}) {
  return useQuery({
    queryKey: ['loyalty-transactions', params],
    queryFn: () => loyaltyService.getTransactions(params),
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useLoyaltyReferral() {
  return useQuery({
    queryKey: ['loyalty-referral'],
    queryFn: () => loyaltyService.getReferral(),
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as billingService from '@/services/billingService';

export function useBillingOverview() {
  return useQuery({
    queryKey: ['billing', 'overview'],
    queryFn: billingService.getBillingOverview,
  });
}

export function useSubscriptions(params) {
  return useQuery({
    queryKey: ['billing', 'subscriptions', params],
    queryFn: () => billingService.getSubscriptions(params),
  });
}

export function useChangePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: billingService.changePlan,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing'] });
      qc.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

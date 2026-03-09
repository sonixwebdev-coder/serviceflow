import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as billingService from '@/services/billingService';

export function useBillingOverview() {
  return useQuery({
    queryKey: ['billing', 'overview'],
    queryFn: billingService.getBillingOverview,
  });
}

export function useBillingStats() {
  return useQuery({
    queryKey: ['billing', 'stats'],
    queryFn: billingService.getBillingStats,
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

export function useExtendTrial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: billingService.extendTrial,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing'] });
      qc.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

export function useOverridePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: billingService.overridePlan,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing'] });
      qc.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

export function useProcessRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: billingService.processRefund,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing'] });
    },
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: billingService.cancelSubscription,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing'] });
      qc.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

export function useReactivateOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: billingService.reactivateOrg,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing'] });
      qc.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

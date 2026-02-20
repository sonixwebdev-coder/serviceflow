import { useQuery } from '@tanstack/react-query';
import * as statsService from '@/services/statsService';

export function useOverview() {
  return useQuery({
    queryKey: ['stats', 'overview'],
    queryFn: statsService.getOverview,
  });
}

export function useGrowth() {
  return useQuery({
    queryKey: ['stats', 'growth'],
    queryFn: statsService.getGrowth,
  });
}

export function usePlans() {
  return useQuery({
    queryKey: ['stats', 'plans'],
    queryFn: statsService.getPlans,
  });
}

export function useSectors() {
  return useQuery({
    queryKey: ['stats', 'sectors'],
    queryFn: statsService.getSectors,
  });
}

export function useActivity() {
  return useQuery({
    queryKey: ['stats', 'activity'],
    queryFn: statsService.getActivity,
  });
}

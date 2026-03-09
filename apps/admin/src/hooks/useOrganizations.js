import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as orgService from '@/services/orgService';

export function useOrganizations(params) {
  return useQuery({
    queryKey: ['organizations', params],
    queryFn: () => orgService.getOrganizations(params),
  });
}

export function useOrganization(id) {
  return useQuery({
    queryKey: ['organization', id],
    queryFn: () => orgService.getOrganization(id),
    enabled: !!id,
  });
}

export function useUpdateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: orgService.updateOrganization,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['organization', variables.id] });
      qc.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

export function useSuspendOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: orgService.suspendOrganization,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] });
      qc.invalidateQueries({ queryKey: ['organization'] });
    },
  });
}

export function useActivateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: orgService.activateOrganization,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] });
      qc.invalidateQueries({ queryKey: ['organization'] });
    },
  });
}

export function useGrantPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: orgService.grantPlan,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['organization', variables.id] });
      qc.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

export function useRevokeOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: orgService.revokeOverride,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['organization', variables.id] });
      qc.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

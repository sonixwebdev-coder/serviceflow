import { useQuery } from '@tanstack/react-query';
import { marketplaceService } from '../services/marketplaceService';

export function useMarketplaceOrganizations(filters) {
  return useQuery({
    queryKey: ['marketplace', 'organizations', filters],
    queryFn: () => marketplaceService.listOrganizations(filters),
    staleTime: 10 * 60 * 1000,
  });
}

export function useMarketplaceOrganization(slug) {
  return useQuery({
    queryKey: ['marketplace', 'organization', slug],
    queryFn: () => marketplaceService.getOrganization(slug),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
  });
}

export function useMarketplaceStats() {
  return useQuery({
    queryKey: ['marketplace', 'stats'],
    queryFn: () => marketplaceService.getStats(),
    staleTime: 30 * 60 * 1000,
  });
}

export function useMarketplaceFilters() {
  return useQuery({
    queryKey: ['marketplace', 'filters'],
    queryFn: () => marketplaceService.getFilters(),
    staleTime: 30 * 60 * 1000,
  });
}

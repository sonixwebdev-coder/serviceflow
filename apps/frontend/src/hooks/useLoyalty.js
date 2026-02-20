import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getLoyaltyProgram,
  updateLoyaltyProgram,
  getClientLoyaltyAccount,
  adjustPoints,
  getLoyaltyAnalytics,
  getLoyaltyAccounts,
  getLoyaltyTransactions,
} from '../services/loyaltyService';

export const useLoyaltyProgram = () => {
  return useQuery({
    queryKey: ['loyalty-program'],
    queryFn: getLoyaltyProgram,
    staleTime: 0,
    refetchOnMount: 'always',
  });
};

export const useUpdateLoyaltyProgram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateLoyaltyProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-program'] });
    },
  });
};

export const useClientLoyalty = (clientId) => {
  return useQuery({
    queryKey: ['client-loyalty', clientId],
    queryFn: () => getClientLoyaltyAccount(clientId),
    enabled: !!clientId,
    staleTime: 0,
    refetchOnMount: 'always',
  });
};

export const useAdjustPoints = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, data }) => adjustPoints(clientId, data),
    onSuccess: (_, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['client-loyalty', clientId] });
      queryClient.invalidateQueries({ queryKey: ['loyalty-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty-transactions'] });
    },
  });
};

export const useLoyaltyAccounts = (params = {}) => {
  return useQuery({
    queryKey: ['loyalty-accounts', params],
    queryFn: () => getLoyaltyAccounts(params),
    staleTime: 0,
    refetchOnMount: 'always',
  });
};

export const useLoyaltyTransactions = (params = {}) => {
  return useQuery({
    queryKey: ['loyalty-transactions', params],
    queryFn: () => getLoyaltyTransactions(params),
    staleTime: 0,
    refetchOnMount: 'always',
  });
};

export const useLoyaltyAnalytics = (params = {}) => {
  return useQuery({
    queryKey: ['loyalty-analytics', params],
    queryFn: () => getLoyaltyAnalytics(params),
    staleTime: 0,
    refetchOnMount: 'always',
  });
};

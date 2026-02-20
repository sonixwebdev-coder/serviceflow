import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as supportService from '../services/supportService';

export function useTickets(params) {
  return useQuery({
    queryKey: ['supportTickets', params],
    queryFn: () => supportService.getTickets(params),
  });
}

export function useTicket(id) {
  return useQuery({
    queryKey: ['supportTickets', id],
    queryFn: () => supportService.getTicket(id),
    enabled: !!id,
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: supportService.createTicket,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supportTickets'] });
    },
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: supportService.sendMessage,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['supportTickets', variables.ticketId] });
    },
  });
}

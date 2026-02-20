import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ticketService from '@/services/ticketService';

export function useTickets(params) {
  return useQuery({
    queryKey: ['tickets', params],
    queryFn: () => ticketService.getTickets(params),
  });
}

export function useTicketStats() {
  return useQuery({
    queryKey: ['tickets', 'stats'],
    queryFn: ticketService.getTicketStats,
  });
}

export function useTicket(id) {
  return useQuery({
    queryKey: ['tickets', id],
    queryFn: () => ticketService.getTicket(id),
    enabled: !!id,
  });
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ticketService.updateTicket,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ticketService.sendMessage,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['tickets', variables.ticketId] });
    },
  });
}

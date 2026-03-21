import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as contactMessageService from '@/services/contactMessageService';

export function useContactMessages(params) {
  return useQuery({
    queryKey: ['contact-messages', params],
    queryFn: () => contactMessageService.getMessages(params),
  });
}

export function useContactMessageStats() {
  return useQuery({
    queryKey: ['contact-messages', 'stats'],
    queryFn: contactMessageService.getStats,
  });
}

export function useUpdateContactMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: contactMessageService.updateMessage,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact-messages'] });
    },
  });
}

export function useDeleteContactMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: contactMessageService.deleteMessage,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact-messages'] });
    },
  });
}

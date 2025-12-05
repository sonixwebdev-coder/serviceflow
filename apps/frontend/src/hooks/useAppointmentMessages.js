import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAppointmentMessages,
  sendAppointmentMessage,
} from '../services/appointmentService';
import { getSocket } from '../lib/socket.js';

export const useAppointmentMessages = (appointmentId) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['appointment-messages', appointmentId],
    enabled: Boolean(appointmentId),
    queryFn: () => fetchAppointmentMessages(appointmentId),
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !appointmentId) return;

    socket.emit('appointment:join', appointmentId);

    const handleMessage = (message) => {
      if (message?.appointmentId === appointmentId) {
        queryClient.setQueryData(['appointment-messages', appointmentId], (current = []) => {
          const exists = current.some((entry) => entry.id === message.id);
          return exists ? current : [...current, message];
        });
      }
    };

    socket.on('message:new', handleMessage);

    return () => {
      socket.off('message:new', handleMessage);
      socket.emit('appointment:leave', appointmentId);
    };
  }, [appointmentId, queryClient]);

  const mutation = useMutation({
    mutationFn: ({ body, type, metadata }) => sendAppointmentMessage(appointmentId, { body, type, metadata }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-messages', appointmentId] });
    },
  });

  return {
    messages: query.data || [],
    loading: query.isLoading,
    error: query.error,
    refresh: query.refetch,
    sendMessage: mutation.mutateAsync,
    sending: mutation.isPending,
  };
};

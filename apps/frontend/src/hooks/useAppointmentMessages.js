import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAppointmentMessages,
  sendAppointmentMessage,
  uploadMessageFile,
  uploadMessageVoice,
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

  const sendMutation = useMutation({
    mutationFn: ({ body, type, metadata }) => sendAppointmentMessage(appointmentId, { body, type, metadata }),
    onSuccess: (newMessage) => {
      queryClient.setQueryData(['appointment-messages', appointmentId], (current = []) => {
        const exists = current.some((entry) => entry.id === newMessage.id);
        return exists ? current : [...current, newMessage];
      });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: (file) => uploadMessageFile(appointmentId, file),
    onSuccess: (newMessage) => {
      queryClient.setQueryData(['appointment-messages', appointmentId], (current = []) => {
        const exists = current.some((entry) => entry.id === newMessage.id);
        return exists ? current : [...current, newMessage];
      });
    },
  });

  const uploadVoiceMutation = useMutation({
    mutationFn: ({ audioBlob, duration }) => uploadMessageVoice(appointmentId, audioBlob, duration),
    onSuccess: (newMessage) => {
      queryClient.setQueryData(['appointment-messages', appointmentId], (current = []) => {
        const exists = current.some((entry) => entry.id === newMessage.id);
        return exists ? current : [...current, newMessage];
      });
    },
  });

  return {
    messages: query.data || [],
    loading: query.isLoading,
    error: query.error,
    refresh: query.refetch,
    sendMessage: sendMutation.mutateAsync,
    sending: sendMutation.isPending,
    uploadFile: uploadFileMutation.mutateAsync,
    uploadingFile: uploadFileMutation.isPending,
    uploadVoice: uploadVoiceMutation.mutateAsync,
    uploadingVoice: uploadVoiceMutation.isPending,
  };
};

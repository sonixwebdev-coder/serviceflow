import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { messageService } from '../services/messageService';
import { getSocket } from '../lib/socket';

/**
 * Hook for managing appointment messages
 */
export function useAppointmentMessages(appointmentId) {
  const queryClient = useQueryClient();

  // Query for messages
  const messagesQuery = useQuery({
    queryKey: ['appointment-messages', appointmentId],
    queryFn: () => messageService.getMessages(appointmentId),
    enabled: !!appointmentId,
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
  });

  // Query for unread count
  const unreadCountQuery = useQuery({
    queryKey: ['appointment-messages-unread', appointmentId],
    queryFn: () => messageService.getUnreadCount(appointmentId),
    enabled: !!appointmentId,
  });

  // Mutation for sending messages
  const sendMessageMutation = useMutation({
    mutationFn: ({ body, type, metadata }) =>
      messageService.sendMessage(appointmentId, { body, type, metadata }),
    onSuccess: (newMessage) => {
      // Optimistically add the message to the cache
      queryClient.setQueryData(['appointment-messages', appointmentId], (old) =>
        old ? [...old, newMessage] : [newMessage]
      );
    },
  });

  // Mutation for uploading files
  const uploadFileMutation = useMutation({
    mutationFn: (file) => messageService.uploadFile(appointmentId, file),
    onSuccess: (newMessage) => {
      queryClient.setQueryData(['appointment-messages', appointmentId], (old) =>
        old ? [...old, newMessage] : [newMessage]
      );
    },
  });

  // Mutation for uploading voice
  const uploadVoiceMutation = useMutation({
    mutationFn: ({ audioBlob, duration }) =>
      messageService.uploadVoice(appointmentId, audioBlob, duration),
    onSuccess: (newMessage) => {
      queryClient.setQueryData(['appointment-messages', appointmentId], (old) =>
        old ? [...old, newMessage] : [newMessage]
      );
    },
  });

  // Mutation for marking messages as read
  const markAsReadMutation = useMutation({
    mutationFn: () => messageService.markAsRead(appointmentId),
    onSuccess: () => {
      queryClient.invalidateQueries(['appointment-messages-unread', appointmentId]);
      // Update messages to mark them as read
      queryClient.setQueryData(['appointment-messages', appointmentId], (old) =>
        old?.map((msg) => ({ ...msg, isRead: true })) || []
      );
    },
  });

  // Handle real-time message updates
  const handleNewMessage = useCallback(
    (message) => {
      if (message.appointmentId === appointmentId) {
        queryClient.setQueryData(['appointment-messages', appointmentId], (old) => {
          // Check if message already exists to prevent duplicates
          if (old?.some((m) => m.id === message.id)) {
            return old;
          }
          return old ? [...old, message] : [message];
        });

        // Update unread count
        queryClient.invalidateQueries(['appointment-messages-unread', appointmentId]);
      }
    },
    [appointmentId, queryClient]
  );

  // Set up socket listener for real-time updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !appointmentId) return;

    socket.on('portal:message:new', handleNewMessage);

    return () => {
      socket.off('portal:message:new', handleNewMessage);
    };
  }, [appointmentId, handleNewMessage]);

  return {
    // Messages data
    messages: messagesQuery.data || [],
    isLoading: messagesQuery.isLoading,
    isError: messagesQuery.isError,
    error: messagesQuery.error,
    refetch: messagesQuery.refetch,

    // Unread count
    unreadCount: unreadCountQuery.data?.count || 0,

    // Send message
    sendMessage: sendMessageMutation.mutate,
    isSending: sendMessageMutation.isPending,
    sendError: sendMessageMutation.error,

    // Upload file
    uploadFile: uploadFileMutation.mutate,
    isUploadingFile: uploadFileMutation.isPending,

    // Upload voice
    uploadVoice: uploadVoiceMutation.mutate,
    isUploadingVoice: uploadVoiceMutation.isPending,

    // Mark as read
    markAsRead: markAsReadMutation.mutate,
  };
}

/**
 * Hook for getting unread message count for an appointment
 */
export function useUnreadMessageCount(appointmentId) {
  return useQuery({
    queryKey: ['appointment-messages-unread', appointmentId],
    queryFn: () => messageService.getUnreadCount(appointmentId),
    enabled: !!appointmentId,
  });
}

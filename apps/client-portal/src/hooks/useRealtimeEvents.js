import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';
import { useAuthStore } from '@/state/useAuthStore';
import useToast from '@/context/useToast';

/**
 * Real-time events hook for client portal
 * Manages socket connection and real-time event handling
 */
export const useRealtimeEvents = () => {
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const { accessToken, client } = useAuthStore();
  const { showToast } = useToast();

  // Handle new message event
  const handleNewMessage = useCallback(
    (message) => {
      // Update messages cache for the specific appointment
      queryClient.setQueryData(
        ['appointment-messages', message.appointmentId],
        (old) => {
          if (!old) return [message];
          // Check if message already exists
          if (old.some((m) => m.id === message.id)) {
            return old;
          }
          return [...old, message];
        }
      );

      // Show toast notification if message is from CRM staff (not from self)
      const isOwnMessage = message.clientAuthorId === client?.id;

      if (!isOwnMessage && message.author) {
        const authorName = message.author.firstName
          ? `${message.author.firstName} ${message.author.lastName || ''}`.trim()
          : 'Echipa';

        // Get message preview
        let messagePreview = message.body || '';
        if (message.type === 'file') {
          const isVoice = message.metadata?.isVoice;
          messagePreview = isVoice ? 'A trimis un mesaj vocal' : 'A trimis un fisier';
        } else if (messagePreview.length > 50) {
          messagePreview = messagePreview.substring(0, 47) + '...';
        }

        showToast({
          title: 'Mesaj nou',
          description: `${authorName}: ${messagePreview}`,
          type: 'info',
        });
      }

      // Invalidate unread count
      queryClient.invalidateQueries([
        'appointment-messages-unread',
        message.appointmentId,
      ]);
    },
    [queryClient, client?.id, showToast]
  );

  // Handle typing indicator event
  const handleTyping = useCallback(
    (data) => {
      // You can implement typing indicator state here if needed
      console.log('[Socket] Typing indicator:', data);
    },
    []
  );

  // Handle appointment update event
  const handleAppointmentUpdate = useCallback(
    (appointment) => {
      queryClient.setQueryData(['appointment', appointment.id], (old) =>
        old ? { ...old, ...appointment } : appointment
      );
      queryClient.invalidateQueries(['appointments']);
      queryClient.invalidateQueries(['upcoming-appointments']);
    },
    [queryClient]
  );

  // Handle invoice update event
  const handleInvoiceUpdate = useCallback(
    (invoice) => {
      queryClient.setQueryData(['invoice', invoice.id], (old) =>
        old ? { ...old, ...invoice } : invoice
      );
      queryClient.invalidateQueries(['invoices']);
    },
    [queryClient]
  );

  useEffect(() => {
    if (!accessToken || !client?.id) {
      return;
    }

    // Connect to socket
    const socket = connectSocket(accessToken, client.id);

    if (!socket) return;

    // Set up event listeners
    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Message events
    socket.on('portal:message:new', handleNewMessage);
    socket.on('portal:message:typing', handleTyping);

    // Appointment events
    socket.on('portal:appointment:updated', handleAppointmentUpdate);
    socket.on('portal:appointment:cancelled', handleAppointmentUpdate);

    // Invoice events
    socket.on('portal:invoice:updated', handleInvoiceUpdate);
    socket.on('portal:invoice:paid', handleInvoiceUpdate);

    // Cleanup
    return () => {
      socket.off('portal:message:new', handleNewMessage);
      socket.off('portal:message:typing', handleTyping);
      socket.off('portal:appointment:updated', handleAppointmentUpdate);
      socket.off('portal:appointment:cancelled', handleAppointmentUpdate);
      socket.off('portal:invoice:updated', handleInvoiceUpdate);
      socket.off('portal:invoice:paid', handleInvoiceUpdate);
    };
  }, [
    accessToken,
    client?.id,
    handleNewMessage,
    handleTyping,
    handleAppointmentUpdate,
    handleInvoiceUpdate,
    showToast,
  ]);

  // Disconnect on unmount
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);

  return {
    socket: getSocket(),
    isConnected,
  };
};

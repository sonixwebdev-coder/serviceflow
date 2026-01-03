import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSocket, disconnectSocket, getSocket, updateSocketToken } from '../lib/socket.js';
import { useAuthStore } from '../state/useAuthStore.js';
import { useChatStore } from '../state/useChatStore.js';
import useToast from '../context/useToast';
import { refreshAuthSession } from '../utils/api.js';

export const useRealtimeEvents = () => {
  const { accessToken, user } = useAuthStore();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  useEffect(() => {
    if (!accessToken) {
      disconnectSocket();
      return;
    }

    const socket = connectSocket(accessToken);
    if (!socket) return;

    const authErrorCodes = new Set(['AUTH_MISSING_TOKEN', 'AUTH_INVALID_TOKEN', 'AUTH_TOKEN_EXPIRED']);
    const invalidate = (keys) => {
      keys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    };

    let lastAuthError = null;
    let refreshingSocket = false;
    let authFailureCount = 0;
    let hasShownConnectionErrorToast = false;
    let hasShownDisconnectToast = false;
    const MAX_AUTH_FAILURES = 3;

    const attemptSocketRefresh = async () => {
      if (refreshingSocket) return;

      // Stop trying after too many failures
      if (authFailureCount >= MAX_AUTH_FAILURES) {
        console.warn('Socket auth failed too many times, stopping reconnection attempts');
        disconnectSocket();
        return;
      }

      refreshingSocket = true;
      try {
        const payload = await refreshAuthSession();
        const nextToken = payload?.accessToken || useAuthStore.getState().accessToken;
        if (nextToken) {
          updateSocketToken(nextToken);
          lastAuthError = null;
          authFailureCount = 0; // Reset on success
          if (!socket.connected) {
            socket.connect();
          }
        }
      } catch (refreshError) {
        authFailureCount++;
        console.error(`Socket authentication refresh failed (${authFailureCount}/${MAX_AUTH_FAILURES})`, refreshError);

        if (authFailureCount >= MAX_AUTH_FAILURES) {
          disconnectSocket();
          showToast({
            title: 'Sesiunea a expirat',
            description: 'Te rugam sa te reconectezi.',
            type: 'error',
          });
        }
      } finally {
        refreshingSocket = false;
      }
    };

    const handleConnectError = async (error) => {
      console.error('Socket connection error', error);
      const message = error?.message;

      if (message === 'AUTH_RATE_LIMIT_EXCEEDED') {
        console.warn('Socket auth rate limit exceeded, waiting before retry');
        disconnectSocket();
        if (!hasShownConnectionErrorToast) {
          hasShownConnectionErrorToast = true;
          showToast({
            title: 'Prea multe incercari de conectare',
            description: 'Te rugam sa astepti un minut inainte sa incerci din nou.',
            type: 'warning',
          });
        }
        return;
      }

      if (authErrorCodes.has(message)) {
        lastAuthError = message;
        await attemptSocketRefresh();
      } else {
        // Only show the toast once, then just log subsequent errors
        if (!hasShownConnectionErrorToast) {
          hasShownConnectionErrorToast = true;
          showToast({
            title: 'Conexiunea in timp real a fost intrerupta',
            description: 'Vom incerca sa reconectam automat.',
            type: 'warning',
          });
        } else {
          console.warn('Socket connection error (toast already shown):', message);
        }
      }
    };

    const handleDisconnect = (reason) => {

      if (authErrorCodes.has(reason) || reason === 'client namespace disconnect') {
        lastAuthError = null;
        return;
      }
      if (lastAuthError && (reason === 'transport close' || reason === 'io server disconnect')) {
        attemptSocketRefresh();
        lastAuthError = null;
        return;
      }

      // Only show the toast once, then just log subsequent disconnects
      if (!hasShownDisconnectToast) {
        hasShownDisconnectToast = true;
        showToast({
          title: 'Conexiunea in timp real a fost intrerupta',
          description: 'Vom incerca sa reconectam automat.',
          type: 'warning',
        });
      } else {
        console.warn('Socket disconnected (toast already shown):', reason);
      }
    };

    const handleConnect = () => {
      // Reset toast flags on successful connection
      hasShownConnectionErrorToast = false;
      hasShownDisconnectToast = false;
      authFailureCount = 0;
    };

    const handleScheduleChange = () => invalidate([['schedules']]);

    const handleTaskChange = () => invalidate([['tasks']]);

    const syncAppointmentData = (appointment) => {
      if (!appointment?.id) return;
      const appointmentId = appointment.id;
      queryClient.setQueryData(['appointment', appointmentId], appointment);
      queryClient.setQueriesData({ queryKey: ['appointments'] }, (current) => {
        if (!Array.isArray(current)) return current;
        const exists = current.some((item) => item.id === appointmentId);
        if (!exists) {
          return [appointment, ...current];
        }
        return current.map((item) => (item.id === appointmentId ? { ...item, ...appointment } : item));
      });
      if (appointment.serviceOrder) {
        queryClient.setQueryData(['service-order', appointmentId], appointment.serviceOrder);
      }
    };

    const handleAppointmentChange = (appointment) => {
      if (appointment?.id) {
        syncAppointmentData(appointment);
      }
      invalidate([['appointments']]);
      if (appointment?.id) {
        queryClient.invalidateQueries({ queryKey: ['appointment', appointment.id] });
        queryClient.invalidateQueries({ queryKey: ['service-order', appointment.id] });
      }
    };

    const handleTimeEntryChange = () => invalidate([['time-tracking']]);

    const handleNotification = (notification) => {
      invalidate([['notifications']]);
      // Always show notification toasts since backend filters recipients
      if (notification?.title) {
        showToast({
          title: notification.title,
          description: notification.message,
          type: 'info',
        });
      }
    };

    const handleTimeOffChange = () => invalidate([['timeoff']]);

    const syncServiceOrderData = (order) => {
      if (!order?.appointmentId) return;
      const appointmentId = order.appointmentId;
      queryClient.setQueryData(['service-order', appointmentId], order);
      queryClient.setQueryData(['appointment', appointmentId], (current) => {
        if (!current) return current;
        return {
          ...current,
          assignees: order.appointment?.assignees || current.assignees,
          serviceOrder: order,
        };
      });
      queryClient.setQueriesData({ queryKey: ['appointments'] }, (current) => {
        if (!Array.isArray(current)) return current;
        return current.map((appointment) => {
          if (appointment.id !== appointmentId) return appointment;
          return {
            ...appointment,
            assignees: order.appointment?.assignees || appointment.assignees,
            serviceOrder: order,
          };
        });
      });
      queryClient.invalidateQueries({ queryKey: ['service-order', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    };

    const handleServiceOrderChange = (order) => {
      syncServiceOrderData(order);
    };

    const syncInvoiceData = (invoice) => {
      if (!invoice?.id) return;
      const invoiceId = invoice.id;

      // Update single invoice cache
      queryClient.setQueryData(['invoice', invoiceId], invoice);

      // Update invoices list
      queryClient.setQueriesData({ queryKey: ['invoices'] }, (current) => {
        if (!Array.isArray(current)) return current;
        const exists = current.some((item) => item.id === invoiceId);
        if (!exists) {
          return [invoice, ...current];
        }
        return current.map((item) => (item.id === invoiceId ? { ...item, ...invoice } : item));
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });

      // Update appointment invoices if appointmentId exists
      if (invoice.appointmentId) {
        queryClient.invalidateQueries({
          queryKey: ['invoices', 'appointment', invoice.appointmentId]
        });
      }
    };

    const handleInvoiceChange = (invoice) => {
      syncInvoiceData(invoice);
    };

    const handleInvoiceDeleted = (data) => {
      if (data?.id) {
        queryClient.removeQueries({ queryKey: ['invoice', data.id] });
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['invoices', 'appointment'] });
      }
    };

    const handleMessageCreated = (message) => {
      if (!message?.appointmentId) return;

      // Note: Toast notifications for messages are handled by the notification system
      // to avoid duplicate toasts

      queryClient.invalidateQueries({ queryKey: ['appointment-messages', message.appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment', message.appointmentId] });
    };

    // Chat event handlers
    const handleChatMessageNew = (data) => {
      const { channelId, message } = data;

      // Update store
      useChatStore.getState().addMessage(channelId, message);

      // Update unread count if not active channel
      const activeChannelId = useChatStore.getState().activeChannelId;
      if (activeChannelId !== channelId && message.author.id !== user?.id) {
        useChatStore.getState().incrementUnreadCount(channelId);
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', channelId] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'channels'] });
    };

    const handleChatMessageUpdated = (data) => {
      const { channelId, message } = data;

      // Update store
      useChatStore.getState().updateMessage(channelId, message.id, message);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', channelId] });
    };

    const handleChatMessageDeleted = (data) => {
      const { channelId, messageId } = data;

      // Update store
      useChatStore.getState().deleteMessage(channelId, messageId);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', channelId] });
    };

    const handleChatTyping = (data) => {
      const { channelId, user: typingUser, isTyping } = data;

      // Don't show own typing indicator
      if (typingUser.id === user?.id) return;

      // Update store
      useChatStore.getState().setTyping(channelId, typingUser.id, isTyping);
    };

    const handleChatPresence = (data) => {
      const { userId, isOnline } = data;

      // Update store
      useChatStore.getState().setUserOnline(userId, isOnline);
    };

    const handleChatChannelUpdated = (channel) => {
      // Update store
      useChatStore.getState().updateChannel(channel.id, channel);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['chat', 'channels'] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'channels', channel.id] });
    };

    const handleChatMemberChange = (data) => {
      const { channelId } = data;

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['chat', 'channels'] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'channels', channelId] });
    };

    const handleChatRead = (data) => {
      const { channelId, userId } = data;

      // If current user read, reset unread count
      if (userId === user?.id) {
        useChatStore.getState().resetUnreadCount(channelId);
      }
    };

    // Connection events
    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    socket.on('disconnect', handleDisconnect);

    // Data events
    socket.on('schedule:created', handleScheduleChange);
    socket.on('schedule:updated', handleScheduleChange);
    socket.on('schedule:deleted', handleScheduleChange);

    socket.on('task:created', handleTaskChange);
    socket.on('task:updated', handleTaskChange);
    socket.on('task:deleted', handleTaskChange);

    socket.on('appointment:created', handleAppointmentChange);
    socket.on('appointment:updated', handleAppointmentChange);
    socket.on('appointment:cancelled', handleAppointmentChange);

    socket.on('time-entry:created', handleTimeEntryChange);
    socket.on('time-entry:updated', handleTimeEntryChange);
    socket.on('time-entry:deleted', handleTimeEntryChange);

    socket.on('notification:new', handleNotification);
    socket.on('timeoff:created', handleTimeOffChange);
    socket.on('timeoff:approved', handleTimeOffChange);
    socket.on('timeoff:rejected', handleTimeOffChange);
    socket.on('service-order:created', handleServiceOrderChange);
    socket.on('service-order:updated', handleServiceOrderChange);
    socket.on('invoice:created', handleInvoiceChange);
    socket.on('invoice:updated', handleInvoiceChange);
    socket.on('invoice:sent', handleInvoiceChange);
    socket.on('invoice:paid', handleInvoiceChange);
    socket.on('invoice:deleted', handleInvoiceDeleted);
    socket.on('message:new', handleMessageCreated);

    // Chat events
    socket.on('chat:message:new', handleChatMessageNew);
    socket.on('chat:message:updated', handleChatMessageUpdated);
    socket.on('chat:message:deleted', handleChatMessageDeleted);
    socket.on('chat:typing', handleChatTyping);
    socket.on('chat:presence', handleChatPresence);
    socket.on('chat:channel:updated', handleChatChannelUpdated);
    socket.on('chat:member:added', handleChatMemberChange);
    socket.on('chat:member:removed', handleChatMemberChange);
    socket.on('chat:read', handleChatRead);

    return () => {
      lastAuthError = null;
      refreshingSocket = false;

      // Clean up connection event listeners
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
      socket.off('disconnect', handleDisconnect);

      // Clean up data event listeners
      socket.off('schedule:created', handleScheduleChange);
      socket.off('schedule:updated', handleScheduleChange);
      socket.off('schedule:deleted', handleScheduleChange);

      socket.off('task:created', handleTaskChange);
      socket.off('task:updated', handleTaskChange);
      socket.off('task:deleted', handleTaskChange);

      socket.off('appointment:created', handleAppointmentChange);
      socket.off('appointment:updated', handleAppointmentChange);
      socket.off('appointment:cancelled', handleAppointmentChange);

      socket.off('time-entry:created', handleTimeEntryChange);
      socket.off('time-entry:updated', handleTimeEntryChange);
      socket.off('time-entry:deleted', handleTimeEntryChange);

      socket.off('notification:new', handleNotification);
      socket.off('timeoff:created', handleTimeOffChange);
      socket.off('timeoff:approved', handleTimeOffChange);
      socket.off('timeoff:rejected', handleTimeOffChange);
      socket.off('service-order:created', handleServiceOrderChange);
      socket.off('service-order:updated', handleServiceOrderChange);
      socket.off('invoice:created', handleInvoiceChange);
      socket.off('invoice:updated', handleInvoiceChange);
      socket.off('invoice:sent', handleInvoiceChange);
      socket.off('invoice:paid', handleInvoiceChange);
      socket.off('invoice:deleted', handleInvoiceDeleted);
      socket.off('message:new', handleMessageCreated);

      // Clean up chat event listeners
      socket.off('chat:message:new', handleChatMessageNew);
      socket.off('chat:message:updated', handleChatMessageUpdated);
      socket.off('chat:message:deleted', handleChatMessageDeleted);
      socket.off('chat:typing', handleChatTyping);
      socket.off('chat:presence', handleChatPresence);
      socket.off('chat:channel:updated', handleChatChannelUpdated);
      socket.off('chat:member:added', handleChatMemberChange);
      socket.off('chat:member:removed', handleChatMemberChange);
      socket.off('chat:read', handleChatRead);
    };
  }, [accessToken, queryClient, showToast, user]);
};

export const useSocketInstance = () => getSocket();

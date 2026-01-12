import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSocket, disconnectSocket, getSocket, updateSocketToken } from '../lib/socket';
import { useAuthStore } from '../state/useAuthStore';
import { refreshAuthSession } from '../utils/api';

/**
 * Hook to handle real-time events from the server in the client portal
 * Now uses JWT authentication with token refresh (same as CRM)
 */
export const useRealtimeEvents = () => {
  const queryClient = useQueryClient();
  const { accessToken, isAuthenticated, updateClient } = useAuthStore();
  const connectedRef = useRef(false);

  // Invalidate queries helper
  const invalidate = useCallback(
    (keys) => {
      keys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
    [queryClient]
  );

  // Show toast notification
  const showToast = useCallback((message, type = 'info') => {
    console.log(`[${type.toUpperCase()}] ${message}`);

    // Show browser notification if permitted
    if (Notification.permission === 'granted') {
      new Notification(message, {
        icon: '/favicon.ico',
      });
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      if (connectedRef.current) {
        disconnectSocket();
        connectedRef.current = false;
      }
      return;
    }

    // Connect socket
    let socket;
    try {
      socket = connectSocket(accessToken);
    } catch (err) {
      console.warn('[Portal] Socket connection failed, real-time updates disabled:', err.message);
      return;
    }

    if (!socket) {
      console.warn('[Portal] Socket not available, real-time updates disabled');
      return;
    }

    connectedRef.current = true;

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Auth error handling - same as CRM
    const authErrorCodes = new Set(['AUTH_MISSING_TOKEN', 'AUTH_INVALID_TOKEN', 'AUTH_TOKEN_EXPIRED']);
    let lastAuthError = null;
    let refreshingSocket = false;
    let authFailureCount = 0;
    let hasShownConnectionErrorToast = false;
    let hasShownDisconnectToast = false;
    const MAX_AUTH_FAILURES = 3;

    const attemptSocketRefresh = async () => {
      if (refreshingSocket) return;

      if (authFailureCount >= MAX_AUTH_FAILURES) {
        console.warn('[Portal] Socket auth failed too many times, stopping reconnection attempts');
        disconnectSocket();
        return;
      }

      refreshingSocket = true;
      try {
        const { accessToken: nextToken } = await refreshAuthSession();
        if (nextToken) {
          updateSocketToken(nextToken);
          lastAuthError = null;
          authFailureCount = 0;
          if (!socket.connected) {
            socket.connect();
          }
        }
      } catch (refreshError) {
        authFailureCount++;
        console.error(`[Portal] Socket auth refresh failed (${authFailureCount}/${MAX_AUTH_FAILURES})`, refreshError);

        if (authFailureCount >= MAX_AUTH_FAILURES) {
          disconnectSocket();
          showToast('Sesiunea a expirat. Te rugăm să te reconectezi.', 'error');
        }
      } finally {
        refreshingSocket = false;
      }
    };

    const handleConnectError = async (error) => {
      console.error('[Portal] Socket connection error', error);
      const message = error?.message;

      if (message === 'AUTH_RATE_LIMIT_EXCEEDED') {
        console.warn('[Portal] Socket auth rate limit exceeded');
        disconnectSocket();
        if (!hasShownConnectionErrorToast) {
          hasShownConnectionErrorToast = true;
          showToast('Prea multe încercări de conectare. Te rugăm să aștepți un minut.', 'warning');
        }
        return;
      }

      if (authErrorCodes.has(message)) {
        lastAuthError = message;
        await attemptSocketRefresh();
      } else {
        if (!hasShownConnectionErrorToast) {
          hasShownConnectionErrorToast = true;
          showToast('Conexiunea în timp real a fost întreruptă. Reconectare automată...', 'warning');
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

      if (!hasShownDisconnectToast) {
        hasShownDisconnectToast = true;
        console.log('[Portal] Socket disconnected:', reason);
      }
    };

    const handleConnect = () => {
      console.log('[Portal] Connected to real-time server');
      hasShownConnectionErrorToast = false;
      hasShownDisconnectToast = false;
      authFailureCount = 0;
    };

    // Handle appointment updates
    const handleAppointmentUpdated = (data) => {
      console.log('[Portal] Appointment updated:', data);
      invalidate([['appointments'], ['appointment', data.id]]);

      const statusMessages = {
        PENDING: 'in asteptare',
        PREZENTAT: 'a fost confirmata',
        IN_PROGRESS: 'este in lucru',
        COMPLETED: 'a fost finalizata',
        CANCELLED: 'a fost anulata',
      };

      const statusMessage = statusMessages[data.status] || 'a fost actualizata';
      showToast(`Programarea "${data.title}" ${statusMessage}`, 'info');
    };

    const handleAppointmentCancelled = (data) => {
      console.log('[Portal] Appointment cancelled:', data);
      invalidate([['appointments'], ['appointment', data.id]]);
      showToast(`Programarea "${data.title}" a fost anulata`, 'warning');
    };

    // Handle invoice updates
    const handleInvoiceUpdated = (data) => {
      console.log('[Portal] Invoice updated:', data);
      invalidate([['invoices'], ['invoice', data.id]]);
      showToast(`Factura #${data.invoiceNumber} a fost actualizata`, 'info');
    };

    // Handle client profile updates (from CRM)
    const handleClientUpdated = (data) => {
      console.log('[Portal] Client profile updated:', data);
      updateClient(data);
      showToast('Profilul dvs. a fost actualizat', 'info');
    };

    // Handle asset updates (from CRM)
    const handleAssetUpdated = (data) => {
      console.log('[Portal] Asset updated:', data);
      invalidate([['assets'], ['asset', data.id]]);
      const assetName = data.name || data.identifier || 'Activul';
      showToast(`${assetName} a fost actualizat`, 'info');
    };

    // Connection events
    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    socket.on('disconnect', handleDisconnect);

    // Data events
    socket.on('portal:appointment:updated', handleAppointmentUpdated);
    socket.on('portal:appointment:cancelled', handleAppointmentCancelled);
    socket.on('portal:invoice:updated', handleInvoiceUpdated);
    socket.on('portal:client:updated', handleClientUpdated);
    socket.on('portal:asset:updated', handleAssetUpdated);

    return () => {
      lastAuthError = null;
      refreshingSocket = false;

      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
      socket.off('disconnect', handleDisconnect);

      socket.off('portal:appointment:updated', handleAppointmentUpdated);
      socket.off('portal:appointment:cancelled', handleAppointmentCancelled);
      socket.off('portal:invoice:updated', handleInvoiceUpdated);
      socket.off('portal:client:updated', handleClientUpdated);
      socket.off('portal:asset:updated', handleAssetUpdated);
    };
  }, [isAuthenticated, accessToken, invalidate, showToast, updateClient]);

  // Return current socket for manual event handling if needed
  return {
    socket: getSocket(),
    isConnected: connectedRef.current,
  };
};

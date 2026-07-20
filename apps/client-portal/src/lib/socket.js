import { io } from 'socket.io-client';
import { runtimeConfig } from '../config/runtime';

let socket = null;

const SOCKET_URL = runtimeConfig.socketUrl;

/**
 * Connect to socket server for real-time updates
 */
export const connectSocket = (accessToken, clientId) => {
  if (socket?.connected) {
    return socket;
  }

  if (!accessToken || !clientId) {
    console.warn('[Socket] Missing token or clientId, skipping connection');
    return null;
  }

  socket = io(SOCKET_URL, {
    auth: {
      token: accessToken,
      type: 'client',
      clientId,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected to server');
    // Join client-specific room
    socket.emit('join:client', clientId);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
  });

  return socket;
};

/**
 * Update socket authentication token
 */
export const updateSocketToken = (accessToken) => {
  if (socket) {
    socket.auth = { ...socket.auth, token: accessToken };
  }
};

/**
 * Get the current socket instance
 */
export const getSocket = () => socket;

/**
 * Disconnect the socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

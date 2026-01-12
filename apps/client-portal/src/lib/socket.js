import { io } from 'socket.io-client';

let socket;

const getBaseUrl = () => {
  const configured = import.meta.env.VITE_SOCKET_URL;
  if (configured) return configured.replace(/\/$/, '');
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  return apiUrl.replace(/\/api\/?$/, '');
};

/**
 * Connect socket for client portal
 * Uses JWT access token for authentication (same as CRM)
 * Connects to the /portal namespace (separate from CRM)
 */
export const connectSocket = (accessToken) => {
  if (!accessToken) return null;

  // If socket exists and is connected or connecting, don't recreate
  if (socket && (socket.connected || socket.connecting)) {
    return socket;
  }

  // Clean up existing socket if it exists
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  try {
    // Connect to the /portal namespace
    const baseUrl = getBaseUrl();
    socket = io(`${baseUrl}/portal`, {
      autoConnect: false, // Don't auto-connect, let useRealtimeEvents handle it
      transports: ['websocket'],
      upgrade: false,
      auth: { token: accessToken },
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socket.connect();

    return socket;
  } catch (err) {
    console.error('[Portal] Failed to create socket:', err.message);
    return null;
  }
};

export const updateSocketToken = (newToken) => {
  if (socket && newToken) {
    socket.auth = { token: newToken };
  }
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};

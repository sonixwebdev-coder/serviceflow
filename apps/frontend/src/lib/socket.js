import { io } from 'socket.io-client';

let socket;

const getBaseUrl = () => {
  const configured = import.meta.env.VITE_SOCKET_URL;
  if (configured) return configured.replace(/\/$/, '');
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  return apiUrl.replace(/\/api\/?$/, '');
};

export const connectSocket = (token) => {
  if (!token) return null;

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(getBaseUrl(), {
    autoConnect: false,
    transports: ['websocket'], // doar websocket, fara polling
    upgrade: false, // dezactiveaza upgrade-ul de la polling
    auth: { token },
    timeout: 20000,

    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  socket.connect();

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
  });

  return socket;
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

import { io } from 'socket.io-client';
import { runtimeConfig } from '../config/runtime';

let socket;

const getBaseUrl = () => {
  return runtimeConfig.socketUrl;
};

export const connectSocket = (token) => {
  if (!token) return null;

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(getBaseUrl(), {
    autoConnect: false,
    transports: ['websocket', 'polling'],
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

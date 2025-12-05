const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/token');
const { setIO } = require('./emitter');

const createSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'https://viperx.online',
      credentials: true,
    },
    transports: ['websocket'], // doar websocket
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('AUTH_MISSING_TOKEN'));

    try {
      const payload = verifyAccessToken(token);
      socket.user = { id: payload.sub, email: payload.email, roles: payload.roles };
      next();
    } catch (err) {
      next(new Error('AUTH_INVALID_TOKEN'));
    }
  });

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
  });

  setIO(io);
  return io;
};

module.exports = createSocketServer;

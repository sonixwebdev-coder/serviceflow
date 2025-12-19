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
      socket.user = {
        id: payload.sub,
        email: payload.email,
        roles: payload.roles,
        organizationId: payload.organizationId,
      };
      next();
    } catch (err) {
      next(new Error('AUTH_INVALID_TOKEN'));
    }
  });

  io.on('connection', (socket) => {

    // Join organization room for tenant-scoped broadcasts
    if (socket.user.organizationId) {
      const orgRoom = `org:${socket.user.organizationId}`;
      socket.join(orgRoom);
    }

    socket.on('disconnect', () => {
    });
  });

  setIO(io);
  return io;
};

module.exports = createSocketServer;

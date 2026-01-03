const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/token');
const { setIO } = require('./emitter');
const prisma = require('../../lib/prisma');
const { updatePresence, startTyping, stopTyping } = require('../services/chatPresenceService');
const { broadcastTyping, broadcastPresence } = require('./chatEvents');

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

      // Update user presence to online
      updatePresence(prisma, socket.user.id, true).catch((err) => {
        console.error('Error updating presence on connect:', err);
      });

      // Broadcast user is online
      broadcastPresence(socket.user.organizationId, socket.user.id, true);
    }

    // Join user-specific room for direct notifications
    socket.join(`user:${socket.user.id}`);

    // Handle typing indicators
    socket.on('chat:typing:start', async ({ channelId }) => {
      try {
        await startTyping(prisma, channelId, socket.user.id);

        // Get user details for broadcasting
        const user = await prisma.user.findUnique({
          where: { id: socket.user.id },
          select: { id: true, firstName: true, lastName: true },
        });

        broadcastTyping(socket.user.organizationId, channelId, user, true);
      } catch (error) {
        console.error('Error handling typing start:', error);
      }
    });

    socket.on('chat:typing:stop', async ({ channelId }) => {
      try {
        await stopTyping(prisma, channelId, socket.user.id);

        // Get user details for broadcasting
        const user = await prisma.user.findUnique({
          where: { id: socket.user.id },
          select: { id: true, firstName: true, lastName: true },
        });

        broadcastTyping(socket.user.organizationId, channelId, user, false);
      } catch (error) {
        console.error('Error handling typing stop:', error);
      }
    });

    socket.on('disconnect', () => {
      // Update user presence to offline
      if (socket.user.organizationId) {
        updatePresence(prisma, socket.user.id, false).catch((err) => {
          console.error('Error updating presence on disconnect:', err);
        });

        // Broadcast user is offline
        broadcastPresence(socket.user.organizationId, socket.user.id, false);
      }
    });
  });

  setIO(io);
  return io;
};

module.exports = createSocketServer;

const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/token');
const { setIO } = require('./emitter');
const prisma = require('../../lib/prisma');
const { updatePresence, startTyping, stopTyping } = require('../services/chatPresenceService');
const { broadcastTyping, broadcastPresence } = require('./chatEvents');

const createSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: [
        process.env.FRONTEND_URL || 'https://viperx.online',
        process.env.CLIENT_PORTAL_URL || 'http://localhost:5174',
      ],
      credentials: true,
    },
    transports: ['websocket'],
    // Add connection state recovery for better stability
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
      skipMiddlewares: false,
    },
  });

  // Global error handler for the IO server
  io.engine.on('connection_error', (err) => {
    console.error('[Socket.io Engine] Connection error:', err.code, err.message, err.context);
  });

  // ==========================================
  // DEFAULT NAMESPACE (/) - CRM Users Only
  // ==========================================
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('AUTH_MISSING_TOKEN'));
      }

      // CRM user authentication - uses JWTs
      const payload = verifyAccessToken(token);
      if (!payload || !payload.sub) {
        return next(new Error('AUTH_INVALID_TOKEN'));
      }

      socket.user = {
        id: payload.sub,
        email: payload.email,
        roles: payload.roles,
        organizationId: payload.organizationId,
      };

      return next();
    } catch (err) {
      console.error('[Socket CRM] Auth error:', err.message);
      return next(new Error('AUTH_INVALID_TOKEN'));
    }
  });

  io.on('connection', (socket) => {
    if (!socket.user) {
      console.error('[Socket CRM] Connection missing user data');
      return;
    }

    console.log(`[CRM] User ${socket.user.id} connected`);

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
      console.log(`[CRM] User ${socket.user?.id || 'unknown'} disconnected`);
      if (socket.user?.organizationId) {
        updatePresence(prisma, socket.user.id, false).catch((err) => {
          console.error('Error updating presence on disconnect:', err);
        });
        broadcastPresence(socket.user.organizationId, socket.user.id, false);
      }
    });
  });

  // Set IO instance for the emitter (CRM only)
  setIO(io);

  return io;
};

module.exports = createSocketServer;

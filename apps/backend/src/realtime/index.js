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
        'http://localhost:5173', // CRM frontend dev
        'http://localhost:5174', // Portal frontend dev
      ],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Global error handler for the IO server
  io.engine.on('connection_error', (err) => {
    console.error('[Socket.io Engine] Connection error:', err.code, err.message, err.context);
  });

  // ==========================================
  // DEFAULT NAMESPACE (/) - CRM Users AND Client Portal
  // ==========================================
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const authType = socket.handshake.auth?.type; // 'user' or 'client'
      const clientId = socket.handshake.auth?.clientId;

      console.log('[Socket] Auth attempt:', { hasToken: !!token, authType, clientId: clientId?.substring(0, 8) });

      if (!token) {
        console.log('[Socket] Auth failed: missing token');
        return next(new Error('AUTH_MISSING_TOKEN'));
      }

      const payload = verifyAccessToken(token);
      if (!payload || !payload.sub) {
        console.log('[Socket] Auth failed: invalid token payload');
        return next(new Error('AUTH_INVALID_TOKEN'));
      }

      console.log('[Socket] Token verified:', { sub: payload.sub?.substring(0, 8), type: payload.type });

      // Client portal authentication
      if (authType === 'client' || payload.type === 'client') {
        console.log('[Socket] Processing client auth for:', payload.sub);

        // For client portal, get client info
        const clientAccount = await prisma.clientAccount.findUnique({
          where: { id: payload.sub },
          include: {
            client: true,
          },
        });

        console.log('[Socket] Client account found:', !!clientAccount, 'Has client:', !!clientAccount?.client);

        if (!clientAccount || !clientAccount.client) {
          console.log('[Socket] Client auth failed: no account or client');
          return next(new Error('AUTH_INVALID_CLIENT'));
        }

        socket.portalClient = {
          id: clientAccount.client.id,
          accountId: clientAccount.id,
          organizationId: clientAccount.client.organizationId,
          type: 'client',
        };

        console.log('[Socket] Client authenticated, calling next()');
        return next();
      }

      // CRM user authentication
      socket.user = {
        id: payload.sub,
        email: payload.email,
        roles: payload.roles,
        organizationId: payload.organizationId,
        type: 'user',
      };

      console.log('[Socket] CRM user authenticated:', { userId: payload.sub?.substring(0, 8), orgId: payload.organizationId?.substring(0, 8) });
      return next();
    } catch (err) {
      console.error('[Socket] Auth error:', err.message, err.stack);
      return next(new Error('AUTH_INVALID_TOKEN'));
    }
  });

  io.on('connection', (socket) => {
    // Handle client portal connections
    if (socket.portalClient) {
      console.log(`[Portal] Client ${socket.portalClient.id} connected`);

      // Join client-specific room for direct messages
      socket.join(`client:${socket.portalClient.id}`);

      // Handle client joining their room explicitly
      socket.on('join:client', (clientId) => {
        if (clientId === socket.portalClient.id) {
          socket.join(`client:${clientId}`);
        }
      });

      socket.on('disconnect', () => {
        console.log(`[Portal] Client ${socket.portalClient?.id || 'unknown'} disconnected`);
      });

      return; // Client connections don't need CRM features below
    }

    // Handle CRM user connections
    if (!socket.user) {
      console.error('[Socket CRM] Connection missing user data');
      return;
    }

    console.log(`[CRM] User ${socket.user.id} connected`);

    // Join organization room for tenant-scoped broadcasts
    if (socket.user.organizationId) {
      const orgRoom = `org:${socket.user.organizationId}`;
      socket.join(orgRoom);
      console.log(`[CRM] User ${socket.user.id} joined room: ${orgRoom}`);

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

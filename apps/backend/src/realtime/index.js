const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/token');
const { setIO } = require('./emitter');
const prisma = require('../../lib/prisma');
const cache = require('../utils/cache');
const { updatePresence, startTyping, stopTyping } = require('../services/chatPresenceService');
const { broadcastTyping, broadcastPresence } = require('./chatEvents');
const logger = require('../utils/logger');

const createSocketServer = (httpServer) => {
  const corsOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    process.env.CLIENT_PORTAL_URL || 'http://localhost:5174',
  ];
  if (process.env.NODE_ENV !== 'production') {
    corsOrigins.push('http://localhost:5173', 'http://localhost:5174');
  }

  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Global error handler for the IO server
  io.engine.on('connection_error', (err) => {
    logger.error('[Socket.io Engine] Connection error', { code: err.code, message: err.message });
  });

  // ==========================================
  // DEFAULT NAMESPACE (/) - CRM Users AND Client Portal
  // ==========================================
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const authType = socket.handshake.auth?.type; // 'user' or 'client'

      logger.debug('[Socket] Auth attempt', { hasToken: !!token, authType });

      if (!token) {
        logger.debug('[Socket] Auth failed: missing token');
        return next(new Error('AUTH_MISSING_TOKEN'));
      }

      const payload = verifyAccessToken(token);
      if (!payload || !payload.sub) {
        logger.debug('[Socket] Auth failed: invalid token payload');
        return next(new Error('AUTH_INVALID_TOKEN'));
      }

      logger.debug('[Socket] Token verified', { type: payload.type });

      // Client portal authentication
      if (authType === 'client' || payload.type === 'client') {
        logger.debug('[Socket] Processing client auth');

        // For client portal, get client info (cached to avoid a DB hit on every reconnect)
        const clientAccount = await cache.wrap(
          `socket:client:${payload.sub}`,
          () =>
            prisma.clientAccount.findUnique({
              where: { id: payload.sub },
              include: { client: true },
            }),
          cache.TTL.SHORT
        );

        if (!clientAccount || !clientAccount.client) {
          logger.debug('[Socket] Client auth failed: no account or client');
          return next(new Error('AUTH_INVALID_CLIENT'));
        }

        socket.portalClient = {
          id: clientAccount.client.id,
          accountId: clientAccount.id,
          organizationId: clientAccount.client.organizationId,
          type: 'client',
        };

        logger.debug('[Socket] Client authenticated');
        return next();
      }

      // CRM user authentication - re-validate against DB (cached to avoid a DB hit on every reconnect)
      const dbUser = await cache.wrap(
        `socket:user:${payload.sub}`,
        () =>
          prisma.user.findUnique({
            where: { id: payload.sub },
            select: {
              id: true,
              isActive: true,
              organizationId: true,
              organization: { select: { status: true } },
            },
          }),
        cache.TTL.SHORT
      );

      if (!dbUser || !dbUser.isActive) {
        logger.debug('[Socket] CRM auth failed: user inactive or not found');
        return next(new Error('AUTH_USER_INACTIVE'));
      }
      if (dbUser.organization?.status === 'SUSPENDED') {
        logger.debug('[Socket] CRM auth failed: organization suspended');
        return next(new Error('AUTH_ORG_SUSPENDED'));
      }

      socket.user = {
        id: payload.sub,
        email: payload.email,
        roles: payload.roles,
        organizationId: dbUser.organizationId,
        type: 'user',
      };

      logger.debug('[Socket] CRM user authenticated');
      return next();
    } catch (err) {
      logger.error('[Socket] Auth error', err);
      return next(new Error('AUTH_INVALID_TOKEN'));
    }
  });

  io.on('connection', (socket) => {
    // Handle client portal connections
    if (socket.portalClient) {
      logger.debug('[Portal] Client connected');

      // Join client-specific room for direct messages
      socket.join(`client:${socket.portalClient.id}`);

      // Handle client joining their room explicitly
      socket.on('join:client', (clientId) => {
        if (clientId === socket.portalClient.id) {
          socket.join(`client:${clientId}`);
        }
      });

      socket.on('disconnect', () => {
        logger.debug('[Portal] Client disconnected');
      });

      return; // Client connections don't need CRM features below
    }

    // Handle CRM user connections
    if (!socket.user) {
      logger.error('[Socket CRM] Connection missing user data');
      return;
    }

    logger.debug('[CRM] User connected');

    // Join organization room for tenant-scoped broadcasts
    if (socket.user.organizationId) {
      const orgRoom = `org:${socket.user.organizationId}`;
      socket.join(orgRoom);

      // Update user presence to online
      updatePresence(prisma, socket.user.id, true).catch((err) => {
        logger.error('Error updating presence on connect', err);
      });

      // Broadcast user is online
      broadcastPresence(socket.user.organizationId, socket.user.id, true);
    }

    // Join user-specific room for direct notifications
    socket.join(`user:${socket.user.id}`);

    // Per-socket typing throttle: max one event per 2s per channel
    const typingThrottle = new Map();
    const TYPING_THROTTLE_MS = 2000;
    const TYPING_MAP_MAX_SIZE = 50;

    const isTypingThrottled = (channelId) => {
      const now = Date.now();
      const last = typingThrottle.get(channelId) || 0;
      if (now - last < TYPING_THROTTLE_MS) return true;
      typingThrottle.set(channelId, now);
      // Evict stale entries to prevent unbounded growth
      if (typingThrottle.size > TYPING_MAP_MAX_SIZE) {
        for (const [key, ts] of typingThrottle) {
          if (now - ts > TYPING_THROTTLE_MS * 5) typingThrottle.delete(key);
        }
      }
      return false;
    };

    // Verify channel membership before processing typing
    const verifyChannelMember = async (channelId) => {
      if (!prisma.chatMember) return false;
      const member = await prisma.chatMember.findFirst({
        where: { channelId, userId: socket.user.id },
        select: { id: true },
      });
      return !!member;
    };

    // Cache user info to avoid DB lookups on every keystroke
    let cachedUser = null;
    const getSocketUser = async () => {
      if (cachedUser) return cachedUser;
      cachedUser = await prisma.user.findUnique({
        where: { id: socket.user.id },
        select: { id: true, firstName: true, lastName: true },
      });
      return cachedUser;
    };

    // Handle typing indicators
    socket.on('chat:typing:start', async ({ channelId }) => {
      try {
        if (!channelId || isTypingThrottled(channelId)) return;
        if (!(await verifyChannelMember(channelId))) return;

        const user = await getSocketUser();
        if (!user) return;

        // Broadcast immediately - DB persistence is fire-and-forget
        broadcastTyping(socket.user.organizationId, channelId, user, true);
        startTyping(prisma, channelId, socket.user.id).catch((err) =>
          logger.debug('Typing persist error (non-critical)', err.message)
        );
      } catch (error) {
        logger.error('Error handling typing start', error);
      }
    });

    socket.on('chat:typing:stop', async ({ channelId }) => {
      try {
        if (!channelId) return;
        if (!(await verifyChannelMember(channelId))) return;

        const user = await getSocketUser();
        if (!user) return;

        // Broadcast immediately - DB persistence is fire-and-forget
        broadcastTyping(socket.user.organizationId, channelId, user, false);
        stopTyping(prisma, channelId, socket.user.id).catch((err) =>
          logger.debug('Typing persist error (non-critical)', err.message)
        );
      } catch (error) {
        logger.error('Error handling typing stop', error);
      }
    });

    socket.on('disconnect', () => {
      logger.debug('[CRM] User disconnected');
      if (socket.user?.organizationId) {
        updatePresence(prisma, socket.user.id, false).catch((err) => {
          logger.error('Error updating presence on disconnect', err);
        });
        broadcastPresence(socket.user.organizationId, socket.user.id, false);

        // Clean up any stuck typing indicators for this user
        prisma.chatTypingIndicator
          .deleteMany({
            where: { userId: socket.user.id },
          })
          .catch(() => {});
      }
    });
  });

  // Set IO instance for the emitter (CRM only)
  setIO(io);

  return io;
};

module.exports = createSocketServer;

/**
 * Chat Presence Service
 * Handles online/offline status, typing indicators, and presence tracking
 */

/**
 * Update user online/offline status
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - User ID
 * @param {boolean} isOnline - Whether user is online
 * @returns {Promise<void>}
 */
async function updatePresence(prisma, userId, isOnline) {
  // Update all chat memberships for this user
  await prisma.chatMember.updateMany({
    where: { userId },
    data: {
      isOnline,
      lastSeenAt: new Date(),
    },
  });
}

/**
 * Start typing indicator for a user in a channel
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} channelId - Channel ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Typing indicator record
 */
async function startTyping(prisma, channelId, userId) {
  const indicator = await prisma.chatTypingIndicator.upsert({
    where: {
      channelId_userId: {
        channelId,
        userId,
      },
    },
    create: {
      channelId,
      userId,
      startedAt: new Date(),
    },
    update: {
      startedAt: new Date(),
    },
  });

  return indicator;
}

/**
 * Stop typing indicator for a user in a channel
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} channelId - Channel ID
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function stopTyping(prisma, channelId, userId) {
  await prisma.chatTypingIndicator.deleteMany({
    where: {
      channelId,
      userId,
    },
  });
}

/**
 * Get typing users in a channel
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} channelId - Channel ID
 * @returns {Promise<Array>} List of users currently typing
 */
async function getTypingUsers(prisma, channelId) {
  const indicators = await prisma.chatTypingIndicator.findMany({
    where: { channelId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  return indicators.map((i) => i.user);
}

/**
 * Get channel presence (online members)
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} channelId - Channel ID
 * @returns {Promise<Array>} List of online members
 */
async function getChannelPresence(prisma, channelId) {
  const members = await prisma.chatMember.findMany({
    where: {
      channelId,
      isOnline: true,
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  });

  return members.map((m) => ({
    ...m.user,
    lastSeenAt: m.lastSeenAt,
  }));
}

/**
 * Cleanup stale typing indicators
 * Remove indicators older than 10 seconds
 * @param {PrismaClient} prisma - Prisma client
 * @returns {Promise<number>} Number of deleted indicators
 */
async function cleanupStaleTypingIndicators(prisma) {
  const tenSecondsAgo = new Date(Date.now() - 10 * 1000);

  const result = await prisma.chatTypingIndicator.deleteMany({
    where: {
      startedAt: {
        lt: tenSecondsAgo,
      },
    },
  });

  return result.count;
}

/**
 * Get user's overall presence across all channels
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User presence info
 */
async function getUserPresence(prisma, userId) {
  const member = await prisma.chatMember.findFirst({
    where: { userId },
    orderBy: { lastSeenAt: 'desc' },
  });

  return {
    userId,
    isOnline: member?.isOnline || false,
    lastSeenAt: member?.lastSeenAt || null,
  };
}

module.exports = {
  updatePresence,
  startTyping,
  stopTyping,
  getTypingUsers,
  getChannelPresence,
  cleanupStaleTypingIndicators,
  getUserPresence,
};

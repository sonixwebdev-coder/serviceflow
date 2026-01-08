const { AppError } = require('../utils/errors');
const { broadcastMemberChange } = require('../realtime/chatEvents');

/**
 * Chat Service - Channel Management
 * Handles channel CRUD, membership, access control, and DM creation
 */

/**
 * Create a new chat channel
 * @param {PrismaClient} prisma - Tenant-scoped Prisma client
 * @param {Object} data - Channel data
 * @param {string} data.name - Channel name (null for DMs)
 * @param {string} data.description - Channel description
 * @param {string} data.type - Channel type (PUBLIC, PRIVATE, DIRECT, GROUP)
 * @param {string[]} data.memberIds - Initial member user IDs
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} Created channel with members
 */
async function createChannel(prisma, data, currentUser) {
  const { name, description, type, memberIds = [] } = data;

  // Validate channel type
  const validTypes = ['PUBLIC', 'PRIVATE', 'DIRECT', 'GROUP'];
  if (!validTypes.includes(type)) {
    throw new AppError('Invalid channel type', 400);
  }

  // Validate DM channels
  if (type === 'DIRECT' && memberIds.length !== 1) {
    throw new AppError('Direct channels must have exactly 2 members (you + 1 other)', 400);
  }

  // Validate GROUP DM channels
  if (type === 'GROUP' && memberIds.length < 2) {
    throw new AppError('Group channels must have at least 3 members', 400);
  }

  // Create channel and add members in a transaction
  const channelId = await prisma.$transaction(async (tx) => {
    // Create the channel
    const newChannel = await tx.chatChannel.create({
      data: {
        name,
        description,
        type,
        createdById: currentUser.id,
        organizationId: currentUser.organizationId,
        metadata: type === 'DIRECT' || type === 'GROUP' ? { participantIds: [currentUser.id, ...memberIds] } : null,
      },
    });

    // Add creator as OWNER
    await tx.chatMember.create({
      data: {
        channelId: newChannel.id,
        userId: currentUser.id,
        role: 'OWNER',
      },
    });

    // Add other members
    if (memberIds.length > 0) {
      await tx.chatMember.createMany({
        data: memberIds.map((userId) => ({
          channelId: newChannel.id,
          userId,
          role: 'MEMBER',
        })),
      });
    }

    // Return just the ID - we'll fetch full data after transaction commits
    return newChannel.id;
  });

  // Fetch the complete channel data after transaction is committed
  const channel = await prisma.chatChannel.findUnique({
    where: { id: channelId },
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
        },
      },
      members: {
        select: {
          id: true,
          channelId: true,
          userId: true,
          role: true,
          joinedAt: true,
          isOnline: true,
          lastSeenAt: true,
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
      },
    },
  });

  return channel;
}

/**
 * List channels the user has access to
 * @param {PrismaClient} prisma - Tenant-scoped Prisma client
 * @param {Object} filters - Filter options
 * @param {string} filters.type - Filter by channel type
 * @param {boolean} filters.archived - Include archived channels
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Array>} List of channels
 */
async function listChannels(prisma, filters = {}, currentUser) {
  const { type, archived = false } = filters;

  // Build the OR conditions for channel visibility:
  // 1. User is a member of the channel
  // 2. Channel is PUBLIC (anyone in org can see)
  const orConditions = [
    {
      members: {
        some: {
          userId: currentUser.id,
        },
      },
    },
    {
      type: 'PUBLIC',
    },
  ];

  const where = {
    isArchived: archived,
    OR: orConditions,
  };

  if (type) {
    where.type = type;
  }

  const channels = await prisma.chatChannel.findMany({
    where,
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
        },
      },
      members: {
        select: {
          id: true,
          channelId: true,
          userId: true,
          role: true,
          joinedAt: true,
          isOnline: true,
          lastSeenAt: true,
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
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          body: true,
          type: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return channels;
}

/**
 * Get channel by ID with access control
 * @param {PrismaClient} prisma - Tenant-scoped Prisma client
 * @param {string} channelId - Channel ID
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} Channel details
 */
async function getChannelById(prisma, channelId, currentUser) {
  await ensureChannelAccess(prisma, channelId, currentUser);

  const channel = await prisma.chatChannel.findUnique({
    where: { id: channelId },
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
        },
      },
      members: {
        select: {
          id: true,
          channelId: true,
          userId: true,
          role: true,
          joinedAt: true,
          isOnline: true,
          lastSeenAt: true,
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
      },
    },
  });

  if (!channel) {
    throw new AppError('Channel not found', 404);
  }

  return channel;
}

/**
 * Update channel details
 * @param {PrismaClient} prisma - Tenant-scoped Prisma client
 * @param {string} channelId - Channel ID
 * @param {Object} updates - Fields to update
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} Updated channel
 */
async function updateChannel(prisma, channelId, updates, currentUser) {
  // Ensure user is admin or owner
  await ensureChannelRole(prisma, channelId, currentUser, ['OWNER', 'ADMIN']);

  const { name, description } = updates;

  const channel = await prisma.chatChannel.update({
    where: { id: channelId },
    data: {
      name,
      description,
    },
    include: {
      members: {
        select: {
          id: true,
          channelId: true,
          userId: true,
          role: true,
          joinedAt: true,
          isOnline: true,
          lastSeenAt: true,
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
      },
    },
  });

  return channel;
}

/**
 * Archive a channel
 * @param {PrismaClient} prisma - Tenant-scoped Prisma client
 * @param {string} channelId - Channel ID
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} Archived channel
 */
async function archiveChannel(prisma, channelId, currentUser) {
  // Only owner can archive
  await ensureChannelRole(prisma, channelId, currentUser, ['OWNER']);

  const channel = await prisma.chatChannel.update({
    where: { id: channelId },
    data: {
      isArchived: true,
      archivedAt: new Date(),
    },
  });

  return channel;
}

/**
 * Add members to a channel
 * @param {PrismaClient} prisma - Tenant-scoped Prisma client
 * @param {string} channelId - Channel ID
 * @param {string[]} userIds - User IDs to add
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Array>} Added members
 */
async function addMembers(prisma, channelId, userIds, currentUser) {
  // Ensure user is admin or owner
  await ensureChannelRole(prisma, channelId, currentUser, ['OWNER', 'ADMIN']);

  // Verify all users exist in the organization
  const users = await prisma.user.findMany({
    where: {
      id: { in: userIds },
      organizationId: currentUser.organizationId,
    },
  });

  if (users.length !== userIds.length) {
    throw new AppError('Some users not found in organization', 404);
  }

  // Add members
  const members = await prisma.chatMember.createMany({
    data: userIds.map((userId) => ({
      channelId,
      userId,
      role: 'MEMBER',
    })),
    skipDuplicates: true,
  });

  return members;
}

/**
 * Remove a member from a channel
 * @param {PrismaClient} prisma - Tenant-scoped Prisma client
 * @param {string} channelId - Channel ID
 * @param {string} userId - User ID to remove
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<void>}
 */
async function removeMember(prisma, channelId, userId, currentUser) {
  // Ensure user is admin or owner
  await ensureChannelRole(prisma, channelId, currentUser, ['OWNER', 'ADMIN']);

  // Cannot remove the owner
  const member = await prisma.chatMember.findUnique({
    where: {
      channelId_userId: {
        channelId,
        userId,
      },
    },
  });

  if (member && member.role === 'OWNER') {
    throw new AppError('Cannot remove channel owner', 400);
  }

  await prisma.chatMember.delete({
    where: {
      channelId_userId: {
        channelId,
        userId,
      },
    },
  });
}

/**
 * Update member role
 * @param {PrismaClient} prisma - Tenant-scoped Prisma client
 * @param {string} channelId - Channel ID
 * @param {string} userId - User ID
 * @param {string} role - New role (OWNER, ADMIN, MEMBER)
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} Updated member
 */
async function updateMemberRole(prisma, channelId, userId, role, currentUser) {
  // Only owner can change roles
  await ensureChannelRole(prisma, channelId, currentUser, ['OWNER']);

  const validRoles = ['OWNER', 'ADMIN', 'MEMBER'];
  if (!validRoles.includes(role)) {
    throw new AppError('Invalid role', 400);
  }

  const member = await prisma.chatMember.update({
    where: {
      channelId_userId: {
        channelId,
        userId,
      },
    },
    data: { role },
  });

  return member;
}

/**
 * Leave a channel
 * @param {PrismaClient} prisma - Tenant-scoped Prisma client
 * @param {string} channelId - Channel ID
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<void>}
 */
async function leaveChannel(prisma, channelId, currentUser) {
  const member = await prisma.chatMember.findUnique({
    where: {
      channelId_userId: {
        channelId,
        userId: currentUser.id,
      },
    },
  });

  if (!member) {
    throw new AppError('You are not a member of this channel', 404);
  }

  if (member.role === 'OWNER') {
    throw new AppError('Channel owner cannot leave. Transfer ownership or archive the channel.', 400);
  }

  await prisma.chatMember.delete({
    where: {
      channelId_userId: {
        channelId,
        userId: currentUser.id,
      },
    },
  });
}

/**
 * Get or create a DM channel between two users
 * @param {PrismaClient} prisma - Tenant-scoped Prisma client
 * @param {string[]} participantIds - User IDs (should be [currentUser.id, otherUserId])
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} DM channel
 */
async function getOrCreateDMChannel(prisma, participantIds, currentUser) {
  if (participantIds.length !== 2 || !participantIds.includes(currentUser.id)) {
    throw new AppError('DM requires exactly 2 participants', 400);
  }

  const otherUserId = participantIds.find((id) => id !== currentUser.id);

  // Check if user exists in org
  const otherUser = await prisma.user.findFirst({
    where: {
      id: otherUserId,
      organizationId: currentUser.organizationId,
    },
  });

  if (!otherUser) {
    throw new AppError('User not found in organization', 404);
  }

  // Try to find existing DM channel
  const existingChannel = await prisma.chatChannel.findFirst({
    where: {
      type: 'DIRECT',
      members: {
        every: {
          userId: { in: participantIds },
        },
      },
    },
    include: {
      members: {
        select: {
          id: true,
          channelId: true,
          userId: true,
          role: true,
          joinedAt: true,
          isOnline: true,
          lastSeenAt: true,
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
      },
    },
  });

  if (existingChannel) {
    return existingChannel;
  }

  // Create new DM channel
  const channel = await createChannel(
    prisma,
    {
      name: null,
      description: null,
      type: 'DIRECT',
      memberIds: [otherUserId],
    },
    currentUser
  );

  return channel;
}

/**
 * Get or create a group DM channel
 * @param {PrismaClient} prisma - Tenant-scoped Prisma client
 * @param {string[]} participantIds - User IDs (including currentUser)
 * @param {string} name - Optional group name
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} Group DM channel
 */
async function getOrCreateGroupDM(prisma, participantIds, name, currentUser) {
  if (participantIds.length < 3) {
    throw new AppError('Group DM requires at least 3 participants', 400);
  }

  if (!participantIds.includes(currentUser.id)) {
    participantIds.push(currentUser.id);
  }

  // Create new group DM
  const memberIds = participantIds.filter((id) => id !== currentUser.id);

  const channel = await createChannel(
    prisma,
    {
      name: name || null,
      description: null,
      type: 'GROUP',
      memberIds,
    },
    currentUser
  );

  return channel;
}

/**
 * Ensure user has access to a channel
 * For PUBLIC channels, auto-join the user if not already a member
 * @param {PrismaClient} prisma - Tenant-scoped Prisma client
 * @param {string} channelId - Channel ID
 * @param {Object} currentUser - Current authenticated user
 * @throws {AppError} If user doesn't have access
 */
async function ensureChannelAccess(prisma, channelId, currentUser) {
  // First check if user is already a member
  const member = await prisma.chatMember.findUnique({
    where: {
      channelId_userId: {
        channelId,
        userId: currentUser.id,
      },
    },
  });

  if (member) {
    return; // User is a member, access granted
  }

  // Check if channel is PUBLIC - if so, auto-join the user
  const channel = await prisma.chatChannel.findUnique({
    where: { id: channelId },
    select: { type: true, organizationId: true },
  });

  if (!channel) {
    throw new AppError('Channel not found', 404);
  }

  // For PUBLIC channels in the same organization, auto-join the user
  if (channel.type === 'PUBLIC' && channel.organizationId === currentUser.organizationId) {
    let memberCreated = false;
    try {
      // Use upsert to handle race conditions (multiple parallel requests)
      // Wrap in try-catch because Prisma upsert can still fail with P2002 in concurrent scenarios
      await prisma.chatMember.upsert({
        where: {
          channelId_userId: {
            channelId,
            userId: currentUser.id,
          },
        },
        create: {
          channelId,
          userId: currentUser.id,
          role: 'MEMBER',
        },
        update: {}, // No update needed, just ensure membership exists
      });
      memberCreated = true;
    } catch (error) {
      // P2002 = unique constraint violation - user is already a member, which is fine
      if (error.code !== 'P2002') {
        throw error;
      }
    }

    // Broadcast member added event so other users see the updated member list in real-time
    if (memberCreated) {
      // Fetch the member with user details for the broadcast
      const newMember = await prisma.chatMember.findUnique({
        where: {
          channelId_userId: {
            channelId,
            userId: currentUser.id,
          },
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

      if (newMember) {
        broadcastMemberChange(currentUser.organizationId, channelId, 'added', newMember);
      }
    }

    return; // Access granted after auto-join
  }

  // For non-public channels, deny access
  throw new AppError('Access denied to this channel', 403);
}

/**
 * Ensure user has specific role in channel
 * @param {PrismaClient} prisma - Tenant-scoped Prisma client
 * @param {string} channelId - Channel ID
 * @param {Object} currentUser - Current authenticated user
 * @param {string[]} allowedRoles - Allowed roles
 * @throws {AppError} If user doesn't have required role
 */
async function ensureChannelRole(prisma, channelId, currentUser, allowedRoles) {
  const member = await prisma.chatMember.findUnique({
    where: {
      channelId_userId: {
        channelId,
        userId: currentUser.id,
      },
    },
  });

  if (!member) {
    throw new AppError('Access denied to this channel', 403);
  }

  if (!allowedRoles.includes(member.role)) {
    throw new AppError('Insufficient permissions', 403);
  }
}

/**
 * Get all channels the user belongs to
 * @param {PrismaClient} prisma - Tenant-scoped Prisma client
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Array>} User's channels
 */
async function getUserChannels(prisma, currentUser) {
  const channels = await prisma.chatChannel.findMany({
    where: {
      members: {
        some: {
          userId: currentUser.id,
        },
      },
      isArchived: false,
    },
    include: {
      members: {
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
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return channels;
}

module.exports = {
  createChannel,
  listChannels,
  getChannelById,
  updateChannel,
  archiveChannel,
  addMembers,
  removeMember,
  updateMemberRole,
  leaveChannel,
  getOrCreateDMChannel,
  getOrCreateGroupDM,
  ensureChannelAccess,
  ensureChannelRole,
  getUserChannels,
};

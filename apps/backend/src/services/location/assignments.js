const { AppError } = require('../../utils/errors');
const globalPrisma = require('../../../lib/prisma');

const assignUsersToLocation = async (prisma, locationId, userIds, options = {}) => {
  const location = await prisma.location.findUnique({
    where: { id: locationId },
  });

  if (!location) {
    throw new AppError('Locatia nu a fost gasita', 404);
  }

  const users = await prisma.user.findMany({
    where: {
      id: { in: userIds },
      organizationId: location.organizationId,
    },
    select: { id: true },
  });

  if (users.length !== userIds.length) {
    throw new AppError(
      'Unul sau mai multi utilizatori nu au fost gasiti sau nu apartin organizatiei',
      400
    );
  }

  await globalPrisma.userLocation.createMany({
    data: userIds.map((userId) => ({
      userId,
      locationId,
      isPrimary: options.setPrimary === true,
    })),
    skipDuplicates: true,
  });

  if (options.setPrimary) {
    await globalPrisma.userLocation.updateMany({
      where: {
        userId: { in: userIds },
        locationId: { not: locationId },
        isPrimary: true,
      },
      data: { isPrimary: false },
    });
    await globalPrisma.userLocation.updateMany({
      where: { userId: { in: userIds }, locationId },
      data: { isPrimary: true },
    });
  }

  const locationChannel = await prisma.chatChannel.findFirst({
    where: { locationId, type: 'LOCATION' },
  });
  if (locationChannel) {
    await prisma.chatMember.createMany({
      data: userIds.map((userId) => ({
        channelId: locationChannel.id,
        userId,
        role: 'MEMBER',
      })),
      skipDuplicates: true,
    });
  }

  return { message: `${userIds.length} utilizator(i) au fost asignati locatiei` };
};

const removeUsersFromLocation = async (prisma, locationId, userIds) => {
  const location = await prisma.location.findUnique({
    where: { id: locationId },
  });
  if (!location) {
    throw new AppError('Locatia nu a fost gasita', 404);
  }

  await globalPrisma.userLocation.deleteMany({
    where: { locationId, userId: { in: userIds } },
  });

  const locationChannel = await prisma.chatChannel.findFirst({
    where: { locationId, type: 'LOCATION' },
  });
  if (locationChannel) {
    await prisma.chatMember.deleteMany({
      where: {
        channelId: locationChannel.id,
        userId: { in: userIds },
        role: { not: 'OWNER' },
      },
    });
  }

  return { message: `${userIds.length} utilizator(i) au fost eliminati din locatie` };
};

const getLocationUsers = async (prisma, locationId) => {
  const location = await prisma.location.findUnique({ where: { id: locationId } });
  if (!location) {
    throw new AppError('Locatia nu a fost gasita', 404);
  }

  const userLocations = await globalPrisma.userLocation.findMany({
    where: { locationId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          isActive: true,
          avatarUrl: true,
          roles: {
            include: { role: { select: { key: true, name: true } } },
          },
        },
      },
    },
  });

  return userLocations.map((ul) => ({
    ...ul.user,
    isPrimaryLocation: ul.isPrimary,
    assignedAt: ul.assignedAt,
  }));
};

const getUserLocations = async (prisma, userId) => {
  const userLocations = await globalPrisma.userLocation.findMany({
    where: { userId },
    include: {
      location: {
        include: { _count: { select: { resources: true, appointments: true } } },
      },
    },
  });

  return userLocations.map((ul) => ({ ...ul.location, isPrimaryForUser: ul.isPrimary }));
};

const getUserPrimaryLocation = async (prisma, userId) => {
  const userLocation = await globalPrisma.userLocation.findFirst({
    where: { userId, isPrimary: true },
    include: { location: true },
  });
  if (!userLocation) {
    const fallback = await globalPrisma.userLocation.findFirst({
      where: { userId },
      include: { location: true },
    });
    return fallback?.location || null;
  }

  return userLocation.location;
};

module.exports = {
  assignUsersToLocation,
  removeUsersFromLocation,
  getLocationUsers,
  getUserLocations,
  getUserPrimaryLocation,
};

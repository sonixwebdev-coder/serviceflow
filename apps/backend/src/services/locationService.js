const { AppError } = require('../utils/errors');
const { getPlanLimit } = require('../utils/planLimits');
const globalPrisma = require('../../lib/prisma');
const {
  assignUsersToLocation,
  removeUsersFromLocation,
  getLocationUsers,
  getUserLocations,
  getUserPrimaryLocation,
} = require('./location/assignments');

/**
 * Generate a URL-safe slug from a name
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generate a unique slug for a location within an organization
 */
async function generateUniqueSlug(prisma, organizationId, name) {
  const baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;

  // Check if slug exists and append number if needed
  while (true) {
    const existing = await prisma.location.findFirst({
      where: { organizationId, slug },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }

    // Slug exists, try with a number suffix
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

/**
 * List locations for an organization with pagination and filtering
 */
const listLocations = async (prisma, { search, isActive, page = 1, limit = 50 }) => {
  const take = Math.min(limit, 100);
  const skip = (page - 1) * take;

  const conditions = [];

  if (isActive !== undefined) {
    conditions.push({ isActive: isActive === 'true' || isActive === true });
  }

  if (search) {
    conditions.push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ],
    });
  }

  const where =
    conditions.length > 0
      ? conditions.length === 1
        ? conditions[0]
        : { AND: conditions }
      : undefined;

  const [items, total] = await Promise.all([
    prisma.location.findMany({
      where,
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
      skip,
      take,
      include: {
        _count: {
          select: {
            users: true,
            resources: true,
            appointments: true,
          },
        },
      },
    }),
    prisma.location.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit: take,
      total,
      pages: Math.ceil(total / take) || 1,
    },
  };
};

/**
 * Create a new location
 */
const createLocation = async (prisma, data, organizationId) => {
  // Check plan limits
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { plan: true },
  });

  if (!org) {
    throw new AppError('Organizatia nu a fost gasita', 404);
  }

  const currentCount = await prisma.location.count({
    where: { organizationId },
  });

  const maxLocations = getPlanLimit(org.plan, 'maxLocations');
  if (currentCount >= maxLocations) {
    throw new AppError(
      `Limita de locatii a fost atinsa pentru planul ${org.plan}. Upgrade pentru a adauga mai multe locatii.`,
      403
    );
  }

  // Generate unique slug if not provided
  const slug = data.slug || (await generateUniqueSlug(prisma, organizationId, data.name));

  // Check if this is the first location (make it primary)
  const isFirstLocation = currentCount === 0;

  try {
    const location = await prisma.location.create({
      data: {
        organizationId,
        name: data.name,
        slug,
        address: data.address,
        city: data.city,
        county: data.county,
        country: data.country || 'RO',
        phone: data.phone,
        email: data.email,
        timezone: data.timezone || 'Europe/Bucharest',
        isActive: data.isActive !== false,
        isPrimary: isFirstLocation || data.isPrimary === true,
        operatingHours: data.operatingHours,
        settings: data.settings,
        metadata: data.metadata,
      },
      include: {
        _count: {
          select: {
            users: true,
            resources: true,
            appointments: true,
          },
        },
      },
    });

    // If this location is set as primary, unset other primaries
    if (location.isPrimary && !isFirstLocation) {
      await prisma.location.updateMany({
        where: {
          organizationId,
          id: { not: location.id },
          isPrimary: true,
        },
        data: { isPrimary: false },
      });
    }

    // Auto-assign all org users to the first location
    if (isFirstLocation) {
      const orgUsers = await prisma.user.findMany({
        where: { organizationId, isActive: true },
        select: { id: true },
      });
      if (orgUsers.length > 0) {
        await prisma.userLocation.createMany({
          data: orgUsers.map((u) => ({
            userId: u.id,
            locationId: location.id,
            isPrimary: true,
          })),
          skipDuplicates: true,
        });
      }
    }

    // Auto-create a chat channel for this location
    // Find an admin user to be the channel creator
    const adminUser = await prisma.user.findFirst({
      where: {
        organizationId,
        isActive: true,
        roles: {
          some: {
            role: { key: 'admin' },
          },
        },
      },
      select: { id: true },
    });

    if (adminUser) {
      await prisma.chatChannel.create({
        data: {
          organizationId,
          locationId: location.id,
          name: `${location.name}`,
          description: `Canal de comunicare pentru locatia ${location.name}`,
          type: 'LOCATION',
          createdById: adminUser.id,
        },
      });
    }

    return location;
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError('O locatie cu acest slug exista deja', 409);
    }
    throw error;
  }
};

/**
 * Get location by ID
 */
const getLocationById = async (prisma, locationId) => {
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    include: {
      users: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              isActive: true,
            },
          },
        },
      },
      _count: {
        select: {
          resources: true,
          appointments: true,
          schedules: true,
          timeEntries: true,
        },
      },
    },
  });

  if (!location) {
    throw new AppError('Locatia nu a fost gasita', 404);
  }

  return location;
};

/**
 * Update a location
 */
const updateLocation = async (prisma, locationId, data, organizationId) => {
  const existing = await prisma.location.findUnique({
    where: { id: locationId },
  });

  if (!existing) {
    throw new AppError('Locatia nu a fost gasita', 404);
  }

  // Generate slug if name changed and slug not provided
  let slug = data.slug;
  if (data.name && data.name !== existing.name && !data.slug) {
    slug = generateSlug(data.name);
  }

  try {
    const location = await prisma.location.update({
      where: { id: locationId },
      data: {
        name: data.name,
        slug: slug,
        address: data.address,
        city: data.city,
        county: data.county,
        country: data.country,
        phone: data.phone,
        email: data.email,
        timezone: data.timezone,
        isActive: data.isActive,
        isPrimary: data.isPrimary,
        operatingHours: data.operatingHours,
        settings: data.settings,
        metadata: data.metadata,
      },
      include: {
        _count: {
          select: {
            users: true,
            resources: true,
            appointments: true,
          },
        },
      },
    });

    // If this location is set as primary, unset other primaries
    if (data.isPrimary === true) {
      await prisma.location.updateMany({
        where: {
          organizationId,
          id: { not: location.id },
          isPrimary: true,
        },
        data: { isPrimary: false },
      });
    }

    return location;
  } catch (error) {
    if (error.code === 'P2025') {
      throw new AppError('Locatia nu a fost gasita', 404);
    }
    if (error.code === 'P2002') {
      throw new AppError('O locatie cu acest slug exista deja', 409);
    }
    throw error;
  }
};

/**
 * Delete a location
 */
const deleteLocation = async (prisma, locationId, organizationId) => {
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    include: {
      _count: {
        select: {
          appointments: true,
          resources: true,
          users: true,
        },
      },
    },
  });

  if (!location) {
    throw new AppError('Locatia nu a fost gasita', 404);
  }

  if (location.isPrimary) {
    throw new AppError(
      'Nu se poate sterge locatia principala. Setati alta locatie ca principala mai intai.',
      400
    );
  }

  // Check if there are active appointments
  const futureAppointments = await prisma.appointment.count({
    where: {
      locationId,
      scheduledStart: { gte: new Date() },
      status: { notIn: ['CANCELLED', 'COMPLETED'] },
    },
  });

  if (futureAppointments > 0) {
    throw new AppError(
      'Nu se poate sterge locatia cu programari viitoare. Anulati sau mutati programarile mai intai.',
      400
    );
  }

  // Get the primary location to reassign resources
  const primaryLocation = await prisma.location.findFirst({
    where: {
      organizationId,
      isPrimary: true,
      id: { not: locationId },
    },
  });

  // Reassign resources to primary location if it exists
  if (primaryLocation && location._count.resources > 0) {
    await prisma.resource.updateMany({
      where: { locationId },
      data: { locationId: primaryLocation.id },
    });
  }

  // Remove user assignments for this location
  await globalPrisma.userLocation.deleteMany({
    where: { locationId },
  });

  // Delete the location
  await prisma.location.delete({
    where: { id: locationId },
  });

  return { message: 'Locatia a fost stearsa cu succes' };
};

module.exports = {
  listLocations,
  createLocation,
  getLocationById,
  updateLocation,
  deleteLocation,
  assignUsersToLocation,
  removeUsersFromLocation,
  getLocationUsers,
  getUserLocations,
  getUserPrimaryLocation,
};

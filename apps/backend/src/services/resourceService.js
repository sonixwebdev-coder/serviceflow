const { AppError } = require('../utils/errors');

/**
 * List resources with pagination and filtering
 */
const listResources = async (prisma, { search, type, isActive, locationId, page = 1, limit = 50 }, options = {}) => {
  const take = Math.min(limit, 100);
  const skip = (page - 1) * take;

  const conditions = [];

  // Filter by resource type
  if (type) {
    conditions.push({ type });
  }

  // Filter by active status
  if (isActive !== undefined) {
    conditions.push({ isActive: isActive === 'true' || isActive === true });
  }

  // Filter by location
  if (locationId) {
    conditions.push({ locationId });
  } else if (options.locationFilter) {
    // Apply location filter from middleware
    conditions.push(options.locationFilter);
  }

  // Search across multiple fields
  if (search) {
    conditions.push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
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
    prisma.resource.findMany({
      where,
      orderBy: {
        name: 'asc',
      },
      skip,
      take,
      include: {
        location: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    }),
    prisma.resource.count({ where }),
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
 * Create a new resource
 */
const createResource = async (prisma, data) => {
  // Validate required fields
  if (!data.name) {
    throw new AppError('Resource name is required', 400);
  }

  if (!data.type) {
    throw new AppError('Resource type is required', 400);
  }

  try {
    const resource = await prisma.resource.create({
      data: {
        name: data.name,
        type: data.type,
        description: data.description,
        capacity: data.capacity ? Number(data.capacity) : 1,
        isActive: data.isActive !== undefined ? data.isActive : true,
        locationId: data.locationId || null,
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return resource;
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError('Resource name must be unique within the organization', 409);
    }
    throw error;
  }
};

/**
 * Get resource by ID
 */
const getResourceById = async (prisma, resourceId) => {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: {
      location: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      appointments: {
        where: {
          scheduledStart: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        orderBy: { scheduledStart: 'desc' },
        take: 50,
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              type: true,
            },
          },
          assignees: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!resource) {
    throw new AppError('Resource not found', 404);
  }

  return resource;
};

/**
 * Update a resource
 */
const updateResource = async (prisma, resourceId, data) => {
  try {
    const resource = await prisma.resource.update({
      where: { id: resourceId },
      data: {
        name: data.name,
        type: data.type,
        description: data.description,
        capacity: data.capacity ? Number(data.capacity) : undefined,
        isActive: data.isActive,
        locationId: data.locationId !== undefined ? data.locationId : undefined,
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return resource;
  } catch (error) {
    if (error.code === 'P2025') {
      throw new AppError('Resource not found', 404);
    }
    if (error.code === 'P2002') {
      throw new AppError('Resource name must be unique within the organization', 409);
    }
    throw error;
  }
};

/**
 * Delete a resource
 */
const deleteResource = async (prisma, resourceId) => {
  // Check if resource has future appointments
  const futureAppointmentCount = await prisma.appointment.count({
    where: {
      resourceId,
      scheduledStart: {
        gte: new Date(),
      },
    },
  });

  if (futureAppointmentCount > 0) {
    throw new AppError(
      'Cannot delete resource with future appointments. Please reassign or cancel appointments first.',
      400
    );
  }

  try {
    await prisma.resource.delete({
      where: { id: resourceId },
    });

    return { message: 'Resource deleted successfully' };
  } catch (error) {
    if (error.code === 'P2025') {
      throw new AppError('Resource not found', 404);
    }
    throw error;
  }
};

/**
 * Get available resources for a time slot
 */
const getAvailableResources = async (prisma, { startTime, endTime, type, locationId }, options = {}) => {
  const where = {
    isActive: true,
  };

  if (type) {
    where.type = type;
  }

  // Filter by location
  if (locationId) {
    where.locationId = locationId;
  } else if (options.locationFilter) {
    Object.assign(where, options.locationFilter);
  }

  // Get all active resources
  const resources = await prisma.resource.findMany({
    where,
    include: {
      location: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      appointments: {
        where: {
          AND: [
            {
              scheduledStart: {
                lt: new Date(endTime),
              },
            },
            {
              scheduledEnd: {
                gt: new Date(startTime),
              },
            },
            {
              status: {
                notIn: ['CANCELLED', 'COMPLETED'],
              },
            },
          ],
        },
      },
    },
  });

  // Filter out resources that are at capacity
  const availableResources = resources.filter((resource) => {
    return resource.appointments.length < resource.capacity;
  });

  return availableResources;
};

module.exports = {
  listResources,
  createResource,
  getResourceById,
  updateResource,
  deleteResource,
  getAvailableResources,
};

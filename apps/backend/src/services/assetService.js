const { AppError } = require('../utils/errors');

/**
 * List assets with pagination and filtering
 */
const listAssets = async (prisma, { search, type, clientId, page = 1, limit = 50 }) => {
  const take = Math.min(limit, 100);
  const skip = (page - 1) * take;

  const conditions = [];

  // Filter by client
  if (clientId) {
    conditions.push({ clientId });
  }

  // Filter by asset type
  if (type) {
    conditions.push({ type });
  }

  // Search across multiple fields
  if (search) {
    conditions.push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { identifier: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
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
    prisma.asset.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            type: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      skip,
      take,
    }),
    prisma.asset.count({ where }),
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
 * Create a new asset
 */
const createAsset = async (prisma, data) => {
  // Validate required fields
  if (!data.name) {
    throw new AppError('Asset name is required', 400);
  }

  if (!data.clientId) {
    throw new AppError('Client ID is required', 400);
  }

  // Verify client exists
  const client = await prisma.client.findUnique({
    where: { id: data.clientId },
  });

  if (!client) {
    throw new AppError('Client not found', 404);
  }

  try {
    const asset = await prisma.asset.create({
      data: {
        name: data.name,
        identifier: data.identifier,
        type: data.type,
        manufacturer: data.manufacturer,
        model: data.model,
        year: data.year ? Number(data.year) : null,
        metadata: data.metadata || {},
        clientId: data.clientId,
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            type: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    return asset;
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError('Asset identifier must be unique within the organization', 409);
    }
    throw error;
  }
};

/**
 * Get asset by ID
 */
const getAssetById = async (prisma, assetId) => {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyName: true,
          type: true,
          phone: true,
          email: true,
          address: true,
        },
      },
      appointments: {
        orderBy: { scheduledStart: 'desc' },
        take: 20,
        include: {
          assignees: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          serviceOrder: {
            select: {
              id: true,
              status: true,
              totalAmount: true,
            },
          },
        },
      },
    },
  });

  if (!asset) {
    throw new AppError('Asset not found', 404);
  }

  return asset;
};

/**
 * Update an asset
 */
const updateAsset = async (prisma, assetId, data) => {
  // If changing client, verify new client exists
  if (data.clientId) {
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
    });

    if (!client) {
      throw new AppError('Client not found', 404);
    }
  }

  try {
    const asset = await prisma.asset.update({
      where: { id: assetId },
      data: {
        name: data.name,
        identifier: data.identifier,
        type: data.type,
        manufacturer: data.manufacturer,
        model: data.model,
        year: data.year ? Number(data.year) : undefined,
        metadata: data.metadata,
        clientId: data.clientId,
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            type: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    return asset;
  } catch (error) {
    if (error.code === 'P2025') {
      throw new AppError('Asset not found', 404);
    }
    if (error.code === 'P2002') {
      throw new AppError('Asset identifier must be unique within the organization', 409);
    }
    throw error;
  }
};

/**
 * Delete an asset
 */
const deleteAsset = async (prisma, assetId) => {
  // Check if asset has appointments
  const appointmentCount = await prisma.appointment.count({
    where: { assetId },
  });

  if (appointmentCount > 0) {
    throw new AppError(
      'Cannot delete asset with associated appointments. Please remove or reassign appointments first.',
      400
    );
  }

  try {
    await prisma.asset.delete({
      where: { id: assetId },
    });

    return { message: 'Asset deleted successfully' };
  } catch (error) {
    if (error.code === 'P2025') {
      throw new AppError('Asset not found', 404);
    }
    throw error;
  }
};

/**
 * Get assets by client ID
 */
const getAssetsByClientId = async (prisma, clientId) => {
  const assets = await prisma.asset.findMany({
    where: { clientId },
    orderBy: { updatedAt: 'desc' },
  });

  return assets;
};

module.exports = {
  listAssets,
  createAsset,
  getAssetById,
  updateAsset,
  deleteAsset,
  getAssetsByClientId,
};

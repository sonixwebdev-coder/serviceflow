const { AppError } = require('../utils/errors');

/**
 * Asset Service - Handles dynamic asset management
 * Assets can be vehicles, appliances, HVAC units, equipment, etc.
 */

/**
 * Create or update an asset based on payload
 */
const resolveAsset = async (tx, clientId, assetPayload, fallbackId, organizationId) => {
  if (!assetPayload && !fallbackId) return null;

  let asset = null;

  // Try to find existing asset by ID
  if (fallbackId) {
    asset = await tx.asset.findFirst({
      where: {
        id: fallbackId,
        organizationId,
      },
    });
    if (!asset) {
      throw new AppError('Asset-ul nu a fost gasit.', 404);
    }
  }

  if (assetPayload?.id && (!asset || asset.id !== assetPayload.id)) {
    asset = await tx.asset.findFirst({
      where: {
        id: assetPayload.id,
        organizationId,
      },
    });
    if (!asset) {
      throw new AppError('Asset-ul specificat nu a fost gasit.', 404);
    }
  }

  // Try to find by identifier
  if (!asset && assetPayload?.identifier && clientId) {
    asset = await tx.asset.findFirst({
      where: {
        clientId,
        identifier: assetPayload.identifier,
        organizationId,
      },
    });
  }

  // Build data - extract from both top-level and metadata
  const data = {};
  const metadata = assetPayload?.metadata || {};

  // Name: try top-level first, then metadata, then generate default
  if (assetPayload?.name) {
    data.name = assetPayload.name;
  } else if (metadata.name) {
    data.name = metadata.name;
  }

  // Type: handle both 'type' and 'assetType'
  if (assetPayload?.assetType) {
    data.type = assetPayload.assetType;
  } else if (assetPayload?.type) {
    data.type = assetPayload.type;
  } else if (metadata.type) {
    data.type = metadata.type;
  }

  // Identifier: try top-level first, then common metadata fields
  if (assetPayload?.identifier) {
    data.identifier = assetPayload.identifier;
  } else if (metadata.identifier) {
    data.identifier = metadata.identifier;
  } else if (metadata.plateNumber) {
    data.identifier = metadata.plateNumber;
  } else if (metadata.serialNumber) {
    data.identifier = metadata.serialNumber;
  } else if (metadata.vin) {
    data.identifier = metadata.vin;
  }

  // Manufacturer: try top-level first, then metadata (including 'make' for vehicles)
  if (assetPayload?.manufacturer) {
    data.manufacturer = assetPayload.manufacturer;
  } else if (metadata.manufacturer) {
    data.manufacturer = metadata.manufacturer;
  } else if (metadata.make) {
    data.manufacturer = metadata.make;
  }

  // Model
  if (assetPayload?.model) {
    data.model = assetPayload.model;
  } else if (metadata.model) {
    data.model = metadata.model;
  }

  // Year
  let yearValue = assetPayload?.year || metadata.year;
  if (yearValue) {
    const yearInt = Number(yearValue);
    if (Number.isFinite(yearInt)) {
      data.year = Math.round(yearInt);
    }
  }

  // Store complete metadata
  if (assetPayload?.metadata && Object.keys(assetPayload.metadata).length > 0) {
    data.metadata = assetPayload.metadata;
  }

  if (clientId) {
    data.clientId = clientId;
  }

  if (organizationId) {
    data.organizationId = organizationId;
  }

  // Update existing
  if (asset) {
    if (Object.keys(data).length > 0) {
      asset = await tx.asset.update({
        where: { id: asset.id },
        data,
      });
    }
    return asset;
  }

  // Create new
  if (!clientId) {
    throw new AppError('Asset-ul trebuie sa fie asociat cu un client.', 400);
  }

  if (!organizationId) {
    throw new AppError('Organization ID is required', 400);
  }

  // Generate default name using available data
  if (!data.name) {
    const parts = [];

    if (data.manufacturer) parts.push(data.manufacturer);
    if (data.model) parts.push(data.model);
    if (data.year) parts.push(data.year.toString());
    if (data.identifier) parts.push(`(${data.identifier})`);

    if (parts.length > 0) {
      data.name = parts.join(' ');
    } else {
      // Fallback to type-based name
      const typeName = data.type || 'Asset';
      data.name = typeName.charAt(0).toUpperCase() + typeName.slice(1);
    }
  }

  return tx.asset.create({
    data: {
      ...data,
      clientId,
      organizationId,
    },
  });
};

/**
 * List assets with pagination and filtering
 */
const listAssets = async (
  prisma,
  { clientId, type, search, page = 1, limit = 50 },
  options = {}
) => {
  const { locationFilter = {} } = options;
  // Parse pagination params as integers
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 50;

  const where = {};

  // Filter assets through their client's locationId
  if (locationFilter && Object.keys(locationFilter).length > 0) {
    where.client = locationFilter;
  }

  if (clientId) where.clientId = clientId;
  if (type) where.type = type;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { identifier: { contains: search, mode: 'insensitive' } },
      { manufacturer: { contains: search, mode: 'insensitive' } },
      { model: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: { client: true },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.asset.count({ where }),
  ]);

  return { items, total, page: pageNum, limit: limitNum };
};

/**
 * Create a new asset
 */
const createAsset = async (prisma, data) => {
  if (!data.clientId) {
    throw new AppError('Client ID is required', 400);
  }

  // Build asset data
  const assetData = {
    clientId: data.clientId,
    name: data.name,
    type: data.type || 'other',
    identifier: data.identifier || null,
    manufacturer: data.manufacturer || null,
    model: data.model || null,
    year: data.year ? parseInt(data.year) : null,
    metadata: data.metadata || {},
  };

  // Generate name if not provided
  if (!assetData.name) {
    const parts = [];
    if (assetData.manufacturer) parts.push(assetData.manufacturer);
    if (assetData.model) parts.push(assetData.model);
    if (assetData.year) parts.push(assetData.year.toString());
    if (assetData.identifier) parts.push(`(${assetData.identifier})`);

    if (parts.length > 0) {
      assetData.name = parts.join(' ');
    } else {
      const typeName = assetData.type || 'Asset';
      assetData.name = typeName.charAt(0).toUpperCase() + typeName.slice(1);
    }
  }

  return prisma.asset.create({
    data: assetData,
    include: { client: true },
  });
};

/**
 * Get asset by ID
 */
const getAssetById = async (prisma, assetId) => {
  const asset = await prisma.asset.findFirst({
    where: { id: assetId },
    include: { client: true },
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
  const asset = await prisma.asset.findFirst({
    where: { id: assetId },
  });

  if (!asset) {
    throw new AppError('Asset not found', 404);
  }

  const updates = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.type !== undefined) updates.type = data.type;
  if (data.identifier !== undefined) updates.identifier = data.identifier;
  if (data.manufacturer !== undefined) updates.manufacturer = data.manufacturer;
  if (data.model !== undefined) updates.model = data.model;
  if (data.year !== undefined) updates.year = data.year ? parseInt(data.year) : null;
  if (data.metadata !== undefined) updates.metadata = data.metadata;

  return prisma.asset.update({
    where: { id: assetId },
    data: updates,
    include: { client: true },
  });
};

/**
 * Delete an asset
 */
const deleteAsset = async (prisma, assetId) => {
  const asset = await prisma.asset.findFirst({
    where: { id: assetId },
  });

  if (!asset) {
    throw new AppError('Asset not found', 404);
  }

  await prisma.asset.delete({
    where: { id: assetId },
  });

  return { success: true };
};

/**
 * Get all assets for a specific client
 */
const getAssetsByClientId = async (prisma, clientId) => {
  return prisma.asset.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
  });
};

module.exports = {
  resolveAsset,
  listAssets,
  createAsset,
  getAssetById,
  updateAsset,
  deleteAsset,
  getAssetsByClientId,
};

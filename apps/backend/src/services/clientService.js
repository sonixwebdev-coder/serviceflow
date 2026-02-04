const { AppError } = require('../utils/errors');
const { broadcastClientUpdate } = require('../realtime/events');

const listClients = async (prisma, { search, page = 1, limit = 20, isOnline, locationFilter = {} }) => {
  const take = Math.min(limit, 100);
  const skip = (page - 1) * take;

  // Build where clause with search, isOnline filter, and location filter
  const conditions = [];

  // Apply location filter
  if (locationFilter && Object.keys(locationFilter).length > 0) {
    conditions.push(locationFilter);
  }

  if (search) {
    conditions.push({
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { vatNumber: { contains: search, mode: 'insensitive' } },
        { registrationNumber: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { fidelityCardSerie: { contains: search, mode: 'insensitive' } },
      ],
    });
  }

  if (isOnline !== undefined) {
    conditions.push({ isOnline: isOnline === 'true' || isOnline === true });
  }

  const where = conditions.length > 0
    ? (conditions.length === 1 ? conditions[0] : { AND: conditions })
    : undefined;

  const [items, total] = await Promise.all([
    prisma.client.findMany({
      where,
      include: {
        assets: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      skip,
      take,
    }),
    prisma.client.count({ where }),
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

const createClient = async (prisma, data, options = {}) => {
  const { locationId } = options;
  const type = (data.type || 'PF').toUpperCase();
  if (!['PF', 'SRL'].includes(type)) {
    throw new AppError('Invalid client type', 400);
  }

  if (type === 'PF' && !data.firstName && !data.lastName) {
    throw new AppError('Personal clients require a first or last name', 400);
  }

  if (type === 'SRL' && !data.companyName) {
    throw new AppError('Company clients require a company name', 400);
  }

  try {
    const client = await prisma.client.create({
      data: {
        type,
        firstName: data.firstName,
        lastName: data.lastName,
        companyName: data.companyName,
        contactName: data.contactName,
        phone: data.phone,
        email: data.email,
        vatNumber: data.vatNumber,
        registrationNumber: data.registrationNumber,
        address: data.address,
        isOnline: data.isOnline,
        fidelityCardSerie: data.fidelityCardSerie,
        notes: data.notes,
        locationId: data.locationId || locationId || null,
      },
      include: {
        assets: true,
      },
    });

    return client;
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError('Unique constraint violation', 409);
    }
    throw error;
  }
};

const getClientById = async (prisma, clientId) => {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      assets: true,
      appointments: {
        orderBy: { scheduledStart: 'desc' },
        take: 20,
        include: {
          assignees: {
            include: {
              user: true,
            },
          },
          asset: true,
          serviceOrder: true,
        },
      },
    },
  });

  if (!client) {
    throw new AppError('Client not found', 404);
  }

  return client;
};

const updateClient = async (prisma, clientId, data) => {
  const type = data.type ? data.type.toUpperCase() : undefined;
  if (type && !['PF', 'SRL'].includes(type)) {
    throw new AppError('Invalid client type', 400);
  }

  const client = await prisma.client.update({
    where: { id: clientId },
    data: {
      type,
      firstName: data.firstName,
      lastName: data.lastName,
      companyName: data.companyName,
      contactName: data.contactName,
      phone: data.phone,
      email: data.email,
      vatNumber: data.vatNumber,
      registrationNumber: data.registrationNumber,
      address: data.address,
      isOnline: data.isOnline,
      fidelityCardSerie: data.fidelityCardSerie,
      notes: data.notes,
    },
    include: {
      assets: true,
    },
  });

  // Broadcast to client portal
  broadcastClientUpdate('updated', client);

  return client;
};

/**
 * Search clients across multiple fields including asset identifiers
 * @param {string} query - Search query
 * @param {object} options - Search options
 * @returns {Promise<Array>} - Array of matching clients with assets
 */
const searchClients = async (prisma, query, options = {}) => {
  const { limit = 20, locationFilter = {} } = options;

  if (!query || query.trim().length === 0) {
    return [];
  }

  const searchTerm = query.trim();

  // Build where clause with location filter and search
  const whereConditions = [];

  // Apply location filter
  if (locationFilter && Object.keys(locationFilter).length > 0) {
    whereConditions.push(locationFilter);
  }

  // Add search conditions
  whereConditions.push({
    OR: [
      { firstName: { contains: searchTerm, mode: 'insensitive' } },
      { lastName: { contains: searchTerm, mode: 'insensitive' } },
      { phone: { contains: searchTerm, mode: 'insensitive' } },
      { email: { contains: searchTerm, mode: 'insensitive' } },
      { companyName: { contains: searchTerm, mode: 'insensitive' } },
      { contactName: { contains: searchTerm, mode: 'insensitive' } },
      { fidelityCardSerie: { contains: searchTerm, mode: 'insensitive' } },
      // Search by asset identifier and name
      {
        assets: {
          some: {
            OR: [
              { identifier: { contains: searchTerm, mode: 'insensitive' } },
              { manufacturer: { contains: searchTerm, mode: 'insensitive' } },
              { name: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
        },
      },
    ],
  });

  const where = whereConditions.length > 1 ? { AND: whereConditions } : whereConditions[0];

  // Search clients with OR conditions across multiple fields
  const clients = await prisma.client.findMany({
    where,
    include: {
      assets: {
        orderBy: {
          updatedAt: 'desc',
        },
      },
    },
    take: Math.min(limit, 50),
    orderBy: {
      updatedAt: 'desc',
    },
  });

  // Add match metadata to help frontend highlight matches
  const clientsWithMatches = clients.map((client) => {
    const matches = [];
    const lowerQuery = searchTerm.toLowerCase();

    if (client.firstName?.toLowerCase().includes(lowerQuery)) {
      matches.push({ field: 'firstName', label: 'Prenume' });
    }
    if (client.lastName?.toLowerCase().includes(lowerQuery)) {
      matches.push({ field: 'lastName', label: 'Nume' });
    }
    if (client.phone?.toLowerCase().includes(lowerQuery)) {
      matches.push({ field: 'phone', label: 'Telefon' });
    }
    if (client.email?.toLowerCase().includes(lowerQuery)) {
      matches.push({ field: 'email', label: 'Email' });
    }
    if (client.companyName?.toLowerCase().includes(lowerQuery)) {
      matches.push({ field: 'companyName', label: 'Companie' });
    }
    if (client.contactName?.toLowerCase().includes(lowerQuery)) {
      matches.push({ field: 'contactName', label: 'Persoana de contact' });
    }
    if (client.fidelityCardSerie?.toLowerCase().includes(lowerQuery)) {
      matches.push({ field: 'fidelityCardSerie', label: 'Card fidelitate' });
    }

    // Check asset matches
    client.assets?.forEach((asset) => {
      if (asset.identifier?.toLowerCase().includes(lowerQuery)) {
        matches.push({ field: 'identifier', label: 'Identificator', assetId: asset.id });
      }
      if (asset.manufacturer?.toLowerCase().includes(lowerQuery)) {
        matches.push({ field: 'manufacturer', label: 'Producator', assetId: asset.id });
      }
      if (asset.name?.toLowerCase().includes(lowerQuery)) {
        matches.push({ field: 'name', label: 'Nume activ', assetId: asset.id });
      }
    });

    return {
      ...client,
      matchedFields: matches,
    };
  });

  return clientsWithMatches;
};

module.exports = {
  listClients,
  createClient,
  getClientById,
  updateClient,
  searchClients,
};

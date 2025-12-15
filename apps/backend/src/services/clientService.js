const { AppError } = require('../utils/errors');

const listClients = async (prisma, { search, page = 1, limit = 20, isOnline }) => {
  const take = Math.min(limit, 100);
  const skip = (page - 1) * take;

  // Build where clause with search and isOnline filter
  const conditions = [];

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
        vehicles: true,
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

const createClient = async (prisma, data) => {
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
        vehicles: data.vehicles?.length
          ? {
              create: data.vehicles.map((vehicle) => ({
                make: vehicle.make,
                model: vehicle.model,
                year: vehicle.year ? Number(vehicle.year) : null,
                vin: vehicle.vin,
                plateNumber: vehicle.plateNumber,
                carId: vehicle.carId,
                odometerKm: vehicle.odometerKm ? Number(vehicle.odometerKm) : null,
                color: vehicle.color,
                notes: vehicle.notes,
              })),
            }
          : undefined,
      },
      include: {
        vehicles: true,
      },
    });

    return client;
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError('Vehicle VIN must be unique', 409);
    }
    throw error;
  }
};

const getClientById = async (prisma, clientId) => {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      vehicles: true,
      appointments: {
        orderBy: { scheduledStart: 'desc' },
        take: 20,
        include: {
          assignees: {
            include: {
              user: true,
            },
          },
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
      vehicles: true,
    },
  });

  return client;
};

/**
 * Search clients across multiple fields including vehicle plate numbers
 * @param {string} query - Search query
 * @param {object} options - Search options
 * @returns {Promise<Array>} - Array of matching clients with vehicles
 */
const searchClients = async (prisma, query, options = {}) => {
  const { limit = 20 } = options;

  if (!query || query.trim().length === 0) {
    return [];
  }

  const searchTerm = query.trim();

  // Search clients with OR conditions across multiple fields
  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { companyName: { contains: searchTerm, mode: 'insensitive' } },
        { contactName: { contains: searchTerm, mode: 'insensitive' } },
        { fidelityCardSerie: { contains: searchTerm, mode: 'insensitive' } },
        // Search by vehicle plate number
        {
          vehicles: {
            some: {
              OR: [
                { plateNumber: { contains: searchTerm, mode: 'insensitive' } },
                { make: { contains: searchTerm, mode: 'insensitive' } },
              ],
            },
          },
        },
      ],
    },
    include: {
      vehicles: {
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

    // Check vehicle matches
    client.vehicles.forEach((vehicle) => {
      if (vehicle.plateNumber?.toLowerCase().includes(lowerQuery)) {
        matches.push({ field: 'plateNumber', label: 'Numar inmatriculare', vehicleId: vehicle.id });
      }
      if (vehicle.make?.toLowerCase().includes(lowerQuery)) {
        matches.push({ field: 'make', label: 'Marca', vehicleId: vehicle.id });
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

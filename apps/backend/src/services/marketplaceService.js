const { ACTIVITY_SECTORS, getSectorConfig } = require('../constants/activitySectors');

// Shared base query — excludes suspended/cancelled orgs
// NOTE: publicListing opt-out check is done in JS because Prisma's NOT
// with JSON path filters fails when the key doesn't exist in the JSON object.
const BASE_WHERE = {
  status: { notIn: ['SUSPENDED', 'CANCELLED'] },
};

const isPubliclyListed = (org) => org.settings?.publicListing !== false;

/**
 * List organizations for the marketplace (paginated, filtered)
 */
const listOrganizations = async (prisma, { search, sector, city, page = 1, limit = 12 } = {}) => {
  const where = { ...BASE_WHERE };

  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  if (sector) {
    where.activitySector = sector;
  }

  if (city) {
    where.locations = {
      some: {
        city: { equals: city, mode: 'insensitive' },
        isActive: true,
      },
    };
  }

  const allItems = await prisma.organization.findMany({
    where,
    select: {
      id: true,
      name: true,
      slug: true,
      activitySector: true,
      settings: true,
      locations: {
        where: { isActive: true },
        select: {
          id: true,
          city: true,
          isPrimary: true,
        },
        orderBy: { isPrimary: 'desc' },
        take: 1,
      },
    },
    orderBy: { name: 'asc' },
  });

  // Filter out orgs that explicitly opted out of public listing
  const listed = allItems.filter(isPubliclyListed);
  const total = listed.length;

  // Manual pagination after JS filtering
  const start = (page - 1) * limit;
  const paged = listed.slice(start, start + limit);

  const items = paged.map((org) => {
    const services = org.settings?.services || [];
    const primaryLocation = org.locations[0] || null;
    const sectorConfig = ACTIVITY_SECTORS[org.activitySector] || null;

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      activitySector: org.activitySector,
      sectorLabel: sectorConfig?.labelRo || org.activitySector,
      city: primaryLocation?.city || null,
      serviceCount: services.length,
    };
  });

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get organization detail for marketplace
 */
const getOrganizationDetail = async (prisma, slug) => {
  const organization = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      activitySector: true,
      settings: true,
      locations: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          address: true,
          city: true,
          county: true,
          phone: true,
          isPrimary: true,
          operatingHours: true,
        },
        orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
      },
    },
  });

  if (
    !organization ||
    ['SUSPENDED', 'CANCELLED'].includes(organization.status) ||
    !isPubliclyListed(organization)
  ) {
    return null;
  }

  const sectorConfig = getSectorConfig(organization.activitySector);
  const services = organization.settings?.services || [];

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    activitySector: organization.activitySector,
    sectorConfig: sectorConfig
      ? { label: sectorConfig.label, labelRo: sectorConfig.labelRo, icon: sectorConfig.icon }
      : null,
    description: organization.settings?.description || null,
    services,
    locations: organization.locations,
  };
};

/**
 * Get marketplace stats for landing page
 */
const getMarketplaceStats = async (prisma) => {
  const orgs = await prisma.organization.findMany({
    where: BASE_WHERE,
    select: {
      settings: true,
      locations: {
        where: { isActive: true },
        select: { city: true },
      },
    },
  });

  const listed = orgs.filter(isPubliclyListed);

  let serviceCount = 0;
  const cities = new Set();

  for (const org of listed) {
    const services = org.settings?.services || [];
    serviceCount += services.length;
    for (const loc of org.locations) {
      if (loc.city) cities.add(loc.city.toLowerCase());
    }
  }

  return {
    organizationCount: listed.length,
    serviceCount,
    cityCount: cities.size,
  };
};

/**
 * Get available filter options for marketplace
 */
const getMarketplaceFilters = async (prisma) => {
  const orgs = await prisma.organization.findMany({
    where: BASE_WHERE,
    select: {
      settings: true,
      activitySector: true,
      locations: {
        where: { isActive: true },
        select: { city: true },
      },
    },
  });

  const listed = orgs.filter(isPubliclyListed);

  const sectorCounts = {};
  const cityMap = {};

  for (const org of listed) {
    if (org.activitySector) {
      sectorCounts[org.activitySector] = (sectorCounts[org.activitySector] || 0) + 1;
    }
    for (const loc of org.locations) {
      if (loc.city) {
        cityMap[loc.city] = (cityMap[loc.city] || 0) + 1;
      }
    }
  }

  // Return ALL known sectors with counts (0 if none)
  const sectors = Object.keys(ACTIVITY_SECTORS).map((key) => ({
    value: key,
    label: ACTIVITY_SECTORS[key]?.labelRo || key,
    count: sectorCounts[key] || 0,
  }));

  const cities = Object.entries(cityMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { sectors, cities };
};

module.exports = {
  listOrganizations,
  getOrganizationDetail,
  getMarketplaceStats,
  getMarketplaceFilters,
};

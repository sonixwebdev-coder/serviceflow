const { AppError } = require('../utils/errors');
const { ACTIVITY_SECTORS, getSectorConfig } = require('../constants/activitySectors');

/**
 * Default public booking settings
 */
const DEFAULT_PUBLIC_BOOKING = {
  workingHours: {
    start: 9,  // 9 AM
    end: 18,   // 6 PM
  },
  slotDuration: 60, // minutes
  allowWeekends: false,
};

/**
 * Get complete organization settings with sector info
 * @param {Object} prisma - Prisma client
 * @param {String} organizationId - Organization ID
 * @returns {Object} Organization settings
 */
const getOrganizationSettings = async (prisma, organizationId) => {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      settings: true,
      activitySector: true,
    },
  });

  if (!org) {
    throw new AppError('Organization not found', 404);
  }

  const settings = org.settings || {};
  const sectorConfig = getSectorConfig(org.activitySector);

  // Terminology and features are always derived from sector config (not editable)
  // Only publicBooking is editable after onboarding
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    activitySector: org.activitySector,
    sectorConfig,
    terminology: sectorConfig?.terminology || settings.terminology,
    features: {
      useAssets: sectorConfig?.hasAssets ?? true,
      useResources: true,
      requireAssetForAppointment: false,
    },
    publicBooking: settings.publicBooking || DEFAULT_PUBLIC_BOOKING,
  };
};

/**
 * Get organization sector info
 * @param {Object} prisma - Prisma client
 * @param {String} organizationId - Organization ID
 * @returns {Object} Sector info
 */
const getSectorInfo = async (prisma, organizationId) => {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { activitySector: true },
  });

  if (!org) {
    throw new AppError('Organization not found', 404);
  }

  const sectorConfig = getSectorConfig(org.activitySector);

  return {
    activitySector: org.activitySector,
    ...sectorConfig,
  };
};

/**
 * Update public booking settings (only editable settings after onboarding)
 * @param {Object} prisma - Prisma client
 * @param {String} organizationId - Organization ID
 * @param {Object} publicBooking - Public booking settings
 * @returns {Object} Updated settings
 */
const updatePublicBooking = async (prisma, organizationId, publicBooking) => {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });

  if (!org) {
    throw new AppError('Organization not found', 404);
  }

  const currentSettings = org.settings || {};

  // Only allow updating workingHours, slotDuration, allowWeekends
  // Do NOT allow changing serviceType (derived from activitySector)
  const updatedSettings = {
    ...currentSettings,
    publicBooking: {
      ...DEFAULT_PUBLIC_BOOKING,
      ...currentSettings.publicBooking,
      workingHours: {
        ...DEFAULT_PUBLIC_BOOKING.workingHours,
        ...(currentSettings.publicBooking?.workingHours || {}),
        ...(publicBooking.workingHours || {}),
      },
      slotDuration: publicBooking.slotDuration ?? currentSettings.publicBooking?.slotDuration ?? DEFAULT_PUBLIC_BOOKING.slotDuration,
      allowWeekends: publicBooking.allowWeekends ?? currentSettings.publicBooking?.allowWeekends ?? DEFAULT_PUBLIC_BOOKING.allowWeekends,
    },
  };

  await prisma.organization.update({
    where: { id: organizationId },
    data: { settings: updatedSettings },
  });

  return updatedSettings;
};

/**
 * Get services from organization settings
 * @param {Object} prisma - Prisma client
 * @param {String} organizationId - Organization ID
 * @returns {Array} Services array
 */
const getServices = async (prisma, organizationId) => {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });

  if (!org) {
    throw new AppError('Organization not found', 404);
  }

  return (org.settings || {}).services || [];
};

/**
 * Update services in organization settings (full replacement)
 * @param {Object} prisma - Prisma client
 * @param {String} organizationId - Organization ID
 * @param {Array} services - Services array
 * @returns {Array} Updated services array
 */
const updateServices = async (prisma, organizationId, services) => {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });

  if (!org) {
    throw new AppError('Organization not found', 404);
  }

  const currentSettings = org.settings || {};

  const updatedSettings = {
    ...currentSettings,
    services,
  };

  await prisma.organization.update({
    where: { id: organizationId },
    data: { settings: updatedSettings },
  });

  return services;
};

module.exports = {
  getOrganizationSettings,
  getSectorInfo,
  updatePublicBooking,
  getServices,
  updateServices,
  DEFAULT_PUBLIC_BOOKING,
};

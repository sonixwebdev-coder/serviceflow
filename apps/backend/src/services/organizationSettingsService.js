const { AppError } = require('../utils/errors');
const { getDefaultFieldConfig, getAvailableAssetTypes } = require('../constants/assetFieldTemplates');

/**
 * Default terminology for new organizations
 * Can be customized per organization
 */
const DEFAULT_TERMINOLOGY = {
  asset: {
    singular: 'Vehicle',
    plural: 'Vehicles',
    identifier: 'Plate Number',
  },
  resource: {
    singular: 'Service Bay',
    plural: 'Service Bays',
  },
};

/**
 * Default feature flags for new organizations
 */
const DEFAULT_FEATURES = {
  useAssets: true,
  useResources: true,
  requireAssetForAppointment: false,
};

/**
 * Default public booking settings for client portal
 */
const DEFAULT_PUBLIC_BOOKING = {
  serviceType: 'VEHICLE', // VEHICLE, ASSET, or GENERAL
  workingHours: {
    start: 9,  // 9 AM
    end: 18,   // 6 PM
  },
  slotDuration: 60, // minutes
  allowWeekends: false,
};

/**
 * Generate default asset field configuration for all asset types
 */
const DEFAULT_ASSET_FIELD_CONFIG = {
  vehicle: getDefaultFieldConfig('vehicle'),
  appliance: getDefaultFieldConfig('appliance'),
  hvac_unit: getDefaultFieldConfig('hvac_unit'),
  equipment: getDefaultFieldConfig('equipment'),
  other: getDefaultFieldConfig('other'),
};

/**
 * Get complete organization settings with defaults
 * @param {Object} prisma - Prisma client
 * @param {String} organizationId - Organization ID
 * @returns {Object} Organization settings
 */
const getOrganizationSettings = async (prisma, organizationId) => {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, slug: true, settings: true },
  });

  if (!org) {
    throw new AppError('Organization not found', 404);
  }

  // Merge stored settings with defaults
  const settings = org.settings || {};

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    terminology: settings.terminology || DEFAULT_TERMINOLOGY,
    features: settings.features || DEFAULT_FEATURES,
    assetFieldConfig: settings.assetFieldConfig || DEFAULT_ASSET_FIELD_CONFIG,
    publicBooking: settings.publicBooking || DEFAULT_PUBLIC_BOOKING,
  };
};

/**
 * Update organization terminology
 * @param {Object} prisma - Prisma client
 * @param {String} organizationId - Organization ID
 * @param {Object} terminology - New terminology settings
 * @returns {Object} Updated settings
 */
const updateTerminology = async (prisma, organizationId, terminology) => {
  // Get current settings
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });

  if (!org) {
    throw new AppError('Organization not found', 404);
  }

  const currentSettings = org.settings || {};

  // Merge terminology with existing settings
  const updatedSettings = {
    ...currentSettings,
    terminology: {
      ...DEFAULT_TERMINOLOGY,
      ...currentSettings.terminology,
      ...terminology,
    },
  };

  // Update in database
  await prisma.organization.update({
    where: { id: organizationId },
    data: { settings: updatedSettings },
  });

  return updatedSettings;
};

/**
 * Update organization features
 * @param {Object} prisma - Prisma client
 * @param {String} organizationId - Organization ID
 * @param {Object} features - New feature flags
 * @returns {Object} Updated settings
 */
const updateFeatures = async (prisma, organizationId, features) => {
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
    features: {
      ...DEFAULT_FEATURES,
      ...currentSettings.features,
      ...features,
    },
  };

  await prisma.organization.update({
    where: { id: organizationId },
    data: { settings: updatedSettings },
  });

  return updatedSettings;
};

/**
 * Update complete organization settings
 * @param {Object} prisma - Prisma client
 * @param {String} organizationId - Organization ID
 * @param {Object} settings - Complete settings object
 * @returns {Object} Updated settings
 */
const updateOrganizationSettings = async (prisma, organizationId, settings) => {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });

  if (!org) {
    throw new AppError('Organization not found', 404);
  }

  const currentSettings = org.settings || {};

  // Merge with defaults
  const updatedSettings = {
    terminology: {
      ...DEFAULT_TERMINOLOGY,
      ...currentSettings.terminology,
      ...settings.terminology,
    },
    features: {
      ...DEFAULT_FEATURES,
      ...currentSettings.features,
      ...settings.features,
    },
    assetFieldConfig: {
      ...DEFAULT_ASSET_FIELD_CONFIG,
      ...currentSettings.assetFieldConfig,
      ...settings.assetFieldConfig,
    },
  };

  await prisma.organization.update({
    where: { id: organizationId },
    data: { settings: updatedSettings },
  });

  return updatedSettings;
};

/**
 * Update asset field configuration
 * @param {Object} prisma - Prisma client
 * @param {String} organizationId - Organization ID
 * @param {Object} assetFieldConfig - Asset field configuration
 * @returns {Object} Updated settings
 */
const updateAssetFieldConfig = async (prisma, organizationId, assetFieldConfig) => {
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
    assetFieldConfig: {
      ...DEFAULT_ASSET_FIELD_CONFIG,
      ...currentSettings.assetFieldConfig,
      ...assetFieldConfig,
    },
  };

  await prisma.organization.update({
    where: { id: organizationId },
    data: { settings: updatedSettings },
  });

  return updatedSettings;
};

/**
 * Update public booking settings
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

  const updatedSettings = {
    ...currentSettings,
    publicBooking: {
      ...DEFAULT_PUBLIC_BOOKING,
      ...currentSettings.publicBooking,
      ...publicBooking,
      // Handle nested workingHours object
      workingHours: {
        ...DEFAULT_PUBLIC_BOOKING.workingHours,
        ...(currentSettings.publicBooking?.workingHours || {}),
        ...(publicBooking.workingHours || {}),
      },
    },
  };

  await prisma.organization.update({
    where: { id: organizationId },
    data: { settings: updatedSettings },
  });

  return updatedSettings;
};

/**
 * Initialize default settings for a new organization
 * @param {Object} prisma - Prisma client
 * @param {String} organizationId - Organization ID
 * @returns {Object} Default settings
 */
const initializeDefaultSettings = async (prisma, organizationId) => {
  const defaultSettings = {
    terminology: DEFAULT_TERMINOLOGY,
    features: DEFAULT_FEATURES,
    assetFieldConfig: DEFAULT_ASSET_FIELD_CONFIG,
    publicBooking: DEFAULT_PUBLIC_BOOKING,
  };

  await prisma.organization.update({
    where: { id: organizationId },
    data: { settings: defaultSettings },
  });

  return defaultSettings;
};

module.exports = {
  getOrganizationSettings,
  updateTerminology,
  updateFeatures,
  updateAssetFieldConfig,
  updatePublicBooking,
  updateOrganizationSettings,
  initializeDefaultSettings,
  DEFAULT_TERMINOLOGY,
  DEFAULT_FEATURES,
  DEFAULT_ASSET_FIELD_CONFIG,
  DEFAULT_PUBLIC_BOOKING,
};

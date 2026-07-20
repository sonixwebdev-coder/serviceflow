const prisma = require('../../lib/prisma');
const { AppError } = require('../utils/errors');
const cache = require('../utils/cache');

const COMPANY_SETTING_KEYS = [
  'companyName',
  'legalName',
  'address',
  'email',
  'phone',
  'website',
  'logoUrl',
  'vatNumber',
  'registrationNumber',
  'bankName',
  'iban',
  'swift',
  'contactPerson',
  'footerNote',
  'gdprNote',
  'additionalNote',
  'rampCount',
  'tvaEnabled',
  'tvaPercentage',
  'entityType',
  'cnp',
];

const DEFAULT_SETTINGS = {
  companyName: '',
  legalName: '',
  address: '',
  email: '',
  phone: '',
  website: '',
  logoUrl: '',
  vatNumber: '',
  registrationNumber: '',
  bankName: '',
  iban: '',
  swift: '',
  contactPerson: '',
  footerNote: '',
  gdprNote: '',
  additionalNote: '',
  rampCount: 4,
  tvaEnabled: false,
  tvaPercentage: 19,
  entityType: '',
  cnp: '',
};

/**
 * Merge a profile row with defaults, returning a flat settings object.
 */
const profileToSettings = (profile) => {
  if (!profile) return { ...DEFAULT_SETTINGS };

  return {
    companyName: profile.companyName || DEFAULT_SETTINGS.companyName,
    legalName: profile.legalName || DEFAULT_SETTINGS.legalName,
    address: profile.address || DEFAULT_SETTINGS.address,
    email: profile.email || DEFAULT_SETTINGS.email,
    phone: profile.phone || DEFAULT_SETTINGS.phone,
    website: profile.website || DEFAULT_SETTINGS.website,
    logoUrl: profile.logoUrl ?? DEFAULT_SETTINGS.logoUrl,
    vatNumber: profile.vatNumber || DEFAULT_SETTINGS.vatNumber,
    registrationNumber: profile.registrationNumber || DEFAULT_SETTINGS.registrationNumber,
    bankName: profile.bankName || DEFAULT_SETTINGS.bankName,
    iban: profile.iban || DEFAULT_SETTINGS.iban,
    swift: profile.swift || DEFAULT_SETTINGS.swift,
    contactPerson: profile.contactPerson || DEFAULT_SETTINGS.contactPerson,
    footerNote: profile.footerNote || DEFAULT_SETTINGS.footerNote,
    gdprNote: profile.gdprNote || DEFAULT_SETTINGS.gdprNote,
    additionalNote: profile.additionalNote || DEFAULT_SETTINGS.additionalNote,
    rampCount: profile.rampCount ?? DEFAULT_SETTINGS.rampCount,
    tvaEnabled: profile.tvaEnabled ?? DEFAULT_SETTINGS.tvaEnabled,
    tvaPercentage: profile.tvaPercentage ?? DEFAULT_SETTINGS.tvaPercentage,
    entityType: profile.entityType || DEFAULT_SETTINGS.entityType,
    cnp: profile.cnp || DEFAULT_SETTINGS.cnp,
  };
};

/**
 * Get company settings for an organization.
 * Supports getCompanySettings('orgId') or getCompanySettings({ organizationId, skipCache }).
 */
const getCompanySettings = async (orgIdOrOptions = {}) => {
  let organizationId = null;
  let skipCache = false;

  if (typeof orgIdOrOptions === 'string') {
    organizationId = orgIdOrOptions;
  } else if (orgIdOrOptions && typeof orgIdOrOptions === 'object') {
    organizationId = orgIdOrOptions.organizationId || null;
    skipCache = orgIdOrOptions.skipCache || false;
  }

  const cacheKey = organizationId
    ? `company:settings:${organizationId}`
    : cache.companySettingsKey();

  if (!skipCache) {
    const cached = await cache.get(cacheKey);
    if (cached) return cached;
  }

  const profile = organizationId
    ? await prisma.organizationProfile.findUnique({ where: { organizationId } })
    : null;

  const settings = profileToSettings(profile);

  await cache.set(cacheKey, settings, cache.TTL.LONG);
  return settings;
};

const updateCompanySettings = async (payload, currentUser) => {
  if (!currentUser) {
    throw new AppError('Authentication required', 401);
  }

  const organizationId = currentUser.organizationId || null;

  // Filter to known keys only
  const updates = COMPANY_SETTING_KEYS.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      acc[key] = payload[key];
    }
    return acc;
  }, {});

  // Strip locked fields - set at signup, not updatable via settings
  const LOCKED_FIELDS = ['vatNumber', 'companyName', 'entityType'];
  LOCKED_FIELDS.forEach((key) => delete updates[key]);

  if (!Object.keys(updates).length) {
    return getCompanySettings(organizationId);
  }

  // Validate typed fields
  if (Object.prototype.hasOwnProperty.call(updates, 'rampCount')) {
    const parsed = Number(updates.rampCount);
    if (!Number.isFinite(parsed) || parsed < 1) {
      throw new AppError('Ramp count must be a positive number', 400);
    }
    updates.rampCount = Math.floor(parsed);
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'tvaEnabled')) {
    updates.tvaEnabled = updates.tvaEnabled === true || updates.tvaEnabled === 'true';
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'tvaPercentage')) {
    const parsed = Number(updates.tvaPercentage);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      throw new AppError('TVA percentage must be between 0 and 100', 400);
    }
    updates.tvaPercentage = parsed;
  }

  await prisma.organizationProfile.upsert({
    where: { organizationId },
    update: updates,
    create: { organizationId, ...updates },
  });

  const cacheKey = organizationId
    ? `company:settings:${organizationId}`
    : cache.companySettingsKey();
  await cache.del(cacheKey);

  return getCompanySettings({ organizationId, skipCache: true });
};

module.exports = {
  COMPANY_SETTING_KEYS,
  DEFAULT_SETTINGS,
  getCompanySettings,
  updateCompanySettings,
};

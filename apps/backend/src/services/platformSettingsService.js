const prisma = require('../../lib/prisma');

let cachedSettings = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 60 seconds

const getSettings = async () => {
  const now = Date.now();
  if (cachedSettings && now - cacheTimestamp < CACHE_TTL) {
    return cachedSettings;
  }

  const settings = await prisma.platformSettings.findUnique({
    where: { id: 'singleton' },
  });

  cachedSettings = settings;
  cacheTimestamp = now;
  return settings;
};

const updateSettings = async (data) => {
  const settings = await prisma.platformSettings.update({
    where: { id: 'singleton' },
    data,
  });

  invalidateCache();
  return settings;
};

const maskSecrets = (settings) => {
  if (!settings) return settings;

  const mask = (value) => {
    if (!value || typeof value !== 'string') return value;
    if (value.length <= 4) return '****';
    return '****' + value.slice(-4);
  };

  // Safe fields that can be returned as-is
  const SAFE_FIELDS = new Set([
    'id',
    'createdAt',
    'updatedAt',
    'trialDays',
    'displayPriceStarterMonthly',
    'displayPriceStarterAnnual',
    'displayPriceProfessionalMonthly',
    'displayPriceProfessionalAnnual',
    'displayPriceEnterpriseMonthly',
    'displayPriceEnterpriseAnnual',
    'addonPriceClients100',
    'addonPriceClients300',
    'addonPriceAppointments200',
    'addonPriceAppointments500',
  ]);

  const result = {};
  for (const [key, value] of Object.entries(settings)) {
    result[key] = SAFE_FIELDS.has(key) ? value : mask(value);
  }
  return result;
};

const invalidateCache = () => {
  cachedSettings = null;
  cacheTimestamp = 0;
};

module.exports = {
  getSettings,
  updateSettings,
  maskSecrets,
  invalidateCache,
};

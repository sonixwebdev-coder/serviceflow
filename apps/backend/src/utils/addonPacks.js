/**
 * Add-on pack configuration
 * Default prices are in bani (RON cents) for Stripe.
 * Admin can override prices via PlatformSettings.
 */

const DEFAULT_ADDON_PACKS = {
  CLIENTS_100: {
    resource: 'clients',
    amount: 100,
    price: 1500,
    label: '+100 clienti',
    permanent: true,
    settingsKey: 'addonPriceClients100',
    priceIdKey: 'addonPriceIdClients100',
  },
  CLIENTS_300: {
    resource: 'clients',
    amount: 300,
    price: 2900,
    label: '+300 clienti',
    permanent: true,
    settingsKey: 'addonPriceClients300',
    priceIdKey: 'addonPriceIdClients300',
  },
  APPOINTMENTS_200: {
    resource: 'appointments',
    amount: 200,
    price: 900,
    label: '+200 programari',
    permanent: false,
    settingsKey: 'addonPriceAppointments200',
    priceIdKey: 'addonPriceIdAppointments200',
  },
  APPOINTMENTS_500: {
    resource: 'appointments',
    amount: 500,
    price: 1900,
    label: '+500 programari',
    permanent: false,
    settingsKey: 'addonPriceAppointments500',
    priceIdKey: 'addonPriceIdAppointments500',
  },
};

/**
 * Resolve addon pack with price from settings (if configured) or default.
 */
const resolveAddonPack = (type, settings) => {
  const pack = DEFAULT_ADDON_PACKS[type];
  if (!pack) return null;

  const overridePrice = settings?.[pack.settingsKey];
  const stripePriceId = settings?.[pack.priceIdKey] || null;
  return {
    resource: pack.resource,
    amount: pack.amount,
    price: overridePrice && overridePrice > 0 ? overridePrice : pack.price,
    label: pack.label,
    permanent: pack.permanent,
    stripePriceId,
  };
};

const getAddonPack = (type, settings) => resolveAddonPack(type, settings);

const getAvailableAddons = (settings) =>
  Object.keys(DEFAULT_ADDON_PACKS).map((type) => {
    const resolved = resolveAddonPack(type, settings);
    return {
      type,
      ...resolved,
      priceFormatted: `${(resolved.price / 100).toFixed(0)} RON`,
    };
  });

// Keep ADDON_PACKS export for backward compat (used only for type enumeration)
const ADDON_PACKS = DEFAULT_ADDON_PACKS;

module.exports = {
  ADDON_PACKS,
  getAddonPack,
  getAvailableAddons,
};

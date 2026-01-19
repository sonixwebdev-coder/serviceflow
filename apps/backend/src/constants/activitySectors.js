/**
 * Activity Sector definitions
 * Maps business sectors to their asset types and terminology
 */

const ACTIVITY_SECTORS = {
  AUTOMOTIVE: {
    key: 'AUTOMOTIVE',
    label: 'Automotive',
    labelRo: 'Service Auto',
    description: 'Service auto, ITP, vulcanizare, spalatorie',
    icon: 'Car',
    assetType: 'vehicle',
    hasAssets: true,
    terminology: {
      asset: { singular: 'Vehicul', plural: 'Vehicule', identifier: 'Numar inmatriculare' },
      resource: { singular: 'Rampa service', plural: 'Rampe service' },
    },
  },
  BEAUTY: {
    key: 'BEAUTY',
    label: 'Beauty & Personal Care',
    labelRo: 'Frumusete & Ingrijire',
    description: 'Frizerie, coafor, makeup, cosmetica, manichiura',
    icon: 'Scissors',
    assetType: null,
    hasAssets: false,
    terminology: {
      asset: { singular: 'Serviciu', plural: 'Servicii', identifier: 'Cod' },
      resource: { singular: 'Specialist', plural: 'Specialisti' },
    },
  },
  HOME_SERVICES: {
    key: 'HOME_SERVICES',
    label: 'Home Services',
    labelRo: 'Servicii la Domiciliu',
    description: 'Instalatii sanitare, electricieni, HVAC, reparatii',
    icon: 'Wrench',
    assetType: 'equipment',
    hasAssets: true,
    terminology: {
      asset: { singular: 'Echipament', plural: 'Echipamente', identifier: 'Numar serie' },
      resource: { singular: 'Echipa', plural: 'Echipe' },
    },
  },
  IT_ELECTRONICS: {
    key: 'IT_ELECTRONICS',
    label: 'IT & Electronics',
    labelRo: 'IT & Electronice',
    description: 'Reparatii telefoane, PC, laptop, electrocasnice',
    icon: 'Smartphone',
    assetType: 'appliance',
    hasAssets: true,
    terminology: {
      asset: { singular: 'Dispozitiv', plural: 'Dispozitive', identifier: 'Numar serie' },
      resource: { singular: 'Statie lucru', plural: 'Statii lucru' },
    },
  },
};

/**
 * Get asset type for a given sector
 * @param {string} sector - The activity sector key
 * @returns {string|null} - The asset type or null if no assets
 */
const getAssetTypeForSector = (sector) => ACTIVITY_SECTORS[sector]?.assetType || null;

/**
 * Check if a sector uses assets
 * @param {string} sector - The activity sector key
 * @returns {boolean} - Whether the sector uses assets
 */
const hasAssetsForSector = (sector) => ACTIVITY_SECTORS[sector]?.hasAssets ?? false;

/**
 * Get terminology for a given sector
 * @param {string} sector - The activity sector key
 * @returns {object} - The terminology object
 */
const getTerminologyForSector = (sector) => ACTIVITY_SECTORS[sector]?.terminology;

/**
 * Get sector configuration by key
 * @param {string} sector - The activity sector key
 * @returns {object|null} - The sector configuration
 */
const getSectorConfig = (sector) => ACTIVITY_SECTORS[sector] || null;

/**
 * Get list of all sectors
 * @returns {Array} - Array of sector configurations
 */
const getSectorList = () => Object.values(ACTIVITY_SECTORS);

/**
 * Validate if a sector key is valid
 * @param {string} sector - The activity sector key to validate
 * @returns {boolean} - Whether the sector is valid
 */
const isValidSector = (sector) => sector in ACTIVITY_SECTORS;

module.exports = {
  ACTIVITY_SECTORS,
  getAssetTypeForSector,
  hasAssetsForSector,
  getTerminologyForSector,
  getSectorConfig,
  getSectorList,
  isValidSector,
};

/**
 * Predefined Asset Field Templates
 *
 * These templates define the standard fields for each asset type.
 * Organizations can configure which fields are visible/required and customize labels,
 * but cannot change the underlying field structure (key, type).
 */

const ASSET_FIELD_TEMPLATES = {
  vehicle: {
    name: 'Vehicul',
    description: 'Automobile, motociclete, camioane',
    fields: [
      {
        key: 'make',
        defaultLabel: 'Marca',
        type: 'text',
        placeholder: 'Toyota, BMW, Ford...',
        defaultVisible: true,
        defaultRequired: false,
      },
      {
        key: 'model',
        defaultLabel: 'Model',
        type: 'text',
        placeholder: 'Corolla, X5, Focus...',
        defaultVisible: true,
        defaultRequired: false,
      },
      {
        key: 'year',
        defaultLabel: 'An fabricatie',
        type: 'number',
        placeholder: '2020',
        defaultVisible: true,
        defaultRequired: false,
      },
      {
        key: 'plateNumber',
        defaultLabel: 'Numar inmatriculare',
        type: 'text',
        placeholder: 'B-123-ABC',
        defaultVisible: true,
        defaultRequired: false,
      },
      {
        key: 'vin',
        defaultLabel: 'VIN',
        type: 'text',
        placeholder: '17 caractere',
        defaultVisible: true,
        defaultRequired: false,
      },
      {
        key: 'odometerKm',
        defaultLabel: 'Kilometraj',
        type: 'number',
        placeholder: '50000',
        defaultVisible: true,
        defaultRequired: false,
      },
      {
        key: 'color',
        defaultLabel: 'Culoare',
        type: 'text',
        placeholder: 'Negru, Alb, Rosu...',
        defaultVisible: true,
        defaultRequired: false,
      },
      {
        key: 'engineCapacity',
        defaultLabel: 'Capacitate motor (cc)',
        type: 'number',
        placeholder: '2000',
        defaultVisible: false,
        defaultRequired: false,
      },
      {
        key: 'fuelType',
        defaultLabel: 'Tip combustibil',
        type: 'select',
        options: ['Benzina', 'Motorina', 'GPL', 'Hybrid', 'Electric'],
        defaultVisible: false,
        defaultRequired: false,
      },
    ],
  },

  appliance: {
    name: 'Aparat electrocasnic',
    description: 'Masini de spalat, frigidere, cuptoare',
    fields: [
      {
        key: 'brand',
        defaultLabel: 'Brand',
        type: 'text',
        placeholder: 'Bosch, Samsung, LG...',
        defaultVisible: true,
        defaultRequired: false,
      },
      {
        key: 'model',
        defaultLabel: 'Model',
        type: 'text',
        placeholder: 'Serie 6, WW90...',
        defaultVisible: true,
        defaultRequired: false,
      },
      {
        key: 'serialNumber',
        defaultLabel: 'Numar serie',
        type: 'text',
        placeholder: 'SN123456789',
        defaultVisible: true,
        defaultRequired: true,
      },
      {
        key: 'purchaseDate',
        defaultLabel: 'Data cumparare',
        type: 'date',
        placeholder: '',
        defaultVisible: true,
        defaultRequired: false,
      },
      {
        key: 'warrantyExpiry',
        defaultLabel: 'Expirare garantie',
        type: 'date',
        placeholder: '',
        defaultVisible: true,
        defaultRequired: false,
      },
      {
        key: 'capacity',
        defaultLabel: 'Capacitate',
        type: 'text',
        placeholder: '7kg, 350L, etc.',
        defaultVisible: false,
        defaultRequired: false,
      },
      {
        key: 'energyClass',
        defaultLabel: 'Clasa energetica',
        type: 'select',
        options: ['A+++', 'A++', 'A+', 'A', 'B', 'C', 'D'],
        defaultVisible: false,
        defaultRequired: false,
      },
    ],
  },

  hvac_unit: {
    name: 'Unitate HVAC',
    description: 'Aer conditionat, sisteme de incalzire/racire',
    fields: [
      {
        key: 'brand',
        defaultLabel: 'Brand',
        type: 'text',
        placeholder: 'Daikin, Mitsubishi, Carrier...',
        defaultVisible: true,
        defaultRequired: false,
      },
      {
        key: 'model',
        defaultLabel: 'Model',
        type: 'text',
        placeholder: 'FTXB35C, MSZ-AP...',
        defaultVisible: true,
        defaultRequired: false,
      },
      {
        key: 'serialNumber',
        defaultLabel: 'Numar serie',
        type: 'text',
        placeholder: 'SN123456789',
        defaultVisible: true,
        defaultRequired: true,
      },
      {
        key: 'btuCapacity',
        defaultLabel: 'Capacitate BTU',
        type: 'number',
        placeholder: '12000, 18000, 24000...',
        defaultVisible: true,
        defaultRequired: false,
      },
      {
        key: 'refrigerantType',
        defaultLabel: 'Tip refrigerent',
        type: 'text',
        placeholder: 'R32, R410A, R22...',
        defaultVisible: true,
        defaultRequired: false,
      },
      {
        key: 'installationDate',
        defaultLabel: 'Data instalare',
        type: 'date',
        placeholder: '',
        defaultVisible: true,
        defaultRequired: false,
      },
      {
        key: 'indoorUnit',
        defaultLabel: 'Unitate interioara',
        type: 'text',
        placeholder: 'Model unitate interioara',
        defaultVisible: false,
        defaultRequired: false,
      },
      {
        key: 'outdoorUnit',
        defaultLabel: 'Unitate exterioara',
        type: 'text',
        placeholder: 'Model unitate exterioara',
        defaultVisible: false,
        defaultRequired: false,
      },
    ],
  },

  equipment: {
    name: 'Echipament',
    description: 'Echipamente industriale, masini, unelte',
    fields: [
      {
        key: 'brand',
        defaultLabel: 'Brand',
        type: 'text',
        placeholder: 'Makita, DeWalt, Hilti...',
        defaultVisible: true,
        defaultRequired: false,
      },
      {
        key: 'model',
        defaultLabel: 'Model',
        type: 'text',
        placeholder: 'Model echipament',
        defaultVisible: true,
        defaultRequired: false,
      },
      {
        key: 'serialNumber',
        defaultLabel: 'Numar serie',
        type: 'text',
        placeholder: 'SN123456789',
        defaultVisible: true,
        defaultRequired: true,
      },
      {
        key: 'purchaseDate',
        defaultLabel: 'Data achizitie',
        type: 'date',
        placeholder: '',
        defaultVisible: true,
        defaultRequired: false,
      },
      {
        key: 'power',
        defaultLabel: 'Putere',
        type: 'text',
        placeholder: '1500W, 2HP, etc.',
        defaultVisible: false,
        defaultRequired: false,
      },
      {
        key: 'voltage',
        defaultLabel: 'Tensiune',
        type: 'text',
        placeholder: '220V, 380V, etc.',
        defaultVisible: false,
        defaultRequired: false,
      },
    ],
  },

  other: {
    name: 'Altele',
    description: 'Alte tipuri de active',
    fields: [
      {
        key: 'description',
        defaultLabel: 'Descriere',
        type: 'text',
        placeholder: 'Descriere activ',
        defaultVisible: true,
        defaultRequired: false,
      },
      {
        key: 'identifier',
        defaultLabel: 'Identificator',
        type: 'text',
        placeholder: 'Cod/Serie',
        defaultVisible: true,
        defaultRequired: false,
      },
      {
        key: 'brand',
        defaultLabel: 'Brand/Producator',
        type: 'text',
        placeholder: 'Brand',
        defaultVisible: true,
        defaultRequired: false,
      },
      {
        key: 'model',
        defaultLabel: 'Model',
        type: 'text',
        placeholder: 'Model',
        defaultVisible: true,
        defaultRequired: false,
      },
      {
        key: 'purchaseDate',
        defaultLabel: 'Data achizitie',
        type: 'date',
        placeholder: '',
        defaultVisible: false,
        defaultRequired: false,
      },
    ],
  },
};

/**
 * Get the field template for a specific asset type
 */
const getAssetFieldTemplate = (assetType) => {
  return ASSET_FIELD_TEMPLATES[assetType] || ASSET_FIELD_TEMPLATES.other;
};

/**
 * Get list of all available asset types
 */
const getAvailableAssetTypes = () => {
  return Object.keys(ASSET_FIELD_TEMPLATES).map((key) => ({
    key,
    name: ASSET_FIELD_TEMPLATES[key].name,
    description: ASSET_FIELD_TEMPLATES[key].description,
  }));
};

/**
 * Get default field configuration for an asset type
 */
const getDefaultFieldConfig = (assetType) => {
  const template = getAssetFieldTemplate(assetType);

  const config = {
    visibleFields: [],
    requiredFields: [],
    fieldLabels: {},
  };

  template.fields.forEach((field) => {
    if (field.defaultVisible) {
      config.visibleFields.push(field.key);
    }
    if (field.defaultRequired) {
      config.requiredFields.push(field.key);
    }
    // Use default labels initially
  });

  return config;
};

module.exports = {
  ASSET_FIELD_TEMPLATES,
  getAssetFieldTemplate,
  getAvailableAssetTypes,
  getDefaultFieldConfig,
};

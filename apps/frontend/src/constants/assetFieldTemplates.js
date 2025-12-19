/**
 * Predefined Asset Field Templates (Frontend)
 *
 * This mirrors the backend templates but includes UI-specific metadata
 * like placeholders, input types, and validation rules for rendering forms
 */

export const ASSET_FIELD_TEMPLATES = {
  vehicle: {
    name: 'Vehicul',
    description: 'Automobile, motociclete, camioane',
    fields: {
      make: {
        key: 'make',
        defaultLabel: 'Marca',
        type: 'text',
        placeholder: 'Toyota, BMW, Ford...',
        defaultVisible: true,
        defaultRequired: false,
      },
      model: {
        key: 'model',
        defaultLabel: 'Model',
        type: 'text',
        placeholder: 'Corolla, X5, Focus...',
        defaultVisible: true,
        defaultRequired: false,
      },
      year: {
        key: 'year',
        defaultLabel: 'An fabricatie',
        type: 'number',
        placeholder: '2020',
        defaultVisible: true,
        defaultRequired: false,
      },
      plateNumber: {
        key: 'plateNumber',
        defaultLabel: 'Numar inmatriculare',
        type: 'text',
        placeholder: 'B-123-ABC',
        defaultVisible: true,
        defaultRequired: false,
      },
      vin: {
        key: 'vin',
        defaultLabel: 'VIN',
        type: 'text',
        placeholder: '17 caractere',
        defaultVisible: true,
        defaultRequired: false,
      },
      odometerKm: {
        key: 'odometerKm',
        defaultLabel: 'Kilometraj',
        type: 'number',
        placeholder: '50000',
        defaultVisible: true,
        defaultRequired: false,
      },
      color: {
        key: 'color',
        defaultLabel: 'Culoare',
        type: 'text',
        placeholder: 'Negru, Alb, Rosu...',
        defaultVisible: true,
        defaultRequired: false,
      },
      engineCapacity: {
        key: 'engineCapacity',
        defaultLabel: 'Capacitate motor (cc)',
        type: 'number',
        placeholder: '2000',
        defaultVisible: false,
        defaultRequired: false,
      },
      fuelType: {
        key: 'fuelType',
        defaultLabel: 'Tip combustibil',
        type: 'select',
        options: ['Benzina', 'Motorina', 'GPL', 'Hybrid', 'Electric'],
        defaultVisible: false,
        defaultRequired: false,
      },
    },
  },

  appliance: {
    name: 'Aparat electrocasnic',
    description: 'Masini de spalat, frigidere, cuptoare',
    fields: {
      category: {
        key: 'category',
        defaultLabel: 'Categorie',
        type: 'select',
        options: ['Frigider', 'Masina de spalat', 'Cuptor', 'Aragaz', 'Aspirator', 'Altele'],
        defaultVisible: true,
        defaultRequired: false,
      },
      brand: {
        key: 'brand',
        defaultLabel: 'Brand',
        type: 'text',
        placeholder: 'Bosch, Samsung, LG...',
        defaultVisible: true,
        defaultRequired: false,
      },
      model: {
        key: 'model',
        defaultLabel: 'Model',
        type: 'text',
        placeholder: 'Serie 6, WW90...',
        defaultVisible: true,
        defaultRequired: false,
      },
      serialNumber: {
        key: 'serialNumber',
        defaultLabel: 'Numar serie',
        type: 'text',
        placeholder: 'SN123456789',
        defaultVisible: true,
        defaultRequired: true,
      },
      purchaseDate: {
        key: 'purchaseDate',
        defaultLabel: 'Data cumparare',
        type: 'date',
        placeholder: '',
        defaultVisible: true,
        defaultRequired: false,
      },
      warrantyExpiry: {
        key: 'warrantyExpiry',
        defaultLabel: 'Expirare garantie',
        type: 'date',
        placeholder: '',
        defaultVisible: true,
        defaultRequired: false,
      },
      capacity: {
        key: 'capacity',
        defaultLabel: 'Capacitate',
        type: 'text',
        placeholder: '7kg, 350L, etc.',
        defaultVisible: false,
        defaultRequired: false,
      },
      energyClass: {
        key: 'energyClass',
        defaultLabel: 'Clasa energetica',
        type: 'select',
        options: ['A+++', 'A++', 'A+', 'A', 'B', 'C', 'D'],
        defaultVisible: false,
        defaultRequired: false,
      },
    },
  },

  hvac_unit: {
    name: 'Unitate HVAC',
    description: 'Aer conditionat, sisteme de incalzire/racire',
    fields: {
      unitType: {
        key: 'unitType',
        defaultLabel: 'Tip unitate',
        type: 'select',
        options: ['Aer conditionat', 'Centrala termica', 'Pompa de caldura', 'Ventilatie'],
        defaultVisible: true,
        defaultRequired: false,
      },
      brand: {
        key: 'brand',
        defaultLabel: 'Brand',
        type: 'text',
        placeholder: 'Daikin, Mitsubishi, Carrier...',
        defaultVisible: true,
        defaultRequired: false,
      },
      model: {
        key: 'model',
        defaultLabel: 'Model',
        type: 'text',
        placeholder: 'FTXB35C, MSZ-AP...',
        defaultVisible: true,
        defaultRequired: false,
      },
      serialNumber: {
        key: 'serialNumber',
        defaultLabel: 'Numar serie',
        type: 'text',
        placeholder: 'SN123456789',
        defaultVisible: true,
        defaultRequired: true,
      },
      btuCapacity: {
        key: 'btuCapacity',
        defaultLabel: 'Capacitate BTU',
        type: 'number',
        placeholder: '12000, 18000, 24000...',
        defaultVisible: true,
        defaultRequired: false,
      },
      refrigerantType: {
        key: 'refrigerantType',
        defaultLabel: 'Tip refrigerent',
        type: 'text',
        placeholder: 'R32, R410A, R22...',
        defaultVisible: true,
        defaultRequired: false,
      },
      installationDate: {
        key: 'installationDate',
        defaultLabel: 'Data instalare',
        type: 'date',
        placeholder: '',
        defaultVisible: true,
        defaultRequired: false,
      },
      indoorUnit: {
        key: 'indoorUnit',
        defaultLabel: 'Unitate interioara',
        type: 'text',
        placeholder: 'Model unitate interioara',
        defaultVisible: false,
        defaultRequired: false,
      },
      outdoorUnit: {
        key: 'outdoorUnit',
        defaultLabel: 'Unitate exterioara',
        type: 'text',
        placeholder: 'Model unitate exterioara',
        defaultVisible: false,
        defaultRequired: false,
      },
    },
  },

  equipment: {
    name: 'Echipament',
    description: 'Echipamente industriale, masini, unelte',
    fields: {
      brand: {
        key: 'brand',
        defaultLabel: 'Brand',
        type: 'text',
        placeholder: 'Makita, DeWalt, Hilti...',
        defaultVisible: true,
        defaultRequired: false,
      },
      model: {
        key: 'model',
        defaultLabel: 'Model',
        type: 'text',
        placeholder: 'Model echipament',
        defaultVisible: true,
        defaultRequired: false,
      },
      serialNumber: {
        key: 'serialNumber',
        defaultLabel: 'Numar serie',
        type: 'text',
        placeholder: 'SN123456789',
        defaultVisible: true,
        defaultRequired: true,
      },
      purchaseDate: {
        key: 'purchaseDate',
        defaultLabel: 'Data achizitie',
        type: 'date',
        placeholder: '',
        defaultVisible: true,
        defaultRequired: false,
      },
      power: {
        key: 'power',
        defaultLabel: 'Putere',
        type: 'text',
        placeholder: '1500W, 2HP, etc.',
        defaultVisible: false,
        defaultRequired: false,
      },
      voltage: {
        key: 'voltage',
        defaultLabel: 'Tensiune',
        type: 'text',
        placeholder: '220V, 380V, etc.',
        defaultVisible: false,
        defaultRequired: false,
      },
    },
  },

  other: {
    name: 'Altele',
    description: 'Alte tipuri de active',
    fields: {
      description: {
        key: 'description',
        defaultLabel: 'Descriere',
        type: 'text',
        placeholder: 'Descriere activ',
        defaultVisible: true,
        defaultRequired: false,
      },
      identifier: {
        key: 'identifier',
        defaultLabel: 'Identificator',
        type: 'text',
        placeholder: 'Cod/Serie',
        defaultVisible: true,
        defaultRequired: false,
      },
      brand: {
        key: 'brand',
        defaultLabel: 'Brand/Producator',
        type: 'text',
        placeholder: 'Brand',
        defaultVisible: true,
        defaultRequired: false,
      },
      model: {
        key: 'model',
        defaultLabel: 'Model',
        type: 'text',
        placeholder: 'Model',
        defaultVisible: true,
        defaultRequired: false,
      },
      purchaseDate: {
        key: 'purchaseDate',
        defaultLabel: 'Data achizitie',
        type: 'date',
        placeholder: '',
        defaultVisible: false,
        defaultRequired: false,
      },
    },
  },
};

/**
 * Get the field template for a specific asset type
 */
export const getAssetFieldTemplate = (assetType) => {
  return ASSET_FIELD_TEMPLATES[assetType] || ASSET_FIELD_TEMPLATES.other;
};

/**
 * Get list of all available asset types
 */
export const getAvailableAssetTypes = () => {
  return Object.keys(ASSET_FIELD_TEMPLATES).map((key) => ({
    key,
    name: ASSET_FIELD_TEMPLATES[key].name,
    description: ASSET_FIELD_TEMPLATES[key].description,
  }));
};

/**
 * Get visible fields for an asset type based on organization config
 * @param {string} assetType - The asset type
 * @param {object} assetFieldConfig - Organization's field configuration
 * @returns {Array} Array of field definitions that should be visible
 */
export const getVisibleFields = (assetType, assetFieldConfig) => {
  const template = getAssetFieldTemplate(assetType);
  const config = assetFieldConfig?.[assetType] || {};

  const visibleFieldKeys = config.visibleFields || Object.keys(template.fields).filter(
    key => template.fields[key].defaultVisible
  );

  return visibleFieldKeys.map(fieldKey => {
    const field = template.fields[fieldKey];
    if (!field) return null;

    return {
      ...field,
      label: config.fieldLabels?.[fieldKey] || field.defaultLabel,
      required: config.requiredFields?.includes(fieldKey) || field.defaultRequired,
    };
  }).filter(Boolean);
};

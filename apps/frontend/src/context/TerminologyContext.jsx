import { createContext, useContext, useState, useEffect } from 'react';
import API from '../utils/api';
import { useAuthStore } from '../state/useAuthStore';

const TerminologyContext = createContext();

/**
 * Default terminology (fallback if API call fails)
 */
const DEFAULT_TERMINOLOGY = {
  asset: {
    singular: 'Activ',
    plural: 'Active',
    identifier: 'Identificator',
  },
  resource: {
    singular: 'Resursă',
    plural: 'Resurse',
  },
};

const DEFAULT_FEATURES = {
  useAssets: true,
  useResources: true,
  requireAssetForAppointment: false,
};

const DEFAULT_ASSET_FIELD_CONFIG = {
  vehicle: {
    visibleFields: ['make', 'model', 'year', 'plateNumber', 'vin', 'odometerKm', 'color'],
    requiredFields: [],
    fieldLabels: {},
  },
  appliance: {
    visibleFields: ['category', 'brand', 'model', 'serialNumber', 'purchaseDate', 'warrantyExpiry'],
    requiredFields: ['serialNumber'],
    fieldLabels: {},
  },
  hvac_unit: {
    visibleFields: ['unitType', 'brand', 'model', 'serialNumber', 'btuCapacity', 'refrigerantType', 'installationDate'],
    requiredFields: ['serialNumber'],
    fieldLabels: {},
  },
  equipment: {
    visibleFields: ['brand', 'model', 'serialNumber', 'purchaseDate'],
    requiredFields: ['serialNumber'],
    fieldLabels: {},
  },
  device: {
    visibleFields: ['deviceType', 'brand', 'model', 'serialNumber', 'imei', 'condition', 'storageCapacity', 'color', 'password', 'accessories', 'problemDescription'],
    requiredFields: ['deviceType'],
    fieldLabels: {},
  },
  other: {
    visibleFields: ['description', 'identifier', 'brand', 'model'],
    requiredFields: [],
    fieldLabels: {},
  },
};

const DEFAULT_PUBLIC_BOOKING = {
  serviceType: 'VEHICLE',
  workingHours: { start: 9, end: 18 },
  slotDuration: 60,
  allowWeekends: false,
};

export const TerminologyProvider = ({ children }) => {
  const [terminology, setTerminology] = useState(DEFAULT_TERMINOLOGY);
  const [features, setFeatures] = useState(DEFAULT_FEATURES);
  const [assetFieldConfig, setAssetFieldConfig] = useState(DEFAULT_ASSET_FIELD_CONFIG);
  const [publicBooking, setPublicBooking] = useState(DEFAULT_PUBLIC_BOOKING);
  const [sectorConfig, setSectorConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  const accessToken = useAuthStore((s) => s.accessToken);

  const applySettings = (settings) => {
    if (settings.terminology) setTerminology(settings.terminology);
    if (settings.features) setFeatures(settings.features);
    if (settings.assetFieldConfig) setAssetFieldConfig(settings.assetFieldConfig);
    if (settings.publicBooking) setPublicBooking(settings.publicBooking);
    if (settings.sectorConfig) setSectorConfig(settings.sectorConfig);
  };

  // Fetch terminology from API - only when access token is available
  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchSettings = async () => {
      try {
        const response = await API.get('/organizations/me/settings');
        if (!cancelled) {
          applySettings(response.data.data);
        }
      } catch {
        // Use defaults on error
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchSettings();

    return () => { cancelled = true; };
  }, [accessToken]);

  /**
   * Refresh settings from API (call after updating settings)
   */
  const refreshSettings = async () => {
    try {
      const response = await API.get('/organizations/me/settings');
      const settings = response.data.data;
      applySettings(settings);
      return settings;
    } catch (error) {
      console.error('Failed to refresh settings:', error);
      throw error;
    }
  };

  const value = {
    terminology,
    features,
    assetFieldConfig,
    publicBooking,
    sectorConfig,
    loading,
    refreshSettings,

    // Helper functions for common terminology access
    asset: terminology.asset,
    resource: terminology.resource,

    // Singular forms
    assetSingular: terminology.asset.singular,
    assetPlural: terminology.asset.plural,
    assetIdentifier: terminology.asset.identifier,
    resourceSingular: terminology.resource.singular,
    resourcePlural: terminology.resource.plural,

    // Sector-derived asset type (vehicle, appliance, equipment, etc.)
    assetType: sectorConfig?.assetType || 'vehicle',
  };

  return (
    <TerminologyContext.Provider value={value}>
      {children}
    </TerminologyContext.Provider>
  );
};

/**
 * Hook to access terminology throughout the app
 *
 * @example
 * const { assetSingular, assetPlural } = useTerminology();
 * return <h1>{assetPlural}</h1>; // "Vehicles" or custom term
 */
export const useTerminology = () => {
  const context = useContext(TerminologyContext);

  if (!context) {
    throw new Error('useTerminology must be used within a TerminologyProvider');
  }

  return context;
};

export default TerminologyContext;

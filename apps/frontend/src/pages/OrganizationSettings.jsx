import { useState, useEffect } from 'react';
import { useTerminology } from '../context/TerminologyContext';
import useToast from '../context/useToast';
import API from '../utils/api';
import { Save, RefreshCw, Eye, EyeOff, CheckSquare, Square, Globe, Car, Package, Calendar } from 'lucide-react';
import { getAvailableAssetTypes, getAssetFieldTemplate } from '../constants/assetFieldTemplates';

const SERVICE_TYPE_OPTIONS = [
  { value: 'VEHICLE', label: 'Vehicule', icon: Car, description: 'Service auto, ITP, vulcanizare, spalatorie' },
  { value: 'ASSET', label: 'Echipamente', icon: Package, description: 'IT, electrocasnice, HVAC, utilaje' },
  { value: 'GENERAL', label: 'General', icon: Calendar, description: 'Servicii fara active specifice' },
];

const OrganizationSettings = () => {
  const { terminology: currentTerminology, features: currentFeatures, assetFieldConfig: currentAssetFieldConfig, publicBooking: currentPublicBooking, refreshSettings } = useTerminology();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('terminology');
  const [selectedAssetType, setSelectedAssetType] = useState('vehicle');

  // Terminology form state
  const [terminology, setTerminology] = useState({
    asset: {
      singular: '',
      plural: '',
      identifier: '',
    },
    resource: {
      singular: '',
      plural: '',
    },
  });

  // Features form state
  const [features, setFeatures] = useState({
    useAssets: true,
    useResources: true,
    requireAssetForAppointment: false,
  });

  // Asset field config state
  const [assetFieldConfig, setAssetFieldConfig] = useState({
    vehicle: { visibleFields: [], requiredFields: [], fieldLabels: {} },
    appliance: { visibleFields: [], requiredFields: [], fieldLabels: {} },
    hvac_unit: { visibleFields: [], requiredFields: [], fieldLabels: {} },
    equipment: { visibleFields: [], requiredFields: [], fieldLabels: {} },
    other: { visibleFields: [], requiredFields: [], fieldLabels: {} },
  });

  // Public booking settings state
  const [publicBooking, setPublicBooking] = useState({
    serviceType: 'VEHICLE',
    workingHours: { start: 9, end: 18 },
    slotDuration: 60,
    allowWeekends: false,
  });

  // Initialize form with current values
  useEffect(() => {
    if (currentTerminology) {
      setTerminology(currentTerminology);
    }
  }, [currentTerminology]);

  useEffect(() => {
    if (currentFeatures) {
      setFeatures(currentFeatures);
    }
  }, [currentFeatures]);

  useEffect(() => {
    if (currentAssetFieldConfig) {
      setAssetFieldConfig(currentAssetFieldConfig);
    }
  }, [currentAssetFieldConfig]);

  useEffect(() => {
    if (currentPublicBooking) {
      setPublicBooking(currentPublicBooking);
    }
  }, [currentPublicBooking]);

  const handleTerminologyChange = (category, field, value) => {
    setTerminology((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }));
  };

  const handleFeatureChange = (feature, checked) => {
    setFeatures((prev) => ({
      ...prev,
      [feature]: checked,
    }));
  };

  const saveTerminology = async () => {
    setLoading(true);
    try {
      await API.patch('/organizations/me/settings/terminology', terminology);
      await refreshSettings();

      showToast({
        title: 'Succes',
        description: 'Terminologia a fost actualizata cu succes',
        type: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: error.response?.data?.message || 'Nu s-a putut actualiza terminologia',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveFeatures = async () => {
    setLoading(true);
    try {
      await API.patch('/organizations/me/settings/features', features);
      await refreshSettings();

      showToast({
        title: 'Succes',
        description: 'Functiile au fost actualizate cu succes',
        type: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: error.response?.data?.message || 'Nu s-au putut actualiza functiile',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetToDefaults = () => {
    setTerminology({
      asset: {
        singular: 'Vehicle',
        plural: 'Vehicles',
        identifier: 'Plate Number',
      },
      resource: {
        singular: 'Service Bay',
        plural: 'Service Bays',
      },
    });
  };

  // Asset field config handlers
  const toggleFieldVisibility = (assetType, fieldKey) => {
    setAssetFieldConfig((prev) => {
      const config = prev[assetType] || { visibleFields: [], requiredFields: [], fieldLabels: {} };
      const visibleFields = config.visibleFields || [];
      const isVisible = visibleFields.includes(fieldKey);

      return {
        ...prev,
        [assetType]: {
          ...config,
          visibleFields: isVisible
            ? visibleFields.filter((f) => f !== fieldKey)
            : [...visibleFields, fieldKey],
          // Remove from required if hiding
          requiredFields: isVisible
            ? (config.requiredFields || []).filter((f) => f !== fieldKey)
            : config.requiredFields,
        },
      };
    });
  };

  const toggleFieldRequired = (assetType, fieldKey) => {
    setAssetFieldConfig((prev) => {
      const config = prev[assetType] || { visibleFields: [], requiredFields: [], fieldLabels: {} };
      const requiredFields = config.requiredFields || [];
      const isRequired = requiredFields.includes(fieldKey);

      return {
        ...prev,
        [assetType]: {
          ...config,
          requiredFields: isRequired
            ? requiredFields.filter((f) => f !== fieldKey)
            : [...requiredFields, fieldKey],
        },
      };
    });
  };

  const updateFieldLabel = (assetType, fieldKey, label) => {
    setAssetFieldConfig((prev) => {
      const config = prev[assetType] || { visibleFields: [], requiredFields: [], fieldLabels: {} };

      return {
        ...prev,
        [assetType]: {
          ...config,
          fieldLabels: {
            ...(config.fieldLabels || {}),
            [fieldKey]: label,
          },
        },
      };
    });
  };

  const saveAssetFieldConfig = async () => {
    setLoading(true);
    try {
      await API.patch('/organizations/me/settings/assetFieldConfig', assetFieldConfig);
      await refreshSettings();

      showToast({
        title: 'Succes',
        description: 'Configurarea campurilor a fost actualizata cu succes',
        type: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: error.response?.data?.message || 'Nu s-a putut actualiza configurarea',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePublicBookingChange = (field, value) => {
    setPublicBooking((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleWorkingHoursChange = (field, value) => {
    setPublicBooking((prev) => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [field]: parseInt(value, 10),
      },
    }));
  };

  const savePublicBooking = async () => {
    setLoading(true);
    try {
      await API.patch('/organizations/me/settings/publicBooking', publicBooking);
      await refreshSettings();

      showToast({
        title: 'Succes',
        description: 'Setarile portalului public au fost actualizate cu succes',
        type: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: error.response?.data?.message || 'Nu s-au putut actualiza setarile',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Setari organizatie</h1>
        <p className="text-gray-600 mt-2">
          Personalizeaza modul in care organizatia ta foloseste ServiceFlow
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('terminology')}
            className={`${
              activeTab === 'terminology'
                ? 'border-viperx-primary text-viperx-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            Terminologie
          </button>
          <button
            onClick={() => setActiveTab('features')}
            className={`${
              activeTab === 'features'
                ? 'border-viperx-primary text-viperx-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            Functii
          </button>
          <button
            onClick={() => setActiveTab('assetFields')}
            className={`${
              activeTab === 'assetFields'
                ? 'border-viperx-primary text-viperx-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            Campuri Active
          </button>
          <button
            onClick={() => setActiveTab('publicBooking')}
            className={`${
              activeTab === 'publicBooking'
                ? 'border-viperx-primary text-viperx-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2`}
          >
            <Globe className="w-4 h-4" />
            Portal Public
          </button>
        </nav>
      </div>

      {/* Terminology Tab */}
      {activeTab === 'terminology' && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Personalizeaza terminologia</h2>
            <p className="text-sm text-gray-600 mt-1">
              Adapteaza ServiceFlow la industria ta prin personalizarea termenilor
            </p>
          </div>

          <div className="px-6 py-6 space-y-8">
            {/* Asset Terminology */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Active</h3>
              <p className="text-sm text-gray-600 mb-4">
                Pe ce lucrezi? (ex: Vehicule, Dispozitive, Unitati, Proprietati)
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="asset-singular" className="block text-sm font-medium text-gray-700 mb-1">
                    Forma singular
                  </label>
                  <input
                    type="text"
                    id="asset-singular"
                    placeholder="ex: Vehicul"
                    value={terminology.asset.singular}
                    onChange={(e) => handleTerminologyChange('asset', 'singular', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Exemplu: "Adauga un {terminology.asset.singular || 'Vehicul'} nou"
                  </p>
                </div>

                <div>
                  <label htmlFor="asset-plural" className="block text-sm font-medium text-gray-700 mb-1">
                    Forma plural
                  </label>
                  <input
                    type="text"
                    id="asset-plural"
                    placeholder="ex: Vehicule"
                    value={terminology.asset.plural}
                    onChange={(e) => handleTerminologyChange('asset', 'plural', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Exemplu: "Toate {terminology.asset.plural || 'Vehiculele'}"
                  </p>
                </div>

                <div>
                  <label htmlFor="asset-identifier" className="block text-sm font-medium text-gray-700 mb-1">
                    Eticheta identificator
                  </label>
                  <input
                    type="text"
                    id="asset-identifier"
                    placeholder="ex: Numar inmatriculare"
                    value={terminology.asset.identifier}
                    onChange={(e) => handleTerminologyChange('asset', 'identifier', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Exemplu: "{terminology.asset.identifier || 'Numar inmatriculare'}: ABC-123"
                  </p>
                </div>
              </div>
            </div>

            {/* Resource Terminology */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Resurse</h3>
              <p className="text-sm text-gray-600 mb-4">
                Ce resurse programezi? (ex: Rampe service, Statii de lucru, Echipe)
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="resource-singular" className="block text-sm font-medium text-gray-700 mb-1">
                    Forma singular
                  </label>
                  <input
                    type="text"
                    id="resource-singular"
                    placeholder="ex: Rampa service"
                    value={terminology.resource.singular}
                    onChange={(e) => handleTerminologyChange('resource', 'singular', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Exemplu: "Asigneaza la {terminology.resource.singular || 'Rampa service'}"
                  </p>
                </div>

                <div>
                  <label htmlFor="resource-plural" className="block text-sm font-medium text-gray-700 mb-1">
                    Forma plural
                  </label>
                  <input
                    type="text"
                    id="resource-plural"
                    placeholder="ex: Rampe service"
                    value={terminology.resource.plural}
                    onChange={(e) => handleTerminologyChange('resource', 'plural', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Exemplu: "{terminology.resource.plural || 'Rampe service'} disponibile"
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={resetToDefaults}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-viperx-primary disabled:opacity-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reseteaza la valorile implicite
              </button>

              <button
                onClick={saveTerminology}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-viperx-primary hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-viperx-primary disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Se salveaza...' : 'Salveaza modificarile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Features Tab */}
      {activeTab === 'features' && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Functii aplicatie</h2>
            <p className="text-sm text-gray-600 mt-1">
              Activeaza sau dezactiveaza functiile in functie de nevoile afacerii tale
            </p>
          </div>

          <div className="px-6 py-6 space-y-6">
            <div className="flex items-center justify-between py-4 border-b border-gray-100">
              <div>
                <label htmlFor="use-assets" className="text-sm font-medium text-gray-900 block">
                  Foloseste active
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  Urmareste {terminology.asset.plural.toLowerCase()} pentru clientii tai
                </p>
              </div>
              <input
                type="checkbox"
                id="use-assets"
                checked={features.useAssets}
                onChange={(e) => handleFeatureChange('useAssets', e.target.checked)}
                className="h-4 w-4 text-viperx-primary focus:ring-viperx-primary border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between py-4 border-b border-gray-100">
              <div>
                <label htmlFor="use-resources" className="text-sm font-medium text-gray-900 block">
                  Foloseste resurse
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  Urmareste si programeaza {terminology.resource.plural.toLowerCase()}
                </p>
              </div>
              <input
                type="checkbox"
                id="use-resources"
                checked={features.useResources}
                onChange={(e) => handleFeatureChange('useResources', e.target.checked)}
                className="h-4 w-4 text-viperx-primary focus:ring-viperx-primary border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between py-4">
              <div>
                <label htmlFor="require-asset" className="text-sm font-medium text-gray-900 block">
                  Impune activ pentru programari
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  Forteaza selectarea unui {terminology.asset.singular.toLowerCase()} la crearea programarilor
                </p>
              </div>
              <input
                type="checkbox"
                id="require-asset"
                checked={features.requireAssetForAppointment}
                onChange={(e) => handleFeatureChange('requireAssetForAppointment', e.target.checked)}
                disabled={!features.useAssets}
                className="h-4 w-4 text-viperx-primary focus:ring-viperx-primary border-gray-300 rounded disabled:opacity-50"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end pt-6 border-t border-gray-200">
              <button
                onClick={saveFeatures}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-viperx-primary hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-viperx-primary disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Se salveaza...' : 'Salveaza modificarile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Asset Fields Tab */}
      {activeTab === 'assetFields' && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Configurare campuri active</h2>
            <p className="text-sm text-gray-600 mt-1">
              Personalizeaza ce campuri sunt vizibile si obligatorii pentru fiecare tip de activ
            </p>
          </div>

          <div className="px-6 py-6">
            {/* Asset Type Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecteaza tipul de activ
              </label>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                {getAvailableAssetTypes().map((assetType) => (
                  <button
                    key={assetType.key}
                    onClick={() => setSelectedAssetType(assetType.key)}
                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      selectedAssetType === assetType.key
                        ? 'bg-viperx-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="font-semibold">{assetType.name}</div>
                    <div className="text-xs opacity-75 mt-1">{assetType.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Field Configuration Table */}
            {selectedAssetType && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-semibold text-gray-900">
                    Campuri pentru {getAssetFieldTemplate(selectedAssetType).name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Configureaza vizibilitatea si obligativitatea campurilor
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Camp
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Eticheta personalizata
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vizibil
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Obligatoriu
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.values(getAssetFieldTemplate(selectedAssetType).fields).map((field) => {
                        const isVisible = assetFieldConfig[selectedAssetType]?.visibleFields?.includes(field.key);
                        const isRequired = assetFieldConfig[selectedAssetType]?.requiredFields?.includes(field.key);
                        const customLabel = assetFieldConfig[selectedAssetType]?.fieldLabels?.[field.key] || '';

                        return (
                          <tr key={field.key} className={!isVisible ? 'bg-gray-50 opacity-50' : ''}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{field.defaultLabel}</div>
                              <div className="text-xs text-gray-500">{field.key}</div>
                            </td>
                            <td className="px-6 py-4">
                              <input
                                type="text"
                                value={customLabel}
                                onChange={(e) => updateFieldLabel(selectedAssetType, field.key, e.target.value)}
                                placeholder={field.defaultLabel}
                                disabled={!isVisible}
                                className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => toggleFieldVisibility(selectedAssetType, field.key)}
                                className="inline-flex items-center justify-center p-1 rounded hover:bg-gray-100 transition-colors"
                              >
                                {isVisible ? (
                                  <Eye className="w-5 h-5 text-viperx-primary" />
                                ) : (
                                  <EyeOff className="w-5 h-5 text-gray-400" />
                                )}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => toggleFieldRequired(selectedAssetType, field.key)}
                                disabled={!isVisible}
                                className="inline-flex items-center justify-center p-1 rounded hover:bg-gray-100 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                {isRequired ? (
                                  <CheckSquare className="w-5 h-5 text-viperx-primary" />
                                ) : (
                                  <Square className="w-5 h-5 text-gray-400" />
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Help Text */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>Cum functioneaza:</strong>
                  </p>
                  <ul className="list-disc list-inside text-sm text-blue-800 mt-2 space-y-1">
                    <li>Click pe iconita de ochi pentru a face un camp vizibil sau ascuns</li>
                    <li>Click pe iconita de checkbox pentru a marca un camp ca obligatoriu</li>
                    <li>Campurile ascunse nu pot fi marcate ca obligatorii</li>
                    <li>Etichetele personalizate vor inlocui etichetele implicite in formulare</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
              <button
                onClick={saveAssetFieldConfig}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-viperx-primary hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-viperx-primary disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Se salveaza...' : 'Salveaza modificarile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Public Booking Tab */}
      {activeTab === 'publicBooking' && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Setari portal public</h2>
            <p className="text-sm text-gray-600 mt-1">
              Configureaza cum clientii noi pot face programari prin portalul public
            </p>
          </div>

          <div className="px-6 py-6 space-y-8">
            {/* Service Type Selection */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Tip serviciu</h3>
              <p className="text-sm text-gray-600 mb-4">
                Ce tip de active gestioneaza organizatia ta? Aceasta setare determina ce informatii cer clientilor la programare.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {SERVICE_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handlePublicBookingChange('serviceType', option.value)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      publicBooking.serviceType === option.value
                        ? 'border-viperx-primary bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <option.icon className={`w-6 h-6 ${
                        publicBooking.serviceType === option.value ? 'text-viperx-primary' : 'text-gray-400'
                      }`} />
                      <span className="font-semibold text-gray-900">{option.label}</span>
                    </div>
                    <p className="text-sm text-gray-600">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Working Hours */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Program de lucru</h3>
              <p className="text-sm text-gray-600 mb-4">
                Intervalul orar in care clientii pot face programari
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="work-start" className="block text-sm font-medium text-gray-700 mb-1">
                    Ora de inceput
                  </label>
                  <select
                    id="work-start"
                    value={publicBooking.workingHours?.start || 9}
                    onChange={(e) => handleWorkingHoursChange('start', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="work-end" className="block text-sm font-medium text-gray-700 mb-1">
                    Ora de sfarsit
                  </label>
                  <select
                    id="work-end"
                    value={publicBooking.workingHours?.end || 18}
                    onChange={(e) => handleWorkingHoursChange('end', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Slot Duration */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Durata programarii</h3>
              <p className="text-sm text-gray-600 mb-4">
                Durata implicita a unei programari (in minute)
              </p>

              <select
                value={publicBooking.slotDuration || 60}
                onChange={(e) => handlePublicBookingChange('slotDuration', parseInt(e.target.value, 10))}
                className="w-full md:w-1/3 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
              >
                <option value={15}>15 minute</option>
                <option value={30}>30 minute</option>
                <option value={45}>45 minute</option>
                <option value={60}>1 ora</option>
                <option value={90}>1 ora 30 min</option>
                <option value={120}>2 ore</option>
                <option value={180}>3 ore</option>
                <option value={240}>4 ore</option>
              </select>
            </div>

            {/* Allow Weekends */}
            <div className="flex items-center justify-between py-4 border-t border-gray-100">
              <div>
                <label htmlFor="allow-weekends" className="text-sm font-medium text-gray-900 block">
                  Permite programari in weekend
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  Clientii vor putea face programari si sambata/duminica
                </p>
              </div>
              <input
                type="checkbox"
                id="allow-weekends"
                checked={publicBooking.allowWeekends || false}
                onChange={(e) => handlePublicBookingChange('allowWeekends', e.target.checked)}
                className="h-4 w-4 text-viperx-primary focus:ring-viperx-primary border-gray-300 rounded"
              />
            </div>

            {/* Portal URL Info */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>Link portal public:</strong>
              </p>
              <p className="text-sm text-blue-800 mt-2 font-mono">
                {window.location.origin.replace('3001', '3002')}/book/{currentTerminology ? 'slug-organizatie' : '...'}
              </p>
              <p className="text-xs text-blue-700 mt-2">
                Acest link poate fi distribuit clientilor noi pentru a face programari fara cont.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end pt-6 border-t border-gray-200">
              <button
                onClick={savePublicBooking}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-viperx-primary hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-viperx-primary disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Se salveaza...' : 'Salveaza modificarile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationSettings;

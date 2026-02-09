import { useState, useMemo } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  User,
  Car,
  Package,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  MapPin,
  Smartphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { websiteService } from '@/services/websiteService';

const baseSteps = [
  { id: 'date', title: 'Data', icon: Calendar },
  { id: 'time', title: 'Ora', icon: Clock },
  { id: 'details', title: 'Date personale', icon: User },
];

const locationStep = { id: 'location', title: 'Locatie', icon: MapPin };
const confirmStep = { id: 'confirm', title: 'Confirmare', icon: CheckCircle };

const getStepsForSector = (sectorConfig, hasMultipleLocations) => {
  const steps = [];
  if (hasMultipleLocations) {
    steps.push(locationStep);
  }
  steps.push(...baseSteps);
  if (sectorConfig?.hasAssets) {
    const assetStepTitle = sectorConfig.terminology?.asset?.singular || 'Activ';
    let assetStepIcon = Package;
    if (sectorConfig.assetType === 'vehicle') assetStepIcon = Car;
    else if (sectorConfig.assetType === 'device') assetStepIcon = Smartphone;
    steps.push({ id: 'asset', title: assetStepTitle, icon: assetStepIcon });
  }
  steps.push(confirmStep);
  return steps;
};

export default function BookingPage() {
  const { website, subdomain } = useOutletContext();
  const slug = website?.organization?.slug;
  const primaryColor = website?.branding?.primaryColor || '#2563eb';

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    selectedLocation: null,
    selectedDate: null,
    selectedSlot: null,
    client: { firstName: '', lastName: '', email: '', phone: '' },
    vehicle: { make: '', model: '', year: '', plateNumber: '' },
    asset: { name: '', identifier: '', type: '', manufacturer: '', model: '' },
    device: {
      deviceType: '', brand: '', model: '', serialNumber: '', imei: '',
      condition: '', storageCapacity: '', color: '', password: '',
      accessories: '', problemDescription: '',
    },
    appointment: { title: 'Programare online', description: '' },
    createAccount: false,
    password: '',
  });
  const [bookingResult, setBookingResult] = useState(null);

  // Fetch organization info
  const { data: organization, isLoading: orgLoading, error: orgError } = useQuery({
    queryKey: ['booking-org', slug],
    queryFn: () => websiteService.getOrganization(slug),
    enabled: !!slug,
  });

  const sectorConfig = organization?.sectorConfig;
  const hasAssets = sectorConfig?.hasAssets || false;
  const assetType = sectorConfig?.assetType;
  const assetTerminology = sectorConfig?.terminology?.asset || { singular: 'Activ', plural: 'Active', identifier: 'Identificator' };
  const locations = organization?.locations || [];
  const hasMultipleLocations = organization?.hasMultipleLocations || false;
  const steps = useMemo(() => getStepsForSector(sectorConfig, hasMultipleLocations), [sectorConfig, hasMultipleLocations]);
  const currentStepId = steps[currentStep]?.id;
  const isLastStep = currentStep === steps.length - 1;

  // Auto-select primary location if only one
  useMemo(() => {
    if (locations.length === 1 && !formData.selectedLocation) {
      setFormData((prev) => ({ ...prev, selectedLocation: locations[0] }));
    }
  }, [locations, formData.selectedLocation]);

  // Fetch available dates
  const { data: dates, isLoading: datesLoading } = useQuery({
    queryKey: ['booking-dates', slug],
    queryFn: () => websiteService.getAvailableDates(slug),
    enabled: !!organization,
  });

  // Fetch available slots
  const { data: slots, isLoading: slotsLoading } = useQuery({
    queryKey: ['booking-slots', slug, formData.selectedDate, formData.selectedLocation?.id],
    queryFn: () => websiteService.getAvailableSlots(slug, formData.selectedDate, formData.selectedLocation?.id),
    enabled: !!formData.selectedDate,
  });

  // Create booking mutation
  const bookingMutation = useMutation({
    mutationFn: (data) => websiteService.createBooking(slug, data),
    onSuccess: (result) => {
      setBookingResult(result);
    },
  });

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateNestedFormData = (parent, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value },
    }));
  };

  const canProceed = () => {
    switch (currentStepId) {
      case 'location': return !!formData.selectedLocation;
      case 'date': return !!formData.selectedDate;
      case 'time': return !!formData.selectedSlot;
      case 'details':
        return formData.client.firstName && formData.client.lastName &&
          formData.client.email && formData.client.phone;
      case 'asset': return true;
      case 'confirm': return !formData.createAccount || formData.password.length >= 6;
      default: return false;
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      const bookingData = {
        client: formData.client,
        appointment: {
          ...formData.appointment,
          scheduledStart: formData.selectedSlot.start,
        },
        createAccount: formData.createAccount,
        password: formData.createAccount ? formData.password : null,
        locationId: formData.selectedLocation?.id || null,
      };

      if (hasAssets) {
        if (assetType === 'vehicle' && (formData.vehicle.make || formData.vehicle.plateNumber || formData.vehicle.model)) {
          bookingData.asset = {
            manufacturer: formData.vehicle.make,
            model: formData.vehicle.model,
            year: formData.vehicle.year,
            identifier: formData.vehicle.plateNumber,
            name: `${formData.vehicle.make || ''} ${formData.vehicle.model || ''}`.trim() || null,
          };
        } else if (assetType === 'device' && (formData.device.brand || formData.device.model || formData.device.serialNumber || formData.device.imei)) {
          bookingData.asset = {
            name: `${formData.device.brand || ''} ${formData.device.model || ''}`.trim() || formData.device.deviceType || null,
            manufacturer: formData.device.brand,
            model: formData.device.model,
            identifier: formData.device.serialNumber || formData.device.imei,
            metadata: {
              deviceType: formData.device.deviceType,
              imei: formData.device.imei,
              condition: formData.device.condition,
              storageCapacity: formData.device.storageCapacity,
              color: formData.device.color,
              password: formData.device.password,
              accessories: formData.device.accessories,
              problemDescription: formData.device.problemDescription,
            },
          };
        } else if (assetType !== 'vehicle' && assetType !== 'device' && (formData.asset.name || formData.asset.identifier)) {
          bookingData.asset = formData.asset;
        }
      }

      bookingMutation.mutate(bookingData);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  if (!slug) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">Programarile online nu sunt disponibile momentan.</p>
      </div>
    );
  }

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  if (orgError) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-red-600 mb-4">Serviciul de programari nu este disponibil momentan.</p>
          <Link
            to={`/${subdomain}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: primaryColor }}
          >
            <ArrowLeft className="h-4 w-4" />
            Inapoi la pagina principala
          </Link>
        </div>
      </div>
    );
  }

  // Success screen
  if (bookingResult) {
    return (
      <div className="flex items-center justify-center py-16 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <div
              className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <CheckCircle className="h-8 w-8" style={{ color: primaryColor }} />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Programare confirmata!</h2>
            <p className="text-gray-600 mb-6">
              Programarea ta pentru{' '}
              <strong>
                {new Date(bookingResult.appointment.scheduledStart).toLocaleDateString('ro-RO', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </strong>{' '}
              a fost inregistrata cu succes.
            </p>
            {bookingResult.accountCreated && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-blue-800">
                  <strong>Contul tau a fost creat!</strong> Te poti autentifica cu adresa de email{' '}
                  <strong>{bookingResult.client.email}</strong> si parola aleasa.
                </p>
              </div>
            )}
            <Link
              to={`/${subdomain}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium"
              style={{ backgroundColor: primaryColor }}
            >
              Inapoi la pagina principala
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent';

  return (
    <div className="py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
          <p className="text-gray-600 mt-1">Programeaza o vizita</p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                  index < currentStep
                    ? 'text-white'
                    : index === currentStep
                    ? 'border-2'
                    : 'bg-gray-200 text-gray-500'
                )}
                style={
                  index < currentStep
                    ? { backgroundColor: primaryColor }
                    : index === currentStep
                    ? { borderColor: primaryColor, color: primaryColor, backgroundColor: `${primaryColor}15` }
                    : undefined
                }
              >
                <step.icon className="h-5 w-5" />
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn('h-1 w-8 sm:w-12 mx-1')}
                  style={{ backgroundColor: index < currentStep ? primaryColor : '#e5e7eb' }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{steps[currentStep]?.title}</h2>
          </div>
          <div className="p-6">
            {/* Select Location */}
            {currentStepId === 'location' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Selecteaza locatia unde doresti sa faci programarea.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {locations.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => {
                        updateFormData('selectedLocation', location);
                        updateFormData('selectedDate', null);
                        updateFormData('selectedSlot', null);
                      }}
                      className={cn(
                        'p-4 rounded-lg border text-left transition-colors',
                        formData.selectedLocation?.id === location.id
                          ? 'bg-opacity-5'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                      style={
                        formData.selectedLocation?.id === location.id
                          ? { borderColor: primaryColor, backgroundColor: `${primaryColor}08` }
                          : undefined
                      }
                    >
                      <div className="flex items-start gap-3">
                        <MapPin
                          className="h-5 w-5 mt-0.5 flex-shrink-0"
                          style={{ color: formData.selectedLocation?.id === location.id ? primaryColor : '#9ca3af' }}
                        />
                        <div>
                          <p className="font-medium" style={formData.selectedLocation?.id === location.id ? { color: primaryColor } : undefined}>
                            {location.name}
                            {location.isPrimary && <span className="ml-2 text-xs font-normal text-gray-500">(Principal)</span>}
                          </p>
                          {(location.address || location.city) && (
                            <p className="mt-1 text-sm text-gray-500">
                              {[location.address, location.city, location.county].filter(Boolean).join(', ')}
                            </p>
                          )}
                          {location.phone && <p className="mt-1 text-xs text-gray-400">{location.phone}</p>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Select Date */}
            {currentStepId === 'date' && (
              <div className="space-y-4">
                {datesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" style={{ color: primaryColor }} />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {dates?.map((date) => (
                      <button
                        key={date.date}
                        onClick={() => {
                          updateFormData('selectedDate', date.date);
                          updateFormData('selectedSlot', null);
                        }}
                        className={cn(
                          'p-3 rounded-lg border text-left transition-colors',
                          formData.selectedDate === date.date
                            ? ''
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                        style={
                          formData.selectedDate === date.date
                            ? { borderColor: primaryColor, backgroundColor: `${primaryColor}08`, color: primaryColor }
                            : undefined
                        }
                      >
                        <p className="font-medium">{date.formatted}</p>
                        <p className="text-xs text-gray-500 capitalize">{date.dayOfWeek}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Select Time */}
            {currentStepId === 'time' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Selecteaza ora pentru{' '}
                  <strong>
                    {(() => {
                      const [year, month, day] = formData.selectedDate.split('-').map(Number);
                      const d = new Date(year, month - 1, day);
                      return d.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' });
                    })()}
                  </strong>
                </p>
                {slotsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" style={{ color: primaryColor }} />
                  </div>
                ) : slots?.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">Nu exista intervale disponibile pentru aceasta zi.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slots?.map((slot) => (
                      <button
                        key={slot.start}
                        onClick={() => updateFormData('selectedSlot', slot)}
                        className={cn(
                          'p-3 rounded-lg border text-center transition-colors',
                          formData.selectedSlot?.start === slot.start
                            ? ''
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                        style={
                          formData.selectedSlot?.start === slot.start
                            ? { borderColor: primaryColor, backgroundColor: `${primaryColor}08`, color: primaryColor }
                            : undefined
                        }
                      >
                        <p className="font-medium">{slot.formatted}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Client Details */}
            {currentStepId === 'details' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prenume *</label>
                    <input
                      className={inputClass}
                      style={{ '--tw-ring-color': primaryColor }}
                      value={formData.client.firstName}
                      onChange={(e) => updateNestedFormData('client', 'firstName', e.target.value)}
                      placeholder="Prenume"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nume *</label>
                    <input
                      className={inputClass}
                      value={formData.client.lastName}
                      onChange={(e) => updateNestedFormData('client', 'lastName', e.target.value)}
                      placeholder="Nume"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    className={inputClass}
                    value={formData.client.email}
                    onChange={(e) => updateNestedFormData('client', 'email', e.target.value)}
                    placeholder="email@exemplu.ro"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon *</label>
                  <input
                    type="tel"
                    className={inputClass}
                    value={formData.client.phone}
                    onChange={(e) => updateNestedFormData('client', 'phone', e.target.value)}
                    placeholder="0722123456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motiv programare</label>
                  <input
                    className={inputClass}
                    value={formData.appointment.description}
                    onChange={(e) => updateNestedFormData('appointment', 'description', e.target.value)}
                    placeholder="Descriere scurta (optional)"
                  />
                </div>
              </div>
            )}

            {/* Asset Step */}
            {currentStepId === 'asset' && hasAssets && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Adauga informatii despre {assetTerminology.singular.toLowerCase()} (optional)
                </p>

                {/* Vehicle fields */}
                {assetType === 'vehicle' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                        <input className={inputClass} value={formData.vehicle.make} onChange={(e) => updateNestedFormData('vehicle', 'make', e.target.value)} placeholder="ex: Volkswagen" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                        <input className={inputClass} value={formData.vehicle.model} onChange={(e) => updateNestedFormData('vehicle', 'model', e.target.value)} placeholder="ex: Golf" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">An fabricatie</label>
                        <input type="number" className={inputClass} value={formData.vehicle.year} onChange={(e) => updateNestedFormData('vehicle', 'year', e.target.value)} placeholder="ex: 2020" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{assetTerminology.identifier}</label>
                        <input className={inputClass} value={formData.vehicle.plateNumber} onChange={(e) => updateNestedFormData('vehicle', 'plateNumber', e.target.value)} placeholder="ex: B 123 ABC" />
                      </div>
                    </div>
                  </>
                )}

                {/* Device fields */}
                {assetType === 'device' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tip dispozitiv</label>
                        <select className={inputClass} value={formData.device.deviceType} onChange={(e) => updateNestedFormData('device', 'deviceType', e.target.value)}>
                          <option value="">Selecteaza...</option>
                          <option value="Telefon">Telefon</option>
                          <option value="Tableta">Tableta</option>
                          <option value="Laptop">Laptop</option>
                          <option value="PC Desktop">PC Desktop</option>
                          <option value="Smartwatch">Smartwatch</option>
                          <option value="Consola">Consola</option>
                          <option value="Altele">Altele</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                        <input className={inputClass} value={formData.device.brand} onChange={(e) => updateNestedFormData('device', 'brand', e.target.value)} placeholder="ex: Apple, Samsung" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                        <input className={inputClass} value={formData.device.model} onChange={(e) => updateNestedFormData('device', 'model', e.target.value)} placeholder="ex: iPhone 14" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Stare la receptie</label>
                        <select className={inputClass} value={formData.device.condition} onChange={(e) => updateNestedFormData('device', 'condition', e.target.value)}>
                          <option value="">Selecteaza...</option>
                          <option value="Functional">Functional</option>
                          <option value="Partial functional">Partial functional</option>
                          <option value="Nefunctional">Nefunctional</option>
                          <option value="Deteriorat fizic">Deteriorat fizic</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">IMEI / Numar serie</label>
                        <input className={inputClass} value={formData.device.imei || formData.device.serialNumber} onChange={(e) => updateNestedFormData('device', 'imei', e.target.value)} placeholder="ex: 123456789012345" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cod acces (optional)</label>
                        <input className={inputClass} value={formData.device.password} onChange={(e) => updateNestedFormData('device', 'password', e.target.value)} placeholder="PIN/Pattern pentru testare" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descriere problema</label>
                      <textarea className={`${inputClass} min-h-[80px]`} value={formData.device.problemDescription} onChange={(e) => updateNestedFormData('device', 'problemDescription', e.target.value)} placeholder="Descrieti problema dispozitivului..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Accesorii predate (optional)</label>
                      <input className={inputClass} value={formData.device.accessories} onChange={(e) => updateNestedFormData('device', 'accessories', e.target.value)} placeholder="ex: Incarcator, husa, casti" />
                    </div>
                  </>
                )}

                {/* Generic asset fields */}
                {assetType !== 'vehicle' && assetType !== 'device' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Denumire</label>
                        <input className={inputClass} value={formData.asset.name} onChange={(e) => updateNestedFormData('asset', 'name', e.target.value)} placeholder="ex: Laptop Dell" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{assetTerminology.identifier}</label>
                        <input className={inputClass} value={formData.asset.identifier} onChange={(e) => updateNestedFormData('asset', 'identifier', e.target.value)} placeholder="ex: SN123456" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tip</label>
                        <input className={inputClass} value={formData.asset.type} onChange={(e) => updateNestedFormData('asset', 'type', e.target.value)} placeholder="ex: Laptop, Telefon" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Producator</label>
                        <input className={inputClass} value={formData.asset.manufacturer} onChange={(e) => updateNestedFormData('asset', 'manufacturer', e.target.value)} placeholder="ex: Dell, Apple" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                      <input className={inputClass} value={formData.asset.model} onChange={(e) => updateNestedFormData('asset', 'model', e.target.value)} placeholder="ex: XPS 15" />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Confirmation */}
            {currentStepId === 'confirm' && (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  {formData.selectedLocation && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Locatie:</span>
                      <span className="font-medium">{formData.selectedLocation.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Data si ora:</span>
                    <span className="font-medium">
                      {new Date(formData.selectedSlot.start).toLocaleDateString('ro-RO', {
                        weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nume:</span>
                    <span className="font-medium">{formData.client.firstName} {formData.client.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{formData.client.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Telefon:</span>
                    <span className="font-medium">{formData.client.phone}</span>
                  </div>
                  {hasAssets && assetType === 'vehicle' && formData.vehicle.plateNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{assetTerminology.singular}:</span>
                      <span className="font-medium">
                        {formData.vehicle.make} {formData.vehicle.model} - {formData.vehicle.plateNumber}
                      </span>
                    </div>
                  )}
                  {hasAssets && assetType === 'device' && (formData.device.brand || formData.device.model || formData.device.deviceType) && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{assetTerminology.singular}:</span>
                      <span className="font-medium">
                        {formData.device.deviceType && `${formData.device.deviceType}: `}
                        {formData.device.brand} {formData.device.model}
                        {formData.device.imei && ` (${formData.device.imei})`}
                      </span>
                    </div>
                  )}
                  {hasAssets && assetType !== 'vehicle' && assetType !== 'device' && (formData.asset.name || formData.asset.identifier) && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{assetTerminology.singular}:</span>
                      <span className="font-medium">
                        {formData.asset.name}{formData.asset.identifier && ` - ${formData.asset.identifier}`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.createAccount}
                      onChange={(e) => updateFormData('createAccount', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300"
                      style={{ accentColor: primaryColor }}
                    />
                    <span className="text-sm text-gray-700">
                      Vreau sa imi creez un cont pentru a-mi urmari programarile
                    </span>
                  </label>

                  {formData.createAccount && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Parola (minim 6 caractere)</label>
                      <input
                        type="password"
                        className={inputClass}
                        value={formData.password}
                        onChange={(e) => updateFormData('password', e.target.value)}
                        placeholder="Alege o parola"
                      />
                    </div>
                  )}
                </div>

                {bookingMutation.isError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {bookingMutation.error?.response?.data?.error || 'A aparut o eroare. Te rugam sa incerci din nou.'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50',
              currentStep === 0 && 'invisible'
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Inapoi
          </button>
          <button
            onClick={handleNext}
            disabled={!canProceed() || bookingMutation.isPending}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            {bookingMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isLastStep ? (
              'Confirma programarea'
            ) : (
              <>
                Continua
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

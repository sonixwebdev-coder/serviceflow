import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Calendar, Clock, User, Car, Package, CheckCircle, ArrowLeft, ArrowRight, Loader2, MapPin } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { bookingService } from '@/services/bookingService';
import { cn } from '@/lib/utils';

// Base steps that apply to all organizations
const baseSteps = [
  { id: 'date', title: 'Data', icon: Calendar },
  { id: 'time', title: 'Ora', icon: Clock },
  { id: 'details', title: 'Date personale', icon: User },
];

const locationStep = { id: 'location', title: 'Locatie', icon: MapPin };
const confirmStep = { id: 'confirm', title: 'Confirmare', icon: CheckCircle };

// Get steps based on sector configuration and locations
const getStepsForSector = (sectorConfig, hasMultipleLocations) => {
  const steps = [];

  // Add location step first if multiple locations
  if (hasMultipleLocations) {
    steps.push(locationStep);
  }

  // Add base steps
  steps.push(...baseSteps);

  // Add asset step if sector uses assets
  if (sectorConfig?.hasAssets) {
    const assetStepTitle = sectorConfig.terminology?.asset?.singular || 'Activ';
    const assetStepIcon = sectorConfig.assetType === 'vehicle' ? Car : Package;
    const assetStep = { id: 'asset', title: assetStepTitle, icon: assetStepIcon };
    steps.push(assetStep);
  }

  // Add confirm step
  steps.push(confirmStep);

  return steps;
};

export default function Book() {
  const { slug } = useParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    selectedLocation: null,
    selectedDate: null,
    selectedSlot: null,
    client: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
    },
    vehicle: {
      make: '',
      model: '',
      year: '',
      plateNumber: '',
    },
    asset: {
      name: '',
      identifier: '',
      type: '',
      manufacturer: '',
      model: '',
    },
    appointment: {
      title: 'Programare service',
      description: '',
    },
    createAccount: false,
    password: '',
  });
  const [bookingResult, setBookingResult] = useState(null);

  // Fetch organization info
  const { data: organization, isLoading: orgLoading, error: orgError } = useQuery({
    queryKey: ['organization', slug],
    queryFn: () => bookingService.getOrganization(slug),
  });

  // Get sector config and steps based on organization settings
  const sectorConfig = organization?.sectorConfig;
  const hasAssets = sectorConfig?.hasAssets || false;
  const assetType = sectorConfig?.assetType;
  const assetTerminology = sectorConfig?.terminology?.asset || { singular: 'Activ', plural: 'Active', identifier: 'Identificator' };
  const locations = organization?.locations || [];
  const hasMultipleLocations = organization?.hasMultipleLocations || false;
  const steps = useMemo(() => getStepsForSector(sectorConfig, hasMultipleLocations), [sectorConfig, hasMultipleLocations]);
  const currentStepId = steps[currentStep]?.id;
  const isLastStep = currentStep === steps.length - 1;

  // Auto-select primary location if only one location exists
  useMemo(() => {
    if (locations.length === 1 && !formData.selectedLocation) {
      setFormData((prev) => ({ ...prev, selectedLocation: locations[0] }));
    }
  }, [locations, formData.selectedLocation]);

  // Fetch available dates
  const { data: dates, isLoading: datesLoading } = useQuery({
    queryKey: ['available-dates', slug],
    queryFn: () => bookingService.getAvailableDates(slug),
    enabled: !!organization,
  });

  // Fetch available slots for selected date (filtered by location if selected)
  const { data: slots, isLoading: slotsLoading } = useQuery({
    queryKey: ['available-slots', slug, formData.selectedDate, formData.selectedLocation?.id],
    queryFn: () => bookingService.getAvailableSlots(slug, formData.selectedDate, formData.selectedLocation?.id),
    enabled: !!formData.selectedDate,
  });

  // Create booking mutation
  const bookingMutation = useMutation({
    mutationFn: (data) => bookingService.createBooking(slug, data),
    onSuccess: (result) => {
      setBookingResult(result);
      setCurrentStep(5); // Success step
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
      case 'location':
        return !!formData.selectedLocation;
      case 'date':
        return !!formData.selectedDate;
      case 'time':
        return !!formData.selectedSlot;
      case 'details':
        return (
          formData.client.firstName &&
          formData.client.lastName &&
          formData.client.email &&
          formData.client.phone
        );
      case 'vehicle':
        return true; // Vehicle is optional
      case 'asset':
        return true; // Asset is optional
      case 'confirm':
        return !formData.createAccount || formData.password.length >= 6;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      // Build booking data based on service type
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

      // Add asset data based on sector's asset type
      // Backend expects 'asset' field for all asset types
      if (hasAssets) {
        if (assetType === 'vehicle' && (formData.vehicle.make || formData.vehicle.plateNumber || formData.vehicle.model)) {
          // Map vehicle form data to asset structure
          bookingData.asset = {
            manufacturer: formData.vehicle.make,
            model: formData.vehicle.model,
            year: formData.vehicle.year,
            identifier: formData.vehicle.plateNumber,
            // Generate name from vehicle data
            name: `${formData.vehicle.make || ''} ${formData.vehicle.model || ''}`.trim() || null,
          };
        } else if (assetType !== 'vehicle' && (formData.asset.name || formData.asset.identifier)) {
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

  if (orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (orgError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-8 text-center">
            <p className="text-red-600 mb-4">Organizatia nu a fost gasita</p>
            <Link to="/login">
              <Button variant="secondary">Inapoi la autentificare</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success screen
  if (bookingResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-8 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
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
            <div className="space-y-3">
              <Link to="/login" className="block">
                <Button className="w-full">
                  {bookingResult.accountCreated ? 'Autentifica-te' : 'Ai deja cont? Autentifica-te'}
                </Button>
              </Link>
              <Link to={`/book/${slug}`} className="block">
                <Button variant="secondary" className="w-full" onClick={() => window.location.reload()}>
                  Fa o alta programare
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
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
                    ? 'bg-primary-600 text-white'
                    : index === currentStep
                    ? 'bg-primary-100 text-primary-600 border-2 border-primary-600'
                    : 'bg-gray-200 text-gray-500'
                )}
              >
                <step.icon className="h-5 w-5" />
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'h-1 w-8 sm:w-12 mx-1',
                    index < currentStep ? 'bg-primary-600' : 'bg-gray-200'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <Card>
          <CardHeader>
            <CardTitle>{steps[currentStep].title}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Select Location */}
            {currentStepId === 'location' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Selecteaza locatia unde doresti sa faci programarea.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {locations.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => {
                        updateFormData('selectedLocation', location);
                        // Reset date/slot when changing location
                        updateFormData('selectedDate', null);
                        updateFormData('selectedSlot', null);
                      }}
                      className={cn(
                        'p-4 rounded-lg border text-left transition-colors',
                        formData.selectedLocation?.id === location.id
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <MapPin className={cn(
                          'h-5 w-5 mt-0.5 flex-shrink-0',
                          formData.selectedLocation?.id === location.id ? 'text-primary-600' : 'text-gray-400'
                        )} />
                        <div>
                          <p className={cn(
                            'font-medium',
                            formData.selectedLocation?.id === location.id ? 'text-primary-700' : 'text-gray-900'
                          )}>
                            {location.name}
                            {location.isPrimary && (
                              <span className="ml-2 text-xs font-normal text-gray-500">(Principal)</span>
                            )}
                          </p>
                          {(location.address || location.city) && (
                            <p className="mt-1 text-sm text-gray-500">
                              {[location.address, location.city, location.county].filter(Boolean).join(', ')}
                            </p>
                          )}
                          {location.phone && (
                            <p className="mt-1 text-xs text-gray-400">{location.phone}</p>
                          )}
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
                    <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
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
                            ? 'border-primary-600 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        )}
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
                      // Parse YYYY-MM-DD as local date
                      const [year, month, day] = formData.selectedDate.split('-').map(Number);
                      const date = new Date(year, month - 1, day);
                      return date.toLocaleDateString('ro-RO', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      });
                    })()}
                  </strong>
                </p>
                {slotsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                  </div>
                ) : slots?.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">
                    Nu exista intervale disponibile pentru aceasta zi.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slots?.map((slot) => (
                      <button
                        key={slot.start}
                        onClick={() => updateFormData('selectedSlot', slot)}
                        className={cn(
                          'p-3 rounded-lg border text-center transition-colors',
                          formData.selectedSlot?.start === slot.start
                            ? 'border-primary-600 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        )}
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
                    <label className="label">Prenume *</label>
                    <Input
                      value={formData.client.firstName}
                      onChange={(e) => updateNestedFormData('client', 'firstName', e.target.value)}
                      placeholder="Prenume"
                    />
                  </div>
                  <div>
                    <label className="label">Nume *</label>
                    <Input
                      value={formData.client.lastName}
                      onChange={(e) => updateNestedFormData('client', 'lastName', e.target.value)}
                      placeholder="Nume"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Email *</label>
                  <Input
                    type="email"
                    value={formData.client.email}
                    onChange={(e) => updateNestedFormData('client', 'email', e.target.value)}
                    placeholder="email@exemplu.ro"
                  />
                </div>
                <div>
                  <label className="label">Telefon *</label>
                  <Input
                    type="tel"
                    value={formData.client.phone}
                    onChange={(e) => updateNestedFormData('client', 'phone', e.target.value)}
                    placeholder="0722123456"
                  />
                </div>
                <div>
                  <label className="label">Motiv programare</label>
                  <Input
                    value={formData.appointment.description}
                    onChange={(e) => updateNestedFormData('appointment', 'description', e.target.value)}
                    placeholder="Descriere scurta (optional)"
                  />
                </div>
              </div>
            )}

            {/* Asset Step - Only for sectors with assets */}
            {currentStepId === 'asset' && hasAssets && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Adauga informatii despre {assetTerminology.singular.toLowerCase()} (optional)
                </p>

                {/* Vehicle-specific fields */}
                {assetType === 'vehicle' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">Marca</label>
                        <Input
                          value={formData.vehicle.make}
                          onChange={(e) => updateNestedFormData('vehicle', 'make', e.target.value)}
                          placeholder="ex: Volkswagen"
                        />
                      </div>
                      <div>
                        <label className="label">Model</label>
                        <Input
                          value={formData.vehicle.model}
                          onChange={(e) => updateNestedFormData('vehicle', 'model', e.target.value)}
                          placeholder="ex: Golf"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">An fabricatie</label>
                        <Input
                          type="number"
                          value={formData.vehicle.year}
                          onChange={(e) => updateNestedFormData('vehicle', 'year', e.target.value)}
                          placeholder="ex: 2020"
                        />
                      </div>
                      <div>
                        <label className="label">{assetTerminology.identifier}</label>
                        <Input
                          value={formData.vehicle.plateNumber}
                          onChange={(e) => updateNestedFormData('vehicle', 'plateNumber', e.target.value)}
                          placeholder="ex: B 123 ABC"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Generic asset fields for equipment, appliance, etc. */}
                {assetType !== 'vehicle' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">Denumire</label>
                        <Input
                          value={formData.asset.name}
                          onChange={(e) => updateNestedFormData('asset', 'name', e.target.value)}
                          placeholder="ex: Laptop Dell"
                        />
                      </div>
                      <div>
                        <label className="label">{assetTerminology.identifier}</label>
                        <Input
                          value={formData.asset.identifier}
                          onChange={(e) => updateNestedFormData('asset', 'identifier', e.target.value)}
                          placeholder="ex: SN123456"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">Tip</label>
                        <Input
                          value={formData.asset.type}
                          onChange={(e) => updateNestedFormData('asset', 'type', e.target.value)}
                          placeholder="ex: Laptop, Telefon"
                        />
                      </div>
                      <div>
                        <label className="label">Producator</label>
                        <Input
                          value={formData.asset.manufacturer}
                          onChange={(e) => updateNestedFormData('asset', 'manufacturer', e.target.value)}
                          placeholder="ex: Dell, Apple"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label">Model</label>
                      <Input
                        value={formData.asset.model}
                        onChange={(e) => updateNestedFormData('asset', 'model', e.target.value)}
                        placeholder="ex: XPS 15"
                      />
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
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nume:</span>
                    <span className="font-medium">
                      {formData.client.firstName} {formData.client.lastName}
                    </span>
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
                  {hasAssets && assetType !== 'vehicle' && (formData.asset.name || formData.asset.identifier) && (
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
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">
                      Vreau sa imi creez un cont pentru a-mi urmari programarile
                    </span>
                  </label>

                  {formData.createAccount && (
                    <div className="mt-4">
                      <label className="label">Parola (minim 6 caractere)</label>
                      <Input
                        type="password"
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
          </CardContent>
        </Card>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="secondary"
            onClick={handleBack}
            disabled={currentStep === 0}
            className={currentStep === 0 ? 'invisible' : ''}
          >
            <ArrowLeft className="h-4 w-4" />
            Inapoi
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed() || bookingMutation.isPending}
            isLoading={bookingMutation.isPending}
          >
            {isLastStep ? 'Confirma programarea' : 'Continua'}
            {!isLastStep && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>

        {/* Login link */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-600">
            Ai deja un cont?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Autentifica-te
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

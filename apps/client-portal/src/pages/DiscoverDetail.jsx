import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Phone,
  Clock,
  CalendarCheck,
  Briefcase,
  Navigation,
  Calendar,
  FileText,
  X,
  Loader2,
  Package,
} from 'lucide-react';
import { useMarketplaceOrganization } from '@/hooks/useMarketplace';
import { useProfile, useAssets } from '@/hooks/useProfile';
import { bookingService } from '@/services/bookingService';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { getSectorConfig } from '@/utils/sectors';
import { formatCurrency, cn } from '@/lib/utils';
import useToast from '@/context/useToast';

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DAY_NAMES_RO = {
  monday: 'Luni',
  tuesday: 'Marti',
  wednesday: 'Miercuri',
  thursday: 'Joi',
  friday: 'Vineri',
  saturday: 'Sambata',
  sunday: 'Duminica',
};

export default function DiscoverDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data, isLoading, isError } = useMarketplaceOrganization(slug);
  const { data: profileData } = useProfile();
  const { data: assetsData } = useAssets();

  const [showBookingModal, setShowBookingModal] = useState(false);

  const org = data?.data;
  const profile = profileData?.data || profileData;
  const assets = assetsData?.data || assetsData || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          <p className="text-sm text-gray-400">Se incarca...</p>
        </div>
      </div>
    );
  }

  if (isError || !org) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <Navigation className="h-8 w-8 text-gray-300" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Organizatia nu a fost gasita</h2>
        <p className="mt-2 text-gray-500">Aceasta organizatie nu exista sau nu este disponibila.</p>
        <Link
          to="/discover"
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Inapoi la Descopera
        </Link>
      </div>
    );
  }

  const sector = getSectorConfig(org.activitySector);
  const SectorIcon = sector?.icon;
  const services = org.services || [];
  const locations = org.locations || [];
  const filledLocations = locations.filter((l) => l.address || l.city || l.phone);

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div
        className={`-mx-6 -mt-6 bg-linear-to-r ${sector?.gradient || 'from-primary-500 to-primary-600'}`}
      >
        <div className="px-6 sm:px-8 py-8">
          {/* Back link */}
          <Link
            to="/discover"
            className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Descopera
          </Link>

          <div className="flex items-start gap-4">
            <div className="hidden sm:flex h-14 w-14 rounded-xl bg-white/20 backdrop-blur-xs items-center justify-center shrink-0">
              {SectorIcon && <SectorIcon className="h-7 w-7 text-white" />}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">{org.name}</h1>
                {sector && (
                  <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-white/20 text-white backdrop-blur-xs">
                    {sector.label}
                  </span>
                )}
              </div>
              {org.description && <p className="mt-2 text-white/80 max-w-2xl">{org.description}</p>}
              <div className="mt-4 flex flex-wrap gap-3">
                {filledLocations.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-white/70">
                    <MapPin className="h-4 w-4" />
                    {filledLocations.length} {filledLocations.length === 1 ? 'locatie' : 'locatii'}
                  </span>
                )}
                {services.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-white/70">
                    <Briefcase className="h-4 w-4" />
                    {services.length} {services.length === 1 ? 'serviciu' : 'servicii'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Services */}
          {services.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-gray-400" />
                Servicii oferite
              </h2>
              <div className="space-y-3">
                {services.map((service, index) => (
                  <div
                    key={service.id || index}
                    className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-gray-900">{service.name}</h3>
                      {service.description && (
                        <p className="mt-0.5 text-sm text-gray-500 line-clamp-1">
                          {service.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 ml-4 shrink-0">
                      {service.duration && (
                        <span className="text-sm text-gray-400">{service.duration} min</span>
                      )}
                      {service.price != null && (
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(service.price)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Locations */}
          {filledLocations.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-400" />
                Locatii
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filledLocations.map((loc) => (
                  <Card key={loc.id}>
                    <CardContent>
                      <div className="flex items-start gap-3">
                        <div
                          className={`h-10 w-10 rounded-lg ${sector?.iconBg || 'bg-primary-100'} flex items-center justify-center shrink-0`}
                        >
                          <MapPin
                            className={`h-5 w-5 ${sector?.iconColor || 'text-primary-600'}`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-gray-900">{loc.name}</h3>
                          {(loc.address || loc.city) && (
                            <p className="mt-1 text-sm text-gray-500">
                              {[loc.address, loc.city, loc.county].filter(Boolean).join(', ')}
                            </p>
                          )}
                          {loc.phone && (
                            <p className="mt-1.5 text-sm text-gray-500 flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5" />
                              {loc.phone}
                            </p>
                          )}
                          {loc.operatingHours && Object.keys(loc.operatingHours).length > 0 && (
                            <div className="mt-2 flex items-start gap-1.5 text-sm text-gray-500">
                              <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                              <div className="space-y-0.5">
                                {DAY_ORDER.filter((day) => loc.operatingHours[day]).map((day) => {
                                  const hours = loc.operatingHours[day];
                                  return (
                                    <div key={day}>
                                      <span className="font-medium">
                                        {DAY_NAMES_RO[day] || day}:
                                      </span>{' '}
                                      {hours.closed === true || hours.isOpen === false
                                        ? 'Inchis'
                                        : `${hours.open || hours.openTime} - ${hours.close || hours.closeTime}`}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {services.length === 0 && filledLocations.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-2xl">
              <Briefcase className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                Aceasta companie nu a publicat inca servicii sau detalii de locatie.
              </p>
              <p className="text-sm text-gray-400 mt-1">Poti totusi crea o programare direct.</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            {/* CTA Card */}
            <Card>
              <CardContent className="text-center py-6">
                <CalendarCheck
                  className={`h-10 w-10 mx-auto mb-3 ${sector?.iconColor || 'text-primary-600'}`}
                />
                <h3 className="font-semibold text-gray-900">Programeaza o vizita</h3>
                <p className="mt-1 text-sm text-gray-500">Alege data si ora care ti se potrivesc</p>
                <Button className="w-full mt-4" size="lg" onClick={() => setShowBookingModal(true)}>
                  Programeaza acum
                </Button>
              </CardContent>
            </Card>

            {/* Quick info card */}
            {(filledLocations.length > 0 || sector) && (
              <Card>
                <CardContent className="space-y-4">
                  {sector && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Categorie
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        {SectorIcon && (
                          <div
                            className={`h-8 w-8 rounded-lg ${sector.iconBg} flex items-center justify-center`}
                          >
                            <SectorIcon className={`h-4 w-4 ${sector.iconColor}`} />
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-900">{sector.label}</span>
                      </div>
                    </div>
                  )}
                  {filledLocations[0]?.city && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Locatie
                      </p>
                      <p className="mt-1 text-sm text-gray-900 flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        {[filledLocations[0].city, filledLocations[0].county]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>
                  )}
                  {filledLocations[0]?.phone && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Telefon
                      </p>
                      <p className="mt-1 text-sm text-gray-900 flex items-center gap-1.5">
                        <Phone className="h-4 w-4 text-gray-400" />
                        {filledLocations[0].phone}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <BookingModal
          slug={slug}
          org={org}
          locations={locations}
          profile={profile}
          assets={assets}
          onClose={() => setShowBookingModal(false)}
          onSuccess={() => {
            setShowBookingModal(false);
            showToast({ type: 'success', title: 'Programare creata cu succes!' });
            navigate('/appointments');
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function BookingModal({ slug, org, locations, profile, assets, onClose, onSuccess, showToast }) {
  // Build dynamic steps
  const steps = useMemo(() => {
    const s = [];
    if (locations.length > 1) s.push({ id: 'location', title: 'Locatie', icon: MapPin });
    s.push({ id: 'date', title: 'Data', icon: Calendar });
    s.push({ id: 'time', title: 'Ora', icon: Clock });
    s.push({ id: 'details', title: 'Detalii', icon: FileText });
    return s;
  }, [locations.length]);

  const [currentStep, setCurrentStep] = useState(0);
  const currentStepId = steps[currentStep]?.id;

  // Form state
  const [formData, setFormData] = useState({
    selectedLocation: locations.length === 1 ? locations[0] : null,
    selectedDate: null,
    selectedSlot: null,
    title: 'Programare service',
    description: '',
    assetId: '',
  });

  // Available dates and slots
  const [availableDates, setAvailableDates] = useState([]);
  const [loadingDates, setLoadingDates] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Fetch available dates on mount
  useEffect(() => {
    setLoadingDates(true);
    bookingService
      .getAvailableDates(slug)
      .then((data) => setAvailableDates(data || []))
      .catch(() => setAvailableDates([]))
      .finally(() => setLoadingDates(false));
  }, [slug]);

  // Fetch slots when date changes
  useEffect(() => {
    if (formData.selectedDate) {
      setLoadingSlots(true);
      setAvailableSlots([]);
      bookingService
        .getAvailableSlots(slug, formData.selectedDate, formData.selectedLocation?.id)
        .then((data) => setAvailableSlots(data || []))
        .catch(() => setAvailableSlots([]))
        .finally(() => setLoadingSlots(false));
    }
  }, [slug, formData.selectedDate, formData.selectedLocation?.id]);

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Booking mutation
  const bookingMutation = useMutation({
    mutationFn: (data) => bookingService.createBooking(slug, data),
    onSuccess: () => onSuccess(),
    onError: (error) => {
      showToast({
        type: 'error',
        title: error.response?.data?.message || 'Eroare la crearea programarii',
      });
    },
  });

  const canProceed = () => {
    switch (currentStepId) {
      case 'location':
        return !!formData.selectedLocation;
      case 'date':
        return !!formData.selectedDate;
      case 'time':
        return !!formData.selectedSlot;
      case 'details':
        return !!formData.title;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Submit booking
      const client = {
        firstName: profile?.firstName || '',
        lastName: profile?.lastName || '',
        email: profile?.email || '',
        phone: profile?.phone || '',
      };

      const bookingData = {
        client,
        appointment: {
          title: formData.title,
          description: formData.description || undefined,
          scheduledStart: formData.selectedSlot.start,
        },
        locationId: formData.selectedLocation?.id || null,
        createAccount: false,
      };

      // Add asset data if selected
      if (formData.assetId) {
        const selectedAsset = (Array.isArray(assets) ? assets : []).find(
          (a) => a.id === formData.assetId
        );
        if (selectedAsset) {
          bookingData.asset = {
            name:
              selectedAsset.name ||
              `${selectedAsset.manufacturer || ''} ${selectedAsset.model || ''}`.trim(),
            manufacturer: selectedAsset.manufacturer || undefined,
            model: selectedAsset.model || undefined,
            identifier: selectedAsset.identifier || undefined,
          };
        }
      }

      bookingMutation.mutate(bookingData);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const isLastStep = currentStep === steps.length - 1;
  const assetsArray = Array.isArray(assets) ? assets : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Programare la {org.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress steps */}
        <div className="flex items-center justify-center gap-2 px-6 py-4 bg-gray-50 border-b border-gray-100">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-colors text-sm',
                  index < currentStep
                    ? 'bg-primary-600 text-white'
                    : index === currentStep
                      ? 'bg-primary-100 text-primary-600 border-2 border-primary-600'
                      : 'bg-gray-200 text-gray-500'
                )}
              >
                <step.icon className="h-4 w-4" />
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 w-8 mx-1',
                    index < currentStep ? 'bg-primary-600' : 'bg-gray-200'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Select Location */}
          {currentStepId === 'location' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">Selecteaza locatia pentru programare:</p>
              <div className="grid grid-cols-1 gap-2">
                {locations.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => {
                      updateFormData('selectedLocation', loc);
                      updateFormData('selectedDate', null);
                      updateFormData('selectedSlot', null);
                    }}
                    className={cn(
                      'p-4 rounded-lg border text-left transition-all',
                      formData.selectedLocation?.id === loc.id
                        ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <MapPin
                        className={cn(
                          'h-5 w-5 mt-0.5 shrink-0',
                          formData.selectedLocation?.id === loc.id
                            ? 'text-primary-600'
                            : 'text-gray-400'
                        )}
                      />
                      <div className="flex-1">
                        <p
                          className={cn(
                            'font-medium',
                            formData.selectedLocation?.id === loc.id
                              ? 'text-primary-700'
                              : 'text-gray-900'
                          )}
                        >
                          {loc.name}
                          {loc.isPrimary && (
                            <span className="ml-2 text-xs font-normal text-gray-500">
                              (Principal)
                            </span>
                          )}
                        </p>
                        {(loc.address || loc.city) && (
                          <p className="mt-1 text-sm text-gray-500">
                            {[loc.address, loc.city, loc.county].filter(Boolean).join(', ')}
                          </p>
                        )}
                        {loc.phone && <p className="mt-1 text-xs text-gray-400">{loc.phone}</p>}
                      </div>
                      {formData.selectedLocation?.id === loc.id && (
                        <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center shrink-0">
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Select Date */}
          {currentStepId === 'date' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">Selecteaza data pentru programare:</p>
              {loadingDates ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                </div>
              ) : availableDates.length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                  Nu exista date disponibile momentan.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {availableDates.slice(0, 15).map((date) => (
                    <button
                      key={date.date}
                      type="button"
                      onClick={() => {
                        updateFormData('selectedDate', date.date);
                        updateFormData('selectedSlot', null);
                      }}
                      className={cn(
                        'p-3 rounded-lg border text-left transition-all',
                        formData.selectedDate === date.date
                          ? 'border-primary-600 bg-primary-50 text-primary-700 ring-1 ring-primary-600'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      )}
                    >
                      <p className="font-medium text-sm">{date.formatted}</p>
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
              <p className="text-sm text-gray-600 mb-4">
                Selecteaza ora pentru{' '}
                <strong>
                  {(() => {
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
              {loadingSlots ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">
                    Nu exista intervale disponibile pentru aceasta zi.
                  </p>
                  <Button variant="secondary" size="sm" onClick={handleBack}>
                    Alege alta data
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.start}
                      type="button"
                      onClick={() => updateFormData('selectedSlot', slot)}
                      className={cn(
                        'p-3 rounded-lg border text-center transition-all',
                        formData.selectedSlot?.start === slot.start
                          ? 'border-primary-600 bg-primary-50 text-primary-700 ring-1 ring-primary-600'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      )}
                    >
                      <p className="font-medium">{slot.formatted}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Details */}
          {currentStepId === 'details' && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-primary-50 border border-primary-100 rounded-lg p-3 mb-4 space-y-2">
                {formData.selectedLocation && (
                  <div className="flex items-center gap-2 text-sm text-primary-700">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">{formData.selectedLocation.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-primary-700">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">
                    {(() => {
                      const [year, month, day] = formData.selectedDate.split('-').map(Number);
                      const date = new Date(year, month - 1, day);
                      return date.toLocaleDateString('ro-RO', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      });
                    })()}
                  </span>
                  <Clock className="h-4 w-4 ml-2" />
                  <span className="font-medium">{formData.selectedSlot?.formatted}</span>
                </div>
                {profile && (
                  <div className="flex items-center gap-2 text-sm text-primary-700">
                    <span className="font-medium">
                      {profile.firstName} {profile.lastName} &middot; {profile.email}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Titlu programare <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => updateFormData('title', e.target.value)}
                  placeholder="Ex: Revizie, Consultatie, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Descriere</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:border-primary-500 focus:ring-primary-500/20 transition-shadow"
                  placeholder="Detalii suplimentare..."
                />
              </div>

              {/* Asset selection */}
              {assetsArray.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Package className="h-4 w-4 text-gray-400" />
                      Echipament / Vehicul
                    </span>
                  </label>
                  <div className="space-y-2">
                    {assetsArray.map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() =>
                          updateFormData('assetId', asset.id === formData.assetId ? '' : asset.id)
                        }
                        className={cn(
                          'w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3',
                          formData.assetId === asset.id
                            ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        )}
                      >
                        <div
                          className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center',
                            formData.assetId === asset.id ? 'bg-primary-100' : 'bg-gray-100'
                          )}
                        >
                          <Package
                            className={cn(
                              'h-5 w-5',
                              formData.assetId === asset.id ? 'text-primary-600' : 'text-gray-500'
                            )}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">
                            {asset.name || `${asset.manufacturer} ${asset.model}`}
                          </p>
                          {asset.identifier && (
                            <p className="text-xs text-gray-500">{asset.identifier}</p>
                          )}
                        </div>
                        {formData.assetId === asset.id && (
                          <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center">
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {bookingMutation.isError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {bookingMutation.error?.response?.data?.message ||
                    'A aparut o eroare. Te rugam sa incerci din nou.'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          <Button
            type="button"
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0}
            className={currentStep === 0 ? 'invisible' : ''}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Inapoi
          </Button>
          <Button
            type="button"
            onClick={handleNext}
            disabled={!canProceed() || bookingMutation.isPending}
            isLoading={bookingMutation.isPending}
          >
            {isLastStep ? (
              'Creeaza programare'
            ) : (
              <>
                Continua
                <ArrowRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

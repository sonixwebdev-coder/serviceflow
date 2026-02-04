import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, Plus, X, ArrowLeft, ArrowRight, Loader2, Package, FileText } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAppointments, useCreateAppointment } from '@/hooks/useAppointments';
import { appointmentService } from '@/services/appointmentService';
import { profileService } from '@/services/profileService';
import { formatDateTime, cn } from '@/lib/utils';
import useToast from '@/context/useToast';

const baseModalSteps = [
  { id: 'date', title: 'Data', icon: Calendar },
  { id: 'time', title: 'Ora', icon: Clock },
  { id: 'details', title: 'Detalii', icon: FileText },
];

const locationStep = { id: 'location', title: 'Locatie', icon: MapPin };

const statusOptions = [
  { value: '', label: 'Toate' },
  { value: 'PENDING', label: 'In asteptare' },
  { value: 'PREZENTAT', label: 'Prezentat' },
  { value: 'IN_PROGRESS', label: 'In progres' },
  { value: 'COMPLETED', label: 'Finalizate' },
  { value: 'CANCELLED', label: 'Anulate' },
];

export default function Appointments() {
  const [filters, setFilters] = useState({ status: '', page: 1, limit: 10 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { data, isLoading } = useAppointments(filters);
  const createMutation = useCreateAppointment();
  const { showToast } = useToast();

  const appointments = data?.items || [];
  const pagination = data?.pagination;

  // Form state
  const [formData, setFormData] = useState({
    selectedLocation: null,
    selectedDate: null,
    selectedSlot: null,
    title: '',
    description: '',
    location: '',
    assetId: '',
  });

  // Locations state
  const [locations, setLocations] = useState([]);
  const [hasMultipleLocations, setHasMultipleLocations] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Compute modal steps based on whether org has multiple locations
  const modalSteps = useMemo(() => {
    if (hasMultipleLocations) {
      return [locationStep, ...baseModalSteps];
    }
    return baseModalSteps;
  }, [hasMultipleLocations]);

  // Modal step state
  const [currentStep, setCurrentStep] = useState(0);
  const currentStepId = modalSteps[currentStep]?.id;

  // Assets state
  const [assets, setAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  // Available dates and slots
  const [availableDates, setAvailableDates] = useState([]);
  const [loadingDates, setLoadingDates] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Fetch locations, assets, and available dates when modal opens
  useEffect(() => {
    if (showCreateModal) {
      // Fetch locations first
      setLoadingLocations(true);
      appointmentService.getLocations()
        .then((data) => {
          setLocations(data.locations || []);
          setHasMultipleLocations(data.hasMultipleLocations || false);
          // Auto-select if only one location
          if (data.locations?.length === 1) {
            setFormData((prev) => ({ ...prev, selectedLocation: data.locations[0] }));
          }
        })
        .catch(() => {
          setLocations([]);
          setHasMultipleLocations(false);
        })
        .finally(() => setLoadingLocations(false));

      setLoadingAssets(true);
      profileService.getAssets()
        .then((data) => setAssets(data || []))
        .catch(() => setAssets([]))
        .finally(() => setLoadingAssets(false));

      setLoadingDates(true);
      appointmentService.getAvailableDates(30)
        .then((data) => setAvailableDates(data || []))
        .catch(() => setAvailableDates([]))
        .finally(() => setLoadingDates(false));
    }
  }, [showCreateModal]);

  // Fetch available slots when date is selected (filtered by location if selected)
  useEffect(() => {
    if (formData.selectedDate) {
      setLoadingSlots(true);
      setAvailableSlots([]);
      appointmentService.getAvailableSlots(formData.selectedDate, 60, formData.selectedLocation?.id)
        .then((data) => setAvailableSlots(data || []))
        .catch(() => setAvailableSlots([]))
        .finally(() => setLoadingSlots(false));
    }
  }, [formData.selectedDate, formData.selectedLocation?.id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      selectedLocation: null,
      selectedDate: null,
      selectedSlot: null,
      title: '',
      description: '',
      location: '',
      assetId: '',
    });
    setCurrentStep(0);
    setAvailableSlots([]);
    setLocations([]);
    setHasMultipleLocations(false);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    resetForm();
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
        return !!formData.title;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (currentStep < modalSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Submit
      await handleCreateAppointment();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleCreateAppointment = async () => {
    if (!formData.title || !formData.selectedSlot) {
      showToast({ type: 'error', title: 'Completati toate campurile obligatorii' });
      return;
    }

    try {
      await createMutation.mutateAsync({
        title: formData.title,
        description: formData.description || undefined,
        scheduledStart: formData.selectedSlot.start,
        scheduledEnd: formData.selectedSlot.end,
        location: formData.location || undefined,
        locationId: formData.selectedLocation?.id || undefined,
        assetId: formData.assetId || undefined,
      });

      showToast({ type: 'success', title: 'Programare creata cu succes!' });
      closeModal();
    } catch (error) {
      showToast({
        type: 'error',
        title: error.response?.data?.error || 'Eroare la crearea programarii',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Programari</h1>
          <p className="page-subtitle">Vizualizeaza si creeaza programari</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Programare noua
        </Button>
      </div>

      {/* Create Appointment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={closeModal}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Programare noua</h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Progress steps */}
            <div className="flex items-center justify-center gap-2 px-6 py-4 bg-gray-50 border-b border-gray-100">
              {modalSteps.map((step, index) => (
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
                  {index < modalSteps.length - 1 && (
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
                  {loadingLocations ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                    </div>
                  ) : locations.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">
                      Nu exista locatii disponibile.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {locations.map((loc) => (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => {
                            updateFormData('selectedLocation', loc);
                            // Reset date and slot when changing location
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
                            <MapPin className={cn(
                              'h-5 w-5 mt-0.5 flex-shrink-0',
                              formData.selectedLocation?.id === loc.id ? 'text-primary-600' : 'text-gray-400'
                            )} />
                            <div className="flex-1">
                              <p className={cn(
                                'font-medium',
                                formData.selectedLocation?.id === loc.id ? 'text-primary-700' : 'text-gray-900'
                              )}>
                                {loc.name}
                                {loc.isPrimary && (
                                  <span className="ml-2 text-xs font-normal text-gray-500">(Principal)</span>
                                )}
                              </p>
                              {(loc.address || loc.city) && (
                                <p className="mt-1 text-sm text-gray-500">
                                  {[loc.address, loc.city, loc.county].filter(Boolean).join(', ')}
                                </p>
                              )}
                              {loc.phone && (
                                <p className="mt-1 text-xs text-gray-400">{loc.phone}</p>
                              )}
                            </div>
                            {formData.selectedLocation?.id === loc.id && (
                              <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
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
                      <p className="text-gray-500 mb-4">Nu exista intervale disponibile pentru aceasta zi.</p>
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
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Titlu programare <span className="text-red-500">*</span>
                    </label>
                    <Input
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="Ex: Revizie, Consultatie, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Descriere
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-primary-500 focus:ring-primary-500/20 transition-shadow"
                      placeholder="Detalii suplimentare..."
                    />
                  </div>

                  {/* Asset selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Package className="h-4 w-4 text-gray-400" />
                        Echipament / Vehicul
                      </span>
                    </label>
                    {loadingAssets ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Se incarca...
                      </div>
                    ) : assets.length === 0 ? (
                      <p className="text-sm text-gray-500 py-2 px-3 bg-gray-50 rounded-lg">
                        Nu aveti echipamente inregistrate
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {assets.map((asset) => (
                          <button
                            key={asset.id}
                            type="button"
                            onClick={() => updateFormData('assetId', asset.id === formData.assetId ? '' : asset.id)}
                            className={cn(
                              'w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3',
                              formData.assetId === asset.id
                                ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            )}
                          >
                            <div className={cn(
                              'w-10 h-10 rounded-lg flex items-center justify-center',
                              formData.assetId === asset.id ? 'bg-primary-100' : 'bg-gray-100'
                            )}>
                              <Package className={cn(
                                'h-5 w-5',
                                formData.assetId === asset.id ? 'text-primary-600' : 'text-gray-500'
                              )} />
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
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        Locatie
                      </span>
                    </label>
                    <Input
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="Adresa sau locatie (optional)"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer with navigation buttons */}
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
                disabled={!canProceed() || createMutation.isPending}
                isLoading={createMutation.isPending}
              >
                {currentStep === modalSteps.length - 1 ? (
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
      )}

      {/* Filters */}
      <div className="filter-bar">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status:</span>
        {statusOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setFilters({ ...filters, status: option.value, page: 1 })}
            className={`filter-pill ${filters.status === option.value ? 'active' : ''}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Appointments list */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="empty-state">
              <Calendar className="empty-state-icon" />
              <p className="empty-state-title">Nu exista programari</p>
              <p className="empty-state-text">Programarile tale vor aparea aici.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {appointments.map((appointment) => (
                <Link
                  key={appointment.id}
                  to={`/appointments/${appointment.id}`}
                  className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900">{appointment.title}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDateTime(appointment.scheduledStart)}
                        </span>
                        {appointment.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {appointment.location}
                          </span>
                        )}
                      </div>
                      {(appointment.vehicle || appointment.asset) && (
                        <p className="text-sm text-gray-500">
                          {appointment.vehicle
                            ? `${appointment.vehicle.make} ${appointment.vehicle.model} - ${appointment.vehicle.plateNumber}`
                            : `${appointment.asset.name} (${appointment.asset.type})`}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={appointment.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Afisare {(pagination.page - 1) * pagination.limit + 1} -{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} din {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600">
              Pagina {pagination.page} din {pagination.pages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page === pagination.pages}
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

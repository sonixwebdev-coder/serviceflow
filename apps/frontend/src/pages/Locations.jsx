import { useState, useMemo } from 'react';
import confirm from '../utils/confirm';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Users,
  Calendar,
  Package,
  Search,
  X,
  Star,
  Check,
  Clock,
  Settings,
  Banknote,
} from 'lucide-react';
import { useLocations, useLocationMutations, useLocation } from '../hooks/useLocations';
import useUsers from '../hooks/useUsers';
import useToast from '../context/useToast';
import TimePicker from '../components/ui/TimePicker';

const getLocationStatus = (operatingHours) => {
  if (!operatingHours) return null;

  const now = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = dayNames[now.getDay()];
  const raw = operatingHours[today];

  if (!raw) return null;

  // Normalize: handle both backend { open, close, closed } and frontend { isOpen, openTime, closeTime }
  const isOpen = 'closed' in raw ? !raw.closed : raw.isOpen !== false;
  const openTime = raw.open || raw.openTime;
  const closeTime = raw.close || raw.closeTime;

  if (!isOpen) {
    return { isOpen: false, text: 'Inchis azi' };
  }

  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  if (openTime && closeTime && currentTime >= openTime && currentTime <= closeTime) {
    return { isOpen: true, text: `Deschis pana la ${closeTime}` };
  } else if (openTime && currentTime < openTime) {
    return { isOpen: false, text: `Deschide la ${openTime}` };
  } else {
    return { isOpen: false, text: 'Inchis' };
  }
};

const LocationCard = ({ location, onEdit, onDelete, onManageUsers }) => {
  const [deleting, setDeleting] = useState(false);
  const status = getLocationStatus(location.operatingHours);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{location.name}</h3>
              {location.isPrimary && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-primary">
                  <Star size={10} className="fill-current" />
                  Principala
                </span>
              )}
              {!location.isActive && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                  Inactiva
                </span>
              )}
            </div>
            {(location.address || location.city) && (
              <p className="mt-1 text-sm text-gray-500">
                {[location.address, location.city, location.county].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onManageUsers(location)}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            title="Gestioneaza utilizatori"
          >
            <Users size={18} />
          </button>
          <button
            type="button"
            onClick={() => onEdit(location)}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            title="Editeaza"
          >
            <Edit2 size={18} />
          </button>
          {!location.isPrimary && (
            <button
              type="button"
              onClick={() => {
                setDeleting(true);
                onDelete(location.id).finally(() => setDeleting(false));
              }}
              disabled={deleting}
              className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              title="Sterge"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      {status && (
        <div className="mt-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              status.isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status.isOpen ? 'bg-green-500' : 'bg-gray-400'
              }`}
            />
            {status.text}
          </span>
        </div>
      )}

      <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-1.5">
          <Users size={14} />
          <span>{location._count?.users || 0} utilizatori</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Package size={14} />
          <span>{location._count?.resources || 0} resurse</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar size={14} />
          <span>{location._count?.appointments || 0} programari</span>
        </div>
      </div>
    </div>
  );
};

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Luni' },
  { key: 'tuesday', label: 'Marti' },
  { key: 'wednesday', label: 'Miercuri' },
  { key: 'thursday', label: 'Joi' },
  { key: 'friday', label: 'Vineri' },
  { key: 'saturday', label: 'Sambata' },
  { key: 'sunday', label: 'Duminica' },
];

const DEFAULT_OPERATING_HOURS = {
  monday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
  tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
  wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
  thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
  friday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
  saturday: { isOpen: false, openTime: '10:00', closeTime: '14:00' },
  sunday: { isOpen: false, openTime: '10:00', closeTime: '14:00' },
};

const DEFAULT_PRICING = {
  defaultLaborRate: 100,
  pricingMultiplier: 1.0,
  currencySymbol: 'RON',
};

/**
 * Normalize operating hours to frontend format { isOpen, openTime, closeTime }.
 * Handles both backend format { open, close, closed } and existing frontend format.
 */
const normalizeOperatingHours = (hours) => {
  if (!hours) return DEFAULT_OPERATING_HOURS;
  const result = {};
  for (const [day, dayHours] of Object.entries(hours)) {
    if (!dayHours || typeof dayHours !== 'object') continue;
    if ('open' in dayHours || 'closed' in dayHours) {
      // Backend format → convert to frontend format
      result[day] = {
        isOpen: !dayHours.closed,
        openTime: dayHours.open || '09:00',
        closeTime: dayHours.close || '18:00',
      };
    } else {
      result[day] = dayHours;
    }
  }
  return result;
};

/** Convert frontend { isOpen, openTime, closeTime } to backend { open, close, closed } */
const toBackendHours = (operatingHours) => {
  const result = {};
  for (const [day, hours] of Object.entries(operatingHours)) {
    result[day] = {
      open: hours.openTime,
      close: hours.closeTime,
      closed: !hours.isOpen,
    };
  }
  return result;
};

const LocationModal = ({ location, onClose, onSave, isSaving }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState({
    name: location?.name || '',
    address: location?.address || '',
    city: location?.city || '',
    county: location?.county || '',
    phone: location?.phone || '',
    email: location?.email || '',
    isPrimary: location?.isPrimary || false,
    isActive: location?.isActive !== false,
    operatingHours: normalizeOperatingHours(location?.operatingHours),
    settings: {
      pricing: location?.settings?.pricing || DEFAULT_PRICING,
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      operatingHours: toBackendHours(formData.operatingHours),
    });
  };

  const updateOperatingHours = (day, field, value) => {
    setFormData((prev) => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours[day],
          [field]: value,
        },
      },
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 margin-top-zero">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-5 sm:p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          {location ? 'Editeaza locatia' : 'Adauga locatie noua'}
        </h2>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
              activeTab === 'general'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Settings size={16} className="hidden sm:block" />
            General
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hours')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
              activeTab === 'hours'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock size={16} className="hidden sm:block" />
            Program
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
              activeTab === 'pricing'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Banknote size={16} className="hidden sm:block" />
            Preturi
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'general' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Nume locatie *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                    placeholder="ex: Sediu Central"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Adresa</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                    placeholder="ex: Str. Exemplu nr. 10"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Oras</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                    placeholder="ex: Bucuresti"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Judet</label>
                  <input
                    type="text"
                    value={formData.county}
                    onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                    placeholder="ex: Ilfov"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Telefon</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                    placeholder="ex: 0721234567"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                    placeholder="ex: contact@locatie.ro"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 rounded-sm border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">Locatie activa</span>
                </label>

                {!location?.isPrimary && (
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isPrimary}
                      onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                      className="h-4 w-4 rounded-sm border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">Seteaza ca principala</span>
                  </label>
                )}
              </div>
            </>
          )}

          {activeTab === 'hours' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Seteaza programul de functionare pentru aceasta locatie.
              </p>
              {DAYS_OF_WEEK.map(({ key, label }) => {
                const dayHours = formData.operatingHours[key] || DEFAULT_OPERATING_HOURS[key];
                return (
                  <div
                    key={key}
                    className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-lg border p-3 ${
                      dayHours.isOpen ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <label className="flex w-full sm:w-24 cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={dayHours.isOpen}
                        onChange={(e) => updateOperatingHours(key, 'isOpen', e.target.checked)}
                        className="h-4 w-4 rounded-sm border-gray-300 text-primary focus:ring-primary"
                      />
                      <span
                        className={`text-sm font-medium ${dayHours.isOpen ? 'text-gray-900' : 'text-gray-400'}`}
                      >
                        {label}
                      </span>
                    </label>

                    {dayHours.isOpen && (
                      <div className="flex flex-1 items-center gap-2">
                        <TimePicker
                          value={dayHours.openTime}
                          onChange={(v) => updateOperatingHours(key, 'openTime', v)}
                        />
                        <span className="text-gray-400">-</span>
                        <TimePicker
                          value={dayHours.closeTime}
                          onChange={(v) => updateOperatingHours(key, 'closeTime', v)}
                        />
                      </div>
                    )}

                    {!dayHours.isOpen && <span className="text-sm text-gray-400">Inchis</span>}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Configureaza preturile implicite pentru aceasta locatie.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Tarif manopera implicit (RON/ora)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.settings?.pricing?.defaultLaborRate || 100}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          pricing: {
                            ...prev.settings?.pricing,
                            defaultLaborRate: Number(e.target.value) || 0,
                          },
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                    placeholder="100"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Acest tarif va fi folosit implicit pentru calculul manoperei.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Multiplicator preturi
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    max="5"
                    step="0.1"
                    value={formData.settings?.pricing?.pricingMultiplier || 1.0}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          pricing: {
                            ...prev.settings?.pricing,
                            pricingMultiplier: Number(e.target.value) || 1.0,
                          },
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                    placeholder="1.0"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Preturile vor fi inmultite cu acest factor (ex: 1.2 = +20%).
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <div className="flex items-start gap-2">
                  <Banknote className="mt-0.5 h-4 w-4 text-blue-600" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Exemplu de calcul:</p>
                    <p className="mt-1">
                      Daca tariful manopera este{' '}
                      <strong>{formData.settings?.pricing?.defaultLaborRate || 100} RON/ora</strong>{' '}
                      si multiplicatorul este{' '}
                      <strong>{formData.settings?.pricing?.pricingMultiplier || 1.0}</strong>,
                      pretul final pentru o ora de manopera va fi{' '}
                      <strong>
                        {(
                          (formData.settings?.pricing?.defaultLaborRate || 100) *
                          (formData.settings?.pricing?.pricingMultiplier || 1.0)
                        ).toFixed(2)}{' '}
                        RON
                      </strong>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Anuleaza
            </button>
            <button
              type="submit"
              disabled={isSaving || !formData.name}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-600 disabled:opacity-50"
            >
              {isSaving ? 'Se salveaza...' : location ? 'Salveaza' : 'Adauga'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UserAssignmentModal = ({ location, onClose }) => {
  const { showToast } = useToast();
  const { users } = useUsers({ allLocations: 'true' });
  const { location: locationDetails, loading: loadingDetails } = useLocation(location?.id);
  const { assignUsers, removeUsers, isAssigning, isRemoving } = useLocationMutations();

  const [search, setSearch] = useState('');

  const assignedUserIds = useMemo(() => {
    return new Set((locationDetails?.users || []).map((ul) => ul.user.id));
  }, [locationDetails]);

  const filteredUsers = useMemo(() => {
    if (!search) return users;
    const searchLower = search.toLowerCase();
    return users.filter(
      (user) =>
        user.firstName?.toLowerCase().includes(searchLower) ||
        user.lastName?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower)
    );
  }, [users, search]);

  const handleToggleUser = async (userId, isAssigned) => {
    try {
      if (isAssigned) {
        await removeUsers({ locationId: location.id, userIds: [userId] });
        showToast({
          title: 'Utilizator eliminat',
          description: 'Utilizatorul a fost eliminat din locatie.',
          type: 'success',
        });
      } else {
        await assignUsers({ locationId: location.id, userIds: [userId] });
        showToast({
          title: 'Utilizator asignat',
          description: 'Utilizatorul a fost asignat locatiei.',
          type: 'success',
        });
      }
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: error.message || 'A aparut o eroare.',
        type: 'error',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 margin-top-zero">
      <div className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <h2 className="mb-2 text-xl font-semibold text-gray-900">Utilizatori - {location?.name}</h2>
        <p className="mb-4 text-sm text-gray-500">
          Selecteaza utilizatorii care au acces la aceasta locatie.
        </p>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cauta utilizatori..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="max-h-80 space-y-1 overflow-y-auto">
          {loadingDetails ? (
            <div className="py-8 text-center text-gray-500">Se incarca...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-8 text-center text-gray-500">Niciun utilizator gasit</div>
          ) : (
            filteredUsers.map((user) => {
              const isAssigned = assignedUserIds.has(user.id);
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleToggleUser(user.id, isAssigned)}
                  disabled={isAssigning || isRemoving}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 transition ${
                    isAssigned ? 'bg-orange-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
                      {user.firstName?.[0]}
                      {user.lastName?.[0]}
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                  </div>
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded border ${
                      isAssigned ? 'border-primary bg-primary text-white' : 'border-gray-300'
                    }`}
                  >
                    {isAssigned && <Check size={12} />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
          >
            Inchide
          </button>
        </div>
      </div>
    </div>
  );
};

const Locations = () => {
  const { showToast } = useToast();
  const { locations, loading, error, refresh } = useLocations();
  const { createLocation, updateLocation, deleteLocation, isCreating, isUpdating } =
    useLocationMutations();

  const [modalLocation, setModalLocation] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [userModalLocation, setUserModalLocation] = useState(null);
  const [search, setSearch] = useState('');

  const filteredLocations = useMemo(() => {
    if (!search) return locations;
    const searchLower = search.toLowerCase();
    return locations.filter(
      (loc) =>
        loc.name?.toLowerCase().includes(searchLower) ||
        loc.address?.toLowerCase().includes(searchLower) ||
        loc.city?.toLowerCase().includes(searchLower)
    );
  }, [locations, search]);

  const handleSave = async (data) => {
    try {
      if (modalLocation) {
        await updateLocation({ locationId: modalLocation.id, data });
        showToast({
          title: 'Locatie actualizata',
          description: 'Locatia a fost actualizata cu succes.',
          type: 'success',
        });
      } else {
        await createLocation(data);
        showToast({
          title: 'Locatie creata',
          description: 'Locatia a fost creata cu succes.',
          type: 'success',
        });
      }
      setShowModal(false);
      setModalLocation(null);
      refresh();
    } catch (err) {
      showToast({
        title: 'Eroare',
        description: err.message || 'A aparut o eroare.',
        type: 'error',
      });
    }
  };

  const handleDelete = async (locationId) => {
    if (
      !(await confirm({
        title: 'Sterge locatie',
        text: 'Esti sigur ca vrei sa stergi aceasta locatie?',
        confirmText: 'Sterge',
        danger: true,
      }))
    ) {
      return;
    }

    try {
      await deleteLocation(locationId);
      showToast({
        title: 'Locatie stearsa',
        description: 'Locatia a fost stearsa cu succes.',
        type: 'success',
      });
      refresh();
    } catch (err) {
      showToast({
        title: 'Eroare',
        description: err.message || 'A aparut o eroare.',
        type: 'error',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Locatii</h1>
          <p className="mt-1 text-sm text-gray-500">Gestioneaza locatiile organizatiei tale</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setModalLocation(null);
            setShowModal(true);
          }}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-600"
        >
          <Plus size={18} />
          Adauga locatie
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cauta locatii..."
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      </div>

      {filteredLocations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <MapPin className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Nicio locatie</h3>
          <p className="mt-2 text-sm text-gray-500">
            {search
              ? 'Nicio locatie nu corespunde cautarii.'
              : 'Incepe prin a adauga prima locatie.'}
          </p>
          {!search && (
            <button
              type="button"
              onClick={() => {
                setModalLocation(null);
                setShowModal(true);
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-600"
            >
              <Plus size={18} />
              Adauga locatie
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLocations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              onEdit={(loc) => {
                setModalLocation(loc);
                setShowModal(true);
              }}
              onDelete={handleDelete}
              onManageUsers={setUserModalLocation}
            />
          ))}
        </div>
      )}

      {showModal && (
        <LocationModal
          location={modalLocation}
          onClose={() => {
            setShowModal(false);
            setModalLocation(null);
          }}
          onSave={handleSave}
          isSaving={isCreating || isUpdating}
        />
      )}

      {userModalLocation && (
        <UserAssignmentModal
          location={userModalLocation}
          onClose={() => setUserModalLocation(null)}
        />
      )}
    </div>
  );
};

export default Locations;

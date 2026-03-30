import { useState, useEffect, useMemo } from 'react';
import confirm from '../utils/confirm';
import { useQuery } from '@tanstack/react-query';
import { useTerminology } from '../context/TerminologyContext';
import useToast from '../context/useToast';
import API from '../utils/api';
import useLocationStore from '../state/useLocationStore';
import {
  Save,
  Globe,
  Car,
  Scissors,
  Wrench,
  Smartphone,
  Info,
  Calendar,
  Link2,
  Unlink,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import TimePicker from '../components/ui/TimePicker';
import {
  useGoogleCalendarStatus,
  useGoogleCalendars,
  useConnectGoogleCalendar,
  useDisconnectGoogleCalendar,
  useUpdateGoogleCalendarSettings,
  useSyncAllToGoogleCalendar,
  useSyncBidirectional,
} from '../hooks/useGoogleCalendar';

const SECTOR_ICONS = {
  AUTOMOTIVE: Car,
  BEAUTY: Scissors,
  HOME_SERVICES: Wrench,
  IT_ELECTRONICS: Smartphone,
};

const OrganizationSettings = () => {
  const { publicBooking: currentPublicBooking, orgDescription: currentOrgDescription, publicListing: currentPublicListing, refreshSettings } = useTerminology();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [savingDescription, setSavingDescription] = useState(false);
  const [publicListingEnabled, setPublicListingEnabled] = useState(true);
  const [savingPublicListing, setSavingPublicListing] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [selectedCalendarId, setSelectedCalendarId] = useState('');

  // Current location from store
  const currentLocationId = useLocationStore((s) => s.currentLocationId);
  const currentLocation = useLocationStore((s) => s.getCurrentLocation());

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleConnected = params.get('google_connected');
    const error = params.get('error');

    // Restore the location that was active when the user initiated the OAuth flow
    const oauthLocationId = params.get('locationId');
    if (oauthLocationId && oauthLocationId !== currentLocationId) {
      useLocationStore.getState().setCurrentLocation(oauthLocationId);
    }

    if (googleConnected === 'true') {
      showToast({
        title: 'Succes',
        description: 'Google Calendar a fost conectat cu succes!',
        type: 'success',
      });
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (error) {
      const detail = params.get('detail');
      showToast({
        title: 'Eroare',
        description: error === 'oauth_failed'
          ? `Nu s-a putut conecta Google Calendar.${detail ? ` (${detail})` : ''} Te rugam sa incerci din nou.`
          : `Eroare: ${error}`,
        type: 'error',
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [showToast]);

  // Fetch sector info
  const { data: sectorInfo, isLoading: sectorLoading } = useQuery({
    queryKey: ['org-sector'],
    queryFn: async () => {
      const response = await API.get('/organizations/me/sector');
      return response.data.data || response.data;
    },
  });

  // Google Calendar hooks - status returns ALL configs for the user
  const {
    data: gcalStatus,
    isLoading: gcalStatusLoading,
    refetch: refetchGcalStatus,
  } = useGoogleCalendarStatus();

  // Derive the config for the current location from all configs
  const locationConfig = useMemo(() => {
    if (!gcalStatus?.configs) return null;
    return gcalStatus.configs.find((c) => c.locationId === currentLocationId) || null;
  }, [gcalStatus?.configs, currentLocationId]);

  const isLocationConnected = !!locationConfig;

  const {
    data: calendars,
    isLoading: calendarsLoading,
    refetch: fetchCalendars,
  } = useGoogleCalendars(currentLocationId, { enabled: false });

  const connectMutation = useConnectGoogleCalendar('/settings/organization', currentLocationId);
  const disconnectMutation = useDisconnectGoogleCalendar(currentLocationId);
  const updateSettingsMutation = useUpdateGoogleCalendarSettings();
  const syncAllMutation = useSyncAllToGoogleCalendar();
  const syncBidirectionalMutation = useSyncBidirectional();

  // Load calendars when connected for the current location
  useEffect(() => {
    if (isLocationConnected) {
      fetchCalendars();
      if (locationConfig?.calendarId) {
        setSelectedCalendarId(locationConfig.calendarId);
      }
    } else {
      setSelectedCalendarId('');
    }
  }, [isLocationConnected, locationConfig?.calendarId, fetchCalendars, currentLocationId]);

  const handleConnect = async () => {
    try {
      await connectMutation.mutateAsync();
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: error.response?.data?.message || 'Nu s-a putut initia conexiunea',
        type: 'error',
      });
    }
  };

  const handleDisconnect = async () => {
    if (!await confirm({ title: 'Deconecteaza Google Calendar', text: 'Sigur doriti sa deconectati Google Calendar? Sincronizarea va fi oprita.', confirmText: 'Deconecteaza', danger: true })) return;

    try {
      await disconnectMutation.mutateAsync();
      showToast({
        title: 'Succes',
        description: 'Google Calendar a fost deconectat',
        type: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: error.response?.data?.message || 'Nu s-a putut deconecta',
        type: 'error',
      });
    }
  };

  const handleCalendarChange = async (calendarId) => {
    setSelectedCalendarId(calendarId);
    try {
      await updateSettingsMutation.mutateAsync({
        calendarId,
        syncEnabled: true,
        locationId: currentLocationId || undefined,
      });
      showToast({
        title: 'Succes',
        description: 'Calendarul a fost selectat',
        type: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: error.response?.data?.message || 'Nu s-a putut actualiza calendarul',
        type: 'error',
      });
    }
  };

  const handleSyncAll = async () => {
    try {
      const result = await syncAllMutation.mutateAsync(currentLocationId);
      showToast({
        title: 'Succes',
        description: `${result?.results?.created || 0} create, ${result?.results?.updated || 0} actualizate`,
        type: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: error.response?.data?.message || 'Nu s-a putut sincroniza',
        type: 'error',
      });
    }
  };

  const handleSyncBidirectional = async () => {
    try {
      const result = await syncBidirectionalMutation.mutateAsync();
      const exportResults = result?.results?.export?.results || {};
      const importResults = result?.results?.import?.results || {};
      showToast({
        title: 'Sincronizare completa',
        description: `Export: ${exportResults.created || 0} create, ${exportResults.updated || 0} actualizate. Import: ${importResults.imported || 0} importate din Google.`,
        type: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: error.response?.data?.message || 'Nu s-a putut sincroniza',
        type: 'error',
      });
    }
  };

  // Public booking settings state (without serviceType)
  const [publicBooking, setPublicBooking] = useState({
    workingHours: { start: 9, end: 18 },
    slotDuration: 60,
    allowWeekends: false,
  });

  // Initialize form with current values
  useEffect(() => {
    if (currentPublicBooking) {
      setPublicBooking({
        workingHours: currentPublicBooking.workingHours || { start: 9, end: 18 },
        slotDuration: currentPublicBooking.slotDuration || 60,
        allowWeekends: currentPublicBooking.allowWeekends || false,
      });
    }
  }, [currentPublicBooking]);

  useEffect(() => {
    if (currentOrgDescription !== undefined) {
      setDescription(currentOrgDescription || '');
    }
  }, [currentOrgDescription]);

  useEffect(() => {
    if (currentPublicListing !== undefined) {
      setPublicListingEnabled(currentPublicListing !== false);
    }
  }, [currentPublicListing]);

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

  const saveDescription = async () => {
    setSavingDescription(true);
    try {
      await API.patch('/organizations/me/settings/description', { description });
      await refreshSettings();
      showToast({
        title: 'Succes',
        description: 'Descrierea organizatiei a fost actualizata',
        type: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: error.response?.data?.message || 'Nu s-a putut actualiza descrierea',
        type: 'error',
      });
    } finally {
      setSavingDescription(false);
    }
  };

  const savePublicListing = async (value) => {
    setSavingPublicListing(true);
    try {
      await API.patch('/organizations/me/settings/publicListing', { publicListing: value });
      await refreshSettings();
      setPublicListingEnabled(value);
      showToast({
        title: 'Succes',
        description: value ? 'Organizatia este acum vizibila in marketplace' : 'Organizatia a fost ascunsa din marketplace',
        type: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: error.response?.data?.message || 'Nu s-a putut actualiza vizibilitatea',
        type: 'error',
      });
    } finally {
      setSavingPublicListing(false);
    }
  };

  const handleDeactivate = async () => {
    const confirmed = await confirm({
      title: 'Dezactiveaza contul',
      text: 'Esti sigur ca vrei sa dezactivezi contul organizatiei? Contul va fi suspendat si nu va mai fi accesibil pana la reactivare de catre un administrator.',
      icon: 'warning',
      confirmButtonText: 'Da, dezactiveaza',
      cancelButtonText: 'Anuleaza',
    });
    if (!confirmed) return;

    setDeactivating(true);
    try {
      await API.post('/organizations/me/deactivate');
      showToast({
        title: 'Cont dezactivat',
        description: 'Contul a fost dezactivat. Vei fi deconectat.',
        type: 'success',
      });
      setTimeout(() => { window.location.href = '/logout'; }, 2000);
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: error.response?.data?.message || 'Nu s-a putut dezactiva contul',
        type: 'error',
      });
      setDeactivating(false);
    }
  };

  const SectorIcon = (sectorInfo?.activitySector && SECTOR_ICONS[sectorInfo.activitySector]) || Info;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Setari organizatie</h1>
        <p className="text-gray-600 mt-2">
          Gestioneaza setarile organizatiei tale
        </p>
      </div>

      {/* Sector Info - Read Only */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Domeniu de activitate</h2>
          <p className="text-sm text-gray-600 mt-1">
            Setarile domeniului sunt configurate la crearea organizatiei
          </p>
        </div>

        <div className="px-6 py-6">
          {sectorLoading ? (
            <div className="animate-pulse flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ) : sectorInfo ? (
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                <SectorIcon className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {sectorInfo.labelRo || sectorInfo.label}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {sectorInfo.description}
                </p>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sectorInfo.hasAssets && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tip activ</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {sectorInfo.terminology?.asset?.singular || 'N/A'}
                      </p>
                    </div>
                  )}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Resurse</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {sectorInfo.terminology?.resource?.singular || 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Foloseste active</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {sectorInfo.hasAssets ? 'Da' : 'Nu'}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  Aceste setari sunt determinate automat de domeniul de activitate si nu pot fi modificate.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">Nu s-au putut incarca informatiile despre domeniu.</p>
          )}
        </div>
      </div>

      {/* Public Booking Settings */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <Globe className="w-5 h-5 text-gray-400" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Setari portal public</h2>
            <p className="text-sm text-gray-600 mt-1">
              Configureaza cum clientii noi pot face programari prin portalul public
            </p>
          </div>
        </div>

        <div className="px-6 py-6 space-y-8">
          {/* Organization Description */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">Descriere organizatie</h3>
            <p className="text-sm text-gray-600 mb-4">
              Aceasta descriere va fi afisata in marketplace-ul public pentru clientii care cauta servicii
            </p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Ex: Oferim servicii de calitate cu peste 10 ani de experienta..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-400">{description.length}/500 caractere</span>
              <button
                onClick={saveDescription}
                disabled={savingDescription}
                className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-lg text-sm font-medium text-white bg-primary hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {savingDescription ? 'Se salveaza...' : 'Salveaza descrierea'}
              </button>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ora de inceput
                </label>
                <TimePicker
                  value={`${String(publicBooking.workingHours?.start || 9).padStart(2, '0')}:00`}
                  onChange={(v) => handleWorkingHoursChange('start', parseInt(v.split(':')[0], 10))}
                  minuteStep={30}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ora de sfarsit
                </label>
                <TimePicker
                  value={`${String(publicBooking.workingHours?.end || 18).padStart(2, '0')}:00`}
                  onChange={(v) => handleWorkingHoursChange('end', parseInt(v.split(':')[0], 10))}
                  minuteStep={30}
                />
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
              className="w-full md:w-1/3 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
          </div>

          {/* Portal URL Info */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>Link portal public:</strong>
            </p>
            <p className="text-sm text-blue-800 mt-2 font-mono">
              {window.location.origin.replace('3001', '3002')}/book/slug-organizatie
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
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Se salveaza...' : 'Salveaza modificarile'}
            </button>
          </div>
        </div>
      </div>

      {/* Google Calendar Integration */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm mt-6">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Google Calendar</h2>
              <p className="text-sm text-gray-600 mt-1">
                Sincronizeaza programarile cu Google Calendar
              </p>
            </div>
          </div>
          {currentLocation && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              {currentLocation.name}
            </span>
          )}
        </div>

        <div className="px-6 py-6">
          {gcalStatusLoading ? (
            <div className="animate-pulse flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ) : isLocationConnected ? (
            <div className="space-y-6">
              {/* Connected Status */}
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Conectat la Google Calendar</p>
                    <p className="text-sm text-green-700">Locatia: {locationConfig.locationName || currentLocation?.name}</p>
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnectMutation.isPending}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Unlink className="w-4 h-4 mr-1.5" />
                  {disconnectMutation.isPending ? 'Se deconecteaza...' : 'Deconecteaza'}
                </button>
              </div>

              {/* Calendar Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecteaza calendarul pentru sincronizare
                </label>
                {calendarsLoading ? (
                  <div className="animate-pulse h-10 bg-gray-200 rounded-lg w-full"></div>
                ) : calendars?.length > 0 ? (
                  <select
                    value={selectedCalendarId}
                    onChange={(e) => handleCalendarChange(e.target.value)}
                    disabled={updateSettingsMutation.isPending}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="">Selecteaza un calendar...</option>
                    {calendars.map((cal) => (
                      <option key={cal.id} value={cal.id}>
                        {cal.summary} {cal.primary && '(Principal)'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-gray-500">Nu s-au gasit calendare disponibile</p>
                )}
              </div>

              {/* Sync Info */}
              {locationConfig?.syncEnabled && selectedCalendarId && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Sincronizare activa (bidirectionala)
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        Programarile pentru aceasta locatie sunt sincronizate automat in ambele directii: CRM → Google si Google → CRM.
                      </p>
                      {locationConfig?.lastSyncAt && (
                        <p className="text-xs text-blue-600 mt-2">
                          Ultima sincronizare: {new Date(locationConfig.lastSyncAt).toLocaleString('ro-RO')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={handleSyncBidirectional}
                        disabled={syncBidirectionalMutation.isPending || syncAllMutation.isPending}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 mr-1.5 ${syncBidirectionalMutation.isPending ? 'animate-spin' : ''}`} />
                        {syncBidirectionalMutation.isPending ? 'Se sincronizeaza...' : 'Sincronizare completa'}
                      </button>
                      <button
                        onClick={handleSyncAll}
                        disabled={syncAllMutation.isPending || syncBidirectionalMutation.isPending}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 mr-1.5 ${syncAllMutation.isPending ? 'animate-spin' : ''}`} />
                        {syncAllMutation.isPending ? 'Se exporta...' : 'Doar export (CRM → Google)'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Other locations summary */}
              {gcalStatus?.configs?.length > 1 && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-2">Alte locatii conectate:</p>
                  <div className="flex flex-wrap gap-2">
                    {gcalStatus.configs
                      .filter((c) => c.locationId !== currentLocationId)
                      .map((c) => (
                        <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          <CheckCircle className="w-3 h-3" />
                          {c.locationName || 'Fara locatie'}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Conecteaza Google Calendar {currentLocation ? `pentru ${currentLocation.name}` : ''}
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Sincronizeaza programarile din aceasta locatie cu Google Calendar. Fiecare locatie poate fi conectata la un cont Google diferit.
              </p>
              <button
                onClick={handleConnect}
                disabled={connectMutation.isPending}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                <Link2 className="w-4 h-4 mr-2" />
                {connectMutation.isPending ? 'Se conecteaza...' : 'Conecteaza cu Google'}
              </button>

              {/* Show other connected locations */}
              {gcalStatus?.configs?.length > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200 text-left max-w-md mx-auto">
                  <p className="text-xs font-medium text-gray-600 mb-2">Locatii deja conectate:</p>
                  <div className="flex flex-wrap gap-2">
                    {gcalStatus.configs.map((c) => (
                      <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        <CheckCircle className="w-3 h-3" />
                        {c.locationName || 'Fara locatie'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200 text-left max-w-md mx-auto">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">Nota importanta</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Vei fi redirectionat catre Google pentru a autoriza accesul.
                      Aplicatia va putea crea si gestiona evenimente in calendarul tau.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Marketplace Visibility */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm mt-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Vizibilitate marketplace</h2>
          <p className="text-sm text-gray-600 mt-1">
            Controleaza daca organizatia ta apare in lista publica din marketplace
          </p>
        </div>
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {publicListingEnabled ? 'Organizatia este vizibila in marketplace' : 'Organizatia este ascunsa din marketplace'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Clientii pot gasi si programa in urma cautarilor din marketplace
              </p>
            </div>
            <button
              type="button"
              onClick={() => savePublicListing(!publicListingEnabled)}
              disabled={savingPublicListing}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 ${
                publicListingEnabled ? 'bg-primary' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  publicListingEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-red-200 bg-white shadow-sm mt-6">
        <div className="px-6 py-4 border-b border-red-100">
          <h2 className="text-lg font-semibold text-red-700">Zona periculoasa</h2>
          <p className="text-sm text-gray-600 mt-1">
            Actiuni ireversibile care afecteaza contul organizatiei
          </p>
        </div>
        <div className="px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Dezactiveaza contul</p>
              <p className="text-sm text-gray-500 mt-1">
                Contul va fi suspendat si nu va mai fi accesibil. Poate fi reactivat de un administrator de platforma.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={deactivating}
              className="flex-shrink-0 inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
            >
              {deactivating ? 'Se dezactiveaza...' : 'Dezactiveaza contul'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSettings;

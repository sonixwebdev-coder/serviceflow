import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTerminology } from '../context/TerminologyContext';
import useToast from '../context/useToast';
import API from '../utils/api';
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
  const { publicBooking: currentPublicBooking, refreshSettings } = useTerminology();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedCalendarId, setSelectedCalendarId] = useState('');

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleConnected = params.get('google_connected');
    const error = params.get('error');

    if (googleConnected === 'true') {
      showToast({
        title: 'Succes',
        description: 'Google Calendar a fost conectat cu succes!',
        type: 'success',
      });
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (error) {
      showToast({
        title: 'Eroare',
        description: error === 'oauth_failed'
          ? 'Nu s-a putut conecta Google Calendar. Te rugam sa incerci din nou.'
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

  // Google Calendar hooks
  const {
    data: gcalStatus,
    isLoading: gcalStatusLoading,
    refetch: refetchGcalStatus,
  } = useGoogleCalendarStatus();

  const {
    data: calendars,
    isLoading: calendarsLoading,
    refetch: fetchCalendars,
  } = useGoogleCalendars({ enabled: false });

  const connectMutation = useConnectGoogleCalendar();
  const disconnectMutation = useDisconnectGoogleCalendar();
  const updateSettingsMutation = useUpdateGoogleCalendarSettings();
  const syncAllMutation = useSyncAllToGoogleCalendar();
  const syncBidirectionalMutation = useSyncBidirectional();

  // Load calendars when connected
  useEffect(() => {
    if (gcalStatus?.connected) {
      fetchCalendars();
      if (gcalStatus?.calendarId) {
        setSelectedCalendarId(gcalStatus.calendarId);
      }
    }
  }, [gcalStatus?.connected, gcalStatus?.calendarId, fetchCalendars]);

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
    if (!window.confirm('Sigur doriti sa deconectati Google Calendar?')) return;

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
      const result = await syncAllMutation.mutateAsync();
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

  const SectorIcon = sectorInfo?.activitySector ? SECTOR_ICONS[sectorInfo.activitySector] : Info;

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
                <SectorIcon className="w-6 h-6 text-viperx-primary" />
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
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-viperx-primary hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-viperx-primary disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Se salveaza...' : 'Salveaza modificarile'}
            </button>
          </div>
        </div>
      </div>

      {/* Google Calendar Integration */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm mt-6">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Google Calendar</h2>
            <p className="text-sm text-gray-600 mt-1">
              Sincronizeaza programarile cu Google Calendar
            </p>
          </div>
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
          ) : gcalStatus?.connected ? (
            <div className="space-y-6">
              {/* Connected Status */}
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Conectat la Google Calendar</p>
                    <p className="text-sm text-green-700">{gcalStatus.email}</p>
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
              {gcalStatus?.syncEnabled && selectedCalendarId && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Sincronizare activa (bidirectionala)
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        Programarile sunt sincronizate automat in ambele directii: CRM → Google si Google → CRM.
                      </p>
                      {gcalStatus?.lastSyncAt && (
                        <p className="text-xs text-blue-600 mt-2">
                          Ultima sincronizare: {new Date(gcalStatus.lastSyncAt).toLocaleString('ro-RO')}
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
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Conecteaza Google Calendar
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Sincronizeaza programarile din aplicatie cu Google Calendar pentru a avea o vedere completa a programului tau.
              </p>
              <button
                onClick={handleConnect}
                disabled={connectMutation.isPending}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                <Link2 className="w-4 h-4 mr-2" />
                {connectMutation.isPending ? 'Se conecteaza...' : 'Conecteaza cu Google'}
              </button>

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
    </div>
  );
};

export default OrganizationSettings;

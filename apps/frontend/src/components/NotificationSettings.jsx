import { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X, Loader2 } from 'lucide-react';
import usePushNotifications from '../hooks/usePushNotifications';

const NotificationSettings = () => {
  const {
    subscribed,
    loading,
    preferences,
    preferencesLoading,
    preferencesFetching,
    subscribe,
    unsubscribe,
    updatePreferences,
    subscribing,
    unsubscribing,
    updatingPreferences,
    supported,
    hasPermission,
  } = usePushNotifications();

  const [localPreferences, setLocalPreferences] = useState(preferences || {});
  const [isBrave, setIsBrave] = useState(false);

  // Detect Brave browser
  useEffect(() => {
    const checkBrave = async () => {
      if (navigator.brave) {
        try {
          const brave = await navigator.brave.isBrave();
          setIsBrave(brave);
        } catch (error) {
          setIsBrave(false);
        }
      }
    };
    checkBrave();
  }, []);

  // Update local state when preferences load
  useEffect(() => {
    if (preferences) {
      setLocalPreferences(preferences);
    }
  }, [preferences]);

  const handleToggleSubscription = () => {
    if (subscribed) {
      unsubscribe();
    } else {
      subscribe();
    }
  };

  const handlePreferenceChange = (key, value) => {
    const updated = { ...localPreferences, [key]: value };
    setLocalPreferences(updated);
    updatePreferences({ [key]: value });
  };

  if (!supported) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <div className="flex items-start gap-3">
          <BellOff className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900">Notificari Push Nesuportate</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Browser-ul tau nu suporta notificari push. Te rugam sa folosesti un browser modern precum Chrome, Firefox sau Edge.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Only show loader while checking subscription status
  // Once we know if user is subscribed or not, show the UI
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Brave Browser Warning */}
      {isBrave && !subscribed && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <BellOff className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-900">Setari Brave Browser</h3>
              <p className="text-sm text-orange-800 mt-1">
                Pentru notificari push in Brave, activeaza urmatoarele setari:
              </p>
              <ul className="text-sm text-orange-800 mt-2 list-disc list-inside space-y-1">
                <li>Mergi la <code className="bg-orange-100 px-1 rounded">brave://settings/privacy</code></li>
                <li>Activeaza "Use Google Services for Push Messaging"</li>
                <li>Activeaza "Allow Google login buttons"</li>
                <li>Reincarca pagina dupa modificari</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Status */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {subscribed ? (
              <Bell className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <BellOff className="h-6 w-6 text-gray-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <h3 className="font-semibold text-gray-900">Notificari Push</h3>
              <p className="text-sm text-gray-600 mt-1">
                {subscribed
                  ? 'Esti abonat la notificari push pe acest dispozitiv.'
                  : 'Aboneaza-te pentru a primi notificari in timp real in browser.'}
              </p>
              {!hasPermission && !subscribed && (
                <p className="text-xs text-yellow-700 mt-2 bg-yellow-50 border border-yellow-200 rounded px-2 py-1 inline-block">
                  Vei fi intrebat sa permiti notificarile
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleToggleSubscription}
            disabled={subscribing || unsubscribing}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
              subscribed
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-primary text-white hover:bg-orange-600'
            }`}
          >
            {subscribing || unsubscribing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {subscribing ? 'Se aboneaza...' : 'Se dezaboneaza...'}
              </>
            ) : (
              <>
                {subscribed ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                {subscribed ? 'Dezaboneaza-te' : 'Aboneaza-te'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notification Preferences */}
      {subscribed && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Preferinte Notificari</h3>
          <p className="text-sm text-gray-600 mb-4">
            Alege ce tipuri de notificari doresti sa primesti.
          </p>

          {preferencesLoading && !preferences ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : preferences ? (
            <>

          <div className="space-y-4">
            {/* Master Toggle */}
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <h4 className="font-medium text-gray-900">Activeaza Toate Notificarile</h4>
                <p className="text-sm text-gray-600">Buton principal pentru toate notificarile push</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localPreferences.enablePushNotifications || false}
                  onChange={(e) => handlePreferenceChange('enablePushNotifications', e.target.checked)}
                  disabled={updatingPreferences}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Individual Preferences */}
            {localPreferences.enablePushNotifications && (
              <div className="space-y-3 pl-4 border-l-2 border-gray-200">
                {[
                  { key: 'enableAppointments', label: 'Programari', description: 'Asignari noi, actualizari si mesaje' },
                  { key: 'enableLeaveRequests', label: 'Cereri Concediu', description: 'Aprobare, respingere si cereri noi' },
                  { key: 'enableTasks', label: 'Taskuri', description: 'Asignari task-uri si comentarii' },
                  { key: 'enableReminders', label: 'Reminder-uri', description: 'Reminder-uri personale pentru todo-uri' },
                  { key: 'enableMessages', label: 'Mesaje', description: 'Mesaje noi in programari' },
                  { key: 'enablePayments', label: 'Plati', description: 'Actualizari si confirmari plati' },
                ].map(({ key, label, description }) => (
                  <div key={key} className="flex items-center justify-between py-2">
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">{label}</h5>
                      <p className="text-xs text-gray-600">{description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localPreferences[key] || false}
                        onChange={(e) => handlePreferenceChange(key, e.target.checked)}
                        disabled={updatingPreferences}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {updatingPreferences && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Se salveaza preferintele...
            </div>
          )}
          </>
          ) : null}
        </div>
      )}

      {/* Help Text */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Bell className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium">Despre Notificarile Push</p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-blue-800">
              <li>Notificarile functioneaza chiar si cand aplicatia este inchisa</li>
              <li>Poti gestiona permisiunile din setarile browser-ului</li>
              <li>Fiecare dispozitiv trebuie abonat separat</li>
              <li>Notificarile respecta preferintele tale</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;

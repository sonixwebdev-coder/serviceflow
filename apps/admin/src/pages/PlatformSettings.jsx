import { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, Lock, CreditCard, Tag, Package, Settings, Shield } from 'lucide-react';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { useChangePassword } from '@/hooks/useAuth';
import useToast from '@/context/useToast';

const PLANS = ['Starter', 'Professional', 'Enterprise'];
const INTERVALS = ['Monthly', 'Annual'];

const TABS = [
  { key: 'stripe', label: 'Stripe', icon: CreditCard },
  { key: 'subscriptions', label: 'Abonamente', icon: Tag },
  { key: 'addons', label: 'Add-ons', icon: Package },
  { key: 'general', label: 'General', icon: Settings },
  { key: 'security', label: 'Securitate', icon: Shield },
];

export default function PlatformSettings() {
  const { data: settings, isLoading } = useSettings();
  const { mutate: save, isPending: saving } = useUpdateSettings();
  const { mutate: changePassword, isPending: changingPassword } = useChangePassword();
  const [activeTab, setActiveTab] = useState('stripe');
  const [form, setForm] = useState({});
  const [showSecrets, setShowSecrets] = useState({});
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    if (settings) {
      setForm({
        stripeSecretKey: settings.stripeSecretKey || '',
        stripePublishableKey: settings.stripePublishableKey || '',
        stripeWebhookSecret: settings.stripeWebhookSecret || '',
        priceStarterMonthly: settings.priceStarterMonthly || '',
        priceStarterAnnual: settings.priceStarterAnnual || '',
        priceProfessionalMonthly: settings.priceProfessionalMonthly || '',
        priceProfessionalAnnual: settings.priceProfessionalAnnual || '',
        priceEnterpriseMonthly: settings.priceEnterpriseMonthly || '',
        priceEnterpriseAnnual: settings.priceEnterpriseAnnual || '',
        displayPriceStarterMonthly: settings.displayPriceStarterMonthly ?? '',
        displayPriceStarterAnnual: settings.displayPriceStarterAnnual ?? '',
        displayPriceProfessionalMonthly: settings.displayPriceProfessionalMonthly ?? '',
        displayPriceProfessionalAnnual: settings.displayPriceProfessionalAnnual ?? '',
        displayPriceEnterpriseMonthly: settings.displayPriceEnterpriseMonthly ?? '',
        displayPriceEnterpriseAnnual: settings.displayPriceEnterpriseAnnual ?? '',
        trialDays: settings.trialDays ?? 14,
        addonPriceIdClients100: settings.addonPriceIdClients100 || '',
        addonPriceIdClients300: settings.addonPriceIdClients300 || '',
        addonPriceIdAppointments200: settings.addonPriceIdAppointments200 || '',
        addonPriceIdAppointments500: settings.addonPriceIdAppointments500 || '',
        addonPriceClients100: settings.addonPriceClients100 ?? '',
        addonPriceClients300: settings.addonPriceClients300 ?? '',
        addonPriceAppointments200: settings.addonPriceAppointments200 ?? '',
        addonPriceAppointments500: settings.addonPriceAppointments500 ?? '',
      });
    }
  }, [settings]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {};
    for (const [key, value] of Object.entries(form)) {
      if (typeof value === 'string' && value.startsWith('****')) continue;
      if (value === '' || value === null || value === undefined) continue;
      payload[key] = value;
    }
    save(payload, {
      onSuccess: () =>
        showToast({
          title: 'Salvat',
          description: 'Setarile au fost actualizate.',
          type: 'success',
        }),
      onError: () =>
        showToast({ title: 'Eroare', description: 'Nu s-au putut salva setarile.', type: 'error' }),
    });
  };

  const toggleSecret = (key) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  const inputClass =
    'w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors';

  const secretField = (label, key, placeholder = 'sk_live_...') => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={showSecrets[key] ? 'text' : 'password'}
          value={form[key] || ''}
          onChange={(e) => handleChange(key, e.target.value)}
          className={`${inputClass} pr-10`}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => toggleSecret(key)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {showSecrets[key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:gap-6">
      {/* Sidebar tabs */}
      <nav className="flex lg:w-52 lg:shrink-0 lg:flex-col gap-1 overflow-x-auto lg:overflow-visible rounded-2xl border border-gray-200/60 bg-white p-2 shadow-sm lg:self-start">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {activeTab === 'stripe' && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <Card
              title="Credentiale Stripe"
              description="Cheile de autentificare pentru integrarea cu Stripe."
            >
              <div className="space-y-4">
                {secretField('Secret Key', 'stripeSecretKey')}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Publishable Key
                  </label>
                  <input
                    type="text"
                    value={form.stripePublishableKey || ''}
                    onChange={(e) => handleChange('stripePublishableKey', e.target.value)}
                    className={inputClass}
                    placeholder="pk_live_..."
                  />
                </div>
                {secretField('Webhook Secret', 'stripeWebhookSecret', 'whsec_...')}
              </div>
            </Card>
            <SaveButton saving={saving} />
          </form>
        )}

        {activeTab === 'subscriptions' && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <Card
              title="Price IDs Stripe"
              description="ID-urile de pret din Stripe pentru fiecare plan si interval."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {PLANS.map((plan) =>
                  INTERVALS.map((interval) => {
                    const key = `price${plan}${interval}`;
                    return (
                      <div key={key}>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">
                          {plan} - {interval === 'Annual' ? 'Anual' : 'Lunar'}
                        </label>
                        <input
                          type="text"
                          value={form[key] || ''}
                          onChange={(e) => handleChange(key, e.target.value)}
                          className={inputClass}
                          placeholder="price_..."
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            <Card
              title="Preturi afisate (RON / luna)"
              description="Preturile vizibile pe site. Pentru abonamentele anuale, pretul afisat va fi inmultit automat cu 12."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {PLANS.map((plan) =>
                  INTERVALS.map((interval) => {
                    const key = `displayPrice${plan}${interval}`;
                    return (
                      <div key={key}>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">
                          {plan} - {interval === 'Annual' ? 'Anual (pret/luna)' : 'Lunar'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form[key] ?? ''}
                          onChange={(e) =>
                            handleChange(key, e.target.value ? Number(e.target.value) : '')
                          }
                          className={inputClass}
                          placeholder="0.00"
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
            <SaveButton saving={saving} />
          </form>
        )}

        {activeTab === 'addons' && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <Card
              title="Price IDs Add-ons"
              description="Daca este configurat un Price ID, acesta va fi folosit in checkout. Altfel se creeaza pretul inline."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'addonPriceIdClients100', label: '+100 Clienti' },
                  { key: 'addonPriceIdClients300', label: '+300 Clienti' },
                  { key: 'addonPriceIdAppointments200', label: '+200 Programari' },
                  { key: 'addonPriceIdAppointments500', label: '+500 Programari' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      {label}
                    </label>
                    <input
                      type="text"
                      value={form[key] || ''}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className={inputClass}
                      placeholder="price_..."
                    />
                  </div>
                ))}
              </div>
            </Card>

            <Card
              title="Preturi fallback (bani)"
              description="Folosite doar cand nu exista un Price ID configurat. 1 RON = 100 bani."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'addonPriceClients100', label: '+100 Clienti', defaultPrice: 1500 },
                  { key: 'addonPriceClients300', label: '+300 Clienti', defaultPrice: 2900 },
                  { key: 'addonPriceAppointments200', label: '+200 Programari', defaultPrice: 900 },
                  {
                    key: 'addonPriceAppointments500',
                    label: '+500 Programari',
                    defaultPrice: 1900,
                  },
                ].map(({ key, label, defaultPrice }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      {label}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form[key] ?? ''}
                      onChange={(e) =>
                        handleChange(key, e.target.value ? Number(e.target.value) : '')
                      }
                      className={inputClass}
                      placeholder={`implicit: ${defaultPrice} (${defaultPrice / 100} RON)`}
                    />
                  </div>
                ))}
              </div>
            </Card>
            <SaveButton saving={saving} />
          </form>
        )}

        {activeTab === 'general' && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <Card
              title="Perioada de trial"
              description="Numarul de zile oferite gratuit la inregistrare."
            >
              <div className="max-w-xs">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Zile trial</label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={form.trialDays ?? 14}
                  onChange={(e) => handleChange('trialDays', Number(e.target.value))}
                  className={inputClass}
                />
              </div>
            </Card>
            <SaveButton saving={saving} />
          </form>
        )}

        {activeTab === 'security' && (
          <Card title="Schimbare parola" description="Schimba parola contului de super admin.">
            {passwordError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {passwordError}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPasswordError('');
                if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                  setPasswordError('Parolele nu coincid');
                  return;
                }
                if (passwordForm.newPassword.length < 8) {
                  setPasswordError('Parola noua trebuie sa aiba cel putin 8 caractere');
                  return;
                }
                changePassword(
                  {
                    currentPassword: passwordForm.currentPassword,
                    newPassword: passwordForm.newPassword,
                  },
                  {
                    onSuccess: () => {
                      showToast({
                        title: 'Succes',
                        description: 'Parola a fost schimbata.',
                        type: 'success',
                      });
                      setPasswordForm({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: '',
                      });
                    },
                    onError: (err) => {
                      setPasswordError(
                        err?.response?.data?.message || 'Eroare la schimbarea parolei'
                      );
                    },
                  }
                );
              }}
              className="space-y-4 max-w-md"
            >
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Parola curenta
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Parola noua
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Confirmare parola noua
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={changingPassword}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-gray-800 disabled:opacity-50 transition-all hover:shadow"
              >
                {changingPassword ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                Schimba parola
              </button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}

function Card({ title, description, children }) {
  return (
    <div className="rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {description && <p className="mt-0.5 mb-4 text-[11px] text-gray-400">{description}</p>}
      {!description && <div className="mb-4" />}
      {children}
    </div>
  );
}

function SaveButton({ saving }) {
  return (
    <div className="flex items-center">
      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50 transition-all hover:shadow"
      >
        {saving ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Salveaza
      </button>
    </div>
  );
}

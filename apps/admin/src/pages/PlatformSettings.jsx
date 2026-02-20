import { useState, useEffect } from 'react';
import { Save, Eye, EyeOff } from 'lucide-react';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import useToast from '@/context/useToast';

const PLANS = ['Starter', 'Professional', 'Enterprise'];
const INTERVALS = ['Monthly', 'Annual'];

export default function PlatformSettings() {
  const { data: settings, isLoading } = useSettings();
  const { mutate: save, isPending: saving } = useUpdateSettings();
  const [form, setForm] = useState({});
  const [showSecrets, setShowSecrets] = useState({});
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
      });
    }
  }, [settings]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Build payload — only send non-masked, changed values
    const payload = {};
    for (const [key, value] of Object.entries(form)) {
      // Skip masked values (****xxxx pattern) — they haven't been changed
      if (typeof value === 'string' && value.startsWith('****')) continue;
      // Skip empty strings for optional fields
      if (value === '' || value === null || value === undefined) continue;
      payload[key] = value;
    }

    save(payload, {
      onSuccess: () => showToast({ title: 'Salvat', description: 'Setarile au fost actualizate.', type: 'success' }),
      onError: () => showToast({ title: 'Eroare', description: 'Nu s-au putut salva setarile.', type: 'error' }),
    });
  };

  const toggleSecret = (key) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  const secretField = (label, key) => (
    <div key={key}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type={showSecrets[key] ? 'text' : 'password'}
          value={form[key] || ''}
          onChange={(e) => handleChange(key, e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          placeholder="sk_live_..."
        />
        <button
          type="button"
          onClick={() => toggleSecret(key)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {showSecrets[key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Setari Platforma</h1>
        <p className="text-sm text-gray-500 mt-1">Configurare credentiale Stripe si preturi abonamente.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Stripe Credentials */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Credentiale Stripe</h2>
          <div className="grid grid-cols-1 gap-4">
            {secretField('Secret Key', 'stripeSecretKey')}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Publishable Key</label>
              <input
                type="text"
                value={form.stripePublishableKey || ''}
                onChange={(e) => handleChange('stripePublishableKey', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="pk_live_..."
              />
            </div>
            {secretField('Webhook Secret', 'stripeWebhookSecret')}
          </div>
        </section>

        {/* Price IDs */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Price IDs Stripe</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PLANS.map((plan) =>
              INTERVALS.map((interval) => {
                const key = `price${plan}${interval}`;
                return (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {plan} - {interval}
                    </label>
                    <input
                      type="text"
                      value={form[key] || ''}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      placeholder="price_..."
                    />
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Display Prices */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Preturi afisate (RON)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PLANS.map((plan) =>
              INTERVALS.map((interval) => {
                const key = `displayPrice${plan}${interval}`;
                return (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {plan} - {interval}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form[key] ?? ''}
                      onChange={(e) => handleChange(key, e.target.value ? Number(e.target.value) : '')}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      placeholder="0.00"
                    />
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Trial Days */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Perioada de trial</h2>
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">Zile trial</label>
            <input
              type="number"
              min="0"
              max="365"
              value={form.trialDays ?? 14}
              onChange={(e) => handleChange('trialDays', Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </section>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salveaza
          </button>
        </div>
      </form>
    </div>
  );
}

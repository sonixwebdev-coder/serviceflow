import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CreditCard,
  Zap,
  Users,
  UserCircle,
  CalendarDays,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ShoppingCart,
  Package,
  Clock,
} from 'lucide-react';
import useAuth from '../context/useAuth';
import useToast from '../context/useToast';
import { refreshAuthSession } from '../utils/api';
import {
  getBillingStatus,
  createCheckoutSession,
  createPortalSession,
  getQuotaUsage,
  getAvailableAddons,
  getActiveAddons,
  purchaseAddon,
  verifyCheckout,
  verifyAddonCheckout,
} from '../services/billingService';
import {
  PLAN_NAMES,
  PLAN_PRICES as FALLBACK_PRICES,
  PLAN_RANK,
  PLAN_QUOTAS,
  PLAN_FEATURES_FLAT,
} from '../constants/plans';

const STATUS_LABELS = {
  ACTIVE: { label: 'Activ', color: 'bg-green-100 text-green-700' },
  TRIAL: { label: 'Perioada de proba', color: 'bg-blue-100 text-blue-700' },
  SUSPENDED: { label: 'Suspendat', color: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Anulat', color: 'bg-gray-100 text-gray-700' },
  PAYMENT_REQUIRED: { label: 'Plata necesara', color: 'bg-red-100 text-red-700' },
};

function UsageMeter({ label, icon: Icon, current, max, suffix = '', addonBoost = 0 }) {
  const isUnlimited = max === -1 || max >= 999999 || max === Infinity;
  const percentage = isUnlimited ? 0 : Math.min((current / max) * 100, 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className={`rounded-lg border p-4 ${isAtLimit ? 'border-red-200 bg-red-50' : isNearLimit ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${isAtLimit ? 'text-red-500' : isNearLimit ? 'text-orange-500' : 'text-gray-500'}`} />
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <span className={`text-sm ${isAtLimit ? 'font-semibold text-red-600' : 'text-gray-500'}`}>
          {current} / {isUnlimited ? 'Nelimitat' : max}{suffix}
        </span>
      </div>
      {!isUnlimited && (
        <div className="mt-2 h-2 rounded-full bg-gray-100">
          <div
            className={`h-2 rounded-full transition-all ${
              isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-orange-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
      {addonBoost > 0 && (
        <p className="mt-1 text-xs text-blue-600">+{addonBoost} din pachete suplimentare</p>
      )}
    </div>
  );
}

function UpgradeCard({ plan, interval, onSelect, currentPlan, displayPrices }) {
  // Use dynamic prices from admin settings, fall back to hardcoded
  const dynamicPrices = displayPrices?.[plan];
  const fallback = FALLBACK_PRICES[plan];
  if (!fallback) return null;

  const monthlyPrice = Number(dynamicPrices?.monthly) || fallback.monthly;
  const annualPrice = Number(dynamicPrices?.annual) || fallback.annual;
  const price = interval === 'annual' ? annualPrice : monthlyPrice;
  const isCurrentPlan = currentPlan === plan;

  return (
    <div
      className={`rounded-lg border p-4 ${
        plan === 'PROFESSIONAL'
          ? 'border-blue-500 ring-1 ring-blue-500'
          : 'border-gray-200'
      }`}
    >
      <h4 className="text-sm font-bold text-gray-900">{PLAN_NAMES[plan]}</h4>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-extrabold text-gray-900">{price}</span>
        <span className="text-xs text-gray-500">RON / luna</span>
      </div>

      {/* Annual pricing breakdown */}
      {interval === 'annual' && (
        <>
          <p className="text-xs text-gray-500 mt-1">
            Facturat anual: <span className="font-semibold">{annualPrice * 12} RON / an</span>
          </p>
          {monthlyPrice > annualPrice && (
            <p className="text-xs text-green-600 font-medium">
              Economisesti {(monthlyPrice - annualPrice) * 12} RON / an
            </p>
          )}
        </>
      )}

      <button
        onClick={() => onSelect(plan)}
        disabled={isCurrentPlan}
        className={`mt-3 w-full rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
          isCurrentPlan
            ? 'cursor-default bg-gray-100 text-gray-400'
            : PLAN_RANK[plan] > PLAN_RANK[currentPlan]
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {isCurrentPlan ? 'Plan curent' : PLAN_RANK[plan] > PLAN_RANK[currentPlan] ? 'Upgrade' : 'Downgrade'}
      </button>
    </div>
  );
}

function PlanComparisonTable({ currentPlan }) {
  const plans = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
  const allFeatures = [...new Set(plans.flatMap((p) => PLAN_FEATURES_FLAT[p]))];

  const quotaRows = [
    { label: 'Utilizatori', key: 'users', icon: Users },
    { label: 'Clienti', key: 'clients', icon: UserCircle },
    { label: 'Programari / luna', key: 'appointments', icon: CalendarDays },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="text-base font-bold text-gray-900 mb-1">Comparatie planuri</h3>
      <p className="text-sm text-gray-500 mb-5">Vezi ce include fiecare plan si alege cel potrivit pentru tine.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="py-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-gray-400" />
              {plans.map((plan) => {
                const isCurrent = currentPlan === plan;
                const isPopular = plan === 'PROFESSIONAL';
                return (
                  <th
                    key={plan}
                    className={`px-4 py-3 text-center ${isCurrent ? 'bg-blue-50 rounded-t-lg' : ''}`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      {isPopular && (
                        <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          Popular
                        </span>
                      )}
                      <span className={`text-sm font-bold ${isCurrent ? 'text-blue-700' : 'text-gray-900'}`}>
                        {PLAN_NAMES[plan]}
                      </span>
                      {isCurrent && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                          Planul curent
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {/* Section: Quotas */}
            <tr>
              <td colSpan={plans.length + 1} className="pt-4 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Limite</span>
              </td>
            </tr>
            {quotaRows.map(({ label, key, icon: Icon }) => (
              <tr key={key} className="border-t border-gray-50">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Icon className="h-4 w-4 text-gray-400" />
                    <span>{label}</span>
                  </div>
                </td>
                {plans.map((plan) => {
                  const val = PLAN_QUOTAS[plan][key];
                  const isCurrent = currentPlan === plan;
                  return (
                    <td key={plan} className={`px-4 py-3 text-center ${isCurrent ? 'bg-blue-50/50' : ''}`}>
                      <span className={`font-semibold ${val === -1 ? 'text-green-600' : 'text-gray-900'}`}>
                        {val === -1 ? 'Nelimitat' : val.toLocaleString('ro-RO')}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Section: Features */}
            <tr>
              <td colSpan={plans.length + 1} className="pt-6 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Functionalitati</span>
              </td>
            </tr>
            {allFeatures.map((feature) => (
              <tr key={feature} className="border-t border-gray-50">
                <td className="py-2.5 pr-4 text-gray-600">{feature}</td>
                {plans.map((plan) => {
                  const included = PLAN_FEATURES_FLAT[plan].includes(feature);
                  const isCurrent = currentPlan === plan;
                  return (
                    <td key={plan} className={`px-4 py-2.5 text-center ${isCurrent ? 'bg-blue-50/50' : ''}`}>
                      {included ? (
                        <CheckCircle className="mx-auto h-4 w-4 text-green-500" />
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function BillingSettings() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [interval, setInterval] = useState('monthly');
  const [quotaUsage, setQuotaUsage] = useState(null);
  const [availableAddons, setAvailableAddons] = useState([]);
  const [activeAddonList, setActiveAddonList] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const { user } = useAuth();

  const orgStatus = user?.orgStatus || status?.status;

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [billingData, usage, addons, active] = await Promise.all([
        getBillingStatus(),
        getQuotaUsage().catch(() => null),
        getAvailableAddons().catch(() => []),
        getActiveAddons().catch(() => []),
      ]);
      setStatus(billingData);
      setQuotaUsage(usage);
      setAvailableAddons(addons);
      setActiveAddonList(active);
    } catch (err) {
      showToast({
        title: 'Eroare',
        description: err.message || 'Nu am putut incarca statusul abonamentului.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle redirect status from Stripe Checkout (use ref to prevent duplicate toasts)
  const handledStatusRef = useRef(null);
  useEffect(() => {
    const checkoutStatus = searchParams.get('status');
    const sessionId = searchParams.get('session_id');

    // No checkout redirect - just load data normally
    if (!checkoutStatus) {
      fetchAll();
      return;
    }

    if (handledStatusRef.current === checkoutStatus) return;
    handledStatusRef.current = checkoutStatus;

    // Clean up URL params immediately to prevent re-triggers
    setSearchParams({}, { replace: true });

    if (checkoutStatus === 'success') {
      showToast({
        title: 'Abonament activat',
        description: 'Planul tau a fost actualizat cu succes.',
        type: 'success',
      });
      // Verify checkout session directly with Stripe and sync subscription
      // This ensures the org status is updated even if the webhook was delayed
      const syncAfterCheckout = async () => {
        try {
          if (sessionId) {
            const freshStatus = await verifyCheckout(sessionId);
            setStatus(freshStatus);
          } else {
            await fetchAll();
          }
        } catch {
          // Fall back to normal fetch if verify fails
          await fetchAll();
        }
        refreshAuthSession().catch(() => {});
      };
      syncAfterCheckout();
      return;
    }
    if (checkoutStatus === 'addon_success') {
      showToast({
        title: 'Pachet activat',
        description: 'Pachetul suplimentar a fost activat cu succes.',
        type: 'success',
      });
      const verifyAddon = async () => {
        try {
          if (sessionId) {
            await verifyAddonCheckout(sessionId);
          }
        } catch {
          // Webhook may have already handled it - not critical
        }
        await fetchAll();
        refreshAuthSession().catch(() => {});
      };
      verifyAddon();
      return;
    }
    if (checkoutStatus === 'cancelled') {
      showToast({
        title: 'Plata anulata',
        description: 'Sesiunea de plata a fost anulata.',
        type: 'warning',
      });
      fetchAll();
    }
  }, [searchParams]);

  const handleUpgrade = async (plan) => {
    try {
      setActionLoading(true);
      await createCheckoutSession(plan, interval);
    } catch (err) {
      showToast({
        title: 'Eroare',
        description: err.message || 'Nu am putut crea sesiunea de plata.',
        type: 'error',
      });
      setActionLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setActionLoading(true);
      await createPortalSession();
    } catch (err) {
      showToast({
        title: 'Eroare',
        description: err.message || 'Nu am putut deschide portalul de facturare.',
        type: 'error',
      });
      setActionLoading(false);
    }
  };

  const handlePurchaseAddon = async (addonType) => {
    try {
      setActionLoading(true);
      await purchaseAddon(addonType);
    } catch (err) {
      showToast({
        title: 'Eroare',
        description: err.message || 'Nu am putut crea sesiunea de plata.',
        type: 'error',
      });
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
        <p className="mt-2 text-sm text-red-700">Nu am putut incarca informatiile de facturare.</p>
      </div>
    );
  }

  const statusConfig = STATUS_LABELS[status.status] || STATUS_LABELS.ACTIVE;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Abonament & Facturare</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestioneaza planul, facturarea si utilizarea contului tau.
        </p>
      </div>

      {/* PAYMENT_REQUIRED banner */}
      {orgStatus === 'PAYMENT_REQUIRED' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="text-sm font-semibold text-red-800">Abonament necesar</h3>
          <p className="mt-1 text-sm text-red-700">
            Perioada de proba / abonamentul a expirat. Alege un plan de mai jos pentru a continua.
          </p>
        </div>
      )}

      {/* Plan override banner */}
      {status.planOverride && (
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
          <div>
            <p className="text-sm font-semibold text-green-800">Plan acordat de administrator</p>
            <p className="mt-1 text-sm text-green-700">
              Nu este necesara plata - planul a fost acordat manual.
              {status.planOverrideReason && <> Motiv: {status.planOverrideReason}</>}
            </p>
          </div>
        </div>
      )}

      {/* Suspended warning */}
      {status.status === 'SUSPENDED' && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-800">Cont suspendat</p>
            <p className="mt-1 text-sm text-red-700">
              Plata nu a putut fi procesata. Actualizeaza metoda de plata pentru a reactiva contul.
            </p>
            <button
              onClick={handleManageSubscription}
              disabled={actionLoading}
              className="mt-2 text-sm font-semibold text-red-700 underline hover:text-red-900"
            >
              Actualizeaza metoda de plata
            </button>
          </div>
        </div>
      )}

      {/* Current plan card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Plan {PLAN_NAMES[status.plan] || status.plan}
              </h2>
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusConfig.color}`}
              >
                {statusConfig.label}
              </span>
            </div>
          </div>

          {/* Manage subscription button - only when there's an active Stripe subscription */}
          {status.subscriptionId && (
            <button
              onClick={handleManageSubscription}
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              <ExternalLink className="h-4 w-4" />
              Gestioneaza abonamentul
            </button>
          )}
        </div>

        {/* Trial / subscription info */}
        <div className="mt-4 grid gap-3 text-sm text-gray-600 sm:grid-cols-3">
          {status.status === 'TRIAL' && status.trialEndsAt && (
            <div className="rounded-lg bg-blue-50 p-3">
              <span className="text-xs font-medium text-blue-600">Perioada de proba expira</span>
              <p className="mt-0.5 font-semibold text-blue-900">
                {new Date(status.trialEndsAt).toLocaleDateString('ro-RO', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                {Math.max(0, Math.ceil((new Date(status.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24)))} zile ramase
              </p>
            </div>
          )}

          {status.nextInvoice && (
            <div className="rounded-lg bg-gray-50 p-3">
              <span className="text-xs font-medium text-gray-500">Urmatoarea factura</span>
              <p className="mt-0.5 font-semibold text-gray-900">
                {status.nextInvoice.amount} {status.nextInvoice.currency?.toUpperCase()}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(status.nextInvoice.date).toLocaleDateString('ro-RO', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}

          {status.cancelAtPeriodEnd && (
            <div className="rounded-lg bg-orange-50 p-3">
              <span className="text-xs font-medium text-orange-600">Abonament anulat</span>
              <p className="mt-0.5 text-xs text-orange-800">
                Accesul continua pana la{' '}
                {new Date(status.currentPeriodEnd).toLocaleDateString('ro-RO', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Usage meters - use quota API data when available, fall back to billing status */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Utilizare curenta</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <UsageMeter
            label="Utilizatori"
            icon={Users}
            current={quotaUsage?.users?.used ?? status?.usage?.users?.current ?? 0}
            max={quotaUsage?.users?.limit ?? status?.usage?.users?.max ?? 5}
            addonBoost={quotaUsage?.users?.addonBoost}
          />
          <UsageMeter
            label="Clienti"
            icon={UserCircle}
            current={quotaUsage?.clients?.used ?? status?.usage?.clients?.current ?? 0}
            max={quotaUsage?.clients?.limit ?? status?.usage?.clients?.max ?? 100}
            addonBoost={quotaUsage?.clients?.addonBoost}
          />
          <UsageMeter
            label="Programari luna aceasta"
            icon={CalendarDays}
            current={quotaUsage?.appointments?.used ?? status?.usage?.appointments?.current ?? 0}
            max={quotaUsage?.appointments?.limit ?? status?.usage?.appointments?.max ?? 500}
            suffix="/luna"
            addonBoost={quotaUsage?.appointments?.addonBoost}
          />
        </div>
      </div>

      {/* Add-on packs section */}
      {status.plan !== 'ENTERPRISE' && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-5 w-5 text-blue-600" />
            <h3 className="text-base font-bold text-gray-900">Pachete suplimentare</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Ai nevoie de mai mult? Achizitioneaza pachete suplimentare fara sa schimbi planul.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {availableAddons.map((addon) => (
              <div key={addon.type} className="rounded-lg border border-gray-200 p-4 flex flex-col">
                <h4 className="text-sm font-bold text-gray-900">{addon.label}</h4>
                <p className="mt-1 text-xs text-gray-500">
                  {addon.permanent ? 'Permanent' : 'Valabil luna curenta'}
                </p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-lg font-extrabold text-gray-900">{addon.priceFormatted}</span>
                  <span className="text-xs text-gray-500">o singura data</span>
                </div>
                <button
                  onClick={() => handlePurchaseAddon(addon.type)}
                  disabled={actionLoading}
                  className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  <ShoppingCart className="inline h-3.5 w-3.5 mr-1" />
                  Cumpara
                </button>
              </div>
            ))}
          </div>

          {/* Active add-ons */}
          {activeAddonList.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Pachete active</h4>
              <div className="space-y-2">
                {activeAddonList.map((addon) => (
                  <div key={addon.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-gray-700">
                        +{addon.amount} {addon.resource === 'clients' ? 'clienti' : 'programari'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {addon.expiresAt ? (
                        <>
                          <Clock className="inline h-3 w-3 mr-0.5" />
                          Expira {new Date(addon.expiresAt).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
                        </>
                      ) : (
                        'Permanent'
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upgrade section - hidden when plan override is active */}
      {!status.planOverride && (status.plan !== 'ENTERPRISE' || !status.subscriptionId) && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              <h3 className="text-base font-bold text-gray-900">Upgrade plan</h3>
            </div>

            {/* Billing interval toggle */}
            <div className="flex items-center gap-2 rounded-full bg-gray-100 p-1">
              <button
                onClick={() => setInterval('monthly')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  interval === 'monthly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Lunar
              </button>
              <button
                onClick={() => setInterval('annual')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  interval === 'annual'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Anual (-20%)
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <UpgradeCard
              plan="STARTER"
              interval={interval}
              onSelect={handleUpgrade}
              currentPlan={status.plan}
              displayPrices={status.displayPrices}
            />
            <UpgradeCard
              plan="PROFESSIONAL"
              interval={interval}
              onSelect={handleUpgrade}
              currentPlan={status.plan}
              displayPrices={status.displayPrices}
            />
            <UpgradeCard
              plan="ENTERPRISE"
              interval={interval}
              onSelect={handleUpgrade}
              currentPlan={status.plan}
              displayPrices={status.displayPrices}
            />
          </div>
        </div>
      )}

      {/* Plan comparison table */}
      <PlanComparisonTable currentPlan={status.plan} />

      {/* Already on a paid plan with Stripe - manage via Stripe portal */}
      {!status.planOverride && status.plan !== 'FREE' && status.subscriptionId && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-600">
          <p>
            Pentru a schimba planul, actualiza metoda de plata sau anula abonamentul, foloseste{' '}
            <button
              onClick={handleManageSubscription}
              disabled={actionLoading}
              className="font-semibold text-blue-600 hover:text-blue-800"
            >
              portalul de facturare
            </button>
            .
          </p>
        </div>
      )}

      {/* Paid plan but no Stripe subscription - explain */}
      {!status.planOverride && status.plan !== 'FREE' && !status.subscriptionId && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center text-sm text-blue-700">
          <p>
            Planul curent a fost activat manual. Alege un plan de mai sus pentru a activa facturarea automata si gestionarea abonamentului.
          </p>
        </div>
      )}
    </div>
  );
}

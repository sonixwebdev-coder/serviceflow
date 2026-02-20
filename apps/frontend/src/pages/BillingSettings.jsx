import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import useToast from '../context/useToast';
import { getBillingStatus, createCheckoutSession, createPortalSession } from '../services/billingService';

const PLAN_NAMES = {
  FREE: 'Gratuit',
  STARTER: 'Starter',
  PROFESSIONAL: 'Profesional',
  ENTERPRISE: 'Enterprise',
};

const PLAN_PRICES = {
  STARTER: { monthly: 99, annual: 79 },
  PROFESSIONAL: { monthly: 249, annual: 199 },
  ENTERPRISE: { monthly: 499, annual: 399 },
};

const STATUS_LABELS = {
  ACTIVE: { label: 'Activ', color: 'bg-green-100 text-green-700' },
  TRIAL: { label: 'Perioada de proba', color: 'bg-blue-100 text-blue-700' },
  SUSPENDED: { label: 'Suspendat', color: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Anulat', color: 'bg-gray-100 text-gray-700' },
};

function UsageMeter({ label, icon: Icon, current, max }) {
  const isUnlimited = max === -1 || max >= 999999;
  const percentage = isUnlimited ? 0 : Math.min((current / max) * 100, 100);
  const isNearLimit = percentage >= 80;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <span className="text-sm text-gray-500">
          {current} / {isUnlimited ? 'Nelimitat' : max}
        </span>
      </div>
      {!isUnlimited && (
        <div className="mt-2 h-2 rounded-full bg-gray-100">
          <div
            className={`h-2 rounded-full transition-all ${
              isNearLimit ? 'bg-orange-500' : 'bg-blue-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

function UpgradeCard({ plan, interval, onSelect, currentPlan }) {
  const prices = PLAN_PRICES[plan];
  if (!prices) return null;

  const price = interval === 'annual' ? prices.annual : prices.monthly;
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
      <button
        onClick={() => onSelect(plan)}
        disabled={isCurrentPlan}
        className={`mt-3 w-full rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
          isCurrentPlan
            ? 'cursor-default bg-gray-100 text-gray-400'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isCurrentPlan ? 'Plan curent' : 'Upgrade'}
      </button>
    </div>
  );
}

export default function BillingSettings() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [interval, setInterval] = useState('monthly');
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const data = await getBillingStatus();
      setStatus(data);
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

  useEffect(() => {
    fetchStatus();
  }, []);

  // Show success toast if redirected from Stripe Checkout
  useEffect(() => {
    if (searchParams.get('billing') === 'success') {
      showToast({
        title: 'Abonament activat',
        description: 'Planul tau a fost actualizat cu succes.',
        type: 'success',
      });
      // Re-fetch after a small delay to allow webhook processing
      const timer = setTimeout(fetchStatus, 2000);
      return () => clearTimeout(timer);
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

          {/* Manage subscription button — only when there's an active Stripe subscription */}
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

      {/* Usage meters */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Utilizare</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {status.usage && (
            <>
              <UsageMeter
                label="Utilizatori"
                icon={Users}
                current={status.usage.users?.current || 0}
                max={status.usage.users?.max || 5}
              />
              <UsageMeter
                label="Clienti"
                icon={UserCircle}
                current={status.usage.clients?.current || 0}
                max={status.usage.clients?.max || 100}
              />
              <UsageMeter
                label="Programari"
                icon={CalendarDays}
                current={status.usage.appointments?.current || 0}
                max={status.usage.appointments?.max || 500}
              />
            </>
          )}
        </div>
      </div>

      {/* Upgrade section — show if not Enterprise OR if no Stripe subscription (manually assigned plan) */}
      {(status.plan !== 'ENTERPRISE' || !status.subscriptionId) && (
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
            />
            <UpgradeCard
              plan="PROFESSIONAL"
              interval={interval}
              onSelect={handleUpgrade}
              currentPlan={status.plan}
            />
            <UpgradeCard
              plan="ENTERPRISE"
              interval={interval}
              onSelect={handleUpgrade}
              currentPlan={status.plan}
            />
          </div>
        </div>
      )}

      {/* Already on a paid plan with Stripe — manage via Stripe portal */}
      {status.plan !== 'FREE' && status.subscriptionId && (
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

      {/* Paid plan but no Stripe subscription — explain */}
      {status.plan !== 'FREE' && !status.subscriptionId && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center text-sm text-blue-700">
          <p>
            Planul curent a fost activat manual. Alege un plan de mai sus pentru a activa facturarea automata si gestionarea abonamentului.
          </p>
        </div>
      )}
    </div>
  );
}

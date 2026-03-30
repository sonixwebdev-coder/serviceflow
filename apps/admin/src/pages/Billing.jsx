import { useState, useEffect, useRef } from 'react';
import {
  Banknote, CreditCard, Clock, TrendingDown, AlertTriangle,
  MoreHorizontal, CalendarPlus, RefreshCw, XCircle, ArrowUpCircle,
  Undo2, ShieldOff,
} from 'lucide-react';
import {
  useBillingOverview, useSubscriptions, useBillingStats,
  useExtendTrial, useOverridePlan, useProcessRefund,
  useCancelSubscription, useReactivateOrg,
} from '@/hooks/useBilling';
import { useRevokeOverride } from '@/hooks/useOrganizations';

const TABS = [
  { key: 'overview', label: 'Prezentare generala' },
  { key: 'subscriptions', label: 'Abonamente' },
  { key: 'expiring', label: 'Perioade de proba' },
  { key: 'failed', label: 'Plati esuate' },
];

const STATUS_LABELS = {
  ACTIVE: 'Activ', TRIAL: 'Perioada de proba', SUSPENDED: 'Suspendat',
  CANCELLED: 'Anulat', PAYMENT_REQUIRED: 'Plata necesara',
};

const STATUS_STYLES = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  TRIAL: 'bg-blue-50 text-blue-700 border-blue-200',
  SUSPENDED: 'bg-red-50 text-red-700 border-red-200',
  CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200',
  PAYMENT_REQUIRED: 'bg-orange-50 text-orange-700 border-orange-200',
};

export default function Billing() {
  const [tab, setTab] = useState('overview');

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100/80 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'subscriptions' && <SubscriptionsTab />}
      {tab === 'expiring' && <ExpiringTrialsTab />}
      {tab === 'failed' && <FailedPaymentsTab />}
    </div>
  );
}

// ─── Overview Tab ───────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: overview } = useBillingOverview();
  const { data: stats } = useBillingStats();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard icon={Banknote} label="MRR" tooltip="Venit Lunar Recurent" value={overview ? `${overview.mrr.toLocaleString('ro-RO')} RON` : '-'} color="emerald" />
        <SummaryCard icon={CreditCard} label="Abonamente active" value={overview?.activeSubscriptions ?? '-'} color="blue" />
        <SummaryCard icon={Clock} label="Perioade de proba" value={overview?.trials ?? '-'} color="amber" />
        <SummaryCard icon={AlertTriangle} label="Plata necesara" value={overview?.paymentRequired ?? '-'} color="orange" />
        <SummaryCard icon={TrendingDown} label="Anulate" value={overview?.churned ?? '-'} color="red" />
      </div>

      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Distributie pe status</h3>
            <div className="space-y-2.5">
              {Object.entries(stats.statusBreakdown || {}).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <StatusBadge status={status} />
                  <span className="text-sm font-bold tabular-nums text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Distributie pe plan</h3>
            <div className="space-y-2.5">
              {Object.entries(stats.planBreakdown || {}).map(([plan, count]) => (
                <div key={plan} className="flex items-center justify-between">
                  <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600">{plan}</span>
                  <span className="text-sm font-bold tabular-nums text-gray-900">{count}</span>
                </div>
              ))}
            </div>
            {stats.expiringTrials > 0 && (
              <p className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700">
                {stats.expiringTrials} perioade de proba expira in 7 zile
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Subscriptions Tab ──────────────────────────────────────────────────────

function SubscriptionsTab() {
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterInterval, setFilterInterval] = useState('');

  const params = { page, limit: 20 };
  if (filterStatus) params.status = filterStatus;
  if (filterPlan) params.plan = filterPlan;
  if (filterInterval) params.interval = filterInterval;

  const { data: subsData, isLoading } = useSubscriptions(params);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {[
          { value: filterStatus, setter: setFilterStatus, options: [['', 'Toate statusurile'], ['ACTIVE', 'Activ'], ['TRIAL', 'Perioada de proba'], ['PAYMENT_REQUIRED', 'Plata necesara'], ['SUSPENDED', 'Suspendat'], ['CANCELLED', 'Anulat']] },
          { value: filterPlan, setter: setFilterPlan, options: [['', 'Toate planurile'], ['FREE', 'Free'], ['STARTER', 'Starter'], ['PROFESSIONAL', 'Professional'], ['ENTERPRISE', 'Enterprise']] },
          { value: filterInterval, setter: setFilterInterval, options: [['', 'Toate intervalele'], ['month', 'Lunar'], ['year', 'Anual']] },
        ].map((filter, i) => (
          <select
            key={i}
            value={filter.value}
            onChange={(e) => { filter.setter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-700 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors"
          >
            {filter.options.map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        ))}
      </div>
      <OrgTable data={subsData} isLoading={isLoading} page={page} onPageChange={setPage} showActions />
    </div>
  );
}

// ─── Expiring Trials Tab ────────────────────────────────────────────────────

function ExpiringTrialsTab() {
  const [page, setPage] = useState(1);
  const { data: subsData, isLoading } = useSubscriptions({ page, limit: 20, status: 'TRIAL' });

  const filteredData = subsData ? {
    ...subsData,
    subscriptions: (subsData.subscriptions || []).filter((org) => {
      if (!org.trialEndsAt) return false;
      const daysLeft = Math.ceil((new Date(org.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24));
      return daysLeft <= 7 && daysLeft >= 0;
    }),
  } : null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Organizatii cu perioada de proba ce expira in urmatoarele 7 zile</p>
      <OrgTable data={filteredData} isLoading={isLoading} page={page} onPageChange={setPage} showActions showTrialInfo />
    </div>
  );
}

// ─── Failed Payments Tab ────────────────────────────────────────────────────

function FailedPaymentsTab() {
  const [page, setPage] = useState(1);
  const { data: prData, isLoading: prLoading } = useSubscriptions({ page, limit: 20, status: 'PAYMENT_REQUIRED' });
  const { data: suspData, isLoading: suspLoading } = useSubscriptions({ page: 1, limit: 20, status: 'SUSPENDED' });

  const combined = {
    subscriptions: [...(prData?.subscriptions || []), ...(suspData?.subscriptions || [])],
    pagination: prData?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 },
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Organizatii cu plati esuate sau suspendate</p>
      <OrgTable data={combined} isLoading={prLoading || suspLoading} page={page} onPageChange={setPage} showActions />
    </div>
  );
}

// ─── Shared Components ──────────────────────────────────────────────────────

function OrgTable({ data, isLoading, page, onPageChange, showActions, showTrialInfo }) {
  const [actionOrgId, setActionOrgId] = useState(null);
  const tableRef = useRef(null);

  useEffect(() => {
    if (!actionOrgId) return;
    const handleClick = (e) => {
      if (tableRef.current && !tableRef.current.contains(e.target)) setActionOrgId(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [actionOrgId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!data?.subscriptions?.length) {
    return (
      <div className="rounded-2xl border border-gray-200/60 bg-white p-16 text-center">
        <CreditCard className="mx-auto mb-3 h-8 w-8 text-gray-300" />
        <p className="text-sm font-medium text-gray-500">Niciun rezultat gasit</p>
      </div>
    );
  }

  return (
    <div ref={tableRef} className="rounded-2xl border border-gray-200/60 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50 text-left">
              <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Organizatie</th>
              <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Plan</th>
              <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
              <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Interval</th>
              {showTrialInfo && <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Expira in</th>}
              <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Stripe</th>
              <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Suma</th>
              <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Data start</th>
              {showActions && <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Actiuni</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.subscriptions.map((org) => (
              <tr key={org.id} className="transition-colors hover:bg-gray-50/50">
                <td className="px-5 py-3.5">
                  <div className="font-medium text-gray-900">{org.name}</div>
                  <div className="text-[11px] text-gray-400 font-mono">/{org.slug}</div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600">{org.plan}</span>
                    {org.planOverride && (
                      <span className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">OVR</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3.5"><StatusBadge status={org.status} /></td>
                <td className="px-5 py-3.5 text-gray-500 text-xs">
                  {org.billingInterval === 'year' ? 'Anual' : org.billingInterval === 'month' ? 'Lunar' : org.stripe?.interval || '-'}
                </td>
                {showTrialInfo && (
                  <td className="px-5 py-3.5">
                    {org.trialEndsAt ? (
                      <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                        {Math.max(0, Math.ceil((new Date(org.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24)))} zile
                      </span>
                    ) : '-'}
                  </td>
                )}
                <td className="px-5 py-3.5 text-xs text-gray-500">{org.stripe?.status || (org.subscriptionId ? 'N/A' : '-')}</td>
                <td className="px-5 py-3.5 text-sm font-medium tabular-nums text-gray-900">
                  {org.stripe?.amount != null ? `${org.stripe.amount.toLocaleString('ro-RO')} RON` : '-'}
                </td>
                <td className="px-5 py-3.5 text-xs text-gray-500">
                  {org.subscriptionStartedAt
                    ? new Date(org.subscriptionStartedAt).toLocaleDateString('ro-RO')
                    : org.createdAt
                    ? new Date(org.createdAt).toLocaleDateString('ro-RO')
                    : '-'}
                </td>
                {showActions && (
                  <td className="px-5 py-3.5">
                    <div className="relative">
                      <button
                        onClick={() => setActionOrgId(actionOrgId === org.id ? null : org.id)}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {actionOrgId === org.id && (
                        <ActionMenu org={org} onClose={() => setActionOrgId(null)} />
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.pagination?.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
          <p className="text-xs text-gray-500">{data.pagination.total} rezultate</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors disabled:opacity-40 hover:bg-gray-50"
            >
              Inapoi
            </button>
            <span className="min-w-[60px] text-center text-xs tabular-nums text-gray-500">{page} / {data.pagination.totalPages}</span>
            <button
              onClick={() => onPageChange(Math.min(data.pagination.totalPages, page + 1))}
              disabled={page >= data.pagination.totalPages}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors disabled:opacity-40 hover:bg-gray-50"
            >
              Inainte
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionMenu({ org, onClose }) {
  const [trialDays, setTrialDays] = useState('');
  const [showTrialInput, setShowTrialInput] = useState(false);
  const extendTrial = useExtendTrial();
  const overridePlan = useOverridePlan();
  const processRefund = useProcessRefund();
  const cancelSubscription = useCancelSubscription();
  const reactivateOrg = useReactivateOrg();
  const revokeOverride = useRevokeOverride();

  const handleAction = async (action) => {
    try {
      switch (action) {
        case 'extend-trial': {
          const days = Number(trialDays) || 14;
          await extendTrial.mutateAsync({ orgId: org.id, days });
          break;
        }
        case 'override-pro':
          await overridePlan.mutateAsync({ orgId: org.id, plan: 'PROFESSIONAL', reason: 'Admin override' });
          break;
        case 'override-enterprise':
          await overridePlan.mutateAsync({ orgId: org.id, plan: 'ENTERPRISE', reason: 'Admin override' });
          break;
        case 'revoke-override':
          if (!window.confirm('Sigur doresti sa revoci override-ul?')) return;
          await revokeOverride.mutateAsync({ id: org.id });
          break;
        case 'refund':
          if (!window.confirm('Sigur doresti sa procesezi rambursarea?')) return;
          await processRefund.mutateAsync({ orgId: org.id });
          break;
        case 'cancel':
          if (!window.confirm('Sigur doresti sa anulezi abonamentul?')) return;
          await cancelSubscription.mutateAsync({ orgId: org.id });
          break;
        case 'reactivate': {
          const days = Number(trialDays) || 14;
          await reactivateOrg.mutateAsync({ orgId: org.id, days });
          break;
        }
      }
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || 'Eroare la procesarea actiunii');
    }
    onClose();
  };

  return (
    <div className="animate-fade-in absolute right-0 bottom-full z-50 mb-1 w-60 rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl">
      {(org.status === 'TRIAL' || org.status === 'PAYMENT_REQUIRED') && (
        showTrialInput ? (
          <div className="px-3 py-2.5 space-y-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Numar de zile</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
                placeholder="14"
                min="1"
                max="365"
                className="w-20 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                autoFocus
              />
              <button
                onClick={() => handleAction('extend-trial')}
                className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-primary-700 transition-colors"
              >
                Extinde
              </button>
            </div>
          </div>
        ) : (
          <ActionItem icon={CalendarPlus} label="Extinde perioada de proba" onClick={() => setShowTrialInput(true)} />
        )
      )}
      {org.status === 'PAYMENT_REQUIRED' && (
        <ActionItem icon={RefreshCw} label="Reactiveaza (14 zile proba)" onClick={() => handleAction('reactivate')} />
      )}
      {org.planOverride && (
        <ActionItem icon={ShieldOff} label="Revocare override plan" onClick={() => handleAction('revoke-override')} className="text-orange-600" />
      )}
      {!org.planOverride && (
        <>
          <ActionItem icon={ArrowUpCircle} label="Override → Professional" onClick={() => handleAction('override-pro')} />
          <ActionItem icon={ArrowUpCircle} label="Override → Enterprise" onClick={() => handleAction('override-enterprise')} />
        </>
      )}
      {org.subscriptionId && org.billingInterval === 'year' && (
        <ActionItem icon={Undo2} label="Rambursare (plan anual)" onClick={() => handleAction('refund')} className="text-orange-600" />
      )}
      {org.subscriptionId && (
        <>
          <div className="my-1 border-t border-gray-100" />
          <ActionItem icon={XCircle} label="Anuleaza abonamentul" onClick={() => handleAction('cancel')} className="text-red-600" />
        </>
      )}
    </div>
  );
}

function ActionItem({ icon: Icon, label, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 transition-colors hover:bg-gray-50 ${className}`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </button>
  );
}

function SummaryCard({ icon: Icon, label, value, color, tooltip }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className="rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[13px] text-gray-500" title={tooltip}>{label}</p>
          <p className="text-xl font-bold tabular-nums text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[status] || STATUS_STYLES.ACTIVE}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

import { useState } from 'react';
import {
  Banknote,
  CreditCard,
  Clock,
  TrendingDown,
  AlertTriangle,
  MoreHorizontal,
  CalendarPlus,
  RefreshCw,
  XCircle,
  ArrowUpCircle,
  Undo2,
} from 'lucide-react';
import {
  useBillingOverview,
  useSubscriptions,
  useBillingStats,
  useExtendTrial,
  useOverridePlan,
  useProcessRefund,
  useCancelSubscription,
  useReactivateOrg,
} from '@/hooks/useBilling';

const TABS = [
  { key: 'overview', label: 'Prezentare generala' },
  { key: 'subscriptions', label: 'Abonamente' },
  { key: 'expiring', label: 'Perioade de proba' },
  { key: 'failed', label: 'Plati esuate' },
];

const STATUS_LABELS = {
  ACTIVE: 'Activ',
  TRIAL: 'Perioada de proba',
  SUSPENDED: 'Suspendat',
  CANCELLED: 'Anulat',
  PAYMENT_REQUIRED: 'Plata necesara',
};

const STATUS_STYLES = {
  ACTIVE: 'bg-green-100 text-green-700',
  TRIAL: 'bg-blue-100 text-blue-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-700',
  PAYMENT_REQUIRED: 'bg-orange-100 text-orange-700',
};

export default function Billing() {
  const [tab, setTab] = useState('overview');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Facturare</h1>
        <p className="text-sm text-gray-500">Abonamente, venituri si gestionare plati</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
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

// ─── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: overview } = useBillingOverview();
  const { data: stats } = useBillingStats();

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard
          icon={Banknote}
          label="MRR"
          tooltip="Venit Lunar Recurent"
          value={overview ? `${overview.mrr.toLocaleString('ro-RO')} RON` : '...'}
          color="bg-green-50 text-green-600"
        />
        <SummaryCard
          icon={CreditCard}
          label="Abonamente active"
          value={overview?.activeSubscriptions ?? '...'}
          color="bg-blue-50 text-blue-600"
        />
        <SummaryCard
          icon={Clock}
          label="Perioade de proba"
          value={overview?.trials ?? '...'}
          color="bg-amber-50 text-amber-600"
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Plata necesara"
          value={overview?.paymentRequired ?? '...'}
          color="bg-orange-50 text-orange-600"
        />
        <SummaryCard
          icon={TrendingDown}
          label="Anulate"
          value={overview?.churned ?? '...'}
          color="bg-red-50 text-red-600"
        />
      </div>

      {/* Stats breakdown */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Distributie pe status</h3>
            <div className="space-y-2">
              {Object.entries(stats.statusBreakdown || {}).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <StatusBadge status={status} />
                  <span className="font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Distributie pe plan</h3>
            <div className="space-y-2">
              {Object.entries(stats.planBreakdown || {}).map(([plan, count]) => (
                <div key={plan} className="flex items-center justify-between text-sm">
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">{plan}</span>
                  <span className="font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
            {stats.expiringTrials > 0 && (
              <p className="mt-3 text-xs text-amber-600 font-medium">
                {stats.expiringTrials} perioade de proba expira in 7 zile
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Subscriptions Tab ─────────────────────────────────────────────────────────

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
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="">Toate statusurile</option>
          <option value="ACTIVE">Activ</option>
          <option value="TRIAL">Perioada de proba</option>
          <option value="PAYMENT_REQUIRED">Plata necesara</option>
          <option value="SUSPENDED">Suspendat</option>
          <option value="CANCELLED">Anulat</option>
        </select>
        <select
          value={filterPlan}
          onChange={(e) => { setFilterPlan(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="">Toate planurile</option>
          <option value="FREE">Free</option>
          <option value="STARTER">Starter</option>
          <option value="PROFESSIONAL">Professional</option>
          <option value="ENTERPRISE">Enterprise</option>
        </select>
        <select
          value={filterInterval}
          onChange={(e) => { setFilterInterval(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="">Toate intervalele</option>
          <option value="month">Lunar</option>
          <option value="year">Anual</option>
        </select>
      </div>

      <OrgTable
        data={subsData}
        isLoading={isLoading}
        page={page}
        onPageChange={setPage}
        showActions
      />
    </div>
  );
}

// ─── Expiring Trials Tab ───────────────────────────────────────────────────────

function ExpiringTrialsTab() {
  const [page, setPage] = useState(1);
  const { data: subsData, isLoading } = useSubscriptions({ page, limit: 20, status: 'TRIAL' });

  // Filter to those expiring within 7 days
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
      <OrgTable
        data={filteredData}
        isLoading={isLoading}
        page={page}
        onPageChange={setPage}
        showActions
        showTrialInfo
      />
    </div>
  );
}

// ─── Failed Payments Tab ───────────────────────────────────────────────────────

function FailedPaymentsTab() {
  const [page, setPage] = useState(1);
  const { data: prData, isLoading: prLoading } = useSubscriptions({ page, limit: 20, status: 'PAYMENT_REQUIRED' });
  const { data: suspData, isLoading: suspLoading } = useSubscriptions({ page: 1, limit: 20, status: 'SUSPENDED' });

  const combined = {
    subscriptions: [
      ...(prData?.subscriptions || []),
      ...(suspData?.subscriptions || []),
    ],
    pagination: prData?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 },
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Organizatii cu plati esuate sau suspendate</p>
      <OrgTable
        data={combined}
        isLoading={prLoading || suspLoading}
        page={page}
        onPageChange={setPage}
        showActions
      />
    </div>
  );
}

// ─── Shared Components ─────────────────────────────────────────────────────────

function OrgTable({ data, isLoading, page, onPageChange, showActions, showTrialInfo }) {
  const [actionOrgId, setActionOrgId] = useState(null);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12 text-sm text-gray-400">Se incarca...</div>;
  }

  if (!data?.subscriptions?.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-400">
        Niciun rezultat gasit
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500">
              <th className="px-4 py-3 font-medium">Organizatie</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Interval</th>
              {showTrialInfo && <th className="px-4 py-3 font-medium">Expira in</th>}
              <th className="px-4 py-3 font-medium">Stripe</th>
              <th className="px-4 py-3 font-medium">Suma</th>
              <th className="px-4 py-3 font-medium">Data start</th>
              {showActions && <th className="px-4 py-3 font-medium">Actiuni</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.subscriptions.map((org) => (
              <tr key={org.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{org.name}</div>
                  <div className="text-xs text-gray-400">{org.slug}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {org.plan}
                  </span>
                  {org.planOverride && (
                    <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-600">
                      Override
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={org.status} />
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {org.billingInterval === 'year' ? 'Anual' : org.billingInterval === 'month' ? 'Lunar' : org.stripe?.interval || 'N/A'}
                </td>
                {showTrialInfo && (
                  <td className="px-4 py-3">
                    {org.trialEndsAt ? (
                      <span className="text-amber-600 font-medium">
                        {Math.max(0, Math.ceil((new Date(org.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24)))} zile
                      </span>
                    ) : 'N/A'}
                  </td>
                )}
                <td className="px-4 py-3 text-gray-500">
                  {org.stripe?.status || (org.subscriptionId ? 'N/A' : '-')}
                </td>
                <td className="px-4 py-3 text-gray-900 font-medium">
                  {org.stripe?.amount != null ? `${org.stripe.amount.toLocaleString('ro-RO')} RON` : '-'}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {org.subscriptionStartedAt
                    ? new Date(org.subscriptionStartedAt).toLocaleDateString('ro-RO')
                    : org.createdAt
                    ? new Date(org.createdAt).toLocaleDateString('ro-RO')
                    : 'N/A'}
                </td>
                {showActions && (
                  <td className="px-4 py-3">
                    <div className="relative">
                      <button
                        onClick={() => setActionOrgId(actionOrgId === org.id ? null : org.id)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
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
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
          <p className="text-xs text-gray-500">{data.pagination.total} rezultate</p>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium disabled:opacity-50 hover:bg-gray-50"
            >
              Inapoi
            </button>
            <span className="flex items-center text-xs text-gray-500">
              {page} / {data.pagination.totalPages}
            </span>
            <button
              onClick={() => onPageChange(Math.min(data.pagination.totalPages, page + 1))}
              disabled={page >= data.pagination.totalPages}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium disabled:opacity-50 hover:bg-gray-50"
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
  const extendTrial = useExtendTrial();
  const overridePlan = useOverridePlan();
  const processRefund = useProcessRefund();
  const cancelSubscription = useCancelSubscription();
  const reactivateOrg = useReactivateOrg();

  const handleAction = async (action) => {
    try {
      switch (action) {
        case 'extend-trial':
          await extendTrial.mutateAsync({ orgId: org.id, days: 14 });
          break;
        case 'override-pro':
          await overridePlan.mutateAsync({ orgId: org.id, plan: 'PROFESSIONAL', reason: 'Admin override' });
          break;
        case 'override-enterprise':
          await overridePlan.mutateAsync({ orgId: org.id, plan: 'ENTERPRISE', reason: 'Admin override' });
          break;
        case 'refund':
          if (!window.confirm('Sigur doresti sa procesezi rambursarea?')) return;
          await processRefund.mutateAsync({ orgId: org.id });
          break;
        case 'cancel':
          if (!window.confirm('Sigur doresti sa anulezi abonamentul?')) return;
          await cancelSubscription.mutateAsync({ orgId: org.id });
          break;
        case 'reactivate':
          await reactivateOrg.mutateAsync({ orgId: org.id, days: 14 });
          break;
      }
    } catch (err) {
      alert(err?.message || 'Eroare la procesarea actiunii');
    }
    onClose();
  };

  return (
    <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
      {(org.status === 'TRIAL' || org.status === 'PAYMENT_REQUIRED') && (
        <ActionItem icon={CalendarPlus} label="Extinde proba (+14 zile)" onClick={() => handleAction('extend-trial')} />
      )}
      {org.status === 'PAYMENT_REQUIRED' && (
        <ActionItem icon={RefreshCw} label="Reactiveaza (14 zile proba)" onClick={() => handleAction('reactivate')} />
      )}
      <ActionItem icon={ArrowUpCircle} label="Override → Professional" onClick={() => handleAction('override-pro')} />
      <ActionItem icon={ArrowUpCircle} label="Override → Enterprise" onClick={() => handleAction('override-enterprise')} />
      {org.subscriptionId && org.billingInterval === 'year' && (
        <ActionItem icon={Undo2} label="Rambursare (plan anual)" onClick={() => handleAction('refund')} className="text-orange-600" />
      )}
      {org.subscriptionId && (
        <ActionItem icon={XCircle} label="Anuleaza abonamentul" onClick={() => handleAction('cancel')} className="text-red-600" />
      )}
    </div>
  );
}

function ActionItem({ icon: Icon, label, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 ${className}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function SummaryCard({ icon: Icon, label, value, color, tooltip }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2.5 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-gray-500" title={tooltip}>{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] || STATUS_STYLES.ACTIVE}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

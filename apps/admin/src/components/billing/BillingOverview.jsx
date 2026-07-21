import { AlertTriangle, Banknote, Clock, CreditCard, TrendingDown } from 'lucide-react';
import { useBillingOverview, useBillingStats } from '@/hooks/useBilling';
import { STATUS_LABELS, STATUS_STYLES } from './billingConstants';

export function BillingOverview() {
  const { data: overview } = useBillingOverview();
  const { data: stats } = useBillingStats();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard
          icon={Banknote}
          label="MRR"
          tooltip="Venit Lunar Recurent"
          value={overview ? `${overview.mrr.toLocaleString('ro-RO')} RON` : '-'}
          color="emerald"
        />
        <SummaryCard
          icon={CreditCard}
          label="Abonamente active"
          value={overview?.activeSubscriptions ?? '-'}
          color="blue"
        />
        <SummaryCard
          icon={Clock}
          label="Perioade de proba"
          value={overview?.trials ?? '-'}
          color="amber"
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Plata necesara"
          value={overview?.paymentRequired ?? '-'}
          color="orange"
        />
        <SummaryCard
          icon={TrendingDown}
          label="Anulate"
          value={overview?.churned ?? '-'}
          color="red"
        />
      </div>

      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200/60 bg-white p-5 shadow-xs">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Distributie pe status</h3>
            <div className="space-y-2.5">
              {Object.entries(stats.statusBreakdown || {}).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <BillingStatus status={status} />
                  <span className="text-sm font-bold tabular-nums text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200/60 bg-white p-5 shadow-xs">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Distributie pe plan</h3>
            <div className="space-y-2.5">
              {Object.entries(stats.planBreakdown || {}).map(([plan, count]) => (
                <div key={plan} className="flex items-center justify-between">
                  <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                    {plan}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-gray-900">{count}</span>
                </div>
              ))}
            </div>
            {stats.expiringTrials > 0 && (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                {stats.expiringTrials} perioade de proba expira in 7 zile
              </p>
            )}
          </div>
        </div>
      )}
    </div>
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
    <div className="rounded-2xl border border-gray-200/60 bg-white p-5 shadow-xs">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[13px] text-gray-500" title={tooltip}>
            {label}
          </p>
          <p className="text-xl font-bold tabular-nums text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function BillingStatus({ status }) {
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[status] || STATUS_STYLES.ACTIVE}`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

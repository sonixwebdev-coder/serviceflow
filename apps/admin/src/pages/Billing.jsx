import { useState } from 'react';
import { DollarSign, CreditCard, Clock, TrendingDown } from 'lucide-react';
import { useBillingOverview, useSubscriptions } from '@/hooks/useBilling';

export default function Billing() {
  const { data: overview } = useBillingOverview();
  const [page, setPage] = useState(1);
  const { data: subsData, isLoading } = useSubscriptions({ page, limit: 20 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-500">Abonamente si venituri recurente</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={DollarSign}
          label="MRR"
          value={overview ? `${overview.mrr.toLocaleString('ro-RO')} RON` : '...'}
          color="bg-green-50 text-green-600"
        />
        <SummaryCard
          icon={CreditCard}
          label="Abonamente Active"
          value={overview?.activeSubscriptions ?? '...'}
          color="bg-blue-50 text-blue-600"
        />
        <SummaryCard
          icon={Clock}
          label="Trials"
          value={overview?.trials ?? '...'}
          color="bg-amber-50 text-amber-600"
        />
        <SummaryCard
          icon={TrendingDown}
          label="Churned"
          value={overview?.churned ?? '...'}
          color="bg-red-50 text-red-600"
        />
      </div>

      {/* Subscriptions table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Abonamente</h3>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-400">Se incarca...</div>
        ) : !subsData?.subscriptions?.length ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-400">
            Niciun abonament gasit
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500">
                    <th className="px-4 py-3 font-medium">Organizatie</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Status Org</th>
                    <th className="px-4 py-3 font-medium">Stripe Status</th>
                    <th className="px-4 py-3 font-medium">Interval</th>
                    <th className="px-4 py-3 font-medium">Suma</th>
                    <th className="px-4 py-3 font-medium">Urmatoarea factura</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {subsData.subscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{sub.name}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          {sub.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={sub.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {sub.stripe?.status || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {sub.stripe?.interval || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium">
                        {sub.stripe?.amount != null ? `${sub.stripe.amount.toLocaleString('ro-RO')} RON` : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {sub.stripe?.currentPeriodEnd
                          ? new Date(sub.stripe.currentPeriodEnd).toLocaleDateString('ro-RO')
                          : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {subsData.pagination?.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                <p className="text-xs text-gray-500">{subsData.pagination.total} rezultate</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium disabled:opacity-50 hover:bg-gray-50"
                  >
                    Inapoi
                  </button>
                  <span className="flex items-center text-xs text-gray-500">
                    {page} / {subsData.pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(subsData.pagination.totalPages, p + 1))}
                    disabled={page >= subsData.pagination.totalPages}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium disabled:opacity-50 hover:bg-gray-50"
                  >
                    Inainte
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2.5 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    ACTIVE: 'bg-green-100 text-green-700',
    TRIAL: 'bg-blue-100 text-blue-700',
    SUSPENDED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || styles.ACTIVE}`}>
      {status}
    </span>
  );
}

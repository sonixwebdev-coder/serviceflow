import { useState } from 'react';
import { Gift, Users, TrendingUp, Search, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useLoyaltyAnalytics, useLoyaltyTransactions } from '../hooks/useLoyalty';
import { lookupByQR } from '../services/loyaltyService';
import TierBadge from '../components/loyalty/TierBadge';
import useToast from '../context/useToast';

const TRANSACTION_TYPE_LABELS = {
  EARN_PAYMENT: 'Plata',
  EARN_REFERRAL: 'Referral',
  EARN_MANUAL: 'Manual (+)',
  REDEEM_DISCOUNT: 'Reducere',
  REDEEM_REWARD: 'Recompensa',
  EXPIRE: 'Expirat',
  DEDUCT_MANUAL: 'Manual (-)',
};

export default function LoyaltyDashboard() {
  const [txPage, setTxPage] = useState(1);
  const [qrInput, setQrInput] = useState('');
  const [qrResult, setQrResult] = useState(null);

  const { data: analyticsData } = useLoyaltyAnalytics();
  const { data: txData, isLoading: txLoading } = useLoyaltyTransactions({
    page: txPage,
    limit: 15,
  });
  const { showToast } = useToast();

  const analytics = analyticsData?.data || analyticsData;
  const transactions = txData?.data || txData;

  const handleQRLookup = async () => {
    if (!qrInput.trim()) return;
    try {
      const result = await lookupByQR(qrInput.trim());
      const client = result?.data || result;
      setQrResult(client);
      if (!client) showToast({ title: 'Client negasit', type: 'warning' });
    } catch {
      showToast({ title: 'Eroare la cautare', type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fidelitate</h1>
        <p className="text-sm text-gray-500 mt-1">Panoul de control al programului de fidelitate</p>
      </div>

      {/* Summary Cards */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-100 p-2.5">
                <Users size={20} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Conturi active</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalAccounts}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2.5">
                <Gift size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Puncte in circulatie</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.pointsInCirculation?.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2.5">
                <TrendingUp size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Puncte totale emise</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.totalLifetimePoints?.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2.5">
                <Users size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Recomandari</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalReferrals}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tier Distribution */}
        {analytics?.tierDistribution && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Distributie niveluri</h3>
            <div className="space-y-3">
              {['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'].map((tier) => {
                const item = analytics.tierDistribution.find((t) => t.tier === tier);
                const count = item?.count || 0;
                const pct =
                  analytics.totalAccounts > 0
                    ? Math.round((count / analytics.totalAccounts) * 100)
                    : 0;
                return (
                  <div key={tier} className="flex items-center gap-3">
                    <TierBadge tier={tier} />
                    <div className="flex-1">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-700 w-12 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* QR Lookup */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Cautare client</h3>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQRLookup()}
              placeholder="ID client sau serie card..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <button
              onClick={handleQRLookup}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700"
            >
              <Search size={16} />
            </button>
          </div>
          {qrResult && (
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="font-medium text-gray-900">
                {qrResult.firstName} {qrResult.lastName}
              </p>
              {qrResult.loyaltyAccount && (
                <div className="flex items-center gap-2 mt-2">
                  <TierBadge tier={qrResult.loyaltyAccount.currentTier} />
                  <span className="text-sm text-gray-600">
                    {qrResult.loyaltyAccount.currentPoints} puncte
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Top Referrers */}
        {analytics?.topReferrers?.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Top recomandatori</h3>
            <div className="space-y-2">
              {analytics.topReferrers.slice(0, 5).map((r, i) => (
                <div key={r.clientId} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 w-5">{i + 1}.</span>
                    <span className="text-sm font-medium text-gray-900">
                      {r.clientName || 'Client'}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-indigo-600">
                    {r.referralCount} ref.
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="p-6 pb-4">
          <h3 className="text-base font-semibold text-gray-900">Tranzactii recente</h3>
        </div>
        {txLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-gray-100 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tip
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Puncte
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Sold
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Descriere
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Data
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions?.items?.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-900">
                      {tx.account?.client
                        ? `${tx.account.client.firstName || ''} ${tx.account.client.lastName || ''}`.trim()
                        : '-'}
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-xs font-medium text-gray-600">
                        {TRANSACTION_TYPE_LABELS[tx.type] || tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-0.5 font-semibold ${
                          tx.points > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {tx.points > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {tx.points > 0 ? '+' : ''}
                        {tx.points}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-gray-700">{tx.balanceAfter}</td>
                    <td className="px-6 py-3 text-gray-500 max-w-xs truncate">{tx.description}</td>
                    <td className="px-6 py-3 text-gray-500">
                      {new Date(tx.createdAt).toLocaleDateString('ro-RO')}
                    </td>
                  </tr>
                ))}
                {(!transactions?.items || transactions.items.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Nicio tranzactie gasita
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {transactions?.pagination?.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
            <button
              onClick={() => setTxPage((p) => Math.max(1, p - 1))}
              disabled={txPage === 1}
              className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              Inapoi
            </button>
            <span className="text-sm text-gray-500">
              Pagina {txPage} din {transactions.pagination.pages}
            </span>
            <button
              onClick={() => setTxPage((p) => Math.min(transactions.pagination.pages, p + 1))}
              disabled={txPage === transactions.pagination.pages}
              className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              Inainte
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

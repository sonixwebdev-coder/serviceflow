import { TrendingUp, TrendingDown, Minus, CreditCard, Hash } from 'lucide-react';
import { RevenueCardSkeleton } from './Skeleton';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
};

export default function PaymentCard({ data, isLoading }) {
  if (isLoading) {
    return <RevenueCardSkeleton />;
  }

  const {
    totalAmount = 0,
    totalPayments = 0,
    previousPeriodAmount = 0,
    changePercent = null,
  } = data || {};

  const getTrendIcon = () => {
    if (changePercent === null || changePercent === undefined) return null;
    if (changePercent > 0) return <TrendingUp className="h-4 w-4" />;
    if (changePercent < 0) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (changePercent === null || changePercent === undefined) return 'text-gray-500 bg-gray-100';
    if (changePercent > 0) return 'text-green-700 bg-green-100';
    if (changePercent < 0) return 'text-red-700 bg-red-100';
    return 'text-gray-500 bg-gray-100';
  };

  const progressPercent =
    previousPeriodAmount > 0
      ? Math.min((totalAmount / previousPeriodAmount) * 100, 150)
      : totalAmount > 0
        ? 100
        : 0;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-5 relative overflow-hidden h-full">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/50 rounded-full -mr-16 -mt-16"></div>

      <div className="relative">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-800">Plati perioada selectata</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-xl">
            <CreditCard className="h-6 w-6 text-blue-600" />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          {changePercent !== null && changePercent !== undefined && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${getTrendColor()}`}
            >
              {getTrendIcon()}
              {changePercent > 0 ? '+' : ''}
              {changePercent.toFixed(1)}%
            </span>
          )}
          <span className="text-sm text-gray-600">vs. perioada anterioara</span>
        </div>

        {previousPeriodAmount > 0 && (
          <div className="mb-3">
            <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progressPercent >= 100 ? 'bg-blue-500' : 'bg-blue-400'
                }`}
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-blue-200">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white rounded-lg">
              <Hash className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Numar plati</p>
              <p className="text-sm font-semibold text-gray-900">{totalPayments}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <span>Anterior:</span>
            <span className="font-medium text-gray-700">
              {formatCurrency(previousPeriodAmount)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

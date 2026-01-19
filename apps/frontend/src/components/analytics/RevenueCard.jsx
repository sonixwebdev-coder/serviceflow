import { TrendingUp, TrendingDown, Minus, DollarSign, FileText } from 'lucide-react';
import { RevenueCardSkeleton } from './Skeleton';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
};

export default function RevenueCard({ data, dateRange, isLoading }) {
  if (isLoading) {
    return <RevenueCardSkeleton />;
  }

  const {
    totalRevenue = 0,
    totalInvoices = 0,
    previousPeriodRevenue = 0,
    revenueChange = null,
  } = data || {};

  const getTrendIcon = () => {
    if (revenueChange === null || revenueChange === undefined) return null;
    if (revenueChange > 0) return <TrendingUp className="h-4 w-4" />;
    if (revenueChange < 0) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (revenueChange === null || revenueChange === undefined) return 'text-gray-500 bg-gray-100';
    if (revenueChange > 0) return 'text-green-700 bg-green-100';
    if (revenueChange < 0) return 'text-red-700 bg-red-100';
    return 'text-gray-500 bg-gray-100';
  };

  // Calculate progress bar width (capped at 150%)
  const progressPercent = previousPeriodRevenue > 0
    ? Math.min((totalRevenue / previousPeriodRevenue) * 100, 150)
    : totalRevenue > 0 ? 100 : 0;

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-5 relative overflow-hidden h-full">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-green-100/50 rounded-full -mr-16 -mt-16"></div>

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">Venituri perioada selectata</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
          <div className="p-3 bg-green-100 rounded-xl">
            <DollarSign className="h-6 w-6 text-green-600" />
          </div>
        </div>

        {/* Change indicator */}
        <div className="flex items-center gap-2 mb-3">
          {revenueChange !== null && revenueChange !== undefined && (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${getTrendColor()}`}>
              {getTrendIcon()}
              {revenueChange > 0 ? '+' : ''}{revenueChange.toFixed(1)}%
            </span>
          )}
          <span className="text-sm text-gray-600">
            vs. perioada anterioara
          </span>
        </div>

        {/* Progress bar comparing to previous period */}
        {previousPeriodRevenue > 0 && (
          <div className="mb-3">
            <div className="h-2 bg-green-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progressPercent >= 100 ? 'bg-green-500' : 'bg-green-400'
                }`}
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Sub-metrics */}
        <div className="flex items-center justify-between pt-3 border-t border-green-200">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white rounded-lg">
              <FileText className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Facturi platite</p>
              <p className="text-sm font-semibold text-gray-900">{totalInvoices}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <span>Anterior:</span>
            <span className="font-medium text-gray-700">{formatCurrency(previousPeriodRevenue)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

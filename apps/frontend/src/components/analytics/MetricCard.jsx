import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MetricCardSkeleton } from './Skeleton';

export default function MetricCard({
  title,
  value,
  change,
  changeLabel,
  subtitle,
  icon: Icon,
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10',
  format = 'number',
  prefix = '',
  suffix = '',
  isLoading = false,
}) {
  if (isLoading) {
    return <MetricCardSkeleton />;
  }
  const formatValue = (val) => {
    if (format === 'currency') {
      return new Intl.NumberFormat('ro-RO', {
        style: 'currency',
        currency: 'RON',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(val);
    }
    if (format === 'percent') {
      return `${val}%`;
    }
    return new Intl.NumberFormat('ro-RO').format(val);
  };

  const getTrendIcon = () => {
    if (change === undefined || change === null) return null;
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getTrendColor = () => {
    if (change === undefined || change === null) return 'text-gray-500';
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="mt-1 sm:mt-2 text-xl sm:text-2xl font-bold text-gray-900 truncate">
            {prefix}
            {formatValue(value)}
            {suffix}
          </p>
          {change !== undefined && change !== null && (
            <div className="mt-2 flex items-center gap-1.5">
              {getTrendIcon()}
              <span className={`text-sm font-medium ${getTrendColor()}`}>
                {change > 0 ? '+' : ''}
                {change.toFixed(1)}%
              </span>
              {changeLabel && <span className="text-sm text-gray-500">{changeLabel}</span>}
            </div>
          )}
          {subtitle && <p className="mt-2 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-2 sm:p-3 rounded-lg ${iconBg} shrink-0`}>
            <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${iconColor}`} />
          </div>
        )}
      </div>
    </div>
  );
}

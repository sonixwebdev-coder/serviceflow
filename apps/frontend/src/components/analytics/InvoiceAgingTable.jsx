import { AlertCircle, Clock, AlertTriangle, XCircle } from 'lucide-react';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const getBucketConfig = (key) => {
  const configs = {
    current: {
      icon: Clock,
      color: 'text-gray-600',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
    },
    overdue30: {
      icon: AlertCircle,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
    },
    overdue60: {
      icon: AlertTriangle,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
    },
    overdue90: {
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
    },
    overdue90plus: {
      icon: XCircle,
      color: 'text-red-700',
      bg: 'bg-red-100',
      border: 'border-red-300',
    },
  };
  return configs[key] || configs.current;
};

export default function InvoiceAgingTable({ buckets = {}, summary = {}, isLoading }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-lg" />
        ))}
      </div>
    );
  }

  const bucketOrder = ['current', 'overdue30', 'overdue60', 'overdue90', 'overdue90plus'];

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-500">Total de incasat</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(summary.totalOutstanding || 0)}
          </p>
          <p className="text-sm text-gray-500">
            {summary.totalInvoices || 0} facturi
          </p>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <p className="text-sm text-red-600">Total restant</p>
          <p className="text-2xl font-bold text-red-700">
            {formatCurrency(summary.totalOverdue || 0)}
          </p>
          <p className="text-sm text-red-600">
            {summary.overdueInvoices || 0} facturi
          </p>
        </div>
      </div>

      {/* Buckets */}
      <div className="space-y-2">
        {bucketOrder.map((key) => {
          const bucket = buckets[key];
          if (!bucket) return null;

          const config = getBucketConfig(key);
          const Icon = config.icon;

          return (
            <div
              key={key}
              className={`flex items-center justify-between p-4 rounded-lg border ${config.bg} ${config.border}`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${config.color}`} />
                <div>
                  <p className={`font-medium ${config.color}`}>{bucket.label}</p>
                  <p className="text-sm text-gray-500">
                    {bucket.count} {bucket.count === 1 ? 'factura' : 'facturi'}
                  </p>
                </div>
              </div>
              <p className={`text-lg font-bold ${config.color}`}>
                {formatCurrency(bucket.total)}
              </p>
            </div>
          );
        })}
      </div>

      {/* No outstanding invoices message */}
      {(!summary.totalInvoices || summary.totalInvoices === 0) && (
        <div className="text-center py-8 text-gray-500">
          Nu exista facturi neincasate
        </div>
      )}
    </div>
  );
}

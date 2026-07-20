import { User, Building } from 'lucide-react';
import { ListSkeleton } from './Skeleton';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const getClientName = (client) => {
  if (!client) return 'Client necunoscut';
  if (client.type === 'SRL' && client.companyName) {
    return client.companyName;
  }
  return `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Client necunoscut';
};

export default function TopClientsTable({ data = [], isLoading }) {
  if (isLoading) {
    return <ListSkeleton rows={5} />;
  }

  if (!data.length) {
    return (
      <div className="text-center py-8 text-gray-500">Nu exista date pentru perioada selectata</div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {data.map((item, index) => (
        <div key={item.client?.id || index} className="flex items-center gap-4 py-3">
          {/* Rank */}
          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
            <span
              className={`text-lg font-bold ${
                index === 0
                  ? 'text-yellow-500'
                  : index === 1
                    ? 'text-gray-400'
                    : index === 2
                      ? 'text-amber-700'
                      : 'text-gray-500'
              }`}
            >
              {index + 1}
            </span>
          </div>

          {/* Client avatar */}
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              item.client?.type === 'SRL' ? 'bg-blue-100' : 'bg-primary/10'
            }`}
          >
            {item.client?.type === 'SRL' ? (
              <Building className="h-5 w-5 text-blue-600" />
            ) : (
              <User className="h-5 w-5 text-primary" />
            )}
          </div>

          {/* Client info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{getClientName(item.client)}</p>
            <p className="text-sm text-gray-500">
              {item.invoiceCount} {item.invoiceCount === 1 ? 'factura' : 'facturi'}
            </p>
          </div>

          {/* Revenue */}
          <div className="text-right">
            <p className="font-bold text-gray-900">{formatCurrency(item.revenue)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

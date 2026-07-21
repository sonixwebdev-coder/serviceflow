import { useMemo } from 'react';
import { MapPin, Users, Calendar, Banknote } from 'lucide-react';
import { useLocationComparison } from '../../hooks/useAnalytics';
import useLocationStore from '../../state/useLocationStore';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const MetricBar = ({ label, value, maxValue, color = 'orange' }) => {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  const colorClasses = {
    orange: 'bg-orange-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
  };

  return (
    <div className="flex items-center gap-3">
      <div className="w-20 text-xs text-gray-600 text-right truncate" title={label}>
        {label}
      </div>
      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} rounded-full transition-all duration-500`}
          style={{ width: `${Math.max(percentage, 2)}%` }}
        />
      </div>
      <div className="w-16 text-sm font-medium text-gray-900 text-right">
        {typeof value === 'number' && value > 1000 ? `${(value / 1000).toFixed(1)}k` : value}
      </div>
    </div>
  );
};

const LocationComparisonChart = ({ startDate, endDate }) => {
  const { currentLocationId } = useLocationStore();

  const { data, isLoading, error } = useLocationComparison(
    { startDate, endDate },
    { enabled: true }
  );

  const maxValues = useMemo(() => {
    if (!data?.locations?.length) return {};

    return {
      revenue: Math.max(...data.locations.map((l) => l.metrics.revenue || 0)),
      appointments: Math.max(...data.locations.map((l) => l.metrics.appointments.total || 0)),
      clients: Math.max(...data.locations.map((l) => l.metrics.clients.total || 0)),
      newClients: Math.max(...data.locations.map((l) => l.metrics.clients.new || 0)),
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-gray-200 rounded-sm" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-gray-100 rounded-sm" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-600">Eroare la incarcarea datelor: {error.message}</p>
      </div>
    );
  }

  if (!data?.locations?.length) {
    return null;
  }

  // Don't show if only one location
  if (data.locations.length <= 1) {
    return null;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-xs">
      <div className="border-b border-gray-200 px-6 py-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <MapPin className="h-5 w-5 text-orange-500" />
          Comparatie Locatii
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Performanta pe perioada {data.period?.startDate} - {data.period?.endDate}
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Revenue Comparison */}
        <div>
          <h4 className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <Banknote className="h-4 w-4 text-green-500" />
            Venituri
          </h4>
          <div className="space-y-2">
            {data.locations.map((loc) => (
              <MetricBar
                key={loc.location.id}
                label={loc.location.name}
                value={loc.metrics.revenue}
                maxValue={maxValues.revenue}
                color="green"
              />
            ))}
          </div>
          <div className="mt-2 text-right text-xs text-gray-500">
            Total: {formatCurrency(data.totals.revenue)}
          </div>
        </div>

        {/* Appointments Comparison */}
        <div>
          <h4 className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <Calendar className="h-4 w-4 text-blue-500" />
            Programari
          </h4>
          <div className="space-y-2">
            {data.locations.map((loc) => (
              <MetricBar
                key={loc.location.id}
                label={loc.location.name}
                value={loc.metrics.appointments.total}
                maxValue={maxValues.appointments}
                color="blue"
              />
            ))}
          </div>
          <div className="mt-2 text-right text-xs text-gray-500">
            Total: {data.totals.appointments.total} ({data.totals.appointments.completionRate}%
            finalizate)
          </div>
        </div>

        {/* Clients Comparison */}
        <div>
          <h4 className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <Users className="h-4 w-4 text-purple-500" />
            Clienti Noi
          </h4>
          <div className="space-y-2">
            {data.locations.map((loc) => (
              <MetricBar
                key={loc.location.id}
                label={loc.location.name}
                value={loc.metrics.clients.new}
                maxValue={maxValues.newClients}
                color="purple"
              />
            ))}
          </div>
          <div className="mt-2 text-right text-xs text-gray-500">
            Total clienti noi: {data.totals.clients.new}
          </div>
        </div>

        {/* Summary Table */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Sumar</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Locatie</th>
                  <th className="text-right py-2 px-4 font-medium text-gray-600">Venituri</th>
                  <th className="text-right py-2 px-4 font-medium text-gray-600">Programari</th>
                  <th className="text-right py-2 px-4 font-medium text-gray-600">Clienti</th>
                  <th className="text-right py-2 pl-4 font-medium text-gray-600">
                    Rata Finalizare
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.locations.map((loc) => (
                  <tr
                    key={loc.location.id}
                    className={`border-b border-gray-100 ${
                      loc.location.id === currentLocationId ? 'bg-orange-50' : ''
                    }`}
                  >
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <MapPin
                          size={14}
                          className={
                            loc.location.id === currentLocationId
                              ? 'text-orange-500'
                              : 'text-gray-400'
                          }
                        />
                        <span
                          className={
                            loc.location.id === currentLocationId
                              ? 'font-medium text-orange-700'
                              : 'text-gray-900'
                          }
                        >
                          {loc.location.name}
                        </span>
                        {loc.location.isPrimary && (
                          <span className="text-xs text-gray-400">(principal)</span>
                        )}
                      </div>
                    </td>
                    <td className="text-right py-2 px-4 font-medium text-gray-900">
                      {formatCurrency(loc.metrics.revenue)}
                    </td>
                    <td className="text-right py-2 px-4 text-gray-700">
                      {loc.metrics.appointments.total}
                    </td>
                    <td className="text-right py-2 px-4 text-gray-700">
                      {loc.metrics.clients.total}
                    </td>
                    <td className="text-right py-2 pl-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          loc.metrics.appointments.completionRate >= 80
                            ? 'bg-green-100 text-green-700'
                            : loc.metrics.appointments.completionRate >= 50
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {loc.metrics.appointments.completionRate}%
                      </span>
                    </td>
                  </tr>
                ))}
                {/* Unassigned row - only show if there are unassigned clients */}
                {data.unassigned?.clients?.total > 0 && (
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="h-3.5 w-3.5 rounded-full border-2 border-dashed border-gray-300" />
                        <span className="text-gray-500 italic">Neasignati</span>
                      </div>
                    </td>
                    <td className="text-right py-2 px-4 text-gray-400">-</td>
                    <td className="text-right py-2 px-4 text-gray-400">-</td>
                    <td className="text-right py-2 px-4 text-gray-500">
                      {data.unassigned.clients.total}
                    </td>
                    <td className="text-right py-2 pl-4 text-gray-400">-</td>
                  </tr>
                )}
                {/* Totals row */}
                <tr className="bg-gray-50 font-medium">
                  <td className="py-2 pr-4 text-gray-700">Total</td>
                  <td className="text-right py-2 px-4 text-gray-900">
                    {formatCurrency(data.totals.revenue)}
                  </td>
                  <td className="text-right py-2 px-4 text-gray-900">
                    {data.totals.appointments.total}
                  </td>
                  <td className="text-right py-2 px-4 text-gray-900">
                    {data.totals.clients.total}
                  </td>
                  <td className="text-right py-2 pl-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                      {data.totals.appointments.completionRate}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationComparisonChart;

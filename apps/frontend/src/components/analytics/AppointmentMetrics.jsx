import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import roDateLocale from 'date-fns/locale/ro';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-gray-600 mb-2">
        {format(parseISO(label), 'd MMM yyyy', { locale: roDateLocale })}
      </p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-medium">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function AppointmentMetrics({ data = [], byStatus = {}, isLoading }) {
  if (isLoading) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Se incarca...</div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500">
        Nu exista date pentru perioada selectata
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status breakdown */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { key: 'PENDING', label: 'Asteptare', color: 'bg-yellow-100 text-yellow-700' },
          { key: 'PREZENTAT', label: 'Prezentat', color: 'bg-blue-100 text-blue-700' },
          { key: 'IN_PROGRESS', label: 'In lucru', color: 'bg-purple-100 text-purple-700' },
          { key: 'COMPLETED', label: 'Finalizat', color: 'bg-green-100 text-green-700' },
          { key: 'CANCELLED', label: 'Anulat', color: 'bg-red-100 text-red-700' },
        ].map((status) => (
          <div
            key={status.key}
            className={`px-3 py-2 rounded-lg text-center ${status.color}`}
          >
            <p className="text-lg font-bold">{byStatus[status.key] || 0}</p>
            <p className="text-xs">{status.label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={(value) => {
              try {
                return format(parseISO(value), 'd MMM', { locale: roDateLocale });
              } catch {
                return value;
              }
            }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => {
              const labels = {
                total: 'Total',
                completed: 'Finalizate',
                cancelled: 'Anulate',
              };
              return labels[value] || value;
            }}
          />
          <Bar dataKey="total" name="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
          <Bar dataKey="completed" name="completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="cancelled" name="cancelled" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import roDateLocale from 'date-fns/locale/ro';
import { ChartSkeleton } from './Skeleton';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-gray-600 mb-1">
        {format(parseISO(label), 'd MMM yyyy', { locale: roDateLocale })}
      </p>
      <p className="text-lg font-bold text-viperx-primary">
        {formatCurrency(payload[0].value)}
      </p>
      <p className="text-xs text-gray-500">
        {payload[0].payload.count} {payload[0].payload.count === 1 ? 'plata' : 'plati'}
      </p>
    </div>
  );
};

export default function RevenueChart({ data = [], isLoading }) {
  if (isLoading) {
    return <ChartSkeleton height={300} />;
  }

  if (!data.length) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500">
        Nu exista date pentru perioada selectata
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="period"
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
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#4f46e5"
          strokeWidth={2}
          fill="url(#revenueGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

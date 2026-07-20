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
import { ChartSkeleton, SkeletonBox } from './Skeleton';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-gray-600 mb-2">
        {format(parseISO(label), 'd MMM yyyy', { locale: roDateLocale })}
      </p>
      <p className="text-lg font-bold text-emerald-600">+{data.newClients} clienti noi</p>
      <div className="mt-1 flex gap-3 text-xs text-gray-500">
        <span>PF: {data.pf}</span>
        <span>SRL: {data.srl}</span>
      </div>
    </div>
  );
};

export default function ClientGrowthChart({ data = [], byType = {}, isLoading }) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <SkeletonBox className="h-4 w-32" />
          <SkeletonBox className="h-4 w-24" />
        </div>
        <ChartSkeleton height={250} />
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
      {/* Type breakdown */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span className="text-sm text-gray-600">
            Persoane fizice: <span className="font-medium">{byType.PF || 0}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span className="text-sm text-gray-600">
            Firme: <span className="font-medium">{byType.SRL || 0}</span>
          </span>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="clientGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
          <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="newClients"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#clientGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

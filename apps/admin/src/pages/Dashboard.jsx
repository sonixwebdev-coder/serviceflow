import { useMemo } from 'react';
import {
  Building2, Users, Globe, UserPlus, Activity,
  AlertTriangle, CheckCircle, XCircle,
} from 'lucide-react';
import {
  LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useOverview, useGrowth, usePlans, useSectors, useActivity } from '@/hooks/useStats';

const PLAN_COLORS = { FREE: '#94a3b8', STARTER: '#3b82f6', PROFESSIONAL: '#8b5cf6', ENTERPRISE: '#f59e0b' };
const SECTOR_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

const STATUS_STYLES = {
  ACTIVE: 'bg-green-100 text-green-700',
  TRIAL: 'bg-blue-100 text-blue-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

function StatCard({ icon: Icon, label, value, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2.5 ${colors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value ?? '...'}</p>
        </div>
      </div>
    </div>
  );
}

function HealthIndicator({ health }) {
  if (!health) return null;

  const config = {
    HEALTHY: { icon: CheckCircle, color: 'text-green-600 bg-green-50 border-green-200', label: 'Sanatos' },
    WARNING: { icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 border-amber-200', label: 'Avertisment' },
    CRITICAL: { icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200', label: 'Critic' },
  };

  const c = config[health.status] || config.HEALTHY;
  const StatusIcon = c.icon;

  return (
    <div className={`flex items-center gap-3 rounded-xl border p-4 ${c.color}`}>
      <StatusIcon className="h-5 w-5" />
      <div>
        <p className="text-sm font-semibold">{c.label}</p>
        <p className="text-xs opacity-75">{health.errorsLast24h} erori in ultimele 24h</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: overview } = useOverview();
  const { data: growth } = useGrowth();
  const { data: plans } = usePlans();
  const { data: sectors } = useSectors();
  const { data: activity } = useActivity();

  const growthData = useMemo(() => {
    if (!growth?.orgGrowth) return [];
    const months = Object.keys(growth.orgGrowth).sort();
    return months.map((m) => ({
      month: m,
      organizations: growth.orgGrowth[m] || 0,
      users: growth.userGrowth?.[m] || 0,
    }));
  }, [growth]);

  const planData = useMemo(() => {
    if (!plans) return [];
    return plans.map((p) => ({ name: p.plan, value: p.count }));
  }, [plans]);

  const sectorData = useMemo(() => {
    if (!sectors) return [];
    return sectors.map((s) => ({ name: s.sector, value: s.count }));
  }, [sectors]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Platform overview</p>
      </div>

      {/* Top row: main stats + system health */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={Building2} label="Total Organizatii" value={overview?.totalOrgs} color="primary" />
        <StatCard icon={Users} label="Total Utilizatori" value={overview?.totalUsers} color="green" />
        <StatCard icon={UserPlus} label="Semnari Recente (7z)" value={overview?.recentSignups} color="purple" />
        <StatCard
          icon={Globe}
          label="Website Adoption"
          value={overview?.websiteAdoption ? `${overview.websiteAdoption.rate}%` : '...'}
          color="amber"
        />
        <HealthIndicator health={overview?.systemHealth} />
      </div>

      {/* Status breakdown mini-cards */}
      {overview?.statusBreakdown && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(overview.statusBreakdown).map(([status, count]) => (
            <div key={status} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status.toUpperCase()] || 'bg-gray-100 text-gray-600'}`}>
                {status.toUpperCase()}
              </span>
              <span className="text-lg font-bold text-gray-900">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Growth chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Crestere lunara (12 luni)</h3>
          {growthData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="organizations" stroke="#3b82f6" strokeWidth={2} name="Organizatii" />
                <Line type="monotone" dataKey="users" stroke="#8b5cf6" strokeWidth={2} name="Utilizatori" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-sm text-gray-400">
              Nu sunt date disponibile
            </div>
          )}
        </div>

        {/* Plan distribution */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Distributie Planuri</h3>
          {planData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={planData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {planData.map((entry) => (
                    <Cell key={entry.name} fill={PLAN_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-sm text-gray-400">
              Nu sunt date disponibile
            </div>
          )}
        </div>
      </div>

      {/* Sector distribution + Activity timeline */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Distributie Sectoare</h3>
          {sectorData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={sectorData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {sectorData.map((_, i) => (
                    <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-sm text-gray-400">
              Nu sunt date disponibile
            </div>
          )}
        </div>

        {/* Activity timeline */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="h-4 w-4 text-gray-400" />
            Activitate Recenta
          </h3>
          <div className="space-y-3 max-h-[280px] overflow-y-auto">
            {activity?.recentOrgs?.length > 0 && (
              <>
                <p className="text-xs font-medium text-gray-400 uppercase">Organizatii noi</p>
                {activity.recentOrgs.map((org) => (
                  <div key={org.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{org.name}</p>
                      <p className="text-xs text-gray-500">{org.plan} - {new Date(org.createdAt).toLocaleDateString('ro-RO')}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[org.status] || STATUS_STYLES.ACTIVE}`}>
                      {org.status}
                    </span>
                  </div>
                ))}
              </>
            )}
            {activity?.auditEvents?.length > 0 && (
              <>
                <p className="mt-2 text-xs font-medium text-gray-400 uppercase">Actiuni admin</p>
                {activity.auditEvents.slice(0, 5).map((event) => (
                  <div key={event.id} className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-sm text-gray-900">{event.message}</p>
                    <p className="text-xs text-gray-500">{new Date(event.createdAt).toLocaleString('ro-RO')}</p>
                  </div>
                ))}
              </>
            )}
            {!activity?.recentOrgs?.length && !activity?.auditEvents?.length && (
              <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">
                Nu sunt activitati recente
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

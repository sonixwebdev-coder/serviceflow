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
const SECTOR_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

const STATUS_STYLES = {
  ACTIVE: 'bg-green-50 text-green-700 border-green-200',
  TRIAL: 'bg-blue-50 text-blue-700 border-blue-200',
  SUSPENDED: 'bg-red-50 text-red-700 border-red-200',
  CANCELLED: 'bg-gray-50 text-gray-600 border-gray-200',
};

function StatCard({ icon: Icon, label, value, subtitle, gradient }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className={`absolute inset-0 opacity-[0.03] ${gradient || 'bg-gradient-to-br from-blue-500 to-blue-600'}`} />
      <div className="relative flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100/80 transition-colors group-hover:bg-gray-100">
          <Icon className="h-5 w-5 text-gray-600" />
        </div>
        <div>
          <p className="text-[13px] text-gray-500">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-gray-900">{value ?? '-'}</p>
          {subtitle && <p className="text-[11px] text-gray-400">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function HealthIndicator({ health }) {
  if (!health) return null;

  const config = {
    HEALTHY: { icon: CheckCircle, bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', label: 'Sanatos' },
    WARNING: { icon: AlertTriangle, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', label: 'Avertisment' },
    CRITICAL: { icon: XCircle, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: 'Critic' },
  };

  const c = config[health.status] || config.HEALTHY;
  const StatusIcon = c.icon;

  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-5 ${c.bg} ${c.border}`}>
      <StatusIcon className={`h-6 w-6 ${c.text}`} />
      <div>
        <p className={`text-sm font-semibold ${c.text}`}>{c.label}</p>
        <p className={`text-xs ${c.text} opacity-70`}>{health.errorsLast24h} erori / 24h</p>
      </div>
    </div>
  );
}

function ChartCard({ title, children, empty }) {
  return (
    <div className="rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">{title}</h3>
      {empty ? (
        <div className="flex h-[250px] items-center justify-center text-sm text-gray-400">
          Nu sunt date disponibile
        </div>
      ) : children}
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
      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={Building2} label="Total Organizatii" value={overview?.totalOrgs} gradient="bg-gradient-to-br from-blue-500 to-indigo-600" />
        <StatCard icon={Users} label="Total Utilizatori" value={overview?.totalUsers} gradient="bg-gradient-to-br from-emerald-500 to-teal-600" />
        <StatCard icon={UserPlus} label="Noi (7 zile)" value={overview?.recentSignups} gradient="bg-gradient-to-br from-purple-500 to-violet-600" />
        <StatCard
          icon={Globe}
          label="Website Adoption"
          value={overview?.websiteAdoption ? `${overview.websiteAdoption.rate}%` : undefined}
          subtitle={overview?.websiteAdoption ? `${overview.websiteAdoption.published}/${overview.websiteAdoption.total} publicate` : undefined}
          gradient="bg-gradient-to-br from-amber-500 to-orange-600"
        />
        <HealthIndicator health={overview?.systemHealth} />
      </div>

      {/* Status breakdown */}
      {overview?.statusBreakdown && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(overview.statusBreakdown).map(([status, count]) => (
            <div
              key={status}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 ${STATUS_STYLES[status.toUpperCase()] || 'bg-gray-50 text-gray-600 border-gray-200'}`}
            >
              <span className="text-xs font-semibold uppercase tracking-wide">{status}</span>
              <span className="text-lg font-bold">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Crestere lunara (12 luni)" empty={growthData.length === 0}>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)' }}
              />
              <Legend />
              <Line type="monotone" dataKey="organizations" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Organizatii" />
              <Line type="monotone" dataKey="users" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="Utilizatori" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distributie Planuri" empty={planData.length === 0}>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={planData} cx="50%" cy="50%" outerRadius={80} innerRadius={45} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {planData.map((entry) => (
                  <Cell key={entry.name} fill={PLAN_COLORS[entry.name] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Sector + Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Distributie Sectoare" empty={sectorData.length === 0}>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={sectorData} cx="50%" cy="50%" outerRadius={80} innerRadius={45} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {sectorData.map((_, i) => (
                  <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Activity className="h-4 w-4 text-gray-400" />
            Activitate Recenta
          </h3>
          <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
            {activity?.recentOrgs?.length > 0 && (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Organizatii noi</p>
                {activity.recentOrgs.map((org) => (
                  <div key={org.id} className="flex items-center justify-between rounded-lg bg-gray-50/80 px-3 py-2.5 transition-colors hover:bg-gray-100/80">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{org.name}</p>
                      <p className="text-[11px] text-gray-500">{org.plan} · {new Date(org.createdAt).toLocaleDateString('ro-RO')}</p>
                    </div>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[org.status] || STATUS_STYLES.ACTIVE}`}>
                      {org.status}
                    </span>
                  </div>
                ))}
              </>
            )}
            {activity?.auditEvents?.length > 0 && (
              <>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Actiuni admin</p>
                {activity.auditEvents.slice(0, 5).map((event) => (
                  <div key={event.id} className="rounded-lg bg-gray-50/80 px-3 py-2.5">
                    <p className="text-sm text-gray-800">{event.message}</p>
                    <p className="text-[11px] text-gray-400">{new Date(event.createdAt).toLocaleString('ro-RO')}</p>
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

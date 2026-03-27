import { useState } from 'react';
import { HardDrive, Database, Trash2, Clock, Users, Loader2 } from 'lucide-react';
import { useMaintenanceStats, useRunCleanup } from '@/hooks/useMaintenance';
import useToast from '@/context/useToast';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-2xl border border-gray-200/60 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100">
          <Icon className="h-4 w-4 text-gray-500" />
        </div>
        <div>
          <p className="text-[11px] text-gray-500">{label}</p>
          <p className="text-lg font-bold tabular-nums text-gray-900">{value}</p>
          {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function CleanupButton({ label, type, mutation, showToast }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    mutation.mutate(
      { type },
      {
        onSuccess: (data) => {
          showToast({ title: 'Cleanup finalizat', description: JSON.stringify(data, null, 2).slice(0, 200), type: 'success' });
          setLoading(false);
        },
        onError: (err) => {
          showToast({ title: 'Eroare', description: err.message, type: 'error' });
          setLoading(false);
        },
      }
    );
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading || mutation.isPending}
      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-gray-400" />}
      {label}
    </button>
  );
}

export default function Maintenance() {
  const { data: stats, isLoading } = useMaintenanceStats();
  const cleanupMutation = useRunCleanup();
  const { showToast } = useToast();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Storage */}
      <Section title="Stocare">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={HardDrive} label="Fisiere Chat" value={formatBytes(stats?.storage?.chatFiles)} />
          <StatCard icon={HardDrive} label="Fisiere Upload" value={formatBytes(stats?.storage?.uploadFiles)} />
          <StatCard icon={HardDrive} label="Total Stocare" value={formatBytes(stats?.storage?.total)} />
        </div>
      </Section>

      {/* Records */}
      <Section title="Inregistrari">
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard icon={Database} label="Mesaje Chat" value={stats?.records?.chatMessages?.toLocaleString('ro-RO') || 0} />
          <StatCard icon={Database} label="Mesaje Programari" value={stats?.records?.messages?.toLocaleString('ro-RO') || 0} />
          <StatCard icon={Database} label="Notificari" value={stats?.records?.notifications?.toLocaleString('ro-RO') || 0} />
          <StatCard icon={Database} label="Loguri Audit" value={stats?.records?.auditLogs?.toLocaleString('ro-RO') || 0} />
        </div>
        <div className="mt-3 grid gap-4 sm:grid-cols-4">
          <StatCard icon={Database} label="Loguri Email" value={stats?.records?.emailLogs?.toLocaleString('ro-RO') || 0} />
          <StatCard icon={Database} label="Loguri Sistem" value={stats?.records?.systemLogs?.toLocaleString('ro-RO') || 0} />
          <StatCard icon={Database} label="Atasamente Chat" value={stats?.records?.chatAttachments?.toLocaleString('ro-RO') || 0} />
          <StatCard icon={Database} label="Atasamente Mesaje" value={stats?.records?.messageAttachments?.toLocaleString('ro-RO') || 0} />
        </div>
      </Section>

      {/* Cleanup */}
      <Section title="Actiuni Curatare">
        <div className="flex flex-wrap gap-3">
          <CleanupButton label="Sesiuni Expirate" type="sessions" mutation={cleanupMutation} showToast={showToast} />
          <CleanupButton label="Retentie Date" type="retention" mutation={cleanupMutation} showToast={showToast} />
          <CleanupButton label="Fisiere Orfane" type="orphans" mutation={cleanupMutation} showToast={showToast} />
          <CleanupButton label="Toate" type="all" mutation={cleanupMutation} showToast={showToast} />
        </div>
      </Section>

      {/* Jobs */}
      {stats?.jobs && (
        <Section title="Joburi Automate">
          <div className="rounded-2xl border border-gray-200/60 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-5 text-sm">
              {Object.entries(stats.jobs.cleanup || {}).map(([name, status]) => (
                <div key={name} className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${status === 'running' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                  <span className="text-gray-700 capitalize font-medium">{name}</span>
                  <span className="text-[11px] text-gray-400">{status}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* Idle accounts */}
      {stats?.idleAccounts?.length > 0 && (
        <Section
          title={
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Conturi Inactive ({stats.idleAccounts.length})
            </span>
          }
        >
          <div className="rounded-2xl border border-gray-200/60 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-left">
                    <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Organizatie</th>
                    <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Plan</th>
                    <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Utilizatori</th>
                    <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Ultima Autentificare</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stats.idleAccounts.map((acc) => (
                    <tr key={acc.id} className="transition-colors hover:bg-gray-50/50">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-900">{acc.name}</p>
                        <p className="text-[11px] text-gray-400 font-mono">/{acc.slug}</p>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-600">{acc.plan}</td>
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-1 text-gray-600 text-xs">
                          <Users className="h-3 w-3" /> {acc.userCount}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-500">
                        {acc.lastLogin ? new Date(acc.lastLogin).toLocaleDateString('ro-RO') : 'Niciodata'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-gray-900">{title}</h3>
      {children}
    </div>
  );
}

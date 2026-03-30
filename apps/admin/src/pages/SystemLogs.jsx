import { useState } from 'react';
import { RefreshCw, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { useLogs, useLogStats } from '@/hooks/useLogs';

const LEVEL_STYLES = {
  ERROR: 'bg-red-50 text-red-700 border-red-200',
  WARN: 'bg-amber-50 text-amber-700 border-amber-200',
  INFO: 'bg-blue-50 text-blue-700 border-blue-200',
  DEBUG: 'bg-gray-100 text-gray-600 border-gray-200',
};

const LEVELS = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
const CATEGORIES = ['REQUEST', 'AUTH', 'ERROR', 'SYSTEM', 'EMAIL', 'REALTIME'];

export default function SystemLogs() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ level: '', category: '', search: '' });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);

  const params = {
    page,
    limit: 50,
    ...(filters.level && { level: filters.level }),
    ...(filters.category && { category: filters.category }),
    ...(filters.search && { search: filters.search }),
  };

  const { data, isLoading } = useLogs(params, { autoRefresh });
  const { data: stats } = useLogStats({ autoRefresh });

  const logs = data?.logs || [];
  const pagination = data?.pagination || {};

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {stats?.levels?.ERROR > 0 && (
            <span className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
              {stats.levels.ERROR} erori (24h)
            </span>
          )}
          {stats?.levels?.WARN > 0 && (
            <span className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
              {stats.levels.WARN} avertismente (24h)
            </span>
          )}
        </div>
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
            autoRefresh
              ? 'border-primary-200 bg-primary-50 text-primary-700'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
          {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200/60 bg-white p-4 shadow-sm">
        <select
          value={filters.level}
          onChange={(e) => handleFilterChange('level', e.target.value)}
          className="rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-700 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors"
        >
          <option value="">Toate nivelurile</option>
          {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select
          value={filters.category}
          onChange={(e) => handleFilterChange('category', e.target.value)}
          className="rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-700 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors"
        >
          <option value="">Toate categoriile</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="Cauta in mesaje..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50/50 pl-9 pr-3 py-2 text-sm placeholder:text-gray-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200/60 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-left">
                <th className="w-8 px-4 py-3" />
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Timestamp</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Nivel</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Categorie</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Mesaj</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Cale</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Metoda</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Durata</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-sm text-gray-400">
                    Nu sunt loguri disponibile
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <LogRow
                    key={log.id}
                    log={log}
                    isExpanded={expandedRow === log.id}
                    onToggle={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
            <p className="text-xs text-gray-500">
              Pagina {pagination.page} din {pagination.totalPages} ({pagination.total} total)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors disabled:opacity-40 hover:bg-gray-50"
              >
                Inapoi
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors disabled:opacity-40 hover:bg-gray-50"
              >
                Inainte
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LogRow({ log, isExpanded, onToggle }) {
  const hasDetails = log.stack || log.data;

  return (
    <>
      <tr
        className={`cursor-pointer transition-colors hover:bg-gray-50/50 ${isExpanded ? 'bg-gray-50/80' : ''}`}
        onClick={hasDetails ? onToggle : undefined}
      >
        <td className="px-4 py-3">
          {hasDetails && (
            isExpanded
              ? <ChevronDown className="h-4 w-4 text-gray-400" />
              : <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-xs tabular-nums text-gray-500">
          {new Date(log.createdAt).toLocaleString('ro-RO')}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold ${LEVEL_STYLES[log.level] || LEVEL_STYLES.INFO}`}>
            {log.level}
          </span>
        </td>
        <td className="px-4 py-3 text-xs text-gray-600">{log.category}</td>
        <td className="px-4 py-3 max-w-xs truncate text-gray-900">{log.message}</td>
        <td className="px-4 py-3 text-xs text-gray-500 font-mono">{log.path || '-'}</td>
        <td className="px-4 py-3 text-xs text-gray-500">{log.method || '-'}</td>
        <td className="px-4 py-3 text-xs tabular-nums text-gray-500">
          {log.duration != null ? `${log.duration}ms` : '-'}
        </td>
        <td className="px-4 py-3 text-xs text-gray-500 font-mono">{log.ip || '-'}</td>
      </tr>
      {isExpanded && hasDetails && (
        <tr>
          <td colSpan={9} className="bg-gray-50/80 px-8 py-4">
            <div className="space-y-3">
              {log.message && (
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Mesaj complet</p>
                  <pre className="whitespace-pre-wrap rounded-xl bg-gray-900 p-4 text-xs text-gray-200 leading-relaxed">
                    {log.message}
                  </pre>
                </div>
              )}
              {log.stack && (
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Stack Trace</p>
                  <pre className="whitespace-pre-wrap rounded-xl bg-gray-900 p-4 text-xs text-red-300 overflow-x-auto max-h-64 leading-relaxed">
                    {log.stack}
                  </pre>
                </div>
              )}
              {log.data && (
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Date aditionale</p>
                  <pre className="whitespace-pre-wrap rounded-xl bg-gray-900 p-4 text-xs text-emerald-300 overflow-x-auto max-h-64 leading-relaxed">
                    {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

import { useState } from 'react';
import { ScrollText, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { useLogs, useLogStats } from '@/hooks/useLogs';

const LEVEL_STYLES = {
  ERROR: 'bg-red-100 text-red-700',
  WARN: 'bg-amber-100 text-amber-700',
  INFO: 'bg-blue-100 text-blue-700',
  DEBUG: 'bg-gray-100 text-gray-600',
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ScrollText className="h-6 w-6 text-gray-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Loguri Sistem</h1>
            <p className="text-sm text-gray-500">Vizualizare evenimente si erori</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats badges */}
          {stats && (
            <div className="flex gap-2">
              {stats.levels?.ERROR > 0 && (
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                  {stats.levels.ERROR} erori (24h)
                </span>
              )}
              {stats.levels?.WARN > 0 && (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                  {stats.levels.WARN} avertismente (24h)
                </span>
              )}
            </div>
          )}

          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              autoRefresh
                ? 'border-primary-200 bg-primary-50 text-primary-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <select
          value={filters.level}
          onChange={(e) => handleFilterChange('level', e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        >
          <option value="">Toate nivelurile</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>

        <select
          value={filters.category}
          onChange={(e) => handleFilterChange('category', e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        >
          <option value="">Toate categoriile</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <input
          type="text"
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          placeholder="Cauta in mesaje..."
          className="flex-1 min-w-[200px] rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500">
                <th className="w-8 px-4 py-3" />
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Nivel</th>
                <th className="px-4 py-3 font-medium">Categorie</th>
                <th className="px-4 py-3 font-medium">Mesaj</th>
                <th className="px-4 py-3 font-medium">Cale</th>
                <th className="px-4 py-3 font-medium">Metoda</th>
                <th className="px-4 py-3 font-medium">Durata</th>
                <th className="px-4 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    Se incarca...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
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

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500">
              Pagina {pagination.page} din {pagination.totalPages} ({pagination.total} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Inapoi
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
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
        className={`cursor-pointer hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-gray-50' : ''}`}
        onClick={hasDetails ? onToggle : undefined}
      >
        <td className="px-4 py-3">
          {hasDetails && (
            isExpanded
              ? <ChevronDown className="h-4 w-4 text-gray-400" />
              : <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
          {new Date(log.createdAt).toLocaleString('ro-RO')}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_STYLES[log.level] || LEVEL_STYLES.INFO}`}>
            {log.level}
          </span>
        </td>
        <td className="px-4 py-3 text-xs text-gray-600">{log.category}</td>
        <td className="px-4 py-3 max-w-xs truncate text-gray-900">{log.message}</td>
        <td className="px-4 py-3 text-xs text-gray-500 font-mono">{log.path || '-'}</td>
        <td className="px-4 py-3 text-xs text-gray-500">{log.method || '-'}</td>
        <td className="px-4 py-3 text-xs text-gray-500">
          {log.duration != null ? `${log.duration}ms` : '-'}
        </td>
        <td className="px-4 py-3 text-xs text-gray-500 font-mono">{log.ip || '-'}</td>
      </tr>
      {isExpanded && hasDetails && (
        <tr>
          <td colSpan={9} className="bg-gray-50 px-8 py-4">
            <div className="space-y-3">
              {log.message && (
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">Mesaj complet</p>
                  <pre className="whitespace-pre-wrap rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
                    {log.message}
                  </pre>
                </div>
              )}
              {log.stack && (
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">Stack Trace</p>
                  <pre className="whitespace-pre-wrap rounded-lg bg-gray-900 p-3 text-xs text-red-300 overflow-x-auto max-h-64">
                    {log.stack}
                  </pre>
                </div>
              )}
              {log.data && (
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">Date aditionale</p>
                  <pre className="whitespace-pre-wrap rounded-lg bg-gray-900 p-3 text-xs text-green-300 overflow-x-auto max-h-64">
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

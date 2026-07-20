import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, AlertCircle, CheckCircle, Clock, Search, ChevronRight } from 'lucide-react';
import { useTickets, useTicketStats } from '@/hooks/useTickets';

const STATUS_COLORS = {
  OPEN: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CLOSED: 'bg-gray-100 text-gray-600 border-gray-200',
};

const PRIORITY_COLORS = {
  LOW: 'bg-gray-100 text-gray-600 border-gray-200',
  MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
  HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
  URGENT: 'bg-red-50 text-red-700 border-red-200',
};

const CATEGORY_LABELS = {
  BUG: 'Bug',
  FEATURE_REQUEST: 'Feature',
  BILLING: 'Billing',
  GENERAL_QUESTION: 'General',
};

export default function Tickets() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ page: 1, limit: 20 });
  const [search, setSearch] = useState('');

  const { data: stats } = useTicketStats();
  const { data, isLoading } = useTickets({
    ...filters,
    ...(search ? { search } : {}),
  });

  const tickets = data?.tickets || [];
  const pagination = data?.pagination;

  const handleFilter = (key, value) => {
    setFilters((prev) => {
      const next = { ...prev, page: 1 };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Deschise',
              value: stats.OPEN || 0,
              icon: AlertCircle,
              color: 'text-blue-600',
              bg: 'bg-blue-50',
            },
            {
              label: 'In progres',
              value: stats.IN_PROGRESS || 0,
              icon: Clock,
              color: 'text-amber-600',
              bg: 'bg-amber-50',
            },
            {
              label: 'Rezolvate',
              value: stats.RESOLVED || 0,
              icon: CheckCircle,
              color: 'text-emerald-600',
              bg: 'bg-emerald-50',
            },
            {
              label: 'Inchise',
              value: stats.CLOSED || 0,
              icon: MessageSquare,
              color: 'text-gray-500',
              bg: 'bg-gray-100',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-gray-200/60 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold tabular-nums text-gray-900">{stat.value}</p>
                  <p className="text-[11px] text-gray-500">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cauta dupa subiect..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50/50 pl-9 pr-3 py-2 text-sm placeholder:text-gray-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors"
          />
        </div>
        {[
          {
            key: 'status',
            options: [
              ['', 'Toate statusurile'],
              ['OPEN', 'Deschis'],
              ['IN_PROGRESS', 'In progres'],
              ['RESOLVED', 'Rezolvat'],
              ['CLOSED', 'Inchis'],
            ],
          },
          {
            key: 'category',
            options: [
              ['', 'Toate categoriile'],
              ['BUG', 'Bug'],
              ['FEATURE_REQUEST', 'Feature Request'],
              ['BILLING', 'Billing'],
              ['GENERAL_QUESTION', 'General'],
            ],
          },
          {
            key: 'priority',
            options: [
              ['', 'Toate prioritatile'],
              ['LOW', 'Low'],
              ['MEDIUM', 'Medium'],
              ['HIGH', 'High'],
              ['URGENT', 'Urgent'],
            ],
          },
        ].map((f) => (
          <select
            key={f.key}
            value={filters[f.key] || ''}
            onChange={(e) => handleFilter(f.key, e.target.value)}
            className="rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-700 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors"
          >
            {f.options.map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200/60 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <MessageSquare className="mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">Niciun tichet gasit</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-left">
                  <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Subiect
                  </th>
                  <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Organizatie
                  </th>
                  <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Categorie
                  </th>
                  <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Prioritate
                  </th>
                  <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Creat
                  </th>
                  <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Mesaje
                  </th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                    className="group cursor-pointer transition-colors hover:bg-primary-50/30"
                  >
                    <td className="px-5 py-3.5 font-medium text-gray-900 max-w-xs truncate">
                      {ticket.subject}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">
                      {ticket.organization?.name || '-'}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">
                      {CATEGORY_LABELS[ticket.category]}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[ticket.status]}`}
                      >
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_COLORS[ticket.priority]}`}
                      >
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(ticket.createdAt).toLocaleDateString('ro-RO')}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 tabular-nums">
                      {ticket._count?.messages || 0}
                    </td>
                    <td className="px-3 py-3.5">
                      <ChevronRight className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Pagina {pagination.page} din {pagination.totalPages} ({pagination.total} tichete)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page <= 1}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors disabled:opacity-40 hover:bg-gray-50"
            >
              Inapoi
            </button>
            <button
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors disabled:opacity-40 hover:bg-gray-50"
            >
              Inainte
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

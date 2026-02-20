import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, AlertCircle, CheckCircle, Clock, Search } from 'lucide-react';
import { useTickets, useTicketStats } from '@/hooks/useTickets';

const STATUS_COLORS = {
  OPEN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
};

const PRIORITY_COLORS = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tichete Suport</h1>
        <p className="text-sm text-gray-500 mt-1">Gestioneaza tichetele de suport de la organizatii.</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Deschise', value: stats.OPEN || 0, icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'In progres', value: stats.IN_PROGRESS || 0, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { label: 'Rezolvate', value: stats.RESOLVED || 0, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Inchise', value: stats.CLOSED || 0, icon: MessageSquare, color: 'text-gray-500', bg: 'bg-gray-100' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2.5 ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cauta dupa subiect..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <select
          value={filters.status || ''}
          onChange={(e) => handleFilter('status', e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Toate statusurile</option>
          <option value="OPEN">Deschis</option>
          <option value="IN_PROGRESS">In progres</option>
          <option value="RESOLVED">Rezolvat</option>
          <option value="CLOSED">Inchis</option>
        </select>
        <select
          value={filters.category || ''}
          onChange={(e) => handleFilter('category', e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Toate categoriile</option>
          <option value="BUG">Bug</option>
          <option value="FEATURE_REQUEST">Feature Request</option>
          <option value="BILLING">Billing</option>
          <option value="GENERAL_QUESTION">General</option>
        </select>
        <select
          value={filters.priority || ''}
          onChange={(e) => handleFilter('priority', e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Toate prioritatile</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">Niciun tichet gasit.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Subiect</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Organizatie</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Categorie</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Prioritate</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Creat</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Mesaje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">
                    {ticket.subject}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {ticket.organization?.name || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-600">{CATEGORY_LABELS[ticket.category]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[ticket.status]}`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[ticket.priority]}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(ticket.createdAt).toLocaleDateString('ro-RO')}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {ticket._count?.messages || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Pagina {pagination.page} din {pagination.totalPages} ({pagination.total} tichete)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page <= 1}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Inapoi
            </button>
            <button
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Inainte
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

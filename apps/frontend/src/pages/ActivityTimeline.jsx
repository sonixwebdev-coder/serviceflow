import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import roDateLocale from 'date-fns/locale/ro';
import {
  Activity,
  Filter,
  Users,
  Calendar,
  FileText,
  ClipboardList,
  Package,
  CreditCard,
  RefreshCw,
  X,
} from 'lucide-react';
import { useAuditLogs } from '../hooks/useAuditLogs';
import useUsers from '../hooks/useUsers';
import ActivityList from '../components/activity/ActivityList';

// Entity type filter options
const ENTITY_TYPES = [
  { value: 'Client', label: 'Clienti', icon: Users },
  { value: 'Appointment', label: 'Programari', icon: Calendar },
  { value: 'Invoice', label: 'Facturi', icon: FileText },
  { value: 'Task', label: 'Task-uri', icon: ClipboardList },
  { value: 'Asset', label: 'Active', icon: Package },
  { value: 'Payment', label: 'Plati', icon: CreditCard },
];

// Action filter options
const ACTIONS = [
  { value: 'CREATE', label: 'Creare' },
  { value: 'UPDATE', label: 'Actualizare' },
  { value: 'DELETE', label: 'Stergere' },
  { value: 'APPROVE', label: 'Aprobare' },
  { value: 'REJECT', label: 'Respingere' },
];

export default function ActivityTimeline() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    entityType: '',
    actorId: '',
    action: '',
    dateFrom: '',
    dateTo: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const { users = [] } = useUsers();
  const { data, isLoading, refetch, isFetching } = useAuditLogs({
    ...filters,
    page,
    limit: 50,
  });

  const activities = data?.items || [];
  const pagination = data?.pagination;

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(Boolean).length;
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      entityType: '',
      actorId: '',
      action: '',
      dateFrom: '',
      dateTo: '',
    });
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-6 w-6 text-viperx-primary" />
            Activitate
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Istoricul actiunilor din platforma
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition disabled:opacity-50"
            title="Reincarca"
          >
            <RefreshCw className={`h-4 w-4 text-gray-600 ${isFetching ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
              showFilters || activeFilterCount > 0
                ? 'bg-viperx-primary text-white border-viperx-primary'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filtre
            {activeFilterCount > 0 && (
              <span className="ml-1 bg-white/20 text-xs px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Filtre</h3>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" />
                Sterge filtrele
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Entity Type */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Tip entitate
              </label>
              <select
                value={filters.entityType}
                onChange={(e) => handleFilterChange('entityType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-viperx-primary/20 focus:border-viperx-primary"
              >
                <option value="">Toate</option>
                {ENTITY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Action */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Actiune
              </label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-viperx-primary/20 focus:border-viperx-primary"
              >
                <option value="">Toate</option>
                {ACTIONS.map((action) => (
                  <option key={action.value} value={action.value}>
                    {action.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Actor */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Utilizator
              </label>
              <select
                value={filters.actorId}
                onChange={(e) => handleFilterChange('actorId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-viperx-primary/20 focus:border-viperx-primary"
              >
                <option value="">Toti</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                De la
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-viperx-primary/20 focus:border-viperx-primary"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Pana la
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-viperx-primary/20 focus:border-viperx-primary"
              />
            </div>
          </div>
        </div>
      )}

      {/* Activity List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <ActivityList
          activities={activities}
          isLoading={isLoading}
          emptyMessage="Nicio activitate gasita"
          emptyDescription={
            activeFilterCount > 0
              ? 'Incearca sa modifici filtrele'
              : 'Activitatile vor aparea aici pe masura ce se intampla'
          }
        />

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Afisare {(pagination.page - 1) * pagination.limit + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)} din{' '}
              {pagination.total} rezultate
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-600">
                Pagina {pagination.page} din {pagination.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Urmator
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

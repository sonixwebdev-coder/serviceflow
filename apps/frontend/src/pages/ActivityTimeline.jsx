import { useState, useMemo } from 'react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import roDateLocale from 'date-fns/locale/ro';
import DatePicker from '../components/ui/DatePicker';
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
  Plus,
  Pencil,
  Trash2,
  Check,
  Clock,
  MessageSquare,
  User,
} from 'lucide-react';
import { useAuditLogs } from '../hooks/useAuditLogs';
import useUsers from '../hooks/useUsers';

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

const ENTITY_ICONS = {
  Client: Users,
  Appointment: Calendar,
  Invoice: FileText,
  Task: ClipboardList,
  Asset: Package,
  Payment: CreditCard,
  TimeOffRequest: Clock,
  ChatChannel: MessageSquare,
  ChatMessage: MessageSquare,
  User: User,
};

const ENTITY_LABELS = {
  Client: 'Client',
  Appointment: 'Programare',
  Invoice: 'Factura',
  Task: 'Task',
  Asset: 'Activ',
  Payment: 'Plata',
  TimeOffRequest: 'Concediu',
  ChatChannel: 'Canal chat',
  ChatMessage: 'Mesaj',
  User: 'Utilizator',
};

const ACTION_ICONS = {
  CREATE: Plus,
  UPDATE: Pencil,
  DELETE: Trash2,
  APPROVE: Check,
  REJECT: X,
};

const ACTION_COLORS = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  APPROVE: 'bg-emerald-100 text-emerald-700',
  REJECT: 'bg-orange-100 text-orange-700',
  LOGIN: 'bg-purple-100 text-purple-700',
  LOGOUT: 'bg-gray-100 text-gray-700',
};

const ACTION_LABELS = {
  CREATE: 'Creare',
  UPDATE: 'Actualizare',
  DELETE: 'Stergere',
  APPROVE: 'Aprobare',
  REJECT: 'Respingere',
  LOGIN: 'Conectare',
  LOGOUT: 'Deconectare',
};

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
    limit: 10,
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
              <DatePicker
                label="De la"
                value={filters.dateFrom ? parseISO(filters.dateFrom) : null}
                onChange={(date) => handleFilterChange('dateFrom', date ? format(date, 'yyyy-MM-dd') : '')}
                maxDate={new Date()}
                placeholder="Selecteaza data"
              />
            </div>

            {/* Date To */}
            <div>
              <DatePicker
                label="Pana la"
                value={filters.dateTo ? parseISO(filters.dateTo) : null}
                onChange={(date) => handleFilterChange('dateTo', date ? format(date, 'yyyy-MM-dd') : '')}
                minDate={filters.dateFrom ? parseISO(filters.dateFrom) : undefined}
                maxDate={new Date()}
                placeholder="Selecteaza data"
              />
            </div>
          </div>
        </div>
      )}

      {/* Table Card */}
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-opacity ${isFetching && !isLoading ? 'opacity-70' : ''}`}>
        {/* Desktop Table */}
        <div className="hidden lg:block">
          <div className="grid grid-cols-5 gap-4 px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 bg-gray-50/50">
            <span>Utilizator</span>
            <span className="col-span-2">Descriere</span>
            <span>Actiune / Tip</span>
            <span>Data</span>
          </div>

          {isLoading ? (
            <div className="divide-y">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="grid grid-cols-5 gap-4 px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
                    <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                  </div>
                  <div className="col-span-2 h-4 w-3/4 animate-pulse rounded bg-gray-200 self-center" />
                  <div className="flex gap-2 self-center">
                    <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
                    <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
                  </div>
                  <div className="h-4 w-28 animate-pulse rounded bg-gray-200 self-center" />
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                <Activity className="h-7 w-7 text-gray-400" />
              </div>
              <p className="font-medium text-gray-900">Nicio activitate gasita</p>
              <p className="text-sm text-gray-500 mt-1">
                {activeFilterCount > 0
                  ? 'Incearca sa modifici filtrele'
                  : 'Activitatile vor aparea aici pe masura ce se intampla'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {activities.map((activity) => {
                const EntityIcon = ENTITY_ICONS[activity.entityType] || ClipboardList;
                const ActionIcon = ACTION_ICONS[activity.action] || Pencil;
                const actionColor = ACTION_COLORS[activity.action] || 'bg-gray-100 text-gray-700';
                const entityLabel = ENTITY_LABELS[activity.entityType] || activity.entityType;
                const actionLabel = ACTION_LABELS[activity.action] || activity.action;
                const actorName = activity.actor
                  ? `${activity.actor.firstName} ${activity.actor.lastName}`
                  : 'Sistem';
                const actorInitials = activity.actor
                  ? `${activity.actor.firstName?.[0] || ''}${activity.actor.lastName?.[0] || ''}`
                  : 'S';

                return (
                  <div key={activity.id} className="grid grid-cols-5 gap-4 px-6 py-3.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors items-center">
                    {/* Utilizator */}
                    <div className="flex items-center gap-2.5">
                      {activity.actor?.avatarUrl ? (
                        <img src={activity.actor.avatarUrl} alt={actorName} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0">
                          {actorInitials}
                        </div>
                      )}
                      <span className="font-medium text-gray-900 truncate">{actorName}</span>
                    </div>

                    {/* Descriere */}
                    <div className="col-span-2 text-gray-600 truncate" title={activity.description}>
                      {activity.description}
                    </div>

                    {/* Actiune / Tip */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${actionColor}`}>
                        <ActionIcon className="h-3 w-3" />
                        {actionLabel}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        <EntityIcon className="h-3 w-3" />
                        {entityLabel}
                      </span>
                    </div>

                    {/* Data */}
                    <div
                      className="text-gray-500 text-xs"
                      title={format(new Date(activity.createdAt), 'dd MMM yyyy, HH:mm', { locale: roDateLocale })}
                    >
                      {format(new Date(activity.createdAt), 'dd MMM yyyy, HH:mm', { locale: roDateLocale })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden">
          {isLoading ? (
            <div className="space-y-1 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-3 p-3">
                  <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                    <div className="flex gap-2">
                      <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
                      <div className="h-5 w-20 animate-pulse rounded bg-gray-200" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                <Activity className="h-7 w-7 text-gray-400" />
              </div>
              <p className="font-medium text-gray-900">Nicio activitate gasita</p>
              <p className="text-sm text-gray-500 mt-1">
                {activeFilterCount > 0
                  ? 'Incearca sa modifici filtrele'
                  : 'Activitatile vor aparea aici pe masura ce se intampla'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {activities.map((activity) => {
                const EntityIcon = ENTITY_ICONS[activity.entityType] || ClipboardList;
                const ActionIcon = ACTION_ICONS[activity.action] || Pencil;
                const actionColor = ACTION_COLORS[activity.action] || 'bg-gray-100 text-gray-700';
                const entityLabel = ENTITY_LABELS[activity.entityType] || activity.entityType;
                const actionLabel = ACTION_LABELS[activity.action] || activity.action;
                const actorName = activity.actor
                  ? `${activity.actor.firstName} ${activity.actor.lastName}`
                  : 'Sistem';
                const actorInitials = activity.actor
                  ? `${activity.actor.firstName?.[0] || ''}${activity.actor.lastName?.[0] || ''}`
                  : 'S';

                return (
                  <div key={activity.id} className="p-4 hover:bg-gray-50 transition">
                    <div className="flex items-start gap-3">
                      {activity.actor?.avatarUrl ? (
                        <img src={activity.actor.avatarUrl} alt={actorName} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0">
                          {actorInitials}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">{actorName}</span>
                        </p>
                        <p className="text-sm text-gray-600 mt-0.5">{activity.description}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${actionColor}`}>
                            <ActionIcon className="h-3 w-3" />
                            {actionLabel}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            <EntityIcon className="h-3 w-3" />
                            {entityLabel}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: roDateLocale })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

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

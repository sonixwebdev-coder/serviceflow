import { useMemo, useState } from 'react';
import { Activity, Filter, RefreshCw } from 'lucide-react';
import ActivityTimelineFilters from '../components/activity/ActivityTimelineFilters';
import ActivityTimelineTable from '../components/activity/ActivityTimelineTable';
import { useAuditLogs } from '../hooks/useAuditLogs';
import useUsers from '../hooks/useUsers';

const EMPTY_FILTERS = {
  entityType: '',
  actorId: '',
  action: '',
  dateFrom: '',
  dateTo: '',
};

export default function ActivityTimeline() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const { users = [] } = useUsers();
  const { data, isLoading, refetch, isFetching } = useAuditLogs({
    ...filters,
    page,
    limit: 10,
  });
  const activeFilterCount = useMemo(() => Object.values(filters).filter(Boolean).length, [filters]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Activity className="h-6 w-6 text-primary" />
            Activitate
          </h1>
          <p className="mt-1 text-sm text-gray-500">Istoricul actiunilor din platforma</p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-lg border border-gray-200 p-2 transition hover:bg-gray-50 disabled:opacity-50"
            aria-label="Reincarca activitatea"
            title="Reincarca"
          >
            <RefreshCw className={`h-4 w-4 text-gray-600 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setShowFilters((visible) => !visible)}
            aria-expanded={showFilters}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2 transition sm:flex-none ${
              showFilters || activeFilterCount > 0
                ? 'border-primary bg-primary text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filtre
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {showFilters && (
        <ActivityTimelineFilters
          activeFilterCount={activeFilterCount}
          filters={filters}
          onChange={updateFilter}
          onClear={clearFilters}
          users={users}
        />
      )}

      <ActivityTimelineTable
        activities={data?.items || []}
        activeFilterCount={activeFilterCount}
        isFetching={isFetching}
        isLoading={isLoading}
        onPageChange={setPage}
        page={page}
        pagination={data?.pagination}
      />
    </div>
  );
}

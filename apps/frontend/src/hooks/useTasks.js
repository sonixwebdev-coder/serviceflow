import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTasks } from '../services/taskService';
import useLocationStore from '../state/useLocationStore';

const EMPTY_ARRAY = [];

const useTasks = (initialFilters = {}, options = {}) => {
  const { enablePagination = false } = options;
  const [page, setPage] = useState(1);
  const [overrides, setFilters] = useState({});
  const currentLocationId = useLocationStore((s) => s.currentLocationId);

  const queryParams = useMemo(() => {
    const params = { ...initialFilters, ...overrides };
    if (enablePagination) {
      params.page = page;
      params.limit = params.limit || 20;
    }
    return params;
  }, [initialFilters, overrides, page, enablePagination]);

  const queryKey = useMemo(
    () => ['tasks', queryParams, { locationId: currentLocationId }],
    [queryParams, currentLocationId]
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchTasks(queryParams),
  });

  const tasks = useMemo(() => data?.data || EMPTY_ARRAY, [data]);
  const errorMessage = useMemo(() => error?.message || (error ? String(error) : null), [error]);

  return {
    tasks,
    meta: data?.meta || null,
    loading: isLoading,
    error: errorMessage,
    filters: queryParams,
    setFilters,
    page,
    setPage,
    refresh: refetch,
  };
};

export default useTasks;

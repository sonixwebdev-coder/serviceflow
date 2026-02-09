import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTasks } from '../services/taskService';
import useLocationStore from '../state/useLocationStore';

const EMPTY_ARRAY = [];

const useTasks = (initialFilters = {}, options = {}) => {
  const { enablePagination = false } = options;
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(initialFilters);
  const currentLocationId = useLocationStore((s) => s.currentLocationId);

  const queryParams = useMemo(() => {
    const params = { ...filters };
    if (enablePagination) {
      params.page = page;
      params.limit = filters.limit || 20;
    }
    return params;
  }, [filters, page, enablePagination]);

  const queryKey = useMemo(() => ['tasks', queryParams, { locationId: currentLocationId }], [queryParams, currentLocationId]);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
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
    filters,
    setFilters,
    page,
    setPage,
    refresh: refetch,
  };
};

export default useTasks;

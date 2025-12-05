import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTimeTracking } from '../services/timeTrackingService';

const EMPTY_ARRAY = [];

const useTimeTracking = (initialFilters = {}, options = {}) => {
  const { enablePagination = false } = options;
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(initialFilters);

  const queryParams = useMemo(() => {
    const params = { ...filters };
    if (enablePagination) {
      params.page = page;
      params.limit = filters.limit || 20;
    }
    return params;
  }, [filters, page, enablePagination]);

  const queryKey = useMemo(() => ['time-tracking', queryParams], [queryParams]);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => fetchTimeTracking(queryParams),
  });

  const records = useMemo(() => data?.data || EMPTY_ARRAY, [data]);

  return {
    records,
    meta: data?.meta || null,
    loading: isLoading,
    error,
    filters,
    setFilters,
    page,
    setPage,
    refresh: refetch,
  };
};

export default useTimeTracking;

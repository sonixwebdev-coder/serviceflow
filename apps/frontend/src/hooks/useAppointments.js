import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAppointments } from '../services/appointmentService';

const EMPTY_ARRAY = [];

export const useAppointments = (initialParams = {}, options = {}) => {
  const { enablePagination = false } = options;
  const [page, setPage] = useState(1);
  const [params, setParams] = useState(initialParams);

  const queryParams = useMemo(() => {
    const mergedParams = { ...params };
    if (enablePagination) {
      mergedParams.page = page;
      mergedParams.limit = params.limit || 20;
    }
    return mergedParams;
  }, [params, page, enablePagination]);

  const queryKey = useMemo(() => ['appointments', queryParams], [queryParams]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchAppointments(queryParams),
  });

  const appointments = useMemo(() => data?.data || EMPTY_ARRAY, [data]);
  const errorMessage = useMemo(() => error?.message || (error ? String(error) : null), [error]);

  return {
    data: appointments,
    meta: data?.meta || null,
    loading: isLoading,
    error: errorMessage,
    params,
    setParams,
    page,
    setPage,
    refetch,
  };
};

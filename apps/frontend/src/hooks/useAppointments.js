import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAppointments } from '../services/appointmentService';

const EMPTY_ARRAY = [];

export const useAppointments = (initialParams = {}, options = {}) => {
  const { enablePagination = false } = options;
  const [page, setPage] = useState(1);
  const [overrides, setParams] = useState({});

  const queryParams = useMemo(() => {
    const mergedParams = { ...initialParams, ...overrides };
    if (enablePagination && !mergedParams.from && !mergedParams.to) {
      mergedParams.page = page;
      mergedParams.limit = mergedParams.limit || 20;
    }
    return mergedParams;
  }, [initialParams, overrides, page, enablePagination]);

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
    params: queryParams,
    setParams,
    page,
    setPage,
    refetch,
  };
};

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchNotifications } from '../services/notificationService';

const useNotifications = (initialFilters = {}) => {
  const [filters, setFilters] = useState(initialFilters);
  const queryKey = useMemo(() => ['notifications', filters], [filters]);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => fetchNotifications(filters),
  });

  const errorMessage = useMemo(() => error?.message || (error ? String(error) : null), [error]);

  return {
    notifications: data || [],
    loading: isLoading,
    error: errorMessage,
    filters,
    setFilters,
    refresh: refetch,
  };
};

export default useNotifications;

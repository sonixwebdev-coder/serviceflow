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

  return {
    notifications: data || [],
    loading: isLoading,
    error,
    filters,
    setFilters,
    refresh: refetch,
  };
};

export default useNotifications;

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchUsers } from '../services/userService';

const useUsers = (initialFilters = {}, options = {}) => {
  const { enabled = true } = options;
  const [overrides, setFilters] = useState({});
  const queryParams = useMemo(() => ({ ...initialFilters, ...overrides }), [initialFilters, overrides]);
  const queryKey = useMemo(() => ['users', queryParams], [queryParams]);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    enabled,
    queryFn: () => fetchUsers(queryParams),
  });

  const errorMessage = useMemo(() => error?.message || (error ? String(error) : null), [error]);

  return {
    users: data || [],
    loading: isLoading,
    error: errorMessage,
    filters: queryParams,
    setFilters,
    refresh: refetch,
  };
};

export default useUsers;

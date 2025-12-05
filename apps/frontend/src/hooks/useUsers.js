import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchUsers } from '../services/userService';

const useUsers = (initialFilters = {}, options = {}) => {
  const { enabled = true } = options;
  const [filters, setFilters] = useState(initialFilters);
  const queryKey = useMemo(() => ['users', filters], [filters]);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    enabled,
    queryFn: () => fetchUsers(filters),
  });

  return {
    users: data || [],
    loading: isLoading,
    error,
    filters,
    setFilters,
    refresh: refetch,
  };
};

export default useUsers;

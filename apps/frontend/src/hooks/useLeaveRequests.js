import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchLeaveRequests } from '../services/leaveRequestService';

const EMPTY_ARRAY = [];

const useLeaveRequests = (initialFilters = {}) => {
  const [filters, setFilters] = useState(initialFilters);
  const queryKey = useMemo(() => ['timeoff', filters], [filters]);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => fetchLeaveRequests(filters),
  });

  const leaveRequests = useMemo(() => data || EMPTY_ARRAY, [data]);

  return {
    leaveRequests,
    loading: isLoading,
    error,
    filters,
    setFilters,
    refresh: refetch,
  };
};

export default useLeaveRequests;

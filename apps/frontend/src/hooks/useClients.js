import { useQuery } from '@tanstack/react-query';
import API from '../utils/api';

const fetchClients = async (params) => {
  const response = await API.get('/clients', { params });
  return response.data?.data || response.data;
};

export const useClients = (params) => {
  return useQuery({
    queryKey: ['clients', params],
    queryFn: () => fetchClients(params),
    staleTime: 30000, // 30s - consistent with useClientSearch
  });
};

/**
 * Search clients across multiple fields with debouncing
 * @param {string} query - Search query string
 * @param {object} options - Query options
 * @returns {object} React Query result
 */
const searchClients = async (query, options = {}) => {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const response = await API.get('/clients/search', {
    params: {
      q: query,
      limit: options.limit || 20,
    },
  });
  return response.data?.data || response.data;
};

export const useClientSearch = (query, options = {}) => {
  return useQuery({
    queryKey: ['clients', 'search', query],
    queryFn: () => searchClients(query, options),
    enabled: Boolean(query && query.trim().length >= 2), // Only search if query is at least 2 chars
    staleTime: 30000, // Cache results for 30 seconds
  });
};

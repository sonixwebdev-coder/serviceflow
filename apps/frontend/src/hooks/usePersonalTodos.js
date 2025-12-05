import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../utils/api';

/**
 * Fetch personal todos with optional filters
 * @param {Object} filters - Optional filters (isCompleted, priority)
 * @returns {Promise<Array>} Array of personal todos
 */
const fetchPersonalTodos = async (filters = {}) => {
  const response = await API.get('/personal-todos', { params: filters });
  return response.data?.data || response.data;
};

/**
 * Fetch a single personal todo by ID
 * @param {string} todoId - Todo ID
 * @returns {Promise<Object>} Personal todo object
 */
const fetchPersonalTodo = async (todoId) => {
  const response = await API.get(`/personal-todos/${todoId}`);
  return response.data?.data || response.data;
};

/**
 * Create a new personal todo
 * @param {Object} payload - Todo data
 * @returns {Promise<Object>} Created todo
 */
const createPersonalTodo = async (payload) => {
  const response = await API.post('/personal-todos', payload);
  return response.data?.data || response.data;
};

/**
 * Update an existing personal todo
 * @param {Object} params - {todoId, payload}
 * @returns {Promise<Object>} Updated todo
 */
const updatePersonalTodo = async ({ todoId, payload }) => {
  const response = await API.patch(`/personal-todos/${todoId}`, payload);
  return response.data?.data || response.data;
};

/**
 * Delete a personal todo
 * @param {string} todoId - Todo ID
 * @returns {Promise<void>}
 */
const deletePersonalTodo = async (todoId) => {
  await API.delete(`/personal-todos/${todoId}`);
};

/**
 * Toggle todo completion status
 * @param {Object} params - {todoId, isCompleted}
 * @returns {Promise<Object>} Updated todo
 */
const togglePersonalTodo = async ({ todoId, isCompleted }) => {
  const response = await API.patch(`/personal-todos/${todoId}`, { isCompleted });
  return response.data?.data || response.data;
};

/**
 * Hook to fetch list of personal todos with optional filters
 * @param {Object} filters - Optional filters (isCompleted, priority)
 * @returns {Object} Query result with todos data
 */
export const usePersonalTodos = (filters = {}) => {
  return useQuery({
    queryKey: ['personalTodos', filters],
    queryFn: () => fetchPersonalTodos(filters),
    staleTime: 30000, // Cache for 30 seconds
  });
};

/**
 * Hook to fetch a single personal todo
 * @param {string} todoId - Todo ID
 * @param {Object} options - Query options
 * @returns {Object} Query result with todo data
 */
export const usePersonalTodo = (todoId, options = {}) => {
  return useQuery({
    queryKey: ['personalTodo', todoId],
    queryFn: () => fetchPersonalTodo(todoId),
    enabled: Boolean(todoId) && (options.enabled !== false),
    staleTime: 30000,
  });
};

/**
 * Hook to create a new personal todo
 * @returns {Object} Mutation object
 */
export const useCreatePersonalTodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPersonalTodo,
    onSuccess: () => {
      // Invalidate all personal todos queries to refetch
      queryClient.invalidateQueries({ queryKey: ['personalTodos'] });
    },
  });
};

/**
 * Hook to update an existing personal todo
 * @returns {Object} Mutation object
 */
export const useUpdatePersonalTodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePersonalTodo,
    onSuccess: (data, variables) => {
      // Invalidate all personal todos queries
      queryClient.invalidateQueries({ queryKey: ['personalTodos'] });
      // Invalidate specific todo query
      queryClient.invalidateQueries({ queryKey: ['personalTodo', variables.todoId] });
    },
  });
};

/**
 * Hook to delete a personal todo
 * @returns {Object} Mutation object
 */
export const useDeletePersonalTodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePersonalTodo,
    onSuccess: () => {
      // Invalidate all personal todos queries
      queryClient.invalidateQueries({ queryKey: ['personalTodos'] });
    },
  });
};

/**
 * Hook to toggle personal todo completion status
 * @returns {Object} Mutation object
 */
export const useTogglePersonalTodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: togglePersonalTodo,
    onSuccess: (data, variables) => {
      // Invalidate all personal todos queries
      queryClient.invalidateQueries({ queryKey: ['personalTodos'] });
      // Invalidate specific todo query
      queryClient.invalidateQueries({ queryKey: ['personalTodo', variables.todoId] });
    },
  });
};

export default {
  usePersonalTodos,
  usePersonalTodo,
  useCreatePersonalTodo,
  useUpdatePersonalTodo,
  useDeletePersonalTodo,
  useTogglePersonalTodo,
};

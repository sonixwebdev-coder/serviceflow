import API from '../utils/api';

export const fetchTasks = async (params = {}) => {
  const response = await API.get('/tasks', { params });
  // Check if response has paginated structure (data.data.meta exists)
  if (response.data.data?.meta) {
    return { data: response.data.data.data, meta: response.data.data.meta }; // Paginated
  }
  return { data: response.data.data, meta: null }; // Backward compatible
};

export const fetchTaskComments = async (taskId) => {
  const response = await API.get(`/tasks/${taskId}/comments`);
  return response.data.data;
};

export const fetchTaskById = async (taskId) => {
  const response = await API.get(`/tasks/${taskId}`);
  return response.data.data;
};

export const createTask = async (payload) => {
  const response = await API.post('/tasks', payload);
  return response.data.data;
};

export const updateTask = async (taskId, payload) => {
  const response = await API.put(`/tasks/${taskId}`, payload);
  return response.data.data;
};

export const addTaskComment = async (taskId, payload) => {
  const response = await API.post(`/tasks/${taskId}/comments`, payload);
  return response.data.data;
};

export const deleteTask = async (taskId) => {
  await API.delete(`/tasks/${taskId}`);
};

export default {
  fetchTasks,
  fetchTaskById,
  fetchTaskComments,
  createTask,
  updateTask,
  addTaskComment,
  deleteTask,
};

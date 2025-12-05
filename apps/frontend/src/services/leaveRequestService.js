import API from '../utils/api';

export const fetchLeaveRequests = async (params = {}) => {
  const response = await API.get('/leave-requests', { params });
  return response.data.data;
};

export const submitLeaveRequest = async (payload) => {
  const response = await API.post('/leave-requests', payload);
  return response.data.data;
};

export const approveLeaveRequest = async (requestId, payload = {}) => {
  const response = await API.put(`/leave-requests/${requestId}/approve`, payload);
  return response.data.data;
};

export const rejectLeaveRequest = async (requestId, payload) => {
  await API.put(`/leave-requests/${requestId}/reject`, payload);
};

export const createMedicalLeave = async (payload) => {
  const response = await API.post('/leave-requests/medical', payload);
  return response.data.data;
};

export default {
  fetchLeaveRequests,
  submitLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  createMedicalLeave,
};

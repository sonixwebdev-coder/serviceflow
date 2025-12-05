import API from '../utils/api';

export const fetchAppointments = async (params = {}) => {
  const response = await API.get('/appointments', { params });
  // Check if response has paginated structure (data.data.meta exists)
  if (response.data.data?.meta) {
    return { data: response.data.data.data, meta: response.data.data.meta }; // Paginated
  }
  return { data: response.data?.data || response.data, meta: null }; // Backward compatible
};

export const fetchAppointmentById = async (appointmentId) => {
  const response = await API.get(`/appointments/${appointmentId}`);
  return response.data?.data || response.data;
};

export const createAppointment = async (payload) => {
  const response = await API.post('/appointments', payload);
  return response.data?.data || response.data;
};

export const updateAppointment = async (appointmentId, payload) => {
  const response = await API.patch(`/appointments/${appointmentId}`, payload);
  return response.data?.data || response.data;
};

export const cancelAppointment = async (appointmentId, reason) => {
  const response = await API.post(`/appointments/${appointmentId}/cancel`, { reason });
  return response.data?.data || response.data;
};

export const fetchAppointmentMessages = async (appointmentId) => {
  const response = await API.get(`/appointments/${appointmentId}/messages`);
  return response.data?.data || response.data;
};

export const sendAppointmentMessage = async (appointmentId, payload) => {
  const response = await API.post(`/appointments/${appointmentId}/messages`, payload);
  return response.data?.data || response.data;
};

export const fetchServiceOrder = async (appointmentId) => {
  const response = await API.get(`/appointments/${appointmentId}/service-order`);
  return response.data?.data || response.data;
};

export const saveServiceOrder = async (appointmentId, payload) => {
  const response = await API.put(`/appointments/${appointmentId}/service-order`, payload);
  return response.data?.data || response.data;
};

export const downloadServiceOrderPdf = async (appointmentId, options = {}) => {
  const params = {};
  if (options.refresh) {
    params.refresh = 'true';
  }

  const response = await API.get(`/appointments/${appointmentId}/service-order/pdf`, {
    responseType: 'blob',
    headers: {
      Accept: 'application/pdf',
    },
    params,
  });

  // Extract filename from Content-Disposition header
  let filename = 'service-order.pdf';
  const contentDisposition = response.headers['content-disposition'];
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1].replace(/['"]/g, '');
    }
  }

  return { blob: response.data, filename };
};

export default {
  fetchAppointments,
  fetchAppointmentById,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  fetchAppointmentMessages,
  sendAppointmentMessage,
  fetchServiceOrder,
  saveServiceOrder,
  downloadServiceOrderPdf,
};

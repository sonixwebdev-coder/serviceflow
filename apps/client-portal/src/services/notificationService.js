import api from '@/utils/api';

export const getNotifications = async (params = {}) => {
  const response = await api.get('/portal/notifications', { params });
  return response.data;
};

export const getUnreadCount = async () => {
  const response = await api.get('/portal/notifications/unread-count');
  return response.data;
};

export const markNotificationRead = async (notificationId) => {
  const response = await api.post(`/portal/notifications/${notificationId}/read`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await api.post('/portal/notifications/read-all');
  return response.data;
};

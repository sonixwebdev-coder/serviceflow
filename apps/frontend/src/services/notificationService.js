import API from '../utils/api';

export const fetchNotifications = async (params = {}) => {
  const response = await API.get('/notifications', { params });
  return response.data.data;
};

export const markNotificationRead = async (notificationId) => {
  await API.put(`/notifications/${notificationId}/read`);
};

export const markNotificationsRead = async (notificationIds = []) => {
  await Promise.all(notificationIds.map((notificationId) => markNotificationRead(notificationId)));
};

export default {
  fetchNotifications,
  markNotificationRead,
  markNotificationsRead,
};

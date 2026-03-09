import api from '../utils/api';

export const messageService = {
  /**
   * Get messages for an appointment
   */
  async getMessages(appointmentId) {
    const response = await api.get(`/portal/appointments/${appointmentId}/messages`);
    return response.data;
  },

  /**
   * Send a text message
   */
  async sendMessage(appointmentId, { body, type = 'TEXT', metadata }) {
    const response = await api.post(`/portal/appointments/${appointmentId}/messages`, {
      body,
      type,
      metadata,
    });
    return response.data;
  },

  /**
   * Mark messages as read
   */
  async markAsRead(appointmentId) {
    const response = await api.post(`/portal/appointments/${appointmentId}/messages/mark-read`);
    return response.data;
  },

  /**
   * Get unread message count
   */
  async getUnreadCount(appointmentId) {
    const response = await api.get(`/portal/appointments/${appointmentId}/messages/unread-count`);
    return response.data;
  },

  /**
   * Upload a file attachment
   */
  async uploadFile(appointmentId, file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(
      `/portal/appointments/${appointmentId}/messages/upload-file`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  /**
   * Upload a voice message
   */
  async uploadVoice(appointmentId, audioBlob, duration) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice-message.webm');
    if (duration) {
      formData.append('duration', duration.toString());
    }

    const response = await api.post(
      `/portal/appointments/${appointmentId}/messages/upload-voice`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },
};

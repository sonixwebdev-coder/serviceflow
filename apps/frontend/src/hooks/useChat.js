import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../utils/api';

/**
 * React Query hooks for chat API integration
 */

// ========== CHANNELS ==========

/**
 * Fetch all channels for the current user
 */
export function useChannels(filters = {}) {
  return useQuery({
    queryKey: ['chat', 'channels', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.archived !== undefined) params.append('archived', filters.archived);

      const res = await API.get(`/chat/channels?${params.toString()}`);
      return res.data.data;
    },
  });
}

/**
 * Fetch a single channel by ID
 */
export function useChannel(channelId) {
  return useQuery({
    queryKey: ['chat', 'channels', channelId],
    queryFn: async () => {
      const res = await API.get(`/chat/channels/${channelId}`);
      return res.data.data;
    },
    enabled: !!channelId,
  });
}

/**
 * Create a new channel
 */
export function useCreateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const res = await API.post('/chat/channels', data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'channels'] });
    },
  });
}

/**
 * Update a channel
 */
export function useUpdateChannel(channelId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates) => {
      const res = await API.patch(`/chat/channels/${channelId}`, updates);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'channels'] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'channels', channelId] });
    },
  });
}

/**
 * Archive a channel
 */
export function useArchiveChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channelId) => {
      const res = await API.post(`/chat/channels/${channelId}/archive`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'channels'] });
    },
  });
}

/**
 * Leave a channel
 */
export function useLeaveChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channelId) => {
      const res = await API.post(`/chat/channels/${channelId}/leave`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'channels'] });
    },
  });
}

// ========== MEMBERS ==========

/**
 * Fetch channel members
 */
export function useChannelMembers(channelId) {
  return useQuery({
    queryKey: ['chat', 'channels', channelId, 'members'],
    queryFn: async () => {
      const res = await API.get(`/chat/channels/${channelId}/members`);
      return res.data.data;
    },
    enabled: !!channelId,
  });
}

/**
 * Add members to a channel
 */
export function useAddMembers(channelId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userIds) => {
      const res = await API.post(`/chat/channels/${channelId}/members`, { userIds });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'channels', channelId] });
    },
  });
}

/**
 * Remove a member from a channel
 */
export function useRemoveMember(channelId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId) => {
      const res = await API.delete(`/chat/channels/${channelId}/members/${userId}`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'channels', channelId] });
    },
  });
}

// ========== MESSAGES ==========

/**
 * Fetch messages for a channel
 */
export function useMessages(channelId, options = {}) {
  return useQuery({
    queryKey: ['chat', 'messages', channelId, options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit);
      if (options.before) params.append('before', options.before);
      if (options.after) params.append('after', options.after);

      const res = await API.get(`/chat/channels/${channelId}/messages?${params.toString()}`);
      return res.data.data;
    },
    enabled: !!channelId,
    staleTime: 0, // Always fetch fresh data
  });
}

/**
 * Send a message
 */
export function useSendMessage(channelId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageData) => {
      const res = await API.post(`/chat/channels/${channelId}/messages`, messageData);
      return res.data.data;
    },
    onSuccess: () => {
      // Don't invalidate - rely on real-time updates
      // queryClient.invalidateQueries({ queryKey: ['chat', 'messages', channelId] });
    },
  });
}

/**
 * Update a message
 */
export function useUpdateMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, body }) => {
      const res = await API.patch(`/chat/messages/${messageId}`, { body });
      return res.data.data;
    },
    onSuccess: () => {
      // Rely on real-time updates
    },
  });
}

/**
 * Delete a message
 */
export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId) => {
      const res = await API.delete(`/chat/messages/${messageId}`);
      return res.data.data;
    },
    onSuccess: () => {
      // Rely on real-time updates
    },
  });
}

// ========== FILE UPLOADS ==========

/**
 * Upload a file with message (creates message and attachment in one request)
 */
export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, formData }) => {
      const res = await API.post(`/chat/channels/${channelId}/upload-file`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data;
    },
    onSuccess: (data, variables) => {
      // Real-time updates will handle the message, but invalidate for safety
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', variables.channelId] });
    },
  });
}

/**
 * Upload a file attachment to an existing message
 */
export function useUploadFileToMessage(messageId) {
  return useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      const res = await API.post(`/chat/messages/${messageId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data;
    },
  });
}

/**
 * Upload a voice message
 */
export function useUploadVoice(channelId) {
  return useMutation({
    mutationFn: async (audioBlob) => {
      const formData = new FormData();
      formData.append('voice', audioBlob, 'voice-message.webm');

      const res = await API.post(`/chat/channels/${channelId}/upload-voice`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data;
    },
  });
}

// ========== READ RECEIPTS ==========

/**
 * Mark a channel as read
 */
export function useMarkAsRead(channelId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await API.post(`/chat/channels/${channelId}/read`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'unread'] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'channels', channelId, 'unread'] });
    },
  });
}

/**
 * Get unread count for a specific channel
 */
export function useUnreadCount(channelId) {
  return useQuery({
    queryKey: ['chat', 'channels', channelId, 'unread'],
    queryFn: async () => {
      const res = await API.get(`/chat/channels/${channelId}/unread-count`);
      return res.data.data.count;
    },
    enabled: !!channelId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Get unread counts for all channels
 */
export function useUnreadCounts() {
  return useQuery({
    queryKey: ['chat', 'unread'],
    queryFn: async () => {
      const res = await API.get('/chat/unread');
      return res.data.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// ========== DIRECT MESSAGES ==========

/**
 * Create or get a DM channel
 */
export function useCreateDM() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId) => {
      const res = await API.post('/chat/dm', { userId });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'channels'] });
    },
  });
}

/**
 * Create a group DM
 */
export function useCreateGroupDM() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userIds, name }) => {
      const res = await API.post('/chat/group-dm', { userIds, name });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'channels'] });
    },
  });
}

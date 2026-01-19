import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/services/notificationService';
import { getSocket } from '@/lib/socket';

export const useNotifications = () => {
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications({ limit: 50 }),
  });

  const unreadCountQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadCount,
  });

  // Handle real-time notification updates
  const handleNewNotification = useCallback(
    (notification) => {
      queryClient.setQueryData(['notifications'], (old = []) => {
        if (old.some((n) => n.id === notification.id)) return old;
        return [notification, ...old];
      });
      queryClient.invalidateQueries(['notifications', 'unread-count']);
    },
    [queryClient]
  );

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('portal:notification:new', handleNewNotification);

    return () => {
      socket.off('portal:notification:new', handleNewNotification);
    };
  }, [handleNewNotification]);

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: (_, notificationId) => {
      queryClient.setQueryData(['notifications'], (old = []) =>
        old.map((n) =>
          n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        )
      );
      queryClient.invalidateQueries(['notifications', 'unread-count']);
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.setQueryData(['notifications'], (old = []) =>
        old.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      queryClient.invalidateQueries(['notifications', 'unread-count']);
    },
  });

  return {
    notifications: notificationsQuery.data || [],
    loading: notificationsQuery.isLoading,
    error: notificationsQuery.error,
    unreadCount: unreadCountQuery.data?.count || 0,
    refetch: notificationsQuery.refetch,
    markRead: markReadMutation.mutate,
    markingRead: markReadMutation.isPending,
    markAllRead: markAllReadMutation.mutate,
    markingAllRead: markAllReadMutation.isPending,
  };
};

export default useNotifications;

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  isPushSupported,
  hasNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed,
  getNotificationPreferences,
  updateNotificationPreferences as updatePreferencesService,
} from '../services/pushNotificationService';
import useToast from '../context/useToast';

const usePushNotifications = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check subscription status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await isSubscribed();
        setSubscribed(status);
      } catch (error) {
        console.error('Failed to check subscription status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, []);

  // Get notification preferences
  const {
    data: preferences,
    isLoading: preferencesLoading,
    isFetching: preferencesFetching,
    refetch: refetchPreferences,
  } = useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: getNotificationPreferences,
    retry: 1,
  });

  // Subscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: subscribeToPush,
    onSuccess: () => {
      setSubscribed(true);
      queryClient.invalidateQueries(['notificationPreferences']);
      showToast({
        title: 'Abonat',
        description: 'Esti acum abonat la notificari push',
        type: 'success',
      });
    },
    onError: (error) => {
      showToast({
        title: 'Abonare esuata',
        description: error.message || 'Nu s-a putut realiza abonarea la notificari push',
        type: 'error',
      });
    },
  });

  // Unsubscribe mutation
  const unsubscribeMutation = useMutation({
    mutationFn: unsubscribeFromPush,
    onSuccess: () => {
      setSubscribed(false);
      queryClient.invalidateQueries(['notificationPreferences']);
      showToast({
        title: 'Dezabonat',
        description: 'Ai fost dezabonat de la notificari push',
        type: 'success',
      });
    },
    onError: (error) => {
      showToast({
        title: 'Dezabonare esuata',
        description: error.message || 'Nu s-a putut realiza dezabonarea de la notificari push',
        type: 'error',
      });
    },
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: updatePreferencesService,
    onSuccess: () => {
      queryClient.invalidateQueries(['notificationPreferences']);
      showToast({
        title: 'Preferinte actualizate',
        description: 'Preferintele tale de notificari au fost salvate',
        type: 'success',
      });
    },
    onError: (error) => {
      showToast({
        title: 'Actualizare esuata',
        description: error.message || 'Nu s-au putut actualiza preferintele',
        type: 'error',
      });
    },
  });

  const subscribe = useCallback(async () => {
    if (!isPushSupported()) {
      showToast({
        title: 'Nesuportat',
        description: 'Notificarile push nu sunt suportate in acest browser',
        type: 'error',
      });
      return;
    }

    if (!hasNotificationPermission()) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        showToast({
          title: 'Permisiune refuzata',
          description: 'Te rugam sa permiti notificarile din setarile browser-ului',
          type: 'warning',
        });
        return;
      }
    }

    subscribeMutation.mutate();
  }, [subscribeMutation, showToast]);

  const unsubscribe = useCallback(() => {
    unsubscribeMutation.mutate();
  }, [unsubscribeMutation]);

  const updatePreferences = useCallback(
    (updates) => {
      updatePreferencesMutation.mutate(updates);
    },
    [updatePreferencesMutation]
  );

  return {
    subscribed,
    loading,
    preferences,
    preferencesLoading,
    preferencesFetching,
    subscribe,
    unsubscribe,
    updatePreferences,
    subscribing: subscribeMutation.isPending,
    unsubscribing: unsubscribeMutation.isPending,
    updatingPreferences: updatePreferencesMutation.isPending,
    supported: isPushSupported(),
    hasPermission: hasNotificationPermission(),
    refetchPreferences,
  };
};

export default usePushNotifications;

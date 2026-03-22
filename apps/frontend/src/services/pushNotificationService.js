import API from '../utils/api';

/**
 * URL base64 to Uint8Array conversion
 * Required for subscribing to push notifications
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if push notifications are supported
 */
export const isPushSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

/**
 * Check if notification permission is granted
 */
export const hasNotificationPermission = () => {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted';
};

/**
 * Request notification permission from user
 */
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    throw new Error('This browser does not support notifications');
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

/**
 * Register service worker
 */
export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported');
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    });
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    throw error;
  }
};

/**
 * Get VAPID public key from backend
 */
export const getVapidPublicKey = async () => {
  try {
    const response = await API.get('/push-notifications/vapid-public-key');
    return response.data.data.publicKey;
  } catch (error) {
    console.error('Failed to get VAPID public key:', error);
    throw error;
  }
};

/**
 * Subscribe to push notifications
 */
export const subscribeToPush = async () => {
  try {
    // Detect Brave browser
    const isBrave = navigator.brave && (await navigator.brave.isBrave());
    if (isBrave) {
      console.warn('Brave browser detected - ensure push notifications are enabled in Brave Shields settings');
    }

    // 1. Get VAPID public key first
    const vapidPublicKey = await getVapidPublicKey();
    const convertedKey = urlBase64ToUint8Array(vapidPublicKey);

    // 2. Unregister all existing service workers to clear cache
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        await existingSubscription.unsubscribe();
      }
      await registration.unregister();
    }

    // 3. Wait a bit for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // 4. Register fresh service worker
    const registration = await registerServiceWorker();

    // 5. Wait for service worker to be active
    await navigator.serviceWorker.ready;

    // 6. Request notification permission
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      throw new Error('Notification permission denied');
    }

    // 7. Subscribe to push with fresh registration
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey,
    });

    // 8. Send subscription to backend
    const response = await API.post('/push-notifications/subscribe', {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
        auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')))),
      },
      userAgent: navigator.userAgent,
    });

    return response.data.data;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);

    // Enhanced error messages for common issues
    if (error.name === 'AbortError') {
      const isBrave = navigator.brave && (await navigator.brave.isBrave().catch(() => false));
      if (isBrave) {
        throw new Error('Brave browser blocheaza notificarile push. Activeaza "Allow Google login buttons" si "Use Google Services for Push Messaging" in Brave Shields (brave://settings/privacy)');
      }
      throw new Error('Browser-ul blocheaza notificarile push. Verifica setarile de confidentialitate.');
    }

    throw error;
  }
};

/**
 * Unsubscribe from push notifications
 */
export const unsubscribeFromPush = async () => {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return { success: true };
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      return { success: true };
    }

    // Unsubscribe from push manager
    await subscription.unsubscribe();

    // Notify backend
    await API.post('/push-notifications/unsubscribe', {
      endpoint: subscription.endpoint,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
    throw error;
  }
};

/**
 * Check if user is subscribed
 */
export const isSubscribed = async () => {
  try {
    if (!isPushSupported()) {
      return false;
    }

    // Check if service worker is registered first
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return false;
    }

    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch (error) {
    console.error('Failed to check subscription status:', error);
    return false;
  }
};

/**
 * Get current push subscription
 */
export const getCurrentSubscription = async () => {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return null;
    }
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch (error) {
    console.error('Failed to get current subscription:', error);
    return null;
  }
};

/**
 * Get user's subscriptions from backend
 */
export const getUserSubscriptions = async () => {
  try {
    const response = await API.get('/push-notifications/subscriptions');
    return response.data.data;
  } catch (error) {
    console.error('Failed to get subscriptions:', error);
    throw error;
  }
};

/**
 * Get notification preferences
 */
export const getNotificationPreferences = async () => {
  try {
    const response = await API.get('/push-notifications/preferences');
    return response.data.data;
  } catch (error) {
    console.error('Failed to get notification preferences:', error);
    throw error;
  }
};

/**
 * Update notification preferences
 */
export const updateNotificationPreferences = async (preferences) => {
  try {
    const response = await API.put('/push-notifications/preferences', preferences);
    return response.data.data;
  } catch (error) {
    console.error('Failed to update notification preferences:', error);
    throw error;
  }
};

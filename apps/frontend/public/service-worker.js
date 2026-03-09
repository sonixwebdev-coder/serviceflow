/* eslint-disable no-restricted-globals */
// Service Worker for Push Notifications

const CACHE_NAME = 'forjait-v1';

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);

  let data = {
    title: 'ForjaIt CRM',
    body: 'You have a new notification',
    icon: '/logo192.png',
    badge: '/icons/badge.png',
    data: {},
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (error) {
    console.error('[Service Worker] Error parsing push data:', error);
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo192.png',
    badge: data.badge || '/icons/badge.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      {
        action: 'open',
        title: 'Open',
        icon: '/icons/open.png',
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/close.png',
      },
    ],
    tag: data.data?.type || 'notification',
    requireInteraction: false,
    silent: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event - handle user interaction
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Open the app or focus existing window
  const urlToOpen = event.notification.data?.url || '/';
  const promiseChain = clients
    .matchAll({
      type: 'window',
      includeUncontrolled: true,
    })
    .then((windowClients) => {
      // Check if there's already a window open
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then((client) => {
            // Navigate to the notification URL
            if ('navigate' in client) {
              return client.navigate(urlToOpen);
            }
          });
        }
      }

      // No window open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    });

  event.waitUntil(promiseChain);
});

// Message event - handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch event - optional: add network-first or cache-first strategy
self.addEventListener('fetch', (event) => {
  // For now, just pass through all requests
  // You can add caching strategies here later
  event.respondWith(fetch(event.request));
});

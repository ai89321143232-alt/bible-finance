// ============================================================
// Service Worker — Web Push уведомления
// ============================================================
// Обрабатывает push-события от push-сервисов (FCM, APNS).
// Работает в фоне, даже если PWA закрыто (Safari iOS 16.4+, Android Chrome).
// ============================================================

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Библия Финансов', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Библия Финансов';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-96.png',
    tag: data.tag || 'bible-finance',
    data: data.data || {},
    vibrate: [100, 50, 100],
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Активация service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Установка service worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

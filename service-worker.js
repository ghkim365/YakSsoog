const CACHE_NAME = 'yagssoog-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/camera.js',
  '/assets/YakSsoog_logo_500x500.png'
];

// Install Service Worker and cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((e) => console.log("SW: Caching skipped/failed", e));
    })
  );
  self.skipWaiting();
});

// Activate Service Worker and clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Fetch handler for offline support
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => {
        // Fallback for offline mode if resources are missing
        return caches.match('/index.html');
      });
    })
  );
});

// Listen for background notification messages from app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'TRIGGER_NOTIFICATION') {
    const { title, body } = event.data;
    
    self.registration.showNotification(title || '약쏘옥 복용 알림', {
      body: body || '약 복용할 시간입니다! 약을 드시고 앱에 기록해 주세요.',
      icon: '/assets/YakSsoog_logo_500x500.png',
      badge: '/assets/YakSsoog_logo_500x500.png',
      vibrate: [200, 100, 200],
      tag: 'yagssoog-pill-alarm',
      renotify: true,
      requireInteraction: true,
      data: { url: '/' }
    });
  }
});

// Open application on notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing app tab if open
      if (clientList.length > 0) {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes('/') && 'focus' in client) {
            return client.focus();
          }
        }
      }
      // Or open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

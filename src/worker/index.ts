// Custom service worker additions — merged into the generated SW by @ducanh2912/next-pwa.
// Runs in SW context (no DOM, no React).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sw = self as any;

sw.addEventListener('push', (event: any) => {
  if (!event.data) return;

  const data = event.data.json() as { title: string; body: string };

  event.waitUntil(
    sw.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: 'zigbee-alert',
      renotify: true,
    })
  );
});

sw.addEventListener('notificationclick', (event: any) => {
  event.notification.close();
  event.waitUntil(
    sw.clients.matchAll({ type: 'window' }).then((list: any[]) => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      return sw.clients.openWindow('/');
    })
  );
});

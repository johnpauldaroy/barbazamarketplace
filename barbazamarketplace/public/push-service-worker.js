self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (_) {
    payload = { title: 'e-KoopMart', body: event.data.text() };
  }

  event.waitUntil(self.registration.showNotification(payload.title || 'e-KoopMart', {
    body: payload.body || 'You have a new notification.',
    icon: payload.icon || '/logo192.png',
    badge: payload.badge || '/favicon-32.png',
    tag: payload.tag,
    renotify: true,
    data: { url: payload.url || '/merchant/orders' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/merchant/orders', self.location.origin).href;

  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => client.url.startsWith(self.location.origin));
    if (existing) {
      existing.navigate(targetUrl);
      return existing.focus();
    }
    return clients.openWindow(targetUrl);
  }));
});

/* Service worker de NutriPlot: recibe notificaciones push y abre el check-in al tocarlas. */
self.addEventListener('push', (event) => {
  const d = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(d.title || 'NutriPlot', {
      body: d.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'checkin-recordatorio',   // reemplaza un aviso anterior en lugar de apilarlos
      data: { url: d.url || '/checkin' },
    }),
  );
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/checkin';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ws) => {
      const w = ws.find((c) => c.url.includes(url));
      return w ? w.focus() : self.clients.openWindow(url);
    }),
  );
});

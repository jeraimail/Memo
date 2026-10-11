self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Tags en cours d'effacement volontaire : on ne les refait pas réapparaître
const clearingTags = new Set();

self.addEventListener('notificationclick', (event) => {
  const tag = event.notification.tag;
  const data = event.notification.data || {};
  const action = event.action;
  event.notification.close();

  if (action === 'clear') {
    clearingTags.add(tag);
    event.waitUntil((async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (allClients.length > 0) {
        allClients.forEach(c => c.postMessage({ type: 'memo-clear', catId: data.catId }));
        allClients[0].focus();
      } else {
        await self.clients.openWindow('./?clear=' + encodeURIComponent(data.catId || ''));
      }
    })());
    return;
  }

  // Action "Modifier" ou tap sur le corps de la notif
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const url = './?catview=' + encodeURIComponent(data.catId || '');
    for (const c of allClients) {
      if ('focus' in c) { c.postMessage({ type: 'memo-catview', catId: data.catId }); return c.focus(); }
    }
    return self.clients.openWindow(url);
  })());
});

self.addEventListener('notificationclose', (event) => {
  const tag = event.notification.tag;
  const data = event.notification.data || {};
  if (clearingTags.has(tag)) {
    clearingTags.delete(tag);
    return;
  }
  // Probable swipe (ou fermeture non voulue) : on la refait apparaître tant que
  // "Effacer" n'a pas été utilisé.
  event.waitUntil(new Promise(resolve => setTimeout(resolve, 700)).then(() => {
    return self.registration.showNotification(event.notification.title, {
      body: event.notification.body,
      tag: tag,
      requireInteraction: true,
      renotify: true,
      data: data,
      actions: event.notification.actions,
    });
  }));
});

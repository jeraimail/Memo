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

  if (action === 'clear') {
    event.notification.close();
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

  // Action "Modifier" ou tap sur le corps : on NE ferme PAS la notif,
  // elle doit rester affichée tant que "Effacer" n'est pas utilisé.
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const payload = { type: 'memo-catview', catId: data.catId, itemIds: data.itemIds || [] };
    for (const c of allClients) {
      if ('focus' in c) { c.postMessage(payload); return c.focus(); }
    }
    const qs = '?catview=' + encodeURIComponent(data.catId || '') +
      (data.itemIds && data.itemIds.length === 1 ? '&item=' + encodeURIComponent(data.itemIds[0]) : '');
    return self.clients.openWindow('./' + qs);
  })());
});

self.addEventListener('notificationclose', (event) => {
  const tag = event.notification.tag;
  if (clearingTags.has(tag)) {
    clearingTags.delete(tag);
    return;
  }
  // Probable swipe (ou fermeture non voulue) : on la refait apparaître tant que
  // "Effacer" n'a pas été utilisé.
  const data = event.notification.data || {};
  event.waitUntil(new Promise(resolve => setTimeout(resolve, 700)).then(() => {
    return self.registration.showNotification(event.notification.title, {
      body: event.notification.body,
      tag: tag,
      requireInteraction: true,
      renotify: true,
      icon: event.notification.icon,
      badge: event.notification.badge,
      data: data,
      actions: event.notification.actions,
    });
  }));
});

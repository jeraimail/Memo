self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  const tag = event.notification.tag;
  const data = event.notification.data || {};
  const action = event.action;

  if (action === 'clear') {
    event.notification.close();
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

  // Action "Modifier" ou tap sur le corps : on NE ferme PAS la notif ici,
  // c'est l'app elle-même qui la remettra à jour en sortant de l'édition.
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

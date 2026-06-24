// Service worker neutralisé (kill switch).
// Un service worker resté en cache figé pouvait servir une page blanche après une
// montée de version. Cette version se désinscrit, vide tous les caches et recharge
// les pages proprement. L'app ne réenregistre plus de service worker (voir app.js).
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.clients.claim();
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((c) => c.navigate(c.url));
  })());
});

// Aucune interception : tout passe directement au réseau.

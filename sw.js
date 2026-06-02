// Service Worker pour Ma Classe — fonctionnement hors ligne
const CACHE = 'ma-classe-v7';

// URLs externes à pré-cacher (libs PDF pour MEMO + xlsx pour MDC CFC)
const PRECACHE = [
  './',
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// À l'installation : mettre en cache la page principale + libs PDF
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => {
      // Tenter de cacher chaque ressource individuellement (sans échouer si une seule manque)
      return Promise.all(PRECACHE.map(url =>
        c.add(url).catch(() => {})
      ));
    })
  );
  self.skipWaiting();
});

// À l'activation : supprimer les anciens caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// À chaque requête : servir depuis le cache d'abord (offline-first)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) {
        // Mettre à jour le cache en arrière-plan si en ligne
        fetch(e.request).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
        }).catch(() => {});
        return cached;
      }
      // Pas en cache : aller chercher sur le réseau et mettre en cache
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        // Hors ligne et pas en cache : renvoyer la page principale pour la navigation
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html') || caches.match('./');
        }
      });
    })
  );
});

/*
 * Calculateur d'Énergie Stand : service worker (fonctionnement hors ligne une fois l'outil hébergé).
 * Fichier GÉNÉRÉ par scripts/build.js à partir de src/sw.js.
 */
'use strict';

const CACHE = 'calculateur-energie-stand-2.0.0-4f0bc26186c1';
const FICHIERS = ['./', './index.html', './app.html', './manifest.webmanifest', './icone.svg', './icone-180.png', './icone-192.png', './icone-512.png'];

self.addEventListener('install', (evenement) => {
  evenement.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.all(FICHIERS.map((f) => cache.add(f).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evenement) => {
  evenement.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== CACHE && c.startsWith('calculateur-energie-stand')).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

// Réseau d'abord (versions à jour), cache en secours (hors ligne).
self.addEventListener('fetch', (evenement) => {
  const requete = evenement.request;
  if (requete.method !== 'GET') return;
  if (new URL(requete.url).origin !== self.location.origin) return;
  evenement.respondWith(
    fetch(requete)
      .then((reponse) => {
        if (reponse && reponse.ok && reponse.type === 'basic') {
          const copie = reponse.clone();
          caches.open(CACHE).then((cache) => cache.put(requete, copie)).catch(() => null);
        }
        return reponse;
      })
      .catch(() =>
        caches
          .match(requete, { ignoreSearch: true })
          .then((r) => r || (requete.mode === 'navigate' ? caches.match('./app.html') : null))
          .then((r) => r || Response.error())
      )
  );
});

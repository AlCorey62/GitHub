// Calculette électro hors ligne : service worker limité aux pages de la calculette
// (enregistré depuis /calculette-electro/ et /en/electrical-calculator/ avec ce dossier pour portée).
// Pages : réseau d'abord, copie locale si pas de réseau. Fichiers (CSS, JS, polices, images) : copie locale d'abord.
const CACHE = "dse-calculette-v1";
const EXTRA = ["assets/js/elec.js", "assets/img/icon-192.png", "assets/img/icon-512.png", "assets/img/icon-maskable-512.png"];

// Met en cache la page de la calculette et tous les fichiers qu'elle charge
async function precache() {
  const cache = await caches.open(CACHE);
  const page = self.registration.scope;
  const res = await fetch(page, { cache: "reload" });
  if (!res.ok) return;
  const html = await res.clone().text();
  await cache.put(page, res);
  const urls = new Set(EXTRA.map((p) => new URL(p, self.location).href));
  for (const m of html.matchAll(/(?:href|src|srcset)="([^"]+)"/g)) {
    for (const part of m[1].split(",")) {
      const ref = part.trim().split(/\s+/)[0];
      if (!ref || ref.startsWith("#") || ref.startsWith("mailto:") || ref.startsWith("tel:")) continue;
      const url = new URL(ref, page);
      if (url.origin !== self.location.origin) continue;
      if (/\.(css|js|woff2|png|svg|webp|jpg|webmanifest|ico)$/.test(url.pathname)) urls.add(url.href);
    }
  }
  await Promise.all(
    [...urls].map((u) =>
      fetch(u, { cache: "reload" })
        .then((r) => (r.ok ? cache.put(u, r) : null))
        .catch(() => null)
    )
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().catch(() => null).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("dse-calculette-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    // Page : version en ligne si possible (mise à jour), sinon copie locale (lien partagé compris)
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(url.origin + url.pathname, copy));
          }
          return res;
        })
        .catch(() => caches.match(url.origin + url.pathname).then((r) => r || caches.match(self.registration.scope)))
    );
    return;
  }

  // Fichiers versionnés (?v=…) : la copie locale suffit ; sinon réseau, mis en cache au passage
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
    )
  );
});

// Service worker de Brick'it Up (généré par tools/build-app.mjs) : garde le jeu en cache pour jouer sans connexion.
// À chaque nouvelle version, le nom du cache change : l'ancien est effacé et les nouveaux fichiers sont téléchargés.
const CACHE = 'brick-it-up-__VERSION__';
const FILES = __FILES__;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Tout vient du cache de la version installée (page et code restent cohérents entre eux) ;
// le navigateur vérifie tout seul s'il existe un nouveau sw.js : la nouvelle version s'installe alors en arrière-plan.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const key = req.mode === 'navigate' ? './' : req;
  e.respondWith(caches.open(CACHE).then(c => c.match(key, { ignoreSearch: true })).then(hit => hit || fetch(req)));
});

// Basic offline cache for app shell (no tile caching)
const CACHE = 'parkour-shell-v2';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
});
self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (ASSETS.includes(new URL(request.url).pathname.replace(/\/+/g,'/'))) {
    e.respondWith(caches.match(request).then(r => r || fetch(request)));
  }
});

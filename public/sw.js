// Empty service worker to satisfy browser requests and avoid 500 errors on localhost
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  self.clients.claim();
});

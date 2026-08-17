const CACHE_NAME = 'flash-team-v1';
const STATIC_ASSETS = [
    './',
    './styles.css',
    './tailwind.css',
    './app-core.js',
    './app-navigation.js',
    './app-init.js',
    './app-session.js',
    './app-admin.js',
    './app-events.js',
    './app-team.js',
    './index.html',
    './events.html',
    './team.html'
];

self.addEventListener('install', function (e) {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(function (cache) { return cache.addAll(STATIC_ASSETS); })
            .then(function () { return self.skipWaiting(); })
    );
});

self.addEventListener('activate', function (e) {
    e.waitUntil(
        caches.keys().then(function (names) {
            return Promise.all(
                names.filter(function (n) { return n !== CACHE_NAME; })
                     .map(function (n) { return caches.delete(n); })
            );
        }).then(function () { return self.clients.claim(); })
    );
});

self.addEventListener('fetch', function (e) {
    if (e.request.method !== 'GET') return;
    if (e.request.url.indexOf('script.google.com') !== -1) return;
    if (e.request.url.indexOf('fonts.googleapis.com') !== -1) return;
    if (e.request.url.indexOf('fonts.gstatic.com') !== -1) return;

    e.respondWith(
        caches.match(e.request).then(function (cached) {
            if (cached) return cached;
            return fetch(e.request).then(function (response) {
                if (!response || response.status !== 200 || response.type !== 'basic') return response;
                var clone = response.clone();
                caches.open(CACHE_NAME).then(function (cache) { cache.put(e.request, clone); });
                return response;
            });
        }).catch(function () {
            if (e.request.destination === 'document') {
                return caches.match('./index.html');
            }
        })
    );
});

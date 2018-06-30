const dataCacheName = 'xconverter-cache-v1';
const filesToCache = [
    '/',
    '/index.html',
    'https://fonts.googleapis.com/icon?family=Material+Icons',
    'https://fonts.gstatic.com/s/materialicons/v38/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2',
    'https://cdnjs.cloudflare.com/ajax/libs/materialize/0.100.2/fonts/roboto/Roboto-Regular.woff2',
    'https://cdnjs.cloudflare.com/ajax/libs/materialize/0.100.2/css/materialize.min.css',
    '/css/style.css',
    'https://cdnjs.cloudflare.com/ajax/libs/materialize/0.100.2/js/materialize.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jquery/1.11.1/jquery.min.js',
    '/js/app.js'
];
// on install state
self.addEventListener('install', function(e){
    e.waitUntil(
        caches.open(dataCacheName).then(function(cache) {
            return cache.addAll(filesToCache);
        })
    );
});

// on activate state
self.addEventListener('activate', function(e){
    e.waitUntil(
        caches.keys().then(function(cacheNames){
            return Promise.all(
                cacheNames.filter(function(cacheName){
                    return cacheName.startsWith('wnes-') && cacheName !== dataCacheName;
                }).map(function(cacheName){
                    return caches.delete(cacheName);
                })
            );
        })
    );
});

// on fetch state
self.addEventListener('fetch', function(e){
    const requestUrl = new URL(e.request.url);
    e.respondWith(
        caches.match(e.request).then(function(response) {
            return response || fetch(e.request);
        })
    );
});

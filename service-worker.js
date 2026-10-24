const CACHE_NAME = "ppu-dashboard-v39";   // 🔁 change version on every update

const urlsToCache = [
    "./",
    "./index.html?v=39",
    "./manifest.json",
    "./service-worker.js",
    "https://raw.githubusercontent.com/debajitd1292/ppu/main/images/logo.png"
];


// 🔽 INSTALL
self.addEventListener("install", event => {
    console.log("Service Worker Installing...");

    self.skipWaiting();   // activate immediately

    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(urlsToCache);
        })
    );
});


// 🔽 ACTIVATE
self.addEventListener("activate", event => {
    console.log("Service Worker Activating...");

    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log("Deleting old cache:", cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});


// 🔽 FETCH
self.addEventListener("fetch", event => {

    let url = event.request.url;

    // ✅ 1. ALWAYS get fresh CSV (CRITICAL FIX)
    if (url.includes(".csv")) {
        event.respondWith(
            fetch(event.request, { cache: "no-store" })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // ✅ 2. Normal files → Network first, then cache
    event.respondWith(
        fetch(event.request)
            .then(response => {
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, response.clone());
                    return response;
                });
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );

});

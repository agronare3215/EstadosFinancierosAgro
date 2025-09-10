// sw.js (tolerante)
const CACHE_NAME = 'agronare-v3';

const ASSETS = [
    '/',                    // si sirves la raíz
    '/index.html',
    '/dist/index.html',
    '/style.css',
    '/src/main.js',
    '/manifest.json',
    '/public/icons/icon-16.png',
    '/public/icons/icon-32.png',
    '/public/icons/icon-180.png',
    '/public/icons/icon-512.png',
    '/favicon.ico'
];

self.addEventListener('install', (evt) => {
    evt.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        for (const url of ASSETS) {
            try {
                const req = new Request(url, { cache: 'reload' });
                const res = await fetch(req);
                if (res && res.ok) {
                    await cache.put(req, res.clone());
                } else {
                    console.warn('[SW] Skip precache (non-OK):', url, res && res.status);
                }
            } catch (e) {
                console.warn('[SW] Skip precache (error):', url, e);
            }
        }
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (evt) => {
    evt.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (evt) => {
    const req = evt.request;
    if (req.method !== 'GET') return;

    evt.respondWith((async () => {
        const cached = await caches.match(req);
        if (cached) {
            // revalidación en background
            evt.waitUntil((async () => {
                try {
                    const fresh = await fetch(req);
                    if (fresh && fresh.ok) {
                        const cache = await caches.open(CACHE_NAME);
                        await cache.put(req, fresh.clone());
                    }
                } catch {/* sin red */ }
            })());
            return cached;
        }
        try {
            const fresh = await fetch(req);
            if (fresh && fresh.ok) {
                const cache = await caches.open(CACHE_NAME);
                cache.put(req, fresh.clone());
            }
            return fresh;
        } catch {
            if (req.headers.get('accept')?.includes('text/html')) {
                return (await caches.match('/dist/index.html')) || (await caches.match('/index.html')) || Response.error();
            }
            return Response.error();
        }
    })());
});

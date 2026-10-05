// sw.js v3 — ağ öncelikli: güncellemeler anında gelir, internet yoksa önbellekten açılır
const CACHE = 'scrollary-shell-v3';
const SHELL = ['./', './index.html', './style.css', './config.js', './auth.js', './api.js', './ai.js', './ui.js', './reader.js', './sesli-asistan.js', './manifest.json', './icon.png', './splash.png'];

self.addEventListener('install', e => {
    self.skipWaiting();
    // Tek dosya 404 verse bile kurulum bozulmasın (eski sürümde script.js yoktu ve SW hiç kurulamıyordu)
    e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))));
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return; // RSS, proxy, Firebase vb. dokunulmaz
    e.respondWith(networkFirst(req));
});

async function networkFirst(req) {
    const cache = await caches.open(CACHE);
    try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 4000);
        const res = await fetch(req, { signal: ctrl.signal, cache: 'no-cache' });
        clearTimeout(timer);
        if (res.ok) cache.put(req, res.clone());
        return res;
    } catch (err) {
        return (await cache.match(req, { ignoreSearch: true })) ||
               (req.mode === 'navigate' ? await cache.match('./index.html') : Response.error());
    }
}

// api.js v3 — paralel + yarışmalı haber çekme (eski sürüm: sıralı, 3'erli, backend uyanana kadar bekliyordu)
const FEED_CONCURRENCY = 6;      // aynı anda kaç kaynak çekilsin
const AUTO_REFRESH_MS = 180000;  // sekme açıkken otomatik yenileme (3 dk)
const MAX_ARTICLES = 600;        // bellekte tutulacak en yeni haber sayısı
let lastFetchAt = 0;

async function fetchWithTimeout(resource, timeout = 10000, options = {}) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try { return await fetch(resource, { ...options, signal: controller.signal }); }
    finally { clearTimeout(id); }
}

// Görevleri gecikmeli başlatır, İLK başarılı olanı döndürür (hepsi başarısızsa reddeder)
function raceStaggered(tasks) {
    return Promise.any(tasks.map(({ delay = 0, run }) =>
        new Promise((resolve, reject) => setTimeout(() => run().then(resolve, reject), delay))));
}

function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function normLink(l) {
    try {
        const u = new URL(l);
        [...u.searchParams.keys()].forEach(k => { if (/^(utm_|fbclid|gclid|ref$)/i.test(k)) u.searchParams.delete(k); });
        u.hash = '';
        return u.href.replace(/\/$/, '');
    } catch (e) { return l; }
}

function htmlToText(html) {
    if (!html) return '';
    return (new DOMParser().parseFromString(html, 'text/html').body.textContent || '').replace(/\s+/g, ' ').trim();
}

// ---------- Kaynak çekme ----------
const FEED_ROUTES = [
    { delay: 0,    url: u => u, direct: true },
    { delay: 0,    url: u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}&disableCache=true` },
    { delay: 1200, url: u => `https://corsproxy.io/?url=${encodeURIComponent(u)}` },
    { delay: 2500, url: u => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}` }
];

function feedRoutes() {
    let wb = ''; try { wb = (localStorage.getItem('workerUrl') || window.SCROLLARY_WORKER || '').trim().replace(/\/+$/, ''); } catch (e) {}
    if (!wb) return FEED_ROUTES;
    return [{ delay: 0, url: u => `${wb}/raw?url=${encodeURIComponent(u)}` }, ...FEED_ROUTES.map(r => ({ ...r, delay: Math.max(r.delay, 1200) }))];
}

async function fetchFeedData(feed, opts = {}) {
    const T = opts.fast ? 7000 : 9000;
    const xmlTasks = feedRoutes().map(r => ({
        delay: r.delay,
        run: async () => {
            const res = await fetchWithTimeout(r.url(feed.url), T, { cache: 'no-store' });
            if (!res.ok) throw new Error('http ' + res.status);
            const text = await res.text();
            if (!/<(item|entry)[\s>]/i.test(text)) throw new Error('rss değil');
            const arts = parseXMLToArticles(text, feed);
            if (!arts.length) throw new Error('boş');
            return arts;
        }
    }));
    // Kendi backend'in (Render) uyuyor olabilir; yarışa katılır ama kimseyi bekletmez
    const backendTask = {
        delay: 0,
        run: async () => {
            const res = await fetchWithTimeout(`https://scrollary-api.onrender.com/api/fetch-news?url=${encodeURIComponent(feed.url)}`, 20000);
            if (!res.ok) throw new Error('backend');
            const data = await res.json();
            if (!data || !data.articles || !data.articles.length) throw new Error('boş');
            return data.articles.map(item => {
                let d = new Date(item.date);
                if (isNaN(d.getTime())) d = new Date();
                return { title: item.title || 'İsimsiz Haber', description: htmlToText(item.description).substring(0, 220), link: item.link || '#', image: item.image || '', content: item.content || '', source: feed.name, date: d, timestamp: d.getTime(), categories: feed.cat ? [feed.cat] : [] };
            });
        }
    };
    try { return await raceStaggered(opts.fast ? xmlTasks : [...xmlTasks, backendTask]); } catch (e) { return []; }
}

function parseXMLToArticles(textData, feed) {
    const xmlDoc = new DOMParser().parseFromString(textData, 'text/xml');
    const items = [...xmlDoc.getElementsByTagName('item'), ...xmlDoc.getElementsByTagName('entry')];
    const result = [];
    let baseUrl = '';
    try { baseUrl = new URL(feed.url).origin; } catch (e) {}
    const first = (el, ...names) => { for (const n of names) { const x = el.getElementsByTagName(n)[0] || el.getElementsByTagNameNS('*', n.split(':').pop())[0]; if (x) return x; } return null; };

    items.forEach(item => {
        try {
            const titleNode = item.getElementsByTagName('title')[0];
            const title = titleNode ? htmlToText(titleNode.textContent) : '';
            if (!title) return;

            // Atom'da birden çok <link> olabilir: rel=alternate'i tercih et
            let link = '';
            const links = Array.from(item.getElementsByTagName('link'));
            const alt = links.find(l => l.getAttribute('rel') === 'alternate') || links[0];
            if (alt) link = (alt.textContent || '').trim() || alt.getAttribute('href') || '';
            if (!link) { const g = item.getElementsByTagName('guid')[0]; if (g && /^http/.test(g.textContent)) link = g.textContent.trim(); }
            if (!link) return;

            const descNode = first(item, 'description', 'summary', 'content');
            const encNode = first(item, 'content:encoded', 'encoded');
            const rawDesc = descNode ? descNode.textContent : '';
            const rawFull = encNode ? encNode.textContent : '';
            const fullHtml = rawFull || rawDesc;

            let pubDate = new Date();
            const pn = first(item, 'pubDate', 'published', 'updated', 'date');
            if (pn && pn.textContent) { const p = new Date(pn.textContent.trim()); if (!isNaN(p.getTime())) pubDate = p; }
            if (pubDate.getTime() > Date.now() + 3600000) pubDate = new Date();

            let image = '';
            const enc = item.getElementsByTagName('enclosure')[0];
            const mc = first(item, 'media:content');
            const mt = first(item, 'media:thumbnail');
            if (enc && /image/.test(enc.getAttribute('type') || 'image') && enc.getAttribute('url')) image = enc.getAttribute('url');
            else if (mc && mc.getAttribute('url')) image = mc.getAttribute('url');
            else if (mt && mt.getAttribute('url')) image = mt.getAttribute('url');
            else { const m = fullHtml.match(/<img[^>]+src=["']([^"']+)["']/i); if (m) image = m[1]; }
            if (image.startsWith('//')) image = 'https:' + image;
            else if (image.startsWith('/')) image = baseUrl + image;
            image = image.replace(/^http:/, 'https:');

            // Feed tam metin veriyorsa okuma modu ağa hiç ihtiyaç duymaz
            let content = '';
            if (fullHtml.length > 600) {
                const d = new DOMParser().parseFromString(fullHtml, 'text/html');
                const ps = Array.from(d.querySelectorAll('p')).map(p => p.textContent.trim()).filter(t => t.length > 40);
                if (ps.join('').length > 500) content = ps.join('\n\n').substring(0, 8000);
            }
            const plain = htmlToText(rawDesc);
            let pubUrl = '';
            try { const sn = item.getElementsByTagName('source')[0]; if (sn && sn.getAttribute('url')) pubUrl = sn.getAttribute('url'); } catch (e) {}
            result.push({
                title, link, image, content, pubUrl,
                description: plain.length > 220 ? plain.substring(0, 220) + '…' : plain,
                source: feed.name, date: pubDate, timestamp: pubDate.getTime(),
                categories: feed.cat ? [feed.cat] : []
            });
        } catch (err) {}
    });
    return result;
}

// ---------- Hepsini çek ----------
async function fetchAllRSS(isSilent = false, isAuto = false) {
    if (isFetchingRefresh) return;
    if (!navigator.onLine) { if (!isAuto) showToastGlobal('📴 İnternet bağlantısı yok', 3000); if (isSilent) resetPullToRefresh(); return; }
    isFetchingRefresh = true;
    lastFetchAt = Date.now();

    const t = TRANSLATIONS[currentRegion];
    const fetchBtn = document.getElementById('fetchBtn');
    const endSpinner = document.getElementById('endRefreshSpinner');
    if (fetchBtn) { fetchBtn.innerText = '🔄 ' + t.scanning; fetchBtn.style.opacity = '0.7'; }
    if (!isSilent && endSpinner) endSpinner.style.display = 'block';

    const seen = new Set(allArticles.map(a => normLink(a.link)));
    // Aktif kaynaklar önce çekilir: kullanıcı en çok onlara bakıyor
    const queue = [...RSS_FEEDS].sort((a, b) => activeSources.includes(b.name) - activeSources.includes(a.name));
    const total = queue.length;
    let newCount = 0, done = 0, failed = 0, renderTimer = null;

    const renderNow = () => {
        renderTimer = null;
        allArticles = interlaceArticles(allArticles).slice(0, MAX_ARTICLES);
        saveToLocalMemory();
        if (window.scrollY < 100) handleSearch(true);
    };

    const worker = async () => {
        while (queue.length) {
            const feed = queue.shift();
            const arts = await fetchFeedData(feed);
            done++;
            if (!arts.length) failed++;
            let added = false;
            for (const art of arts) {
                const k = normLink(art.link);
                if (!seen.has(k)) { seen.add(k); allArticles.push(art); newCount++; added = true; }
            }
            if (added && !renderTimer) renderTimer = setTimeout(renderNow, 250); // her kaynakta değil, toplu çiz
            if (fetchBtn) fetchBtn.innerText = `🔄 ${t.scanning} ${done}/${total}`;
        }
    };
    await Promise.all(Array.from({ length: Math.min(FEED_CONCURRENCY, total) }, worker));

    if (renderTimer) clearTimeout(renderTimer);
    if (newCount > 0) renderNow();

    if (newCount > 0 && window.scrollY >= 100) showToastGlobal(`⬆️ ${newCount} Yeni Haber Düştü!`);
    else if (total > 0 && failed === total) showToastGlobal('⚠️ Kaynaklara ulaşılamadı, biraz sonra tekrar denenecek', 4000);
    else if (isSilent && !isAuto && newCount === 0) showToastGlobal('✔️ En günceldesiniz', 3000);
    else if (!isAuto && failed > 0 && newCount > 0) showToastGlobal(`${newCount} yeni haber • ${failed} kaynak yanıt vermedi`, 3500);

    if (isSilent) resetPullToRefresh();
    if (endSpinner) endSpinner.style.display = 'none';
    if (fetchBtn) { fetchBtn.innerText = t.fetchBtnText; fetchBtn.style.opacity = '1'; }
    isFetchingRefresh = false;
    if (window.warmGoogleLinks) setTimeout(() => window.warmGoogleLinks(allArticles), 800);   // Google linkleri kullanıcı dokunmadan çözülsün
    if (!isSilent) handleSearch(true);
}

// ---------- Otomatik yenileme: haberler kullanıcı beklemeden düşsün ----------
setInterval(() => { if (!document.hidden && !isFetchingRefresh && Date.now() - lastFetchAt > AUTO_REFRESH_MS) fetchAllRSS(true, true); }, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && !isFetchingRefresh && Date.now() - lastFetchAt > 120000) fetchAllRSS(true, true); });
window.addEventListener('online', () => { if (!isFetchingRefresh) fetchAllRSS(true, true); });

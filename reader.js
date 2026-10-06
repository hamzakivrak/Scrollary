// reader.js v3 — okuma modu: reklamsız metin çıkarma (eski openModal'ın yerine geçer)
let readerToken = 0;
const originalState = { art: null, loaded: false, html: null, link: null };
const READER_CACHE = new Map();
try { localStorage.removeItem('readerCacheV1'); (JSON.parse(localStorage.getItem('readerCacheV2')) || []).forEach(([k, v]) => READER_CACHE.set(k, v)); } catch (e) {}
const $id = id => document.getElementById(id);

function persistReaderCache() {
    try { localStorage.setItem('readerCacheV2', JSON.stringify([...READER_CACHE.entries()].slice(-30))); } catch (e) {}
}

// ---------- Yardımcılar ----------
function decodeGoogleNewsUrl(link) {
    try {
        const m = link.match(/articles\/([^?#/]+)/);
        if (!m) return null;
        let b = m[1].replace(/-/g, '+').replace(/_/g, '/');
        while (b.length % 4) b += '=';
        const hit = atob(b).match(/https?:\/\/[^\s\x00-\x1f"<>\x7f-\xff]+/);
        return hit && !/google\./.test(hit[0]) ? hit[0] : null;
    } catch (e) { return null; }
}


// ---------- Google News: gerçek yayıncı adresini bulma ----------
const gnCache = (() => { try { return JSON.parse(localStorage.getItem('gnResolveV1')) || {}; } catch (e) { return {}; } })();
function gnId(link) { const m = (link || '').match(/articles\/([^?#/]+)/); return m ? m[1] : null; }
function gnRemember(id, url) {
    gnCache[id] = url;
    const keys = Object.keys(gnCache);
    if (keys.length > 300) delete gnCache[keys[0]];
    try { localStorage.setItem('gnResolveV1', JSON.stringify(gnCache)); } catch (e) {}
    return url;
}
// Google'ın batchexecute yanıtından adresi çıkarır (saf fonksiyon)
function parseGnBatch(text) {
    const arr = JSON.parse(text.split('\n\n')[1]);
    const u = JSON.parse(arr[0][2])[1];
    return /^https?:\/\//.test(u) && !/google\./.test(u) ? u : null;
}
// Eski biçim yerelde çözülür; yeni (şifreli) biçim için Google'ın kendi uç noktası denenir.
// Başarısız olursa null döner; çağıran taraf Google linkini tarayıcıda açmaya düşer.
async function resolveGoogleNewsUrl(link) {
    const id = gnId(link);
    if (!id) return null;
    if (gnCache[id]) return gnCache[id];
    const local = decodeGoogleNewsUrl(link);
    if (local) return gnRemember(id, local);
    try {
        const page = await fetchHtmlRace(`https://news.google.com/rss/articles/${id}?hl=en-US&gl=US&ceid=US:en`);
        const sg = (page.match(/data-n-a-sg="([^"]+)"/) || [])[1];
        const ts = (page.match(/data-n-a-ts="([^"]+)"/) || [])[1];
        if (!sg || !ts) return null;
        const args = `["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"${id}",${ts},"${sg}"]`;
        const body = 'f.req=' + encodeURIComponent(JSON.stringify([[['Fbv4je', args]]]));
        const endpoint = 'https://news.google.com/_/DotsSplashUi/data/batchexecute';
        const post = (u) => async () => {
            const res = await fetchWithTimeout(u, 10000, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body });
            if (!res.ok) throw new Error('http');
            const real = parseGnBatch(await res.text());
            if (!real) throw new Error('çözülemedi');
            return real;
        };
        const real = await raceStaggered([
            { delay: 0, run: post(endpoint) },
            { delay: 0, run: post(`https://corsproxy.io/?url=${encodeURIComponent(endpoint)}`) }
        ]);
        return gnRemember(id, real);
    } catch (e) { return null; }
}

const BLOCK_RE = /security service to protect itself|Just a moment\.\.\.|cf-browser-verification|Attention Required|Enable JavaScript and cookies|Access Denied|Pardon Our Interruption|Request unsuccessful|Incapsula incident|captcha-delivery|Checking your browser|Verify you are human|px-captcha|robot or human/i;
// Gerçek haber sayfaları büyüktür; küçük + engel ifadesi içeren sayfa bot korumasıdır
function isBlockedHtml(html) { return !html || html.length < 800 || (html.length < 60000 && BLOCK_RE.test(html.slice(0, 8000))); }
const JUNK_RE = /(abone ol|tüm hakları saklıdır|çerez|cookie|©|haberi paylaş|follow us|subscribe|newsletter|sign up|advertisement|reklam)/i;
// Metnin içine/sonuna sıkışan "ilgili haberler, yorumlar, reklam..." bölümleri: görülünce bundan sonrası kesilir
const END_RE = /^(ilgili haberler|ilgili içerikler|ilgili başlıklar|bunlar da ilginizi|bunları da okuyun|bunu da okuyun|ilginizi çekebilir|çok okunanlar|gündemden|etiketler|yorumlar|yorum yap|yorum yaz|reklam\b|sponsorlu|haberi paylaş|paylaş\b|bizi takip|whatsapp|telegram|google haberler|google news|abone ol|tüm hakları|copyright|©|read more|related|you may also like|recommended|advertisement|sponsored|follow us|share this|editör|kaynak\s*:)/i;
const INLINE_JUNK_RE = /^(bunu da oku|ayrıca oku|ayrıca bakınız|devamını oku|haberin devamı|okumaya devam|ilgili haber\s*:|ilgili haberi|foto galeri|video\s*:)/i;
const TICKER_RE = /(\bUSD\b|\bEUR\b|\bGBP\b|dolar|euro\b|sterlin|gram altın|çeyrek altın|altın\b|bist ?100|borsa|bitcoin|\bons\b|brent)/i;

// "Dolar 41,50 Euro 48,20 Altın 5.100 ..." gibi kur/borsa şeritlerini yakalar
function looksLikeTicker(s) {
    const nums = (s.match(/\d+[.,]\d+/g) || []).length;
    const digits = (s.match(/\d/g) || []).length;
    const letters = (s.match(/\p{L}/gu) || []).length;
    if (s.length < 240 && nums >= 3) return true;
    if (s.length < 240 && nums >= 2 && TICKER_RE.test(s)) return true;
    if (s.length < 160 && nums >= 2 && digits > letters * 0.5) return true;
    return false;
}

function hintWords(hint) {
    const set = new Set();
    if (!hint) return set;
    ((hint.title || '') + ' ' + (hint.description || '')).toLocaleLowerCase('tr').match(/\p{L}{4,}/gu)?.forEach(w => set.add(w));
    return set;
}

function finalizeParas(texts, hint) {
    const seen = new Set();
    let list = [];
    for (let s of texts) {
        s = (s || '').replace(/\s+/g, ' ').trim();
        if (!s || seen.has(s)) continue;
        seen.add(s); list.push(s);
    }
    // 1) Haberin bittiği yer: "İlgili haberler / Yorumlar / Reklam..." başlığı görülünce gerisini at
    let chars = 0, cut = list.length;
    for (let i = 0; i < list.length; i++) {
        const s = list[i];
        if (s.length >= 80) chars += s.length;
        if (chars >= 250 && s.length < 100 && END_RE.test(s)) { cut = i; break; }
    }
    list = list.slice(0, cut);
    // 2) Her yerde: kısa/çöp satırlar, kur şeridi, "bunu da oku" yönlendirmeleri
    list = list.filter(s => s.length >= 40 && !looksLikeTicker(s) && !INLINE_JUNK_RE.test(s) && !(s.length < 140 && JUNK_RE.test(s)));
    // 3) Baş: kur/borsa şeridi veya habere hiç değmeyen kısa üst bilgi satırı
    const hs = hintWords(hint);
    const rel = s => (s.toLocaleLowerCase('tr').match(/\p{L}{4,}/gu) || []).filter(w => hs.has(w)).length;
    while (list.length > 2 && (looksLikeTicker(list[0]) || (hs.size && list[0].length < 110 && !/[.!?…"”»]$/.test(list[0]) && rel(list[0]) === 0))) list.shift();
    // 4) Son: noktalamayla bitmeyen kısa artıklar ("Kaynak: AA", reklam metni)
    while (list.length > 2) {
        const l = list[list.length - 1];
        if (l.length < 110 && (!/[.!?…"”»)]$/.test(l) || JUNK_RE.test(l))) list.pop(); else break;
    }
    return list;
}

function findArticleBody(node) {
    if (!node || typeof node !== 'object') return '';
    if (Array.isArray(node)) { for (const n of node) { const r = findArticleBody(n); if (r) return r; } return ''; }
    if (typeof node.articleBody === 'string' && node.articleBody.length > 400) return node.articleBody;
    return findArticleBody(node['@graph']) || '';
}

function extractFromHtml(html, hint) {
    if (isBlockedHtml(html)) return [];
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // 1) JSON-LD articleBody: birçok haber sitesinde tertemiz tam metin
    for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
        try {
            const body = findArticleBody(JSON.parse(s.textContent));
            if (body) { const ps = finalizeParas(body.replace(/<\/p>|<br\s*\/?>/gi, '\n\n').replace(/<[^>]+>/g, ' ').split(/\n{2,}/), hint); if (ps.join('').length > 400) return ps; }
        } catch (e) {}
    }
    const linkDensity = n => { const t = n.textContent.length || 1; let l = 0; n.querySelectorAll('a').forEach(a => { l += a.textContent.length; }); return l / t; };
    const grab = root => Array.from(root.querySelectorAll('p, h2, h3, h4')).filter(n => linkDensity(n) < 0.6).map(n => n.textContent);

    // 2) Gürültüyü at, en uygun makale kutusunu seç
    const work = doc.cloneNode(true);
    work.querySelectorAll('script,style,noscript,nav,aside,footer,form,iframe,figure,figcaption,button,svg,select,[class*="related"],[class*="share"],[class*="social"],[class*="comment"],[class*="newsletter"],[class*="breadcrumb"],[class*="sidebar"],[class*="popular"],[class*="advert"],[class*="reklam"],[id*="comment"],[role="complementary"]').forEach(n => n.remove());
    const sels = ['[itemprop="articleBody"]', '[class*="article-body"]', '[class*="article_body"]', '[class*="news-text"]', '[class*="story-body"]', '[class*="post-content"]', '[class*="entry-content"]', 'article', '[class*="content-text"]', 'main'];
    let best = [];
    for (const sel of sels) {
        for (const el of work.querySelectorAll(sel)) {
            const ps = finalizeParas(grab(el), hint);
            if (ps.join('').length > best.join('').length) best = ps;
        }
        if (best.join('').length > 700) break;   // öncelik sırasındaki ilk yeterli kutu kazanır
    }
    if (best.join('').length >= 350) return best;

    // 3) Son çare: sayfadaki tüm paragraflar (eski davranış)
    return finalizeParas(grab(doc), hint);
}

function cleanMarkdown(text, hint) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => {
        // Satırın çoğu link metniyse menü/ilgili haber listesidir
        const linkChars = (l.match(/\[([^\]]*)\]\([^)]*\)/g) || []).reduce((n, m) => n + m.length, 0);
        return !(l.length && linkChars / l.length > 0.6) && !/^(https?:|[|>]|[-•*]\s)/.test(l) && !l.includes('redirect=');
    }).map(l => l.replace(/!\[.*?\]\(.*?\)/g, '').replace(/\[\s*\]\([^)]+\)/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/^#+\s*/, '').replace(/[*_]{1,2}/g, '').replace(/<[^>]*>/g, ''));
    return finalizeParas(lines.filter(l => l.split(' ').length >= 7 || END_RE.test(l)), hint);
}

// Tek bir rota üzerinden sayfa HTML'i çeker
const HTML_ROUTES = [
    { delay: 0,    via: 'doğrudan',   url: u => u },
    { delay: 0,    via: 'allorigins', url: u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}&disableCache=true` },
    { delay: 600,  via: 'corsproxy',  url: u => `https://corsproxy.io/?url=${encodeURIComponent(u)}` },
    { delay: 1200, via: 'jina-html',  url: u => 'https://r.jina.ai/' + u, headers: { 'X-Return-Format': 'html' } },   // gerçek tarayıcıyla çeker: bot korumalı sitelerde işe yarar
    { delay: 1800, via: 'allorigins2',url: u => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`, json: true },
    { delay: 2600, via: 'codetabs',   url: u => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}` }
];

async function fetchViaRoute(route, url, timeout = 11000) {
    const res = await fetchWithTimeout(route.url(url), timeout, route.headers ? { headers: route.headers } : {});
    if (!res.ok) throw new Error('http ' + res.status);
    const html = route.json ? ((await res.json()).contents || '') : await res.text();
    if (isBlockedHtml(html)) throw new Error('engel');
    return html;
}

// Son kazanan rota ilk sırada, hemen başlar; diğerleri yedek olarak biraz gecikmeyle
function routesFor() {
    let best = null;
    try { best = localStorage.getItem('bestRoute'); } catch (e) {}
    if (!best || !HTML_ROUTES.some(r => r.via === best)) return HTML_ROUTES;
    return HTML_ROUTES.map(r => r.via === best ? { ...r, delay: 0 } : { ...r, delay: Math.max(r.delay, 700) });
}

async function fetchHtmlRace(url) {
    let won = false;
    return raceStaggered(routesFor().map(r => ({
        delay: r.delay,
        run: async () => {
            const html = await fetchViaRoute(r, url);
            if (!won) { won = true; try { localStorage.setItem('bestRoute', r.via); } catch (e) {} }
            return html;
        }
    })));
}

// Aynı adres için tek indirme: okuma modu, orijinal site sekmesi ve ön yükleme aynı isteği paylaşır
const HTML_SHARED = new Map();
function getHtmlShared(url, fresh) {
    const hit = HTML_SHARED.get(url);
    if (hit && !fresh && Date.now() - hit.t < 300000) return hit.p;
    const p = fetchHtmlRace(url);
    HTML_SHARED.set(url, { t: Date.now(), p });
    p.catch(() => { const h = HTML_SHARED.get(url); if (h && h.p === p) HTML_SHARED.delete(url); });
    if (HTML_SHARED.size > 20) HTML_SHARED.delete(HTML_SHARED.keys().next().value);
    return p;
}

// Kullanıcı karta dokunduğu anda indirmeyi başlatır; açılış ekranı geldiğinde sayfa çoktan yoldadır
window.prefetchArticle = function (art) {
    try {
        if (navigator.connection && navigator.connection.saveData) return;
        if (READER_CACHE.has(art.link) || (art.content && art.content.length > 500)) return;
        if (/news\.google\.com/.test(art.link)) { resolveGoogleNewsUrl(art.link).then(u => { if (u) getHtmlShared(u).catch(() => {}); }).catch(() => {}); return; }
        getHtmlShared(art.link).catch(() => {});
    } catch (e) {}
};

// Sayfa yolu hızlıysa Jina hiç devreye girmez; yavaşsa/bloklandıysa 1.2 sn sonra yedek olarak başlar
async function extractArticle(url, hint, fresh) {
    const accept = (paras, via) => {
        if (paras.length < 2 || paras.join(' ').length < 350) throw new Error('kısa');
        return { paras, via };
    };
    const page = { delay: 0, run: async () => accept(extractFromHtml(await getHtmlShared(url, fresh), hint), 'sayfa') };
    const jina = {
        delay: 1200,
        run: async () => {
            const res = await fetchWithTimeout('https://r.jina.ai/' + url, 14000, { headers: { Accept: 'application/json' } });
            if (!res.ok) throw new Error('jina');
            const j = await res.json();
            if (!j || !j.data || !j.data.content) throw new Error('jina boş');
            return accept(cleanMarkdown(j.data.content, hint), 'jina');
        }
    };
    return raceStaggered([page, jina]);
}

// ---------- Görünüm ----------
function readerFontPx() { return parseInt(localStorage.getItem('readerFontPx')) || 17; }
function applyReaderFont() { const box = $id('fullTextContainer'); if (box) box.style.setProperty('--reader-font', readerFontPx() + 'px'); }
window.changeReaderFont = function (d) {
    const v = Math.min(26, Math.max(14, readerFontPx() + d * 2));
    localStorage.setItem('readerFontPx', v); applyReaderFont();
};
function initReaderFontControls() {
    const rc = $id('readerControls');
    if (!rc || $id('fontCtl')) return;
    const d = document.createElement('div');
    d.id = 'fontCtl'; d.className = 'font-ctl';
    d.innerHTML = '<button onclick="changeReaderFont(-1)" aria-label="Yazıyı küçült">A−</button><button onclick="changeReaderFont(1)" aria-label="Yazıyı büyüt">A+</button>';
    rc.appendChild(d);
}

function skeletonHtml(msg) {
    return `<div class="loading-pulse">${escapeHtml(msg)}</div>` + '<div class="skel-line"></div>'.repeat(3) + '<div class="skel-line short"></div>' + '<div class="skel-line"></div>'.repeat(2);
}

function renderReaderText(paras, art, via) {
    const box = $id('fullTextContainer');
    if (typeof window.formatTextWithControls === 'function') window.formatTextWithControls(paras, box);
    else box.innerHTML = paras.map(p => `<p>${escapeHtml(p)}</p>`).join('');
    const mins = Math.max(1, Math.round(paras.join(' ').split(/\s+/).length / 200));
    box.insertAdjacentHTML('afterbegin', `<div class="reader-meta">⏱️ ~${mins} dk okuma${via ? ' • ' + escapeHtml(via) : ''}</div>`);
    if (typeof resetArticleChat === 'function') resetArticleChat(paras.join('\n'), art.description);
}

function renderFailUI(art, url) {
    const box = $id('fullTextContainer');
    box.innerHTML = `
        <div class="reader-fail">
            <h3>🛡️ Metin otomatik alınamadı</h3>
            <p>Site güvenlik duvarı engelledi ya da bağlantı çok yavaş.</p>
            <div class="fail-actions">
                <button id="rfRetry" type="button">🔄 Tekrar dene</button>
                <a href="${escapeHtml(url)}" target="_blank" rel="noopener">🌐 Orijinal siteyi aç</a>
            </div>
            <details>
                <summary>Gerçek haber linkini yapıştır</summary>
                <div class="fail-paste">
                    <input type="url" id="manualPastedUrl" placeholder="https://...">
                    <button id="autoPasteBtn" type="button">📋 Panodan al</button>
                </div>
            </details>
        </div>
        <div class="reader-fallback-desc"><strong>Özet:</strong><br>${escapeHtml(art.description)}</div>`;
    if (typeof resetArticleChat === 'function') resetArticleChat('Bu haberin sadece özeti mevcut:\n' + art.description, art.description);
    const token = readerToken;
    $id('rfRetry').onclick = () => loadReaderText(art, token, undefined, true);
    const input = $id('manualPastedUrl');
    const go = () => { const v = input.value.trim(); if (/^https?:\/\//.test(v)) loadReaderText(art, token, v); };
    input.addEventListener('input', go);
    $id('autoPasteBtn').onclick = async () => {
        try { input.value = await navigator.clipboard.readText(); go(); }
        catch (e) { showToastGlobal('Panoya erişilemedi, linki elle yapıştırın', 3000); }
    };
}

function refreshRealLinks(art) {
    const real = realLinkOf(art);
    ['modalLinkExt', 'stickyOpenLink', 'aiResultLink'].forEach(id => { const a = $id(id); if (a) a.href = real; });
}

async function loadReaderText(art, token, urlOverride, fresh) {
    const t = TRANSLATIONS[currentRegion];
    const box = $id('fullTextContainer');

    const cached = READER_CACHE.get(art.link);
    if (cached && !urlOverride) return renderReaderText(cached.paras, art, cached.via);
    if (art.content && !urlOverride) { const fp = finalizeParas(art.content.split('\n\n'), art); if (fp.length >= 2) return renderReaderText(fp, art, 'yayıncı feed'); }

    box.innerHTML = skeletonHtml(t.extracting);
    let url = urlOverride || art.link;
    if (/news\.google\.com/.test(url)) {
        const real = await resolveGoogleNewsUrl(url);
        if (token !== readerToken) return;
        if (!real) return renderFailUI(art, url);
        url = real; refreshRealLinks(art);
    }
    if (urlOverride) { const ext = $id('modalLinkExt'); if (ext) ext.href = url; }

    try {
        const res = await extractArticle(url, art, fresh);
        if (token !== readerToken) return;           // kullanıcı başka habere geçti
        READER_CACHE.set(art.link, res); persistReaderCache();
        renderReaderText(res.paras, art, res.via);
    } catch (e) {
        if (token === readerToken) renderFailUI(art, url);
    }
}

// ---------- Orijinal site sekmesi ----------
// Varsayılan "sade önizleme": sayfa proxy'den çekilir, scriptler/reklamlar atılır, tembel görseller açılır.
// Çoğu haber sitesi (Google Haberler yönlendirmeleri dahil) böylece gömülü pencerede sorunsuz görünür.
let frameTimer = null, webTapAt = 0;

function realLinkOf(art) {
    if (!art) return '#';
    let l = art.link;
    if (/news\.google\.com/.test(l)) { const id = gnId(l); l = (id && gnCache[id]) || decodeGoogleNewsUrl(l) || l; }
    return l;
}
window.openRealLink = function () {
    const l = realLinkOf(originalState.art);
    if (l && l !== '#') window.open(l, '_blank', 'noopener');
};

// Sekme: tek dokunuş = uygulama içi önizleme, çift dokunuş = doğrudan asıl haber (tarayıcıda)
window.onWebTabTap = function () {
    const now = Date.now();
    if (now - webTapAt < 450) { webTapAt = 0; clearTimeout(frameTimer); window.openRealLink(); return; }
    webTapAt = now;
    switchTab('web');
};

function setBanner(statusHtml, opts = {}) {
    const b = $id('iframeBanner');
    if (!b) return;
    if (opts === true) opts = { interactive: true };     // eski çağrılarla uyum
    b.style.display = '';
    b.innerHTML = `<span class="banner-status">${statusHtml}</span><span class="banner-actions">` +
        `<button type="button" class="banner-link ai" onclick="askAIFromWeb()">✨ Özetle / Sor</button>` +
        (opts.interactive ? `<button type="button" class="banner-link alt" onclick="reloadFrameInteractive()" title="Sayfanın kendi scriptlerini çalıştır">⚡ Etkileşimli</button>` : '') +
        (opts.readerBtn ? `<button type="button" class="banner-link alt" onclick="switchTab('reader')">📖 Okuma modu</button>` : '') +
        `<a class="banner-link" href="${escapeHtml(realLinkOf(originalState.art))}" target="_blank" rel="noopener">↗️ Asıl habere git</a></span>`;
}

// Orijinal site sekmesinden yapay zekaya: çubuktaki soruyu (varsayılan "Bu haberi özetle") gönderir
window.askAIFromWeb = function () {
    const i = $id('aiChatInput');
    if (i && !i.value.trim()) i.value = 'Bu haberi özetle';
    if (typeof handleNewChatMessage === 'function') handleNewChatMessage('aiChatInput');
};

function resetOriginalFrame(art) {
    clearTimeout(frameTimer);
    const old = $id('modalIframe');
    const iframe = document.createElement('iframe');
    iframe.id = 'modalIframe'; iframe.className = 'modal-iframe';
    iframe.setAttribute('sandbox', 'allow-popups');
    old.parentNode.replaceChild(iframe, old);
    originalState.art = art; originalState.loaded = false; originalState.html = null; originalState.link = null;
    setBanner('⏳ Önizleme hazırlanıyor… <small>(çift dokun: tarayıcıda aç)</small>');
}

// Sayfayı iframe'e uygun hale getirir
function prepareFrameHtml(rawHtml, link, interactive) {
    const doc = new DOMParser().parseFromString(rawHtml, 'text/html');
    doc.querySelectorAll('meta[http-equiv]').forEach(m => { if (/refresh|content-security-policy/i.test(m.getAttribute('http-equiv'))) m.remove(); });
    doc.querySelectorAll('img, source').forEach(el => {
        const ds = el.getAttribute('data-src') || el.getAttribute('data-lazy-src') || el.getAttribute('data-original');
        if (ds && (!el.getAttribute('src') || /^data:|placeholder|blank|1x1/i.test(el.getAttribute('src')))) el.setAttribute('src', ds);
        const dss = el.getAttribute('data-srcset') || el.getAttribute('data-lazy-srcset');
        if (dss) el.setAttribute('srcset', dss);
        el.removeAttribute('loading');
    });
    if (!interactive) {
        doc.querySelectorAll('script, iframe, object, embed, link[rel="preload"], link[rel="modulepreload"]').forEach(n => n.remove());
        doc.querySelectorAll('[class*="advert"], [class*="reklam"], [id*="advert"], [id*="reklam"], [class*="cookie"], [id*="cookie"], [class*="consent"], [id*="consent"]').forEach(n => n.remove());
    } else {
        doc.querySelectorAll('script').forEach(s => { const c = s.textContent; if (/window\.location|top\.location|document\.location/.test(c)) s.textContent = c.replace(/(window|top|document)\.location(\.href)?\s*=/g, 'void 0;//').replace(/location\.replace\(/g, 'void(').replace(/location\.assign\(/g, 'void('); });
    }
    const head = doc.head || doc.documentElement.insertBefore(doc.createElement('head'), doc.body);
    const base = doc.createElement('base'); base.setAttribute('href', link); base.setAttribute('target', '_blank');
    head.insertBefore(base, head.firstChild);
    const textLen = (doc.body ? doc.body.textContent : '').replace(/\s+/g, ' ').trim().length;
    return { html: '<!DOCTYPE html>' + doc.documentElement.outerHTML, textLen };
}

function mountFrame(html, interactive) {
    const old = $id('modalIframe');
    const iframe = document.createElement('iframe');
    iframe.id = 'modalIframe'; iframe.className = 'modal-iframe';
    // allow-same-origin YOK: yabancı scriptler uygulamanın verilerine (giriş, localStorage) erişemesin
    iframe.setAttribute('sandbox', interactive ? 'allow-scripts allow-forms allow-popups' : 'allow-popups');
    iframe.srcdoc = html;
    old.parentNode.replaceChild(iframe, old);
    return iframe;
}

window.loadOriginalFrame = function () {
    const st = originalState;
    if (!st.art || st.loaded) return;
    clearTimeout(frameTimer);
    if (window.__frameNow) { window.__frameNow = false; doLoadOriginalFrame(false); return; }   // doğrudan 'gömülü aç' seçildiyse bekleme yok
    frameTimer = setTimeout(() => doLoadOriginalFrame(false), 450);   // çift dokunuş gelirse yüklemeye hiç girme
};

window.reloadFrameInteractive = function () {
    if (!originalState.html) return;
    const { html } = prepareFrameHtml(originalState.html, originalState.link, true);
    mountFrame(html, true);
    setBanner('⚡ Etkileşimli mod');
};

function buildCleanPage(art, paras) {
    const e = escapeHtml;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_blank">` +
        `<style>body{font:18px/1.75 Georgia,serif;margin:0 auto;padding:18px 18px 40px;max-width:720px;color:#1e293b;background:#fff}h1{font:700 1.45rem/1.3 system-ui,sans-serif;margin:.3em 0 .6em}img{max-width:100%;border-radius:8px;margin:0 0 14px}.m{color:#64748b;font:.8rem system-ui,sans-serif}p{margin:0 0 1em}</style></head><body>` +
        `<div class="m">${e(art.source)}</div><h1>${e(art.title)}</h1>${art.image ? `<img src="${e(art.image)}" alt="">` : ''}${paras.map(p => `<p>${e(p)}</p>`).join('')}</body></html>`;
}

// Site proxylere izin vermiyorsa: metni başka yoldan alıp temiz bir sayfa olarak göster (+ yapay zeka bağlamı)
async function showCleanFallback(art, link) {
    try {
        let hit = READER_CACHE.get(art.link);
        if (!hit) { hit = await extractArticle(link, art); READER_CACHE.set(art.link, hit); persistReaderCache(); }
        if (originalState.art !== art) return true;
        mountFrame(buildCleanPage(art, hit.paras), false);
        if (typeof resetArticleChat === 'function') resetArticleChat(hit.paras.join('\n'), art.description);
        setBanner('📄 Site önizlemeyi engelledi — temiz metin görünümü', { readerBtn: true });
        return true;
    } catch (e) { return false; }
}

async function doLoadOriginalFrame(interactive) {
    const st = originalState;
    const art = st.art;
    if (!art || st.loaded) return;
    st.loaded = true;
    let link = art.link;
    try {
        if (/news\.google\.com/.test(link)) {
            setBanner('⏳ Haber adresi çözülüyor…');
            link = await resolveGoogleNewsUrl(link);
            if (st.art !== art) return;
            if (!link) throw new Error('gn');
            refreshRealLinks(art);
        }
        setBanner('⏳ Sayfa indiriliyor…');
        const raw = await getHtmlShared(link);
        if (st.art !== art) return;
        st.html = raw; st.link = link;
        // Okuma modu metni alamadıysa, indirilen sayfadan çıkardığımız metni yapay zekaya bağlam yap
        if (!READER_CACHE.has(art.link) && !(art.content && art.content.length > 500)) {
            const paras = extractFromHtml(raw, art);
            if (paras.join(' ').length >= 350 && typeof resetArticleChat === 'function') {
                READER_CACHE.set(art.link, { paras, via: 'önizleme' }); persistReaderCache();
                resetArticleChat(paras.join('\n'), art.description);
            }
        }
        let prep = prepareFrameHtml(raw, link, interactive);
        let interactiveMode = interactive;
        if (!interactive && prep.textLen < 300) {            // sade modda boş görünüyorsa sayfa scriptle çiziliyordur
            prep = prepareFrameHtml(raw, link, true); interactiveMode = true;
        }
        mountFrame(prep.html, interactiveMode);
        setBanner(interactiveMode ? '⚡ Etkileşimli mod' : '✅ Sade önizleme (reklamsız)', { interactive: !interactiveMode });
    } catch (e) {
        if (st.art !== art) return;
        const ok = link && !/news\.google\.com/.test(link) ? await showCleanFallback(art, link) : false;
        if (ok || st.art !== art) return;
        st.loaded = false;                           // tekrar basınca yeniden denesin
        setBanner(e && e.message === 'gn' ? '⚠️ Google Haberler adresi çözülemedi' : '⚠️ Site engelli: önizleme ve metin alınamadı', { readerBtn: true });
    }
}

// ---------- Ana giriş ----------
async function openModal(art) {
    const token = ++readerToken;
    $id('modalSource').innerText = art.source;
    refreshRealLinks(art);
    $id('modalTitle').innerText = art.title;
    $id('modalDesc').innerText = art.description;

    const chatInput = $id('aiChatInput');
    if (chatInput) chatInput.value = 'Bu haberi özetle';
    const aiModal = $id('aiInlineResult');
    if (aiModal) { aiModal.classList.remove('show'); aiModal.style.display = 'none'; }

    const imgEl = $id('modalImg'), body = $id('modalBodyArea');
    if (!art.image) { body.setAttribute('data-default-img', 'true'); imgEl.style.display = 'none'; }
    else { body.removeAttribute('data-default-img'); imgEl.src = art.image; imgEl.style.display = 'block'; imgEl.className = 'reader-image'; }

    initReaderFontControls(); applyReaderFont();
    switchTab('reader');
    openModalSafe('newsModal');
    body.scrollTop = 0;
    resetOriginalFrame(art);
    await loadReaderText(art, token);
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $id('newsModal') && $id('newsModal').style.display === 'flex') closeModalSafe('newsModal');
});

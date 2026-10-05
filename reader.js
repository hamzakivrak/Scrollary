// reader.js v3 — okuma modu: reklamsız metin çıkarma (eski openModal'ın yerine geçer)
let readerToken = 0;
const originalState = { art: null, loaded: false };
const READER_CACHE = new Map();
try { (JSON.parse(localStorage.getItem('readerCacheV1')) || []).forEach(([k, v]) => READER_CACHE.set(k, v)); } catch (e) {}
const $id = id => document.getElementById(id);

function persistReaderCache() {
    try { localStorage.setItem('readerCacheV1', JSON.stringify([...READER_CACHE.entries()].slice(-15))); } catch (e) {}
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

const BLOCK_RE = /security service to protect itself|Just a moment\.\.\.|cf-browser-verification|Attention Required|Enable JavaScript and cookies/i;
const JUNK_RE = /(abone ol|tüm hakları saklıdır|çerez|cookie|©|haberi paylaş|ilgili haberler|follow us|subscribe|newsletter|sign up|advertisement|reklam)/i;

function cleanParas(arr) {
    const seen = new Set();
    return arr.map(s => s.replace(/\s+/g, ' ').trim()).filter(s => {
        if (s.length < 40 || seen.has(s)) return false;
        if (s.length < 140 && JUNK_RE.test(s)) return false;
        seen.add(s); return true;
    });
}

function findArticleBody(node) {
    if (!node || typeof node !== 'object') return '';
    if (Array.isArray(node)) { for (const n of node) { const r = findArticleBody(n); if (r) return r; } return ''; }
    if (typeof node.articleBody === 'string' && node.articleBody.length > 400) return node.articleBody;
    return findArticleBody(node['@graph']) || '';
}

function extractFromHtml(html) {
    if (!html || html.length < 800 || BLOCK_RE.test(html.slice(0, 5000))) return [];
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // 1) JSON-LD articleBody: birçok haber sitesinde tertemiz tam metin
    for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
        try {
            const body = findArticleBody(JSON.parse(s.textContent));
            if (body) { const ps = cleanParas(htmlToText(body.replace(/<\/p>|<br\s*\/?>/gi, '\n\n')).split(/\n{2,}|(?<=[.!?])\s{2,}/)); if (ps.join('').length > 400) return ps; }
        } catch (e) {}
    }
    const grab = root => Array.from(root.querySelectorAll('p, h2, h3')).filter(n => n.tagName === 'P' || n.textContent.trim().length > 10).map(n => n.textContent);

    // 2) Gürültüyü at, en uygun makale kutusunu seç
    const work = doc.cloneNode(true);
    work.querySelectorAll('script,style,noscript,nav,aside,footer,form,iframe,figure,figcaption,button,svg,select,[class*="related"],[class*="share"],[class*="social"],[class*="comment"],[class*="newsletter"],[class*="breadcrumb"],[class*="sidebar"],[class*="popular"],[class*="advert"],[class*="reklam"],[id*="comment"],[role="complementary"]').forEach(n => n.remove());
    const sels = ['[itemprop="articleBody"]', '[class*="article-body"]', '[class*="article_body"]', '[class*="news-text"]', '[class*="story-body"]', '[class*="post-content"]', '[class*="entry-content"]', 'article', '[class*="content-text"]', 'main'];
    let best = [];
    for (const sel of sels) {
        for (const el of work.querySelectorAll(sel)) {
            const ps = cleanParas(grab(el));
            if (ps.join('').length > best.join('').length) best = ps;
        }
        if (best.join('').length > 700) break;   // öncelik sırasındaki ilk yeterli kutu kazanır
    }
    if (best.join('').length >= 350) return best;

    // 3) Son çare: sayfadaki tüm paragraflar (eski davranış)
    return cleanParas(grab(doc));
}

function cleanMarkdown(text) {
    return cleanParas(text
        .replace(/!\[.*?\]\(.*?\)/g, '').replace(/\[\s*\]\([^)]+\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/^#+\s*/gm, '').replace(/[*_]{1,2}/g, '').replace(/<[^>]*>/g, '')
        .split('\n').map(l => l.trim())
        .filter(l => l.split(' ').length >= 7 && !/^(https?:|[|>\-•*]\s)/.test(l) && !l.includes('redirect=')));
}

const HTML_ROUTES = [
    { delay: 0,    via: 'doğrudan',  url: u => u },
    { delay: 0,    via: 'allorigins', url: u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}&disableCache=true` },
    { delay: 500,  via: 'corsproxy',  url: u => `https://corsproxy.io/?url=${encodeURIComponent(u)}` },
    { delay: 1500, via: 'codetabs',   url: u => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}` }
];

async function fetchHtmlRace(url) {
    return raceStaggered(HTML_ROUTES.map(r => ({
        delay: r.delay,
        run: async () => {
            const res = await fetchWithTimeout(r.url(url), 9000);
            if (!res.ok) throw new Error('http');
            const html = await res.text();
            if (html.length < 800 || BLOCK_RE.test(html.slice(0, 5000))) throw new Error('engel');
            return html;
        }
    })));
}

// Tüm yolları aynı anda dener, yeterli uzunlukta metin veren İLK yol kazanır
async function extractArticle(url) {
    const accept = (paras, via) => {
        if (paras.length < 2 || paras.join(' ').length < 350) throw new Error('kısa');
        return { paras, via };
    };
    const htmlTasks = HTML_ROUTES.map(r => ({
        delay: r.delay,
        run: async () => {
            const res = await fetchWithTimeout(r.url(url), 9000);
            if (!res.ok) throw new Error('http');
            return accept(extractFromHtml(await res.text()), r.via);
        }
    }));
    const jina = {
        delay: 0,
        run: async () => {
            const res = await fetchWithTimeout('https://r.jina.ai/' + url, 12000, { headers: { Accept: 'application/json' } });
            if (!res.ok) throw new Error('jina');
            const j = await res.json();
            if (!j || !j.data || !j.data.content) throw new Error('jina boş');
            return accept(cleanMarkdown(j.data.content), 'jina');
        }
    };
    return raceStaggered([...htmlTasks, jina]);
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
    $id('rfRetry').onclick = () => loadReaderText(art, token);
    const input = $id('manualPastedUrl');
    const go = () => { const v = input.value.trim(); if (/^https?:\/\//.test(v)) loadReaderText(art, token, v); };
    input.addEventListener('input', go);
    $id('autoPasteBtn').onclick = async () => {
        try { input.value = await navigator.clipboard.readText(); go(); }
        catch (e) { showToastGlobal('Panoya erişilemedi, linki elle yapıştırın', 3000); }
    };
}

async function loadReaderText(art, token, urlOverride) {
    const t = TRANSLATIONS[currentRegion];
    const box = $id('fullTextContainer');
    let url = urlOverride || art.link;

    if (/news\.google\.com/.test(url)) {
        const real = decodeGoogleNewsUrl(url);
        if (real) url = real; else return renderFailUI(art, url);
    }
    if (url !== art.link) { const ext = $id('modalLinkExt'); if (ext) ext.href = url; }

    const cached = READER_CACHE.get(art.link);
    if (cached && !urlOverride) return renderReaderText(cached.paras, art, cached.via);
    if (art.content && !urlOverride) return renderReaderText(art.content.split('\n\n'), art, 'yayıncı feed');

    box.innerHTML = skeletonHtml(t.extracting);
    try {
        const res = await extractArticle(url);
        if (token !== readerToken) return;           // kullanıcı başka habere geçti
        READER_CACHE.set(art.link, res); persistReaderCache();
        renderReaderText(res.paras, art, res.via);
    } catch (e) {
        if (token === readerToken) renderFailUI(art, url);
    }
}

// ---------- Orijinal site sekmesi: sadece sekmeye basılınca yüklenir ----------
function resetOriginalFrame(art) {
    const old = $id('modalIframe');
    const iframe = document.createElement('iframe');
    iframe.id = 'modalIframe'; iframe.className = 'modal-iframe';
    // allow-same-origin YOK: proxy'den gelen yabancı scriptler uygulamanın verilerine (giriş, localStorage) erişemesin
    iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups');
    old.parentNode.replaceChild(iframe, old);
    originalState.art = art; originalState.loaded = false;
    const banner = $id('iframeBanner'); banner.style.display = '';
    banner.innerHTML = `<span style="animation: pulse 1.5s infinite;">⏳</span> ${escapeHtml(TRANSLATIONS[currentRegion].loadingSite)}`;
}

window.loadOriginalFrame = async function () {
    const st = originalState;
    if (!st.art || st.loaded) return;
    st.loaded = true;
    const banner = $id('iframeBanner'), iframe = $id('modalIframe');
    let link = st.art.link;
    if (/news\.google\.com/.test(link)) link = decodeGoogleNewsUrl(link) || link;
    try {
        let html = await fetchHtmlRace(link);
        html = html.replace(/<meta[^>]+http-equiv=['"]?refresh['"]?[^>]*>/gi, '')
                   .replace(/window\.location\.replace/gi, 'console.log').replace(/window\.location\.href\s*=/gi, 'console.log=');
        const u = new URL(link);
        const base = `<base href="${u.protocol}//${u.host}/">`;
        html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + base) : base + html;
        html = html.replace(/<\/body>/i, `<script>window.onload=function(){document.querySelectorAll('a').forEach(function(l){l.setAttribute('target','_blank')})}<\/script></body>`);
        iframe.srcdoc = html;
        iframe.onload = () => { banner.innerHTML = '✅'; setTimeout(() => { banner.style.display = 'none'; }, 1500); };
    } catch (e) {
        st.loaded = false;                           // tekrar basınca yeniden denesin
        banner.innerHTML = '⚠️ Site önizlenemiyor — sağ üstteki ↗️ ile tarayıcıda açın';
    }
};

// ---------- Ana giriş ----------
async function openModal(art) {
    const token = ++readerToken;
    $id('modalSource').innerText = art.source;
    $id('modalLinkExt').href = art.link;
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

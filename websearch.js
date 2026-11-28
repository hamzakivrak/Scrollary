// websearch.js v1 — Genel haber araması: izlenen kaynaklar dışında, web'de (Google Haberler + Bing Haberler) aranan haberler aynı kartlarla listelenir.
//  • Arama kutusuna yazıp "🌐 Web'de ara" → sonuçlar kartlarla gelir; üstteki çubuktan süre (1 saat / 24 saat / 7 gün / 30 gün / tümü) seçilir,
//    "✕ Akışa dön" ile normal listeye tek dokunuşla dönülür.
//  • Sesli komut: "<konu> ile ilgili son 1 saatteki haberleri ara", "son 3 günde <konu>", "internette <konu> ara", "akışa dön" vb.
// Mevcut akışa dokunmaz: yalnızca handleSearch başında window.wsActive kontrolü vardır.
(function () {
    'use strict';
    window.wsActive = false;
    window.wsArticles = [];
    let wsQuery = '', wsWin = 'any', wsToken = 0, wsLoading = false, bar = null;
    const WINS = [['1h', '1 saat'], ['24h', '24 saat'], ['7d', '7 gün'], ['30d', '30 gün'], ['any', 'Tümü']];

    const T = () => (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS[currentRegion]) || {};
    function esc(s) { return typeof escapeHtml === 'function' ? escapeHtml(s) : String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

    function winMs(w) {
        const m = /^(\d+)([hdw])$/.exec(w || '');
        if (!m) return 0;
        return parseInt(m[1], 10) * ({ h: 3600e3, d: 864e5, w: 7 * 864e5 }[m[2]]);
    }
    function winLabel(w) {
        const m = /^(\d+)([hdw])$/.exec(w || '');
        if (!m) return 'tüm zamanlar';
        const n = m[1], u = { h: 'saat', d: 'gün', w: 'hafta' }[m[2]];
        return 'son ' + n + ' ' + u;
    }
    function bingInterval(w) {
        const ms = winMs(w);
        if (!ms) return '';
        return ms <= 3600e3 ? '4' : ms <= 864e5 ? '7' : ms <= 7 * 864e5 ? '8' : '9';
    }
    function titleKey(t) { return String(t || '').toLowerCase().replace(/\s+-\s+[^-]{2,40}$/, '').replace(/[^a-z0-9ğüşıöç]+/gi, '').slice(0, 60); }

    function hostName(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return 'Web'; } }

    // ---------- Arama ----------
    async function fetchWeb(query, w) {
        const q = query.trim();
        const gFeed = { id: 'ws_g', name: '🌐 Web', url: googleNewsFeedUrl(q + (winMs(w) ? ' when:' + w : '')), cat: 'News', lang: currentRegion };
        const l = searchLocale();
        const bUrl = `https://www.bing.com/news/search?q=${encodeURIComponent(q)}&qft=sortbydate%3D%221%22${bingInterval(w) ? '+interval%3D%22' + bingInterval(w) + '%22' : ''}&form=PTFTNR&setlang=${l.hl}&cc=${l.gl}`;
        const bFeed = { id: 'ws_b', name: '🌐 Web', url: bUrl, cat: 'News', lang: currentRegion };
        const [g, b] = await Promise.all([
            fetchFeedData(gFeed).catch(() => []),
            fetchFeedData(bFeed).catch(() => [])
        ]);
        const out = [], seenL = new Set(), seenT = new Set();
        const add = (a, fromGoogle) => {
            if (!a || !a.link) return;
            if (fromGoogle) {   // Google başlığı "Başlık - Yayıncı" biçimindedir
                const m = /^(.*\S)\s+-\s+([^-]{2,50})$/.exec(a.title);
                if (m) { a.title = m[1]; a.source = m[2].trim(); }
                else a.source = a.pubUrl ? hostName(a.pubUrl) : 'Google Haberler';
            } else a.source = hostName(a.link);
            a.categories = [];
            const lk = typeof normLink === 'function' ? normLink(a.link) : a.link, tk = titleKey(a.title);
            if (seenL.has(lk) || (tk && seenT.has(tk))) return;
            seenL.add(lk); if (tk) seenT.add(tk);
            out.push(a);
        };
        g.forEach(a => add(a, true));
        b.forEach(a => add(a, false));
        let list = out;
        const ms = winMs(w);
        if (ms) {
            const lim = Date.now() - ms - 10 * 60000;
            const f = out.filter(a => !(a.timestamp > 0) || a.timestamp >= lim);
            list = f;
        }
        list.sort((x, y) => (y.timestamp || 0) - (x.timestamp || 0));
        return list.slice(0, 150);
    }

    window.wsSearch = async function (query, w) {
        query = String(query || '').replace(/\s+/g, ' ').trim();
        if (!query) { if (typeof showToastGlobal === 'function') showToastGlobal('🌐 Önce aranacak konuyu yazın', 2500); return []; }
        if (!navigator.onLine) { if (typeof showToastGlobal === 'function') showToastGlobal('📴 İnternet bağlantısı yok', 3000); return []; }
        wsQuery = query; wsWin = w || wsWin || 'any';
        const my = ++wsToken;
        if (window.sdSetActive) window.sdSetActive(false, true);     // Son Dakika açıksa kapat
        try { currentCategory = ''; isArchiveView = false; document.querySelectorAll('.cat-btn').forEach((b, i) => b.classList.toggle('active', i === 0)); } catch (e) {}
        window.wsActive = true; wsLoading = true; window.wsArticles = [];
        const wrap = document.getElementById('controlsWrapper');
        if (wrap && !wrap.classList.contains('collapsed') && typeof toggleControls === 'function') toggleControls();
        window.scrollTo({ top: 0 });
        render();
        let list = [];
        try { list = await fetchWeb(wsQuery, wsWin); } catch (e) { list = []; }
        if (my !== wsToken || !window.wsActive) return list;
        window.wsArticles = list; wsLoading = false;
        render();
        return list;
    };

    window.wsSetWindow = function (w) { if (window.wsActive && wsQuery) window.wsSearch(wsQuery, w); };

    window.wsExit = function (e) {
        if (e && e.stopPropagation) e.stopPropagation();
        wsToken++; window.wsActive = false; wsLoading = false; window.wsArticles = [];
        if (bar) bar.style.display = 'none';
        const si = document.getElementById('searchInput'); if (si) si.value = '';
        window.scrollTo({ top: 0 });
        if (typeof handleSearch === 'function') handleSearch();
    };

    window.wsSearchFromBox = function (e) {
        if (e && e.stopPropagation) e.stopPropagation();
        const si = document.getElementById('searchInput');
        window.wsSearch(si ? si.value : '', 'any');
    };

    // ---------- Çizim (handleSearch bunu çağırır) ----------
    function ensureBar() {
        if (bar) return bar;
        const grid = document.getElementById('newsGrid'); if (!grid || !grid.parentNode) return null;
        bar = document.createElement('div');
        bar.id = 'wsBar'; bar.className = 'ws-bar'; bar.style.display = 'none';
        grid.parentNode.insertBefore(bar, grid);
        return bar;
    }
    function renderBar() {
        const b = ensureBar(); if (!b) return;
        const info = wsLoading ? '⏳ Web\'de aranıyor…' : `${window.wsArticles.length} sonuç`;
        b.innerHTML =
            `<div class="ws-top"><div class="ws-info"><b>🌐 “${esc(wsQuery)}”</b><span>${info} • ${winLabel(wsWin)}</span></div>` +
            `<button class="ws-back" onclick="wsExit(event)">✕ Akışa dön</button></div>` +
            `<div class="ws-win">${WINS.map(([k, n]) => `<button class="${k === wsWin ? 'on' : ''}" onclick="wsSetWindow('${k}')">${n}</button>`).join('')}</div>`;
        b.style.display = 'flex';
    }
    function render() {
        renderBar();
        const grid = document.getElementById('newsGrid'); if (!grid) return;
        grid.innerHTML = ''; displayedCount = 0;
        filteredArticles = window.wsArticles.slice();
        if (wsLoading) { grid.innerHTML = '<div class="status-msg"><div style="font-size:3rem; margin-bottom:15px;">⏳</div>Web\'de haberler aranıyor…</div>'; return; }
        if (!filteredArticles.length) {
            grid.innerHTML = '<div class="status-msg"><div style="font-size:3rem; margin-bottom:15px;">🔍</div>Bu konuda ' + winLabel(wsWin) + ' içinde haber bulunamadı.<br><br>Süreyi uzatmayı ya da “Tümü”nü deneyin.</div>';
            return;
        }
        renderNextBatch();
    }
    window.wsRender = render;

    // ---------- Sesli komut ayrıştırma ----------
    const NUM = { bir: 1, iki: 2, üç: 3, dört: 4, beş: 5, altı: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10, 'on beş': 15, yirmi: 20, otuz: 30, kırk: 40, elli: 50, altmış: 60 };
    function norm(s) { return String(s).toLowerCase().replace(/[.,!?;:"“”'’()]/g, ' ').replace(/\s+/g, ' ').trim(); }
    function num(x) { if (/^\d+$/.test(x)) return parseInt(x, 10); return NUM[x] || 0; }

    window.wsParseTime = function (t) {
        // [{win, rest}] — süre ifadesini bulur ve metinden çıkarır
        const numRe = '(\\d+|on beş|yirmi|otuz|kırk|elli|altmış|bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz|on)';
        let m = new RegExp('(?:^| )son ' + numRe + ' (saat|gün|hafta|ay)\\w*', '').exec(t);
        if (m) {
            const n = num(m[1]) || 1;
            const u = m[2];
            const win = u === 'saat' ? n + 'h' : u === 'gün' ? n + 'd' : u === 'hafta' ? (n * 7) + 'd' : (n * 30) + 'd';
            return { win, rest: t.replace(m[0], ' ') };
        }
        if (/(^| )son (saat|saatte|saatteki|saatlik)( |$)/.test(t)) return { win: '1h', rest: t.replace(/(^| )son saat\w*/, ' ') };
        if (/(^| )(son|bu) (gün|günde|günkü|güne)\w*( |$)|(^| )(bugün\w*|günlük|24 saat\w*)( |$)/.test(t)) return { win: '24h', rest: t.replace(/(^| )(son |bu )?(gün\w*|bugün\w*|günlük)/, ' ') };
        if (/(^| )(son|bu|geçen) hafta\w*( |$)|(^| )haftalık( |$)/.test(t)) return { win: '7d', rest: t.replace(/(^| )(son |bu |geçen )?haft\w*/, ' ') };
        if (/(^| )(son|bu|geçen) ay\w*( |$)|(^| )aylık( |$)/.test(t)) return { win: '30d', rest: t.replace(/(^| )(son |bu |geçen )?(ay\w*)/, ' ') };
        return null;
    }

    const STOP = new Set(['haber', 'haberi', 'haberler', 'haberleri', 'haberlerini', 'ara', 'arar', 'mısın', 'misin', 'araştır', 'araştırır', 'araştırabilir', 'ilgili', 'ile', 'hakkında', 'hakkındaki', 'için', 'konusunda', 'konusundaki', 'ilişkin', 'dair', 'son', 'bul', 'bulur', 'getir', 'göster', 'listele', 'bana', 'lütfen', 'olan', 'var', 'mı', 'mi', 'de', 'da', 'internette', 'internetten', 'webde', 'web', 'webden', 'googleda', 'google', 'gündem', 'gelişmeleri', 'gelişme', 'ne', 'neler', 'yaşandı', 'bak', 'bakar', 'bakabilir', 'oku', 'okur']);
    window.wsParseVoice = function (raw) {
        const t = norm(raw);
        if (!t) return null;
        if (/^(tamam )?(akışa dön|akışa geri dön|normal(e| habere| akışa| listeye)? dön|normal liste|ana akışa dön|aramayı kapat|web aramasını kapat|web aramasından çık|aramadan çık)$/.test(t)) return { intent: 'web_exit', ui_message: 'Akışa dönüyorum' };
        const webWord = /(^| )(internette|internetten|webde|web'de|webden|googleda|google'da)( |$)/.test(t.replace(/’/g, "'"));
        const tm = window.wsParseTime(t);
        if (!tm && !webWord) return null;
        if (!/(ara|araştır|bul|getir|göster|listele|haber|gelişme|bak)/.test(t)) return null;
        let rest = (tm ? tm.rest : t);
        const words = norm(rest).split(' ').filter(w => w && !STOP.has(w) && !/^(saatteki|saatlik|günkü|günlük|haftalık|aylık|içindeki|içinde|boyunca|geçen|bu)$/.test(w));
        const q = words.join(' ').trim();
        if (q.length < 2) return null;
        return { intent: 'web_search', search_query: q, time_window: tm ? tm.win : 'any', ui_message: '🌐 ' + q + ' • ' + (tm ? winLabel(tm.win) : 'tümü') };
    };

    // Dışarıdan (sesli asistan) kullanım için
    window.wsWindowLabel = winLabel;
})();

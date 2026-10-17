// tv.js - Android TV / kumanda modu (tek kart tam ekran, ◄ ayarlar, ► filtreler)
// TV'de otomatik açılır (APK "ScrollaryTV" işaretini ekler, adres ?tv=1 ile açılır).
// Telefonda denemek için adrese ?tv=1 ekleyin; kapatmak için ?tv=0.
(function () {
    const q = new URLSearchParams(location.search).get('tv');
    try {
        if (q === '0') localStorage.removeItem('tvMode');
        if (q === '1') localStorage.setItem('tvMode', '1');
    } catch (e) {}
    let on = false;
    try { on = /ScrollaryTV|AndroidTV|Android TV|SmartTV|GoogleTV/i.test(navigator.userAgent) || localStorage.getItem('tvMode') === '1'; } catch (e) {}
    if (q === '0') on = false;
    if (!on) return;
    window.IS_TV = true;

    // TV'de "tarayıcıda aç" yok: ilk açılışta çift basış = pencerede orijinal site
    try {
        if (!localStorage.getItem('tvTapMigrated')) {
            localStorage.setItem('tapAction_single', 'last');
            localStorage.setItem('tapAction_double', 'embedded');
            localStorage.setItem('tvTapMigrated', '1');
        }
    } catch (e) {}

    const $ = (id) => document.getElementById(id);
    const OVERLAYS = ['newsModal', 'settingsModal', 'sourceFilterModal', 'guideModal'];

    // ---------- Görünüm: tek kart tam ekran ----------
    const css = document.createElement('style');
    css.textContent = `
      body.tv-mode { overflow: hidden; }
      body.tv-mode .ambient-bg, body.tv-mode #pullToRefresh, body.tv-mode #mainHeader,
      body.tv-mode .mic-fab, body.tv-mode #scrollSpinner, body.tv-mode #endRefreshSpinner { display: none !important; }
      body.tv-mode .container { padding: 0 !important; margin: 0 !important; max-width: none !important; width: 100% !important; }

      /* Üst menü yalnızca ► ile açılan tam ekran panel olarak görünür */
      body.tv-mode #controlsWrapper { display: none !important; }
      body.tv-mode.tv-panel #controlsWrapper { display: block !important; position: fixed !important; inset: 0 !important; z-index: 3000 !important;
          overflow-y: auto !important; background: var(--bg, #0b1220) !important; padding: 16px 4% 40px !important; max-height: none !important; }
      body.tv-mode.tv-panel #controlsWrapper .controls-content { display: block !important; max-height: none !important; overflow: visible !important; opacity: 1 !important; }

      body.tv-mode #newsGrid { display: block !important; padding: 0 !important; margin: 0 !important; height: 100vh; width: 100%; }
      body.tv-mode #newsGrid .swipe-wrapper { display: none !important; }
      body.tv-mode #newsGrid .swipe-wrapper.tv-current { display: block !important; width: 100vw; height: 100vh; margin: 0 !important; padding: 0 !important; transform: none !important; }
      body.tv-mode .swipe-bg { display: none !important; }
      body.tv-mode .swipe-wrapper.tv-current .news-card { position: relative !important; width: 100% !important; height: 100vh !important; margin: 0 !important; border-radius: 0 !important;
          display: block !important; background: #0b1220 !important; overflow: hidden; border: 0 !important; }
      body.tv-mode .swipe-wrapper.tv-current .card-img-wrapper { position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important; aspect-ratio: auto !important; }
      body.tv-mode .swipe-wrapper.tv-current .main-img { width: 100% !important; height: 100% !important; object-fit: cover !important; }
      body.tv-mode .swipe-wrapper.tv-current .fallback-logo { position: absolute; left: 50%; top: 38%; width: 22vh; height: 22vh; transform: translate(-50%, -50%); opacity: .5; object-fit: contain; }
      body.tv-mode .swipe-wrapper.tv-current .source-badge { position: absolute !important; top: 24px; left: 4%; font-size: 1.6rem !important; padding: 10px 22px !important; z-index: 3; pointer-events: none; }
      body.tv-mode .swipe-wrapper.tv-current .news-content { position: absolute !important; left: 0; right: 0; bottom: 0; padding: 110px 5% 84px !important; z-index: 2;
          background: linear-gradient(transparent, rgba(0,0,0,.88) 45%, rgba(0,0,0,.96)) !important; }
      body.tv-mode .swipe-wrapper.tv-current .news-content h3 { font-size: clamp(1.9rem, 6.6vh, 3.8rem) !important; line-height: 1.25 !important; display: block !important;
          -webkit-line-clamp: unset !important; max-height: none !important; color: #fff !important; text-shadow: 0 2px 10px rgba(0,0,0,.8); }
      body.tv-mode .swipe-wrapper.tv-current .meta { font-size: 1.45rem !important; margin-top: 16px; }

      /* Yazılar ~2 kat: pencereler --z oranında büyütülür, boyutlar ekrana göre ters orantıyla ayarlanır */
      body.tv-mode .modal-content { zoom: var(--z, 2); width: calc(94vw / var(--z, 2)) !important; max-width: calc(94vw / var(--z, 2)) !important;
          height: calc(86vh / var(--z, 2)) !important; max-height: calc(86vh / var(--z, 2)) !important; }
      body.tv-mode #newsModal .modal-content { width: calc(100vw / var(--z, 2)) !important; max-width: none !important; height: calc(100vh / var(--z, 2)) !important; max-height: none !important; border-radius: 0 !important; }
      body.tv-mode #newsModal #modalBodyArea { padding-bottom: 70px; }
      body.tv-mode #aiFab { width: 64px; height: 64px; font-size: 1.8rem; bottom: 70px; }
      body.tv-mode.tv-panel #controlsWrapper { zoom: var(--z, 2); inset: auto !important; top: 0 !important; left: 0 !important;
          width: calc(100vw / var(--z, 2)) !important; height: calc(100vh / var(--z, 2)) !important; padding: 8px 3% 70px !important; box-sizing: border-box; }
      body.tv-mode .tv-focus, body.tv-mode :focus-visible { outline: 4px solid #facc15 !important; outline-offset: 3px; border-radius: 12px; }
      body.tv-mode * { -webkit-tap-highlight-color: transparent; }

      #tvBar { display: none; position: fixed; left: 0; right: 0; bottom: 0; z-index: 5000; padding: 10px 4%; background: rgba(0,0,0,.72); color: #e2e8f0;
          font: 600 1.35rem system-ui, sans-serif; justify-content: space-between; gap: 14px; }
      body.tv-mode #tvBar { display: flex; }
            #tvBar b { color: #facc15; }
    `;
    document.head.appendChild(css);
    // Yazı büyütme oranı (varsayılan 2). Ekran çok dar görünüyorsa otomatik düşürülür. ?tvscale=1.5 ile değiştirilebilir.
    try {
        const qs = parseFloat(new URLSearchParams(location.search).get('tvscale'));
        if (qs > 0) localStorage.setItem('tvScale', String(qs));
        const want = parseFloat(localStorage.getItem('tvScale')) || 2;
        const z = Math.max(1, Math.min(want, innerWidth / 560));
        document.documentElement.style.setProperty('--z', String(z));
    } catch (e) { document.documentElement.style.setProperty('--z', '2'); }

    function buildBar() {
        const bar = document.createElement('div');
        bar.id = 'tvBar';
        document.body.appendChild(bar);
        setBar('feed');
    }

    const BAR = {
        feed: '<span><b>◄</b> Ayarlar</span><span><b>▲▼</b> Haber</span><span id="tvCount"></span><span><b>OK</b> Aç (2×: orijinal)</span><span><b>►</b> Filtreler</span>',
        news: '<span><b>◄</b> Okuma modu</span><span><b>►</b> Orijinal</span><span><b>OK</b> ✨ Özetle</span><span><b>▲▼</b> Kaydır</span><span><b>GERİ</b> Kapat</span>',
        ai:   '<span><b>▲▼</b> Kaydır</span><span><b>OK / GERİ</b> Özeti kapat</span>',
        menu: '<span><b>▲▼◄►</b> Gez</span><span><b>OK</b> Seç / aç</span><span><b>GERİ</b> Kapat</span>'
    };
    let barKind = '';
    function setBar(kind) { const b = $('tvBar'); if (b && kind !== barKind) { b.innerHTML = BAR[kind]; barKind = kind; if (kind === 'feed') refreshCount(); } }
    function refreshCount() {
        const l = cards(), i = curIndex(); const total = (typeof filteredArticles !== 'undefined' && filteredArticles.length) || l.length;
        const cnt = $('tvCount'); if (cnt && l.length) cnt.textContent = (i + 1) + ' / ' + total;
    }
    const aiOpen = () => { const a = $('aiInlineResult'); return !!a && getComputedStyle(a).display !== 'none'; };

    // ---------- Tek kart yönetimi ----------
    let curLink = null, lastUpTap = 0;
    const cards = () => Array.from(document.querySelectorAll('#newsGrid .swipe-wrapper'));
    function curIndex() { const i = cards().findIndex(c => c.dataset.link === curLink); return i < 0 ? 0 : i; }
    function loadMore() {
        try { if (typeof filteredArticles !== 'undefined' && typeof displayedCount !== 'undefined' && displayedCount < filteredArticles.length) renderNextBatch(); } catch (e) {}
    }
    function showCard(i, allowMore) {
        const l = cards(); if (!l.length) return;
        i = Math.max(0, Math.min(l.length - 1, i));
        l.forEach(c => c.classList.remove('tv-current'));
        l[i].classList.add('tv-current');
        curLink = l[i].dataset.link;
        const total = (typeof filteredArticles !== 'undefined' && filteredArticles.length) || l.length;
        refreshCount();
        if (allowMore && i >= l.length - 3) loadMore();
    }
    function ensureCurrent() {
        const l = cards(); if (!l.length) return;
        if (document.querySelectorAll('#newsGrid .swipe-wrapper.tv-current').length !== 1) showCard(curIndex(), false);
    }

    // ---------- Açık pencere / panel ----------
    function overlayRoot() {
        let best = null, bz = -1;
        OVERLAYS.forEach(id => {
            const m = $(id);
            if (m && m.style.display === 'flex') { const z = parseInt(getComputedStyle(m).zIndex, 10) || 0; if (z >= bz) { bz = z; best = m; } }
        });
        if (best) return best;
        const w = $('controlsWrapper');
        if (document.body.classList.contains('tv-panel') && w && !w.classList.contains('collapsed')) return w;
        return null;
    }
    const visible = (el) => {
        const r = el.getBoundingClientRect();
        if (!(r.width > 4 && r.height > 4) || getComputedStyle(el).visibility === 'hidden') return false;
        // Kapalı <details> içindeki öğeler (tarayıcı boyut bildirse de) görünmez sayılır; yalnızca <summary> başlığı görünür
        for (let d = el.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) {
            if (!d.open && !(el.tagName === 'SUMMARY' && el.parentElement === d)) return false;
        }
        try { if (el.checkVisibility && !el.checkVisibility({ checkVisibilityCSS: true, contentVisibilityAuto: true })) return false; } catch (e) {}
        return true;
    };

    function candidates(root) {
        const sel = 'button, a[href], select, input:not([type=hidden]), textarea, summary, [role=button], .chip, .c-tab, [onclick]';
        const area = innerWidth * innerHeight * 0.45;
        return Array.from(root.querySelectorAll(sel)).filter(el => {
            if (el.disabled || el.classList.contains('modal') || el.classList.contains('modal-content') || el.classList.contains('controls-toggle')) return false;
            if (!visible(el)) return false;
            const r = el.getBoundingClientRect();
            return r.width * r.height < area;
        });
    }
    function setFocus(el) {
        if (!el) return;
        if (!el.hasAttribute('tabindex') && !/^(BUTTON|A|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(el.tagName)) el.setAttribute('tabindex', '0');
        document.querySelectorAll('.tv-focus').forEach(x => x.classList.remove('tv-focus'));
        el.classList.add('tv-focus');
        try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
        try { el.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch (e) {}
    }
    function curFocus(root) { const a = document.activeElement; return a && a !== document.body && root.contains(a) ? a : null; }
    function focusIn(root) {
        const list = candidates(root);
        const first = list.find(e => !e.classList.contains('btn-close')) || list[0];
        if (first) setFocus(first);
    }
    // Yön tuşuna göre en yakın öğe
    function move(dir, root) {
        const list = candidates(root); if (!list.length) return false;
        const from = curFocus(root);
        if (!from || !list.includes(from)) { setFocus(list[0]); return true; }
        const a = from.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
        let best = null, bs = Infinity;
        for (const el of list) {
            if (el === from) continue;
            const b = el.getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2;
            const dx = bx - ax, dy = by - ay;
            const ok = dir === 'down' ? dy > 6 : dir === 'up' ? dy < -6 : dir === 'right' ? dx > 6 : dx < -6;
            if (!ok) continue;
            const vert = dir === 'up' || dir === 'down';
            // Kenar boşluğuna göre skor: geniş öğelerde (yazı kutusu, başlık) merkez uzaklığı yanıltmasın
            const main = Math.max(0, dir === 'down' ? b.top - a.bottom : dir === 'up' ? a.top - b.bottom : dir === 'right' ? b.left - a.right : a.left - b.right);
            const gap = vert ? Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right)) : Math.max(0, Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom));
            const off = vert ? Math.abs(dx) : Math.abs(dy);
            const s = main + (gap + off * 0.25) * 3;
            if (s < bs) { bs = s; best = el; }
        }
        if (best) { setFocus(best); return true; }
        return false;
    }
    function scroller(root) {
        const f = curFocus(root);
        for (let n = f || root; n && n !== document.body; n = n.parentElement) {
            const o = getComputedStyle(n).overflowY;
            if ((o === 'auto' || o === 'scroll') && n.scrollHeight > n.clientHeight + 4) return n;
        }
        return root.querySelector('.modal-body') || root;
    }
    function scrollOverlay(dir, root) { const s = scroller(root); s.scrollBy({ top: dir === 'down' ? 320 : -320, behavior: 'smooth' }); }

    // Haber penceresinde ▲▼ = metni kaydır (orijinal site sade önizlemeyse onu)
    function scrollReader(dir) {
        const dy = dir === 'down' ? 340 : -340;
        try {
            const v = $('iframeView');
            if (v && getComputedStyle(v).display !== 'none') {
                const f = $('modalIframe');
                if (f && f.contentWindow) { f.contentWindow.scrollBy({ top: dy, behavior: 'smooth' }); return; }
            }
        } catch (e) {}
        const body = $('modalBodyArea'); if (body) body.scrollBy({ top: dy, behavior: 'smooth' });
    }

    function openPanel() {
        const w = $('controlsWrapper'); if (!w) return;
        document.body.classList.add('tv-panel');
        if (w.classList.contains('collapsed') && typeof toggleControls === 'function') toggleControls();
        try { if (typeof switchControlTab === 'function') switchControlTab('filter'); } catch (e) {}
        const fl = $('filterList'); if (fl) fl.classList.add('show');
        setTimeout(() => focusIn(w), 200);
    }

    // ---------- Tuşlar ----------
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        const t = e.target, k = e.key;
        const inText = t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && !/^(checkbox|radio|button|submit)$/.test(t.type)));
        const dir = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[k];
        const ov = overlayRoot();

        if (dir) {
            if (inText && (dir === 'left' || dir === 'right')) return;     // yazı alanında imleç hareketi
            e.preventDefault(); e.stopImmediatePropagation();
            if (!ov) {                                                      // ANA EKRAN: tek kart
                if (dir === 'down') showCard(curIndex() + 1, true);
                else if (dir === 'up') {
                    if (curIndex() > 0) showCard(curIndex() - 1, false);
                    else {
                        const now = Date.now();
                        if (now - lastUpTap < 2500) { lastUpTap = 0; if (typeof showToastGlobal === 'function') showToastGlobal('🔄 Yenileniyor...', 2000); try { fetchAllRSS(true); } catch (x) {} }
                        else { lastUpTap = now; if (typeof showToastGlobal === 'function') showToastGlobal('Yenilemek için ▲ tekrar basın', 2200); }
                    }
                }
                else if (dir === 'left') openModalSafe('settingsModal');
                else if (dir === 'right') openPanel();
                return;
            }
            if (ov.id === 'newsModal') {                                    // HABER PENCERESİ
                if (aiOpen()) { const h = $('aiChatHistory'); if (h && (dir === 'up' || dir === 'down')) h.scrollBy({ top: dir === 'down' ? 320 : -320, behavior: 'smooth' }); return; }
                if (dir === 'up' || dir === 'down') scrollReader(dir);
                else if (dir === 'left') { const b = $('tabReader'); if (b) b.click(); }      // okuma modu
                else { const b = $('tabWeb'); if (b) b.click(); }                              // orijinal görünüm
                return;
            }
            if (!move(dir, ov) && (dir === 'up' || dir === 'down')) scrollOverlay(dir, ov);   // AYARLAR / FİLTRE: öğeden öğeye
            return;
        }

        if (k === 'Enter' || k === 'NumpadEnter' || k === ' ' || k === 'MediaPlayPause') {
            if (e.repeat) { e.preventDefault(); return; }
            if (!ov) {                                                      // kart: tek/çift basış mantığı kartın kendi onclick'inde
                const c = document.querySelector('#newsGrid .swipe-wrapper.tv-current .news-card');
                if (c) { e.preventDefault(); e.stopImmediatePropagation(); c.click(); }
                return;
            }
            if (ov.id === 'newsModal') {                                    // OK: özetle (özet açıksa kapat)
                e.preventDefault(); e.stopImmediatePropagation();
                if (aiOpen()) { if (typeof closeAIResult === 'function') closeAIResult(); }
                else if (typeof askAIFromWeb === 'function') askAIFromWeb();
                return;
            }
            const el = curFocus(ov);
            if (!el) return;
            if (el.tagName === 'SELECT' || inText) return;                  // açılır liste / yazı alanı kendi işini yapsın
            e.preventDefault(); e.stopImmediatePropagation();
            el.click();
            return;
        }

        if (k === 'Escape' || k === 'GoBack' || k === 'BrowserBack' || (k === 'Backspace' && !inText)) {
            if (!ov) return;
            e.preventDefault();
            if (ov.id === 'newsModal' && aiOpen() && typeof closeAIResult === 'function') closeAIResult();
            else if (ov.id === 'controlsWrapper') history.back(); else if (typeof closeModalSafe === 'function') closeModalSafe(ov.id);
        }
    }, true);

    // ---------- Başlat / izle ----------
    let lastOv = null, raf = 0;
    function sync() {
        raf = 0;
        const ov = overlayRoot();
        document.body.classList.toggle('tv-ov', !!ov && ov.id !== 'controlsWrapper');
        setBar(!ov ? 'feed' : ov.id === 'newsModal' ? (aiOpen() ? 'ai' : 'news') : 'menu');
        const w = $('controlsWrapper');
        if (w && w.classList.contains('collapsed') && document.body.classList.contains('tv-panel')) document.body.classList.remove('tv-panel');
        if (ov !== lastOv) {
            document.querySelectorAll('.tv-focus').forEach(x => x.classList.remove('tv-focus'));
            if (ov && ov.id !== 'newsModal' && ov.id !== 'controlsWrapper') setTimeout(() => focusIn(ov), 120);
            if (!ov) { try { document.activeElement && document.activeElement.blur(); } catch (e) {} }
            lastOv = ov;
        }
    }
    function start() {
        document.body.classList.add('tv-mode');
        buildBar();
        const grid = $('newsGrid');
        if (grid) new MutationObserver(() => setTimeout(ensureCurrent, 0)).observe(grid, { childList: true });
        new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(sync); }).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['style', 'class'] });
        setTimeout(ensureCurrent, 800);
    }
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();

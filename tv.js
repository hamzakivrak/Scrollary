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

    // TV'de kart açılışı: Tek OK = Okuma Modu (veri çekilemezse otomatik Orijinal Siteye geçer)
    // Çift OK (2×OK) = API yüklüyse doğrudan TV'de rahat okunur Yapay Zeka Özeti (yoksa Orijinal Site)
    try {
        localStorage.setItem('tapAction_single', 'reader');
        localStorage.setItem('tapAction_double', 'off');
        localStorage.setItem('tvTapMigratedV2', '1');
    } catch (e) {}

    const $ = (id) => document.getElementById(id);
    const OVERLAYS = ['newsModal', 'settingsModal', 'sourceFilterModal', 'guideModal', 'voiceModal'];

    // ---------- Görünüm: tek kart tam ekran + TV için rahat okunur Yapay Zeka Özeti ----------
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
      body.tv-mode #newsModal #modalBodyArea { padding-bottom: 30px; }

      /* Haber okuma penceresinde üstte sadece haber kaynağı görünsün, sekmeler ve fazlalıklar gizlensin */
      body.tv-mode #newsModal .modal-tabs,
      body.tv-mode #newsModal .modal-actions,
      body.tv-mode #newsModal .triple-tap-hint,
      body.tv-mode #newsModal .iframe-banner,
      body.tv-mode #aiFab { display: none !important; }
      body.tv-mode #newsModal .modal-header { padding: 4px 14px !important; border-bottom: 1px solid rgba(255,255,255,0.08) !important; }

      /* Okuma bölümünde başlık, fotoğraf, özet, tam metin ve yapay zeka penceresi seçilen boyuta (--tv-rz, varsayılan %75) göre ölçeklensin */
      body.tv-mode #readerView { zoom: var(--tv-rz, 0.75); }
      body.tv-mode #readerView .reader-image { max-width: 75% !important; max-height: 42vh !important; width: auto !important; height: auto !important; display: block; margin: 0 auto 14px auto !important; object-fit: contain; }

      /* TV'de Yapay Zeka Özeti: gereksiz mesaj kutuları ve kullanıcı balonları gizlenir, tam ekran rahat okunur kart görünümü */
      body.tv-mode #aiInlineResult > div:first-child { padding: 8px 18px !important; background: rgba(15, 23, 42, 0.95) !important; }
      body.tv-mode #aiInlineResult > div:first-child a,
      body.tv-mode #aiInlineResult > div:first-child button,
      body.tv-mode #aiInlineResult > div:last-child,
      body.tv-mode #aiChatHistory .ai-msg.user { display: none !important; }
      body.tv-mode #aiChatHistory { zoom: var(--tv-rz, 0.75); padding: 18px 4% 36px !important; gap: 12px !important; background: #0b1220 !important; }
      body.tv-mode #aiChatHistory .ai-msg.assistant { max-width: 100% !important; width: 100% !important; background: rgba(30, 41, 59, 0.65) !important;
          border: 1px solid rgba(148, 163, 184, 0.18) !important; border-radius: 14px !important; padding: 18px 22px !important;
          font-size: 1.18rem !important; line-height: 1.65 !important; color: #f8fafc !important; box-sizing: border-box !important; }
      body.tv-mode #aiChatHistory .summary-card .card-header { font-size: 1.25rem !important; color: #38bdf8 !important; font-weight: 800 !important; margin-bottom: 10px !important; }
      body.tv-mode #aiChatHistory .summary-card .card-intro { font-size: 1.22rem !important; line-height: 1.6 !important; color: #ffffff !important; margin-bottom: 14px !important; }
      body.tv-mode #aiChatHistory .summary-card .card-section { margin-top: 14px !important; padding-top: 10px !important; border-top: 1px solid rgba(255,255,255,0.08) !important; }
      body.tv-mode #aiChatHistory .summary-card h4 { font-size: 1.15rem !important; color: #facc15 !important; margin: 0 0 8px 0 !important; }
      body.tv-mode #aiChatHistory .summary-card li { margin-bottom: 8px !important; line-height: 1.6 !important; }

      body.tv-mode.tv-panel #controlsWrapper { zoom: var(--z, 2); inset: auto !important; top: 0 !important; left: 0 !important;
          width: calc(100vw / var(--z, 2)) !important; height: calc(100vh / var(--z, 2)) !important; padding: 8px 3% 70px !important; box-sizing: border-box; }
      body.tv-mode .tv-focus, body.tv-mode :focus-visible { outline: 4px solid #facc15 !important; outline-offset: 3px; border-radius: 12px; }
      body.tv-mode * { -webkit-tap-highlight-color: transparent; }

      #tvBar { display: none; position: fixed; left: 0; right: 0; bottom: 0; z-index: 5000; padding: 10px 4%; background: rgba(0,0,0,.78); color: #e2e8f0;
          font: 600 1.35rem system-ui, sans-serif; justify-content: space-between; gap: 14px; transition: opacity 0.4s ease, transform 0.4s ease; }
      body.tv-mode #tvBar { display: flex; }
      body.tv-mode #tvBar.tv-bar-hidden { opacity: 0 !important; transform: translateY(100%) !important; pointer-events: none !important; }
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
        feed: '<span><b>◄</b> Ayarlar</span><span><b>▲▼</b> Haber</span><span id="tvCount"></span><span><b>OK</b> Oku</span><span><b>2×OK</b> ✨ Özet</span><span><b>►</b> Filtreler</span>',
        news: '<span><b>◄</b> Okuma</span><span><b>►</b> Orijinal</span><span><b>OK</b> Boyut</span><span><b>2×OK</b> ✨ Özet</span><span><b>▲▼</b> Kaydır</span><span><b>GERİ</b> Kapat</span>',
        ai:   '<span><b>▲▼</b> Kaydır</span><span><b>OK</b> Boyut</span><span><b>2×OK / GERİ</b> Özeti kapat</span>',
        menu: '<span><b>▲▼◄►</b> Gez</span><span><b>OK</b> Seç / aç</span><span><b>GERİ</b> Kapat</span>'
    };
    let barKind = '';
    let barHideTimer = null;

    function scheduleBarAutoHide(kind) {
        const b = $('tvBar');
        if (!b) return;
        clearTimeout(barHideTimer);
        b.classList.remove('tv-bar-hidden');
        // Okuma veya Yapay Zeka ekranındayken alt yönlendirme çubuğu 3 saniye sonra gizlensin
        if (kind === 'news' || kind === 'ai') {
            barHideTimer = setTimeout(() => {
                if (barKind === 'news' || barKind === 'ai') {
                    b.classList.add('tv-bar-hidden');
                }
            }, 3000);
        }
    }

    function setBar(kind, forceShow) {
        const b = $('tvBar');
        if (!b) return;
        if (kind !== barKind) {
            b.innerHTML = BAR[kind];
            barKind = kind;
            if (kind === 'feed') refreshCount();
            scheduleBarAutoHide(kind);
        } else if (forceShow) {
            scheduleBarAutoHide(kind);
        }
    }

    function refreshCount() {
        const l = cards(), i = curIndex(); const total = (typeof filteredArticles !== 'undefined' && filteredArticles.length) || l.length;
        const cnt = $('tvCount'); if (cnt && l.length) cnt.textContent = (i + 1) + ' / ' + total;
    }
    const aiOpen = () => { const a = $('aiInlineResult'); return !!a && getComputedStyle(a).display !== 'none'; };

    // API anahtarı (Groq veya Gemini) yüklü mü kontrolü
    function hasAIKey() {
        try {
            if (typeof allAIKeys === 'function' && allAIKeys().length > 0) return true;
            const g = JSON.parse(localStorage.getItem('groqApiKeys') || '[]');
            const m = JSON.parse(localStorage.getItem('geminiApiKeys') || '[]');
            return (g.length + m.length) > 0;
        } catch (e) { return false; }
    }

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
        refreshCount();
        if (allowMore && i >= l.length - 3) loadMore();
    }
    function ensureCurrent() {
        const l = cards(); if (!l.length) return;
        if (document.querySelectorAll('#newsGrid .swipe-wrapper.tv-current').length !== 1) showCard(curIndex(), false);
    }

    // ---------- Veri Çekilemezse Otomatik Orijinal Siteye Yönlendirme ----------
    // Okuma modunda metin alınamazsa (.reader-fail oluşursa) hiç bekletmeden Orijinal Site görünümünü açar
    let autoSwitchedLink = '';
    let wantDirectAISummary = false;

    function watchReaderFallbackAndAI() {
        const box = $('fullTextContainer');
        if (!box) return;
        new MutationObserver(() => {
            const nm = $('newsModal');
            if (!nm || nm.style.display !== 'flex') return;

            // 1) Eğer haber kartında 2×OK ile doğrudan AI Özeti istendiyse, metin (veya özet) hazır olur olmaz AI özetini tetikle
            if (wantDirectAISummary && !box.querySelector('.loading-pulse')) {
                wantDirectAISummary = false;
                if (typeof askAIFromWeb === 'function') {
                    askAIFromWeb();
                    setTimeout(() => { window.tvApplyZoom(); sync(); }, 80);
                }
            }

            // 2) Okuma modunda veri çekilemediyse (.reader-fail) otomatik olarak Orijinal Site sekmesine yönlendir
            const failEl = box.querySelector('.reader-fail');
            if (failEl && !aiOpen()) {
                const artKey = (typeof originalState !== 'undefined' && originalState.art && originalState.art.link) || curLink || 'curr';
                if (autoSwitchedLink !== artKey) {
                    autoSwitchedLink = artKey;
                    if (typeof showToastGlobal === 'function') {
                        showToastGlobal('🌐 Metin çekilemedi, orijinal site açılıyor...', 2200);
                    }
                    window.__frameNow = true;
                    window.__frameMode = 'web-sade';
                    if (typeof switchTab === 'function') switchTab('web');
                    else { const b = $('tabWeb'); if (b) b.click(); }
                    setTimeout(() => window.tvApplyZoom(), 250);
                }
            }
        }).observe(box, { childList: true, subtree: true });
    }

    // ---------- Açık pencere / panel ve Sıralı Geri Tuşu Yönetimi ----------
    const openStack = []; // Açılan pencereleri sırayla takip eder
    let directAiEntry = false; // Ana ekranda 2×OK ile doğrudan AI özetine girildiyse tek GERİ ile tamamen çıkılsın

    function isOverlayOpen(id) {
        if (id === 'controlsWrapper') {
            const w = $('controlsWrapper');
            return document.body.classList.contains('tv-panel') && !!w && !w.classList.contains('collapsed');
        }
        const m = $(id);
        return !!m && m.style.display === 'flex';
    }

    function refreshOpenStack() {
        for (let i = openStack.length - 1; i >= 0; i--) {
            if (!isOverlayOpen(openStack[i])) openStack.splice(i, 1);
        }
        [...OVERLAYS, 'controlsWrapper'].forEach(id => {
            if (isOverlayOpen(id) && !openStack.includes(id)) openStack.push(id);
        });
    }

    function overlayRoot() {
        refreshOpenStack();
        if (openStack.length > 0) return $(openStack[openStack.length - 1]);
        return null;
    }

    let backTrapReady = false;
    function ensureHistoryGuard() {
        if (backTrapReady) return;
        backTrapReady = true;
        try { history.pushState({ tvGuard: 1 }, ''); } catch (e) {}
    }

    function closeTopmostOverlay(fromPopState) {
        // 1) Haber penceresi içindeyken Yapay Zeka Özeti açıksa:
        //    - Eğer ana ekrandan 2×OK ile doğrudan özete girildiyse tek GERİ ile haber penceresini de kapatıp akışa dön
        //    - Eğer okuma içinden 2×OK ile açıldıysa sadece özeti kapatıp okumaya dön
        const nm = $('newsModal');
        if (nm && nm.style.display === 'flex' && aiOpen()) {
            if (typeof closeAIResult === 'function') closeAIResult();
            else { const a = $('aiInlineResult'); if (a) { a.classList.remove('show'); a.style.display = 'none'; } }
            if (!directAiEntry) {
                try { history.pushState({ tvGuard: 1 }, ''); } catch (e) {}
                setTimeout(sync, 20);
                return true;
            }
            directAiEntry = false;
        }

        // 2) En son açılan menüyü/pencereyi bul ve kapat
        const top = overlayRoot();
        if (!top) return false;

        const id = top.id;
        const idx = openStack.lastIndexOf(id);
        if (idx !== -1) openStack.splice(idx, 1);

        if (id === 'controlsWrapper') {
            document.body.classList.remove('tv-panel');
            top.classList.add('collapsed');
            const icon = $('toggleIcon');
            if (icon) icon.style.transform = 'rotate(0deg)';
        } else {
            top.style.display = 'none';
            if (id === 'newsModal') {
                directAiEntry = false;
                wantDirectAISummary = false;
                if (typeof window.speechSynthesis !== 'undefined') window.speechSynthesis.cancel();
                if (typeof hideTooltip === 'function') hideTooltip();
                const iframe = $('modalIframe');
                if (iframe) iframe.src = 'about:blank';
            }
            if (id === 'voiceModal' && typeof isListening !== 'undefined' && isListening && typeof recognition !== 'undefined' && recognition) {
                try { recognition.stop(); } catch (e) {}
            }
        }

        refreshOpenStack();
        if (openStack.length > 0 || fromPopState) {
            try { history.pushState({ tvGuard: 1 }, ''); } catch (e) {}
        }
        setTimeout(sync, 20);
        return true;
    }

    window.addEventListener('popstate', (e) => {
        if (aiOpen() || overlayRoot()) {
            e.stopImmediatePropagation();
            closeTopmostOverlay(true);
        }
    }, true);

    const visible = (el) => {
        const r = el.getBoundingClientRect();
        if (!(r.width > 4 && r.height > 4) || getComputedStyle(el).visibility === 'hidden') return false;
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
        const v = $('iframeView');
        if (v && getComputedStyle(v).display !== 'none') {
            const f = $('modalIframe');
            try { if (f && f.contentWindow) f.contentWindow.postMessage({ tvScroll: dy }, '*'); } catch (e) {}
            return;
        }
        const body = $('modalBodyArea'); if (body) body.scrollBy({ top: dy, behavior: 'smooth' });
    }

    // ---------- Kalıcı Yazı ve İçerik Boyutu Yönetimi (Varsayılan %75, OK ile kademeli değişim, kalıcı kayıt) ----------
    const ZOOM_STEPS = [0.75, 0.9, 1.05, 0.5, 0.6];
    const ZOOM_KEY = 'tvReadZoomV75';
    let rz = 0.75;
    try {
        const saved = parseFloat(localStorage.getItem(ZOOM_KEY));
        if (saved > 0.2 && saved <= 3.0) {
            rz = saved;
        } else {
            rz = 0.75;
            localStorage.setItem(ZOOM_KEY, String(rz));
        }
        localStorage.setItem('tvReadZoom', String(rz));
    } catch (e) {}

    function saveZoom(val) {
        rz = val;
        try {
            localStorage.setItem(ZOOM_KEY, String(rz));
            localStorage.setItem('tvReadZoom', String(rz));
            localStorage.setItem('readerFontPx', String(Math.round(17 * rz * 1.15)));
        } catch (e) {}
    }

    window.tvApplyZoom = function () {
        try {
            const s = parseFloat(localStorage.getItem(ZOOM_KEY));
            if (s > 0.2 && s <= 3.0) rz = s;
        } catch (e) {}
        document.documentElement.style.setProperty('--tv-rz', String(rz));
        const rv = $('readerView'); if (rv) rv.style.zoom = String(rz);
        const aiHist = $('aiChatHistory'); if (aiHist) aiHist.style.zoom = String(rz);
        const f = $('modalIframe');
        try { if (f && f.contentWindow) f.contentWindow.postMessage({ tvZoom: rz }, '*'); } catch (e) {}
    };
    window.tvZoom = function (d) {
        const next = Math.max(0.35, Math.min(2.2, Math.round((rz + d * 0.15) * 100) / 100));
        saveZoom(next);
        window.tvApplyZoom();
        if (typeof showToastGlobal === 'function') showToastGlobal('🔠 Boyut %' + Math.round(rz * 100), 1200);
    };
    window.tvCycleZoom = function () {
        let idx = ZOOM_STEPS.findIndex(s => Math.abs(s - rz) < 0.06);
        idx = (idx + 1) % ZOOM_STEPS.length;
        saveZoom(ZOOM_STEPS[idx]);
        window.tvApplyZoom();
        const hint = aiOpen() ? ' (2×OK: Kapat)' : ' (2×OK: ✨ Özet)';
        if (typeof showToastGlobal === 'function') showToastGlobal('🔠 Boyut %' + Math.round(rz * 100) + hint, 1400);
    };

    function scrollAI(dir) {
        const root = $('aiInlineResult'); if (!root) return;
        const dy = dir === 'down' ? 320 : -320;
        const els = [$('aiChatHistory'), ...root.querySelectorAll('*')].filter(Boolean);
        const sc = els.find(n => { const o = getComputedStyle(n).overflowY; return (o === 'auto' || o === 'scroll') && n.scrollHeight > n.clientHeight + 4; });
        (sc || $('aiChatHistory') || root).scrollBy({ top: dy, behavior: 'smooth' });
    }

    function openPanel() {
        const w = $('controlsWrapper'); if (!w) return;
        ensureHistoryGuard();
        document.body.classList.add('tv-panel');
        if (w.classList.contains('collapsed') && typeof toggleControls === 'function') toggleControls();
        try { if (typeof switchControlTab === 'function') switchControlTab('filter'); } catch (e) {}
        const fl = $('filterList'); if (fl) fl.classList.add('show');
        refreshOpenStack();
        setTimeout(() => focusIn(w), 200);
    }

    // ---------- Ana Ekranda Haberi Açma (Tek OK = Okuma + Otomatik Yönlendirme, Çift OK = Direkt AI Özeti) ----------
    function findCurrentArticleObj() {
        const w = document.querySelector('#newsGrid .swipe-wrapper.tv-current');
        if (!w) return null;
        const link = w.dataset.link;
        if (typeof filteredArticles !== 'undefined' && Array.isArray(filteredArticles)) {
            const hit = filteredArticles.find(a => a && a.link === link);
            if (hit) return hit;
        }
        if (typeof allArticles !== 'undefined' && Array.isArray(allArticles)) {
            const hit = allArticles.find(a => a && a.link === link);
            if (hit) return hit;
        }
        return null;
    }

    function openCurrentCardReader() {
        ensureHistoryGuard();
        directAiEntry = false;
        wantDirectAISummary = false;
        autoSwitchedLink = '';
        const art = findCurrentArticleObj();
        if (art && typeof openModal === 'function') {
            openModal(art);
        } else {
            const c = document.querySelector('#newsGrid .swipe-wrapper.tv-current .news-card');
            if (c) c.click();
        }
    }

    function openCurrentCardAISummary() {
        ensureHistoryGuard();
        autoSwitchedLink = '';
        const art = findCurrentArticleObj();
        if (!hasAIKey()) {
            // API anahtarı yüklü değilse bilgi ver ve orijinal siteyi aç
            if (typeof showToastGlobal === 'function') showToastGlobal('⚠️ API anahtarı yok, orijinal site açılıyor...', 2200);
            openCurrentCardReader();
            setTimeout(() => {
                window.__frameNow = true;
                window.__frameMode = 'web-sade';
                if (typeof switchTab === 'function') switchTab('web');
            }, 80);
            return;
        }

        directAiEntry = true;
        wantDirectAISummary = true;
        if (art && typeof openModal === 'function') {
            openModal(art);
        } else {
            const c = document.querySelector('#newsGrid .swipe-wrapper.tv-current .news-card');
            if (c) c.click();
        }
        // Yapay zeka penceresini hemen görünür yap, metin çekilir çekilmez (veya en geç 1.4 sn içinde özetle) yanıt üretilsin
        const aiModal = $('aiInlineResult');
        const historyDiv = $('aiChatHistory');
        if (aiModal && historyDiv) {
            historyDiv.innerHTML = '<div class="ai-msg assistant loading">🤖 Haber analiz ediliyor, özet hazırlanıyor...</div>';
            aiModal.classList.add('show');
            aiModal.style.display = 'flex';
            window.tvApplyZoom();
            sync();
        }
        setTimeout(() => {
            if (wantDirectAISummary) {
                wantDirectAISummary = false;
                if (historyDiv) historyDiv.innerHTML = '';
                if (typeof askAIFromWeb === 'function') askAIFromWeb();
                setTimeout(() => { window.tvApplyZoom(); sync(); }, 60);
            }
        }, 1400);
    }

    // ---------- OK tuşu: Mi Stick ses kombinasyonu (OK basılıyken Ses +/−) ve Tek/Çift tık ayrımı ----------
    let okDownAt = 0;
    let okUsedCombo = false;
    let okSingleTimer = null;
    let lastOkTapAt = 0;
    let feedOkTimer = null;
    let lastFeedOkAt = 0;

    const isOkKey = (k) => k === 'Enter' || k === 'NumpadEnter' || k === ' ' || k === 'MediaPlayPause';
    const isVolUpKey = (k) => k === 'AudioVolumeUp' || k === 'VolumeUp' || k === '+' || k === '=';
    const isVolDownKey = (k) => k === 'AudioVolumeDown' || k === 'VolumeDown' || k === '-';

    // Orijinal tvZoom çağrıldığında (APK MainActivity.java onKeyDown üzerinden gelse bile) OK basılıysa kombo say
    const origTvZoom = window.tvZoom;
    window.tvZoom = function (d) {
        okUsedCombo = true;
        if (okSingleTimer) { clearTimeout(okSingleTimer); okSingleTimer = null; }
        if (feedOkTimer) { clearTimeout(feedOkTimer); feedOkTimer = null; }
        lastOkTapAt = 0;
        lastFeedOkAt = 0;
        return origTvZoom(d);
    };

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        const t = e.target, k = e.key;
        const inText = t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && !/^(checkbox|radio|button|submit)$/.test(t.type)));
        const dir = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[k];
        const ov = overlayRoot();

        if (ov && ov.id === 'newsModal' && !inText) {                       // okuma & AI özeti: yazı boyutu (ses +/−, + / −)
            if (isVolUpKey(k)) {
                e.preventDefault(); e.stopImmediatePropagation();
                okUsedCombo = true;
                if (okSingleTimer) { clearTimeout(okSingleTimer); okSingleTimer = null; }
                window.tvZoom(1);
                return;
            }
            if (isVolDownKey(k)) {
                e.preventDefault(); e.stopImmediatePropagation();
                okUsedCombo = true;
                if (okSingleTimer) { clearTimeout(okSingleTimer); okSingleTimer = null; }
                window.tvZoom(-1);
                return;
            }
        }
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
                else if (dir === 'left') { ensureHistoryGuard(); openModalSafe('settingsModal'); }
                else if (dir === 'right') openPanel();
                return;
            }
            if (ov.id === 'newsModal') {                                    // HABER PENCERESİ
                if (aiOpen()) { if (dir === 'up' || dir === 'down') scrollAI(dir); return; }
                if (dir === 'up' || dir === 'down') scrollReader(dir);
                else if (dir === 'left') { const b = $('tabReader'); if (b) b.click(); setTimeout(() => window.tvApplyZoom(), 50); }      // okuma modu
                else { const b = $('tabWeb'); if (b) b.click(); setTimeout(() => window.tvApplyZoom(), 200); }                            // orijinal görünüm
                return;
            }
            if (!move(dir, ov) && (dir === 'up' || dir === 'down')) scrollOverlay(dir, ov);   // AYARLAR / FİLTRE: öğeden öğeye
            return;
        }

        if (isOkKey(k)) {
            if ((!ov || ov.id === 'newsModal') && !inText) {
                // Ana ekranda ve Haber penceresinde OK işlemi keyup'ta yapılır:
                // Böylece Tek OK / 2×OK ayrımı ve Mi Stick Ses kombosu kusursuz çalışır
                e.preventDefault(); e.stopImmediatePropagation();
                if (!e.repeat && !okDownAt) {
                    okDownAt = Date.now();
                    okUsedCombo = false;
                }
                return;
            }
            if (e.repeat) { e.preventDefault(); return; }
            const el = curFocus(ov);
            if (!el) return;
            if (el.tagName === 'SELECT' || inText) return;                  // açılır liste / yazı alanı kendi işini yapsın
            e.preventDefault(); e.stopImmediatePropagation();
            el.click();
            return;
        }

        if (k === 'Escape' || k === 'GoBack' || k === 'BrowserBack' || (k === 'Backspace' && !inText)) {
            if (aiOpen() || ov) {
                e.preventDefault(); e.stopImmediatePropagation();
                closeTopmostOverlay(false);
            }
        }
    }, true);

    document.addEventListener('keyup', (e) => {
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        const t = e.target, k = e.key;
        if (!isOkKey(k)) return;
        const inText = t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && !/^(checkbox|radio|button|submit)$/.test(t.type)));
        const ov = overlayRoot();

        // 1) ANA EKRAN (Haber Kartları): Tek OK = Okuma Modu (veri çekilemezse otomatik Orijinal Site), 2×OK = Direkt AI Özeti
        if (!ov && !inText) {
            e.preventDefault(); e.stopImmediatePropagation();
            const heldMs = okDownAt ? (Date.now() - okDownAt) : 0;
            const wasCombo = okUsedCombo;
            okDownAt = 0;
            okUsedCombo = false;
            if (wasCombo || heldMs > 550) return;

            const now = Date.now();
            if (now - lastFeedOkAt < 420) {
                if (feedOkTimer) { clearTimeout(feedOkTimer); feedOkTimer = null; }
                lastFeedOkAt = 0;
                openCurrentCardAISummary();
            } else {
                lastFeedOkAt = now;
                if (feedOkTimer) clearTimeout(feedOkTimer);
                feedOkTimer = setTimeout(() => {
                    feedOkTimer = null;
                    lastFeedOkAt = 0;
                    openCurrentCardReader();
                }, 380);
            }
            return;
        }

        // 2) HABER OKUMA / AI ÖZETİ PENCERESİ: Tek OK = Boyut değiştir, 2×OK = AI Özeti Aç/Kapat
        if (!ov || ov.id !== 'newsModal' || inText) {
            okDownAt = 0; okUsedCombo = false;
            return;
        }
        e.preventDefault(); e.stopImmediatePropagation();
        const heldMs = okDownAt ? (Date.now() - okDownAt) : 0;
        const wasCombo = okUsedCombo;
        okDownAt = 0;
        okUsedCombo = false;

        if (wasCombo || heldMs > 550) return;

        const now = Date.now();
        if (now - lastOkTapAt < 420) {
            if (okSingleTimer) { clearTimeout(okSingleTimer); okSingleTimer = null; }
            lastOkTapAt = 0;
            if (aiOpen()) {
                if (typeof closeAIResult === 'function') closeAIResult();
                setTimeout(sync, 20);
            } else {
                ensureHistoryGuard();
                directAiEntry = false;
                if (typeof askAIFromWeb === 'function') askAIFromWeb();
                setTimeout(() => { window.tvApplyZoom(); sync(); }, 50);
            }
        } else {
            lastOkTapAt = now;
            if (okSingleTimer) clearTimeout(okSingleTimer);
            okSingleTimer = setTimeout(() => {
                okSingleTimer = null;
                lastOkTapAt = 0;
                window.tvCycleZoom();
            }, 420);
        }
    }, true);

    // ---------- Başlat / izle ----------
    let lastOv = null, lastAi = false, raf = 0, volCap = false;
    function sync() {
        raf = 0;
        const ov = overlayRoot();
        const ai = aiOpen();
        if (ov || ai) ensureHistoryGuard();
        document.body.classList.toggle('tv-ov', !!ov && ov.id !== 'controlsWrapper');
        const nextKind = !ov ? 'feed' : ov.id === 'newsModal' ? (ai ? 'ai' : 'news') : 'menu';
        const justOpenedNewsOrAi = (ov !== lastOv && ov && ov.id === 'newsModal') || (ai !== lastAi && ai);
        setBar(nextKind, justOpenedNewsOrAi);
        lastAi = ai;

        const w = $('controlsWrapper');
        if (w && w.classList.contains('collapsed') && document.body.classList.contains('tv-panel')) document.body.classList.remove('tv-panel');
        const wantVol = !!ov && ov.id === 'newsModal';
        if (wantVol) window.tvApplyZoom();
        if (wantVol !== volCap) {
            volCap = wantVol;
            try { if (window.AndroidTV && AndroidTV.volCapture) AndroidTV.volCapture(wantVol); } catch (e) {}
            if (wantVol) {
                setTimeout(() => window.tvApplyZoom && window.tvApplyZoom(), 150);
                setTimeout(() => window.tvApplyZoom && window.tvApplyZoom(), 500);
            }
        }
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
        window.tvApplyZoom();
        watchReaderFallbackAndAI();
        const grid = $('newsGrid');
        if (grid) new MutationObserver(() => setTimeout(ensureCurrent, 0)).observe(grid, { childList: true });
        new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(sync); }).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['style', 'class'] });
        setTimeout(ensureCurrent, 800);
    }
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
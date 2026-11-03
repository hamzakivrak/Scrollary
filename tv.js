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

    // ---------- Görünüm: tek kart tam ekran + Kart Üstünde Hızlı Kayar Haber Bandı + TV Yapay Zeka Özeti ----------
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
      body.tv-mode .swipe-wrapper.tv-current .source-badge { position: absolute !important; top: 24px; left: 4%; font-size: 1.5rem !important; padding: 8px 20px !important; z-index: 4; pointer-events: none; }
      body.tv-mode .swipe-wrapper.tv-current .news-content { position: absolute !important; left: 0; right: 0; bottom: 0; padding: 90px 4% 72px !important; z-index: 2;
          background: linear-gradient(transparent, rgba(0,0,0,.85) 35%, rgba(0,0,0,.97)) !important;
          display: flex !important; flex-direction: column !important; justify-content: flex-end !important; box-sizing: border-box !important; }
      body.tv-mode .swipe-wrapper.tv-current .news-content h3 { font-size: clamp(1.8rem, 5.6vh, 3.2rem) !important; line-height: 1.25 !important; display: block !important;
          -webkit-line-clamp: unset !important; max-height: none !important; color: #fff !important; text-shadow: 0 2px 10px rgba(0,0,0,.8); margin: 0 0 14px 0 !important; }
      body.tv-mode .swipe-wrapper.tv-current .meta { font-size: 1.35rem !important; margin-top: 10px; }

      /* Sağ üst köşe durum rozeti: metin çekiliyor / tam metin / çekilemedi bilgisi */
      .tv-fetch-badge {
          position: absolute;
          top: 26px;
          right: 4%;
          z-index: 5;
          font: 600 1.05rem system-ui, sans-serif;
          padding: 7px 16px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.82);
          color: #cbd5e1;
          border: 1px solid rgba(148, 163, 184, 0.25);
          backdrop-filter: blur(6px);
          pointer-events: none;
          transition: opacity 0.35s ease, transform 0.35s ease;
      }
      .tv-fetch-badge.warn {
          background: rgba(127, 29, 29, 0.88);
          color: #fecaca;
          border-color: rgba(248, 113, 113, 0.45);
      }
      .tv-fetch-badge.ok {
          background: rgba(6, 78, 59, 0.88);
          color: #a7f3d0;
          border-color: rgba(52, 211, 153, 0.4);
      }

      /* ===== KART ÜZERİNDE SADECE KAYAR HABER BANDI (TICKER) ===== */
      .tv-card-reader {
          display: block;
          width: 100%;
          margin-top: 4px;
          box-sizing: border-box;
      }
      .tv-ticker-wrap {
          position: relative;
          width: 100%;
          overflow: hidden;
          background: rgba(15, 23, 42, 0.92);
          border: 1px solid rgba(56, 189, 248, 0.35);
          border-left: 6px solid #e11d48;
          border-radius: 10px;
          padding: 11px 0;
          box-shadow: 0 6px 22px rgba(0, 0, 0, 0.55);
      }
      .tv-ticker-track {
          display: inline-block;
          white-space: nowrap;
          padding-left: 100%;
          font: 600 clamp(1.35rem, 3.4vh, 2.05rem)/1.35 system-ui, sans-serif;
          color: #f8fafc;
          will-change: transform;
          animation: tvTickerScroll var(--ticker-dur, 35s) linear infinite;
      }
      .tv-ticker-track .tv-sep {
          color: #facc15;
          margin: 0 28px;
          font-weight: 800;
      }
      @keyframes tvTickerScroll {
          0%   { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-100%, 0, 0); }
      }

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

      /* Okuma bölümünde başlık, fotoğraf, özet ve tam metin seçilen boyuta (--tv-rz, varsayılan %75) göre ölçeklensin */
      body.tv-mode #readerView { zoom: var(--tv-rz, 0.75); }
      body.tv-mode #readerView .reader-image { max-width: 75% !important; max-height: 42vh !important; width: auto !important; height: auto !important; display: block; margin: 0 auto 14px auto !important; object-fit: contain; }

      /* TV'de Yapay Zeka Özeti: iç kutuların tüm yükseklik/taşma sınırlarını kaldırıp tek bir tam ekran kaydırma alanı yapıyoruz */
      body.tv-mode #aiInlineResult { display: none; position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important;
          max-height: none !important; overflow-y: auto !important; overflow-x: hidden !important; background: #0b1220 !important; z-index: 9999 !important; }
      body.tv-mode #aiInlineResult.show { display: block !important; }
      body.tv-mode #aiInlineResult > div:first-child { padding: 2px 12px !important; min-height: 0 !important; height: auto !important;
          background: rgba(15, 23, 42, 0.95) !important; border-bottom: 1px solid rgba(255,255,255,0.06) !important; }
      body.tv-mode #aiInlineResult > div:first-child span { font-size: 0.7rem !important; line-height: 1.1 !important; opacity: 0.75 !important; font-weight: 600 !important; }
      body.tv-mode #aiInlineResult > div:first-child a,
      body.tv-mode #aiInlineResult > div:first-child button,
      body.tv-mode #aiInlineResult > div:last-child,
      body.tv-mode #aiChatHistory .ai-msg.user { display: none !important; }

      body.tv-mode #aiChatHistory,
      body.tv-mode #aiChatHistory * { max-height: none !important; height: auto !important; overflow: visible !important; }

      body.tv-mode #aiChatHistory { display: block !important; padding: 8px 3% 120px !important; background: #0b1220 !important; zoom: var(--tv-rz, 0.75); }
      body.tv-mode #aiChatHistory .ai-msg.assistant { max-width: 100% !important; width: 100% !important; margin: 0 !important;
          background: transparent !important; border: none !important; box-shadow: none !important;
          padding: 4px 6px !important; font-size: 1.15rem !important; line-height: 1.62 !important; color: #f8fafc !important; box-sizing: border-box !important; }
      body.tv-mode #aiChatHistory .summary-card { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important; }
      body.tv-mode #aiChatHistory .summary-card .card-header { font-size: 0.95rem !important; color: #38bdf8 !important; font-weight: 700 !important; margin-bottom: 6px !important; }
      body.tv-mode #aiChatHistory .summary-card .card-intro { font-size: 1.18rem !important; line-height: 1.58 !important; color: #ffffff !important; margin-bottom: 12px !important; }
      body.tv-mode #aiChatHistory .summary-card .card-section { margin-top: 12px !important; padding-top: 8px !important; border-top: 1px solid rgba(255,255,255,0.1) !important; }
      body.tv-mode #aiChatHistory .summary-card h4 { font-size: 1.1rem !important; color: #facc15 !important; margin: 0 0 6px 0 !important; }
      body.tv-mode #aiChatHistory .summary-card li { margin-bottom: 6px !important; line-height: 1.58 !important; }

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

    // ---------- Ayarlar Menüsüne "📺 TV Kayar Metin & Otomasyon" Enjeksiyonu ----------
    window.tvSetTickerSpeed = function (speedVal) {
        try {
            localStorage.setItem('tvTickerSpeed', String(speedVal));
            if (typeof showToastGlobal === 'function') {
                showToastGlobal('⚡ Kayar metin hızı güncellendi', 1200);
            }
        } catch (e) {}
        // Ekranda açık olan kayar bandın hızını anında güncelle
        const track = document.querySelector('#newsGrid .swipe-wrapper.tv-current .tv-ticker-track');
        if (track && track.dataset.chars) {
            const totalChars = parseInt(track.dataset.chars, 10) || 200;
            const multiplier = parseFloat(speedVal) || 1.0;
            const sec = Math.max(10, Math.round((totalChars * 0.117) / multiplier));
            track.style.setProperty('--ticker-dur', sec + 's');
        }
        // Zamanlayıcıyı da yeni hıza göre yeniden hesapla
        if (!overlayRoot()) attachCardLiveTickerAndReader();
    };

    window.tvSetAutoAdvance = function (val) {
        try {
            localStorage.setItem('tvAutoAdvance', String(val));
            if (typeof showToastGlobal === 'function') {
                showToastGlobal(val === '1' ? '🔄 Otomatik haber geçişi açıldı' : '⏸️ Otomatik geçiş kapatıldı', 1400);
            }
        } catch (e) {}
        if (!overlayRoot()) attachCardLiveTickerAndReader();
    };

    function injectTvSettings() {
        const modalBody = document.querySelector('#settingsModal .modal-body');
        if (!modalBody || document.getElementById('tvSettingsDetail')) return;
        const curSpeed = localStorage.getItem('tvTickerSpeed') || '1.0';
        const curAuto = localStorage.getItem('tvAutoAdvance') !== '0' ? '1' : '0';
        const details = document.createElement('details');
        details.className = 'setting-item';
        details.id = 'tvSettingsDetail';
        details.innerHTML = `
            <summary>📺 TV Kayar Metin & Otomasyon</summary>
            <div class="setting-detail">
                <label class="tap-label" for="tvTickerSpeedSelect">Kart Üzerindeki Metin Akma Hızı</label>
                <select id="tvTickerSpeedSelect" class="tap-select" onchange="window.tvSetTickerSpeed(this.value)">
                    <option value="0.75">🐢 Yavaş (%75)</option>
                    <option value="1.0">⚡ Normal / Varsayılan (%100 - %10 Hızlı)</option>
                    <option value="1.25">🚀 Hızlı (%125)</option>
                    <option value="1.5">🏎️ Çok Hızlı (%150)</option>
                </select>
                <p style="color: var(--text-muted); font-size: 0.8rem; margin: 6px 0 14px 0;">Ana ekrandaki kartların altında kayan haber metninin akış hızını belirler.</p>

                <label class="tap-label" for="tvAutoAdvanceSelect">Otomatik Sonraki Habere Geçiş</label>
                <select id="tvAutoAdvanceSelect" class="tap-select" onchange="window.tvSetAutoAdvance(this.value)">
                    <option value="1">🔄 Açık (Metin bitince / çekilemezse 15 sn)</option>
                    <option value="0">⏸️ Kapalı (Yalnızca kumanda ile geç)</option>
                </select>
                <p style="color: var(--text-muted); font-size: 0.8rem; margin: 6px 0 0;">Metin aktıktan sonra veya metin çekilemezse 15 saniye sonra kendiliğinden sıradaki habere geçer.</p>
            </div>
        `;
        modalBody.prepend(details);
        const selSpeed = document.getElementById('tvTickerSpeedSelect');
        if (selSpeed) selSpeed.value = curSpeed;
        const selAuto = document.getElementById('tvAutoAdvanceSelect');
        if (selAuto) selAuto.value = curAuto;
    }

    // ---------- Ana Ekranda Kart Üzerinde Kayar Haber Bandı & Otomatik Sonraki Habere Geçiş ----------
    let tickerToken = 0;
    let autoAdvanceTimer = null;

    function advanceToNextCard() {
        if (overlayRoot() || aiOpen()) return;
        const l = cards();
        if (!l.length) return;
        const nextIdx = (curIndex() + 1 >= l.length) ? 0 : (curIndex() + 1);
        showCard(nextIdx, true);
    }

    function stopCardTicker() {
        clearTimeout(autoAdvanceTimer);
        autoAdvanceTimer = null;
        tickerToken++;
        document.querySelectorAll('#newsGrid .swipe-wrapper').forEach(w => {
            w.querySelectorAll('.tv-card-reader, .tv-fetch-badge').forEach(el => el.remove());
        });
    }

    function splitIntoReadableParas(text) {
        if (!text) return [];
        const raw = String(text).split(/\n+/).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
        const out = [];
        for (const block of raw) {
            if (block.length <= 220) {
                out.push(block);
            } else {
                const sents = block.match(/[^.!?…]+[.!?…]+["”')]*\s*|[^.!?…]+$/g) || [block];
                let cur = '';
                for (const s of sents) {
                    if ((cur + ' ' + s).trim().length > 210 && cur.length >= 55) {
                        out.push(cur.trim());
                        cur = s;
                    } else {
                        cur = (cur + ' ' + s).trim();
                    }
                }
                if (cur.trim()) out.push(cur.trim());
            }
        }
        return out.filter(p => p.length >= 15);
    }

    async function fetchArticleParasForPeek(art) {
        if (!art) return { ok: false, paras: [] };
        if (typeof READER_CACHE !== 'undefined' && READER_CACHE.has(art.link)) {
            const c = READER_CACHE.get(art.link);
            if (c && Array.isArray(c.paras) && c.paras.length) return { ok: true, paras: c.paras };
        }
        if (art.content && art.content.length > 200) {
            const fp = typeof finalizeParas === 'function'
                ? finalizeParas(art.content.split('\n\n'), art)
                : splitIntoReadableParas(art.content);
            if (fp.length >= 2) return { ok: true, paras: fp };
        }
        try {
            let url = art.link;
            if (typeof workerBase === 'function' && workerBase() && typeof workerRead === 'function') {
                const w = await workerRead(url, art);
                if (w && Array.isArray(w.paras) && w.paras.length >= 2) {
                    if (typeof workerRemember === 'function') workerRemember(url, w);
                    if (typeof READER_CACHE !== 'undefined') READER_CACHE.set(art.link, { paras: w.paras, via: 'hızlı sunucu' });
                    return { ok: true, paras: w.paras };
                }
            }
            if (/news\.google\.com/.test(url) && typeof resolveGoogleNewsUrl === 'function') {
                const real = await resolveGoogleNewsUrl(url, art);
                if (real) url = real;
            }
            if (!/news\.google\.com/.test(url) && typeof extractArticle === 'function') {
                const res = await extractArticle(url, art, false);
                if (res && Array.isArray(res.paras) && res.paras.length) {
                    if (typeof READER_CACHE !== 'undefined') READER_CACHE.set(art.link, res);
                    return { ok: true, paras: res.paras };
                }
            }
        } catch (e) {}
        return { ok: false, paras: [] };
    }

    // Kart açılır açılmaz alt kayar yazı bandını kurar ve bitiş süresine göre otomatik sonraki habere geçer
    function attachCardLiveTickerAndReader() {
        stopCardTicker();
        if (overlayRoot() || aiOpen()) return;
        const w = document.querySelector('#newsGrid .swipe-wrapper.tv-current');
        if (!w) return;
        const cardEl = w.querySelector('.news-card');
        const contentEl = w.querySelector('.news-content');
        if (!cardEl || !contentEl) return;
        const art = findCurrentArticleObj();
        if (!art) return;

        const myToken = ++tickerToken;
        const autoAdvanceEnabled = localStorage.getItem('tvAutoAdvance') !== '0';

        // Sağ üst köşede ufak durum rozeti
        const badge = document.createElement('div');
        badge.className = 'tv-fetch-badge';
        badge.textContent = '⏳ Haber metni çekiliyor...';
        cardEl.appendChild(badge);

        // Başlangıçta RSS özetinden cümleleri hazırla
        const cleanDesc = (art.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        let paras = splitIntoReadableParas(cleanDesc);
        if (!paras.length && art.title) paras = [art.title];

        // Kart üzerindeki okuyucu alanı
        const readerWrap = document.createElement('div');
        readerWrap.className = 'tv-card-reader';

        // Alt kayar yazı bandı (Ticker - sağdan sola kesintisiz kayar)
        const tickerWrap = document.createElement('div');
        tickerWrap.className = 'tv-ticker-wrap';
        const tickerTrack = document.createElement('div');
        tickerTrack.className = 'tv-ticker-track';
        tickerWrap.appendChild(tickerTrack);
        readerWrap.appendChild(tickerWrap);
        contentEl.appendChild(readerWrap);

        function updateTickerText(list) {
            const joined = list.map(s => escapeHtml(s)).join('<span class="tv-sep">●</span>');
            tickerTrack.innerHTML = joined + '<span class="tv-sep">●</span>';
            const totalChars = list.join(' ').length;
            tickerTrack.dataset.chars = String(totalChars);
            // Varsayılan hız %10 artırıldı (0.13 yerine 0.117 katsayısı) ve ayarlardaki çarpanla hesaplanır
            const multiplier = parseFloat(localStorage.getItem('tvTickerSpeed')) || 1.0;
            const sec = Math.max(10, Math.round((totalChars * 0.117) / multiplier));
            tickerTrack.style.setProperty('--ticker-dur', sec + 's');
            return sec;
        }

        updateTickerText(paras);

        // Henüz tam metin çekilmemişken varsayılan 15 saniye zamanlayıcısını başlat:
        // Eğer metin çekilemezse tam 15 saniye sonra otomatik olarak sonraki karta geçecek
        if (autoAdvanceEnabled) {
            clearTimeout(autoAdvanceTimer);
            autoAdvanceTimer = setTimeout(() => {
                if (myToken !== tickerToken || overlayRoot() || aiOpen()) return;
                advanceToNextCard();
            }, 15000);
        }

        // Arka planda tam haber metnini çek
        fetchArticleParasForPeek(art).then(res => {
            if (myToken !== tickerToken) return;
            if (res.ok && res.paras.length) {
                const cleaned = [];
                res.paras.forEach(fp => {
                    splitIntoReadableParas(fp).forEach(sub => cleaned.push(sub));
                });
                if (cleaned.length > 0) {
                    paras = cleaned;
                    const secDuration = updateTickerText(paras);
                    badge.className = 'tv-fetch-badge ok';
                    badge.textContent = `✅ Tam metin (${paras.length} bölüm)`;
                    setTimeout(() => { if (myToken === tickerToken && badge.parentNode) badge.style.opacity = '0'; }, 3000);

                    // TAM METİN ÇEKİLDİ: 15 sn zamanlayıcısını iptal et, metnin akıp bitme süresine göre zamanla!
                    if (autoAdvanceEnabled) {
                        clearTimeout(autoAdvanceTimer);
                        const advanceDelayMs = (secDuration * 1000) + 1200;
                        autoAdvanceTimer = setTimeout(() => {
                            if (myToken !== tickerToken || overlayRoot() || aiOpen()) return;
                            advanceToNextCard();
                        }, advanceDelayMs);
                    }
                    return;
                }
            }
            // Tam metin çekilemediyse sağ üst köşede ufak uyarı göster, 15 saniye sonraki karta geçiş devrede kalsın
            badge.className = 'tv-fetch-badge warn';
            badge.textContent = cleanDesc.length > 25
                ? '⚠️ Tam metin çekilemedi (15 sn sonra sıradaki)'
                : '⚠️ Metin çekilemedi (15 sn sonra sıradaki)';
        }).catch(() => {
            if (myToken !== tickerToken) return;
            badge.className = 'tv-fetch-badge warn';
            badge.textContent = '⚠️ Metin çekilemedi (15 sn sonra sıradaki)';
        });
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
        stopCardTicker();
        if (i >= l.length) i = 0; // Listenin sonuna gelince başa dön
        i = Math.max(0, Math.min(l.length - 1, i));
        l.forEach(c => c.classList.remove('tv-current'));
        l[i].classList.add('tv-current');
        curLink = l[i].dataset.link;
        refreshCount();
        attachCardLiveTickerAndReader();
        if (allowMore && i >= l.length - 3) loadMore();
    }
    function ensureCurrent() {
        const l = cards(); if (!l.length) return;
        if (document.querySelectorAll('#newsGrid .swipe-wrapper.tv-current').length !== 1) showCard(curIndex(), false);
    }

    // ---------- Veri Çekilemezse Otomatik Orijinal Siteye Yönlendirme + AI Özeti Üstte Başlatma ----------
    let autoSwitchedLink = '';
    let wantDirectAISummary = false;

    function watchReaderFallbackAndAI() {
        const box = $('fullTextContainer');
        if (box) {
            new MutationObserver(() => {
                const nm = $('newsModal');
                if (!nm || nm.style.display !== 'flex') return;

                if (wantDirectAISummary && !box.querySelector('.loading-pulse')) {
                    wantDirectAISummary = false;
                    if (typeof askAIFromWeb === 'function') {
                        askAIFromWeb();
                        setTimeout(() => { window.tvApplyZoom(); sync(); }, 80);
                    }
                }

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

        const hist = $('aiChatHistory');
        if (hist) {
            new MutationObserver(() => {
                if (hist.querySelector('.ai-msg.assistant:not(.loading)')) {
                    setTimeout(() => {
                        const root = $('aiInlineResult');
                        if (root) root.scrollTop = 0;
                        hist.scrollTop = 0;
                    }, 30);
                }
            }).observe(hist, { childList: true });
        }
    }

    // ---------- Açık pencere / panel ve Sıralı Geri Tuşu Yönetimi ----------
    const openStack = [];
    let directAiEntry = false;

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
        setTimeout(() => { sync(); if (!overlayRoot()) attachCardLiveTickerAndReader(); }, 20);
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
        const dy = dir === 'down' ? 280 : -280;
        const v = $('iframeView');
        if (v && getComputedStyle(v).display !== 'none') {
            const f = $('modalIframe');
            try { if (f && f.contentWindow) f.contentWindow.postMessage({ tvScroll: dy }, '*'); } catch (e) {}
            return;
        }
        const body = $('modalBodyArea'); if (body) body.scrollTop += dy;
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
        const dy = dir === 'down' ? 220 : -220;
        const root = $('aiInlineResult');
        const hist = $('aiChatHistory');
        if (root) root.scrollTop += dy;
        if (hist) hist.scrollTop += dy;
    }

    function openPanel() {
        stopCardTicker();
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
        stopCardTicker();
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
        stopCardTicker();
        ensureHistoryGuard();
        autoSwitchedLink = '';
        const art = findCurrentArticleObj();
        if (!hasAIKey()) {
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
        const aiModal = $('aiInlineResult');
        const historyDiv = $('aiChatHistory');
        if (aiModal && historyDiv) {
            historyDiv.innerHTML = '<div class="ai-msg assistant loading">🤖 Haber analiz ediliyor, özet hazırlanıyor...</div>';
            aiModal.scrollTop = 0;
            aiModal.classList.add('show');
            aiModal.style.display = 'block';
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
                else if (dir === 'left') { stopCardTicker(); ensureHistoryGuard(); openModalSafe('settingsModal'); }
                else if (dir === 'right') openPanel();
                return;
            }
            if (ov.id === 'newsModal') {                                    // HABER PENCERESİ & YAPAY ZEKA ÖZETİ
                if (aiOpen()) {
                    if (dir === 'up' || dir === 'down') scrollAI(dir);
                    return;
                }
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
            if (el.tagName === 'SELECT' || inText) return;
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

        // 1) ANA EKRAN (Haber Kartları): Tek OK = Okuma Modu, 2×OK = Direkt AI Özeti
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
        if (ov || ai) {
            stopCardTicker();
            ensureHistoryGuard();
        }
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
            if (!ov) {
                try { document.activeElement && document.activeElement.blur(); } catch (e) {}
                attachCardLiveTickerAndReader();
            }
            lastOv = ov;
        }
    }
    function start() {
        document.body.classList.add('tv-mode');
        buildBar();
        window.tvApplyZoom();
        watchReaderFallbackAndAI();
        setTimeout(injectTvSettings, 1000);
        const grid = $('newsGrid');
        if (grid) new MutationObserver(() => setTimeout(ensureCurrent, 0)).observe(grid, { childList: true });
        new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(sync); }).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['style', 'class'] });
        setTimeout(ensureCurrent, 800);
    }
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
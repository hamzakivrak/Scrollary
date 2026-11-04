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
    // Varsayılan olarak Okunan Haberler Gizlensin (kullanıcı Ayarlar'dan kapatabilir)
    try {
        localStorage.setItem('tapAction_single', 'reader');
        localStorage.setItem('tapAction_double', 'off');
        localStorage.setItem('tvTapMigratedV2', '1');
        if (localStorage.getItem('tvHideReadPref') === null) {
            localStorage.setItem('tvHideReadPref', '1');
            localStorage.setItem('hideReadArticles', 'true');
        }
    } catch (e) {}

    const $ = (id) => document.getElementById(id);
    const OVERLAYS = ['newsModal', 'settingsModal', 'sourceFilterModal', 'guideModal', 'voiceModal'];

    // Akan metin ölçeği (varsayılan 1.0 = +%25 büyütülmüş)
    const initTickerScale = parseFloat(localStorage.getItem('tvTickerScale')) || 1.0;
    document.documentElement.style.setProperty('--ticker-scale', String(initTickerScale));

    // ---------- Görünüm: tek kart tam ekran + Kart Üstünde Aşağıdan Yukarıya Sinematik Akan Metin + TV Yapay Zeka Özeti ----------
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

      body.tv-mode #newsGrid { display: block !important; padding: 0 !important; margin: 0 !important; height: 100vh; width: 100%; position: relative; background: #0b1220; }
      body.tv-mode #newsGrid .swipe-wrapper { display: none !important; animation: none !important; transition: none !important; }
      body.tv-mode #newsGrid .swipe-wrapper.tv-current { display: block !important; width: 100vw; height: 100vh; margin: 0 !important; padding: 0 !important; transform: none !important; animation: none !important; transition: none !important; opacity: 1 !important; }
      body.tv-mode .swipe-bg { display: none !important; }
      body.tv-mode .swipe-wrapper.tv-current .news-card { position: relative !important; width: 100% !important; height: 100vh !important; margin: 0 !important; border-radius: 0 !important;
          display: block !important; background: #0b1220 !important; overflow: hidden; border: 0 !important; animation: none !important; transition: none !important; }
      body.tv-mode .swipe-wrapper.tv-current .card-img-wrapper { position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important; aspect-ratio: auto !important; }
      body.tv-mode .swipe-wrapper.tv-current .main-img { width: 100% !important; height: 100% !important; object-fit: cover !important; }
      body.tv-mode .swipe-wrapper.tv-current .fallback-logo { position: absolute; left: 50%; top: 38%; width: 22vh; height: 22vh; transform: translate(-50%, -50%); opacity: .5; object-fit: contain; }
      body.tv-mode .swipe-wrapper.tv-current .source-badge { position: absolute !important; top: 24px; left: 4%; font-size: 1.5rem !important; padding: 8px 20px !important; z-index: 4; pointer-events: none; }
      body.tv-mode .swipe-wrapper.tv-current .news-content { position: absolute !important; left: 0; right: 0; bottom: 0; padding: 90px 4% 64px !important; z-index: 2;
          background: linear-gradient(transparent 0%, rgba(7, 11, 20, 0.72) 22%, rgba(7, 11, 20, 0.94) 55%, rgba(7, 11, 20, 0.98) 100%) !important;
          display: flex !important; flex-direction: column !important; justify-content: flex-end !important; box-sizing: border-box !important; }
      body.tv-mode .swipe-wrapper.tv-current .news-content h3 { font-size: clamp(1.75rem, 5.2vh, 3.0rem) !important; line-height: 1.24 !important; display: block !important;
          -webkit-line-clamp: unset !important; max-height: none !important; color: #facc15 !important; text-shadow: 0 2px 12px rgba(0,0,0,.9); margin: 0 0 10px 0 !important; }
      body.tv-mode .swipe-wrapper.tv-current .meta { font-size: 1.25rem !important; margin-top: 8px; opacity: 0.85; }

      /* Sağ üst köşe durum rozeti: metin çekiliyor / tam metin / çekilemedi / özet hazır bilgisi */
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

      /* ===== KART ÜZERİNDE AŞAĞIDAN YUKARIYA VE YATAY AKAN METİN PENCERESİ =====
         --ticker-scale hem yukarı kaymada (.tv-vscroll-sentence) hem yatay kaymada (.tv-ticker-track) doğrudan etkilidir! */
      .tv-card-reader {
          display: block;
          width: 100%;
          margin-top: 4px;
          box-sizing: border-box;
      }

      /* 1) Dikey (Aşağıdan Yukarıya) Akış Modu */
      .tv-vscroll-viewport {
          position: relative;
          width: 100%;
          height: 34vh;
          overflow: hidden;
          padding: 0 10px;
          box-sizing: border-box;
          -webkit-mask-image: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.25) 14%, rgba(0,0,0,1) 34%, rgba(0,0,0,1) 88%, rgba(0,0,0,0.2) 100%);
          mask-image: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.25) 14%, rgba(0,0,0,1) 34%, rgba(0,0,0,1) 88%, rgba(0,0,0,0.2) 100%);
      }
      .tv-vscroll-track {
          display: flex;
          flex-direction: column;
          gap: calc(18px * var(--ticker-scale, 1));
          padding-top: 20vh;
          padding-bottom: 34vh;
          will-change: transform;
          animation: tvVerticalRoll var(--ticker-dur, 35s) linear infinite;
          zoom: var(--ticker-scale, 1);
      }
      .tv-vscroll-sentence {
          font-size: clamp(1.55rem, 3.9vh, 2.35rem) !important;
          font-weight: 600 !important;
          line-height: 1.42 !important;
          font-family: system-ui, sans-serif;
          color: #f8fafc;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.95);
          padding-left: 16px;
          border-left: 4px solid #38bdf8;
      }
      .tv-vscroll-sentence:nth-child(even) {
          border-left-color: #e11d48;
      }
      @keyframes tvVerticalRoll {
          0%   { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(0, calc(-100% + 22vh), 0); }
      }

      /* 2) Yatay (Sağdan Sola) Akış Modu */
      .tv-ticker-wrap {
          position: relative;
          width: 100%;
          overflow: hidden;
          background: rgba(15, 23, 42, 0.92);
          border: 1px solid rgba(56, 189, 248, 0.35);
          border-left: 6px solid #e11d48;
          border-radius: 10px;
          padding: 13px 0;
          box-shadow: 0 6px 22px rgba(0, 0, 0, 0.55);
      }
      .tv-ticker-track {
          display: inline-block;
          white-space: nowrap;
          padding-left: 100%;
          font-size: clamp(1.68rem, 4.25vh, 2.56rem) !important;
          font-weight: 600 !important;
          line-height: 1.35 !important;
          font-family: system-ui, sans-serif;
          color: #f8fafc;
          will-change: transform;
          animation: tvTickerScroll var(--ticker-dur, 35s) linear infinite;
          zoom: var(--ticker-scale, 1);
      }
      .tv-ticker-track .tv-sep {
          color: #facc15;
          margin: 0 32px;
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

    // ---------- Mükerrer (Tekrarlanan) Haberleri ve Okunan Haberleri Filtreleme ----------
    const seenReadLinks = new Set();
    try {
        (JSON.parse(localStorage.getItem('tvSeenReadLinks') || '[]')).forEach(u => seenReadLinks.add(u));
    } catch (e) {}

    function isHideReadEnabled() {
        return localStorage.getItem('tvHideReadPref') !== '0';
    }

    function markLinkAsRead(link) {
        if (!link) return;
        seenReadLinks.add(link);
        try {
            const arr = [...seenReadLinks].slice(-500);
            localStorage.setItem('tvSeenReadLinks', JSON.stringify(arr));
            // ui.js'nin kendi okundu listesine de işle
            if (typeof readArticles !== 'undefined' && Array.isArray(readArticles) && !readArticles.includes(link)) {
                readArticles.push(link);
                localStorage.setItem('readArticles', JSON.stringify(readArticles.slice(-500)));
            }
        } catch (e) {}
    }

    // Başlık normalleştirme ve kelime benzerliği (aynı haberin tekrar tekrar düşmesini yakalar)
    function normHeadline(title) {
        return String(title || '')
            .replace(/\s+-\s+[^-]+$/, '') // sondaki " - Kaynak Adı" kısmını at
            .toLocaleLowerCase('tr')
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function isDuplicateTitle(normA, normB) {
        if (!normA || !normB) return false;
        if (normA === normB) return true;
        if (normA.length > 22 && normB.length > 22) {
            if (normA.slice(0, 32) === normB.slice(0, 32)) return true;
        }
        const wordsA = normA.split(' ').filter(w => w.length > 3);
        const wordsB = new Set(normB.split(' ').filter(w => w.length > 3));
        if (wordsA.length < 4 || wordsB.size < 4) return false;
        let common = 0;
        for (const w of wordsA) {
            if (wordsB.has(w)) common++;
        }
        return (common / Math.min(wordsA.length, wordsB.size)) >= 0.72;
    }

    // Hem veri dizilerini (allArticles / filteredArticles) hem de DOM'daki kartları mükerrer ve okunmuşlardan temizler
    function deduplicateAndFilterFeed() {
        const hideRead = isHideReadEnabled();
        // 1) Veri dizilerini temizle (sonraki renderNextBatch çağrılarında kopyalar hiç gelmesin)
        const cleanArray = (arr) => {
            if (!Array.isArray(arr) || !arr.length) return;
            const keptNorms = [];
            const seenLinks = new Set();
            for (let i = 0; i < arr.length; i++) {
                const a = arr[i];
                if (!a || !a.link) continue;
                // Şu an ekranda açık olan haberi silme, geçtikten sonra gizlensin
                if (a.link === curLink) {
                    seenLinks.add(a.link);
                    keptNorms.push(normHeadline(a.title));
                    continue;
                }
                if (seenLinks.has(a.link)) { arr.splice(i, 1); i--; continue; }
                if (hideRead && seenReadLinks.has(a.link)) { arr.splice(i, 1); i--; continue; }
                const nh = normHeadline(a.title);
                if (nh && keptNorms.some(existing => isDuplicateTitle(nh, existing))) {
                    arr.splice(i, 1); i--; continue;
                }
                seenLinks.add(a.link);
                if (nh) keptNorms.push(nh);
            }
        };
        try {
            if (typeof allArticles !== 'undefined') cleanArray(allArticles);
            if (typeof filteredArticles !== 'undefined') cleanArray(filteredArticles);
        } catch (e) {}

        // 2) DOM içindeki mevcut kartları da temizle
        const domCards = cards();
        const domNorms = [];
        const domLinks = new Set();
        for (const c of domCards) {
            const link = c.dataset.link || '';
            const h3 = c.querySelector('h3');
            const nh = normHeadline(h3 ? h3.textContent : '');
            if (link === curLink) {
                domLinks.add(link);
                if (nh) domNorms.push(nh);
                continue;
            }
            if ((link && domLinks.has(link)) || (hideRead && link && seenReadLinks.has(link)) || (nh && domNorms.some(ex => isDuplicateTitle(nh, ex)))) {
                c.remove();
                continue;
            }
            if (link) domLinks.add(link);
            if (nh) domNorms.push(nh);
        }
    }

    // ---------- Ayarlar Menüsüne "📺 TV Akan Metin & Otomasyon" Enjeksiyonu ----------
    window.tvSetTickerDir = function (dirVal) {
        try {
            localStorage.setItem('tvTickerDir', String(dirVal));
            if (typeof showToastGlobal === 'function') {
                showToastGlobal(dirVal === 'horizontal' ? '➡️ Yatay kayar bant seçildi' : '⬆️ Aşağıdan yukarıya akış seçildi', 1200);
            }
        } catch (e) {}
        if (!overlayRoot()) attachCardLiveTickerAndReader(true);
    };

    window.tvSetTickerSpeed = function (speedVal) {
        try {
            localStorage.setItem('tvTickerSpeed', String(speedVal));
            if (typeof showToastGlobal === 'function') {
                showToastGlobal('⚡ Yukarı / yatay kayma hızı güncellendi', 1200);
            }
        } catch (e) {}
        // Açık olan karttaki hem dikey (.tv-vscroll-track) hem yatay (.tv-ticker-track) animasyon süresini anında güncelle
        const track = document.querySelector('#newsGrid .swipe-wrapper.tv-current .tv-vscroll-track, #newsGrid .swipe-wrapper.tv-current .tv-ticker-track');
        if (track && track.dataset.chars) {
            const totalChars = parseInt(track.dataset.chars, 10) || 200;
            const isHorizontal = localStorage.getItem('tvTickerDir') === 'horizontal';
            const multiplier = parseFloat(speedVal) || 1.0;
            const baseFactor = isHorizontal ? 0.117 : 0.095;
            const sec = Math.max(8, Math.round((totalChars * baseFactor) / multiplier));
            track.style.setProperty('--ticker-dur', sec + 's');
        }
        if (!overlayRoot()) attachCardLiveTickerAndReader(true);
    };

    window.tvSetTickerScale = function (scaleVal) {
        const s = parseFloat(scaleVal) || 1.0;
        try {
            localStorage.setItem('tvTickerScale', String(s));
            document.documentElement.style.setProperty('--ticker-scale', String(s));
            if (typeof showToastGlobal === 'function') {
                showToastGlobal('🔠 Akan metin boyutu güncellendi', 1200);
            }
        } catch (e) {}
        // Hem yukarı kayan hem yatay kayan elemanlara anında uygula
        document.querySelectorAll('.tv-vscroll-track, .tv-ticker-track').forEach(el => {
            el.style.zoom = String(s);
        });
    };

    window.tvSetAutoAdvance = function (val) {
        try {
            localStorage.setItem('tvAutoAdvance', String(val));
            if (typeof showToastGlobal === 'function') {
                showToastGlobal(val === '1' ? '🔄 Otomatik haber geçişi açıldı' : '⏸️ Otomatik geçiş kapatıldı', 1400);
            }
        } catch (e) {}
        if (!overlayRoot()) attachCardLiveTickerAndReader(true);
    };

    window.tvSetHideRead = function (val) {
        try {
            localStorage.setItem('tvHideReadPref', String(val));
            const boolVal = val === '1';
            localStorage.setItem('hideReadArticles', boolVal ? 'true' : 'false');
            const chk1 = $('showReadMain'); if (chk1) chk1.checked = boolVal;
            const chk2 = $('showReadPopup'); if (chk2) chk2.checked = boolVal;
            if (typeof toggleReadVisibility === 'function') {
                try { toggleReadVisibility(boolVal); } catch (e) {}
            }
            if (typeof showToastGlobal === 'function') {
                showToastGlobal(boolVal ? '👁️ Okunan haberler gizlenecek' : '👁️ Okunan haberler de gösterilecek', 1400);
            }
        } catch (e) {}
    };

    function injectTvSettings() {
        const modalBody = document.querySelector('#settingsModal .modal-body');
        if (!modalBody || document.getElementById('tvSettingsDetail')) return;
        const curDir = localStorage.getItem('tvTickerDir') || 'vertical';
        const curSpeed = localStorage.getItem('tvTickerSpeed') || '1.0';
        const curScale = localStorage.getItem('tvTickerScale') || '1.0';
        const curAuto = localStorage.getItem('tvAutoAdvance') !== '0' ? '1' : '0';
        const curHideRead = localStorage.getItem('tvHideReadPref') !== '0' ? '1' : '0';

        // Ana uygulamanın okunanları gizle onay kutularını da varsayılanımızla eşitle
        const chk1 = $('showReadMain'); if (chk1) chk1.checked = (curHideRead === '1');
        const chk2 = $('showReadPopup'); if (chk2) chk2.checked = (curHideRead === '1');

        const details = document.createElement('details');
        details.className = 'setting-item';
        details.id = 'tvSettingsDetail';
        details.innerHTML = `
            <summary>📺 TV Akan Metin & Otomasyon</summary>
            <div class="setting-detail">
                <label class="tap-label" for="tvTickerDirSelect">Akan Metin Yönü</label>
                <select id="tvTickerDirSelect" class="tap-select" onchange="window.tvSetTickerDir(this.value)">
                    <option value="vertical">⬆️ Aşağıdan Yukarıya (Cümle Cümle & Üstte Silikleşen)</option>
                    <option value="horizontal">➡️ Sağdan Sola (Klasik TV Haber Bandı)</option>
                </select>
                <p style="color: var(--text-muted); font-size: 0.8rem; margin: 6px 0 14px 0;">Aşağıdan yukarıya modunda cümleler alt alta görünür ve kartın ortasına yükseldikçe yumuşakça silikleşir.</p>

                <label class="tap-label" for="tvTickerSpeedSelect">Yukarı / Yatay Metin Kayma Hızı</label>
                <select id="tvTickerSpeedSelect" class="tap-select" onchange="window.tvSetTickerSpeed(this.value)">
                    <option value="0.6">🐌 Çok Yavaş (%60)</option>
                    <option value="0.8">🐢 Yavaş (%80)</option>
                    <option value="1.0">⚡ Normal / Varsayılan (%100)</option>
                    <option value="1.25">🚀 Hızlı (%125)</option>
                    <option value="1.5">🏎️ Çok Hızlı (%150)</option>
                    <option value="1.85">⚡⚡ Süper Hızlı (%185)</option>
                </select>
                <p style="color: var(--text-muted); font-size: 0.8rem; margin: 6px 0 14px 0;">Hem aşağıdan yukarıya hem de sağdan sola akan metnin kayma hızını ayarlar.</p>

                <label class="tap-label" for="tvTickerScaleSelect">Akan Metin Yazı Boyutu (Yukarı & Yatay)</label>
                <select id="tvTickerScaleSelect" class="tap-select" onchange="window.tvSetTickerScale(this.value)">
                    <option value="0.8">Küçük (%80)</option>
                    <option value="1.0">Normal / Varsayılan (%100 - +%25 Büyütülmüş)</option>
                    <option value="1.2">Büyük (%120)</option>
                    <option value="1.4">Çok Büyük (%140)</option>
                    <option value="1.6">Dev Boyut (%160)</option>
                </select>
                <p style="color: var(--text-muted); font-size: 0.8rem; margin: 6px 0 14px 0;">Hem yukarı kayan cümlelerin hem de yatay bandın yazı büyüklüğünü değiştirir.</p>

                <label class="tap-label" for="tvHideReadSelect">Okunan Haberleri Gizle</label>
                <select id="tvHideReadSelect" class="tap-select" onchange="window.tvSetHideRead(this.value)">
                    <option value="1">👁️ Açık / Varsayılan (Okunanlar tekrar düşmesin)</option>
                    <option value="0">👁️‍🗨️ Kapalı (Tüm haberler tekrar görünsün)</option>
                </select>
                <p style="color: var(--text-muted); font-size: 0.8rem; margin: 6px 0 14px 0;">İzlediğiniz veya okuduğunuz haberlerin akışta tekrar karşınıza çıkmasını engeller.</p>

                <label class="tap-label" for="tvAutoAdvanceSelect">Otomatik Sonraki Habere Geçiş</label>
                <select id="tvAutoAdvanceSelect" class="tap-select" onchange="window.tvSetAutoAdvance(this.value)">
                    <option value="1">🔄 Açık (Metin bitince / çekilemezse 15 sn)</option>
                    <option value="0">⏸️ Kapalı (Yalnızca kumanda ile geç)</option>
                </select>
                <p style="color: var(--text-muted); font-size: 0.8rem; margin: 6px 0 0;">Metin aktıktan sonra veya metin çekilemezse 15 saniye sonra kendiliğinden sıradaki habere geçer.</p>
            </div>
        `;
        modalBody.prepend(details);
        const selDir = document.getElementById('tvTickerDirSelect'); if (selDir) selDir.value = curDir;
        const selSpeed = document.getElementById('tvTickerSpeedSelect'); if (selSpeed) selSpeed.value = curSpeed;
        const selScale = document.getElementById('tvTickerScaleSelect'); if (selScale) selScale.value = curScale;
        const selHide = document.getElementById('tvHideReadSelect'); if (selHide) selHide.value = curHideRead;
        const selAuto = document.getElementById('tvAutoAdvanceSelect'); if (selAuto) selAuto.value = curAuto;
    }

    // ---------- Ana Ekranda Kart Üzerinde Aşağıdan Yukarıya (veya Yatay) Akan Haber Metni & Otomatik Geçiş ----------
    let tickerToken = 0;
    let autoAdvanceTimer = null;

    function advanceToNextCard() {
        if (overlayRoot() || aiOpen()) return;
        const prevLink = curLink;
        const l = cards();
        if (!l.length) return;
        const nextIdx = (curIndex() + 1 >= l.length) ? 0 : (curIndex() + 1);
        showCard(nextIdx, true);
        // Geçilen kartı okundu olarak işaretle ve gizleme açıksa DOM'dan kaldır ki tekrar düşmesin
        if (prevLink && prevLink !== curLink) {
            markLinkAsRead(prevLink);
            if (isHideReadEnabled()) {
                document.querySelectorAll('#newsGrid .swipe-wrapper').forEach(w => {
                    if (w.dataset.link === prevLink && !w.classList.contains('tv-current')) w.remove();
                });
                refreshCount();
            }
        }
    }

    function stopCardTicker() {
        clearTimeout(autoAdvanceTimer);
        autoAdvanceTimer = null;
        tickerToken++;
        document.querySelectorAll('#newsGrid .swipe-wrapper').forEach(w => {
            w.querySelectorAll('.tv-card-reader, .tv-fetch-badge').forEach(el => el.remove());
        });
    }

    // Metni cümle cümle (alt alta rahat okunacak uzunlukta) ayırır
    function splitIntoSentences(text) {
        if (!text) return [];
        const raw = String(text).split(/\n+/).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
        const out = [];
        for (const block of raw) {
            const sents = block.match(/[^.!?…]+[.!?…]+["”')]*\s*|[^.!?…]+$/g) || [block];
            let cur = '';
            for (const s of sents) {
                const trimmed = s.trim();
                if (!trimmed) continue;
                if (cur && (cur.length + trimmed.length) > 155) {
                    out.push(cur);
                    cur = trimmed;
                } else {
                    cur = cur ? (cur + ' ' + trimmed) : trimmed;
                }
            }
            if (cur) out.push(cur);
        }
        return out.filter(p => p.length >= 12);
    }

    // Aynı haber için hem kartta hem 2×OK'ta ortak kullanılan tekil metin çekme sözü (Promise):
    // Böylece aynı haberin metni asla iki kere indirilmez!
    const inflightArticleFetch = new Map();

    async function fetchArticleParasForPeek(art) {
        if (!art || !art.link) return { ok: false, paras: [] };
        if (typeof READER_CACHE !== 'undefined' && READER_CACHE.has(art.link)) {
            const c = READER_CACHE.get(art.link);
            if (c && Array.isArray(c.paras) && c.paras.length) return { ok: true, paras: c.paras };
        }
        if (art.content && art.content.length > 200) {
            const fp = typeof finalizeParas === 'function'
                ? finalizeParas(art.content.split('\n\n'), art)
                : splitIntoSentences(art.content);
            if (fp.length >= 2) {
                if (typeof READER_CACHE !== 'undefined') READER_CACHE.set(art.link, { paras: fp, via: 'rss' });
                return { ok: true, paras: fp };
            }
        }
        if (inflightArticleFetch.has(art.link)) {
            return inflightArticleFetch.get(art.link);
        }

        const p = (async () => {
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
        })();

        inflightArticleFetch.set(art.link, p);
        p.finally(() => inflightArticleFetch.delete(art.link));
        return p;
    }

    // ---------- Süper Hızlı Yapay Zeka Özetleyici (Önbellekli + GROQ_MODELS_FAST) ----------
    const AI_SUMMARY_CACHE = new Map(); // link -> hazır HTML özet

    async function getFastAISummaryHtml(art) {
        if (!art) throw new Error('Haber bulunamadı');
        if (AI_SUMMARY_CACHE.has(art.link)) return AI_SUMMARY_CACHE.get(art.link);

        // Kart üzerinde zaten çekilmiş olan tam metni doğrudan READER_CACHE'den al (yeniden indirme yapma!)
        let bodyText = '';
        if (typeof READER_CACHE !== 'undefined' && READER_CACHE.has(art.link)) {
            const c = READER_CACHE.get(art.link);
            if (c && Array.isArray(c.paras) && c.paras.length) {
                bodyText = c.paras.join('\n');
            }
        }
        // Eğer henüz inmemiş ama şu an iniyorsa en fazla 600ms bekle, gelmezse eldeki başlık+özetle hemen özetle!
        if (!bodyText && inflightArticleFetch.has(art.link)) {
            try {
                const res = await Promise.race([
                    inflightArticleFetch.get(art.link),
                    new Promise(r => setTimeout(() => r({ ok: false, paras: [] }), 600))
                ]);
                if (res && res.ok && res.paras.length) bodyText = res.paras.join('\n');
            } catch (e) {}
        }
        if (!bodyText) {
            bodyText = `BAŞLIK: ${art.title || ''}\nÖZET: ${(art.description || '').replace(/<[^>]*>/g, ' ')}`;
        } else {
            bodyText = `BAŞLIK: ${art.title || ''}\nTAM METİN:\n${bodyText.substring(0, 5500)}`;
        }

        const systemPrompt = typeof getAIPrompt === 'function' ? getAIPrompt('chatAssistant') : '';
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `[HABER METNİ]:\n${bodyText}\n\nBu haberi TV ekranında hızlıca okunabilecek şekilde özetle ve en önemli noktaları maddeler halinde yaz.` }
        ];

        // groqChat çağrısında GROQ_MODELS_FAST (20b hızlı model ilk sırada) ve maxTokens: 900 kullanarak süreyi yarı yarıya düşür
        const fastModels = (typeof GROQ_MODELS_FAST !== 'undefined') ? GROQ_MODELS_FAST : undefined;
        const raw = await groqChat(messages, { temperature: 0.4, maxTokens: 900, models: fastModels });
        const cleanHtml = String(raw || '').replace(/```html/g, '').replace(/```/g, '').trim();
        if (cleanHtml) AI_SUMMARY_CACHE.set(art.link, cleanHtml);
        return cleanHtml;
    }

    // Kart açılır açılmaz veya haberden geri çıkıldığında akan metin alanını kurar
    function attachCardLiveTickerAndReader(forceRestart) {
        if (overlayRoot() || aiOpen()) return;

        let w = document.querySelector('#newsGrid .swipe-wrapper.tv-current');
        if (!w) {
            const l = cards();
            if (!l.length) return;
            const idx = curIndex();
            w = l[idx] || l[0];
            w.classList.add('tv-current');
            curLink = w.dataset.link;
        }

        if (!forceRestart && w.querySelector('.tv-card-reader')) {
            return;
        }

        stopCardTicker();

        const cardEl = w.querySelector('.news-card');
        const contentEl = w.querySelector('.news-content');
        if (!cardEl || !contentEl) return;

        let art = findCurrentArticleObj();
        if (!art) {
            const h3 = contentEl.querySelector('h3');
            art = { link: w.dataset.link || '', title: h3 ? h3.textContent.trim() : '', description: '' };
        }

        // Bu haber ekranda görüntülendiği için okundu olarak kaydet
        if (art.link) markLinkAsRead(art.link);

        const myToken = ++tickerToken;
        const autoAdvanceEnabled = localStorage.getItem('tvAutoAdvance') !== '0';
        const isHorizontal = localStorage.getItem('tvTickerDir') === 'horizontal';
        const curScale = parseFloat(localStorage.getItem('tvTickerScale')) || 1.0;

        // Sağ üst köşede ufak durum rozeti
        const badge = document.createElement('div');
        badge.className = 'tv-fetch-badge';
        badge.textContent = '⏳ Haber metni çekiliyor...';
        cardEl.appendChild(badge);

        // Başlangıçta RSS özetinden cümleleri hazırla
        const cleanDesc = (art.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        let sentences = splitIntoSentences(cleanDesc);
        if (!sentences.length && art.title) sentences = [art.title];

        const readerWrap = document.createElement('div');
        readerWrap.className = 'tv-card-reader';

        let trackEl = null;
        if (isHorizontal) {
            const tickerWrap = document.createElement('div');
            tickerWrap.className = 'tv-ticker-wrap';
            trackEl = document.createElement('div');
            trackEl.className = 'tv-ticker-track';
            trackEl.style.zoom = String(curScale);
            tickerWrap.appendChild(trackEl);
            readerWrap.appendChild(tickerWrap);
        } else {
            const vViewport = document.createElement('div');
            vViewport.className = 'tv-vscroll-viewport';
            trackEl = document.createElement('div');
            trackEl.className = 'tv-vscroll-track';
            trackEl.style.zoom = String(curScale);
            vViewport.appendChild(trackEl);
            readerWrap.appendChild(vViewport);
        }
        contentEl.appendChild(readerWrap);

        function updateScrollingContent(list) {
            if (isHorizontal) {
                const joined = list.map(s => escapeHtml(s)).join('<span class="tv-sep">●</span>');
                trackEl.innerHTML = joined + '<span class="tv-sep">●</span>';
            } else {
                trackEl.innerHTML = list.map(s => `<div class="tv-vscroll-sentence">${escapeHtml(s)}</div>`).join('');
            }
            const totalChars = list.join(' ').length;
            trackEl.dataset.chars = String(totalChars);
            const multiplier = parseFloat(localStorage.getItem('tvTickerSpeed')) || 1.0;
            const baseFactor = isHorizontal ? 0.117 : 0.095;
            const sec = Math.max(8, Math.round((totalChars * baseFactor) / multiplier));
            trackEl.style.setProperty('--ticker-dur', sec + 's');
            trackEl.style.animation = 'none';
            void trackEl.offsetWidth;
            trackEl.style.animation = '';
            return sec;
        }

        updateScrollingContent(sentences);

        if (autoAdvanceEnabled) {
            clearTimeout(autoAdvanceTimer);
            autoAdvanceTimer = setTimeout(() => {
                if (myToken !== tickerToken || overlayRoot() || aiOpen()) return;
                advanceToNextCard();
            }, 15000);
        }

        // Arka planda tam haber metnini çek (ve bir sonraki haberi de şimdiden ısıt)
        fetchArticleParasForPeek(art).then(res => {
            if (myToken !== tickerToken) return;
            if (res.ok && res.paras.length) {
                const cleaned = [];
                res.paras.forEach(fp => {
                    splitIntoSentences(fp).forEach(sub => cleaned.push(sub));
                });
                if (cleaned.length > 0) {
                    sentences = cleaned;
                    const secDuration = updateScrollingContent(sentences);
                    badge.className = 'tv-fetch-badge ok';
                    badge.textContent = `✅ Tam metin (${sentences.length} cümle)`;
                    setTimeout(() => { if (myToken === tickerToken && badge.parentNode) badge.style.opacity = '0'; }, 3000);

                    if (autoAdvanceEnabled) {
                        clearTimeout(autoAdvanceTimer);
                        const advanceDelayMs = (secDuration * 1000) + 1000;
                        autoAdvanceTimer = setTimeout(() => {
                            if (myToken !== tickerToken || overlayRoot() || aiOpen()) return;
                            advanceToNextCard();
                        }, advanceDelayMs);
                    }
                    return;
                }
            }
            badge.className = 'tv-fetch-badge warn';
            badge.textContent = cleanDesc.length > 25
                ? '⚠️ Tam metin çekilemedi (15 sn sonra sıradaki)'
                : '⚠️ Metin çekilemedi (15 sn sonra sıradaki)';
        }).catch(() => {
            if (myToken !== tickerToken) return;
            badge.className = 'tv-fetch-badge warn';
            badge.textContent = '⚠️ Metin çekilemedi (15 sn sonra sıradaki)';
        });

        // Ekstra iyileştirme: Sıradaki (bir sonraki) haberin metnini de 2 sn sonra arka planda sessizce hazırla ki geçince hiç beklemesin!
        setTimeout(() => {
            if (myToken !== tickerToken) return;
            const l = cards();
            const nextCard = l[curIndex() + 1];
            if (nextCard && nextCard.dataset.link && typeof filteredArticles !== 'undefined') {
                const nextArt = filteredArticles.find(a => a && a.link === nextCard.dataset.link);
                if (nextArt) fetchArticleParasForPeek(nextArt).catch(() => {});
            }
        }, 2000);
    }

    function ensureCardTickerPresent() {
        if (overlayRoot() || aiOpen()) return;
        const w = document.querySelector('#newsGrid .swipe-wrapper.tv-current');
        if (w && !w.querySelector('.tv-card-reader')) {
            attachCardLiveTickerAndReader(true);
        }
    }

    // ---------- Tek kart yönetimi (Mükerrer ve okunmuş haberleri filtreleyen, titremesiz yapı) ----------
    let curLink = null, lastUpTap = 0;
    let savedActiveCardClone = null;

    const cards = () => Array.from(document.querySelectorAll('#newsGrid .swipe-wrapper'));
    function curIndex() {
        const l = cards();
        if (!curLink) return 0;
        const i = l.findIndex(c => c.dataset.link === curLink);
        return i < 0 ? 0 : i;
    }
    function loadMore() {
        try { if (typeof filteredArticles !== 'undefined' && typeof displayedCount !== 'undefined' && displayedCount < filteredArticles.length) renderNextBatch(); } catch (e) {}
    }

    function showCard(i, allowMore) {
        deduplicateAndFilterFeed();
        const l = cards(); if (!l.length) return;
        if (i >= l.length) i = 0;
        i = Math.max(0, Math.min(l.length - 1, i));
        const target = l[i];

        if (target.classList.contains('tv-current') && curLink === target.dataset.link && target.querySelector('.tv-card-reader')) {
            l.forEach(c => { if (c !== target) c.classList.remove('tv-current'); });
            refreshCount();
            if (allowMore && i >= l.length - 3) loadMore();
            return;
        }

        const prevLink = curLink;
        stopCardTicker();
        l.forEach(c => c.classList.remove('tv-current'));
        target.classList.add('tv-current');
        curLink = target.dataset.link;

        // Önceki karttan ayrıldığımızda okunanları gizle açıksa önceki kartı akıştan kaldır
        if (prevLink && prevLink !== curLink) {
            markLinkAsRead(prevLink);
            if (isHideReadEnabled()) {
                l.forEach(c => { if (c.dataset.link === prevLink && c !== target) c.remove(); });
            }
        }

        savedActiveCardClone = target.cloneNode(true);
        savedActiveCardClone.querySelectorAll('.tv-card-reader, .tv-fetch-badge').forEach(el => el.remove());

        refreshCount();
        attachCardLiveTickerAndReader(true);
        if (allowMore && curIndex() >= cards().length - 3) loadMore();
    }

    function ensureCurrent() {
        const grid = $('newsGrid');
        if (!grid) return;
        deduplicateAndFilterFeed();
        const l = cards();
        if (!l.length) return;

        const activeNow = document.querySelectorAll('#newsGrid .swipe-wrapper.tv-current');
        if (activeNow.length === 1 && (!curLink || activeNow[0].dataset.link === curLink)) {
            curLink = activeNow[0].dataset.link;
            refreshCount();
            ensureCardTickerPresent();
            return;
        }

        if (curLink) {
            let match = l.find(c => c.dataset.link === curLink);

            if (!match && typeof filteredArticles !== 'undefined' && Array.isArray(filteredArticles)) {
                const posInFiltered = filteredArticles.findIndex(a => a && a.link === curLink);
                if (posInFiltered >= 0 && typeof renderNextBatch === 'function') {
                    let guard = 0;
                    while (!match && typeof displayedCount !== 'undefined' && displayedCount <= posInFiltered && guard++ < 15) {
                        try { renderNextBatch(); } catch (e) { break; }
                        deduplicateAndFilterFeed();
                        match = cards().find(c => c.dataset.link === curLink);
                    }
                }
            }

            if (!match && savedActiveCardClone) {
                const restored = savedActiveCardClone.cloneNode(true);
                restored.classList.add('tv-current');
                grid.insertBefore(restored, grid.firstChild);
                match = restored;
            }

            if (match) {
                cards().forEach(c => { if (c !== match) c.classList.remove('tv-current'); });
                match.classList.add('tv-current');
                refreshCount();
                ensureCardTickerPresent();
                return;
            }
        }

        showCard(0, false);
    }

    // ---------- Veri Çekilemezse Otomatik Orijinal Siteye Yönlendirme ----------
    let autoSwitchedLink = '';

    function watchReaderFallbackAndAI() {
        const box = $('fullTextContainer');
        if (box) {
            new MutationObserver(() => {
                const nm = $('newsModal');
                if (!nm || nm.style.display !== 'flex') return;

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

    let closingGuard = false;
    function closeTopmostOverlay(fromPopState) {
        if (closingGuard) return true;
        closingGuard = true;
        setTimeout(() => { closingGuard = false; }, 120);

        const nm = $('newsModal');
        const ai = aiOpen();

        // 1) Eğer Yapay Zeka Özeti açıksa:
        //    - Ana ekrandan 2×OK ile doğrudan açıldıysa (directAiEntry = true) hem AI özetini hem newsModal'ı tek seferde kapatıp ana karta dön!
        //    - Okuma ekranı içinden 2×OK ile açıldıysa sadece AI özetini kapatıp okuma ekranına dön!
        if (ai) {
            if (typeof closeAIResult === 'function') closeAIResult();
            else { const a = $('aiInlineResult'); if (a) { a.classList.remove('show'); a.style.display = 'none'; } }

            if (!directAiEntry && nm && nm.style.display === 'flex') {
                try { history.pushState({ tvGuard: 1 }, ''); } catch (e) {}
                setTimeout(sync, 30);
                return true;
            }
            directAiEntry = false;
            if (nm) {
                nm.style.display = 'none';
                const idx = openStack.lastIndexOf('newsModal');
                if (idx !== -1) openStack.splice(idx, 1);
            }
            try { history.pushState({ tvGuard: 1 }, ''); } catch (e) {}
            setTimeout(() => { sync(); attachCardLiveTickerAndReader(true); }, 30);
            setTimeout(() => { ensureCardTickerPresent(); }, 180);
            return true;
        }

        const top = overlayRoot();
        if (!top) {
            setTimeout(() => { sync(); attachCardLiveTickerAndReader(true); }, 30);
            return false;
        }

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
        setTimeout(() => { sync(); attachCardLiveTickerAndReader(true); }, 30);
        setTimeout(() => { ensureCardTickerPresent(); }, 180);
        return true;
    }

    window.addEventListener('popstate', (e) => {
        if (aiOpen() || overlayRoot()) {
            e.stopImmediatePropagation();
            closeTopmostOverlay(true);
        } else {
            // ui.js pencereyi bizden önce kapattıysa bile aiInlineResult açık kalmış olabilir; kesin olarak temizle ve kayar metni başlat!
            const aiEl = $('aiInlineResult');
            if (aiEl) { aiEl.classList.remove('show'); aiEl.style.display = 'none'; }
            directAiEntry = false;
            setTimeout(() => { sync(); attachCardLiveTickerAndReader(true); }, 40);
            setTimeout(() => { ensureCardTickerPresent(); }, 200);
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

    // ---------- Ana Ekranda Haberi Açma (Tek OK = Okuma, Çift OK = Yeniden Metin Çekmeden Anında Hızlı AI Özeti!) ----------
    function findCurrentArticleObj() {
        const w = document.querySelector('#newsGrid .swipe-wrapper.tv-current');
        const link = (w && w.dataset.link) || curLink;
        if (!link) return null;
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
        autoSwitchedLink = '';
        const art = findCurrentArticleObj();
        if (art && typeof openModal === 'function') {
            openModal(art);
        } else {
            const c = document.querySelector('#newsGrid .swipe-wrapper.tv-current .news-card');
            if (c) c.click();
        }
    }

    // 2×OK ile Doğrudan Yapay Zeka Özeti:
    // openModal(art) çağırıp haberi ve iframe'i baştan indirmeye ÇALIŞMAZ!
    // Kart üzerinde zaten çekilmiş olan metni (READER_CACHE) doğrudan hızlı modele (GROQ_MODELS_FAST) gönderir.
    async function openCurrentCardAISummary(fromInsideModal) {
        stopCardTicker();
        ensureHistoryGuard();
        const art = (fromInsideModal && typeof originalState !== 'undefined' && originalState.art)
            ? originalState.art
            : findCurrentArticleObj();

        if (!hasAIKey()) {
            if (typeof showToastGlobal === 'function') showToastGlobal('⚠️ API anahtarı yok, orijinal site açılıyor...', 2200);
            if (!fromInsideModal) openCurrentCardReader();
            setTimeout(() => {
                window.__frameNow = true;
                window.__frameMode = 'web-sade';
                if (typeof switchTab === 'function') switchTab('web');
            }, 80);
            return;
        }

        directAiEntry = !fromInsideModal;

        // newsModal kapalıysa sadece kabuk olarak aç (ağ isteği veya iframe yüklemesi başlatmadan!)
        const nm = $('newsModal');
        if (nm && nm.style.display !== 'flex') {
            if (art && $('modalSource')) $('modalSource').innerText = art.source || 'Haber Özeti';
            if (typeof openModalSafe === 'function') openModalSafe('newsModal');
            else nm.style.display = 'flex';
        }

        const aiModal = $('aiInlineResult');
        const historyDiv = $('aiChatHistory');
        if (!aiModal || !historyDiv) return;

        aiModal.scrollTop = 0;
        aiModal.classList.add('show');
        aiModal.style.display = 'block';
        window.tvApplyZoom();
        sync();

        // Eğer bu haberin özeti daha önce çıkarıldıysa 0 saniyede (anında) ekrana bas!
        if (art && AI_SUMMARY_CACHE.has(art.link)) {
            historyDiv.innerHTML = `<div class="ai-msg assistant">${AI_SUMMARY_CACHE.get(art.link)}</div>`;
            aiModal.scrollTop = 0;
            return;
        }

        historyDiv.innerHTML = '<div class="ai-msg assistant loading">⚡ Özet hazırlanıyor...</div>';
        try {
            const cleanHtml = await getFastAISummaryHtml(art);
            historyDiv.innerHTML = `<div class="ai-msg assistant">${cleanHtml}</div>`;
            aiModal.scrollTop = 0;
            window.tvApplyZoom();
        } catch (err) {
            historyDiv.innerHTML = `<div class="ai-msg assistant">⚠️ ${escapeHtml((err && err.message) || 'Özet alınamadı')}</div>`;
        }
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
                        if (now - lastUpTap < 2500) { lastUpTap = 0; curLink = null; savedActiveCardClone = null; if (typeof showToastGlobal === 'function') showToastGlobal('🔄 Yenileniyor...', 2000); try { fetchAllRSS(true); } catch (x) {} }
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

        // 1) ANA EKRAN (Haber Kartları): Tek OK = Okuma Modu, 2×OK = Yeniden İndirmeden Direkt Hızlı AI Özeti
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
                openCurrentCardAISummary(false);
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
                closeTopmostOverlay(false);
            } else {
                openCurrentCardAISummary(true);
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
                // newsModal kapandığında içinde açık kalan aiInlineResult varsa kesin olarak kapat ki kayar metni engellemesin!
                const aiEl = $('aiInlineResult');
                if (aiEl) { aiEl.classList.remove('show'); aiEl.style.display = 'none'; }
                directAiEntry = false;
                try { document.activeElement && document.activeElement.blur(); } catch (e) {}
                attachCardLiveTickerAndReader(true);
            }
            lastOv = ov;
        } else if (!ov && !ai) {
            ensureCardTickerPresent();
        }
    }
    function start() {
        document.body.classList.add('tv-mode');
        buildBar();
        window.tvApplyZoom();
        watchReaderFallbackAndAI();
        setTimeout(injectTvSettings, 1000);
        const grid = $('newsGrid');
        if (grid) new MutationObserver(() => ensureCurrent()).observe(grid, { childList: true });
        new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(sync); }).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['style', 'class'] });
        setTimeout(ensureCurrent, 800);
    }
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
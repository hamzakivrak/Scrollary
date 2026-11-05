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

    // ---------- 1) ŞİŞMİŞ CACHE / LOCALSTORAGE OTOMATİK TEMİZLEYİCİ (Mi Stick Açılış & Donma Koruması) ----------
    // localStorage şiştiğinde her JSON.parse / setItem Mi Stick'in ana iş parçacığını (UI thread) saniyelerce kilitler.
    try {
        const heavyKeys = ['readerCacheV1', 'readerCacheV3', 'gnResolveV1', 'pubFeeds', 'tvCardAiCacheV1', 'tvSeenReadLinks', 'readArticles'];
        heavyKeys.forEach(k => {
            const raw = localStorage.getItem(k);
            // 35 KB'ı aşan önbellekleri otomatik buda/sıfırla ki açılışta ve tuş basımında asla bekleme yapmasın
            if (raw && raw.length > 35000) {
                localStorage.removeItem(k);
            }
        });
        localStorage.setItem('tapAction_single', 'reader');
        localStorage.setItem('tapAction_double', 'off');
        localStorage.setItem('tvTapMigratedV2', '1');
        if (localStorage.getItem('tvHideReadPref') === null) {
            localStorage.setItem('tvHideReadPref', '1');
            localStorage.setItem('hideReadArticles', 'true');
        }
        if (localStorage.getItem('tvCardContentMode') === null) {
            localStorage.setItem('tvCardContentMode', 'ai');
        }
    } catch (e) {}

    const $ = (id) => document.getElementById(id);
    const OVERLAYS = ['newsModal', 'settingsModal', 'sourceFilterModal', 'guideModal', 'voiceModal'];

    const initTickerScale = parseFloat(localStorage.getItem('tvTickerScale')) || 1.0;
    document.documentElement.style.setProperty('--ticker-scale', String(initTickerScale));
    const initTitleScale = parseFloat(localStorage.getItem('tvTitleScale')) || 1.0;
    document.documentElement.style.setProperty('--title-scale', String(initTitleScale));

    // ---------- Görünüm: Mi Stick GPU dostu, hafifletilmiş ve saydam arka planlı CSS ----------
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

      /* Haber kaynağı rozeti: ÜST ORTA kısımda, zarif, ince yazılı */
      body.tv-mode .swipe-wrapper.tv-current .source-badge {
          position: absolute !important;
          top: 14px !important;
          left: 50% !important;
          right: auto !important;
          transform: translateX(-50%) !important;
          font-size: 0.74rem !important;
          font-weight: 400 !important;
          letter-spacing: 0.05em !important;
          line-height: 1.15 !important;
          padding: 4px 14px !important;
          border-radius: 999px !important;
          background: rgba(15, 23, 42, 0.72) !important;
          color: rgba(248, 250, 252, 0.92) !important;
          border: 1px solid rgba(255, 255, 255, 0.16) !important;
          white-space: nowrap !important;
          z-index: 4;
          pointer-events: none;
      }

      /* Sağ üst köşede zarif, ince Tarih / Gün / Saat rozeti */
      #tvClockBadge {
          display: none;
          position: fixed;
          top: 14px;
          right: 2.5%;
          z-index: 4500;
          font: 300 0.74rem/1.15 system-ui, -apple-system, sans-serif;
          letter-spacing: 0.04em;
          padding: 4px 12px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.72);
          color: rgba(241, 245, 249, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.14);
          pointer-events: none;
          white-space: nowrap;
      }
      body.tv-mode #tvClockBadge { display: inline-flex; align-items: center; gap: 8px; }
      #tvClockBadge .tv-radio-dot {
          color: #38bdf8;
          font-weight: 500;
          margin-right: 2px;
      }

      /* Sol üst köşe durum rozeti */
      .tv-fetch-badge {
          position: absolute;
          top: 14px;
          left: 2.5%;
          z-index: 5;
          font: 400 0.7rem/1.15 system-ui, sans-serif;
          letter-spacing: 0.03em;
          padding: 3px 10px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.72);
          color: #cbd5e1;
          border: 1px solid rgba(148, 163, 184, 0.2);
          pointer-events: none;
          transition: opacity 0.35s ease;
      }
      .tv-fetch-badge.warn {
          background: rgba(127, 29, 29, 0.78);
          color: #fecaca;
          border-color: rgba(248, 113, 113, 0.35);
      }
      .tv-fetch-badge.ok {
          background: rgba(6, 78, 59, 0.78);
          color: #a7f3d0;
          border-color: rgba(52, 211, 153, 0.35);
      }
      .tv-fetch-badge.ai {
          background: rgba(67, 20, 107, 0.8);
          color: #e9d5ff;
          border-color: rgba(192, 132, 252, 0.4);
      }

      /* Kart içerik alanı: Arka plan SAYDAM (kart resmi net görünsün diye sadece çok hafif bir alt tül gradyan var).
         justify-content: flex-end sayesinde başlık birden fazla satır olduğunda kutusu YUKARI doğru büyür,
         ilk satırı otomatik olarak yukarı öteler ve altındaki akan metinle asla üst üste binmez! */
      body.tv-mode .swipe-wrapper.tv-current .news-content {
          position: absolute !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          top: 46px !important;
          height: auto !important;
          max-height: calc(100vh - 46px) !important;
          padding: 10px 4% 38px !important;
          z-index: 2;
          background: linear-gradient(transparent 0%, rgba(7, 11, 20, 0.16) 28%, rgba(7, 11, 20, 0.40) 68%, rgba(7, 11, 20, 0.62) 100%) !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: flex-end !important;
          align-items: stretch !important;
          gap: 10px !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
      }
      /* Haber Başlığı: style.css içindeki sabit mobil height/min-height sıfırlandı (height: auto !important).
         Böylece 2 veya 3 satır olduğunda aşağı taşmaz; ilk satırı yukarı doğru öteleyerek genişler. */
      body.tv-mode .swipe-wrapper.tv-current .news-content h3 {
          position: relative !important;
          z-index: 3 !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          font-size: calc(1.9rem * var(--title-scale, 1)) !important;
          line-height: 1.24 !important;
          display: -webkit-box !important;
          -webkit-box-orient: vertical !important;
          -webkit-line-clamp: 3 !important;
          overflow: hidden !important;
          color: #facc15 !important;
          text-shadow: 0 2px 10px rgba(0,0,0,0.95), 0 0 4px rgba(0,0,0,0.9) !important;
          margin: 0 !important;
          padding: 0 0 2px 0 !important;
          flex: 0 0 auto !important;
      }
      body.tv-mode .swipe-wrapper.tv-current .meta {
          display: none !important;
      }

      /* ===== KART ÜZERİNDE SAYDAM ARKA PLANLI AKAN METİN PENCERESİ (Kart Resmi Arkadan Net Görünür!) ===== */
      .tv-card-reader {
          position: relative !important;
          z-index: 2 !important;
          display: block;
          width: 100%;
          margin: 0 !important;
          flex: 0 1 auto !important;
          min-height: 0 !important;
          box-sizing: border-box;
          background: transparent !important;
      }

      /* Başlığın hemen altında özet/metin çekilene kadar beliren zarif bekleme satırı */
      .tv-waiting-box {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 18px;
          margin: 2px 0 6px 0;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.58);
          border: 1px solid rgba(56, 189, 248, 0.32);
          color: rgba(241, 245, 249, 0.95);
          font: 500 1.05rem/1.3 system-ui, -apple-system, sans-serif;
          letter-spacing: 0.02em;
          text-shadow: 0 2px 6px rgba(0, 0, 0, 0.95);
          width: fit-content;
      }
      .tv-waiting-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #38bdf8;
          box-shadow: 0 0 10px #38bdf8;
          animation: tvPulseDot 0.9s ease-in-out infinite alternate;
      }
      @keyframes tvPulseDot {
          0%   { opacity: 0.35; transform: scale(0.85); }
          100% { opacity: 1; transform: scale(1.2); }
      }

      /* 1) Dikey (Aşağıdan Yukarıya) Akış Modu:
         Başlık büyüdüğünde esnek şekilde yer açar, üst sınırından taşmaz */
      .tv-vscroll-viewport {
          position: relative;
          width: 100%;
          height: 45vh;
          max-height: 45vh;
          overflow: hidden;
          padding: 0 10px;
          box-sizing: border-box;
          background: transparent !important;
      }
      .tv-vscroll-track {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding-top: 26vh;
          padding-bottom: 42vh;
          will-change: transform;
          animation: tvVerticalRoll var(--ticker-dur, 28s) linear infinite;
          background: transparent !important;
      }
      .tv-vscroll-sentence {
          font-size: calc(2.0rem * var(--ticker-scale, 1)) !important;
          font-weight: 600 !important;
          line-height: 1.42 !important;
          font-family: system-ui, sans-serif;
          color: #ffffff;
          background: rgba(7, 11, 20, 0.28);
          border-radius: 0 10px 10px 0;
          padding: 6px 14px 6px 16px;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.98), 0 0 4px rgba(0, 0, 0, 0.95);
          border-left: 4px solid #38bdf8;
      }
      .tv-vscroll-sentence:nth-child(even) {
          border-left-color: #a855f7;
      }
      @keyframes tvVerticalRoll {
          0%   { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(0, -100%, 0); }
      }

      /* 2) Yatay (Sağdan Sola) Akış Modu - Saydamlaştırılmış Arka Plan */
      .tv-ticker-wrap {
          position: relative;
          width: 100%;
          overflow: hidden;
          background: rgba(15, 23, 42, 0.42);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-left: 5px solid #e11d48;
          border-radius: 10px;
          padding: 10px 0;
      }
      .tv-ticker-track {
          display: inline-block;
          white-space: nowrap;
          padding-left: 100%;
          font-size: calc(2.1rem * var(--ticker-scale, 1)) !important;
          font-weight: 600 !important;
          line-height: 1.35 !important;
          font-family: system-ui, sans-serif;
          color: #ffffff;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.98), 0 0 4px rgba(0, 0, 0, 0.9);
          will-change: transform;
          animation: tvTickerScroll var(--ticker-dur, 28s) linear infinite;
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

      /* Alt yönlendirme / buton tanıtım çubuğu (#tvBar): çok ince, zarif, yarı saydam ve ufak yazılı (akan metinle asla çakışmaz) */
      #tvBar {
          display: none;
          position: fixed;
          left: 0; right: 0; bottom: 0;
          z-index: 5000;
          padding: 4px 3%;
          background: rgba(7, 11, 20, 0.55);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(226, 232, 240, 0.85);
          font: 400 0.76rem/1.2 system-ui, -apple-system, sans-serif;
          letter-spacing: 0.02em;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          pointer-events: none;
          transition: opacity 0.35s ease, transform 0.35s ease;
      }
      body.tv-mode #tvBar { display: flex; }
      body.tv-mode #tvBar.tv-bar-hidden { opacity: 0 !important; transform: translateY(100%) !important; pointer-events: none !important; }
      #tvBar b { color: #facc15; font-weight: 600; }
    `;
    document.head.appendChild(css);
    try {
        const qs = parseFloat(new URLSearchParams(location.search).get('tvscale'));
        if (qs > 0) localStorage.setItem('tvScale', String(qs));
        const want = parseFloat(localStorage.getItem('tvScale')) || 2;
        const z = Math.max(1, Math.min(want, innerWidth / 560));
        document.documentElement.style.setProperty('--z', String(z));
    } catch (e) { document.documentElement.style.setProperty('--z', '2'); }

    // ---------- Sağ Üst Köşe Zarif Tarih / Gün / Saat Rozeti ----------
    function buildClockBadge() {
        if ($('tvClockBadge')) return;
        const cl = document.createElement('div');
        cl.id = 'tvClockBadge';
        document.body.appendChild(cl);
        updateClockBadge();
        setInterval(updateClockBadge, 30000);
    }

    function updateClockBadge() {
        const cl = $('tvClockBadge');
        if (!cl) return;
        try {
            const now = new Date();
            const dateStr = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
            const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            const st = getCurrentRadioStation();
            const radioHtml = (st && isRadioPlaying()) ? `<span class="tv-radio-dot">📻 ${escapeHtml(st.shortName)}</span><span>•</span>` : '';
            cl.innerHTML = `${radioHtml}<span>${escapeHtml(dateStr)}</span><span style="opacity:0.55">•</span><span style="font-weight:500">${escapeHtml(timeStr)}</span>`;
        } catch (e) {}
    }

    // ---------- Arka Plan Radyo Çalar ----------
    const RADIO_STATIONS = [
        { id: 'off', name: '🔇 Kapalı', shortName: '', urls: [] },
        {
            id: 'classical',
            name: '🎻 Klasik Müzik (Swiss Classic / Venice Classic)',
            shortName: 'Klasik',
            urls: [
                'https://stream.srg-ssr.ch/m/rsc_de/mp3_128',
                'https://uk2.streamingpulse.com/ssl/vcr1',
                'https://ice5.somafm.com/n5md-128-mp3'
            ]
        },
        {
            id: 'study',
            name: '🎧 Study & Concentration (Lo-Fi / Odaklanma)',
            shortName: 'Study',
            urls: [
                'https://streams.ilovemusic.de/iloveradio17.mp3',
                'https://ice2.somafm.com/groovesalad-128-mp3',
                'https://ice4.somafm.com/dronezone-128-mp3'
            ]
        },
        {
            id: 'turku',
            name: '🪕 Türkü & Halk Müziği (Anadolu / Folk)',
            shortName: 'Türkü',
            urls: [
                'https://ice2.somafm.com/suburbsofgoa-128-mp3',
                'https://stream.srg-ssr.ch/m/rsc_de/mp3_128'
            ]
        },
        {
            id: 'foreign_pop',
            name: '🌍 Yabancı Hit & Pop (Swiss Pop / Euro Hits)',
            shortName: 'Yabancı Pop',
            urls: [
                'https://stream.srg-ssr.ch/m/rsp/mp3_128',
                'https://streams.ilovemusic.de/iloveradio1.mp3',
                'https://ice2.somafm.com/indiepop-128-mp3'
            ]
        },
        {
            id: 'foreign_retro',
            name: '🎸 Yabancı 80s & 90s Nostalji / Soft Rock',
            shortName: '80s/90s',
            urls: [
                'https://ice2.somafm.com/underground80s-128-mp3',
                'https://ice4.somafm.com/leftcoast-128-mp3',
                'https://stream.srg-ssr.ch/m/rsp/mp3_128'
            ]
        },
        {
            id: 'jazz',
            name: '🎷 Smooth Jazz & Lounge (Swiss Jazz / SomaFM)',
            shortName: 'Jazz',
            urls: [
                'https://stream.srg-ssr.ch/m/rsj/mp3_128',
                'https://ice2.somafm.com/sonicuniverse-128-mp3',
                'https://ice4.somafm.com/lush-128-mp3'
            ]
        },
        {
            id: 'ambient',
            name: '🌌 Ambient & Chillout (Derin Okuma Atmosferi)',
            shortName: 'Ambient',
            urls: [
                'https://ice2.somafm.com/deepspaceone-128-mp3',
                'https://ice4.somafm.com/fluid-128-mp3',
                'https://ice2.somafm.com/groovesalad-128-mp3'
            ]
        }
    ];

    let radioAudio = null;
    let currentUrlIndex = 0;

    function getCurrentRadioStation() {
        const id = localStorage.getItem('tvRadioStation') || 'off';
        return RADIO_STATIONS.find(s => s.id === id) || RADIO_STATIONS[0];
    }

    function isRadioPlaying() {
        return !!(radioAudio && !radioAudio.paused && getCurrentRadioStation().id !== 'off');
    }

    function applyRadioVolume() {
        if (!radioAudio) return;
        const vol = parseFloat(localStorage.getItem('tvRadioVolume'));
        radioAudio.volume = (vol >= 0.05 && vol <= 1.0) ? vol : 0.45;
    }

    function startOrSwitchRadio(stationId, showNotification) {
        try {
            if (stationId !== undefined) {
                localStorage.setItem('tvRadioStation', String(stationId));
            }
            const st = getCurrentRadioStation();
            if (!st || st.id === 'off' || !st.urls.length) {
                if (radioAudio) {
                    try { radioAudio.pause(); radioAudio.src = ''; } catch (e) {}
                }
                updateClockBadge();
                if (showNotification && typeof showToastGlobal === 'function') {
                    showToastGlobal('🔇 Radyo kapatıldı', 1400);
                }
                return;
            }

            if (!radioAudio) {
                radioAudio = new Audio();
                radioAudio.preload = 'none';
                radioAudio.crossOrigin = 'anonymous';
                radioAudio.addEventListener('error', () => {
                    const curr = getCurrentRadioStation();
                    if (!curr || curr.id === 'off') return;
                    currentUrlIndex = (currentUrlIndex + 1) % curr.urls.length;
                    if (currentUrlIndex !== 0) {
                        radioAudio.src = curr.urls[currentUrlIndex];
                        applyRadioVolume();
                        radioAudio.play().catch(() => {});
                    }
                });
                radioAudio.addEventListener('playing', updateClockBadge);
                radioAudio.addEventListener('pause', updateClockBadge);
            }

            currentUrlIndex = 0;
            radioAudio.src = st.urls[0];
            applyRadioVolume();
            const playPromise = radioAudio.play();
            if (playPromise && typeof playPromise.then === 'function') {
                playPromise.then(() => {
                    updateClockBadge();
                    if (showNotification && typeof showToastGlobal === 'function') {
                        showToastGlobal('📻 Çalıyor: ' + st.name, 1800);
                    }
                }).catch(() => {});
            }
        } catch (e) {}
    }

    window.tvSetRadioStation = function (val) {
        startOrSwitchRadio(val, true);
    };

    window.tvSetRadioVolume = function (val) {
        try { localStorage.setItem('tvRadioVolume', String(val)); } catch (e) {}
        applyRadioVolume();
        if (typeof showToastGlobal === 'function') {
            showToastGlobal('🔊 Radyo sesi: %' + Math.round((parseFloat(val) || 0.45) * 100), 1200);
        }
    };

    function buildBar() {
        const bar = document.createElement('div');
        bar.id = 'tvBar';
        document.body.appendChild(bar);
        setBar('feed');
    }

    const BAR = {
        feed: '<span><b>◄</b> Ayarlar & Radyo</span><span><b>▲▼</b> Haber</span><span id="tvCount"></span><span><b>OK</b> Oku</span><span><b>2×OK</b> ✨ Detaylı Özet</span><span><b>►</b> Filtreler</span>',
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

    // ---------- AKILLI TOPLU API ANAHTARI ALGILAYICI (TEK TEK, VİRGÜLLE VEYA .TXT İÇERİĞİ YAPIŞTIRMA) ----------
    // Kutuya ister tek anahtar, ister virgülle/boşlukla ayrılmış anahtarlar, ister bütün bir .txt dosyasının içeriği
    // yapıştırılsın; içindeki tüm Groq (gsk_...) ve Gemini (AIza...) anahtarlarını otomatik ayıklar ve kaydeder.
    function extractAllApiKeys(rawText) {
        const out = { groq: [], gemini: [] };
        if (!rawText) return out;
        const re = /(gsk_[A-Za-z0-9_\-]{20,}|AIza[0-9A-Za-z_\-]{25,})/g;
        let m;
        while ((m = re.exec(String(rawText)))) {
            const k = m[1].trim();
            const list = k.startsWith('gsk_') ? out.groq : out.gemini;
            if (!list.includes(k)) list.push(k);
        }
        return out;
    }

    function saveExtractedApiKeys(rawText) {
        const found = extractAllApiKeys(rawText);
        const total = found.groq.length + found.gemini.length;
        if (total === 0) return { total: 0, addG: 0, addM: 0, dup: 0 };

        let g = [], m = [];
        try { g = JSON.parse(localStorage.getItem('groqApiKeys') || '[]'); } catch (e) {}
        try { m = JSON.parse(localStorage.getItem('geminiApiKeys') || '[]'); } catch (e) {}
        if (!Array.isArray(g)) g = [];
        if (!Array.isArray(m)) m = [];

        let addG = 0, addM = 0, dup = 0;
        found.groq.forEach(k => {
            if (g.includes(k)) dup++;
            else { g.push(k); addG++; }
        });
        found.gemini.forEach(k => {
            if (m.includes(k)) dup++;
            else { m.push(k); addM++; }
        });

        try {
            localStorage.setItem('groqApiKeys', JSON.stringify(g));
            localStorage.setItem('geminiApiKeys', JSON.stringify(m));
        } catch (e) {}

        if (typeof loadGroqKeys === 'function') {
            try { loadGroqKeys(); } catch (e) {}
        }
        return { total, addG, addM, dup };
    }

    // ai.js içindeki tekli addGroqKey ve parseKeysFromText fonksiyonlarını çoklu/virgüllü/.txt destekli sürümle güncelliyoruz
    window.parseKeysFromText = extractAllApiKeys;
    window.importKeysFromText = saveExtractedApiKeys;

    window.addGroqKey = function () {
        const input = document.getElementById('newGroqKeyInput');
        if (!input) return;
        const raw = input.value.trim();
        if (!raw) return;

        const r = saveExtractedApiKeys(raw);
        if (r.total === 0) {
            alert('Geçerli anahtar bulunamadı. Groq anahtarı gsk_ ile, Gemini anahtarı AIza ile başlamalıdır.\n(Tek tek, virgülle ayrılmış veya .txt içeriğini doğrudan yapıştırabilirsiniz.)');
            return;
        }
        input.value = '';
        const added = r.addG + r.addM;
        if (added > 0) {
            const parts = [];
            if (r.addG > 0) parts.push(`${r.addG} Groq`);
            if (r.addM > 0) parts.push(`${r.addM} Gemini`);
            const msg = `✅ ${parts.join(' + ')} anahtarı eklendi!` + (r.dup ? ` (${r.dup} zaten kayıtlıydı)` : '');
            if (typeof showToastGlobal === 'function') showToastGlobal(msg, 3500);
        } else {
            if (typeof showToastGlobal === 'function') showToastGlobal(`ℹ️ Yapıştırılan ${r.dup} anahtar zaten ekli!`, 2800);
        }
    };

    function upgradeApiKeyInputBox() {
        const keyInput = document.getElementById('newGroqKeyInput');
        if (!keyInput || keyInput.dataset.tvBulkReady) return;
        keyInput.dataset.tvBulkReady = '1';
        // Şifre maskesini kaldırıp normal metin yapıyoruz ki TV klavyesinde ve çoklu yapıştırmada rahatça görülsün
        try { keyInput.type = 'text'; } catch (e) {}
        keyInput.placeholder = 'Tek tek, virgülle (key1, key2) veya tüm .txt içeriğini yapıştırın...';

        // Kutuya doğrudan çok satırlı .txt içeriği veya virgüllü liste yapıştırıldığında satır sonları kaybolmadan yakala ve kaydet
        keyInput.addEventListener('paste', (e) => {
            try {
                const clip = (e.clipboardData || window.clipboardData).getData('text');
                if (!clip) return;
                const found = extractAllApiKeys(clip);
                if ((found.groq.length + found.gemini.length) >= 1) {
                    e.preventDefault();
                    keyInput.value = clip.replace(/[\r\n]+/g, ', ');
                    window.addGroqKey();
                }
            } catch (err) {}
        });
    }

    // ---------- HER KARTTA SIRAYLA FARKLI API ANAHTARI KULLANIMI (STRICT ROUND-ROBIN KEY ROTATION) ----------
    function getAllKeyEntries() {
        let g = [], m = [];
        try { g = JSON.parse(localStorage.getItem('groqApiKeys') || '[]'); } catch (e) {}
        try { m = JSON.parse(localStorage.getItem('geminiApiKeys') || '[]'); } catch (e) {}
        const list = [];
        if (Array.isArray(g)) {
            g.forEach((k, idx) => {
                if (k && String(k).trim()) list.push({ provider: 'groq', key: String(k).trim(), label: `Groq #${idx + 1}` });
            });
        }
        if (Array.isArray(m)) {
            m.forEach((k, idx) => {
                if (k && String(k).trim()) list.push({ provider: 'gemini', key: String(k).trim(), label: `Gemini #${idx + 1}` });
            });
        }
        return list;
    }

    function hasAIKey() {
        return getAllKeyEntries().length > 0;
    }

    let rrKeyCounter = 0;
    try { rrKeyCounter = parseInt(localStorage.getItem('tvRrKeyIdx') || '0', 10) || 0; } catch (e) {}

    async function tvFetchWithTimeout(url, ms, opts) {
        if (typeof fetchWithTimeout === 'function') return fetchWithTimeout(url, ms, opts);
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), ms);
        try {
            return await fetch(url, Object.assign({}, opts, { signal: ctrl.signal }));
        } finally {
            clearTimeout(t);
        }
    }

    async function callGroqSingleKey(key, messages, maxTokens, temperature) {
        const models = (typeof GROQ_MODELS_FAST !== 'undefined' && Array.isArray(GROQ_MODELS_FAST) && GROQ_MODELS_FAST.length)
            ? GROQ_MODELS_FAST
            : ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3.6-27b'];
        const url = (typeof GROQ_URL !== 'undefined') ? GROQ_URL : 'https://api.groq.com/openai/v1/chat/completions';
        let lastErr = 'Groq yanıt vermedi';

        for (const model of models) {
            const body = { model, messages, temperature, max_tokens: Math.max(maxTokens || 1400, 1400) };
            if (model.startsWith('openai/gpt-oss')) body.reasoning_effort = 'low';
            const res = await tvFetchWithTimeout(url, 22000, {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                const data = await res.json();
                let text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
                text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
                if (text) return text;
                lastErr = 'Model boş yanıt döndürdü';
                continue;
            }
            if (res.status === 404 || res.status === 400) {
                lastErr = `Model hatası (${res.status})`;
                continue;
            }
            lastErr = `HTTP ${res.status}`;
            break;
        }
        throw new Error(lastErr);
    }

    async function callGeminiSingleKey(key, messages, maxTokens, temperature) {
        const models = (typeof GEMINI_MODELS !== 'undefined' && Array.isArray(GEMINI_MODELS) && GEMINI_MODELS.length)
            ? GEMINI_MODELS
            : ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest'];
        const base = (typeof GEMINI_BASE !== 'undefined') ? GEMINI_BASE : 'https://generativelanguage.googleapis.com/v1beta/models/';
        let lastErr = 'Gemini yanıt vermedi';

        for (const model of models) {
            const payload = (typeof toGeminiPayload === 'function')
                ? toGeminiPayload(messages, { temperature, maxTokens: Math.max(maxTokens || 1400, 1400), json: false })
                : { contents: [{ role: 'user', parts: [{ text: messages.map(m => m.content).join('\n\n') }] }] };
            const res = await tvFetchWithTimeout(`${base}${model}:generateContent`, 22000, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const data = await res.json();
                const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
                const text = parts.filter(p => !p.thought).map(p => p.text || '').join('').trim();
                if (text) return text;
                lastErr = 'Gemini boş yanıt';
                continue;
            }
            if (res.status === 404) continue;
            lastErr = `HTTP ${res.status}`;
            break;
        }
        throw new Error(lastErr);
    }

    // Her çağrıda sıradaki API anahtarını seçer (Kart 1 -> Key #1, Kart 2 -> Key #2, Kart 3 -> Key #3...)
    async function groqChatRotatedWithMeta(messages, opts = {}) {
        const entries = getAllKeyEntries();
        if (!entries.length) throw new Error('API anahtarı eksik. Ayarlardan Groq veya Gemini anahtarı ekleyin.');

        const startIdx = rrKeyCounter % entries.length;
        rrKeyCounter = (rrKeyCounter + 1) % 100000;
        try { localStorage.setItem('tvRrKeyIdx', String(rrKeyCounter)); } catch (e) {}

        const maxTok = Math.max(opts.maxTokens || 1400, 1400);
        const temp = opts.temperature !== undefined ? opts.temperature : 0.3;
        let lastError = null;

        for (let offset = 0; offset < entries.length; offset++) {
            const idx = (startIdx + offset) % entries.length;
            const item = entries[idx];
            try {
                const text = item.provider === 'groq'
                    ? await callGroqSingleKey(item.key, messages, maxTok, temp)
                    : await callGeminiSingleKey(item.key, messages, maxTok, temp);
                if (text) {
                    return {
                        text,
                        keyNum: idx + 1,
                        totalKeys: entries.length,
                        keyLabel: item.label
                    };
                }
            } catch (err) {
                lastError = err;
                console.warn(`[TV Key Rotation] Anahtar #${idx + 1} (${item.label}) atlandı, sıradaki deneniyor:`, err && err.message);
            }
        }
        throw lastError || new Error('Tüm API anahtarları yanıt vermedi.');
    }

    // ---------- HAFİF BELLEK (RAM) İÇİ MÜKERRER VE OKUNAN FİLTRESİ ----------
    const seenReadLinks = new Set();
    try {
        (JSON.parse(localStorage.getItem('tvSeenReadLinks') || '[]')).slice(-150).forEach(u => seenReadLinks.add(u));
    } catch (e) {}

    function isHideReadEnabled() {
        return localStorage.getItem('tvHideReadPref') !== '0';
    }

    let saveReadDebounce = null;
    function markLinkAsRead(link) {
        if (!link) return;
        seenReadLinks.add(link);
        clearTimeout(saveReadDebounce);
        saveReadDebounce = setTimeout(() => {
            try {
                const arr = [...seenReadLinks].slice(-180);
                localStorage.setItem('tvSeenReadLinks', JSON.stringify(arr));
            } catch (e) {}
        }, 3000);
    }

    function fastTitleKey(title) {
        return String(title || '')
            .replace(/\s+-\s+[^-]+$/, '')
            .toLowerCase()
            .replace(/[ıİ]/g, 'i')
            .replace(/[^a-z0-9ğüşöç\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 36);
    }

    let lastDedupCount = -1;
    function deduplicateDomCardsLight() {
        const domCards = cards();
        if (domCards.length === lastDedupCount) return;
        const hideRead = isHideReadEnabled();
        const domKeys = new Set();
        const domLinks = new Set();

        for (const c of domCards) {
            const link = c.dataset.link || '';
            const h3 = c.querySelector('h3');
            const tk = fastTitleKey(h3 ? h3.textContent : '');
            if (link === curLink) {
                if (link) domLinks.add(link);
                if (tk.length > 10) domKeys.add(tk);
                continue;
            }
            if ((link && domLinks.has(link)) || (hideRead && link && seenReadLinks.has(link)) || (tk.length > 10 && domKeys.has(tk))) {
                c.remove();
                continue;
            }
            if (link) domLinks.add(link);
            if (tk.length > 10) domKeys.add(tk);
        }
        lastDedupCount = cards().length;
    }

    // ---------- Ayarlar Menüsüne "📻 Arka Plan Radyo" ve "📺 TV Başlık, Akan Metin & Otomasyon" Enjeksiyonu ----------
    function isSummaryScrollMode() {
        const m = localStorage.getItem('tvCardContentMode') || 'ai';
        return m !== 'full';
    }

    window.tvSetCardContentMode = function (modeVal) {
        try {
            localStorage.setItem('tvCardContentMode', String(modeVal));
            if (typeof showToastGlobal === 'function') {
                showToastGlobal(
                    modeVal === 'full'
                        ? '📄 Kart üzerinde Haberin Tüm Metni (2 kez) akacak'
                        : '✨ Kart üzerinde 3-5 Cümlelik 5N1K Özeti (2 kez) akacak',
                    1500
                );
            }
        } catch (e) {}
        if (!overlayRoot()) attachCardLiveTickerAndReader(true);
    };

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
        if (!overlayRoot()) attachCardLiveTickerAndReader(true);
    };

    window.tvSetTitleScale = function (scaleVal) {
        const s = parseFloat(scaleVal) || 1.0;
        try {
            localStorage.setItem('tvTitleScale', String(s));
            document.documentElement.style.setProperty('--title-scale', String(s));
            if (typeof showToastGlobal === 'function') {
                showToastGlobal('📰 Haber başlık boyutu güncellendi (%' + Math.round(s * 100) + ')', 1200);
            }
        } catch (e) {}
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
    };

    window.tvSetAutoAdvance = function (val) {
        try {
            localStorage.setItem('tvAutoAdvance', String(val));
            if (typeof showToastGlobal === 'function') {
                showToastGlobal(val === '1' ? '🔄 Otomatik haber geçişi açıldı (2 tur sonunda geçer)' : '⏸️ Otomatik geçiş kapatıldı', 1400);
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
            if (typeof showToastGlobal === 'function') {
                showToastGlobal(boolVal ? '👁️ Okunan haberler gizlenecek' : '👁️ Okunan haberler de gösterilecek', 1400);
            }
        } catch (e) {}
    };

    window.tvClearAllCaches = function () {
        try {
            ['readerCacheV1', 'readerCacheV3', 'gnResolveV1', 'pubFeeds', 'tvCardAiCacheV1', 'tvSeenReadLinks', 'readArticles'].forEach(k => localStorage.removeItem(k));
            CARD_AI_CACHE.clear();
            AI_SUMMARY_CACHE.clear();
            seenReadLinks.clear();
            if (typeof READER_CACHE !== 'undefined') READER_CACHE.clear();
            if (typeof showToastGlobal === 'function') showToastGlobal('🧹 Önbellek temizlendi, uygulama hızlandırıldı!', 2000);
        } catch (e) {}
    };

    function injectTvSettings() {
        upgradeApiKeyInputBox();
        const modalBody = document.querySelector('#settingsModal .modal-body');
        if (!modalBody || document.getElementById('tvSettingsDetail')) return;
        const curContentMode = isSummaryScrollMode() ? 'ai' : 'full';
        const curDir = localStorage.getItem('tvTickerDir') || 'vertical';
        const curSpeed = localStorage.getItem('tvTickerSpeed') || '1.0';
        const curTitleScale = localStorage.getItem('tvTitleScale') || '1.0';
        const curScale = localStorage.getItem('tvTickerScale') || '1.0';
        const curAuto = localStorage.getItem('tvAutoAdvance') !== '0' ? '1' : '0';
        const curHideRead = localStorage.getItem('tvHideReadPref') !== '0' ? '1' : '0';
        const curRadio = localStorage.getItem('tvRadioStation') || 'off';
        const curRadioVol = localStorage.getItem('tvRadioVolume') || '0.45';

        const chk1 = $('showReadMain'); if (chk1) chk1.checked = (curHideRead === '1');
        const chk2 = $('showReadPopup'); if (chk2) chk2.checked = (curHideRead === '1');

        const radioDetails = document.createElement('details');
        radioDetails.className = 'setting-item';
        radioDetails.id = 'tvRadioSettingsDetail';
        const stationOptionsHtml = RADIO_STATIONS.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
        radioDetails.innerHTML = `
            <summary>📻 Arka Plan Radyo & Müzik</summary>
            <div class="setting-detail">
                <label class="tap-label" for="tvRadioStationSelect">Okurken Çalacak Radyo Yayını</label>
                <select id="tvRadioStationSelect" class="tap-select" onchange="window.tvSetRadioStation(this.value)">
                    ${stationOptionsHtml}
                </select>
                <p style="color: var(--text-muted); font-size: 0.8rem; margin: 6px 0 14px 0;">Seçtiğiniz radyo istasyonu haberleri izlerken ve okurken arka planda kesintisiz çalar.</p>

                <label class="tap-label" for="tvRadioVolSelect">Radyo Ses Seviyesi</label>
                <select id="tvRadioVolSelect" class="tap-select" onchange="window.tvSetRadioVolume(this.value)">
                    <option value="0.2">🔈 Çok Kısık (%20 - Arka Plan Fon)</option>
                    <option value="0.45">🔉 Dengeli / Varsayılan (%45)</option>
                    <option value="0.7">🔊 Yüksek (%70)</option>
                    <option value="1.0">📢 Tam Ses (%100)</option>
                </select>
            </div>
        `;

        const details = document.createElement('details');
        details.className = 'setting-item';
        details.id = 'tvSettingsDetail';
        details.innerHTML = `
            <summary>📺 TV Başlık, Akan Metin & Otomasyon</summary>
            <div class="setting-detail">
                <label class="tap-label" for="tvCardContentModeSelect">Kart Üzerinde Kaydırılacak Metin Türü</label>
                <select id="tvCardContentModeSelect" class="tap-select" onchange="window.tvSetCardContentMode(this.value)">
                    <option value="ai">✨ 3-5 Cümlelik 5N1K Özeti Aksın (2 Kez Akıp Sonrakine Geçer)</option>
                    <option value="full">📄 Haberin Tüm Metni Aksın (2 Kez Akıp Sonrakine Geçer)</option>
                </select>
                <p style="color: var(--text-muted); font-size: 0.8rem; margin: 6px 0 14px 0;">Hangisini seçerseniz seçin metin çekilene kadar başlığın altında bilgi ibaresi belirir, çekildiği anda başlığı tekrar etmeden 2 kez kaydırılır ve otomatik olarak sonraki habere geçilir.</p>

                <label class="tap-label" for="tvTitleScaleSelect">Haber Başlığı Yazı Boyutu</label>
                <select id="tvTitleScaleSelect" class="tap-select" onchange="window.tvSetTitleScale(this.value)">
                    <option value="0.75">Küçük (%75)</option>
                    <option value="0.9">Orta Küçük (%90)</option>
                    <option value="1.0">Normal / Varsayılan (%100 - +%25 Büyütülmüş)</option>
                    <option value="1.15">Büyük (%115)</option>
                    <option value="1.3">Çok Büyük (%130)</option>
                    <option value="1.5">Dev Başlık (%150)</option>
                </select>
                <p style="color: var(--text-muted); font-size: 0.8rem; margin: 6px 0 14px 0;">Ana kart üzerindeki sarı haber başlığının büyüklüğünü ayarlar.</p>

                <label class="tap-label" for="tvTickerScaleSelect">Akan Metin Yazı Boyutu (Yukarı & Yatay)</label>
                <select id="tvTickerScaleSelect" class="tap-select" onchange="window.tvSetTickerScale(this.value)">
                    <option value="0.8">Küçük (%80)</option>
                    <option value="1.0">Normal / Varsayılan (%100 - +%25 Büyütülmüş)</option>
                    <option value="1.2">Büyük (%120)</option>
                    <option value="1.4">Çok Büyük (%140)</option>
                    <option value="1.6">Dev Boyut (%160)</option>
                </select>
                <p style="color: var(--text-muted); font-size: 0.8rem; margin: 6px 0 14px 0;">Hem yukarı kayan cümlelerin hem de yatay bandın yazı büyüklüğünü değiştirir.</p>

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

                <label class="tap-label" for="tvTickerDirSelect">Akan Metin Yönü</label>
                <select id="tvTickerDirSelect" class="tap-select" onchange="window.tvSetTickerDir(this.value)">
                    <option value="vertical">⬆️ Aşağıdan Yukarıya (Cümle Cümle & Saydam)</option>
                    <option value="horizontal">➡️ Sağdan Sola (Klasik TV Haber Bandı)</option>
                </select>
                <p style="color: var(--text-muted); font-size: 0.8rem; margin: 6px 0 14px 0;">Aşağıdan yukarıya modunda cümleler saydam arka plan üzerinde kart resmiyle birlikte görünür.</p>

                <label class="tap-label" for="tvHideReadSelect">Okunan Haberleri Gizle</label>
                <select id="tvHideReadSelect" class="tap-select" onchange="window.tvSetHideRead(this.value)">
                    <option value="1">👁️ Açık / Varsayılan (Okunanlar tekrar düşmesin)</option>
                    <option value="0">👁️‍🗨️ Kapalı (Tüm haberler tekrar görünsün)</option>
                </select>
                <p style="color: var(--text-muted); font-size: 0.8rem; margin: 6px 0 14px 0;">İzlediğiniz veya okuduğunuz haberlerin akışta tekrar karşınıza çıkmasını engeller.</p>

                <label class="tap-label" for="tvAutoAdvanceSelect">Otomatik Sonraki Habere Geçiş</label>
                <select id="tvAutoAdvanceSelect" class="tap-select" onchange="window.tvSetAutoAdvance(this.value)">
                    <option value="1">🔄 Açık (Seçilen metin 2 kez akınca otomatik geçer)</option>
                    <option value="0">⏸️ Kapalı (Yalnızca kumanda ile geç)</option>
                </select>
                <p style="color: var(--text-muted); font-size: 0.8rem; margin: 6px 0 14px 0;">Seçilen özet veya tam metin 2 tam tur aktıktan sonra kendiliğinden sıradaki habere geçer.</p>

                <button type="button" class="tap-select" style="cursor:pointer; text-align:center; font-weight:bold; background:rgba(239,68,68,0.2); color:#fca5a5; border:1px solid rgba(239,68,68,0.4);" onclick="window.tvClearAllCaches()">🧹 Önbelleği Temizle & Hızlandır</button>
            </div>
        `;
        modalBody.prepend(details);
        modalBody.prepend(radioDetails);

        const selRadio = document.getElementById('tvRadioStationSelect'); if (selRadio) selRadio.value = curRadio;
        const selRadioVol = document.getElementById('tvRadioVolSelect'); if (selRadioVol) selRadioVol.value = curRadioVol;
        const selMode = document.getElementById('tvCardContentModeSelect'); if (selMode) selMode.value = curContentMode;
        const selTitleScale = document.getElementById('tvTitleScaleSelect'); if (selTitleScale) selTitleScale.value = curTitleScale;
        const selScale = document.getElementById('tvTickerScaleSelect'); if (selScale) selScale.value = curScale;
        const selSpeed = document.getElementById('tvTickerSpeedSelect'); if (selSpeed) selSpeed.value = curSpeed;
        const selDir = document.getElementById('tvTickerDirSelect'); if (selDir) selDir.value = curDir;
        const selHide = document.getElementById('tvHideReadSelect'); if (selHide) selHide.value = curHideRead;
        const selAuto = document.getElementById('tvAutoAdvanceSelect'); if (selAuto) selAuto.value = curAuto;
    }

    // ---------- Ana Ekranda Kart Üzerinde Aşağıdan Yukarıya (veya Yatay) Akan Özet/Metin & 2 Tur Sonunda Otomatik Geçiş ----------
    let tickerToken = 0;
    let autoAdvanceTimer = null;
    let nextCardWarmTimer = null;
    let currentFetchStartTimer = null;

    function advanceToNextCard() {
        if (overlayRoot() || aiOpen()) return;
        const l = cards();
        if (!l.length) return;
        const nextIdx = (curIndex() + 1 >= l.length) ? 0 : (curIndex() + 1);
        showCard(nextIdx, true);
    }

    function stopCardTicker() {
        clearTimeout(autoAdvanceTimer);
        clearTimeout(nextCardWarmTimer);
        clearTimeout(currentFetchStartTimer);
        autoAdvanceTimer = null;
        nextCardWarmTimer = null;
        currentFetchStartTimer = null;
        tickerToken++;
        const cur = document.querySelector('#newsGrid .swipe-wrapper.tv-current');
        if (cur) {
            cur.querySelectorAll('.tv-card-reader, .tv-fetch-badge').forEach(el => el.remove());
        }
    }

    // Bir cümlenin kart başlığının tekrarı olup olmadığını tespit eder (başlık zaten üstte göründüğü için akan metinde tekrar edilmez)
    function isSentenceRepeatingTitle(sentence, art) {
        if (!sentence || !art || !art.title) return false;
        const cleanTitle = typeof gnSplitTitle === 'function'
            ? gnSplitTitle(art.title).clean
            : String(art.title).replace(/\s+-\s+[^-]+$/, '').trim();
        const norm = (str) => String(str || '')
            .replace(/\s+-\s+[^-]+$/, '')
            .toLocaleLowerCase('tr')
            .replace(/[ıİ]/g, 'i')
            .replace(/[^a-z0-9ğüşöç\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        const normSent = norm(sentence);
        const normTitle = norm(cleanTitle);
        if (!normSent || !normTitle) return false;
        if (normSent === normTitle) return true;
        if (normSent.length < normTitle.length + 22 && (normSent.includes(normTitle) || normTitle.includes(normSent))) {
            return true;
        }
        const tWords = normTitle.split(' ').filter(w => w.length > 2);
        const sWords = normSent.split(' ').filter(w => w.length > 2);
        if (!tWords.length || !sWords.length) return false;
        const tSet = new Set(tWords.map(w => w.slice(0, 5)));
        let hit = 0;
        sWords.forEach(w => { if (tSet.has(w.slice(0, 5))) hit++; });
        const overlapRatio = hit / Math.max(tWords.length, sWords.length);
        return overlapRatio >= 0.70 && sWords.length <= tWords.length + 4;
    }

    // Cümlenin başındaki başlık kopyasını ("Başlık - " veya "Başlık: ") temizler ve başlıkla aynı olan cümleleri eler
    function removeTitleRepetitions(sentences, art) {
        if (!Array.isArray(sentences) || !sentences.length) return [];
        const cleanTitle = (art && art.title)
            ? (typeof gnSplitTitle === 'function' ? gnSplitTitle(art.title).clean : String(art.title).replace(/\s+-\s+[^-]+$/, '').trim())
            : '';
        const filtered = [];
        for (let s of sentences) {
            s = String(s || '').trim();
            if (!s) continue;
            if (cleanTitle && s.toLocaleLowerCase('tr').startsWith(cleanTitle.toLocaleLowerCase('tr'))) {
                const rest = s.slice(cleanTitle.length).replace(/^[\s\-–—:|.]+/, '').trim();
                if (rest.length >= 20) s = rest;
            }
            if (!isSentenceRepeatingTitle(s, art)) {
                filtered.push(s);
            }
        }
        return filtered;
    }

    // mergeShort=false olduğunda (özet modu) her cümleyi ayrı bir satır/kutu olarak tutar, asla tek cümlede birleştirmez
    function splitIntoSentences(text, mergeShort = false) {
        if (!text) return [];
        const raw = String(text)
            .split(/\n+/)
            .map(s => s.replace(/^[-•*\d.)]+\s*/, '').replace(/\s+/g, ' ').trim())
            .filter(Boolean);
        const out = [];
        for (const block of raw) {
            const sents = block.match(/[^.!?…]+[.!?…]+["”')]*\s*|[^.!?…]+$/g) || [block];
            if (!mergeShort) {
                for (const s of sents) {
                    const trimmed = s.trim();
                    if (trimmed.length >= 12) out.push(trimmed);
                }
            } else {
                let cur = '';
                for (const s of sents) {
                    const trimmed = s.trim();
                    if (!trimmed) continue;
                    if (cur && (cur.length + trimmed.length) > 165) {
                        out.push(cur);
                        cur = trimmed;
                    } else {
                        cur = cur ? (cur + ' ' + trimmed) : trimmed;
                    }
                }
                if (cur && cur.length >= 12) out.push(cur);
            }
        }
        return out;
    }

    // Başlıktaki anahtar kelimelerle cümlenin ilgisini ölçer (ilgisiz yan haber/reklam cümlelerini elemek için)
    function filterRelevantParagraphs(paras, art) {
        if (!Array.isArray(paras) || !paras.length) return [];
        if (!art || !art.title) return paras;
        const cleanTitle = typeof gnSplitTitle === 'function' ? gnSplitTitle(art.title).clean : String(art.title).replace(/\s+-\s+[^-]+$/, '');
        const words = cleanTitle
            .toLocaleLowerCase('tr')
            .replace(/[^a-z0-9ğüşöçâîû\s]/gi, ' ')
            .split(/\s+/)
            .filter(w => w.length >= 4);
        if (!words.length) return paras;
        const stems = words.map(w => w.slice(0, 5));

        const scored = paras.map((p, idx) => {
            const low = String(p || '').toLocaleLowerCase('tr');
            let hits = 0;
            stems.forEach(st => { if (low.includes(st)) hits++; });
            return { p, idx, hits };
        });
        const anyHit = scored.some(x => x.hits > 0);
        if (!anyHit) return paras;
        return scored
            .filter((x, i) => i < 3 || x.hits > 0 || (scored[i - 1] && scored[i - 1].hits > 0))
            .map(x => x.p);
    }

    // API anahtarı yoksa veya internet dalgalanmasında 5N1K (kim, nerede, ne zaman, niçin, nasıl) odaklı 3-4 kritik cümleyi seçen yedek özetleyici
    function buildSmartExtractiveSummary(paras, art, maxSentences = 4) {
        const relevantParas = filterRelevantParagraphs(paras, art);
        const all = [];
        if (Array.isArray(relevantParas) && relevantParas.length) {
            relevantParas.forEach(p => splitIntoSentences(p, false).forEach(s => all.push(s)));
        }
        if (all.length < 2 && art && art.description) {
            const cleanDesc = (art.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            splitIntoSentences(cleanDesc, false).forEach(s => {
                if (!all.includes(s)) all.push(s);
            });
        }
        const noTitleRepeat = removeTitleRepetitions(all, art);
        const filtered = noTitleRepeat.filter(s => s.length >= 22 && !/abone ol|bizi takip|tıklayın|haberin devamı|tüm hakları|google haberler/i.test(s));
        const pool = filtered.length ? filtered : noTitleRepeat;
        if (pool.length <= maxSentences) return pool.slice(0, maxSentences);

        const scored = pool.map((s, idx) => {
            let sc = idx === 0 ? 4 : idx === 1 ? 3 : 1;
            if (/\d/.test(s)) sc += 2;
            if (/nedeniyle|dolayı|için|sonucu|açıkladı|bildirdi|belirtti|duyurdu|gerçekleşti|başladı|karar/i.test(s)) sc += 2;
            if (/saat|gün|ay|yıl|bugün|dün|yarın|bölge|ilçe|şehir|mahalle|ülke/i.test(s)) sc += 1;
            return { s, idx, sc };
        });
        scored.sort((a, b) => b.sc - a.sc || a.idx - b.idx);
        const chosen = scored.slice(0, maxSentences).sort((a, b) => a.idx - b.idx).map(x => x.s);
        return chosen;
    }

    // Site doğrudan kazımayı engellediyse Bing Haberler RSS ve DuckDuckGo üzerinden başlıkla eşleşen 5N1K haber özetini çeker
    async function fetchSearchSnippetsForTitle(art) {
        if (!art || !art.title || typeof fetchHtmlRace !== 'function') return [];
        const cleanTitle = typeof gnSplitTitle === 'function' ? gnSplitTitle(art.title).clean : String(art.title).replace(/\s+-\s+[^-]+$/, '').trim();
        const pub = typeof gnSplitTitle === 'function' ? gnSplitTitle(art.title).pub : (art.source || '');
        const shortQ = cleanTitle.split(/\s+/).filter(w => w.length > 2).slice(0, 8).join(' ');
        const out = [];

        try {
            const xml = await fetchHtmlRace('https://www.bing.com/news/search?format=rss&setlang=tr&q=' + encodeURIComponent(shortQ + (pub ? ' ' + pub : '')));
            if (xml && !/^\s*(<!doctype|<html)/i.test(xml)) {
                const x = new DOMParser().parseFromString(xml, 'text/xml');
                const items = [...x.getElementsByTagName('item')];
                for (const item of items.slice(0, 5)) {
                    const t = (item.getElementsByTagName('title')[0] || {}).textContent || '';
                    const d = (item.getElementsByTagName('description')[0] || {}).textContent || '';
                    const overlap = typeof titleOverlap === 'function' ? titleOverlap(cleanTitle, t) : 0.5;
                    if (overlap >= 0.30 && d) {
                        const cleanD = d.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                        splitIntoSentences(cleanD, false).forEach(s => {
                            if (s.length >= 25 && !isSentenceRepeatingTitle(s, art) && !out.includes(s)) out.push(s);
                        });
                    }
                    if (out.length >= 5) break;
                }
            }
        } catch (e) {}

        if (out.length >= 3) return out;

        try {
            const ddgHtml = await fetchHtmlRace('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(shortQ + (pub ? ' ' + pub : '')));
            if (ddgHtml) {
                const doc = new DOMParser().parseFromString(ddgHtml, 'text/html');
                const snippets = [...doc.querySelectorAll('.result__snippet')].map(el => (el.textContent || '').replace(/\s+/g, ' ').trim());
                for (const snip of snippets.slice(0, 4)) {
                    splitIntoSentences(snip, false).forEach(s => {
                        if (s.length >= 25 && !isSentenceRepeatingTitle(s, art) && !out.includes(s)) out.push(s);
                    });
                    if (out.length >= 5) break;
                }
            }
        } catch (e) {}

        return out;
    }

    const inflightArticleFetch = new Map();

    // Okuma modu (openModal) ile birebir aynı kaynakları + yayıncı RSS + esnek HTML + Arama snippet yedeğini kullanır
    async function fetchArticleParasForPeek(art) {
        if (!art || !art.link) return { ok: false, paras: [] };

        if (typeof READER_CACHE !== 'undefined' && READER_CACHE.has(art.link)) {
            const c = READER_CACHE.get(art.link);
            if (c && Array.isArray(c.paras) && c.paras.length) return { ok: true, paras: c.paras };
        }

        if (art.content && art.content.length > 200) {
            const fp = typeof finalizeParas === 'function'
                ? finalizeParas(art.content.split('\n\n'), art)
                : splitIntoSentences(art.content, false);
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
                    try {
                        const w = await workerRead(url, art);
                        if (w && Array.isArray(w.paras) && w.paras.length >= 2) {
                            if (typeof workerRemember === 'function') workerRemember(url, w);
                            if (typeof READER_CACHE !== 'undefined') READER_CACHE.set(art.link, { paras: w.paras, via: 'hızlı sunucu' });
                            return { ok: true, paras: w.paras };
                        }
                    } catch (e) {}
                }

                if (/news\.google\.com/.test(url) && typeof resolveGoogleNewsUrl === 'function') {
                    const real = await resolveGoogleNewsUrl(url, art);
                    if (real) url = real;
                    if (typeof READER_CACHE !== 'undefined' && READER_CACHE.has(art.link)) {
                        const c = READER_CACHE.get(art.link);
                        if (c && Array.isArray(c.paras) && c.paras.length) {
                            return { ok: true, paras: c.paras };
                        }
                    }
                }

                if (!/news\.google\.com/.test(url) && typeof extractArticle === 'function') {
                    try {
                        const res = await extractArticle(url, art, false);
                        if (res && Array.isArray(res.paras) && res.paras.length) {
                            if (typeof READER_CACHE !== 'undefined') READER_CACHE.set(art.link, res);
                            return { ok: true, paras: res.paras };
                        }
                    } catch (e) {}
                }

                if (typeof matchViaPublisherFeed === 'function') {
                    try {
                        const hit = await matchViaPublisherFeed(art);
                        if (hit && Array.isArray(hit.paras) && hit.paras.length) {
                            const ps = typeof finalizeParas === 'function' ? finalizeParas(hit.paras, art) : hit.paras;
                            const usePs = ps.length ? ps : hit.paras;
                            if (usePs.length) {
                                if (typeof READER_CACHE !== 'undefined') READER_CACHE.set(art.link, { paras: usePs, via: 'yayıncı RSS' });
                                return { ok: true, paras: usePs };
                            }
                        }
                    } catch (e) {}
                }

                if (!/news\.google\.com/.test(url) && typeof getHtmlShared === 'function' && typeof extractFromHtml === 'function') {
                    try {
                        const rawHtml = await getHtmlShared(url, false);
                        const ps = extractFromHtml(rawHtml, art);
                        if (Array.isArray(ps) && ps.length >= 1 && ps.join(' ').length >= 140) {
                            if (typeof READER_CACHE !== 'undefined') READER_CACHE.set(art.link, { paras: ps, via: 'sayfa-esnek' });
                            return { ok: true, paras: ps };
                        }
                    } catch (e) {}
                }

                const searchSents = await fetchSearchSnippetsForTitle(art);
                if (searchSents.length >= 2) {
                    return { ok: true, paras: searchSents };
                }
            } catch (e) {}
            return { ok: false, paras: [] };
        })();

        inflightArticleFetch.set(art.link, p);
        p.finally(() => inflightArticleFetch.delete(art.link));
        return p;
    }

    // ---------- KART ÜZERİ 3-5 CÜMLELİK 5N1K KRİTİK ÖZETLEYİCİ (BAŞLIK TEKRARSIZ + SIRALI API ANAHTARI) ----------
    // CARD_AI_CACHE: link -> { sents: string[], keyInfo: string, isAi: boolean }
    const CARD_AI_CACHE = new Map();
    const inflightCardAi = new Map();

    async function getCardMiniAISummaryData(art) {
        if (!art || !art.link) return null;

        if (CARD_AI_CACHE.has(art.link)) {
            const cached = CARD_AI_CACHE.get(art.link);
            const hasNewReaderText = typeof READER_CACHE !== 'undefined' && READER_CACHE.has(art.link);
            if (cached && (cached.isAi || cached.sents.length >= 3 || !hasNewReaderText)) {
                return cached;
            }
            CARD_AI_CACHE.delete(art.link);
        }

        if (inflightCardAi.has(art.link)) return inflightCardAi.get(art.link);

        const job = (async () => {
            const fetched = await fetchArticleParasForPeek(art);
            const cleanTitle = typeof gnSplitTitle === 'function' ? gnSplitTitle(art.title || '').clean : String(art.title || '').replace(/\s+-\s+[^-]+$/, '').trim();
            const cleanDesc = (art.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

            let rawContext = '';
            if (fetched.ok && fetched.paras.length) {
                const relevantParas = filterRelevantParagraphs(fetched.paras, art);
                rawContext = relevantParas.join('\n').substring(0, 2600);
            }
            if (!rawContext || rawContext.length < 60) {
                const descNoTitle = isSentenceRepeatingTitle(cleanDesc, art) ? '' : cleanDesc;
                rawContext = descNoTitle ? `Haber Özeti: ${descNoTitle}` : '';
            }

            if (hasAIKey() && (rawContext.length >= 30 || cleanTitle.length >= 15)) {
                try {
                    const messages = [
                        {
                            role: 'system',
                            content: [
                                'Sen deneyimli bir TV haber editörüsün.',
                                'GÖREVİN: Verilen haber metninden yararlanarak, "ANA HABER BAŞLIĞI" konusuyla ilgili KİM, NE, NEREDE, NE ZAMAN, NİÇİN ve NASIL (5N1K) sorularının cevaplarını içeren 3 ila 5 cümlelik akıcı bir Türkçe özet hazırlamak.',
                                'KESİN KURALLAR:',
                                '1. KESİNLİKLE başlığı tekrar etme! Başlık zaten ekranda üstte görünüyor; ilk cümlede başlığı aynen yazmak yerine doğrudan haberin içeriğindeki detaylara (kim, nerede, ne zaman, niçin, nasıl) gir.',
                                '2. Metin içinde ana başlıkla ilgisiz yan haberler, reklamlar veya başka konular varsa onları yoksay; sadece başlıktaki haberi özetle.',
                                '3. Özeti mutlaka 3, 4 veya 5 ayrı cümle olarak yaz (asla tek cümle bırakma).',
                                '4. Her cümleyi yeni bir satırda düz metin olarak yaz; HTML etiketi, numara veya madde işareti kullanma.'
                            ].join('\n')
                        },
                        {
                            role: 'user',
                            content: `ANA HABER BAŞLIĞI (Ekranda zaten görünüyor, tekrar etme): ${cleanTitle}\nKAYNAK: ${art.source || ''}\nHABER METNİ VE DETAYLAR:\n${rawContext || 'Haber metni kısa, başlıktaki olayın bağlamını ve bilinen temel unsurlarını başlığı tekrar etmeden 3 cümleyle açıkla.'}`
                        }
                    ];

                    const metaRes = await groqChatRotatedWithMeta(messages, { temperature: 0.25, maxTokens: 1400 });
                    const cleanText = String(metaRes.text || '')
                        .replace(/<[^>]*>/g, ' ')
                        .replace(/[*#_`~>]/g, '')
                        .trim();

                    const rawSents = splitIntoSentences(cleanText, false);
                    const dedupedSents = removeTitleRepetitions(rawSents, art);
                    const sents = (dedupedSents.length >= 2 ? dedupedSents : rawSents).slice(0, 5);

                    if (sents.length >= 2) {
                        const entry = {
                            sents,
                            keyInfo: metaRes.totalKeys > 1 ? `Anahtar ${metaRes.keyNum}/${metaRes.totalKeys}` : '5N1K Özeti',
                            isAi: true
                        };
                        if (CARD_AI_CACHE.size > 60) CARD_AI_CACHE.delete(CARD_AI_CACHE.keys().next().value);
                        CARD_AI_CACHE.set(art.link, entry);
                        return entry;
                    }
                } catch (e) {
                    console.warn('[TV 3-5 Cümle 5N1K Özeti yedek kritik özete düştü]:', e && e.message);
                }
            }

            const fallbackSents = buildSmartExtractiveSummary(fetched.paras, art, 4);
            if (fallbackSents.length >= 2) {
                const entry = {
                    sents: fallbackSents,
                    keyInfo: 'Kritik Özet',
                    isAi: false
                };
                if (CARD_AI_CACHE.size > 60) CARD_AI_CACHE.delete(CARD_AI_CACHE.keys().next().value);
                CARD_AI_CACHE.set(art.link, entry);
                return entry;
            } else if (fallbackSents.length === 1) {
                return { sents: fallbackSents, keyInfo: 'Özet', isAi: false };
            }
            return null;
        })();

        inflightCardAi.set(art.link, job);
        job.finally(() => inflightCardAi.delete(art.link));
        return job;
    }

    // Bir kart açıkken sıradaki haberin özetini (veya metnini) arka planda sıradaki API anahtarıyla önceden hazırlar
    function prefetchUpcomingCardInBackground(myToken) {
        clearTimeout(nextCardWarmTimer);
        nextCardWarmTimer = setTimeout(() => {
            if (myToken !== tickerToken || overlayRoot() || aiOpen()) return;
            const l = cards();
            if (l.length < 2 || typeof filteredArticles === 'undefined') return;
            const summaryMode = isSummaryScrollMode();

            for (let step = 1; step <= 2; step++) {
                const candidateCard = l[(curIndex() + step) % l.length];
                if (!candidateCard || !candidateCard.dataset.link) continue;
                const link = candidateCard.dataset.link;
                if (summaryMode && CARD_AI_CACHE.has(link)) continue;
                if (!summaryMode && typeof READER_CACHE !== 'undefined' && READER_CACHE.has(link)) continue;

                const nextArt = filteredArticles.find(a => a && a.link === link);
                if (nextArt) {
                    if (summaryMode) {
                        getCardMiniAISummaryData(nextArt).catch(() => {});
                    } else {
                        fetchArticleParasForPeek(nextArt).catch(() => {});
                    }
                    break;
                }
            }
        }, 1000);
    }

    // ---------- 2×OK Detaylı Yapay Zeka Özetleyici ----------
    const AI_SUMMARY_CACHE = new Map();

    async function getFastAISummaryHtml(art) {
        if (!art) throw new Error('Haber bulunamadı');
        if (AI_SUMMARY_CACHE.has(art.link)) return AI_SUMMARY_CACHE.get(art.link);

        let bodyText = '';
        if (typeof READER_CACHE !== 'undefined' && READER_CACHE.has(art.link)) {
            const c = READER_CACHE.get(art.link);
            if (c && Array.isArray(c.paras) && c.paras.length) {
                bodyText = filterRelevantParagraphs(c.paras, art).join('\n');
            }
        }
        if (!bodyText) {
            try {
                const fetched = await fetchArticleParasForPeek(art);
                if (fetched && fetched.ok && fetched.paras.length) {
                    bodyText = filterRelevantParagraphs(fetched.paras, art).join('\n');
                }
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
            { role: 'user', content: `[HABER METNİ]:\n${bodyText}\n\nYalnızca "${art.title || ''}" başlıklı haberi (kim, nerede, ne zaman, niçin, nasıl sorularının yanıtlarıyla) TV ekranında hızlıca okunabilecek şekilde özetle ve en önemli noktaları maddeler halinde yaz.` }
        ];

        const metaRes = await groqChatRotatedWithMeta(messages, { temperature: 0.35, maxTokens: 1600 });
        const cleanHtml = String(metaRes.text || '').replace(/```html/g, '').replace(/```/g, '').trim();
        if (cleanHtml) AI_SUMMARY_CACHE.set(art.link, cleanHtml);
        return cleanHtml;
    }

    // Kart açılır açılmaz önce yalnızca Başlık + "Haber özeti/metni çekiliyor..." gösterir;
    // içerik çekildiği anda (veya arka planda önceden hazırsa anında) başlık tekrarı olmadan 2 tur kaydırıp sonrakine geçer!
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

        const myToken = ++tickerToken;
        const autoAdvanceEnabled = localStorage.getItem('tvAutoAdvance') !== '0';
        const isHorizontal = localStorage.getItem('tvTickerDir') === 'horizontal';
        const summaryMode = isSummaryScrollMode();

        const badge = document.createElement('div');
        badge.className = 'tv-fetch-badge';
        badge.textContent = summaryMode ? '✨ Haber özeti çekiliyor...' : '⏳ Haber metni çekiliyor...';
        cardEl.appendChild(badge);

        if (summaryMode && CARD_AI_CACHE.has(art.link)) {
            const c = CARD_AI_CACHE.get(art.link);
            if (c && !c.isAi && c.sents.length < 3 && typeof READER_CACHE !== 'undefined' && READER_CACHE.has(art.link)) {
                CARD_AI_CACHE.delete(art.link);
            }
        }

        const readerWrap = document.createElement('div');
        readerWrap.className = 'tv-card-reader';
        contentEl.appendChild(readerWrap);

        // Başlığın hemen altında içerik çekilene kadar gösterilecek zarif bilgi ibaresi
        const waitingBox = document.createElement('div');
        waitingBox.className = 'tv-waiting-box';
        waitingBox.innerHTML = `<span class="tv-waiting-dot"></span><span>${summaryMode ? 'Haber özeti çekiliyor...' : 'Haber metni çekiliyor...'}</span>`;
        readerWrap.appendChild(waitingBox);

        function mountAndStartScrolling(list, badgeClass, badgeText) {
            if (myToken !== tickerToken) return;
            readerWrap.innerHTML = '';

            let trackEl = null;
            if (isHorizontal) {
                const tickerWrap = document.createElement('div');
                tickerWrap.className = 'tv-ticker-wrap';
                trackEl = document.createElement('div');
                trackEl.className = 'tv-ticker-track';
                const joined = list.map(s => escapeHtml(s)).join('<span class="tv-sep">●</span>');
                trackEl.innerHTML = joined + '<span class="tv-sep">●</span>';
                tickerWrap.appendChild(trackEl);
                readerWrap.appendChild(tickerWrap);
            } else {
                const vViewport = document.createElement('div');
                vViewport.className = 'tv-vscroll-viewport';
                trackEl = document.createElement('div');
                trackEl.className = 'tv-vscroll-track';
                trackEl.innerHTML = list.map(s => `<div class="tv-vscroll-sentence">${escapeHtml(s)}</div>`).join('');
                vViewport.appendChild(trackEl);
                readerWrap.appendChild(vViewport);
            }

            const totalChars = list.join(' ').length;
            trackEl.dataset.chars = String(totalChars);
            const multiplier = parseFloat(localStorage.getItem('tvTickerSpeed')) || 1.0;
            const baseFactor = isHorizontal ? 0.11 : 0.082;
            const singlePassSec = Math.max(9, Math.round((totalChars * baseFactor) / multiplier));
            trackEl.style.setProperty('--ticker-dur', singlePassSec + 's');
            trackEl.style.animation = 'none';
            void trackEl.offsetWidth;
            trackEl.style.animation = '';

            badge.className = 'tv-fetch-badge ' + (badgeClass || 'ok');
            badge.textContent = badgeText;
            setTimeout(() => { if (myToken === tickerToken && badge.parentNode) badge.style.opacity = '0'; }, 3500);

            if (autoAdvanceEnabled) {
                clearTimeout(autoAdvanceTimer);
                const advanceDelayMs = (singlePassSec * 2 * 1000) + 400;
                autoAdvanceTimer = setTimeout(() => {
                    if (myToken !== tickerToken || overlayRoot() || aiOpen()) return;
                    advanceToNextCard();
                }, advanceDelayMs);
            }
        }

        // 1) Özet modundaysa ve bir önceki karttayken arka planda hazırlandıysa beklemeden anında akıt!
        const cachedAi = summaryMode && CARD_AI_CACHE.get(art.link);
        if (cachedAi && cachedAi.sents && cachedAi.sents.length) {
            mountAndStartScrolling(
                cachedAi.sents,
                'ai',
                `✨ ${cachedAi.keyInfo} (${cachedAi.sents.length} cümle • 2 kez akar)`
            );
            prefetchUpcomingCardInBackground(myToken);
            return;
        }

        // 2) Tam metin modundaysa ve READER_CACHE içinde zaten hazırsa beklemeden anında akıt!
        if (!summaryMode && typeof READER_CACHE !== 'undefined' && READER_CACHE.has(art.link)) {
            const c = READER_CACHE.get(art.link);
            if (c && Array.isArray(c.paras) && c.paras.length) {
                const relevantParas = filterRelevantParagraphs(c.paras, art);
                const cleaned = [];
                relevantParas.forEach(fp => splitIntoSentences(fp, true).forEach(sub => cleaned.push(sub)));
                const noTitle = removeTitleRepetitions(cleaned, art);
                const finalSents = noTitle.length ? noTitle : cleaned;
                if (finalSents.length > 0) {
                    mountAndStartScrolling(
                        finalSents,
                        'ok',
                        `✅ Tam metin (${finalSents.length} cümle • 2 kez akar)`
                    );
                    prefetchUpcomingCardInBackground(myToken);
                    return;
                }
            }
        }

        if (autoAdvanceEnabled) {
            clearTimeout(autoAdvanceTimer);
            autoAdvanceTimer = setTimeout(() => {
                if (myToken !== tickerToken || overlayRoot() || aiOpen()) return;
                advanceToNextCard();
            }, 28000);
        }

        // 450ms zapping koruması: kullanıcı kanalları hızlıca geçiyorsa boşuna API harcamaz
        clearTimeout(currentFetchStartTimer);
        currentFetchStartTimer = setTimeout(() => {
            if (myToken !== tickerToken || overlayRoot() || aiOpen()) return;

            if (summaryMode) {
                getCardMiniAISummaryData(art).then(aiData => {
                    if (myToken !== tickerToken) return;
                    if (aiData && aiData.sents && aiData.sents.length) {
                        mountAndStartScrolling(
                            aiData.sents,
                            'ai',
                            `✨ ${aiData.keyInfo} (${aiData.sents.length} cümle • 2 kez akar)`
                        );
                        prefetchUpcomingCardInBackground(myToken);
                        return;
                    }
                    waitingBox.innerHTML = `<span>⚠️ Bu haberin özeti alınamadı</span>`;
                    badge.className = 'tv-fetch-badge warn';
                    badge.textContent = '⚠️ Özet alınamadı';
                    prefetchUpcomingCardInBackground(myToken);
                });
            } else {
                fetchArticleParasForPeek(art).then(res => {
                    if (myToken !== tickerToken) return;
                    if (res.ok && res.paras.length) {
                        const relevantParas = filterRelevantParagraphs(res.paras, art);
                        const cleaned = [];
                        relevantParas.forEach(fp => splitIntoSentences(fp, true).forEach(sub => cleaned.push(sub)));
                        const noTitle = removeTitleRepetitions(cleaned, art);
                        const finalSents = noTitle.length ? noTitle : cleaned;
                        if (finalSents.length > 0) {
                            mountAndStartScrolling(
                                finalSents,
                                'ok',
                                `✅ Tam metin (${finalSents.length} cümle • 2 kez akar)`
                            );
                            prefetchUpcomingCardInBackground(myToken);
                            return;
                        }
                    }
                    waitingBox.innerHTML = `<span>⚠️ Haber metni kaynağından çekilemedi (OK ile açabilirsiniz)</span>`;
                    badge.className = 'tv-fetch-badge warn';
                    badge.textContent = '⚠️ Metin çekilemedi';
                    prefetchUpcomingCardInBackground(myToken);
                }).catch(() => {
                    if (myToken !== tickerToken) return;
                    waitingBox.innerHTML = `<span>⚠️ Haber metni kaynağından çekilemedi</span>`;
                    badge.className = 'tv-fetch-badge warn';
                    badge.textContent = '⚠️ Metin çekilemedi';
                    prefetchUpcomingCardInBackground(myToken);
                });
            }
        }, 450);
    }

    function ensureCardTickerPresent() {
        if (overlayRoot() || aiOpen()) return;
        const w = document.querySelector('#newsGrid .swipe-wrapper.tv-current');
        if (w && !w.querySelector('.tv-card-reader')) {
            attachCardLiveTickerAndReader(true);
        }
    }

    // ---------- Tek kart yönetimi ----------
    let curLink = null, lastUpTap = 0;

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
        const l = cards(); if (!l.length) return;
        if (i >= l.length) i = 0;
        if (i < 0) i = 0;
        const target = l[i];
        if (!target) return;

        if (target.classList.contains('tv-current') && curLink === target.dataset.link && target.querySelector('.tv-card-reader')) {
            refreshCount();
            return;
        }

        const prevLink = curLink;
        stopCardTicker();

        const prevActive = document.querySelector('#newsGrid .swipe-wrapper.tv-current');
        if (prevActive && prevActive !== target) prevActive.classList.remove('tv-current');

        target.classList.add('tv-current');
        curLink = target.dataset.link;

        if (prevLink && prevLink !== curLink) {
            markLinkAsRead(prevLink);
        }

        refreshCount();
        attachCardLiveTickerAndReader(true);
        if (allowMore && i >= l.length - 3) loadMore();
    }

    function ensureCurrent() {
        const grid = $('newsGrid');
        if (!grid) return;
        deduplicateDomCardsLight();
        const l = cards();
        if (!l.length) return;

        const activeNow = document.querySelector('#newsGrid .swipe-wrapper.tv-current');
        if (activeNow && (!curLink || activeNow.dataset.link === curLink)) {
            curLink = activeNow.dataset.link;
            refreshCount();
            ensureCardTickerPresent();
            return;
        }

        if (curLink) {
            const match = l.find(c => c.dataset.link === curLink);
            if (match) {
                document.querySelectorAll('#newsGrid .swipe-wrapper.tv-current').forEach(c => { if (c !== match) c.classList.remove('tv-current'); });
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

        if (ai) {
            if (typeof closeAIResult === 'function') closeAIResult();
            else { const a = $('aiInlineResult'); if (a) { a.classList.remove('show'); a.style.display = 'none'; } }

            if (!directAiEntry && nm && nm.style.display === 'flex') {
                try { history.pushState({ tvGuard: 1 }, ''); } catch (e) {}
                setTimeout(sync, 20);
                return true;
            }
            directAiEntry = false;
            if (nm) {
                nm.style.display = 'none';
                const idx = openStack.lastIndexOf('newsModal');
                if (idx !== -1) openStack.splice(idx, 1);
            }
            try { history.pushState({ tvGuard: 1 }, ''); } catch (e) {}
            setTimeout(() => { sync(); attachCardLiveTickerAndReader(true); }, 20);
            return true;
        }

        const top = overlayRoot();
        if (!top) {
            setTimeout(() => { sync(); attachCardLiveTickerAndReader(true); }, 20);
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
        setTimeout(() => { sync(); attachCardLiveTickerAndReader(true); }, 20);
        return true;
    }

    window.addEventListener('popstate', (e) => {
        if (aiOpen() || overlayRoot()) {
            e.stopImmediatePropagation();
            closeTopmostOverlay(true);
        } else {
            const aiEl = $('aiInlineResult');
            if (aiEl) { aiEl.classList.remove('show'); aiEl.style.display = 'none'; }
            directAiEntry = false;
            setTimeout(() => { sync(); attachCardLiveTickerAndReader(true); }, 30);
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

    // ---------- Kalıcı Yazı ve İçerik Boyutu Yönetimi ----------
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
        setTimeout(() => { sync(); focusIn(w); }, 60);
    }

    // ---------- Ana Ekranda Haberi Açma ----------
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
        setTimeout(sync, 30);
    }

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

    // ---------- Kumanda Tuş Algılayıcı ----------
    let okDownAt = 0;
    let okUsedCombo = false;
    let okSingleTimer = null;
    let lastOkTapAt = 0;
    let feedOkTimer = null;
    let lastFeedOkAt = 0;

    function getDirectionFromEvent(e) {
        const k = e.key || '';
        const c = e.keyCode || e.which || 0;
        if (k === 'ArrowUp' || k === 'Up' || c === 38 || c === 19) return 'up';
        if (k === 'ArrowDown' || k === 'Down' || c === 40 || c === 20) return 'down';
        if (k === 'ArrowLeft' || k === 'Left' || c === 37 || c === 21) return 'left';
        if (k === 'ArrowRight' || k === 'Right' || c === 39 || c === 22) return 'right';
        return null;
    }

    function isOkEvent(e) {
        const k = e.key || '';
        const c = e.keyCode || e.which || 0;
        return k === 'Enter' || k === 'NumpadEnter' || k === ' ' || k === 'MediaPlayPause' || c === 13 || c === 23 || c === 66;
    }

    function isBackEvent(e) {
        const k = e.key || '';
        const c = e.keyCode || e.which || 0;
        return k === 'Escape' || k === 'GoBack' || k === 'BrowserBack' || k === 'Backspace' || c === 27 || c === 4;
    }

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
        const t = e.target, k = e.key || '';
        const inText = t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && !/^(checkbox|radio|button|submit)$/.test(t.type)));
        const dir = getDirectionFromEvent(e);
        const ov = overlayRoot();

        if (localStorage.getItem('tvRadioStation') && localStorage.getItem('tvRadioStation') !== 'off' && !isRadioPlaying()) {
            startOrSwitchRadio(localStorage.getItem('tvRadioStation'), false);
        }

        if (ov && ov.id === 'newsModal' && !inText) {
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
            if (inText && (dir === 'left' || dir === 'right')) return;
            e.preventDefault(); e.stopImmediatePropagation();
            if (!ov) {
                if (dir === 'down') showCard(curIndex() + 1, true);
                else if (dir === 'up') {
                    if (curIndex() > 0) showCard(curIndex() - 1, false);
                    else {
                        const now = Date.now();
                        if (now - lastUpTap < 2500) { lastUpTap = 0; curLink = null; if (typeof showToastGlobal === 'function') showToastGlobal('🔄 Yenileniyor...', 2000); try { fetchAllRSS(true); } catch (x) {} }
                        else { lastUpTap = now; if (typeof showToastGlobal === 'function') showToastGlobal('Yenilemek için ▲ tekrar basın', 2200); }
                    }
                }
                else if (dir === 'left') {
                    stopCardTicker();
                    ensureHistoryGuard();
                    if (typeof openModalSafe === 'function') openModalSafe('settingsModal');
                    setTimeout(sync, 30);
                }
                else if (dir === 'right') openPanel();
                return;
            }
            if (ov.id === 'newsModal') {
                if (aiOpen()) {
                    if (dir === 'up' || dir === 'down') scrollAI(dir);
                    return;
                }
                if (dir === 'up' || dir === 'down') scrollReader(dir);
                else if (dir === 'left') { const b = $('tabReader'); if (b) b.click(); setTimeout(() => window.tvApplyZoom(), 50); }
                else { const b = $('tabWeb'); if (b) b.click(); setTimeout(() => window.tvApplyZoom(), 200); }
                return;
            }
            if (!move(dir, ov) && (dir === 'up' || dir === 'down')) scrollOverlay(dir, ov);
            return;
        }

        if (isOkEvent(e)) {
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

        if (isBackEvent(e) && !inText) {
            if (aiOpen() || ov) {
                e.preventDefault(); e.stopImmediatePropagation();
                closeTopmostOverlay(false);
            }
        }
    }, true);

    document.addEventListener('keyup', (e) => {
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        const t = e.target;
        if (!isOkEvent(e)) return;
        const inText = t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && !/^(checkbox|radio|button|submit)$/.test(t.type)));
        const ov = overlayRoot();

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
            if (ov && ov.id !== 'newsModal' && ov.id !== 'controlsWrapper') setTimeout(() => focusIn(ov), 80);
            if (!ov) {
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

    function scheduleSync() {
        if (!raf) raf = requestAnimationFrame(sync);
    }

    function start() {
        document.body.classList.add('tv-mode');
        buildBar();
        buildClockBadge();
        window.tvApplyZoom();
        watchReaderFallbackAndAI();
        setTimeout(() => {
            injectTvSettings();
            if (localStorage.getItem('tvRadioStation') && localStorage.getItem('tvRadioStation') !== 'off') {
                startOrSwitchRadio(localStorage.getItem('tvRadioStation'), false);
            }
        }, 600);

        const grid = $('newsGrid');
        if (grid) {
            let gridDebounce = null;
            new MutationObserver(() => {
                clearTimeout(gridDebounce);
                gridDebounce = setTimeout(ensureCurrent, 40);
            }).observe(grid, { childList: true });
        }

        [...OVERLAYS, 'controlsWrapper', 'aiInlineResult'].forEach(id => {
            const el = $(id);
            if (el) new MutationObserver(scheduleSync).observe(el, { attributes: true, attributeFilter: ['style', 'class'] });
        });

        setTimeout(ensureCurrent, 300);
    }
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
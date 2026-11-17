// sondakika.js v1 — Tek tıkla "Son Dakika" + RSS'in eski haberi yeni tarihle tekrar atmasına karşı koruma
//
// Nasıl çalışır:
//  1) Her haberin bilinen en erken zamanı (fs) kalıcı bir kayıt defterinde tutulur (link + kaynak/başlık anahtarı).
//     Bir haberin yayın tarihi, bilinen en erken zamandan SONRA olamaz. Kaynak sonradan tarihi ileri alırsa
//     (restamp) haber "bilinen" sayılır, tarihi en erken zamana çekilir ve süre dışında kaldığı için Son Dakika'ya girmez.
//  2) Bir kaynağın tüm haberleri "şimdi" ya da aynı dakikaya damgalıysa tarihine güvenilmez:
//     ilk taramadaki haberleri Son Dakika'ya alınmaz; sonradan gelen YENİ linkler ilk görülme anıyla sıralanır.
//  3) Son Dakika görünümü: son N saat, en yeni üstte, benzer başlıklar tek habere indirilir (+N kaynak).
//
// Mevcut akışa dokunmaz: yalnızca sdAssess (api.js/ui.js'ten çağrılır) ve sdApply (handleSearch'ten çağrılır) kullanılır.
(function () {
    'use strict';

    const REG_KEY = 'sdRegistry_v1', BASE_KEY = 'sdFeedBase_v1', WIN_KEY = 'sdWindowMin';
    const REG_MAX = 6000, REG_TTL_MIN = 5 * 24 * 60;       // kayıt defteri: en çok 6000 anahtar, 5 gün
    const WINDOWS = [60, 180, 360];                          // dakika
    const SKEW_MS = 10 * 60000;                              // saat farkı / gecikme toleransı

    window.sdActive = false;

    // ---------- Küçük yardımcılar ----------
    function hash(s) {
        let h1 = 5381, h2 = 52711;
        for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = ((h1 << 5) + h1 + c) | 0; h2 = ((h2 * 33) ^ c) | 0; }
        return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36);
    }
    function jget(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
    function winMin() { const v = parseInt(localStorage.getItem(WIN_KEY) || '180', 10); return WINDOWS.includes(v) ? v : 180; }

    // ---------- Kalıcı kayıt defteri ----------
    let REG = null, BASE = null, saveTimer = null;
    function load() { if (!REG) { REG = jget(REG_KEY, {}); BASE = jget(BASE_KEY, {}); } }
    function scheduleSave() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            try {
                const nowMin = Math.floor(Date.now() / 60000);
                let keys = Object.keys(REG);
                keys.forEach(k => { if (nowMin - Math.abs(REG[k]) > REG_TTL_MIN) delete REG[k]; });
                keys = Object.keys(REG);
                if (keys.length > REG_MAX) {
                    keys.sort((a, b) => Math.abs(REG[a]) - Math.abs(REG[b])).slice(0, keys.length - REG_MAX).forEach(k => delete REG[k]);
                }
                localStorage.setItem(REG_KEY, JSON.stringify(REG));
                localStorage.setItem(BASE_KEY, JSON.stringify(BASE));
            } catch (e) { /* kota doluysa sessizce geç */ }
        }, 600);
    }

    // ---------- Kaynak başına değerlendirme (api.js ve ui.js çağırır) ----------
    window.sdAssess = function (feed, arts) {
        try {
            if (!arts || !arts.length) return arts;
            load();
            const now = Date.now(), nowMin = Math.floor(now / 60000);
            const firstRun = !BASE[feed.name];
            if (firstRun) BASE[feed.name] = nowMin;

            // Tarihine güvenilmeyen kaynak: haberlerin çoğu "az önce" ya da hepsi aynı dakikaya damgalı
            let suspect = false;
            if (arts.length >= 6) {
                const justNow = arts.filter(a => now - a.timestamp < 10 * 60000).length;
                const perMin = {}; let bunch = 0;
                arts.forEach(a => { const m = Math.floor(a.timestamp / 60000); perMin[m] = (perMin[m] || 0) + 1; if (perMin[m] > bunch) bunch = perMin[m]; });
                suspect = justNow / arts.length >= 0.6 || bunch / arts.length >= 0.5;
            }

            arts.forEach(a => {
                const tkRaw = (typeof titleKey === 'function') ? titleKey(a) : '';
                const lk = 'l' + hash(normLink(a.link));
                const tk = tkRaw.length >= 20 ? 't' + hash((a.source || '') + '|' + tkRaw) : '';   // başlık anahtarı kaynağa özel
                // Kayıt değeri = bu haberin bilinen EN ERKEN zamanı (dakika); negatifse "Son Dakika dışı" işaretli
                const seenVals = [REG[lk], tk ? REG[tk] : undefined].filter(v => v != null);
                const known = seenVals.length > 0;
                const excluded = seenVals.some(v => v < 0) || (!known && suspect && firstRun);
                const mine = suspect ? nowMin : Math.floor(Math.min(a.timestamp, now) / 60000);   // güvenilmez kaynakta tarih yerine görülme anı
                const ft = known ? Math.min(mine, ...seenVals.map(Math.abs)) : mine;
                REG[lk] = excluded ? -ft : ft; if (tk) REG[tk] = excluded ? -ft : ft;

                a.fs = ft;
                // Yayın tarihi bilinen en erken zamandan sonra olamaz: ileri alınmış (restamp) tarihi geri çek
                if (known && a.timestamp > ft * 60000 + SKEW_MS) { a.timestamp = ft * 60000; a.date = new Date(a.timestamp); }
                a.bt = excluded ? null : (known || suspect) ? ft * 60000 : Math.min(a.timestamp, now);
            });
            scheduleSave();
        } catch (e) { /* hata olursa haberler olduğu gibi akar */ }
        return arts;
    };

    // ---------- Son Dakika filtresi ----------
    function btOf(a) { return a.bt === undefined ? a.timestamp : a.bt; }   // bt'siz eski kayıtlar: tarihe güven
    function eligible(a, now, winMs) {
        const bt = btOf(a);
        if (bt == null || !isFinite(bt)) return false;
        if (bt > now + 5 * 60000) return false;                              // gelecekteki tarih
        if (now - bt > winMs) return false;
        if (a.fs != null && now - a.fs * 60000 > winMs + 15 * 60000) return false;   // bunu çoktan görmüştük
        return true;
    }

    function tokens(a) {
        const t = (a.title || '').toLocaleLowerCase('tr').replace(/\s[-–|]\s[^-–|]{2,40}$/, '').replace(/[^\p{L}\p{N}\s]+/gu, ' ');
        const s = new Set();
        t.split(/\s+/).forEach(w => { if (w.length >= 4) s.add(w.slice(0, 5)); else if (/^\d{2,}$/.test(w)) s.add(w); });
        return s;
    }
    function similar(x, y) {
        let inter = 0; x.forEach(w => { if (y.has(w)) inter++; });
        const min = Math.min(x.size, y.size), union = x.size + y.size - inter;
        return (inter >= 3 && inter / min >= 0.6) || (inter >= 2 && union > 0 && inter / union >= 0.5);
    }

    // Aynı olayı anlatan haberleri tek karta indir: en erken yayınlayan kalır, diğerleri "+N kaynak" olur
    function cluster(list) {
        const asc = [...list].sort((x, y) => btOf(x) - btOf(y));
        const reps = [];
        asc.forEach(a => {
            const tk = tokens(a);
            const hit = reps.find(r => similar(r.tk, tk));
            if (hit) { if (a.source !== hit.art.source) hit.also.add(a.source); }
            else reps.push({ art: a, tk, also: new Set() });
        });
        return reps
            .map(r => r.also.size ? Object.assign({}, r.art, { _also: r.also.size }) : r.art)
            .sort((x, y) => btOf(y) - btOf(x));
    }

    // ---------- Metinler ----------
    const L = {
        TR: { btn: 'Son Dk', title: 'Son dakika haberleri', bar: n => `⚡ Son dakika · ${n} haber`, dup: n => `${n} tekrar elendi`, h: 'sa', empty: h => `Son ${h} saatte yeni haber yok. Biraz sonra tekrar bakın ⚡`, ago: m => m < 1 ? 'az önce' : m < 60 ? `${m} dk önce` : `${Math.floor(m / 60)} sa önce`, also: n => `+${n} kaynak` },
        EN: { btn: 'Live', title: 'Breaking news', bar: n => `⚡ Breaking · ${n} stories`, dup: n => `${n} repeats removed`, h: 'h', empty: h => `No new stories in the last ${h} hours. Check back soon ⚡`, ago: m => m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ago`, also: n => `+${n} sources` }
    };
    const BTN = { ES: 'Ahora', DE: 'Neu', FR: 'Direct', RU: 'Срочно', AR: 'عاجل', HI: 'ताज़ा' };
    function T() { const r = (typeof currentRegion !== 'undefined' && currentRegion) || 'EN'; const base = L[r] || L.EN; return r in BTN ? Object.assign({}, base, { btn: BTN[r] }) : base; }

    window.sdRelTime = function (a, fallback) {
        const bt = btOf(a); if (bt == null) return fallback;
        return T().ago(Math.max(0, Math.round((Date.now() - bt) / 60000)));
    };
    window.sdAlsoText = function (n) { return T().also(n); };
    window.sdEmptyText = function () { return T().empty(winMin() / 60); };

    // ---------- Üst bilgi çubuğu ----------
    let bar = null;
    function ensureBar() {
        if (bar) return bar;
        const grid = document.getElementById('newsGrid'); if (!grid || !grid.parentNode) return null;
        bar = document.createElement('div');
        bar.id = 'sdBar'; bar.className = 'sd-bar'; bar.style.display = 'none';
        grid.parentNode.insertBefore(bar, grid);
        return bar;
    }
    function renderBar(shown, removedDup) {
        const b = ensureBar(); if (!b) return;
        const t = T(), cur = winMin();
        b.innerHTML = `<div class="sd-bar-info"><b>${t.bar(shown)}</b>${removedDup > 0 ? `<span>${t.dup(removedDup)}</span>` : ''}</div>` +
            `<div class="sd-bar-win">${WINDOWS.map(m => `<button class="${m === cur ? 'on' : ''}" onclick="sdSetWindow(${m})">${m / 60}${t.h}</button>`).join('')}</div>`;
        b.style.display = window.sdActive ? 'flex' : 'none';
    }

    // handleSearch'ten çağrılır: süzülmüş listeyi Son Dakika kurallarından geçirir
    window.sdApply = function (list) {
        const now = Date.now(), winMs = winMin() * 60000;
        const el = list.filter(a => eligible(a, now, winMs));
        const out = cluster(el);
        renderBar(out.length, el.length - out.length);
        return out;
    };

    window.sdSetWindow = function (m) {
        try { localStorage.setItem(WIN_KEY, String(m)); } catch (e) {}
        if (typeof handleSearch === 'function') handleSearch();
    };

    function refreshLabels() {
        const t = T();
        const txt = document.getElementById('sdBtnTxt'), btn = document.getElementById('sdBtn');
        if (txt) txt.textContent = t.btn;
        if (btn) btn.title = t.title;
        if (window.sdActive && typeof handleSearch === 'function') handleSearch(true);
    }

    function setActive(on, silent) {
        window.sdActive = on;
        const btn = document.getElementById('sdBtn'); if (btn) btn.classList.toggle('active', on);
        if (on) {
            currentCategory = ''; isArchiveView = false;                       // kategori/arşiv Son Dakika'yı gizlemesin
            document.querySelectorAll('.cat-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
            const w = document.getElementById('controlsWrapper');
            if (w && !w.classList.contains('collapsed') && typeof toggleControls === 'function') toggleControls();
            window.scrollTo({ top: 0 });
            // Tek tık = en yeni haberler: son tarama bir dakikadan eskiyse arka planda yenile
            if (typeof fetchAllRSS === 'function' && !isFetchingRefresh && Date.now() - lastFetchAt > 60000) fetchAllRSS(true, true);
        } else if (bar) bar.style.display = 'none';
        if (!silent && typeof handleSearch === 'function') handleSearch();
    }
    window.sdToggle = function (e) { if (e) e.stopPropagation(); setActive(!window.sdActive); };
    window.sdSetActive = function (on, silent) { if (window.sdActive !== on) setActive(on, silent); };   // filterCategory çağırır

    // Dil değişince buton yazısı güncellensin
    if (typeof window.applyTranslations === 'function') {
        const orig = window.applyTranslations;
        window.applyTranslations = function () { const r = orig.apply(this, arguments); try { refreshLabels(); } catch (e) {} return r; };
    }
    try { refreshLabels(); } catch (e) {}
})();

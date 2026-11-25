/* kartfoto.js — Fotoğrafı olmayan (veya fotoğrafı bozuk/ikon boyutunda) haber kartlarına,
   haber başlığına (ve varsa özetine) göre ilgili bir fotoğraf bulup yerleştirir.
   - TV modunda çalışmaz (TV'nin kendi mekanizması var: tv.js).
   - Ayarlar'dan açılıp kapatılabilir (varsayılan: açık). Anahtar: localStorage.cardPhotoFind = 'on' | 'off'
   - Yalnızca ekrana yaklaşan kartlar için, aynı anda en fazla 3 arama yapılır (mobil veriyi ve pili korur).
   - Bulunamazsa kart eskisi gibi Scrollary amblemiyle kalır; alakasız "manzara" resmi koymaz. */
(function () {
    'use strict';
    if (window.__cardPhotoInit) return;
    window.__cardPhotoInit = true;

    const MAX_ACTIVE = 3;
    const CACHE = new Map();       // anahtar -> bulunan adres ('' = bulunamadı)
    const INFLIGHT = new Map();
    const QUEUE = [];
    const PENDING = new WeakMap(); // kart öğesi -> iş
    let active = 0;

    const STOP = new Set(['ancak', 'ayrıca', 'bunun', 'bunlar', 'fakat', 'ama', 'bugün', 'dün', 'yarın', 'haber', 'detaylar', 'bilgi', 'son', 'yeni', 'the', 'and', 'but', 'this', 'that', 'with', 'from', 'after', 'about']);

    function enabled() {
        try { return localStorage.getItem('cardPhotoFind') !== 'off'; } catch (e) { return true; }
    }

    // Başlıkta Türkçe harf varsa (veya bölge TR ise) 'haber', değilse 'news'
    function suffixWord(title) {
        if (/[çğıöşüİ]/i.test(String(title || ''))) return 'haber';
        return (typeof currentRegion !== 'undefined' && currentRegion && currentRegion !== 'TR') ? 'news' : 'haber';
    }

    function hashInt(s) {
        let h = 0; s = String(s || 'x');
        for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
        return Math.abs(h);
    }

    function cleanTitleOf(t) {
        try {
            if (typeof gnSplitTitle === 'function') {
                const r = gnSplitTitle(t);
                if (r && r.clean) return r.clean;
            }
        } catch (e) {}
        return String(t || '').replace(/\s+[-–—|]\s+[^-–—|]{2,40}$/, '').trim();
    }

    function toWords(s) {
        return String(s || '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/&[a-z#0-9]+;/gi, ' ')
            .replace(/https?:\/\/\S+/g, ' ')
            .replace(/["'“”‘’?!:;,.()\[\]|…]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2);
    }

    // Özetten, başlıkta geçmeyen özel isim gibi görünen (büyük harfle başlayan) en fazla 3 kelime
    function summaryExtras(desc, titleWords) {
        const have = new Set(titleWords.map(w => w.toLocaleLowerCase('tr')));
        const out = [];
        const ws = toWords(desc);
        for (let i = 1; i < ws.length && out.length < 3; i++) {   // ilk kelime cümle başı, atlanır
            const w = ws[i];
            if (w.length < 4 || !/^[A-ZÇĞİÖŞÜ]/.test(w)) continue;
            const lw = w.toLocaleLowerCase('tr');
            if (STOP.has(lw) || have.has(lw) || out.some(x => x.toLocaleLowerCase('tr') === lw)) continue;
            out.push(w);
        }
        return out;
    }

    function bingThumb(query, key, w, h, title) {
        const sub = (hashInt(key) % 4) + 1;
        return 'https://tse' + sub + '.mm.bing.net/th?q=' + encodeURIComponent(query + ' ' + suffixWord(title)) +
            '&w=' + w + '&h=' + h + '&c=7&rs=1&p=0';
    }

    function probe(url, timeoutMs, minW, minH) {
        return new Promise(resolve => {
            if (!url) { resolve(''); return; }
            let done = false;
            const finish = v => { if (!done) { done = true; resolve(v); } };
            const timer = setTimeout(() => finish(''), timeoutMs);
            const img = new Image();
            img.referrerPolicy = 'no-referrer';
            img.onload = () => { clearTimeout(timer); finish(img.naturalWidth >= minW && img.naturalHeight >= minH ? url : ''); };
            img.onerror = () => { clearTimeout(timer); finish(''); };
            img.src = url;
        });
    }

    // Aday sırası (hepsi doğrudan görsel adresi; proxy kullanılmaz, okuma modunun indirmelerini yavaşlatmaz):
    //   1) başlık + özetten özel isimler   2) yalnızca başlık   3) başlığın ilk 4 kelimesi
    async function findPhoto(art) {
        const key = art.link || art.title || '';
        const title = cleanTitleOf(art.title);
        const tw = toWords(title).slice(0, 7);
        const base = tw.join(' ');
        if (base.length < 5) return '';
        const extras = summaryExtras(art.description, tw);

        const queries = [];
        if (extras.length) queries.push(base + ' ' + extras.join(' '));
        queries.push(base);
        const short = tw.slice(0, 4).join(' ');
        if (tw.length > 4 && short.length >= 8) queries.push(short);

        for (const q of queries) {
            const ok = await probe(bingThumb(q, key, 800, 450, title), 4000, 200, 100);
            if (ok) return ok;
        }
        return '';
    }

    function applyPhoto(imgWrap, url) {
        if (!imgWrap || !url) return;
        imgWrap.querySelectorAll('img.fallback-logo').forEach(x => x.remove());
        let main = imgWrap.querySelector('img.main-img');
        if (!main) {
            main = document.createElement('img');
            main.className = 'main-img';
            imgWrap.appendChild(main);
        }
        main.removeAttribute('onerror');
        main.onerror = null;
        main.referrerPolicy = 'no-referrer';
        main.style.display = '';
        main.style.opacity = 0;
        main.onload = () => { main.style.opacity = 1; imgWrap.classList.remove('img-skeleton'); };
        main.src = url;
        imgWrap.removeAttribute('data-default-img');
        imgWrap.setAttribute('data-headline-photo', '1');
    }

    async function runJob(job) {
        if (!job.wrapper.isConnected) return;
        const key = job.art.link || job.art.title || '';
        let url = CACHE.get(key);
        if (url === undefined) {
            let p = INFLIGHT.get(key);
            if (!p) {
                p = findPhoto(job.art);
                INFLIGHT.set(key, p);
                p.then(() => INFLIGHT.delete(key), () => INFLIGHT.delete(key));
            }
            try { url = await p; } catch (e) { url = ''; }
            if (CACHE.size > 600) CACHE.clear();
            CACHE.set(key, url || '');
        }
        if (url && job.wrapper.isConnected) applyPhoto(job.imgWrap, url);
    }

    function pump() {
        while (active < MAX_ACTIVE && QUEUE.length) {
            const job = QUEUE.shift();
            active++;
            runJob(job).catch(() => {}).then(() => { active--; pump(); });
        }
    }

    function enqueue(job) { QUEUE.push(job); pump(); }

    const io = ('IntersectionObserver' in window) ? new IntersectionObserver(entries => {
        entries.forEach(en => {
            if (!en.isIntersecting) return;
            io.unobserve(en.target);
            const job = PENDING.get(en.target);
            PENDING.delete(en.target);
            if (job && enabled()) enqueue(job);
        });
    }, { rootMargin: '400px 0px' }) : null;

    function watch(job) {
        if (job.watching) return;
        job.watching = true;
        const key = job.art.link || job.art.title || '';
        const cached = CACHE.get(key);
        if (cached) { applyPhoto(job.imgWrap, cached); return; }
        if (cached === '') return;                      // daha önce arandı, bulunamadı
        if (!io) { enqueue(job); return; }
        PENDING.set(job.wrapper, job);
        io.observe(job.wrapper);
    }

    function looksLikePlaceholder(u) {
        return /favicon|1x1|pixel\.|spacer|blank\.(gif|png)|placeholder|no[-_]?image|default[-_]?(image|img|thumb)/i.test(String(u || ''));
    }

    // ui.js her kartı oluşturduktan sonra çağırır
    window.cardPhotoHook = function (wrapper, art) {
        try {
            if (window.IS_TV || !enabled() || !wrapper || !art) return;
            const imgWrap = wrapper.querySelector('.card-img-wrapper');
            if (!imgWrap) return;
            const job = { wrapper, art, imgWrap, watching: false };
            const main = imgWrap.querySelector('img.main-img');
            if (!main || !art.image || looksLikePlaceholder(art.image)) { watch(job); return; }
            main.addEventListener('error', () => watch(job), { once: true });
            main.addEventListener('load', () => {
                if (main.naturalWidth < 140 || main.naturalHeight < 80) watch(job);   // Google Haberler ikonu gibi küçük görseller
            }, { once: true });
        } catch (e) {}
    };

    function refreshButtons() {
        const on = enabled();
        document.querySelectorAll('#cardPhotoBtns .vm-btn').forEach(el => el.classList.toggle('active', (el.dataset.mode === 'on') === on));
    }

    // Ayarlar'daki Açık/Kapalı düğmeleri
    window.setCardPhotoFind = function (mode) {
        try { localStorage.setItem('cardPhotoFind', mode === 'off' ? 'off' : 'on'); } catch (e) {}
        refreshButtons();
        if (mode === 'off') {
            QUEUE.length = 0;
            if (typeof showToastGlobal === 'function') showToastGlobal('🖼️ Fotoğraf arama kapalı', 1500);
            return;
        }
        if (typeof showToastGlobal === 'function') showToastGlobal('🖼️ Fotoğrafı olmayan haberlere görsel aranacak', 1800);
        // Ekrandaki fotoğrafsız kartları hemen tara
        try {
            const list = (typeof filteredArticles !== 'undefined' && filteredArticles) || [];
            document.querySelectorAll('#newsGrid .swipe-wrapper').forEach(w => {
                const imgWrap = w.querySelector('.card-img-wrapper');
                if (!imgWrap || imgWrap.getAttribute('data-default-img') !== 'true') return;
                const art = list.find(a => a.link === w.dataset.link);
                if (art) window.cardPhotoHook(w, art);
            });
        } catch (e) {}
    };

    refreshButtons();
})();

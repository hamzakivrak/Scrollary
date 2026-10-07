// ui.js
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
        .then(registration => { console.log('ServiceWorker başarıyla kaydedildi:', registration.scope); })
        .catch(err => { console.log('ServiceWorker kaydı başarısız oldu:', err); });
    });
}

const ptrEl = document.getElementById('pullToRefresh');
const ptrIcon = document.getElementById('ptrIcon');
const ptrText = document.getElementById('ptrText');

function detectUserRegion() {
    const savedRegion = localStorage.getItem('scrollaryRegion'); 
    if (savedRegion) return savedRegion;
    const shortLang = (navigator.language || navigator.userLanguage).substring(0, 2).toUpperCase();
    return ['TR', 'EN', 'ES', 'DE', 'FR', 'RU', 'AR', 'HI'].includes(shortLang) ? shortLang : 'EN';
}

window.onload = () => {
    currentRegion = detectUserRegion(); 
    document.getElementById('regionSelect').value = currentRegion;
    applyTranslations(currentRegion, true); 
    loadCustomFeeds(); 
    changeTheme(currentTheme);
    setGridSize(currentLayout, null, true);

    const cached = JSON.parse(localStorage.getItem('savedNewsArticles')) || [];
    if(cached.length > 0) {
        allArticles = interlaceArticles(cached);
        handleSearch(true); 
        fetchAllRSS(true, true); 
    } else {
        fetchAllRSS(false);
    }
  loadGroqKeys(); 
};

function openModalSafe(modalId) {
    document.getElementById(modalId).style.display = 'flex';
    document.body.style.overflow = 'hidden';
    history.pushState({ modal: modalId }, '');
}

window.addEventListener('popstate', (e) => {
    document.getElementById('newsModal').style.display = 'none';
    document.getElementById('settingsModal').style.display = 'none';
    document.getElementById('sourceFilterModal').style.display = 'none';
    document.getElementById('guideModal').style.display = 'none';
    document.getElementById('voiceModal').style.display = 'none';

    // EKSİK OLAN HAYATİ TEMİZLİK (Geri tuşuna basınca sesin ve arka plan videolarının susması için)
    window.speechSynthesis.cancel();
    
    const aiModal = document.getElementById('aiInlineResult');
    if(aiModal) aiModal.classList.remove('show');

    const oldIframe = document.getElementById('modalIframe');
    if(oldIframe) {
        const newIframe = document.createElement('iframe');
        newIframe.id = 'modalIframe';
        newIframe.className = 'modal-iframe';
        newIframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups');
        oldIframe.parentNode.replaceChild(newIframe, oldIframe);
    }

    const wrapper = document.getElementById('controlsWrapper');
    if (wrapper && !wrapper.classList.contains('collapsed')) {
        wrapper.classList.add('collapsed');
        document.getElementById('toggleIcon').innerText = '▼';
    }

    document.body.style.overflow = 'auto';
});

function closeModalSafe(modalId) {
    // 1. ŞARTSIZ ŞURTSUZ ÖNCE EKRANI KAPAT VE TEMİZLİĞİ YAP
    document.getElementById(modalId).style.display = 'none';
    document.body.style.overflow = 'auto';

    if(modalId === 'newsModal') {
        window.speechSynthesis.cancel();
        
        const aiModal = document.getElementById('aiInlineResult');
        if(aiModal) aiModal.classList.remove('show');

        const oldIframe = document.getElementById('modalIframe');
        if(oldIframe) {
            const newIframe = document.createElement('iframe');
            newIframe.id = 'modalIframe';
            newIframe.className = 'modal-iframe';
        newIframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups');
            oldIframe.parentNode.replaceChild(newIframe, oldIframe);
        }
    }

    // 2. EĞER TARAYICI GEÇMİŞİNDE BİZİM MODAL VARSA, ONU DA SİL 
    // (Iframe tuzağı yaşansa bile ekran zaten kapandığı için kullanıcı sorunu hissetmez)
    if(history.state && history.state.modal === modalId) {
        history.back();
    }
}

function applyTranslations(regionCode, skipRender = false) {
    const t = TRANSLATIONS[regionCode] || TRANSLATIONS['EN'];
    document.querySelectorAll('[data-i18n]').forEach(el => { 
        const key = el.getAttribute('data-i18n'); 
        if(t[key]) el.innerText = t[key]; 
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { 
        const key = el.getAttribute('data-i18n-ph'); 
        if(t[key]) el.placeholder = t[key]; 
    });
    const tWrap = document.getElementById('themeBtnsWrapper'); 
    tWrap.innerHTML = '';
    for (const [key, val] of Object.entries(t.themes)) { 
        tWrap.innerHTML += `<button class="view-btn theme-btn ${currentTheme === key ? 'active' : ''}" onclick="changeTheme('${key}', this)">${val}</button>`;
    }
    
    const lWrap = document.getElementById('layoutBtnsWrapper'); 
    lWrap.innerHTML = '';
    for (const [key, val] of Object.entries(t.layouts)) { 
        lWrap.innerHTML += `<button class="view-btn ${currentLayout === key ? 'active' : ''}" onclick="setGridSize('${key}', this, true)">${val}</button>`;
    }
    
    const cWrap = document.getElementById('catWrapper'); 
    cWrap.innerHTML = '';
    for (const [key, val] of Object.entries(t.cats)) { 
        const isArc = key === 'Arşiv';
        cWrap.innerHTML += `<button class="cat-btn ${isArc ? 'cat-btn-archive' : ''} ${currentCategory === key ? 'active' : ''}" onclick="filterCategory('${key}', this)">${val}</button>`;
    }
    
    if(initialFetchDone && !skipRender) renderNextBatch(true);
}

function switchGlobalRegion(regionCode) {
    currentRegion = regionCode; 
    document.getElementById('regionSelect').value = regionCode; 
    localStorage.setItem('scrollaryRegion', regionCode);
    applyTranslations(currentRegion, true); 
    localStorage.removeItem('activeSourcesList'); 
    loadCustomFeeds();
    allArticles = []; 
    document.getElementById('newsGrid').innerHTML = '';
    fetchAllRSS(false); 
}

function toggleControls(event) { 
    if(event) event.stopPropagation(); 
    const wrapper = document.getElementById('controlsWrapper'); 
    const icon = document.getElementById('toggleIcon');
    if (wrapper.classList.contains('collapsed')) { 
        wrapper.classList.remove('collapsed'); 
        if(icon) icon.innerText = '▲';
        history.pushState({ menu: 'controls' }, '');
    } else { 
        wrapper.classList.add('collapsed');
        if(icon) icon.innerText = '▼'; 
        if(history.state && history.state.menu === 'controls') history.back();
    } 
}

function changeTheme(themeName, btnElement) { 
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    if(btnElement) {
        btnElement.classList.add('active');
    } else { 
        Array.from(document.querySelectorAll('.theme-btn')).find(b => b.getAttribute('onclick').includes(themeName))?.classList.add('active');
    } 
    document.body.setAttribute('data-theme', themeName); 
    currentTheme = themeName; 
    localStorage.setItem('appTheme', themeName); 
    syncToCloud();
}

function toggleReadVisibility(show) { 
    showReadArticles = show; 
    document.getElementById('showReadMain').checked = show; 
    handleSearch();
}

function markAsRead(link, fromSwipe = false) { 
    if (!readArticles.includes(link)) { 
        readArticles.push(link);
        localStorage.setItem('readArticlesList', JSON.stringify(readArticles)); 
        syncToCloud(); 
        if (!fromSwipe && !showReadArticles) handleSearch(true); 
        else if (!fromSwipe) handleSearch(true);
    } 
}

function archiveArticleByLink(link) { 
    const art = allArticles.find(a => a.link === link) || archivedArticles.find(a => a.link === link); 
    if(!art) return; 
    if(!archivedArticles.find(a => a.link === link)) { 
        archivedArticles.push(art);
        localStorage.setItem('archivedArticlesList', JSON.stringify(archivedArticles)); 
        syncToCloud(); 
    } 
    showToastGlobal(TRANSLATIONS[currentRegion].swipeArchived); 
}

function setGridSize(size, btnElement, skipSave = false) { 
    document.querySelectorAll('.view-btn:not(.theme-btn)').forEach(b => b.classList.remove('active'));
    if(btnElement) {
        btnElement.classList.add('active');
    } else { 
        Array.from(document.querySelectorAll('.view-btn:not(.theme-btn)')).find(b => b.getAttribute('onclick').includes(size))?.classList.add('active');
    } 
    const grid = document.getElementById('newsGrid'); 
    grid.className = 'news-grid grid-' + size; 
    if (size === 'shorts') document.body.classList.add('shorts-mode');
    else document.body.classList.remove('shorts-mode'); 
    if(!skipSave) { 
        currentLayout = size; 
        localStorage.setItem('appLayout', size);
    } 
}

function filterCategory(catKey, btnElement) { 
    isArchiveView = (catKey === 'Arşiv' || catKey === 'Archive');
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active')); 
    if(btnElement) btnElement.classList.add('active'); 
    currentCategory = catKey; 
    handleSearch(); 
}

function openSourceFilterModal(event) { 
    if(event) event.stopPropagation(); 
    openModalSafe('sourceFilterModal');
    document.getElementById('popupSearchInput').value = document.getElementById('searchInput').value; 
    loadCustomFeeds(); 
}

function syncSearchInputs(val) { 
    document.getElementById('searchInput').value = val; 
    handleSearch();
}

function popupRefresh() { 
    document.getElementById('popupFilterList').innerHTML = '🔄...'; 
    fetchAllRSS(true); 
    setTimeout(() => { loadCustomFeeds(); }, 1500);
}

function loadCustomFeeds() {
    const builtin = GLOBAL_RSS_DB[currentRegion] || GLOBAL_RSS_DB['EN'];
    const saved = JSON.parse(localStorage.getItem('customRSSFeeds')) || [];
    const builtinUrls = new Set(builtin.map(f => normFeedUrl(f.url)));
    // Kullanıcının eklediği kaynaklar dil/bölge değişse de kaybolmaz
    RSS_FEEDS = [...builtin, ...saved.filter(f => f && f.url && !builtinUrls.has(normFeedUrl(f.url)))];
    const savedActive = JSON.parse(localStorage.getItem('activeSourcesList'));
    activeSources = (savedActive && savedActive.length > 0) ? savedActive : RSS_FEEDS.map(f => f.name);
    renderChips();
}

function saveActiveSources() { 
    localStorage.setItem('activeSourcesList', JSON.stringify(activeSources)); 
    syncToCloud();
}

// Aynı habere ait kopyaları yakalamak için başlık anahtarı (" - yayıncı" eki atılır)
function titleKey(a) {
    let t = (a.title || '').toLocaleLowerCase('tr');
    const m = t.match(/^(.*\S)\s[-–|]\s[^-–|]{2,40}$/);
    if (m) t = m[1];
    return t.replace(/[^\p{L}\p{N}]+/gu, '').slice(0, 70);
}

// Kronolojik sıra korunur ama aynı kaynak art arda dizilmez:
// son 3 öğede geçen kaynak, son 3 saat içindeki başka bir kaynak varsa ona yer verir.
function interlaceArticles(articles) {
    const sorted = [...articles].sort((x, y) => y.timestamp - x.timestamp);
    const keys = new Set();
    const rest = sorted.filter(a => {
        const k = titleKey(a);
        if (k.length < 20) return true;
        if (keys.has(k)) return false;
        keys.add(k); return true;
    });
    const COOL = 3, WINDOW = 3 * 3600 * 1000, LOOK = 40;
    const out = [];
    while (rest.length) {
        const recent = out.slice(-COOL);
        let idx = 0;
        if (recent.some(x => x.source === rest[0].source)) {
            const limit = rest[0].timestamp - WINDOW;
            for (let k = 1; k < rest.length && k < LOOK && rest[k].timestamp >= limit; k++) {
                if (!recent.some(x => x.source === rest[k].source)) { idx = k; break; }
            }
        }
        out.push(rest.splice(idx, 1)[0]);
    }
    return out;
}

// ===== Kaynak ekleme / silme (v3.2) =====
function normFeedUrl(u) {
    u = (u || '').trim();
    if (!u) return '';
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    try { return new URL(u).href.replace(/\/$/, ''); } catch (e) { return ''; }
}

function uniqueFeedName(name) {
    const base = ((name || '').trim().substring(0, 30)) || 'Yeni Kaynak';
    const taken = new Set(RSS_FEEDS.map(f => f.name));
    let n = base, i = 2;
    while (taken.has(n)) n = `${base} (${i++})`;
    return n;
}

function googleNewsFeedUrl(q) {
    let hl = currentRegion.toLowerCase(), gl = currentRegion.toUpperCase();
    if (currentRegion === 'EN') { hl = 'en-US'; gl = 'US'; }
    else if (currentRegion === 'ES') { hl = 'es'; gl = 'ES'; }
    return `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${hl}&gl=${gl}&ceid=${gl}:${hl.split('-')[0]}`;
}

function highlightFeedChip(name) {
    const fl = document.getElementById('filterList');
    if (fl) fl.classList.add('show');
    requestAnimationFrame(() => {
        document.querySelectorAll('.chip').forEach(c => {
            if (c.dataset.name !== name) return;
            c.classList.add('chip-new');
            c.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            setTimeout(() => c.classList.remove('chip-new'), 4000);
        });
    });
}

async function addDiscoveredRss(name, url) {
    const feedUrl = normFeedUrl(url);
    const result = document.getElementById('rssSearchResults');
    if (!feedUrl) { showToastGlobal('⚠️ Geçerli bir adres girin', 3000); return; }

    loadCustomFeeds(); // RSS_FEEDS güncel olsun
    const saved = JSON.parse(localStorage.getItem('customRSSFeeds')) || [];
    const exists = saved.find(f => normFeedUrl(f.url) === feedUrl) || RSS_FEEDS.find(f => normFeedUrl(f.url) === feedUrl);
    if (exists) {
        if (!activeSources.includes(exists.name)) { activeSources.push(exists.name); saveActiveSources(); }
        renderChips(); highlightFeedChip(exists.name); handleSearch(true);
        showToastGlobal('ℹ️ Bu kaynak zaten ekli, filtrede aktif edildi', 3000);
        return;
    }

    const feed = { id: 'custom_' + Date.now(), name: uniqueFeedName(name), url: feedUrl, isCustom: true, lang: currentRegion, cat: 'News' };
    saved.push(feed);
    localStorage.setItem('customRSSFeeds', JSON.stringify(saved));
    if (!activeSources.includes(feed.name)) activeSources.push(feed.name);
    saveActiveSources();          // yerel kayıt + bulut senkronu
    loadCustomFeeds();            // RSS_FEEDS ve filtre çipleri hemen yenilenir
    highlightFeedChip(feed.name);

    // Kategori filtresi yeni kaynağı gizlemesin
    currentCategory = '';
    document.querySelectorAll('.cat-btn').forEach((b, i) => b.classList.toggle('active', i === 0));

    if (result) result.innerHTML = '<span style="color:#10b981;font-weight:bold;margin-top:10px;display:block;">⏳ Haberler çekiliyor...</span>';
    const arts = await fetchFeedData(feed);
    if (arts.length) {
        const seen = new Set(allArticles.map(a => normLink(a.link)));
        let added = 0;
        arts.forEach(a => { const k = normLink(a.link); if (!seen.has(k)) { seen.add(k); allArticles.push(a); added++; } });
        allArticles = interlaceArticles(allArticles).slice(0, MAX_ARTICLES);
        saveToLocalMemory();
        handleSearch(true);
        if (result) result.innerHTML = '';
        showToastGlobal(`✅ ${feed.name} eklendi • ${added} haber`, 3500);
    } else {
        if (result) result.innerHTML = '<span style="color:#f59e0b;display:block;margin-top:10px;">⚠️ Kaynak kaydedildi ama şu an haber alınamadı. Adres bir RSS/Atom akışı olmayabilir; filtredeki ✕ ile silebilirsiniz.</span>';
        showToastGlobal(`⚠️ ${feed.name} eklendi, haber alınamadı`, 4500);
    }
}

async function findRssFromUrl() {
    const raw = document.getElementById('searchRssUrl').value.trim();
    if (!raw) return;
    const out = document.getElementById('rssSearchResults');
    out.innerHTML = '';
    const note = (txt, color) => { const d = document.createElement('div'); d.textContent = txt; d.style.cssText = `font-size:.85rem;margin-top:6px;color:${color || 'var(--text-muted)'};`; out.appendChild(d); return d; };
    const addBtn = (label, name, url) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'rss-result-btn'; b.textContent = '➕ ' + label;
        b.addEventListener('click', () => { b.disabled = true; addDiscoveredRss(name, url); });
        out.appendChild(b);
    };

    // Konu araması -> Google Haberler
    if (!(raw.includes('.') && !/\s/.test(raw))) {
        note('✅ Konu bulundu:', '#10b981');
        addBtn('Google Haberler: ' + raw, raw, googleNewsFeedUrl(raw));
        return;
    }

    const target = normFeedUrl(raw);
    if (!target) { note('⚠️ Geçerli bir adres girin', '#f59e0b'); return; }
    const host = new URL(target).hostname.replace(/^www\./, '');
    const status = note('⏳ Aranıyor...');

    const probe = async (u) => { const a = await fetchFeedData({ name: host, url: u, cat: '' }, { fast: true }); return a.length ? a.length : 0; };
    const found = new Map(); // url -> {label, count}

    // 1) Yapıştırılan adres zaten RSS mi?  2) Sayfadaki <link rel=alternate> akışları  (paralel)
    const directP = probe(target).then(n => { if (n) found.set(target, { label: `${host} (RSS doğrulandı • ${n} haber)`, n }); }).catch(() => {});
    const discoverP = (async () => {
        try {
            const html = await fetchHtmlRace(target);
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const links = [...doc.querySelectorAll('link[type*="rss"], link[type*="atom"]')];
            await Promise.all(links.slice(0, 5).map(async l => {
                let href = l.getAttribute('href'); if (!href) return;
                try { href = new URL(href, target).href; } catch (e) { return; }
                const n = await probe(href);
                if (n && !found.has(href)) found.set(href, { label: `${(l.getAttribute('title') || host).substring(0, 40)} (${n} haber)`, n });
            }));
        } catch (e) {}
    })();
    await Promise.all([directP, discoverP]);

    // 3) Hâlâ yoksa yaygın yolları dene
    if (!found.size) {
        const origin = new URL(target).origin;
        await Promise.all(['/feed', '/rss', '/rss.xml', '/feed.xml'].map(async p => {
            try { const n = await probe(origin + p); if (n) found.set(origin + p, { label: `${host}${p} (${n} haber)`, n }); } catch (e) {}
        }));
    }

    status.remove();
    if (found.size) {
        note('✅ Kaynak bulundu:', '#10b981');
        [...found.entries()].forEach(([u, v]) => addBtn(v.label, host, u));
    } else {
        note('⚠️ Sitede açık RSS bulunamadı.', '#f59e0b');
        note('✅ Alternatif:', '#10b981');
        addBtn('Haber Taraması (Google Haberler): ' + host, host, googleNewsFeedUrl('site:' + host));
    }
}

function addCustomRSSManual() {
    const nameInput = document.getElementById('newRssName');
    const urlInput = document.getElementById('newRssUrl');
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    if (!name || !url) { showToastGlobal('⚠️ Ad ve adres gerekli', 2500); return; }
    if (!normFeedUrl(url)) { showToastGlobal('⚠️ Geçerli bir adres girin', 2500); return; }
    addDiscoveredRss(name, url);
    nameInput.value = '';
    urlInput.value = '';
    document.getElementById('manualAddSection').classList.remove('show');
}

function deleteCustomRSS(id, event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    let saved = JSON.parse(localStorage.getItem('customRSSFeeds')) || [];
    const feed = saved.find(f => f.id === id);
    if (!feed) return;
    if (!confirm(`"${feed.name}" kaynağı silinsin mi?`)) return;
    saved = saved.filter(f => f.id !== id);
    localStorage.setItem('customRSSFeeds', JSON.stringify(saved));
    activeSources = activeSources.filter(s => s !== feed.name);
    saveActiveSources();
    allArticles = allArticles.filter(a => a.source !== feed.name);
    saveToLocalMemory();
    loadCustomFeeds();
    handleSearch(true);
}

function toggleSourceState(sourceName) { 
    if(activeSources.includes(sourceName)) { 
        activeSources = activeSources.filter(s => s !== sourceName);
    } else { 
        activeSources.push(sourceName); 
    } 
    saveActiveSources(); 
    renderChips(); 
    handleSearch();
}

function toggleAllSourcesState(event) { 
    event.stopPropagation(); 
    if(activeSources.length === RSS_FEEDS.length) { 
        activeSources = [];
    } else { 
        activeSources = RSS_FEEDS.map(f => f.name);
    } 
    saveActiveSources(); 
    renderChips(); 
    handleSearch(); 
}

function renderChips() {
    const ordered = [...RSS_FEEDS].sort((a, b) => (b.isCustom ? 1 : 0) - (a.isCustom ? 1 : 0)); // eklediklerin başta görünsün
    ['filterList', 'popupFilterList'].forEach(id => {
        const list = document.getElementById(id);
        if (!list) return;
        const frag = document.createDocumentFragment();
        ordered.forEach(feed => {
            const active = activeSources.includes(feed.name);
            const chip = document.createElement('label');
            chip.className = 'chip' + (active ? ' active' : '');
            chip.dataset.name = feed.name;
            const cb = document.createElement('input');
            cb.type = 'checkbox'; cb.style.display = 'none'; cb.checked = active;
            cb.addEventListener('change', () => toggleSourceState(feed.name));
            chip.appendChild(cb);
            chip.appendChild(document.createTextNode(' ' + feed.name + ' '));
            if (feed.isCustom) {
                const del = document.createElement('span');
                del.className = 'chip-delete'; del.textContent = '✕';
                del.addEventListener('click', e => deleteCustomRSS(feed.id, e));
                chip.appendChild(del);
            }
            frag.appendChild(chip);
        });
        list.replaceChildren(frag);
    });
}

function saveToLocalMemory() { 
    try {
        const toSave = allArticles.slice(0, 300); 
        localStorage.setItem('savedNewsArticles', JSON.stringify(toSave));
    } catch(e) {} 
}

function showToastGlobal(message, duration = 3000) {
    const toast = document.getElementById('toastNotification');
    document.getElementById('toastText').innerText = message;
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, duration);
}

function handleToastClick() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    handleSearch(true);
    document.getElementById('toastNotification').classList.remove('show');
}

function handleSearch(isSilentRefresh = false) {
    const searchText = (document.getElementById('searchInput').value.trim()).toLowerCase();
    const searchTerms = searchText.split(' ').filter(t => t.length > 0);
    let sourceArray = isArchiveView ? archivedArticles : allArticles;
    const readSet = new Set(readArticles);
    filteredArticles = sourceArray.filter(art => {
        if (!isArchiveView && !showReadArticles && readSet.has(art.link)) return false;
        const sourceMatch = isArchiveView ? true : activeSources.includes(art.source); 
        if(!sourceMatch) return false;
        if (currentCategory && currentCategory !== 'Arşiv' && currentCategory !== 'Archive') { 
            let hasCat = art.categories && art.categories.includes(currentCategory); 
            if (!hasCat) return false; 
        }
        const searchSpace = (art.title + " " + art.description + " " + (art.categories ? art.categories.join(' ') : "") + " " + art.source).toLowerCase();
        return searchTerms.length === 0 || searchTerms.every(term => searchSpace.includes(term)); 
    });
    if (!isSilentRefresh) { 
        document.getElementById('newsGrid').innerHTML = ''; 
        displayedCount = 0;
    } else { 
        document.getElementById('newsGrid').innerHTML = ''; 
        displayedCount = 0;
    }
    
    if (filteredArticles.length === 0) { 
        const t = TRANSLATIONS[currentRegion];
        const statusMsg = isFetchingRefresh ? t.waitingText : t.notFoundText;
        const icon = isFetchingRefresh ? '⏳' : '🔍';
        document.getElementById('newsGrid').innerHTML = `<div class="status-msg"><div style="font-size:3rem; margin-bottom:15px;">${icon}</div>${statusMsg}</div>`; 
        return; 
    }
    renderNextBatch();
}

function renderNextBatch(forceClear = false) {
    const grid = document.getElementById('newsGrid');
    if(forceClear) { 
        grid.innerHTML = ''; 
        displayedCount = 0;
    }
    const nextBatch = filteredArticles.slice(displayedCount, displayedCount + ITEMS_PER_PAGE); 
    const t = TRANSLATIONS[currentRegion];
    
    nextBatch.forEach((art, i) => {
        // REKLAM KODU BURADAN SİLİNDİ! Artık araya SCROLLARY AdMob kartı girmeyecek.

        const wrapper = document.createElement('div'); 
        wrapper.className = 'swipe-wrapper'; 
        wrapper.dataset.link = art.link;
        const isRead = readArticles.includes(art.link); 
        const isArchived = !!archivedArticles.find(a=> a.link === art.link);
        const dateObj = new Date(art.date); 
        const today = new Date();
        let dateStr = (dateObj.getDate() === today.getDate() && dateObj.getMonth() === today.getMonth()) ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : dateObj.toLocaleDateString([], { day: '2-digit', month: 'short' }) + " " + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        let catText = ""; 
        if(art.categories && art.categories.length > 0) { 
            let rawCat = art.categories[0];
            catText = t.cats[rawCat] || rawCat; 
        }

        let isDefault = !art.image;
        let safeImgUrl = art.image ? art.image.replace(/"/g, '&quot;') : '';
        let imgHtml = !isDefault ? `<img class="main-img" src="${safeImgUrl}" onload="this.style.opacity=1; this.parentElement.classList.remove('img-skeleton');" onerror="this.onerror=null; this.style.display='none'; this.parentElement.insertAdjacentHTML('beforeend', '<img src=\\'icon.png\\' class=\\'fallback-logo\\'>'); this.parentElement.setAttribute('data-default-img', 'true'); this.parentElement.classList.remove('img-skeleton');">` : '<img src="icon.png" class="fallback-logo">';

        wrapper.innerHTML = `
            <div class="swipe-bg swipe-bg-left">${isArchived ? t.swipeArchived : t.swipeArchive}</div><div class="swipe-bg swipe-bg-right">${t.swipeHide}</div>
            <div class="news-card ${isRead && !isArchiveView ? 'read-article' : ''}">
                <div class="card-img-wrapper ${isDefault ? '' : 'img-skeleton'}" ${isDefault ? 'data-default-img="true"' : ''}>
                    <div class="source-badge" onclick="openSourceFilterModal(event)">${escapeHtml(art.source)} ${catText ? '• '+escapeHtml(catText) : ''}</div>
                    ${imgHtml}
                </div>
                <div class="news-content"><h3>${escapeHtml(art.title)}</h3><div class="meta"><span>🕒 ${dateStr}</span>${/news\.google\.com/.test(art.link || '') ? '<span class="gn-hint"></span>' : ''}<span class="read-more">${t.readMore || 'Oku →'}</span></div></div>
            </div>
        `;

        const card = wrapper.querySelector('.news-card'); 
        // Dokunma anında indirmeyi başlat (kaydırmada iptal): haber açıldığında metin çoktan yolda olur
        let pfTimer = null;
        card.addEventListener('pointerdown', () => { pfTimer = setTimeout(() => window.prefetchArticle && prefetchArticle(art), 150); }, { passive: true });
        card.addEventListener('pointerup', () => { clearTimeout(pfTimer); window.prefetchArticle && prefetchArticle(art); }, { passive: true });
        ['pointermove', 'pointercancel'].forEach(ev => card.addEventListener(ev, () => clearTimeout(pfTimer), { passive: true }));
        let lastTap = 0, tapTimer = null;
        card.onclick = (e) => {
            if (e.target.tagName === 'A' || e.target.closest('.source-badge')) return;
            const single = getTapAction('single'), dbl = getTapAction('double');
            if (dbl === 'off') { runTapAction(art, single); return; }   // çift dokunuş kapalıysa bekleme yok
            const now = Date.now();
            if (now - lastTap < 350) { clearTimeout(tapTimer); lastTap = 0; runTapAction(art, dbl); return; }
            lastTap = now;
            tapTimer = setTimeout(() => { lastTap = 0; runTapAction(art, single); }, 300);
        };
        const gh = wrapper.querySelector('.gn-hint'); if (gh) gh.textContent = gnHintText();
        grid.appendChild(wrapper);
    }); 
    displayedCount += nextBatch.length;
}

// ===== Kart dokunuş ayarları =====
// reader   = okuma modu + yapay zeka cümle inceleme
// embedded = uygulama içinde (gömülü pencerede) orijinal site
// browser  = tarayıcıda orijinal site
// off      = (sadece çift dokunuş için) kapalı
// last     = pencerede en son seçilen mod (okuma / orijinal sade / temiz metin / etkileşimli)
const TAP_DEFAULTS = { single: 'last', double: 'browser' };
if (!localStorage.getItem('tapMigrated_v36')) {            // bir kerelik: tek dokunuş "son mod", çift dokunuş "tarayıcı"
    localStorage.setItem('tapAction_single', 'last'); localStorage.setItem('tapAction_double', 'browser'); localStorage.setItem('tapMigrated_v36', '1');
}
function getTapAction(kind) {
    const v = localStorage.getItem('tapAction_' + kind);
    return ['last', 'reader', 'embedded', 'browser', 'off'].includes(v) && !(kind === 'single' && v === 'off') ? v : TAP_DEFAULTS[kind];
}
// Google linkine dayanan kartlarda, ayarlardaki 'orijinal haber' (tarayıcıda aç) dokunuş sayısını ipucu olarak göster
function gnHintText() {
    if (getTapAction('double') === 'browser') return '👆👆 Çift dokun: orijinal haber';
    if (getTapAction('single') === 'browser') return '👆 Dokun: orijinal haber';
    return '';
}
function refreshGnHints() { const t = gnHintText(); document.querySelectorAll('.gn-hint').forEach(el => { el.textContent = t; }); }
window.setTapAction = function (kind, value) {
    localStorage.setItem('tapAction_' + kind, value);
    refreshGnHints();
    showToastGlobal('✔️ Kaydedildi', 1500);
};
function runTapAction(art, mode) {
    markAsRead(art.link);
    if (mode === 'browser') { window.open(realLinkOf(art), '_blank', 'noopener'); return; }
    const last = (window.getLastMode && getLastMode()) || 'reader';
    if (mode === 'last') mode = last === 'reader' ? 'reader' : 'embedded';
    openModal(art);                         // openModal ilk await'e kadar senkron: sekme hemen değiştirilebilir
    if (mode === 'embedded') {
        window.__frameNow = true;
        window.__frameMode = (window.getLastWebSub && getLastWebSub()) || 'web-sade';   // sade / temiz metin / etkileşimli
        switchTab('web');
    }
}
['single', 'double'].forEach(k => { const el = document.getElementById('tapPref_' + k); if (el) el.value = getTapAction(k); });

function switchTab(tab) { 
    document.getElementById('tabReader').classList.remove('active');
    document.getElementById('tabWeb').classList.remove('active'); 
    
    const aiStickyBar = document.getElementById('aiStickyBar');
    if(tab === 'reader') { 
        document.getElementById('tabReader').classList.add('active'); 
        document.getElementById('readerView').style.display = 'block'; 
        document.getElementById('iframeView').style.display = 'none';
        if (aiStickyBar) aiStickyBar.style.display = 'flex'; 
        document.getElementById('iframeView').style.height = '';
    } else { 
        document.getElementById('tabWeb').classList.add('active');
        document.getElementById('readerView').style.display = 'none'; 
        document.getElementById('iframeView').style.display = 'flex'; 
        // AI çubuğu orijinal sitede de görünür; iframe kalan yüksekliği doldurur
        if (aiStickyBar) { aiStickyBar.style.display = 'flex'; document.getElementById('iframeView').style.height = `calc(100% - ${aiStickyBar.offsetHeight || 0}px)`; }
        if (window.loadOriginalFrame) window.loadOriginalFrame();
    } 
}





// openModal ve haber metni çıkarma artık reader.js içinde

let tapCount = 0; 
let tapTimeout;
document.getElementById('modalBodyArea').addEventListener('click', (e) => { 
    if(e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return; 
    tapCount++; 
    clearTimeout(tapTimeout); 
    if(tapCount >= 3) { 
        closeModalSafe('newsModal'); 
        tapCount = 0; 
    } else { 
        tapTimeout = setTimeout(() => { tapCount = 0; }, 600); 
    } 
});

let touchStartX = 0; 
let touchStartY = 0; 
let pullDistance = 0; 
let swipingCard = null; 
let swipeCurrentX = 0;
let isVerticalScroll = false;

function handleDragStart(clientX, clientY, target) { 
    if (window.scrollY <= 5) touchStartY = clientY;
    const card = target.closest('.news-card'); 
    if(card) { 
        swipingCard = card; 
        touchStartX = clientX;
        touchStartY = clientY; 
        swipeCurrentX = 0; 
        isVerticalScroll = false; 
        card.classList.add('swiping');
    } 
}

function handleDragMove(clientX, clientY) {
    if (window.scrollY <= 5 && touchStartY > 0 && !swipingCard) { 
        pullDistance = clientY - touchStartY;
        if (pullDistance > 0 && pullDistance < 150) { 
            ptrEl.style.opacity = Math.min(pullDistance / 80, 1);
            ptrEl.style.transform = `translateX(-50%) translateY(${pullDistance * 0.5}px)`; 
            if (pullDistance > 80) { 
                ptrIcon.innerText = "🔄";
                ptrText.innerText = "..."; 
            } else { 
                ptrIcon.innerText = "⬇️";
                ptrText.innerText = TRANSLATIONS[currentRegion].pullToRefresh; 
            } 
        } 
    }
    if (swipingCard) { 
        const diffX = clientX - touchStartX;
        const diffY = clientY - touchStartY; 
        if(!isVerticalScroll && Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 10) { 
            isVerticalScroll = true;
            swipingCard.style.transform = `translateX(0px)`; 
            swipingCard.classList.remove('swiping'); 
            swipingCard = null; 
            return; 
        } 
        if(isVerticalScroll) return;
        swipeCurrentX = diffX; 
        swipingCard.style.transform = `translateX(${swipeCurrentX}px)`; 
    }
}

function handleDragEnd() {
    if (pullDistance > 80 && !isFetchingRefresh && !swipingCard) { 
        ptrIcon.innerText = "⏳";
        ptrText.innerText = "..."; 
        fetchAllRSS(true); 
    } else { 
        resetPullToRefresh();
    }
    if (swipingCard) { 
        const wrapper = swipingCard.closest('.swipe-wrapper');
        const link = wrapper.dataset.link; 
        swipingCard.classList.remove('swiping'); 
        if(swipeCurrentX > 100) { 
            swipingCard.style.transform = `translateX(100%)`;
            setTimeout(() => { archiveArticleByLink(link); wrapper.style.display = 'none'; }, 300); 
        } else if(swipeCurrentX < -100) { 
            swipingCard.style.transform = `translateX(-100%)`;
            setTimeout(() => { markAsRead(link, true); wrapper.style.display = 'none'; }, 300);
        } else { 
            swipingCard.style.transform = `translateX(0px)`;
        } 
        swipingCard = null; 
    }
}

document.addEventListener('touchstart', e => handleDragStart(e.touches[0].clientX, e.touches[0].clientY, e.target), {passive: true});
document.addEventListener('touchmove', e => handleDragMove(e.touches[0].clientX, e.touches[0].clientY), {passive: true}); 
document.addEventListener('touchend', e => handleDragEnd());

document.addEventListener('mousedown', e => { 
    const card = e.target.closest('.news-card'); 
    if(card) { 
        this.isDragging = true; 
        handleDragStart(e.clientX, e.clientY, e.target); 
    } 
});

document.addEventListener('mousemove', e => { 
    if (!this.isDragging) return; 
    handleDragMove(e.clientX, e.clientY); 
});

document.addEventListener('mouseup', e => { 
    if (!this.isDragging) return; 
    this.isDragging = false; 
    handleDragEnd(); 
});

function resetPullToRefresh() { 
    ptrEl.style.transform = `translateX(-50%) translateY(0)`; 
    ptrEl.style.opacity = 0; 
    touchStartY = 0; 
    pullDistance = 0;
    setTimeout(() => { 
        ptrIcon.innerText = "⬇️"; 
        ptrText.innerText = TRANSLATIONS[currentRegion].pullToRefresh; 
    }, 300);
}

window.addEventListener('scroll', () => { 
    const cWrap = document.getElementById('controlsWrapper');
    if (window.scrollY > 60) { 
        cWrap.classList.add('is-scrolled'); 
    } else { 
        cWrap.classList.remove('is-scrolled'); 
    }
    
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 400) { 
        if (displayedCount < filteredArticles.length) { 
            const spinner = document.getElementById('scrollSpinner'); 
            spinner.style.display = 'block'; 
            setTimeout(() => { renderNextBatch(); spinner.style.display = 'none'; }, 100); 
        } else if (filteredArticles.length > 0 && !isFetchingRefresh && Date.now() - lastFetchAt > 60000) { 
            fetchAllRSS(true); 
        } 
    } 
});

function copyPapara() {
    const paparaInput = document.getElementById("paparaInput");
    const numberOnly = paparaInput.value.replace("Papara No: ", "");
    navigator.clipboard.writeText(numberOnly).then(() => {
        showToastGlobal("Papara Numarası Kopyalandı! ✔️", 3000);
    });
}

function switchControlTab(tabId) {
    document.querySelectorAll('.c-tab').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.c-pane').forEach(pane => pane.classList.remove('active'));
    document.getElementById('tabBtn_' + tabId).classList.add('active');
    document.getElementById('pane_' + tabId).classList.add('active');
    setTimeout(() => {
        const wrapper = document.getElementById('controlsWrapper');
        const rect = wrapper.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > window.innerHeight) {
            wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
}

const layoutOrder = ['list', 'small', 'medium', 'large'];
document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if ((e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=')) || (!e.ctrlKey && (e.key === '+' || e.key === '-'))) {
        e.preventDefault(); 
        let direction = (e.key === '+' || e.key === '=') ? 1 : -1;
        let currentIndex = layoutOrder.indexOf(currentLayout);
        if (currentIndex === -1) currentIndex = 2; 

        let newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= layoutOrder.length) newIndex = layoutOrder.length - 1;

        if (newIndex !== currentIndex) {
            setGridSize(layoutOrder[newIndex], null);
            showToastGlobal("🔍 Görünüm: " + TRANSLATIONS[currentRegion].layouts[layoutOrder[newIndex]], 1500);
        }
    }

    if (!e.ctrlKey && e.key === 'ArrowDown') {
        e.preventDefault();
        window.scrollBy({ top: 300, left: 0, behavior: 'smooth' });
    }
    if (!e.ctrlKey && e.key === 'ArrowUp') {
        e.preventDefault();
        window.scrollBy({ top: -300, left: 0, behavior: 'smooth' });
    }
}, { passive: false });

document.getElementById('modalBodyArea').addEventListener('scroll', () => { hideTooltip(); }, {passive: true});

function hardRefreshApp() {
    if(confirm("Tüm uygulama önbelleği temizlenip güncel versiyon çekilecek. Emin misiniz?")) {
        localStorage.removeItem('savedNewsArticles');
        if ('caches' in window) {
            caches.keys().then(function(names) {
                for (let name of names) caches.delete(name);
            });
        }
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for(let registration of registrations) {
                    registration.unregister();
                }
                window.location.reload(true); 
            });
        } else {
            window.location.reload(true);
        }
    }
}


// 🌟 ORTAK YARDIMCI: Metni paragraflar halinde dinleme/çevirme simgeleriyle ekrana çizer.
// Hem extracted metin için hem de AI'ın bulduğu metin için kullanılır.
window.formatTextWithControls = function(paragraphsArray, containerElement) {
    containerElement.innerHTML = paragraphsArray.map((txt, idx) => {
        const words = txt.split(' ').map(w => `<span class="t-word" onclick="translateSingleWord(this, event)">${escapeHtml(w)}</span>`).join(' ');
        return `<div class="p-container"><p><span class="p-text" id="p_${idx}">${words}</span><span class="p-tools"><button type="button" class="btn-action-p" onclick="listenParagraph(${idx}, this)" title="Dinle" aria-label="Dinle">🔊</button><button type="button" class="btn-action-p" onclick="translateParagraph(${idx}, this)" title="Çevir" aria-label="Çevir">🌐</button></span></p><div class="translated-text" id="trans_${idx}"></div></div>`;
    }).join('');
};

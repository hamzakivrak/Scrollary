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
    RSS_FEEDS = [...(GLOBAL_RSS_DB[currentRegion] || GLOBAL_RSS_DB['EN'])];
    const savedFeeds = JSON.parse(localStorage.getItem('customRSSFeeds')) || [];
    const regionFeeds = savedFeeds.filter(f => (f.lang || 'EN') === currentRegion);
    RSS_FEEDS.push(...regionFeeds);
    const savedActive = JSON.parse(localStorage.getItem('activeSourcesList'));
    if (savedActive && savedActive.length > 0) { 
        activeSources = savedActive;
    } else { 
        activeSources = RSS_FEEDS.map(f => f.name);
    }
    renderChips();
}

function saveActiveSources() { 
    localStorage.setItem('activeSourcesList', JSON.stringify(activeSources)); 
    syncToCloud();
}

function interlaceArticles(articles) {
    const rest = [...articles].sort((x, y) => y.timestamp - x.timestamp);
    const out = [];
    while (rest.length) {
        const s1 = out.length > 0 ? out[out.length - 1].source : null;
        const s2 = out.length > 1 ? out[out.length - 2].source : null;
        let idx = 0;
        if (s1 && s1 === s2) {
            const alt = rest.findIndex((x, k) => k < 15 && x.source !== s1);
            if (alt > 0) idx = alt;
        }
        out.push(rest.splice(idx, 1)[0]);
    }
    return out;
}

async function addDiscoveredRss(name, url) { 
    const newFeed = { id: 'custom_' + Date.now(), name: name.substring(0, 30), url: url, isCustom: true, lang: currentRegion, cat: 'News' };
    const savedFeeds = JSON.parse(localStorage.getItem('customRSSFeeds')) || []; 
    if(!savedFeeds.find(f => f.url === url)) { 
        savedFeeds.push(newFeed);
        localStorage.setItem('customRSSFeeds', JSON.stringify(savedFeeds)); 
    }
    if(!activeSources.includes(newFeed.name)) { 
        activeSources.push(newFeed.name); 
        saveActiveSources();
    }
    
    document.getElementById('rssSearchResults').innerHTML = `<span style="color:#10b981; font-weight:bold; margin-top:10px; display:block;">⏳ Haberler listene düşüyor...</span>`;
    currentCategory = '';
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    const catBtns = document.querySelectorAll('.cat-btn');
    if(catBtns.length > 0) catBtns[0].classList.add('active');

    loadCustomFeeds(); 
    syncToCloud(); 
    document.getElementById('controlsWrapper').classList.add('collapsed'); 
    document.getElementById('toggleIcon').innerText = '▼';
    const arts = await fetchFeedData(newFeed);
    if(arts && arts.length > 0) {
        arts.forEach(a => { if(!allArticles.find(x => x.link === a.link)) allArticles.push(a); });
        allArticles = interlaceArticles(allArticles);
        saveToLocalMemory();
        handleSearch(true); 
    }
    document.getElementById('rssSearchResults').innerHTML = `<span style="color:#10b981; font-weight:bold; margin-top:10px; display:block;">${TRANSLATIONS[currentRegion].addedSuccess}</span>`;
}

async function findRssFromUrl() {
    const urlInput = document.getElementById('searchRssUrl').value.trim(); 
    if (!urlInput) return;
    const resultsDiv = document.getElementById('rssSearchResults');
    resultsDiv.innerHTML = '⏳ Aranıyor...';
    const isUrl = urlInput.includes('.') && !urlInput.includes(' ');
    
    let hl = currentRegion.toLowerCase(); 
    let gl = currentRegion.toUpperCase();
    if (currentRegion === 'EN') { hl = 'en-US'; gl = 'US'; }
    else if (currentRegion === 'ES') { hl = 'es'; gl = 'ES'; }
    
    const gNewsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(urlInput)}&hl=${hl}&gl=${gl}&ceid=${gl}:${hl.split('-')[0]}`;
    let cleanTitle = urlInput.replace(/'/g, "\\'");
    if (!isUrl) {
        resultsDiv.innerHTML = `<span style="color:#10b981; font-weight:bold;">✅ Konu bulundu:</span><br><button style="background:var(--surface-light); text-align:left; font-size:0.85rem; color:white; padding:10px; border-radius:5px; width:100%; margin-top:8px; cursor:pointer;" onclick="addDiscoveredRss('${cleanTitle}', '${gNewsUrl}')">➕ Google Haberler: ${urlInput}</button>`;
        return;
    }
    
    let targetUrl = urlInput.startsWith('http') ? urlInput : 'https://' + urlInput;
    try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
        const resH = await fetchWithTimeout(proxyUrl, 8000); 
        const dataH = await resH.json();
        if (dataH.contents) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(dataH.contents, 'text/html');
            const rssLinks = doc.querySelectorAll('link[type="application/rss+xml"], link[type="application/atom+xml"]');
            if (rssLinks.length > 0) {
                resultsDiv.innerHTML = '<span style="color:#10b981; font-weight:bold;">✅ Site kaynakları bulundu:</span>';
                rssLinks.forEach((link) => {
                    let href = link.getAttribute('href'); let title = link.getAttribute('title') || 'Ana RSS';
                    if(href.startsWith('/')) { href = new URL(targetUrl).origin + href; } 
                    else if (!href.startsWith('http')) { href = targetUrl.replace(/\/$/, '') + '/' + href; }
                    let linkTitle = title.replace(/'/g, "\\'");
                    resultsDiv.innerHTML += `<button style="background:var(--surface-light); text-align:left; font-size:0.85rem; color:white; padding:10px; border-radius:5px; width:100%; margin-top:8px; cursor:pointer;" onclick="addDiscoveredRss('${linkTitle}', '${href}')">➕ ${title}</button>`;
                });
                return;
            }
        }
        throw new Error("No RSS found on site");
    } catch (err) { 
        resultsDiv.innerHTML = `⚠️ Sitede açık RSS bulunamadı.<br><span style="color:#10b981; font-weight:bold;">✅ Alternatif (Google Haberler):</span><br><button style="background:var(--surface-light); text-align:left; font-size:0.85rem; color:white; padding:10px; border-radius:5px; width:100%; margin-top:8px; cursor:pointer;" onclick="addDiscoveredRss('${cleanTitle}', '${gNewsUrl}')">➕ Haber Taraması: ${urlInput}</button>`;
    }
}

function addCustomRSSManual() {
    const nameInput = document.getElementById('newRssName'); 
    const urlInput = document.getElementById('newRssUrl');
    const name = nameInput.value.trim(); 
    const url = urlInput.value.trim();
    if(!name || !url) return;
    addDiscoveredRss(name, url);
    nameInput.value = ''; 
    urlInput.value = '';
    document.getElementById('manualAddSection').classList.remove('show'); 
}

function deleteCustomRSS(id, event) { 
    event.stopPropagation(); 
    if(!confirm("Delete?")) return; 
    let savedFeeds = JSON.parse(localStorage.getItem('customRSSFeeds')) || [];
    savedFeeds = savedFeeds.filter(f => f.id !== id); 
    localStorage.setItem('customRSSFeeds', JSON.stringify(savedFeeds)); 
    syncToCloud(); 
    loadCustomFeeds(); 
    handleSearch();
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
    const listMain = document.getElementById('filterList');
    const listPopup = document.getElementById('popupFilterList');
    if(listMain) listMain.innerHTML = '';
    if(listPopup) listPopup.innerHTML = '';
    RSS_FEEDS.forEach(feed => {
        const isActive = activeSources.includes(feed.name); 
        let deleteBtn = feed.isCustom ? `<span class="chip-delete" onclick="deleteCustomRSS('${feed.id}', event)">✕</span>` : '';
        const htmlStr = `<input type="checkbox" style="display:none;" value="${feed.name}" ${isActive ? 'checked' : ''} onchange="toggleSourceState('${feed.name}')"> ${feed.name} ${deleteBtn}`;
        
        const labelMain = document.createElement('label'); 
        labelMain.className = `chip ${isActive ? 'active' : ''}`; 
        labelMain.innerHTML = htmlStr; 
        if(listMain) listMain.appendChild(labelMain);
        
        const labelPopup = document.createElement('label'); 
        labelPopup.className = `chip ${isActive ? 'active' : ''}`; 
        labelPopup.innerHTML = htmlStr; 
        if(listPopup) listPopup.appendChild(labelPopup);
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
                <div class="news-content"><h3>${escapeHtml(art.title)}</h3><div class="meta"><span>🕒 ${dateStr}</span><span class="read-more">${t.readMore || 'Oku →'}</span></div></div>
            </div>
        `;

        const card = wrapper.querySelector('.news-card'); 
        let clickTimer = null;
        card.onclick = (e) => { 
            if(e.target.tagName === 'A' || e.target.closest('.source-badge')) return; 
            if(e.detail === 1) { 
                clickTimer = setTimeout(() => { markAsRead(art.link); openModal(art); }, 250); 
            } else if(e.detail === 2) { 
                clearTimeout(clickTimer); markAsRead(art.link); window.open(art.link, '_blank'); 
            } 
        };
        grid.appendChild(wrapper);
    }); 
    displayedCount += nextBatch.length;
}

function switchTab(tab) { 
    document.getElementById('tabReader').classList.remove('active');
    document.getElementById('tabWeb').classList.remove('active'); 
    
    const aiStickyBar = document.getElementById('aiStickyBar');
    if(tab === 'reader') { 
        document.getElementById('tabReader').classList.add('active'); 
        document.getElementById('readerView').style.display = 'block'; 
        document.getElementById('iframeView').style.display = 'none';
        if (aiStickyBar) aiStickyBar.style.display = 'flex'; 
    } else { 
        document.getElementById('tabWeb').classList.add('active');
        document.getElementById('readerView').style.display = 'none'; 
        document.getElementById('iframeView').style.display = 'flex'; 
        if (aiStickyBar) aiStickyBar.style.display = 'none';
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
        const clickableWords = txt.split(' ').map(w => `<span class="t-word" onclick="translateSingleWord(this, event)">${escapeHtml(w)}</span>`).join(' ');
        return `<div class="p-container">
                    <p id="p_${idx}">${clickableWords}</p>
                    <div class="p-actions-row">
                        <button class="btn-action-p" onclick="listenParagraph(${idx}, this)" title="Dinle">🔊</button>
                        <button class="btn-action-p" onclick="translateParagraph(${idx}, this)" title="Çevir">🌐</button>
                    </div>
                    <div class="translated-text" id="trans_${idx}"></div>
                </div>`;
    }).join('');
}

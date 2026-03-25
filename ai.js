// ai.js
const ttsLangMap = { 'EN': 'en-US', 'TR': 'tr-TR', 'DE': 'de-DE', 'ES': 'es-ES', 'FR': 'fr-FR', 'RU': 'ru-RU', 'AR': 'ar-SA', 'HI': 'hi-IN' };
const VOICE_LANG_MAP = { 'TR': 'tr-TR', 'EN': 'en-US', 'DE': 'de-DE', 'ES': 'es-ES', 'FR': 'fr-FR', 'RU': 'ru-RU', 'AR': 'ar-SA', 'HI': 'hi-IN' };
const VOICE_HINTS = {
    'TR': "Örn: 'Almanca haberlere geç', 'Maden ara', 'Filtreleri temizle'",
    'EN': "Ex: 'Switch to German', 'Search for mining', 'Clear filters'",
    'DE': "Bsp: 'Zu Englisch wechseln', 'Suche nach Bergbau', 'Filter löschen'",
    'ES': "Ej: 'Cambiar a inglés', 'Buscar minería', 'Limpiar filtros'",
    'FR': "Ex: 'Passer en anglais', 'Chercher mine', 'Effacer les filtres'",
    'RU': "Пример: 'Перейти на английский', 'Искать шахту', 'Очистить фильтры'",
    'AR': "مثال: 'التبديل إلى الإنجليزية' ، 'البحث عن تعدين' ، 'مسح الفلاتر'",
    'HI': "उदाहरण: 'अंग्रेजी पर जाएं', 'माइनिंग खोजें', 'फ़िल्टर साफ़ करें'"
};

const INTENT_DICT = {
    'TR': {
        search: ['ara', 'bul', 'göster', 'hakkında', 'getir', 'nedir', 'haberleri'],
        clearSearch: ['arama kelimelerini sil', 'arama çubuğunu boşalt', 'arama çubuğunu temizle', 'aramayı temizle', 'aramayı sil'],
        clearFilters: ['filtreleri kaldır', 'filtreyi temizle', 'tüm filtreleri temizle', 'filtreleri sıfırla'],
        hideRead: ['okunanları gizle', 'okunan haberleri gizle', 'okuduklarımı gizle'],
        showRead: ['okunanları göster', 'okunan haberleri göster', 'okuduklarımı göster'],
        regions: { 'TR': ['türkçe', 'türkiye'], 'EN': ['ingilizce', 'amerikan', 'global'], 'DE': ['almanca', 'almanya'], 'ES': ['ispanyolca', 'ispanya'], 'FR': ['fransızca', 'fransa'], 'RU': ['rusça', 'rusya'], 'AR': ['arapça', 'arap'], 'HI': ['hintçe', 'hindistan'] }
    },
    'EN': {
        search: ['search', 'find', 'show', 'about', 'news'],
        clearSearch: ['clear search', 'empty search bar', 'clear bar', 'clear search bar'],
        clearFilters: ['clear filters', 'remove filters', 'reset filters'],
        hideRead: ['hide read', 'hide read news', 'hide read articles'],
        showRead: ['show read', 'show read news', 'show read articles'],
        regions: { 'TR': ['turkish', 'turkey'], 'EN': ['english', 'global', 'us'], 'DE': ['german', 'germany'], 'ES': ['spanish', 'spain'], 'FR': ['french', 'france'], 'RU': ['russian', 'russia'], 'AR': ['arabic', 'arab'], 'HI': ['hindi', 'india'] }
    },
    'DE': {
        search: ['suche', 'finde', 'zeige', 'über', 'nachrichten'],
        clearSearch: ['suche löschen', 'suchleiste leeren', 'suche zurücksetzen'],
        clearFilters: ['filter löschen', 'alle filter entfernen', 'filter zurücksetzen'],
        hideRead: ['gelesene verbergen', 'gelesene ausblenden'],
        showRead: ['gelesene zeigen', 'gelesene einblenden'],
        regions: { 'TR': ['türkisch', 'türkei'], 'EN': ['englisch', 'global'], 'DE': ['deutsch', 'deutschland'], 'ES': ['spanisch', 'spanien'], 'FR': ['französisch', 'frankreich'], 'RU': ['russisch', 'russland'], 'AR': ['arabisch'], 'HI': ['hindi'] }
    },
    'ES': {
        search: ['buscar', 'encuentra', 'mostrar', 'sobre', 'noticias'],
        clearSearch: ['limpiar búsqueda', 'vaciar barra de búsqueda', 'limpiar barra'],
        clearFilters: ['borrar filtros', 'quitar filtros', 'limpiar filtros'],
        hideRead: ['ocultar leídos', 'ocultar noticias leídas'],
        showRead: ['mostrar leídos', 'ver leídos'],
        regions: { 'TR': ['turco', 'turquía'], 'EN': ['inglés', 'global'], 'DE': ['alemán', 'alemania'], 'ES': ['español', 'españa'], 'FR': ['francés', 'francia'], 'RU': ['ruso', 'rusia'], 'AR': ['árabe'], 'HI': ['hindi'] }
    },
    'FR': {
        search: ['cherche', 'trouve', 'montre', 'sur', 'actualités'],
        clearSearch: ['effacer la recherche', 'vider la barre', 'effacer la barre'],
        clearFilters: ['effacer les filtres', 'supprimer les filtres', 'réinitialiser les filtres'],
        hideRead: ['masquer les lus', 'cacher les actualités lues'],
        showRead: ['afficher les lus', 'montrer les lus'],
        regions: { 'TR': ['turc', 'turquie'], 'EN': ['anglais', 'global'], 'DE': ['allemand', 'allemagne'], 'ES': ['espagnol', 'espagne'], 'FR': ['français', 'france'], 'RU': ['russe', 'russie'], 'AR': ['arabe'], 'HI': ['hindi'] }
    },
    'RU': {
        search: ['найди', 'ищи', 'покажи', 'про', 'новости'],
        clearSearch: ['очистить поиск', 'очистить строку поиска', 'сбросить поиск'],
        clearFilters: ['очистить фильтры', 'удалить фильтры', 'сбросить фильтры'],
        hideRead: ['скрыть прочитанное', 'скрыть прочитанные новости'],
        showRead: ['показать прочитанное', 'показать прочитанные новости'],
        regions: { 'TR': ['турецкий', 'турция'], 'EN': ['английский', 'глобальный'], 'DE': ['немецкий', 'германия'], 'ES': ['испанский', 'испания'], 'FR': ['французский', 'франция'], 'RU': ['русский', 'россия'], 'AR': ['арабский'], 'HI': ['хинди'] }
    },
    'AR': {
        search: ['ابحث', 'ابحث عن', 'اعرض', 'حول', 'أخبار'],
        clearSearch: ['مسح البحث', 'إفراغ شريط البحث', 'مسح شريط البحث'],
        clearFilters: ['مسح الفلاتر', 'إزالة الفلاتر', 'إعادة تعيين الفلاتر'],
        hideRead: ['إخفاء المقروء', 'إخفاء الأخبار المقروءة'],
        showRead: ['إظهار المقروء', 'عرض المقروء'],
        regions: { 'TR': ['تركي', 'تركيا'], 'EN': ['إنجليزي', 'عالمي'], 'DE': ['ألماني', 'ألمانيا'], 'ES': ['إسباني', 'إسبانيا'], 'FR': ['فرنسي', 'فرنسا'], 'RU': ['روسي', 'روسيا'], 'AR': ['عربي', 'عرب'], 'HI': ['هندي'] }
    },
    'HI': {
        search: ['खोज', 'खोजें', 'दिखाओ', 'के बारे में', 'समाचार'],
        clearSearch: ['खोज साफ़ करें', 'सर्च बार खाली करें', 'खोज मिटाएं'],
        clearFilters: ['फ़िल्टर साफ़ करें', 'फ़िल्टर हटाएं', 'फ़िल्टर रीसेट करें'],
        hideRead: ['पढ़े गए छिपाएं', 'पढ़ी गई खबरें छिपाएं'],
        showRead: ['पढ़े गए दिखाएं', 'पढ़ी गई खबरें दिखाएं'],
        regions: { 'TR': ['तुर्की'], 'EN': ['अंग्रेजी', 'वैश्विक'], 'DE': ['जर्मन'], 'ES': ['स्पेनिश'], 'FR': ['फ़्रेंच'], 'RU': ['रूसी'], 'AR': ['अरबी'], 'HI': ['हिंदी', 'भारत'] }
    }
};

function loadGroqKeys() {
    const keys = JSON.parse(localStorage.getItem('groqApiKeys')) || [];
    const listDiv = document.getElementById('groqKeysList');
    if (!listDiv) return;
    
    listDiv.innerHTML = '';
    if (keys.length === 0) {
        listDiv.innerHTML = '<div style="font-size: 0.85rem; color: #ef4444; padding: 10px; background: rgba(239, 68, 68, 0.1); border-radius: 8px; border: 1px dashed #ef4444;">⚠️ Henüz bir API anahtarı eklenmedi. Yapay zeka özellikleri çalışmayacaktır.</div>';
        return;
    }
    
    keys.forEach((key, index) => {
        const maskedKey = key.substring(0, 6) + '••••••••••••••••' + key.substring(key.length - 4);
        listDiv.innerHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 10px 15px; border-radius: 8px; border: 1px solid var(--surface-light);">
                <span style="font-family: monospace; color: #a7f3d0; font-size: 0.9rem;">${maskedKey}</span>
                <button onclick="removeGroqKey(${index})" style="background: rgba(239, 68, 68, 0.2); color: var(--danger); border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: bold; pointer-events: auto;">Sil</button>
            </div>
        `;
    });
}

function addGroqKey() {
    const input = document.getElementById('newGroqKeyInput');
    const newKey = input.value.trim();
    if (!newKey) return;
    
    if (!newKey.startsWith('gsk_')) {
        alert("Lütfen geçerli bir Groq API anahtarı girin (gsk_ ile başlamalıdır).");
        return;
    }

    const keys = JSON.parse(localStorage.getItem('groqApiKeys')) || [];
    if (!keys.includes(newKey)) {
        keys.push(newKey);
        localStorage.setItem('groqApiKeys', JSON.stringify(keys));
        input.value = '';
        loadGroqKeys();
        showToastGlobal("✅ Groq API Anahtarı eklendi!", 3000);
    } else {
        alert("Bu anahtar zaten ekli!");
    }
}

function removeGroqKey(index) {
    let keys = JSON.parse(localStorage.getItem('groqApiKeys')) || [];
    keys.splice(index, 1);
    localStorage.setItem('groqApiKeys', JSON.stringify(keys));
    loadGroqKeys();
}

async function handleAIRequest() {
    const inputEl = document.getElementById('aiInput');
    const query = inputEl.value.trim() || "Bu haberi özetle";
    const resultModal = document.getElementById('aiInlineResult');
    const resultContent = document.getElementById('aiResultContent');
    const btn = document.getElementById('aiSendBtn');
    const textContainer = document.getElementById('fullTextContainer');
    const paragraphs = Array.from(textContainer.querySelectorAll('p')).map(p => p.textContent.trim());
    let articleText = paragraphs.join(' ').substring(0, 6000);
    
    if(articleText.length < 50) {
        alert("Haber metni henüz yüklenmedi veya okunabilir metin bulunamadı.");
        return;
    }

    if (resultModal.classList.contains('show') && query === "Bu haberi özetle") {
        closeAIResult();
        return;
    }

    const apiKeys = JSON.parse(localStorage.getItem('groqApiKeys')) || [];
    if (apiKeys.length === 0) {
        alert("Yapay zeka asistanını kullanmak için geçerli bir Groq API anahtarı gerekiyor.");
        closeModalSafe('newsModal'); 
        setTimeout(() => { openModalSafe('settingsModal'); }, 400); 
        return;
    }

    resultModal.classList.add('show');
    resultContent.innerHTML = '<div style="text-align:center; padding: 40px;"><span style="font-size:4rem; display:inline-block; animation:pulse 1s infinite;">⏳</span><br><br><span style="color:var(--accent); font-weight:bold; font-size:1.2rem;">Yapay zeka yanıt hazırlıyor...</span></div>';
    btn.disabled = true;
    
    const systemPrompt = "Sen profesyonel ve analitik bir haber asistanısın. Kullanıcının sorusunu yanıtlarken okuma kolaylığı sağlamak zorundasın. Özeti kısa bir giriş cümlesiyle başlat ve ardından haberin en önemli detaylarını DÜZENLİ BİR LİSTE (<ul><li>...</li></ul>) formatında madde madde anlat. Önemli kelimeleri, kişi veya kurum isimlerini <span style='color:#e11d48'> veya <span style='color:#3b82f6'> ile renklendir. Asla Markdown (**, * gibi) KULLANMA. Haberde olmayan bir bilgiyi uydurma. Sadece şık ve temiz HTML çıktısı ver.";
    
    async function tryFetchWithKey(keyIndex) {
        if (keyIndex >= apiKeys.length) {
            resultContent.innerHTML = `<div style="color:var(--danger); text-align:center; padding: 20px;">⚠️ Ekli olan tüm API anahtarlarınızın kotası dolmuş veya bir bağlantı sorunu var. Lütfen yeni bir anahtar ekleyin.</div>`;
            btn.disabled = false;
            return;
        }

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKeys[keyIndex]}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile", 
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: `Haber Metni:\n${articleText}\n\nKullanıcı İsteği: ${query}` }
                    ],
                    temperature: 0.5,
                    max_tokens: 1024
                })
            });
            if (!response.ok) throw new Error("KeyFailed");

            const data = await response.json();
            let cleanHtml = data.choices[0].message.content.replace(/```html/g, '').replace(/```/g, '').trim();
            resultContent.innerHTML = cleanHtml;
            btn.disabled = false;

        } catch (err) {
            await tryFetchWithKey(keyIndex + 1);
        }
    }

    await tryFetchWithKey(0);
}

function closeAIResult() {
    const modal = document.getElementById('aiInlineResult');
    if(modal) modal.classList.remove('show');
}

async function findRssWithAI() {
    const topicInput = document.getElementById('aiRssTopic');
    const topic = topicInput.value.trim();
    const resultsDiv = document.getElementById('aiRssResults');

    if (!topic) {
        alert("Lütfen bir konu veya alan adı girin (Örn: Teknoloji, Kripto, Spor)");
        return;
    }

    const apiKeys = JSON.parse(localStorage.getItem('groqApiKeys')) || [];
    if (apiKeys.length === 0) {
        alert("Lütfen Ayarlar menüsünden geçerli bir Groq API anahtarı ekleyin.");
        return;
    }

    resultsDiv.innerHTML = '<div style="text-align:center; padding: 10px; color: var(--accent); animation: pulse 1s infinite;">⏳ Yapay zeka interneti tarıyor...</div>';
    const prompt = `Kullanıcı "${topic}" konularında haber okumak istiyor. Bana bu alanla ilgili popüler, güvenilir ve gerçekten çalışan 4 adet RSS akışı URL'si bul. Öncelikle Türkçe kaynaklar olsun, bulamazsan İngilizce ver. YANITINI SADECE VE SADECE JSON FORMATINDA DİZİ (ARRAY) OLARAK VER. Başka tek bir kelime bile yazma. Örnek Çıktı Formatı: [{"name": "DonanımHaber", "url": "https://www.donanimhaber.com/rss/tum"}, {"name": "Webtekno", "url": "https://www.webtekno.com/rss.xml"}]`;
    
    async function tryFetchRss(keyIndex) {
        if (keyIndex >= apiKeys.length) {
            resultsDiv.innerHTML = `<div style="color:var(--danger); font-size:0.85rem;">⚠️ API anahtarı hatası veya kota doldu.</div>`;
            return;
        }

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKeys[keyIndex]}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.3,
                    max_tokens: 500
                })
            });
            if (!response.ok) throw new Error("KeyFailed");

            const data = await response.json();
            let content = data.choices[0].message.content.trim();
            content = content.replace(/```json/g, '').replace(/```/g, '').trim();
            const rssList = JSON.parse(content);
            resultsDiv.innerHTML = '';

            if(rssList.length === 0) {
                resultsDiv.innerHTML = '<div style="color:#fca5a5; font-size:0.85rem;">Sonuç bulunamadı.</div>';
                return;
            }

            rssList.forEach(rss => {
                const btn = document.createElement('div');
                btn.style.cssText = "text-align: left; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; cursor: pointer; display: flex; flex-direction: column; transition: 0.3s;";
                btn.onmouseover = () => { if(btn.style.pointerEvents !== "none") btn.style.borderColor = "var(--primary)"; };
                btn.onmouseout = () => { if(btn.style.pointerEvents !== "none") btn.style.borderColor = "rgba(255,255,255,0.1)"; };
                
                btn.innerHTML = `
                    <div style="font-weight: bold; color: white; display:flex; justify-content:space-between; align-items:center;">
                        <span>${rss.name}</span>
                        <span class="ai-add-badge" style="font-size:0.75rem; background:var(--primary); padding:4px 10px; border-radius:6px; transition:0.3s; font-weight:bold;">Ekle</span>
                    </div>
                    <span style="font-size:0.75rem; color:var(--text-muted); margin-top:5px; word-break:break-all;">${rss.url}</span>
                `;
                
                btn.onclick = function() {
                    autoFillAndAddRss(rss.name, rss.url);
                    const badge = this.querySelector('.ai-add-badge');
                    if(badge) {
                        badge.innerText = "Eklendi ✅";
                        badge.style.background = "var(--success)"; 
                    }
                    this.style.borderColor = "var(--success)";
                    this.style.background = "rgba(16, 185, 129, 0.1)";
                    this.style.pointerEvents = "none"; 
                };
                resultsDiv.appendChild(btn);
            });

        } catch (err) {
            console.error("RSS getirme hatası:", err);
            await tryFetchRss(keyIndex + 1);
        }
    }

    await tryFetchRss(0);
}

function autoFillAndAddRss(name, url) {
    const manualSection = document.getElementById('manualAddSection');
    const nameInput = document.getElementById('newRssName');
    const urlInput = document.getElementById('newRssUrl');
    
    if (manualSection && nameInput && urlInput) {
        manualSection.classList.add('show');
        nameInput.value = name;
        urlInput.value = url;
        
        const saveBtn = manualSection.querySelector('button');
        if (saveBtn) {
            setTimeout(() => {
                saveBtn.click(); 
                setTimeout(() => {
                    nameInput.value = '';
                    urlInput.value = '';
                }, 400); 
            }, 100);
        } else {
            if (typeof addCustomRSSManual === "function") addCustomRSSManual();
        }
    } else {
        alert(`Kutucuklar bulunamadı. Lütfen URL'yi kendiniz kopyalayın: ${url}`);
    }
}

async function getTranslation(text, targetLang) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data[0].map(x => x[0]).join('');
    } catch(e) { 
        return "⚠️ Çeviri bağlantı hatası.";
    }
}

async function translateParagraph(idx, btnEl) {
    const pText = document.getElementById('p_' + idx).innerText;
    const transDiv = document.getElementById('trans_' + idx);
    const targetLang = document.getElementById('targetLangSelect').value;
    
    if(transDiv.style.display === 'block') {
        transDiv.style.display = 'none';
        btnEl.style.background = 'rgba(255,255,255,0.05)';
        btnEl.style.borderColor = 'rgba(255,255,255,0.1)';
    } else {
        btnEl.style.background = 'var(--accent)';
        btnEl.style.borderColor = 'var(--accent)';
        transDiv.innerText = '⏳ Yapay zeka çeviriyor...';
        transDiv.style.display = 'block';
        const translated = await getTranslation(pText, targetLang);
        transDiv.innerText = translated;
    }
}

function translateSingleWord(spanEl, event) {
    document.querySelectorAll('.t-word').forEach(el => el.classList.remove('highlighted'));
    spanEl.classList.add('highlighted');
    const cleanText = spanEl.innerText.replace(/[.,!?;:"()]/g, '');
    const rect = spanEl.getBoundingClientRect();
    showTooltip(cleanText, rect);
}

let tooltipTimeout;
document.addEventListener('selectionchange', () => {
    clearTimeout(tooltipTimeout);
    tooltipTimeout = setTimeout(() => {
        const selection = window.getSelection();
        const text = selection.toString().trim();
        
        if(text.length > 0) {
            document.querySelectorAll('.t-word').forEach(el => el.classList.remove('highlighted'));
        }

        if (text.length > 0 && selection.anchorNode) {
            let parent = selection.anchorNode.nodeType === 3 ? selection.anchorNode.parentNode : selection.anchorNode;
            if (parent && parent.closest && parent.closest('#readerView')) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                showTooltip(text, rect);
            }
        }
    }, 400); 
});

async function showTooltip(text, rect) {
    if(!text) return;
    const tooltip = document.getElementById('wordTooltip');
    const targetLang = document.getElementById('targetLangSelect').value;
    
    tooltip.innerText = '⏳...';
    tooltip.style.display = 'block';
    
    tooltip.style.position = 'fixed';
    tooltip.style.top = (rect.bottom + 10) + 'px'; 
    tooltip.style.left = (rect.left + (rect.width/2)) + 'px';

    const translated = await getTranslation(text, targetLang);
    const safeText = encodeURIComponent(text);

    tooltip.innerHTML = `
        <div onmousedown="listenSingleWord('${safeText}', event)" 
             ontouchstart="listenSingleWord('${safeText}', event)" 
             style="display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; width: 100%; height: 100%;">
            <span style="font-size: 1.05rem; pointer-events: none;">${translated}</span>
            <span style="background: rgba(255,255,255,0.2); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; pointer-events: none;">🔊</span>
        </div>
    `;
    setTimeout(() => {
        const tRect = tooltip.getBoundingClientRect();
        if (tRect.right > window.innerWidth) {
            tooltip.style.left = (window.innerWidth - (tRect.width / 2) - 15) + 'px';
        } else if (tRect.left < 0) {
            tooltip.style.left = ((tRect.width / 2) + 15) + 'px';
        }
    }, 50);
}

function listenSingleWord(encodedText, event) {
    if(event) {
        event.preventDefault();
        event.stopPropagation();
    }
    window.speechSynthesis.cancel(); 
    const text = decodeURIComponent(encodedText);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = typeof ttsLangMap !== 'undefined' && ttsLangMap[currentRegion] ? ttsLangMap[currentRegion] : 'en-US';
    window.speechSynthesis.speak(utterance);
}

function hideTooltip() {
    document.getElementById('wordTooltip').style.display = 'none';
}

function listenParagraph(idx, btn) {
    window.speechSynthesis.cancel(); 
    
    if(btn.classList.contains('playing')) {
        btn.classList.remove('playing');
        btn.innerText = '🔊';
        return;
    }
    
    document.querySelectorAll('.btn-action-p').forEach(b => {
        if(b.innerText === '⏹️' || b.classList.contains('playing')) {
            b.classList.remove('playing');
            b.innerText = '🔊';
        }
    });
    const text = document.getElementById('p_' + idx).innerText;
    if(!text) return;
    
    btn.classList.add('playing');
    btn.innerText = '⏹️';
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = ttsLangMap[currentRegion] || 'en-US';
    utterance.onend = () => {
        btn.classList.remove('playing');
        btn.innerText = '🔊';
    };
    utterance.onerror = () => {
        btn.classList.remove('playing');
        btn.innerText = '🔊';
    };
    window.speechSynthesis.speak(utterance);
}

function startVoiceAssistant() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SpeechRecognition) { 
        alert("Üzgünüm, tarayıcınız sesli asistanı desteklemiyor. (Chrome/Safari tavsiye edilir)"); 
        return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = VOICE_LANG_MAP[currentRegion] || 'tr-TR';
    recognition.continuous = true; 
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const fab = document.getElementById('micFab');
    const title = document.getElementById('voiceTitle');
    const inputEl = document.getElementById('voiceTextInput');
    const actionsDiv = document.getElementById('voiceActions');
    
    let stopTimer;
    recognition.onstart = function() {
        fab.classList.add('listening');
        title.innerText = "🎙️ Asistan Dinliyor...";
        inputEl.value = "";
        const hintText = VOICE_HINTS[currentRegion] || VOICE_HINTS['EN'];
        inputEl.placeholder = hintText;
        
        actionsDiv.innerHTML = '';
        openModalSafe('voiceModal');
        stopTimer = setTimeout(() => {
            recognition.stop();
            if(inputEl.value === "") {
                title.innerText = "💤 Dinleme sonlandırıldı.";
            }
        }, 20000);
    };

    recognition.onresult = function(event) {
        let finalTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
            finalTranscript += event.results[i][0].transcript + ' ';
        }
        
        inputEl.value = finalTranscript.trim();
        reparseVoiceCommand();
    };

    recognition.onerror = function(event) {
        title.innerText = "❌ Hata Oluştu";
        inputEl.placeholder = "Sizi duyamadım veya mikrofon izni verilmedi.";
        clearTimeout(stopTimer);
    };
    recognition.onend = function() {
        fab.classList.remove('listening');
        clearTimeout(stopTimer); 
    };

    recognition.start();
}

function reparseVoiceCommand() {
    const text = document.getElementById('voiceTextInput').value.trim();
    if(!text) return;

    const title = document.getElementById('voiceTitle');
    const actionsDiv = document.getElementById('voiceActions');
    title.innerText = "🤖 Anlaşılıyor...";
    const actions = parseVoiceCommand(text); 
    
    actionsDiv.innerHTML = '';
    if(actions.length > 0) {
        title.innerText = "💡 Şunları yapabilirim:";
        actions.forEach(act => {
            const btn = document.createElement('button');
            btn.className = 'voice-btn-action';
            btn.innerText = act.label;
            btn.onclick = () => { act.action(); closeModalSafe('voiceModal'); };
            actionsDiv.appendChild(btn);
        });
    }
}

function parseVoiceCommand(rawText) {
    const text = rawText.toLowerCase();
    const normalizedText = rawText.toLocaleLowerCase(currentRegion === 'TR' ? 'tr-TR' : 'en-US');
    const actions = [];
    let queryMatched = false;

    for (const lang of Object.keys(INTENT_DICT)) {
        const dict = INTENT_DICT[lang];
        if(dict.regions) {
            for (const [regionCode, keywords] of Object.entries(dict.regions)) {
                if (keywords.some(kw => text.includes(kw))) {
                    actions.push({
                        label: `🌍 ${regionCode} Bölgesine/Haberlerine Geç`,
                        action: () => switchGlobalRegion(regionCode)
                    });
                }
            }
        }

        if (dict.clearSearch && dict.clearSearch.some(kw => text.includes(kw))) {
            actions.push({
                label: `🧹 Arama Çubuğunu Temizle`,
                action: () => {
                    document.getElementById('searchInput').value = '';
                    handleSearch();
                }
            });
        }

        if (dict.clearFilters && dict.clearFilters.some(kw => text.includes(kw))) {
            actions.push({
                label: `🗑️ Filtreleri Kaldır`,
                action: () => {
                    currentCategory = '';
                    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
                    if(document.querySelectorAll('.cat-btn').length > 0) document.querySelectorAll('.cat-btn')[0].classList.add('active');
                    activeSources = RSS_FEEDS.map(f => f.name);
                    saveActiveSources();
                    renderChips();
                    handleSearch();
                }
            });
        }

        if (dict.hideRead && dict.hideRead.some(kw => text.includes(kw))) {
            actions.push({
                label: `👁️ Okunanları Gizle`,
                action: () => toggleReadVisibility(true)
            });
        }

        if (dict.showRead && dict.showRead.some(kw => text.includes(kw))) {
            actions.push({
                label: `👁️ Okunanları Göster`,
                action: () => toggleReadVisibility(false)
            });
        }

        const searchKeyword = dict.search && dict.search.find(kw => text.includes(kw));
        if (searchKeyword && !queryMatched) {
            let query = text;
            dict.search.forEach(kw => { query = query.replace(new RegExp(`\\b${kw}\\b`, 'gi'), ''); });
            query = query.replace(/içinde|geçen/gi, '').replace(/\s+/g, ' ').trim();
            if (query.length > 2) {
                queryMatched = true;
                actions.push({
                    label: `🔍 "${query}" Kelimesini Ara`,
                    action: () => {
                        document.getElementById('searchInput').value = query;
                        switchControlTab('search');
                        handleSearch();
                        window.scrollTo(0,0);
                    }
                });
            }
        }
    }

    const matchedSources = [];
    const sourceKeywords = ['filtrele', 'sadece', 'göster', 'kaynak', 'gazete', 'filter', 'source', 'only'];
    const isFilterIntent = sourceKeywords.some(kw => normalizedText.includes(kw));
    RSS_FEEDS.forEach(feed => {
        let sourceName = feed.name.toLocaleLowerCase(currentRegion === 'TR' ? 'tr-TR' : 'en-US');
        
        if (normalizedText.includes(sourceName)) {
            if(!matchedSources.includes(feed.name)) matchedSources.push(feed.name);
        } else {
            const firstWord = sourceName.split(' ')[0];
            if (firstWord.length > 2 && normalizedText.includes(firstWord)) {
                if(!matchedSources.includes(feed.name)) matchedSources.push(feed.name);
            }
        }
    });
    if (matchedSources.length > 0) {
        actions.push({
            label: `📰 Filtrele: ${matchedSources.join(', ')}`,
            action: () => {
                activeSources = [...matchedSources];
                saveActiveSources();
                renderChips();
                switchControlTab('filter');
                handleSearch();
                window.scrollTo(0,0);
            }
        });
    } else if (isFilterIntent && matchedSources.length === 0) {
        actions.push({
            label: `⚙️ Kaynakları Filtrele (Menüyü Aç)`,
            action: () => {
                switchControlTab('filter');
                window.scrollTo(0,0);
            }
        });
    }

    const uniqueActions = [];
    const seenLabels = new Set();
    for (const act of actions) {
        if (!seenLabels.has(act.label)) {
            seenLabels.add(act.label);
            uniqueActions.push(act);
        }
    }

    if (uniqueActions.length === 0 && text.length > 2) {
        uniqueActions.push({
            label: `🔍 Sadece "${rawText}" Olarak Ara`,
            action: () => {
                document.getElementById('searchInput').value = rawText;
                switchControlTab('search');
                handleSearch();
                window.scrollTo(0,0);
            }
        });
        uniqueActions.push({
            label: `🧹 Arama Çubuğunu Temizle`,
            action: () => {
                document.getElementById('searchInput').value = '';
                handleSearch();
            }
        });
        uniqueActions.push({
            label: `🔄 Haberleri Yenile`,
            action: () => { fetchAllRSS(); }
        });
    }

    return uniqueActions;
}

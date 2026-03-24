// sesli-asistan.js - Ekran Bağlamlı (Context-Aware), RAG ve Derin Araştırma Modlu Sürüm

let voiceReadLinks = new Set();
let lastVoiceCommand = "";
let checkSpeakingInterval;

document.addEventListener('DOMContentLoaded', () => {
    const micBtn = document.querySelector('.mic-fab');
    if (!micBtn) return;

    // 1. ZIRHLI VE GÖRÜNÜR SUSTUR BUTONU
    if (!document.getElementById('voiceStopBtn')) {
        let stopBtn = document.createElement('button');
        stopBtn.id = 'voiceStopBtn';
        stopBtn.innerHTML = '⏹️ Sustur';
        // En üste çıkması için z-index 999999 yapıldı ve !important eklendi
        stopBtn.style.cssText = 'display:none; position:fixed; bottom:90px; right:20px; background:#e11d48; color:white; border:none; border-radius:30px; padding:12px 24px; font-weight:bold; font-size:1.1rem; z-index:999999; box-shadow:0 4px 15px rgba(0,0,0,0.6); cursor:pointer; transition:0.3s;';
        document.body.appendChild(stopBtn);

        stopBtn.addEventListener('click', () => {
            window.speechSynthesis.cancel();
            stopBtn.style.display = 'none';
            clearInterval(checkSpeakingInterval);
            micBtn.classList.remove('listening');
        });
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'tr-TR'; 
    recognition.interimResults = false; 
    recognition.maxAlternatives = 1;

    micBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if(window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            document.getElementById('voiceStopBtn').style.display = 'none';
        }
        recognition.start();
        micBtn.classList.add('listening'); 
    });

    recognition.onresult = (event) => {
        let komut = event.results[0][0].transcript.toLowerCase();
        micBtn.classList.remove('listening'); 
        
        const isContinuation = komut.includes("devam") || komut.includes("başka") || komut.includes("sıradaki");
        if (isContinuation && lastVoiceCommand) komut = lastVoiceCommand; 
        else lastVoiceCommand = komut; 
        
        processVoiceCommand(komut); 
    };

    recognition.onspeechend = () => { recognition.stop(); micBtn.classList.remove('listening'); };
    recognition.onerror = () => { recognition.stop(); micBtn.classList.remove('listening'); };
});

// ÇOKLU API ANAHTARI (FALLBACK) MOTORU
async function fetchFromGroq(systemPrompt, userPrompt, isJson = false) {
    let apiKeys = [];
    const keysString = localStorage.getItem('groqApiKeys');
    if (keysString) {
        try {
            const parsed = JSON.parse(keysString);
            if (Array.isArray(parsed) && parsed.length > 0) apiKeys = parsed;
            else if (typeof parsed === 'string') apiKeys = [parsed];
        } catch (e) {}
    }

    if (apiKeys.length === 0) throw new Error("NO_KEY");

    for (let i = 0; i < apiKeys.length; i++) {
        try {
            const bodyObj = {
                model: 'llama-3.1-8b-instant', 
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.3
            };
            if (isJson) bodyObj.response_format = { type: "json_object" };

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKeys[i]}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyObj)
            });

            if (!response.ok) continue; 
            const data = await response.json();
            return data.choices[0].message.content;
        } catch (e) { continue; }
    }
    throw new Error("ALL_KEYS_FAILED");
}

// ANA İŞLEM DÖNGÜSÜ
async function processVoiceCommand(komut) {
    const sourceNames = typeof RSS_FEEDS !== 'undefined' ? RSS_FEEDS.map(f => f.name) : [];
    
    // EKRANIN FOTOĞRAFINI ÇEK: Yapay zekaya referans olsun diye o anki ilk 10 haberi alıyoruz
    let currentList = (typeof filteredArticles !== 'undefined' && filteredArticles.length > 0) ? filteredArticles : (typeof allArticles !== 'undefined' ? allArticles : []);
    let contextArticles = currentList.slice(0, 10);
    let contextText = contextArticles.map((a, i) => `[ID: ${i}] Kaynak: ${a.source} | Başlık: ${a.title}`).join('\n');

    // 1. AŞAMA: NİYET OKUMA VE HABER EŞLEŞTİRME
    const intentSystemPrompt = `Sen akıllı bir asistansın. Kullanıcının komutunu analiz edip SADECE JSON ver.
    
    O AN KULLANICININ EKRANINDAKİ HABERLER (BAĞLAM):
    ${contextText}
    MEVCUT TÜM KAYNAKLAR: ${sourceNames.join(', ')}
    
    KURALLAR:
    1. Eğer kullanıcı belirli bir haberin "detayını", "ne olduğunu", "derinlemesine" bilgisini istiyorsa intent'i "detail" yap ve EKRANDAKİ HABERLER'den onun bahsettiği haberin [ID] numarasını bulup "article_id" alanına yaz. (Bulamazsan -1 yap).
    2. Eğer kullanıcı genel bir "özet", "haber oku", "arama yap" diyorsa intent'i "search" yap. Arama kutusuna yazılacak kelimeyi "search_query", istenen kaynağı "source" alanına yaz (istenmediyse boş bırak).
    3. ui_message alanına kullanıcının ekranında belirecek olan, şu an arka planda ne yaptığını anlatan ÇOK KISA bir bilgi mesajı yaz (Örn: "Cumhuriyet'ten detaylar çekiliyor..." veya "Maden haberleri filtreleniyor...").
    
    JSON FORMATI:
    {
      "intent": "search" veya "detail",
      "article_id": 0,
      "search_query": "aranacak kelime",
      "source": "Sözcü",
      "ui_message": "Ekranda belirecek metin..."
    }`;

    let aiData;
    try {
        const intentResult = await fetchFromGroq(intentSystemPrompt, komut, true);
        aiData = JSON.parse(intentResult);
    } catch (e) {
        if (e.message === "NO_KEY") return sesliOku("Lütfen ayarlardan API anahtarı ekleyin.");
        return sesliOku("Bağlantı sorunu yaşıyorum.");
    }

    // ARAYÜZDE BİLDİRİM VER (Arka plan eylemini ekranda göster)
    if(typeof showToastGlobal === 'function') {
        showToastGlobal("🤖 " + aiData.ui_message, 4000);
    }
    sesliOku(aiData.ui_message); // Önce kullanıcıya ne yaptığını sesli söylesin

    // 2. AŞAMA: KARARA GÖRE EYLEM
    if (aiData.intent === "detail" && aiData.article_id !== -1) {
        // DERİN DETAY MODU
        let targetArticle = contextArticles[aiData.article_id];
        if (!targetArticle) return sesliOku("Bahsettiğiniz haberi ekrandaki listede bulamadım.");
        
        // Haberin tam metnini çekmeye gidiyoruz
        return await handleDeepResearch(targetArticle);
        
    } else {
        // ARAMA VE BÜLTEN MODU
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = aiData.search_query || "";

        if (aiData.source) {
            activeSources = [aiData.source]; 
        } else {
            activeSources = sourceNames;
        }
        
        if(typeof saveActiveSources === 'function') saveActiveSources();
        if(typeof renderChips === 'function') renderChips();
        if(typeof handleSearch === 'function') handleSearch(true); // Ekranda haberi filtrele

        // Filtreleme bittikten yarım saniye sonra (UI güncellenmesi için) özetlemeye başla
        setTimeout(async () => {
            let unread = (typeof filteredArticles !== 'undefined' ? filteredArticles : []).filter(a => !voiceReadLinks.has(a.link)).slice(0, 4);
            
            if (unread.length === 0) {
                return sesliOku("Bu kriterlere uygun okunmamış yeni haber bulamadım.");
            }

            let haberlerMetni = unread.map((h, i) => `ID: ${i} | Kaynak: ${h.source} | Başlık: ${h.title} | Özet: ${h.description.substring(0, 150)}`).join("\n");
            
            const summaryPrompt = `Sen radyo spikerisin. Verilen haberleri özetle.
            1. "İşte haberler" gibi gevezelik yapmadan DİREKT konuya gir.
            2. Aynı olayı anlatan haberlerin sadece birini oku.
            3. Metnin SONUNA tam olarak şu formatta okuduğun ID'leri ekle: [OKUNDU: 0, 1]
            
            HABERLER:
            ${haberlerMetni}`;

            try {
                const summaryResult = await fetchFromGroq(summaryPrompt, "Özetle", false);
                const match = summaryResult.match(/\[OKUNDU:\s*([\d,\s]+)\]/);
                if (match) {
                    match[1].split(',').forEach(n => {
                        let idx = parseInt(n.trim());
                        if(unread[idx]) voiceReadLinks.add(unread[idx].link);
                    });
                }
                sesliOku(summaryResult.replace(/\[OKUNDU:.*?\]/g, '').trim());
            } catch (e) {
                sesliOku("Özetleme sırasında hata oluştu.");
            }
        }, 500);
    }
}

// 3. AŞAMA: HAYALET OKUYUCU (TAM METNİ ÇEKME)
async function handleDeepResearch(article) {
    let fullText = null;
    const encodedUrl = encodeURIComponent(article.link);
    const proxies = [
        `https://corsproxy.io/?${encodedUrl}`,
        `https://api.allorigins.win/raw?url=${encodedUrl}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodedUrl}`
    ];

    for (let p of proxies) {
        try {
            const ctrl = new AbortController();
            const tid = setTimeout(() => ctrl.abort(), 6000);
            const res = await fetch(p, { signal: ctrl.signal });
            clearTimeout(tid);
            
            if(!res.ok) continue;
            const html = await res.text();
            if(html.includes('security service') || html.length < 500) continue;
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const pTags = Array.from(doc.querySelectorAll('p, .content p, .news-text p, article p'));
            const validText = pTags.map(p => p.textContent.trim()).filter(t => t.length > 60);
            
            if(validText.length > 0) {
                fullText = [...new Set(validText)].join(' ').substring(0, 4000); // Token sınırı için kısıldı
                break;
            }
        } catch(e) { continue; }
    }

    if(!fullText) {
        return sesliOku(`Maalesef ${article.source} sitesi metin çekilmesini engelledi. Başka bir haberi özetlememi ister misiniz?`);
    }

    const detailPrompt = `Sen uzman bir spikersin. Aşağıdaki haberin TAM METNİ'ni okuyarak olayın detaylarını, nedenlerini ve rakamlarını sesli okunacak şekilde akıcı bir Türkçe ile özetle.
    Haber: ${article.title}
    Metin: ${fullText}`;

    try {
        const res = await fetchFromGroq(detailPrompt, "Detayları anlat", false);
        voiceReadLinks.add(article.link); // Okundu işaretle
        sesliOku(res);
    } catch(e) { 
        sesliOku("Detayları analiz ederken hata oluştu."); 
    }
}

// ZIRHLI SESLİ OKUMA FONKSİYONU
function sesliOku(metin) {
    if (!('speechSynthesis' in window)) return alert("Tarayıcınız sesli okumayı desteklemiyor.");
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(metin);
    utterance.lang = 'tr-TR';
    utterance.rate = 1.0; 

    const stopBtn = document.getElementById('voiceStopBtn');
    // cssText'i ezip display block'u zorla aktif ediyoruz
    stopBtn.style.setProperty('display', 'block', 'important');

    clearInterval(checkSpeakingInterval);
    checkSpeakingInterval = setInterval(() => {
        if(window.speechSynthesis.speaking || window.speechSynthesis.pending) {
            stopBtn.style.setProperty('display', 'block', 'important');
        } else {
            stopBtn.style.display = 'none';
            clearInterval(checkSpeakingInterval);
        }
    }, 500);

    utterance.onend = () => { stopBtn.style.display = 'none'; clearInterval(checkSpeakingInterval); };
    utterance.onerror = () => { stopBtn.style.display = 'none'; clearInterval(checkSpeakingInterval); };

    window.speechSynthesis.speak(utterance);
}

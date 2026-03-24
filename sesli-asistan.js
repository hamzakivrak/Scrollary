// sesli-asistan.js - Optimize Edilmiş, Kota Dostu ve Dinamik Beklemeli Sürüm

let voiceReadLinks = new Set();
let lastVoiceCommand = "";
let checkSpeakingInterval;
let isVoiceActive = false;

document.addEventListener('DOMContentLoaded', () => {
    const micBtn = document.querySelector('.mic-fab');
    if (!micBtn) return;

    // 1. ZIRHLI VE GÖRÜNÜR SUSTUR BUTONU
    if (!document.getElementById('voiceStopBtn')) {
        let stopBtn = document.createElement('button');
        stopBtn.id = 'voiceStopBtn';
        stopBtn.innerHTML = '⏹️ Sustur';
        stopBtn.style.cssText = 'display:none; position:fixed; bottom:90px; right:20px; background:#e11d48; color:white; border:none; border-radius:30px; padding:12px 24px; font-weight:bold; font-size:1.1rem; z-index:999999; box-shadow:0 4px 15px rgba(0,0,0,0.6); cursor:pointer; transition:0.3s;';
        document.body.appendChild(stopBtn);

        stopBtn.addEventListener('click', () => {
            window.speechSynthesis.cancel();
            stopBtn.style.setProperty('display', 'none', 'important');
            clearInterval(checkSpeakingInterval);
            micBtn.classList.remove('listening');
            isVoiceActive = false;
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
        isVoiceActive = true;
        if(window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            document.getElementById('voiceStopBtn').style.setProperty('display', 'none', 'important');
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

// ÇOKLU API ANAHTARI MOTORU (KOTA TASARRUFLU)
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
                temperature: 0.3,
                max_tokens: isJson ? 100 : 350 // KOTA TASARRUFU: Çıktı uzunluğu sınırlandırıldı
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
    if (!isVoiceActive) return;

    const sourceNames = typeof RSS_FEEDS !== 'undefined' ? RSS_FEEDS.map(f => f.name) : [];
    
    let currentList = (typeof filteredArticles !== 'undefined' && filteredArticles.length > 0) ? filteredArticles : (typeof allArticles !== 'undefined' ? allArticles : []);
    let contextArticles = currentList.slice(0, 15);
    let contextText = contextArticles.map((a, i) => `[ID: ${i}] Kaynak: ${a.source} | Başlık: ${a.title}`).join('\n');

    const intentSystemPrompt = `Sen akıllı bir haber asistanısın. Kullanıcının komutunu analiz edip SADECE JSON ver.
    O ANKİ HABERLER: ${contextText}
    KAYNAKLAR: ${sourceNames.join(', ')}
    
    KURALLAR:
    1. Detay/içerik istiyorsa intent: "detail", "article_id": [ID] (yoksa -1).
    2. Arama/listeleme istiyorsa intent: "search", "search_query": "kelime", "source": "Kaynak".
    3. ui_message: Kısa bilgi mesajı.
    JSON: {"intent":"search|detail", "article_id":0, "search_query":"", "source":"", "ui_message":""}`;

    let aiData;
    try {
        const intentResult = await fetchFromGroq(intentSystemPrompt, komut, true);
        aiData = JSON.parse(intentResult);
    } catch (e) {
        if (e.message === "NO_KEY") return sesliOku("Lütfen ayarlardan API anahtarı ekleyin.");
        return sesliOku("Bağlantı sorunu yaşıyorum.");
    }

    if (!isVoiceActive) return;

    if(typeof showToastGlobal === 'function') {
        showToastGlobal("🤖 " + aiData.ui_message, 4000);
    }

    if (aiData.intent === "detail" && aiData.article_id !== -1) {
        // DERİN DETAY MODU
        let targetArticle = contextArticles[aiData.article_id];
        if (!targetArticle) return sesliOku("Bahsettiğiniz haberi ekrandaki listede bulamadım.");
        
        // Dinamik bekleme bilgisi
        sesliOku("Haberin kaynağına bağlanıp tam metni çekiyorum, bağlantı hızına göre 10 saniye sürebilir...");
        
        // Körü körüne bekleme kaldırıldı, doğrudan asenkron fonksiyona geçiliyor
        return await handleDeepResearch(targetArticle);
        
    } else {
        // ARAMA VE FİLTRELEME MODU
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = aiData.search_query || "";

        if (aiData.source) {
            activeSources = [aiData.source]; 
        } else {
            activeSources = sourceNames;
        }
        
        if(typeof saveActiveSources === 'function') saveActiveSources();
        if(typeof renderChips === 'function') renderChips();
        if(typeof handleSearch === 'function') handleSearch(true);

        sesliOku("İstediğiniz haberler taranıyor, listelenmesi için bekliyorum...");
        
        // DİNAMİK BEKLEME (POLLING) - Maksimum 10 Saniye
        let waitCount = 0;
        let unread = [];
        while (waitCount < 10 && isVoiceActive) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            waitCount++;
            
            let currentFiltered = (typeof filteredArticles !== 'undefined' ? filteredArticles : (typeof allArticles !== 'undefined' ? allArticles : []));
            // KOTA TASARRUFU: 10 haber yerine en güncel 5 haber
            unread = currentFiltered.filter(a => !voiceReadLinks.has(a.link)).slice(0, 5); 
            
            // Script.js'deki isFetchingRefresh değişkeni veri çekiminin bitip bitmediğini söyler
            let isFetching = typeof isFetchingRefresh !== 'undefined' ? isFetchingRefresh : false;

            if (unread.length > 0 && !isFetching) {
                break; // Haberler geldi, döngüden çık
            }
        }

        if (!isVoiceActive) return;
        
        if (unread.length === 0) {
            return sesliOku("Bu kriterlere uygun yeni haber bulamadım veya bağlantı zaman aşımına uğradı.");
        }

        let haberlerMetni = unread.map((h, i) => `ID: ${i} | Kaynak: ${h.source} | Başlık: ${h.title}`).join("\n");
        
        // KOTA TASARRUFU: Spiker promptu daraltıldı.
        const summaryPrompt = `Sen profesyonel bir haber spikerisin. 
        Maksimum 5 haberi çok kısa ve hızlıca özetle.
        Metnin SONUNA tam olarak şu formatta okuduğun ID'leri ekle: [OKUNDU: 0, 1...]
        HABERLER: ${haberlerMetni}`;

        try {
            const summaryResult = await fetchFromGroq(summaryPrompt, "Özetle", false);
            if (!isVoiceActive) return;

            const match = summaryResult.match(/\[OKUNDU:\s*([\d,\s]+)\]/);
            if (match) {
                match[1].split(',').forEach(n => {
                    let idx = parseInt(n.trim());
                    if(unread[idx]) voiceReadLinks.add(unread[idx].link);
                });
            }
            sesliOku(summaryResult.replace(/\[OKUNDU:.*?\]/g, '').trim());
        } catch (e) {
            if (isVoiceActive) sesliOku("Özetleme sırasında hata oluştu.");
        }
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
        if (!isVoiceActive) return;
        try {
            const ctrl = new AbortController();
            // Zaman aşımı 6 saniyeden 10 saniyeye çıkarıldı
            const tid = setTimeout(() => ctrl.abort(), 10000); 
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
                // KOTA TASARRUFU: 4000 karakterden 2000 karaktere düşürüldü (En önemli ilk paragraflar yeterlidir)
                fullText = [...new Set(validText)].join(' ').substring(0, 2000); 
                break;
            }
        } catch(e) { continue; }
    }

    if (!isVoiceActive) return;

    if(!fullText) {
        return sesliOku(`Sitenin güvenlik duvarını aşamadım. İsterseniz orijinal siteyi açarak okuyabilirsiniz.`);
    }

    // KOTA TASARRUFU: Yapay zekadan kısa özet isteme kuralı eklendi
    const detailPrompt = `Sen uzman bir spikersin. Aşağıdaki haber metnini kullanarak olayın en kritik detaylarını, uzatmadan en fazla 4-5 cümleyle akıcı Türkçe ile özetle.
    Haber: ${article.title}
    Metin: ${fullText}`;

    try {
        const res = await fetchFromGroq(detailPrompt, "Özetle", false);
        if (!isVoiceActive) return;
        voiceReadLinks.add(article.link); // Okundu işaretle
        sesliOku(res);
    } catch(e) { 
        if (isVoiceActive) sesliOku("Detayları analiz ederken hata oluştu."); 
    }
}

// ZIRHLI SESLİ OKUMA FONKSİYONU
function sesliOku(metin) {
    if (!('speechSynthesis' in window)) return alert("Tarayıcınız sesli okumayı desteklemiyor.");
    if (!isVoiceActive) return;
    
    window.speechSynthesis.cancel(); 
    
    const utterance = new SpeechSynthesisUtterance(metin);
    utterance.lang = 'tr-TR';
    // HIZ ARTTIRILDI (1.0'dan 1.5'e çıkarıldı)
    utterance.rate = 1.5; 

    const stopBtn = document.getElementById('voiceStopBtn');
    stopBtn.style.setProperty('display', 'block', 'important');

    clearInterval(checkSpeakingInterval);
    checkSpeakingInterval = setInterval(() => {
        if(window.speechSynthesis.speaking || window.speechSynthesis.pending) {
            stopBtn.style.setProperty('display', 'block', 'important');
        } else {
            stopBtn.style.setProperty('display', 'none', 'important');
            clearInterval(checkSpeakingInterval);
        }
    }, 500);

    utterance.onend = () => { 
        stopBtn.style.setProperty('display', 'none', 'important'); 
        clearInterval(checkSpeakingInterval); 
    };
    utterance.onerror = () => { 
        stopBtn.style.setProperty('display', 'none', 'important'); 
        clearInterval(checkSpeakingInterval); 
    };

    window.speechSynthesis.speak(utterance);
}

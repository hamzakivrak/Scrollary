// sesli-asistan.js - Gelişmiş Dinamik Beklemeli, Hafızalı ve RAG Destekli Sürüm

let voiceReadLinks = new Set();
let lastVoiceCommand = "";
let isVoiceActive = false;
let currentVoiceCmdId = 0; // Birbirine giren asenkron işlemleri iptal etmek için kimlik

// Asistanın hafızası: En son listelenen 5 haberi burada tutar, "Haber 3'ü aç" dendiğinde buradan çeker.
let currentListedArticles = []; 

document.addEventListener('DOMContentLoaded', () => {
    const micBtn = document.querySelector('.mic-fab');
    if (!micBtn) return;

    // ZIRHLI SUSTUR BUTONU
    if (!document.getElementById('voiceStopBtn')) {
        let stopBtn = document.createElement('button');
        stopBtn.id = 'voiceStopBtn';
        stopBtn.innerHTML = '⏹️ Sustur';
        stopBtn.style.cssText = 'display:none; position:fixed; bottom:90px; right:20px; background:#e11d48; color:white; border:none; border-radius:30px; padding:12px 24px; font-weight:bold; font-size:1.1rem; z-index:999999; box-shadow:0 4px 15px rgba(0,0,0,0.6); cursor:pointer; transition:0.3s;';
        document.body.appendChild(stopBtn);

        stopBtn.addEventListener('click', () => {
            window.speechSynthesis.cancel();
            stopBtn.style.setProperty('display', 'none', 'important');
            isVoiceActive = false;
            currentVoiceCmdId++; // Devam eden tüm arka plan işlemlerini kes
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
        isVoiceActive = true;
        currentVoiceCmdId++;
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
        processVoiceCommand(komut); 
    };

    recognition.onspeechend = () => { recognition.stop(); micBtn.classList.remove('listening'); };
    recognition.onerror = () => { recognition.stop(); micBtn.classList.remove('listening'); };
});

// KOTA DOSTU AI İSTEK MOTORU
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
                max_tokens: isJson ? 150 : 500
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

// ASENKRON SESLİ OKUMA FONKSİYONU (Beklemeler ve sequence için)
function sesliOkuAsync(metin, myCmdId) {
    return new Promise((resolve) => {
        if (!isVoiceActive || myCmdId !== currentVoiceCmdId || !('speechSynthesis' in window)) return resolve();
        
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(metin);
        utterance.lang = 'tr-TR';
        utterance.rate = 1.5; // Okuma hızı 1.5x yapıldı

        const stopBtn = document.getElementById('voiceStopBtn');
        stopBtn.style.setProperty('display', 'block', 'important');

        utterance.onend = () => { 
            stopBtn.style.setProperty('display', 'none', 'important'); 
            resolve(); 
        };
        utterance.onerror = () => { 
            stopBtn.style.setProperty('display', 'none', 'important'); 
            resolve(); 
        };

        window.speechSynthesis.speak(utterance);
    });
}

// ANA İŞLEM DÖNGÜSÜ
async function processVoiceCommand(komut) {
    let myCmdId = currentVoiceCmdId;
    if (!isVoiceActive) return;

    const sourceNames = typeof RSS_FEEDS !== 'undefined' ? RSS_FEEDS.map(f => f.name) : [];
    
    // NİYET OKUMA SİSTEMİ (Hafıza Destekli)
    const intentSystemPrompt = `Sen akıllı bir haber asistanısın. Kullanıcı komutunu SADECE JSON vererek analiz et.
    KAYNAKLAR: ${sourceNames.join(', ')}
    
    KURALLAR:
    1. Kullanıcı "Haber 2", "3. haber", "ilk haberi aç" gibi daha önce listelenen bir haberi detaylandırmak istiyorsa intent: "detail", "list_index": [sayı] (Örn: 2) ver.
    2. Kullanıcı "devam et", "sonraki haberler", "başka" diyorsa intent: "continue".
    3. Kullanıcı "ekonomi", "Galatasaray", "ara", "filtrele" gibi YENİ bir arama istiyorsa intent: "search", "search_query": "aranacak kelime", "source": "Kaynak".
    4. ui_message: Ekranda belirecek kısa bilgi.
    
    JSON FORMATI: {"intent":"search|detail|continue", "list_index": 1, "search_query":"", "source":"", "ui_message":""}`;

    let aiData;
    try {
        const intentResult = await fetchFromGroq(intentSystemPrompt, komut, true);
        if(myCmdId !== currentVoiceCmdId) return;
        aiData = JSON.parse(intentResult);
    } catch (e) {
        if (e.message === "NO_KEY") return sesliOkuAsync("Lütfen ayarlardan API anahtarı ekleyin.", myCmdId);
        return sesliOkuAsync("Bağlantı sorunu yaşıyorum.", myCmdId);
    }

    if(typeof showToastGlobal === 'function') showToastGlobal("🤖 " + aiData.ui_message, 4000);

    // EYLEM: DETAY (HABER 3'Ü AÇ)
    if (aiData.intent === "detail" && aiData.list_index) {
        let index = aiData.list_index - 1;
        if (index < 0 || index >= currentListedArticles.length) {
            return sesliOkuAsync("Bahsettiğiniz sıradaki haberi hafızamda bulamadım. Lütfen aramayı tekrarlayın.", myCmdId);
        }
        let targetArticle = currentListedArticles[index];
        return await handleDeepResearch(targetArticle, aiData.list_index, myCmdId);
    } 
    // EYLEM: ARAMA VEYA LİSTELEMEYE DEVAM ETME
    else {
        if (aiData.intent === "search") {
            // Yeni arama yapılıyorsa filtreleri güncelle ve ekrana yansıt
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.value = aiData.search_query || "";

            if (aiData.source) activeSources = [aiData.source]; 
            else activeSources = sourceNames;
            
            if(typeof saveActiveSources === 'function') saveActiveSources();
            if(typeof renderChips === 'function') renderChips();
            if(typeof handleSearch === 'function') handleSearch(true);
            
            await sesliOkuAsync("Haberleri tarıyorum, listeyi hazırlıyorum...", myCmdId);
        }

        // Dinamik bekleme (Ağdan haberlerin çekilmesi)
        let waitCount = 0;
        let unread = [];
        let currentFiltered = [];
        
        while (waitCount < 5 && isVoiceActive && myCmdId === currentVoiceCmdId) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            waitCount++;
            currentFiltered = (typeof filteredArticles !== 'undefined' ? filteredArticles : []);
            unread = currentFiltered.filter(a => !voiceReadLinks.has(a.link)).slice(0, 5); 
            
            let isFetching = typeof isFetchingRefresh !== 'undefined' ? isFetchingRefresh : false;
            if (unread.length > 0 && !isFetching) break; 
        }

        if (myCmdId !== currentVoiceCmdId || !isVoiceActive) return;

        if (unread.length === 0) {
            return sesliOkuAsync("Bu kriterlere uygun listelenecek yeni haber bulamadım.", myCmdId);
        }

        // Bulunan 5 haberi hafızaya al
        currentListedArticles = unread;
        let haberlerMetni = unread.map((h, i) => `[Haber ${i+1}] ${h.title}`).join("\n");
        
        const summaryPrompt = `Sen bir spikersin. Bu 5 haberi çok kısa (maksimum 1 cümle) özetle ve SADECE bir JSON dizisi olarak dön. 
        Format Örneği: ["1. Haber: ...", "2. Haber: ..."]
        HABERLER:\n${haberlerMetni}`;

        try {
            const summaryResult = await fetchFromGroq(summaryPrompt, "Özetle", false);
            if (myCmdId !== currentVoiceCmdId) return;

            let summaryArray = [];
            try { summaryArray = JSON.parse(summaryResult); } 
            catch(e) { summaryArray = summaryResult.split('\n').filter(s => s.trim().length > 10); }

            // Haberleri sırayla oku ve aralarında 2 saniye bekle
            for (let i = 0; i < summaryArray.length; i++) {
                if (myCmdId !== currentVoiceCmdId || !isVoiceActive) break;
                
                voiceReadLinks.add(unread[i].link); // Okundu işaretle
                await sesliOkuAsync(summaryArray[i], myCmdId);
                
                // Son haber değilse 2 saniye es ver
                if (i < summaryArray.length - 1 && myCmdId === currentVoiceCmdId) {
                    await new Promise(r => setTimeout(r, 2000)); 
                }
            }
            
            if (myCmdId === currentVoiceCmdId) {
                await sesliOkuAsync("Dinlemek istediğiniz haberin numarasını söyleyebilir veya devam et diyebilirsiniz.", myCmdId);
            }

        } catch (e) {
            if (myCmdId === currentVoiceCmdId) await sesliOkuAsync("Özetleme sırasında bir hata oluştu.", myCmdId);
        }
    }
}

// DETAY MODU: 10 Saniyelik Dinamik Polling ve Arayüz Entegrasyonu
async function handleDeepResearch(article, listIndex, myCmdId) {
    // UI Tarafında da haberi şık bir şekilde aç (Script.js'deki openModal tetiklenir)
    if(typeof openModal === 'function') openModal(article);
    
    // Geri bildirim ile başla
    sesliOkuAsync(`${listIndex}. haberin içeriğini çekiyorum, lütfen bekleyin...`, myCmdId);

    let isDone = false;
    let fullText = null;

    // Arkaplanda metin çekme işlemini (Promise) başlat
    const fetchTask = async () => {
        const encodedUrl = encodeURIComponent(article.link);
        const proxies = [
            `https://corsproxy.io/?${encodedUrl}`,
            `https://api.allorigins.win/raw?url=${encodedUrl}`,
            `https://api.codetabs.com/v1/proxy?quest=${encodedUrl}`
        ];

        for (let p of proxies) {
            if (myCmdId !== currentVoiceCmdId) break;
            try {
                const ctrl = new AbortController();
                const tid = setTimeout(() => ctrl.abort(), 8000); 
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
                    fullText = [...new Set(validText)].join(' ').substring(0, 2000); 
                    break;
                }
            } catch(e) { continue; }
        }
        isDone = true;
    };

    fetchTask(); // Bekletmeden başlat

    // 10 Saniyelik Bekleme ve Kullanıcıyı Bilgilendirme Döngüsü
    let seconds = 0;
    while (!isDone && seconds < 10 && myCmdId === currentVoiceCmdId && isVoiceActive) {
        await new Promise(r => setTimeout(r, 1000));
        seconds++;
        
        // Ara ara bilgi ver (Kullanıcı sıkılmasın)
        if (seconds === 4 && !isDone) {
            sesliOkuAsync("Bağlantı kuruldu, metni analiz ediyorum...", myCmdId);
        }
        if (seconds === 8 && !isDone) {
            sesliOkuAsync("Sitenin güvenlik duvarı biraz zorluyor, aşmayı deniyorum...", myCmdId);
        }
    }

    if (myCmdId !== currentVoiceCmdId || !isVoiceActive) return;

    if (!fullText) {
        return await sesliOkuAsync("Maalesef 10 saniye içinde güvenlik duvarını aşamadım. Ekranda açılan sayfadan orijinal haberi okuyabilirsiniz.", myCmdId);
    }

    // Metin başarıyla geldiyse özetlet
    const detailPrompt = `Sen uzman bir spikersin. Aşağıdaki haber metnini kullanarak olayın detaylarını, uzatmadan 3-4 cümleyle akıcı Türkçe ile özetle.
    Haber: ${article.title}
    Metin: ${fullText}`;

    try {
        const res = await fetchFromGroq(detailPrompt, "Özetle", false);
        if (myCmdId !== currentVoiceCmdId) return;
        voiceReadLinks.add(article.link); 
        await sesliOkuAsync(res, myCmdId);
    } catch(e) { 
        if (myCmdId === currentVoiceCmdId) await sesliOkuAsync("Haberin detaylarını analiz ederken bir hata oluştu.", myCmdId); 
    }
}

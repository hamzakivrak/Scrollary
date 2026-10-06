// sesli-asistan.js - Kesin Numaralandırma, Zeki Bağlam ve Etkileşimli Altyazı Sürümü (Final)

let voiceReadLinks = new Set();
let lastVoiceCommand = "";
let isVoiceActive = false;
let currentVoiceCmdId = 0; 
let currentListedArticles = []; 
let subtitleTimeout = null; 

document.addEventListener('DOMContentLoaded', () => {
    const micBtn = document.querySelector('.mic-fab');
    if (!micBtn) return;

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
            currentVoiceCmdId++; 
            micBtn.classList.remove('listening');
            hideVoiceSubtitle(0); 
        });
    }

    const hideOnInteraction = () => {
        const subBox = document.getElementById('voiceSubtitleBox');
        if (subBox && subBox.style.opacity === '1') {
            if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
                hideVoiceSubtitle(0);
            }
        }
    };
    window.addEventListener('touchstart', hideOnInteraction, {passive: true});
    window.addEventListener('mousedown', hideOnInteraction, {passive: true});
    window.addEventListener('scroll', hideOnInteraction, {passive: true});

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
            hideVoiceSubtitle(0);
        }
        try { recognition.start(); } catch (err) { try { recognition.stop(); } catch (e2) {} }
        micBtn.classList.add('listening'); 
    });

    recognition.onresult = (event) => {
        let komut = event.results[0][0].transcript.toLowerCase();
        micBtn.classList.remove('listening'); 
        processVoiceCommand(komut); 
    };

    recognition.onspeechend = () => { recognition.stop(); micBtn.classList.remove('listening'); };
    recognition.onerror = (ev) => {
        try { recognition.stop(); } catch (e) {}
        micBtn.classList.remove('listening');
        const msg = { 'not-allowed': 'Mikrofon izni verilmedi. Tarayıcı ayarlarından izin verin.', 'service-not-allowed': 'Ses tanıma bu tarayıcıda kapalı.', 'no-speech': 'Ses algılanmadı, tekrar deneyin.', 'network': 'Ses tanıma için internet gerekli.', 'audio-capture': 'Mikrofon bulunamadı.' }[ev && ev.error];
        if (msg && typeof showToastGlobal === 'function') showToastGlobal('🎙️ ' + msg, 3500);
    };
});

// --- KADEMELİ ALTYAZI MOTORU ---
function showVoiceSubtitle(text, append = false) {
    let subBox = document.getElementById('voiceSubtitleBox');
    if (!subBox) {
        subBox = document.createElement('div');
        subBox.id = 'voiceSubtitleBox';
        subBox.style.cssText = 'position:fixed; bottom:110px; left:50%; transform:translateX(-50%); width:90%; max-width:600px; background:rgba(15, 23, 42, 0.95); color:#e2e8f0; padding:15px 20px; border-radius:12px; border:1px solid var(--accent); z-index:999998; box-shadow:0 10px 25px rgba(0,0,0,0.5); text-align:left; font-size:1rem; line-height:1.5; opacity:0; transition:opacity 0.4s ease; pointer-events:none; backdrop-filter:blur(10px); display:flex; flex-direction:column; gap:8px;';
        document.body.appendChild(subBox);
    }
    
    if (append && subBox.innerHTML !== "") {
        let newRow = document.createElement('div');
        newRow.style.cssText = 'padding-top:8px; border-top:1px solid rgba(255,255,255,0.1);';
        newRow.innerHTML = `🎙️ ${text}`;
        subBox.appendChild(newRow);
    } else {
        subBox.innerHTML = `<div>🎙️ ${text}</div>`;
    }
    
    subBox.style.opacity = '1';
    clearTimeout(subtitleTimeout);
}

function hideVoiceSubtitle(delay = 5000) {
    clearTimeout(subtitleTimeout);
    subtitleTimeout = setTimeout(() => {
        const subBox = document.getElementById('voiceSubtitleBox');
        if (subBox) subBox.style.opacity = '0';
    }, delay);
}

// --- GROQ API MOTORU ---
// llama-3.1-8b-instant Groq'ta 16 Ağu 2026'da kapandı; ortak istemci (ai.js > groqChat) modeli ve anahtarları yönetir.
async function fetchFromGroq(systemPrompt, userPrompt, isJson = false) {
    try {
        return await groqChat(
            [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
            { temperature: 0.3, maxTokens: isJson ? 700 : 1500, json: isJson, models: GROQ_MODELS_FAST }
        );
    } catch (e) {
        if (/anahtarı eksik/i.test(e.message)) throw new Error("NO_KEY");
        const err = new Error("ALL_KEYS_FAILED");
        err.detail = e.message;
        throw err;
    }
}

// Model JSON'u ```kod bloğu``` veya ek metinle sarsa bile ayıklar
function parseLooseJson(text) {
    const t = String(text).replace(/```json|```/gi, '').trim();
    try { return JSON.parse(t); } catch (e) {}
    const m = t.match(/[\[{][\s\S]*[\]}]/);
    if (!m) throw new Error('json');
    return JSON.parse(m[0]);
}

// Hata sebebini kullanıcıya sesli/yazılı söylemek için
function voiceErrorText(e) {
    const d = (e && e.detail) || '';
    if (/Kota|429/i.test(d)) return "Yapay zeka kotası şu an dolmuş görünüyor, biraz sonra tekrar deneyin.";
    if (/geçersiz|401/i.test(d)) return "API anahtarınız geçersiz görünüyor, ayarlardan kontrol edin.";
    if (/Model kullanılamıyor/i.test(d)) return "Kullanılan yapay zeka modeli kapatılmış, uygulamayı güncelleyin.";
    if (/Zaman aşımı|Bağlantı/i.test(d)) return "İnternet bağlantısında sorun var gibi görünüyor.";
    return "Bağlantı sorunu yaşıyorum.";
}

function sesliOkuAsync(metin, myCmdId, appendSubtitle = false) {
    return new Promise((resolve) => {
        if (!isVoiceActive || myCmdId !== currentVoiceCmdId || !('speechSynthesis' in window)) return resolve();
        
        window.speechSynthesis.cancel();
        showVoiceSubtitle(metin, appendSubtitle); 

        const utterance = new SpeechSynthesisUtterance(metin);
        utterance.lang = 'tr-TR';
        utterance.rate = 1.5; 

        const stopBtn = document.getElementById('voiceStopBtn');
        stopBtn.style.setProperty('display', 'block', 'important');

        utterance.onend = () => { 
            stopBtn.style.setProperty('display', 'none', 'important'); 
            hideVoiceSubtitle(5000); 
            resolve(); 
        };
        utterance.onerror = () => { 
            stopBtn.style.setProperty('display', 'none', 'important'); 
            hideVoiceSubtitle(0);
            resolve(); 
        };

        window.speechSynthesis.speak(utterance);
    });
}

// --- ANA İŞLEM DÖNGÜSÜ ---
async function processVoiceCommand(komut) {
    let myCmdId = currentVoiceCmdId;
    if (!isVoiceActive) return;
    
    // AYARLARDAN PROMPT ÇEKİLİYOR
    const intentSystemPrompt = typeof getAIPrompt === 'function' ? getAIPrompt('voiceIntent') : `Sen akıllı bir haber asistanısın. Kullanıcı komutunu SADECE JSON vererek analiz et.
    
    KURALLAR:
    1. DETAY: Kullanıcı daha önce listelenen spesifik bir haberin detayını, tamamını veya içeriğini istiyorsa (Örn: "3. haberin detayını ver", "ikinciyi oku", "ilk haberi aç") intent: "detail" yap ve "list_index" alanına o haberin numarasını SAYI olarak yaz (Örn: 3).
    2. DEVAM ET: Kullanıcı listeye devam edilmesini istiyorsa (Örn: "devam et", "sonraki haberler", "başka var mı") intent: "continue" yap.
    3. GENEL LİSTE/ÖZET: Kullanıcı genel gündemi soruyorsa (Örn: "gündemi özetle", "haber oku") intent: "general_list" yap.
    4. YENİ ARAMA: Kullanıcı spesifik bir konu/kaynak arıyorsa intent: "search" yap.
       - ÇOK ÖNEMLİ: "search_query" kısmına SADECE salt anahtar kelimeyi yaz. "haber", "haberleri", "haberler", "var mı", "aç", "göster", "oku" kelimelerini KESİNLİKLE ÇIKAR!
       - (Örn: "sözcü haberleri aç" -> "sözcü")
       - (Örn: "iş kazası haberleri var mı" -> "iş kazası")
    5. ui_message: Ekranda belirecek çok kısa bilgi mesajı.
    
    JSON FORMATI: {"intent":"search|detail|continue|general_list", "list_index": 1, "search_query":"", "ui_message":""}`;

    let aiData;
    try {
        const intentResult = await fetchFromGroq(intentSystemPrompt, komut, true);
        if(myCmdId !== currentVoiceCmdId) return;
        aiData = parseLooseJson(intentResult);
        if (!aiData || !aiData.intent) throw new Error('json');
    } catch (e) {
        if (e.message === "NO_KEY") return sesliOkuAsync("Lütfen ayarlardan API anahtarı ekleyin.", myCmdId, false);
        if (e.detail && typeof showToastGlobal === 'function') showToastGlobal("⚠️ " + e.detail, 5000);
        return sesliOkuAsync(e.message === "ALL_KEYS_FAILED" ? voiceErrorText(e) : "Komutu anlayamadım, tekrar söyler misiniz?", myCmdId, false);
    }

    if(typeof showToastGlobal === 'function') showToastGlobal("🤖 " + aiData.ui_message, 4000);

    const searchInput = document.getElementById('searchInput');

    // EYLEM 1: DETAY OKUMA
    if (aiData.intent === "detail" && aiData.list_index) {
        let index = aiData.list_index - 1;
        if (index < 0 || index >= currentListedArticles.length) {
            return sesliOkuAsync("Bahsettiğiniz sıradaki haberi hafızamda bulamadım.", myCmdId, false);
        }
        let targetArticle = currentListedArticles[index];
        return await handleDeepResearch(targetArticle, aiData.list_index, myCmdId);
    } 
    // EYLEM 2: GENEL ÖZET/LİSTE (Aramayı temizle)
    else if (aiData.intent === "general_list") {
        if (searchInput) searchInput.value = "";
        if(typeof handleSearch === 'function') handleSearch(true);
        await sesliOkuAsync("Sizin için güncel haberleri derliyorum...", myCmdId, false);
    }
    // EYLEM 3: YENİ ARAMA
    else if (aiData.intent === "search") {
        let cleanQuery = aiData.search_query || "";
        cleanQuery = cleanQuery.replace(/\b(haber|haberler|haberleri|haberlerini|var mı|aç|göster|oku|bul|hakkında)\b/gi, '').replace(/\s+/g, ' ').trim();
        
        if (searchInput) searchInput.value = cleanQuery;
        if(typeof handleSearch === 'function') handleSearch(true);
        await sesliOkuAsync(`"${cleanQuery}" için haberleri arıyorum...`, myCmdId, false);
    }

    // Haberlerin Ağdan Çekilmesini Bekleme (Polling)
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
        return sesliOkuAsync("Bu kriterlere uygun listelenecek yeni haber bulamadım.", myCmdId, false);
    }

    // KOPYA HABER FİLTRESİ VE ÖZETLEME
    let haberlerMetni = unread.map((h, i) => `[ID: ${i}] ${h.title}`).join("\n");
    
    // AYARLARDAN PROMPT ÇEKİLİYOR
    const summaryBasePrompt = typeof getAIPrompt === 'function' ? getAIPrompt('voiceSummary') : `Sen bir spikersin. Aşağıdaki haberleri incele. BİREBİR AYNI konuyu anlatan kopya haberler varsa sadece birini tut, kopyaları yoksay. \nKalan benzersiz haberlerin her birini sadece 1 cümleyle özetle.\nSADECE JSON formatında bir dizi dön. Format şu şekilde olmalı:\n[{"id": 0, "summary": "Özet metni..."}, {"id": 2, "summary": "Özet metni..."}]`;
    const summaryPrompt = summaryBasePrompt + `\nHABERLER:\n${haberlerMetni}`;

    try {
        const summaryResult = await fetchFromGroq(summaryPrompt, "Özetle", false);
        if (myCmdId !== currentVoiceCmdId) return;

        let parsedArray = [];
        try { 
            parsedArray = parseLooseJson(summaryResult); if (!Array.isArray(parsedArray)) parsedArray = Object.values(parsedArray).find(Array.isArray) || []; 
        } catch(e) { 
            return sesliOkuAsync("Haberleri derlerken bir hata oluştu.", myCmdId, false);
        }

        currentListedArticles = [];
        let validSummaries = [];

        parsedArray.forEach((item) => {
            if (unread[item.id]) {
                currentListedArticles.push(unread[item.id]);
                validSummaries.push(item.summary);
            }
        });

        if (validSummaries.length === 0) return sesliOkuAsync("Okunacak yeni haber kalmadı.", myCmdId, false);

        for (let i = 0; i < validSummaries.length; i++) {
            if (myCmdId !== currentVoiceCmdId || !isVoiceActive) break;
            
            voiceReadLinks.add(currentListedArticles[i].link); 
            
            let cleanSummary = validSummaries[i].replace(/^\d+[\.\-\)]?\s*(Haber|Haber:|Sıra:)?\s*/i, '').trim();
            let finalSpokenText = `${i + 1}. Haber: ${cleanSummary}`;

            let shouldAppend = (i > 0);
            await sesliOkuAsync(finalSpokenText, myCmdId, shouldAppend);
            
            if (i < validSummaries.length - 1 && myCmdId === currentVoiceCmdId) {
                await new Promise(r => setTimeout(r, 1000)); 
            }
        }
        
        if (myCmdId === currentVoiceCmdId) {
            await sesliOkuAsync("Dinlemek istediğiniz haberin numarasını söyleyebilir veya devam et diyebilirsiniz.", myCmdId, true);
        }

    } catch (e) {
        if (myCmdId === currentVoiceCmdId) await sesliOkuAsync(e && e.detail ? voiceErrorText(e) : "Özetleme sırasında bir hata oluştu.", myCmdId, false);
    }
}

// --- EKRANDAN OKUYAN DETAY MODU ---
async function handleDeepResearch(article, listIndex, myCmdId) {
    if(typeof openModal === 'function') openModal(article);
    
    sesliOkuAsync(`${listIndex}. haberin detaylarına iniyorum, lütfen bekleyin...`, myCmdId, false);

    let fullText = "";
    let isDone = false;
    let seconds = 0;

    while (seconds < 15 && myCmdId === currentVoiceCmdId && isVoiceActive) {
        await new Promise(r => setTimeout(r, 1000));
        seconds++;
        
        const textContainer = document.getElementById('fullTextContainer');
        if (textContainer) {
            if (textContainer.querySelector('.reader-fail')) break;      // metin alınamadı: boşuna bekleme
            const htmlContent = textContainer.innerHTML;
            
            if (!htmlContent.includes('loading-pulse') && textContainer.innerText.trim().length > 100) {
                const pTags = textContainer.querySelectorAll('.p-text');   // sadece haber metni (🔊🌐 düğmeleri hariç)
                if (pTags.length > 0) {
                    fullText = Array.from(pTags).map(p => p.textContent.trim()).join(' ');
                } else {
                    fullText = textContainer.innerText;
                }
                
                fullText = fullText.substring(0, 2000); 
                isDone = true;
                break;
            }
        }
        
        if (seconds === 4 && !isDone) {
            sesliOkuAsync("Ekrandaki metinleri analiz ediyorum...", myCmdId, false);
        }
        if (seconds === 8 && !isDone) {
            sesliOkuAsync("Haberin ekrana düşmesini bekliyorum...", myCmdId, false);
        }
    }

    if (myCmdId !== currentVoiceCmdId || !isVoiceActive) return;

    if (!isDone || !fullText || fullText.length < 50) {
        await sesliOkuAsync("Sitenin güvenliği metni çekmeme izin vermedi. Sağ üstteki oktan orijinal haberi açabilirsiniz.", myCmdId, false);
        
        if (myCmdId === currentVoiceCmdId && typeof closeModalSafe === 'function') {
            setTimeout(() => { if (myCmdId === currentVoiceCmdId && isVoiceActive) closeModalSafe('newsModal'); }, 1000);
        }
        return;
    }

    // AYARLARDAN PROMPT ÇEKİLİYOR
    const detailBasePrompt = typeof getAIPrompt === 'function' ? getAIPrompt('voiceDetail') : `Sen profesyonel bir haber spikerisin. Aşağıdaki metinden yararlanarak olayın ana detaylarını 3-4 cümleyle akıcı Türkçe ile özetle.`;
    const detailPrompt = detailBasePrompt + `\n    Haber: ${article.title}\n    Metin: ${fullText}`;

    try {
        const res = await fetchFromGroq(detailPrompt, "Özetle", false);
        if (myCmdId !== currentVoiceCmdId) return;
        voiceReadLinks.add(article.link); 
        
        await sesliOkuAsync(res, myCmdId, false);

        if (myCmdId === currentVoiceCmdId && typeof closeModalSafe === 'function') {
            setTimeout(() => { if (myCmdId === currentVoiceCmdId && isVoiceActive) closeModalSafe('newsModal'); }, 1000);
        }

    } catch(e) { 
        if (myCmdId === currentVoiceCmdId) {
            await sesliOkuAsync(e && e.detail ? voiceErrorText(e) : "Haberin detaylarını özetlerken bir sorun oluştu.", myCmdId, false);
            setTimeout(() => { if (myCmdId === currentVoiceCmdId && isVoiceActive && typeof closeModalSafe === 'function') closeModalSafe('newsModal'); }, 1000);
        }
    }
}

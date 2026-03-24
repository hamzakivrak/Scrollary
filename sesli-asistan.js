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

    // SUSTUR BUTONU
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

    // EKRANA DOKUNUNCA/KAYDIRINCA ALTYAZIYI GİZLE
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
                max_tokens: isJson ? 200 : 500
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
    
    // ZEKİ BAĞLAM PROMPTU
    const intentSystemPrompt = `Sen akıllı bir haber asistanısın. Kullanıcı komutunu SADECE JSON vererek analiz et.
    
    KURALLAR:
    1. DETAY: Daha önce listelenen bir haberi (Örn: "2. haber", "ilk haberi aç") detaylandırmak istiyorsa intent: "detail", "list_index": [sayı] ver.
    2. DEVAM ET: Kullanıcı "devam et", "sonraki haberler", "başka var mı" diyorsa intent: "continue". (Önceki aramayı bozmaz).
    3. GENEL LİSTE/ÖZET: Kullanıcı "özet ver", "haberleri özetle", "neler var", "liste", "tüm haberler" diyorsa intent: "general_list" yap. (Bu, arama kutusunu temizler).
    4. YENİ ARAMA: Kullanıcı BELİRLİ bir konu veya kaynak adı söyleyerek arama istiyorsa (Örn: "soma haberleri", "iş kazası", "sözcü") intent: "search" yap. "search_query" alanına aranan konuyu yaz. ("haber, var mı" kelimelerini sil!)
    5. ui_message: Ekranda belirecek kısa bilgi.
    
    JSON FORMATI: {"intent":"search|detail|continue|general_list", "list_index": 1, "search_query":"", "ui_message":""}`;

    let aiData;
    try {
        const intentResult = await fetchFromGroq(intentSystemPrompt, komut, true);
        if(myCmdId !== currentVoiceCmdId) return;
        aiData = JSON.parse(intentResult);
    } catch (e) {
        if (e.message === "NO_KEY") return sesliOkuAsync("Lütfen ayarlardan API anahtarı ekleyin.", myCmdId, false);
        return sesliOkuAsync("Bağlantı sorunu yaşıyorum.", myCmdId, false);
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
        if (searchInput) searchInput.value = aiData.search_query || "";
        if(typeof handleSearch === 'function') handleSearch(true);
        await sesliOkuAsync("İstediğiniz haberleri arıyorum...", myCmdId, false);
    }
    // "continue" (Devam et) durumunda filtreye dokunmuyoruz.

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

    // KOPYA HABER FİLTRESİ (DEDUPLICATION)
    let haberlerMetni = unread.map((h, i) => `[ID: ${i}] ${h.title}`).join("\n");
    
    const summaryPrompt = `Sen bir spikersin. Aşağıdaki haberleri incele. BİREBİR AYNI konuyu anlatan kopya haberler varsa sadece birini tut, kopyaları yoksay. 
    Kalan benzersiz haberlerin her birini sadece 1 cümleyle özetle.
    SADECE JSON formatında bir dizi dön. Format şu şekilde olmalı:
    [{"id": 0, "summary": "Özet metni..."}, {"id": 2, "summary": "Özet metni..."}]
    HABERLER:\n${haberlerMetni}`;

    try {
        const summaryResult = await fetchFromGroq(summaryPrompt, "Özetle", false);
        if (myCmdId !== currentVoiceCmdId) return;

        let parsedArray = [];
        try { 
            parsedArray = JSON.parse(summaryResult); 
        } catch(e) { 
            return sesliOkuAsync("Haberleri derlerken bir hata oluştu.", myCmdId, false);
        }

        currentListedArticles = [];
        let validSummaries = [];

        // Yeni ve temizlenmiş listeyi hafızaya al
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
            
            // GARANTİLİ NUMARALANDIRMA (Yapay zekanın hatalarını düzeltir)
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
        if (myCmdId === currentVoiceCmdId) await sesliOkuAsync("Özetleme sırasında bir hata oluştu.", myCmdId, false);
    }
}

// --- EKRANDAN OKUYAN DETAY MODU ---
async function handleDeepResearch(article, listIndex, myCmdId) {
    if(typeof openModal === 'function') openModal(article);
    
    sesliOkuAsync(`${listIndex}. haberin detaylarına iniyorum, lütfen bekleyin...`, myCmdId, false);

    let fullText = "";
    let isDone = false;
    let seconds = 0;

    // Ekrandaki DOM'a haberin yansımasını bekle
    while (seconds < 12 && myCmdId === currentVoiceCmdId && isVoiceActive) {
        await new Promise(r => setTimeout(r, 1000));
        seconds++;
        
        const textContainer = document.getElementById('fullTextContainer');
        if (textContainer) {
            const htmlContent = textContainer.innerHTML;
            
            if (!htmlContent.includes('loading-pulse') && textContainer.innerText.trim().length > 100) {
                const pTags = textContainer.querySelectorAll('p');
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

    const detailPrompt = `Sen profesyonel bir haber spikerisin. Aşağıdaki metinden yararlanarak olayın ana detaylarını 3-4 cümleyle akıcı Türkçe ile özetle.
    Haber: ${article.title}
    Metin: ${fullText}`;

    try {
        const res = await fetchFromGroq(detailPrompt, "Özetle", false);
        if (myCmdId !== currentVoiceCmdId) return;
        voiceReadLinks.add(article.link); 
        
        await sesliOkuAsync(res, myCmdId, false);

        // Detay okuması bitince okuma modunu kapatıp listeye dön
        if (myCmdId === currentVoiceCmdId && typeof closeModalSafe === 'function') {
            setTimeout(() => { if (myCmdId === currentVoiceCmdId && isVoiceActive) closeModalSafe('newsModal'); }, 1000);
        }

    } catch(e) { 
        if (myCmdId === currentVoiceCmdId) {
            await sesliOkuAsync("Haberin detaylarını özetlerken bir sorun oluştu.", myCmdId, false);
            setTimeout(() => { if (myCmdId === currentVoiceCmdId && isVoiceActive && typeof closeModalSafe === 'function') closeModalSafe('newsModal'); }, 1000);
        }
    }
}

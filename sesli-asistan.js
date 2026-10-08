// sesli-asistan.js - Kesin Numaralandırma, Zeki Bağlam ve Etkileşimli Altyazı Sürümü (Final)

let voiceReadLinks = new Set();
let lastVoiceCommand = "";
let isVoiceActive = false;
let currentVoiceCmdId = 0; 
let currentListedArticles = []; 
let subtitleTimeout = null;
let voiceRec = null, voiceMicBtn = null;
let voiceListening = false, voiceHeard = false, voiceDeadline = 0;
let voiceIdleTimer = null, voiceRestartTimer = null, currentUtter = null, voiceHintCount = 0;
let voiceRecRunning = false;
const spokenLog = [];   // asistanın son söyledikleri (yankı süzgeci ve döngü kırıcı için)
const vSleep = (ms) => new Promise(r => setTimeout(r, ms));
// Dinlemede hiçbir şey söylenmezse oturum kaç sn sonra kapansın (Ayarlar > Sesli Asistan). 0 = konuşma bitince tekrar dinleme yok
function voiceIdleMs() { const v = parseInt(localStorage.getItem('voiceIdleSec'), 10); return isNaN(v) ? 6000 : v * 1000; } 

document.addEventListener('DOMContentLoaded', () => {
    const micBtn = document.querySelector('.mic-fab');
    if (!micBtn) return;

    if (!document.getElementById('voiceStopBtn')) {
        let stopBtn = document.createElement('button');
        stopBtn.id = 'voiceStopBtn';
        stopBtn.innerHTML = '⏹️ Sustur';
        stopBtn.style.cssText = 'display:none; position:fixed; bottom:90px; right:20px; background:#e11d48; color:white; border:none; border-radius:30px; padding:12px 24px; font-weight:bold; font-size:1.1rem; z-index:999999; box-shadow:0 4px 15px rgba(0,0,0,0.6); cursor:pointer; transition:0.3s;';
        document.body.appendChild(stopBtn);

        stopBtn.addEventListener('click', () => { endVoiceSession('manual'); });
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
    voiceRec = recognition; voiceMicBtn = micBtn;

    micBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (isVoiceActive && voiceListening) { endVoiceSession('manual'); return; }   // dinlerken tekrar dokunmak = kapat
        isVoiceActive = true;
        currentVoiceCmdId++;
        voiceHintCount = 0;
        spokenLog.length = 0;                      // yeni oturum: önceki oturumun cümleleri sayılmasın
        try { window.speechSynthesis.cancel(); } catch (err) {}
        const sb = document.getElementById('voiceStopBtn');
        if (sb) sb.style.setProperty('display', 'none', 'important');
        hideVoiceSubtitle(0);
        clearVoiceHighlights();
        startListening(currentVoiceCmdId, 0, false);
    });

    recognition.onstart = () => { voiceRecRunning = true; };
    recognition.onspeechstart = () => { voiceHeard = true; clearTimeout(voiceIdleTimer); };

    recognition.onresult = (event) => {
        const komut = String(event.results[0][0].transcript || '').toLowerCase();
        // Asistan hâlâ konuşuyorsa ya da duyulan şey asistanın kendi cümlesiyse bu bir yankıdır: yok say, dinlemeye devam et
        if (window.speechSynthesis.speaking || isEchoOfOwnVoice(komut)) { voiceHeard = false; return; }
        voiceListening = false;
        clearTimeout(voiceIdleTimer);
        micBtn.classList.remove('listening');
        if (komut.trim()) processVoiceCommand(komut);
    };

    // Sonuç gelmeden tanıma kendiliğinden bittiyse (sessizlik) süre dolana kadar dinlemeyi sürdür
    recognition.onend = () => {
        voiceRecRunning = false;
        if (!voiceListening || !isVoiceActive) return;
        if (Date.now() >= voiceDeadline) { endVoiceSession('idle'); return; }
        try { recognition.start(); } catch (e) {}
    };

    recognition.onerror = (ev) => {
        if (ev.error === 'no-speech' || ev.error === 'aborted') return;   // onend / sessizlik zamanlayıcısı halleder
        voiceListening = false;
        clearTimeout(voiceIdleTimer);
        micBtn.classList.remove('listening');
        const msg = { 'not-allowed': 'Mikrofon izni verilmedi. Tarayıcı ayarlarından izin verin.', 'service-not-allowed': 'Ses tanıma bu tarayıcıda kapalı.', 'audio-capture': 'Mikrofon bulunamadı.', 'network': 'Ses tanıma için internet bağlantısı gerekli.' }[ev.error];
        if (msg && typeof showToastGlobal === 'function') showToastGlobal('🎙️ ' + msg, 3500);
        endVoiceSession('error');
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

// Mikrofon tamamen kapanana kadar bekle (Android'de tanıma açıkken ses sentezi bozuluyor / atlanıyor)
async function waitRecEnd(maxMs = 600) {
    const t0 = Date.now();
    while (voiceRecRunning && Date.now() - t0 < maxMs) await vSleep(40);
}

function sesliOkuAsync(metin, myCmdId, appendSubtitle = false) {
    return new Promise(async (resolve) => {
        if (!isVoiceActive || myCmdId !== currentVoiceCmdId || !('speechSynthesis' in window)) return resolve();

        // Döngü kırıcı: aynı cümle 20 sn içinde 3 kez söylendiyse bir şey ters gidiyordur, oturumu kapat
        const now = Date.now();
        while (spokenLog.length && now - spokenLog[0].t > 30000) spokenLog.shift();
        const lastTwo = spokenLog.slice(-2);
        // Gerçek döngü: aynı cümle art arda 3. kez söylenmek üzere (araya başka bir cümle girmeden)
        if (lastTwo.length === 2 && lastTwo.every(x => x.text === metin)) {
            if (typeof showToastGlobal === 'function') showToastGlobal('🎙️ Sesli asistan kendini tekrar ettiği için kapatıldı', 3000);
            endVoiceSession('loop');
            return resolve();
        }
        spokenLog.push({ text: metin, t: now });

        stopListening();
        await waitRecEnd(600);
        if (!isVoiceActive || myCmdId !== currentVoiceCmdId) return resolve();

        showVoiceSubtitle(metin, appendSubtitle);
        const stopBtn = document.getElementById('voiceStopBtn');
        if (stopBtn) stopBtn.style.setProperty('display', 'block', 'important');

        let superseded = false;
        for (let attempt = 0; attempt < 3; attempt++) {
            window.speechSynthesis.cancel();
            await vSleep(90);                                   // cancel() hemen ardından speak() bazı Android sürümlerinde sesi yutuyor
            if (!isVoiceActive || myCmdId !== currentVoiceCmdId) { superseded = true; break; }

            const utterance = new SpeechSynthesisUtterance(metin);
            utterance.lang = 'tr-TR';
            utterance.rate = 1.5;
            currentUtter = utterance;
            const t0 = Date.now();
            const how = await new Promise((res) => {
                utterance.onend = () => res('end');
                utterance.onerror = (ev) => res((ev && ev.error) || 'error');
                window.speechSynthesis.speak(utterance);
            });
            if (currentUtter !== utterance) { superseded = true; break; }       // yerini yeni konuşmaya bıraktı
            if (how === 'interrupted' || how === 'canceled') { superseded = true; break; }

            // Beklenenden çok erken bittiyse ses atlanmıştır: yeniden dene
            const elapsed = Date.now() - t0;
            const expected = Math.max(700, metin.length * 45);
            if (elapsed >= expected * 0.3) break;
            await vSleep(350);
        }

        if (!superseded) {
            if (stopBtn) stopBtn.style.setProperty('display', 'none', 'important');
            hideVoiceSubtitle(5000);
        }
        resolve();
    });
}

// Asistanın kendi cümlesinin mikrofona karışıp komut sanılmasını önler
function isEchoOfOwnVoice(text) {
    const words = vNorm(text).split(' ').filter(Boolean);
    if (words.length < 3) return false;
    const now = Date.now();
    const bag = new Set();
    spokenLog.filter(x => now - x.t < 30000).forEach(x => vNorm(x.text).split(' ').forEach(w => { if (w.length > 2) bag.add(w.slice(0, 5)); }));
    if (!bag.size) return false;
    const sig = words.filter(w => w.length > 2);
    if (!sig.length) return false;
    const hit = sig.filter(w => bag.has(w.slice(0, 5))).length;
    return hit / sig.length >= 0.8;
}

// --- ANA İŞLEM DÖNGÜSÜ ---
async function processVoiceCommandInner(komut, preset) {
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

    let aiData = preset || null;      // yerel komut ayrıştırıcı bulduysa yapay zekaya gitme
    if (!aiData) try {
        const intentResult = await fetchFromGroq(intentSystemPrompt, komut, true);
        if(myCmdId !== currentVoiceCmdId) return;
        aiData = parseLooseJson(intentResult);
        if (!aiData || !aiData.intent) throw new Error('json');
    } catch (e) {
        if (e.message === "NO_KEY") return sesliOkuAsync("Lütfen ayarlardan API anahtarı ekleyin.", myCmdId, false);
        if (e.detail && typeof showToastGlobal === 'function') showToastGlobal("⚠️ " + e.detail, 5000);
        return sesliOkuAsync(e.message === "ALL_KEYS_FAILED" ? voiceErrorText(e) : "Komutu anlayamadım, tekrar söyler misiniz?", myCmdId, false);
    }

    if (aiData.ui_message && typeof showToastGlobal === 'function') showToastGlobal("🤖 " + aiData.ui_message, 4000);

    if (aiData.intent === "exit") { await finishByExit(myCmdId); return; }

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

            highlightCard(currentListedArticles[i]);     // okunan kartı ekranda vurgula + kaydır
            let shouldAppend = (i > 0);
            await sesliOkuAsync(finalSpokenText, myCmdId, shouldAppend);
            
            if (i < validSummaries.length - 1 && myCmdId === currentVoiceCmdId) {
                await new Promise(r => setTimeout(r, 1000)); 
            }
        }
        
        clearVoiceHighlights();
        if (myCmdId === currentVoiceCmdId) {
            const hint = voiceHintCount++ === 0
                ? "Detayını dinlemek istediğiniz haberin numarasını söyleyebilir, devam etmem için devam et diyebilirsiniz. Kapatmak için kapat demeniz yeterli."
                : "Numara söyleyebilir, devam et ya da kapat diyebilirsiniz.";
            await sesliOkuAsync(hint, myCmdId, true);
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
        
        await readWithScroll(res, myCmdId);          // okurken ilgili paragrafı vurgulayıp kaydırır
        clearVoiceHighlights();

        if (myCmdId === currentVoiceCmdId && isVoiceActive) {
            if (typeof closeModalSafe === 'function') closeModalSafe('newsModal');   // ana ekrana kendiliğinden dön
            await new Promise(r => setTimeout(r, 500));
            await sesliOkuAsync("Başka isteğiniz var mı?", myCmdId, true);
        }

    } catch(e) { 
        if (myCmdId === currentVoiceCmdId) {
            await sesliOkuAsync(e && e.detail ? voiceErrorText(e) : "Haberin detaylarını özetlerken bir sorun oluştu.", myCmdId, false);
            setTimeout(() => { if (myCmdId === currentVoiceCmdId && isVoiceActive && typeof closeModalSafe === 'function') closeModalSafe('newsModal'); }, 1000);
        }
    }
}


// ===================== SOHBET DÖNGÜSÜ, YEREL KOMUTLAR, OTOMATİK KAYDIRMA =====================

function stopListening() {
    voiceListening = false;
    clearTimeout(voiceIdleTimer); clearTimeout(voiceRestartTimer);
    if (voiceMicBtn) voiceMicBtn.classList.remove('listening');
    try { if (voiceRec) voiceRec.abort(); } catch (e) {}
}

// Asistan konuşmayı bitirince mikrofonu yeniden açar. followUp=true: Ayarlar'daki sessizlik süresi uygulanır (0 ise tekrar dinlemez).
function startListening(myCmdId, delay = 450, followUp = false) {
    if (!isVoiceActive || myCmdId !== currentVoiceCmdId || !voiceRec) return;
    let idle = voiceIdleMs();
    if (followUp && !idle) { endVoiceSession('done'); return; }
    if (!idle) idle = 8000;
    clearTimeout(voiceRestartTimer);
    const t0 = Date.now();
    const arm = () => {                                    // asistan hâlâ konuşuyorsa bekle, sonra mikrofonu aç
        if (!isVoiceActive || myCmdId !== currentVoiceCmdId) return;
        if ((window.speechSynthesis.speaking || window.speechSynthesis.pending) && Date.now() - t0 < 20000) { voiceRestartTimer = setTimeout(arm, 200); return; }
        voiceListening = true; voiceHeard = false;
        voiceDeadline = Date.now() + idle;
        if (voiceMicBtn) voiceMicBtn.classList.add('listening');
        clearTimeout(voiceIdleTimer);
        voiceIdleTimer = setTimeout(() => {
            if (isVoiceActive && voiceListening && !voiceHeard && myCmdId === currentVoiceCmdId) endVoiceSession('idle');
        }, idle);
        try { voiceRec.start(); } catch (e) {}
    };
    voiceRestartTimer = setTimeout(arm, delay);
}

function endVoiceSession(reason) {
    const wasActive = isVoiceActive;
    spokenLog.length = 0;
    isVoiceActive = false;
    currentVoiceCmdId++;
    try { window.speechSynthesis.cancel(); } catch (e) {}
    stopListening();
    const sb = document.getElementById('voiceStopBtn');
    if (sb) sb.style.setProperty('display', 'none', 'important');
    hideVoiceSubtitle(reason === 'idle' ? 1500 : 0);
    clearVoiceHighlights();
    if (wasActive && reason === 'idle' && typeof showToastGlobal === 'function') showToastGlobal('🎙️ Dinleme kapandı', 2000);
}

async function finishByExit(myCmdId) {
    await sesliOkuAsync('Tamam, görüşmek üzere.', myCmdId, false);
    const m = document.getElementById('newsModal');
    if (m && m.style.display === 'flex' && typeof closeModalSafe === 'function') closeModalSafe('newsModal');
    endVoiceSession('exit');
}

async function processVoiceCommand(komut) {
    const id = currentVoiceCmdId;
    if (!isVoiceActive) return;
    stopListening();
    const local = parseLocalIntent(komut);
    try {
        if (local && local.intent === 'exit') { await finishByExit(id); return; }
        await processVoiceCommandInner(komut, local);
    } catch (e) { console.warn('[sesli asistan]', e); }
    if (isVoiceActive && id === currentVoiceCmdId) startListening(id, 900, true);   // konuşma bitti -> yine dinle
}

// ---- Yerel komut ayrıştırıcı: çıkış / devam / haber numarası (yapay zekaya gitmeden, hızlı ve kotasız) ----
const VOICE_NUMS = { bir: 1, birinci: 1, ilk: 1, iki: 2, ikinci: 2, üç: 3, üçüncü: 3, dört: 4, dördüncü: 4, beş: 5, beşinci: 5, altı: 6, altıncı: 6, yedi: 7, yedinci: 7, sekiz: 8, sekizinci: 8, dokuz: 9, dokuzuncu: 9, on: 10, onuncu: 10 };
const VOICE_FILLERS = new Set(['haber', 'haberi', 'haberin', 'numara', 'numaralı', 'numaralıyı', 'nolu', 'no', 'detay', 'detayı', 'detayını', 'detaylarını', 'oku', 'okur', 'musun', 'aç', 'ver', 'anlat', 'dinle', 'dinlemek', 'istiyorum', 'lütfen', 'tamam', 'evet', 'şunu', 'bunu', 'olanı', 'olan']);
function vNorm(s) { return String(s).toLowerCase().replace(/[.,!?;:"“”'’()]/g, ' ').replace(/\s+/g, ' ').trim(); }

function parseLocalIntent(raw) {
    const t = vNorm(raw);
    if (!t) return null;
    const words = t.split(' ');
    const strongExit = /(^| )(kapat|kapatabilirsin|kapatın|kapatır mısın|bitir|bitti|yeter|çık|çıkabilirsin|çıkar mısın|çıkış|sus|susabilirsin|kapan|görüşürüz|hoşça kal|istemiyorum)( |$)/;
    const softExit = /^(tamam|evet tamam|hayır|yok|hayır teşekkürler|yok teşekkürler|teşekkürler|teşekkür ederim|sağ ol|sağol|gerek yok|başka bir şey yok|başka isteğim yok|hepsi bu|bu kadar|şimdilik bu kadar|tamam teşekkürler|tamam sağ ol)$/;
    if ((words.length <= 6 && strongExit.test(t)) || softExit.test(t)) return { intent: 'exit' };

    if (/^(tamam )?(devam( et| edelim| edin| et lütfen)?|sonraki( haber| haberler| haberleri)?|diğerleri|diğer haberler|başka( haber| haberler)?( var mı)?|sıradaki( haber| haberler)?)$/.test(t)) return { intent: 'continue', ui_message: 'Devam ediyorum' };

    if (currentListedArticles.length) {
        const rest = words.filter(w => !VOICE_FILLERS.has(w));
        if (rest.length === 1) {
            const w = rest[0].replace(/\.$/, '');
            let n = /^\d{1,2}$/.test(w) ? parseInt(w, 10) : VOICE_NUMS[w];
            if (!n) { const k = Object.keys(VOICE_NUMS).find(k => (/(nci|ncı|ncu|ncü)$/.test(k) || k === 'ilk') && w.startsWith(k)); if (k) n = VOICE_NUMS[k]; }   // ikinciyi, üçüncüyü, ilkini...
            if (n >= 1 && n <= currentListedArticles.length) return { intent: 'detail', list_index: n, ui_message: n + '. haberin detayı' };
        }
    }
    return null;
}

// ---- Vurgulama ve otomatik kaydırma ----
function clearVoiceHighlights() { document.querySelectorAll('.voice-reading').forEach(e => e.classList.remove('voice-reading')); }

function highlightCard(art) {
    clearVoiceHighlights();
    if (!art || !art.link) return;
    try {
        const el = document.querySelector('.swipe-wrapper[data-link="' + CSS.escape(art.link) + '"]');
        if (el) { el.classList.add('voice-reading'); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    } catch (e) {}
}

function vStems(s) { return new Set(vNorm(s).split(' ').filter(w => w.length > 3).map(w => w.slice(0, 5))); }
function bestParaIndex(sentence, paras, from) {
    if (!paras.length) return -1;
    const S = vStems(sentence);
    if (!S.size) return from;
    let best = -1, bs = 0;
    paras.forEach((p, i) => {
        const P = vStems(p.textContent);
        let n = 0; S.forEach(w => { if (P.has(w)) n++; });
        let sc = n / S.size + (i >= from ? 0.05 : 0);     // ilerlemeyi tercih et
        if (sc > bs) { bs = sc; best = i; }
    });
    return bs >= 0.2 ? best : from;
}

// Özeti cümle cümle okur; her cümleye en çok benzeyen haber paragrafını vurgulayıp ekranda kaydırır
async function readWithScroll(text, myCmdId) {
    const box = document.getElementById('fullTextContainer');
    const paras = box ? Array.from(box.querySelectorAll('.p-text')) : [];
    const raw = (String(text).match(/[^.!?…]+[.!?…]*/g) || [String(text)]).map(x => x.trim()).filter(x => x.length > 1);
    const chunks = [];
    for (const x of raw) { if (chunks.length && chunks[chunks.length - 1].length < 40) chunks[chunks.length - 1] += ' ' + x; else chunks.push(x); }
    let last = 0;
    for (let i = 0; i < chunks.length; i++) {
        if (!isVoiceActive || myCmdId !== currentVoiceCmdId) return;
        const idx = bestParaIndex(chunks[i], paras, last);
        if (idx >= 0) {
            last = idx;
            paras.forEach(p => p.classList.remove('voice-reading'));
            paras[idx].classList.add('voice-reading');
            try { paras[idx].scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
        }
        await sesliOkuAsync(chunks[i], myCmdId, false);
    }
}

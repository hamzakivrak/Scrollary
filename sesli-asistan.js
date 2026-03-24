// sesli-asistan.js - Sadece Kelime Araması Yapan, Filtrelere Dokunmayan Sürüm

let voiceReadLinks = new Set();
let lastVoiceCommand = "";
let isVoiceActive = false;
let currentVoiceCmdId = 0; 
let currentListedArticles = []; 

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

function sesliOkuAsync(metin, myCmdId) {
    return new Promise((resolve) => {
        if (!isVoiceActive || myCmdId !== currentVoiceCmdId || !('speechSynthesis' in window)) return resolve();
        
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(metin);
        utterance.lang = 'tr-TR';
        utterance.rate = 1.5; 

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

async function processVoiceCommand(komut) {
    let myCmdId = currentVoiceCmdId;
    if (!isVoiceActive) return;
    
    // YENİ PROMPT: Kaynakları da, konuları da sadece arama kutusuna yazdırıyoruz!
    const intentSystemPrompt = `Sen akıllı bir haber asistanısın. Kullanıcı komutunu SADECE JSON vererek analiz et.
    
    KURALLAR:
    1. Kullanıcı daha önce listelenen bir haberi (Örn: "2. haber", "ilk haberi aç") detaylandırmak istiyorsa intent: "detail", "list_index": [sayı] ver.
    2. Kullanıcı "devam et", "sonraki haberler" diyorsa intent: "continue".
    3. Kullanıcı YENİ bir konu veya bir kaynak adı söyleyerek arama istiyorsa intent: "search" yap. "search_query" alanına aranan konuyu veya kaynağın adını yaz. (Örn: "soma haberleri" -> "soma", "sözcü haberleri" -> "Sözcü", "iş kazası var mı" -> "iş kazası"). "haber, var mı, bul, göster" gibi kelimeleri sil!
    4. Kullanıcı "filtreleri sıfırla", "aramayı temizle", "tüm haberleri göster" derse intent: "clear" yap.
    5. ui_message: Ekranda belirecek kısa bilgi.
    
    JSON FORMATI: {"intent":"search|detail|continue|clear", "list_index": 1, "search_query":"", "ui_message":""}`;

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

    // EYLEM: DETAY
    if (aiData.intent === "detail" && aiData.list_index) {
        let index = aiData.list_index - 1;
        if (index < 0 || index >= currentListedArticles.length) {
            return sesliOkuAsync("Bahsettiğiniz sıradaki haberi hafızamda bulamadım. Lütfen aramayı tekrarlayın.", myCmdId);
        }
        let targetArticle = currentListedArticles[index];
        return await handleDeepResearch(targetArticle, aiData.list_index, myCmdId);
    } 
    // EYLEM: ARAMA, TEMİZLEME VEYA LİSTELEMEYE DEVAM ETME
    else {
        const searchInput = document.getElementById('searchInput');
        
        // EĞER ARAMAYI SIFIRLA DEDİYSE
        if (aiData.intent === "clear") {
            if (searchInput) searchInput.value = "";
            if(typeof handleSearch === 'function') handleSearch(true);
            await sesliOkuAsync("Aramayı temizledim, tüm haberleri listeliyorum...", myCmdId);
        }
        // EĞER YENİ ARAMA (SOMA veya SÖZCÜ) YAPILACAKSA
        else if (aiData.intent === "search") {
            if (searchInput) searchInput.value = aiData.search_query || "";
            // DİKKAT: Artık sistem filtreleriyle (activeSources) KESİNLİKLE OYNAMIYORUZ.
            // Sadece arama kutusuna yazıp handleSearch'i tetikliyoruz.
            if(typeof handleSearch === 'function') handleSearch(true);
            await sesliOkuAsync("İstediğiniz haberleri arıyorum...", myCmdId);
        }

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

            for (let i = 0; i < summaryArray.length; i++) {
                if (myCmdId !== currentVoiceCmdId || !isVoiceActive) break;
                
                voiceReadLinks.add(unread[i].link); 
                await sesliOkuAsync(summaryArray[i], myCmdId);
                
                if (i < summaryArray.length - 1 && myCmdId === currentVoiceCmdId) {
                    await new Promise(r => setTimeout(r, 1000)); 
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

async function handleDeepResearch(article, listIndex, myCmdId) {
    if(typeof openModal === 'function') openModal(article);
    
    sesliOkuAsync(`${listIndex}. haberin detaylarına iniyorum, lütfen bekleyin...`, myCmdId);

    let fullText = "";
    let isDone = false;
    let seconds = 0;

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
            sesliOkuAsync("Ekrandaki metinleri analiz ediyorum...", myCmdId);
        }
        if (seconds === 8 && !isDone) {
            sesliOkuAsync("Bağlantı biraz yavaş, haberin ekrana düşmesini bekliyorum...", myCmdId);
        }
    }

    if (myCmdId !== currentVoiceCmdId || !isVoiceActive) return;

    if (!isDone || !fullText || fullText.length < 50) {
        return await sesliOkuAsync("Maalesef sitenin güvenliği metni ekrana çekmeme izin vermedi. Sağ üstteki mavi oktan orijinal haberi açabilirsiniz.", myCmdId);
    }

    const detailPrompt = `Sen profesyonel bir haber spikerisin. Aşağıdaki metinden yararlanarak olayın ana detaylarını 3-4 cümleyle akıcı Türkçe ile özetle.
    Haber: ${article.title}
    Metin: ${fullText}`;

    try {
        const res = await fetchFromGroq(detailPrompt, "Özetle", false);
        if (myCmdId !== currentVoiceCmdId) return;
        voiceReadLinks.add(article.link); 
        await sesliOkuAsync(res, myCmdId);
    } catch(e) { 
        if (myCmdId === currentVoiceCmdId) await sesliOkuAsync("Haberin detaylarını özetlerken bir sorun oluştu.", myCmdId); 
    }
}

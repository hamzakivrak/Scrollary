// sesli-asistan.js - RAG Mimarisi, Yerel Filtreleme ve Zırhlı Buton Sürümü

let voiceReadLinks = new Set();
let lastVoiceCommand = "";
let checkSpeakingInterval; // Sustur butonunu hayatta tutacak döngü

document.addEventListener('DOMContentLoaded', () => {
    const micBtn = document.querySelector('.mic-fab');
    if (!micBtn) return;

    // 1. ZIRHLI SUSTUR BUTONUNU HAZIRLA
    let stopBtn = document.createElement('button');
    stopBtn.id = 'voiceStopBtn';
    stopBtn.innerHTML = '⏹️ Sustur';
    stopBtn.style.cssText = 'display:none; position:fixed; bottom:100px; right:30px; background:var(--danger); color:white; border:none; border-radius:8px; padding:12px 24px; font-weight:bold; font-size:1.1rem; z-index:9999; box-shadow:0 4px 15px rgba(239, 68, 68, 0.5); cursor:pointer; transition:0.3s;';
    document.body.appendChild(stopBtn);

    stopBtn.addEventListener('click', () => {
        window.speechSynthesis.cancel();
        stopBtn.style.display = 'none';
        clearInterval(checkSpeakingInterval);
        micBtn.classList.remove('listening');
    });

    // 2. SES TANIMA AYARLARI
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Tarayıcınız ses tanıma özelliğini desteklemiyor.");

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
        if (isContinuation && lastVoiceCommand) {
            komut = lastVoiceCommand; 
        } else {
            lastVoiceCommand = komut; 
        }
        
        processVoiceCommand(komut); 
    };

    recognition.onspeechend = () => { recognition.stop(); micBtn.classList.remove('listening'); };
    recognition.onerror = () => { recognition.stop(); micBtn.classList.remove('listening'); };
});

// ÇOKLU API ANAHTARI (FALLBACK) İSTEK MOTORU
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

    // Anahtarları sırayla dene, biri çökerse diğerine geç
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

            if (!response.ok) continue; // Hata varsa catch'e düşmeden sıradakine geç

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (e) { continue; }
    }
    throw new Error("ALL_KEYS_FAILED");
}

// ANA İŞLEM DÖNGÜSÜ
async function processVoiceCommand(komut) {
    // Mevcut kaynakların listesini alalım (Groq'a vermek için)
    const sourceNames = typeof RSS_FEEDS !== 'undefined' ? RSS_FEEDS.map(f => f.name) : [];

    // 1. AŞAMA: NİYET OKUMA (JSON)
    const intentSystemPrompt = `Sen bir arama asistanısın. Kullanıcının komutunu analiz et ve JSON formatında çıkar.
    MEVCUT KAYNAKLAR: ${sourceNames.join(', ')}
    
    KURALLAR:
    1. Kullanıcının komutunda bir arama kelimesi varsa "search_query" alanına yaz (Kaynağı buraya yazma).
    2. Kullanıcı "Sözcü", "Cumhuriyet" gibi belirli bir kaynak belirttiyse, MEVCUT KAYNAKLAR içinden tam eşleştirip "sources" dizisine ekle. Belirtmediyse boş dizi [] bırak.
    3. Kullanıcıya ana ekranda göstereceğimiz, ne aradığını belirten çok kısa ve havalı bir "ui_message" oluştur (Örn: "Sözcü gazetesinde maden haberleri aranıyor...").
    
    JSON ÇIKTISI OLUŞTUR:
    {
      "search_query": "aranacak kelime",
      "sources": ["Seçilen Kaynak"],
      "ui_message": "Ekranda belirecek bildirim metni"
    }`;

    let aiIntent;
    try {
        const intentResult = await fetchFromGroq(intentSystemPrompt, komut, true);
        aiIntent = JSON.parse(intentResult);
    } catch (e) {
        if (e.message === "NO_KEY") return sesliOku("Lütfen ayarlardan API anahtarınızı ekleyin.");
        return sesliOku("API bağlantı sorunu yaşıyorum.");
    }

    // 2. AŞAMA: ARAYÜZÜ (UI) VE FİLTRELERİ GÜNCELLE
    // Arama kutusunu doldur
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = aiIntent.search_query || "";

    // Kaynak filtrelerini uygula
    if (aiIntent.sources && aiIntent.sources.length > 0) {
        activeSources = aiIntent.sources;
        if(typeof saveActiveSources === 'function') saveActiveSources();
        if(typeof renderChips === 'function') renderChips();
    } else {
        // Eğer özel bir kaynak istenmediyse tüm kaynakları aktif et
        activeSources = sourceNames;
        if(typeof saveActiveSources === 'function') saveActiveSources();
        if(typeof renderChips === 'function') renderChips();
    }

    // Ekranda Eylem Bildirimini Göster (Kendi toast fonksiyonun)
    if(typeof showToastGlobal === 'function') {
        showToastGlobal("🤖 " + aiIntent.ui_message, 4000);
    }
    sesliOku(aiIntent.ui_message); // Haberi çekene kadar sesli olarak da bilgi versin

    // Arama fonksiyonunu tetikle (filteredArticles listesi güncellenecek)
    if(typeof handleSearch === 'function') handleSearch(true);

    // 3. AŞAMA: HABERLERİ SEÇ VE ÖZETLET
    // filteredArticles senin ana kodundan geliyor. Okunmamış olanları süzelim.
    let unreadArticles = [];
    if (typeof filteredArticles !== 'undefined') {
        unreadArticles = filteredArticles.filter(art => !voiceReadLinks.has(art.link));
    }

    if (unreadArticles.length === 0) {
        sesliOku("Bu kriterlere uygun okunmamış yeni bir haber bulamadım. Aramayı temizleyip tekrar deneyebilirsiniz.");
        return;
    }

    // En fazla 4 haberi Groq'a yolluyoruz (Token tasarrufu ve netlik için)
    let candidates = unreadArticles.slice(0, 4);
    let haberlerMetni = candidates.map((h, index) => `ID: ${index} | Kaynak: ${h.source} | Başlık: ${h.title} | Detay: ${h.description.substring(0, 100)}`).join("\n\n");

    const summaryPrompt = `Sen bir radyo haber spikerisin. Sana filtrelenmiş haberleri veriyorum.
    
    KURALLAR:
    1. Bu ${candidates.length} haberi akıcı bir radyo bülteni gibi özetle. Haberin detaylarına boğulma.
    2. "İşte haberler", "Özetliyorum" gibi girişler YAPMA. Direkt konuya gir.
    3. Aynı olaydan bahseden haberler varsa sadece birini anlat.
    4. Metninin EN SONUNA tam olarak şu formatta okuduğun haberlerin ID'sini ekle: [OKUNDU: 0, 1, 2]
    
    HABERLER:
    ${haberlerMetni}`;

    try {
        const summaryResult = await fetchFromGroq(summaryPrompt, "Haberleri özetle", false);
        
        // Gizli ID'leri bulup hafızaya atıyoruz ki bir daha okumasın
        const match = summaryResult.match(/\[OKUNDU:\s*([\d,\s]+)\]/);
        if (match) {
            const readIds = match[1].split(',').map(n => parseInt(n.trim()));
            readIds.forEach(id => {
                if (candidates[id]) voiceReadLinks.add(candidates[id].link);
            });
        }

        // ID kısmını metinden temizle
        const cleanSpeech = summaryResult.replace(/\[OKUNDU:.*?\]/g, '').trim();
        sesliOku(cleanSpeech);

    } catch (e) {
        sesliOku("Haberleri özetlerken bir bağlantı sorunu oluştu.");
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
    stopBtn.style.display = 'block';

    // Ölümsüz Buton Zırhı: Tarayıcı TTS motorunu saniyede iki kez kontrol eder
    clearInterval(checkSpeakingInterval);
    checkSpeakingInterval = setInterval(() => {
        // Eğer ses motoru konuşuyorsa veya kuyrukta bekleyen metin varsa butonu göster
        if(window.speechSynthesis.speaking || window.speechSynthesis.pending) {
            if(stopBtn.style.display !== 'block') stopBtn.style.display = 'block';
        } else {
            // Gerçekten bittiyse gizle ve döngüyü kır
            stopBtn.style.display = 'none';
            clearInterval(checkSpeakingInterval);
        }
    }, 500);

    utterance.onend = () => {
        stopBtn.style.display = 'none';
        clearInterval(checkSpeakingInterval);
    };

    utterance.onerror = () => {
        stopBtn.style.display = 'none';
        clearInterval(checkSpeakingInterval);
    };

    window.speechSynthesis.speak(utterance);
}

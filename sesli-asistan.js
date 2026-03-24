// sesli-asistan.js - Niyet Okuma, Derin Araştırma ve Akıllı Spiker Sürümü

let voiceReadLinks = new Set();
let lastVoiceCommand = "bana güncel haberleri özetle";

document.addEventListener('DOMContentLoaded', () => {
    const micBtn = document.querySelector('.mic-fab');
    if (!micBtn) return;

    // 1. ÖLÜMSÜZ SUSTUR BUTONU (Tarayıcı hatalarına karşı korumalı)
    let stopBtn = document.createElement('button');
    stopBtn.id = 'voiceStopBtn';
    stopBtn.innerHTML = '⏹️ Sustur';
    stopBtn.style.cssText = 'display:none; position:fixed; bottom:100px; right:30px; background:var(--danger); color:white; border:none; border-radius:8px; padding:12px 24px; font-weight:bold; font-size:1.1rem; z-index:4000; box-shadow:0 4px 15px rgba(239, 68, 68, 0.5); cursor:pointer; transition:0.3s;';
    document.body.appendChild(stopBtn);

    stopBtn.addEventListener('click', () => {
        window.speechSynthesis.cancel();
        stopBtn.style.display = 'none';
        micBtn.classList.remove('listening');
    });

    // Sesli okuma devam ettikçe butonu zorla ekranda tutan kontrolcü
    setInterval(() => {
        if(window.speechSynthesis.speaking) {
            if(stopBtn.style.display !== 'block') stopBtn.style.display = 'block';
        } else {
            if(stopBtn.style.display !== 'none') stopBtn.style.display = 'none';
        }
    }, 500);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Tarayıcınız ses tanıma özelliğini desteklemiyor.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'tr-TR'; 
    recognition.interimResults = false; 
    recognition.maxAlternatives = 1;

    micBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if(window.speechSynthesis.speaking) window.speechSynthesis.cancel();
        recognition.start();
        micBtn.classList.add('listening'); 
    });

    recognition.onresult = (event) => {
        let komut = event.results[0][0].transcript.toLowerCase();
        micBtn.classList.remove('listening'); 
        
        const isContinuation = komut.includes("devam") || komut.includes("başka") || komut.includes("sıradaki");
        if (isContinuation) komut = lastVoiceCommand; 
        else lastVoiceCommand = komut; 
        
        sesliOku("Hemen bakıyorum...");
        processVoiceCommand(komut); 
    };

    recognition.onspeechend = () => {
        recognition.stop();
        micBtn.classList.remove('listening');
    };

    recognition.onerror = (event) => {
        recognition.stop();
        micBtn.classList.remove('listening');
    };
});

async function processVoiceCommand(komut) {
    let apiKeys = [];
    const keysString = localStorage.getItem('groqApiKeys');
    if (keysString) {
        try {
            const parsed = JSON.parse(keysString);
            if (Array.isArray(parsed) && parsed.length > 0) apiKeys = parsed;
            else if (typeof parsed === 'string') apiKeys = [parsed];
        } catch (e) { console.error(e); }
    }

    if (apiKeys.length === 0) {
        sesliOku("Lütfen ayarlardan API anahtarınızı ekleyin.");
        return;
    }

    let currentPool = (typeof allArticles !== 'undefined' && allArticles.length > 0) ? allArticles : [];
    let unreadArticles = currentPool.filter(art => !voiceReadLinks.has(art.link));

    if (unreadArticles.length === 0) {
        sesliOku("Şu anda okunmamış yeni bir haber kalmadı.");
        return;
    }

    let candidates = unreadArticles.slice(0, 40);
    // Kaynak, Kategori ve Başlık bilgilerini Yapay Zekaya sunuyoruz
    let haberlerMetni = candidates.map((h, index) => {
        let catText = (h.categories && h.categories.length > 0) ? h.categories[0] : "Genel";
        return `ID: ${index} | Kaynak: ${h.source} | Kategori: ${catText} | Başlık: ${h.title}`;
    }).join("\n");

    // 2. NİYET OKUMA: Groq'tan JSON formatında yapılandırılmış karar istiyoruz
    const systemPrompt = `Sen akıllı bir analiz motorusun. Kullanıcının komutunu incele ve SADECE geçerli bir JSON formatında yanıt ver. 
    KULLANICI KOMUTU: "${komut}"
    
    HABER LİSTESİ:
    ${haberlerMetni}

    KURALLAR:
    1. Kullanıcı "detay", "içeriği", "ne olmuş", "açıkla" diyerek spesifik bir olayın derinlemesine analizini mi istiyor, yoksa sadece genel bir "özet/bülten" mi istiyor karar ver.
    2. Kullanıcı "Sözcü'den", "Ekonomi haberleri", "Maden kazası" gibi belirli bir kaynak veya konu istediyse SADECE listendeki ona uygun haberlerin ID'lerini seç. İstememişse en güncel olanları seç.
    3. Eğer Derin Araştırma isteniyorsa: "mode": "detail" yap ve sadece en alakalı 1 veya 2 ID'yi seç.
    4. Eğer Bülten/Özet isteniyorsa: "mode": "summary" yap, en fazla 3 ID seç. Seçtiğin bu haberleri radyo spikeri gibi, gereksiz girişler yapmadan, akıcı ve mükerrer olmayan bir dille "response_text" alanında Türkçe özetle.
    5. Eğer isteğe uygun haber yoksa "mode": "empty" yap.
    
    JSON FORMATI:
    {
      "mode": "summary" veya "detail" veya "empty",
      "ids": [Seçilen_ID_Numaraları],
      "response_text": "Sadece summary modundaysa radyo spikeri metni buraya yazılacak."
    }`;

    async function executeAI(keyIndex) {
        if (keyIndex >= apiKeys.length) {
            sesliOku("API anahtarlarınızın kotası doldu.");
            return;
        }

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKeys[keyIndex]}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant', 
                    messages: [{ role: 'system', content: systemPrompt }],
                    temperature: 0.3, // Daha kesin kararlar için düşürdük
                    response_format: { type: "json_object" } // YENİ: Kesin JSON çıktısı zorlaması
                })
            });

            if (!response.ok) throw new Error("Key limit reached");

            const data = await response.json();
            const aiDecision = JSON.parse(data.choices[0].message.content);

            // Kayıt İşlemi: Seçilenleri okundu işaretle
            if (aiDecision.ids && Array.isArray(aiDecision.ids)) {
                aiDecision.ids.forEach(id => {
                    if (candidates[id]) voiceReadLinks.add(candidates[id].link);
                });
            }

            if (aiDecision.mode === "empty" || !aiDecision.ids || aiDecision.ids.length === 0) {
                sesliOku("İstediğiniz kriterlere uygun yeni bir haber bulamadım.");
                return;
            }

            if (aiDecision.mode === "summary") {
                // BÜLTEN MODU: Zaten özetlenmiş metni direkt oku
                sesliOku(aiDecision.response_text || "Özet hazırlanırken bir hata oluştu.");
            } else if (aiDecision.mode === "detail") {
                // DERİN ARAŞTIRMA MODU: Arka planda siteye girip metni çekme operasyonu
                await handleDeepResearch(aiDecision.ids, candidates, apiKeys[keyIndex]);
            }

        } catch (error) {
            console.log("JSON veya API Hatası, sonraki key'e geçiliyor...", error);
            await executeAI(keyIndex + 1); 
        }
    }

    await executeAI(0);
}

// 3. HAYALET OKUYUCU (Arka Planda Metin Kazıma ve Derin Özet)
async function handleDeepResearch(ids, candidates, apiKey) {
    for (let i = 0; i < ids.length; i++) {
        const targetArticle = candidates[ids[i]];
        if (!targetArticle) continue;

        sesliOku(`${targetArticle.source} kaynağından detaylar çekiliyor, lütfen bekleyin...`);
        
        let fullText = null;
        const encodedUrl = encodeURIComponent(targetArticle.link);
        const proxies = [ 
            `https://corsproxy.io/?${encodedUrl}`, 
            `https://api.allorigins.win/raw?url=${encodedUrl}`,
            `https://api.codetabs.com/v1/proxy?quest=${encodedUrl}` 
        ];

        // 5 saniyede bir sesli bildirim yapmak için zamanlayıcı (kuyruğu bozmaması için sadece 1 kez)
        let waitingFeedback = setTimeout(() => {
            if(!fullText) sesliOku("Hala habere ulaşmaya çalışıyorum, güvenlik duvarı analiz ediliyor...");
        }, 7000);

        for (let proxy of proxies) {
            try {
                // Main script'teki fetchWithTimeout benzeri güvenli istek
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000);
                const res = await fetch(proxy, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (!res.ok) continue;
                const html = await res.text();
                if (html.includes('security service to protect itself') || html.length < 1000) continue;

                const parser = new DOMParser(); 
                const doc = parser.parseFromString(html, 'text/html'); 
                const pTags = Array.from(doc.querySelectorAll('p, .content p, .news-text p, article p'));
                const validText = pTags.map(p => p.textContent.trim()).filter(txt => txt.length > 70);
                
                if (validText.length > 0) {
                    fullText = [...new Set(validText)].join(' ').substring(0, 5000); // Max 5000 karakter
                    break; // Metni bulduk, proxy döngüsünden çık
                }
            } catch (err) { continue; } // Hata varsa diğer proxy'ye geç
        }

        clearTimeout(waitingFeedback);

        if (!fullText) {
            if (i < ids.length - 1) {
                sesliOku(`${targetArticle.source} sitesinin güvenlik duvarı aşılamadı, konuyu başka bir kaynakta arıyorum...`);
                continue; // Bir sonraki ID'ye geç
            } else {
                sesliOku(`Maalesef ${targetArticle.source} kaynağı metin çekilmesini engelledi ve alternatif bulamadım. İsterseniz başka bir konuyu özetleyebilirim.`);
                return;
            }
        }

        // Metin başarıyla çekildi, şimdi derin analiz için Groq'a gönderiyoruz
        sesliOku("Metin başarıyla alındı, analiz ediliyor...");
        
        const detailPrompt = `Sen bir uzman araştırmacı spikersin. Aşağıdaki haberin TAM METNİ'ni okuyarak olayın tüm detaylarını, nedenlerini, rakamları ve sonuçları akıcı bir dille sesli okunacak şekilde özetle.
        Haber Başlığı: ${targetArticle.title}
        Haber Kaynağı: ${targetArticle.source}
        Tam Metin: ${fullText}`;

        try {
            const detailRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant', 
                    messages: [{ role: 'system', content: detailPrompt }],
                    temperature: 0.4,
                    max_tokens: 600
                })
            });
            const detailData = await detailRes.json();
            sesliOku(detailData.choices[0].message.content);
            return; // Analizi başarıyla okuduk, işlemi bitir.
        } catch (e) {
            sesliOku("Analiz sırasında bir bağlantı sorunu oluştu.");
            return;
        }
    }
}

function sesliOku(metin) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); 
        const utterance = new SpeechSynthesisUtterance(metin);
        utterance.lang = 'tr-TR';
        utterance.rate = 1.0; 
        window.speechSynthesis.speak(utterance);
    } else {
        alert("Tarayıcınız sesli okuma özelliğini desteklemiyor.");
    }
}

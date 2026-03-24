// sesli-asistan.js - Akıllı Hafızalı, Spiker Modlu ve Çoklu Anahtar Destekli Sürüm

// Asistanın hafızası: Bu oturumda okunan haberlerin linklerini ve son komutu tutar
let voiceReadLinks = new Set();
let lastVoiceCommand = "bana güncel haberleri özetle";

document.addEventListener('DOMContentLoaded', () => {
    const micBtn = document.querySelector('.mic-fab');
    if (!micBtn) return;

    // Susturma butonunu DOM'a ekleyelim (Gizli olarak başlar)
    let stopBtn = document.createElement('button');
    stopBtn.id = 'voiceStopBtn';
    stopBtn.innerHTML = '⏹️ Sustur';
    stopBtn.style.cssText = 'display:none; position:fixed; bottom:100px; right:30px; background:var(--danger); color:white; border:none; border-radius:8px; padding:10px 20px; font-weight:bold; font-size:1rem; z-index:4000; box-shadow:0 4px 15px rgba(239, 68, 68, 0.4); cursor:pointer; transition:0.3s;';
    document.body.appendChild(stopBtn);

    stopBtn.addEventListener('click', () => {
        window.speechSynthesis.cancel();
        stopBtn.style.display = 'none';
        micBtn.classList.remove('listening');
    });

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
        
        // "Devam et" mantığı kontrolü
        const isContinuation = komut.includes("devam") || komut.includes("başka") || komut.includes("sıradaki");
        if (isContinuation) {
            komut = lastVoiceCommand; // Kullanıcının bir önceki asıl komutunu hatırlıyoruz
        } else {
            lastVoiceCommand = komut; // Yeni bir konu söylendiyse hafızaya al
        }
        
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
        if(event.error !== 'no-speech') {
            console.log("Ses anlaşılamadı:", event.error);
        }
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

    // Haberleri topla ve daha önce okunanları (hafızadaki linkleri) filtrele
    let currentPool = (typeof allArticles !== 'undefined' && allArticles.length > 0) ? allArticles : [];
    
    // Sadece okunmamış olanları alıyoruz
    let unreadArticles = currentPool.filter(art => !voiceReadLinks.has(art.link));

    if (unreadArticles.length === 0) {
        sesliOku("Şu anda bu konuyla veya akışta okunmamış yeni bir haber kalmadı.");
        return;
    }

    // Yapay zekaya sunmak için en güncel 30 okunmamış haberi alıyoruz
    let candidates = unreadArticles.slice(0, 30);
    
    // Her habere bir ID veriyoruz ki Groq hangisini okuduğunu bize söyleyebilsin
    let haberlerMetni = candidates.map((h, index) => `ID: ${index} | Kaynak: ${h.source} | Başlık: ${h.title}`).join("\n");

    const systemPrompt = `Sen bir akıllı araç içi radyo haber spikerisin.

KULLANICI İSTEĞİ: "${komut}"

KESİN KURALLARIN:
1. ASLA "İsteğinizi anladım", "İşte haberler" gibi giriş cümleleri kurma. Direkt haberin kendisine radyo spikeri gibi başla.
2. Haber başlıklarını ayrıca okuma. Haberin içeriğini 1-2 cümlelik akıcı bir özet haline getir.
3. Eğer farklı gazetelerde AYNI KONUYU anlatan haberler varsa, SADECE BİRİNİ seç. Mükerrer konu anlatma.
4. Aşağıdaki listeden kullanıcının isteğine uyan EN FAZLA 3 haberi seç ve özetle.
5. Metninin EN SONUNA, okuduğun haberlerin ID numaralarını tam olarak şu formatta ekle: [OKUNDU: 1, 4, 7]. Bu kural sistemin takibi için %100 zorunludur. Başka hiçbir şey yazma.

Haber Listesi:
${haberlerMetni}`;

    async function tryFetchWithKey(keyIndex) {
        if (keyIndex >= apiKeys.length) {
            sesliOku("Tüm API anahtarlarınızın kotası dolmuş veya bağlantı sorunu var.");
            return;
        }

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKeys[keyIndex]}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant', 
                    messages: [{ role: 'system', content: systemPrompt }],
                    temperature: 0.4,
                    max_tokens: 450
                })
            });

            if (!response.ok) throw new Error("Key limit reached");

            const data = await response.json();
            let rawReply = data.choices[0].message.content;

            // Groq'un ilettiği gizli ID'leri bulup hafızaya kaydediyoruz
            const match = rawReply.match(/\[OKUNDU:\s*([\d,\s]+)\]/);
            if (match) {
                const readIds = match[1].split(',').map(n => parseInt(n.trim()));
                readIds.forEach(id => {
                    if (candidates[id]) {
                        voiceReadLinks.add(candidates[id].link); // Linki hafızaya al
                    }
                });
            }

            // Gizli ID metnini sesli okunmaması için metinden siliyoruz
            let cleanSpeech = rawReply.replace(/\[OKUNDU:.*?\]/g, '').trim();

            if (!cleanSpeech) cleanSpeech = "İstediğiniz kritere uygun yeni bir haber bulamadım.";

            sesliOku(cleanSpeech);

        } catch (error) {
            await tryFetchWithKey(keyIndex + 1); 
        }
    }

    await tryFetchWithKey(0);
}

function sesliOku(metin) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Önceki konuşmayı kes
        
        const utterance = new SpeechSynthesisUtterance(metin);
        utterance.lang = 'tr-TR';
        utterance.rate = 1.0; 
        
        const stopBtn = document.getElementById('voiceStopBtn');
        
        utterance.onstart = () => {
            if(stopBtn) stopBtn.style.display = 'block'; // Konuşma başlarken butonu göster
        };
        
        utterance.onend = () => {
            if(stopBtn) stopBtn.style.display = 'none'; // Konuşma bitince butonu gizle
        };
        
        utterance.onerror = () => {
            if(stopBtn) stopBtn.style.display = 'none';
        };

        window.speechSynthesis.speak(utterance);
    } else {
        alert("Tarayıcınız sesli okuma özelliğini desteklemiyor.");
    }
}

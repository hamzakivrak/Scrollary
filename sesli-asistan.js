// sesli-asistan.js - Çoklu API Anahtarı (Fallback) Destekli Sürüm

document.addEventListener('DOMContentLoaded', () => {
    const micBtn = document.querySelector('.mic-fab');
    if (!micBtn) return;

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
        }
        
        recognition.start();
        micBtn.classList.add('listening'); 
    });

    recognition.onresult = (event) => {
        const komut = event.results[0][0].transcript.toLowerCase();
        micBtn.classList.remove('listening'); 
        
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
    // 1. ADIM: Tüm API Anahtarlarını Listeye Al
    let apiKeys = [];
    const keysString = localStorage.getItem('groqApiKeys');
    
    if (keysString) {
        try {
            const parsed = JSON.parse(keysString);
            if (Array.isArray(parsed) && parsed.length > 0) {
                apiKeys = parsed;
            } else if (typeof parsed === 'string') {
                apiKeys = [parsed]; // Eski kayıtlar düz metinse listeye çevir
            }
        } catch (e) {
            console.error("API Anahtarı okunurken hata oluştu:", e);
        }
    }

    if (apiKeys.length === 0) {
        sesliOku("Lütfen ayarlar menüsünden Groq API anahtarınızı ekleyin.");
        alert("Groq API Anahtarı bulunamadı veya okunamadı! Lütfen ayarlardan anahtarınızı kontrol edin.");
        return;
    }

    let haberlerMetni = "";
    
    // 2. ADIM: Haber Verilerini Çek
    if (typeof allArticles !== 'undefined' && allArticles.length > 0) {
        const secilenHaberler = allArticles.slice(0, 25); 
        haberlerMetni = secilenHaberler.map(h => `Başlık: ${h.title} | Kaynak: ${h.source}`).join("\n");
    } else {
        const baslikElementleri = document.querySelectorAll('.news-content h3');
        const basliklar = Array.from(baslikElementleri).map(el => el.innerText).slice(0, 25);
        haberlerMetni = basliklar.join("\n");
    }

    if (!haberlerMetni) {
        sesliOku("Şu anda okunacak güncel bir haber bulamadım.");
        return;
    }

    const systemPrompt = `Sen bir akıllı araç içi sesli haber spikerisin.
Kullanıcının senden istediği şey: "${komut}"

Görevlerin:
1. Sadece aşağıda verdiğim haber listesini kullan.
2. Kullanıcının isteğini analiz et (örneğin "maden" dediyse sadece maden haberlerini, "tümünü özetle" dediyse genel bir özet çıkar).
3. Eğer kullanıcının aradığı konuyla ilgili haber yoksa sadece "Şu anki akışta bu konuyla ilgili yeni bir haber bulunmuyor" de.
4. ASLA çok uzun konuşma. Seçtiğin haberleri 2-3 cümlelik, radyo spikeri gibi akıcı ve doğal bir dille kısaca özetle. Haberin detaylarına girme.

Haber Listesi:
${haberlerMetni}`;

    // 3. ADIM: Çoklu Anahtar (Fallback) Döngüsü
    async function tryFetchWithKey(keyIndex) {
        // Eğer denenecek anahtar kalmadıysa uyar ve işlemi bitir
        if (keyIndex >= apiKeys.length) {
            console.warn("Tüm anahtarların kotası dolmuş veya geçersiz.");
            sesliOku("Ekli olan tüm API anahtarlarınızın kotası dolmuş veya bir bağlantı sorunu var. Lütfen ayarlardan yeni bir anahtar ekleyin.");
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
                    model: 'llama3-8b-8192', 
                    messages: [
                        { role: 'system', content: systemPrompt }
                    ],
                    temperature: 0.5,
                    max_tokens: 350
                })
            });

            // Yanıt 200 OK değilse (Limit aşımı vs.) kasten hata fırlat ki catch bloğuna düşsün
            if (!response.ok) throw new Error("API Limit veya Bağlantı Hatası");

            const data = await response.json();
            const yapayZekaYaniti = data.choices[0].message.content;

            // Başarılı olursa spiker okumaya başlasın
            sesliOku(yapayZekaYaniti);

        } catch (error) {
            console.warn(`${keyIndex + 1}. anahtar başarısız oldu, listedeki bir sonraki anahtara geçiliyor...`);
            // Çökerse listedeki bir sonraki anahtarı (keyIndex + 1) dene
            await tryFetchWithKey(keyIndex + 1); 
        }
    }

    // İlk anahtardan (0. index) denemeye başla
    await tryFetchWithKey(0);
}

function sesliOku(metin) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(metin);
        utterance.lang = 'tr-TR';
        utterance.rate = 1.0; 
        utterance.pitch = 1.0; 
        
        window.speechSynthesis.speak(utterance);
    } else {
        alert("Tarayıcınız sesli okuma özelliğini desteklemiyor.");
    }
}

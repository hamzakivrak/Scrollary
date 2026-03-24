// sesli-asistan.js - Tamamlanmış Sürüm (Dinleme + Zeka + Konuşma)

// Kendi Groq API anahtarını buraya yapıştır
const ASISTAN_GROQ_KEY = "BURAYA_GROQ_API_ANAHTARINI_YAZ"; 

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
        
        // Eğer o an konuşan bir yapay zeka varsa onu sustur ve yeniden dinlemeye başla
        if(window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
        
        recognition.start();
        micBtn.classList.add('listening'); 
    });

    recognition.onresult = (event) => {
        const komut = event.results[0][0].transcript.toLowerCase();
        micBtn.classList.remove('listening'); 
        
        // Komut alındığında kullanıcıya sesli bir onay verelim
        sesliOku("Hemen bakıyorum...");
        
        // Yapay zeka sürecini başlat
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

// YENİ BÖLÜM: YAPAY ZEKA VE HABER FİLTRELEME MANTIĞI
async function processVoiceCommand(komut) {
    let haberlerMetni = "";
    
    // Güvenlik Önlemi: allArticles dizisi hazır değilse doğrudan ekrandaki başlıkları topla
    if (typeof allArticles !== 'undefined' && allArticles.length > 0) {
        const secilenHaberler = allArticles.slice(0, 25); // Çok fazla token harcamamak için ilk 25 haber
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

    // Groq'a vereceğimiz gizli direktif (Sistem Promptu)
    const systemPrompt = `Sen bir akıllı araç içi sesli haber spikerisin.
Kullanıcının senden istediği şey: "${komut}"

Görevlerin:
1. Sadece aşağıda verdiğim haber listesini kullan.
2. Kullanıcının isteğini analiz et (örneğin "maden" dediyse sadece maden haberlerini, "tümünü özetle" dediyse genel bir özet çıkar).
3. Eğer kullanıcının aradığı konuyla ilgili haber yoksa sadece "Şu anki akışta bu konuyla ilgili yeni bir haber bulunmuyor" de.
4. ASLA çok uzun konuşma. Seçtiğin haberleri 2-3 cümlelik, radyo spikeri gibi akıcı ve doğal bir dille kısaca özetle. Haberin detaylarına girme.

Haber Listesi:
${haberlerMetni}`;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ASISTAN_GROQ_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama3-70b-8192', // Veya kendi kullandığın hızlı Groq modeli
                messages: [
                    { role: 'system', content: systemPrompt }
                ],
                temperature: 0.5,
                max_tokens: 300 // Yanıtı kısa tutmaya zorluyoruz
            })
        });

        if (!response.ok) throw new Error("API Yanıt Hatası");

        const data = await response.json();
        const yapayZekaYaniti = data.choices[0].message.content;

        // Groq'tan gelen zekice yazılmış cevabı hoparlörden oku
        sesliOku(yapayZekaYaniti);

    } catch (error) {
        console.error("Groq Asistan Hatası:", error);
        sesliOku("Bağlantı sorunu nedeniyle şu an özet yapamıyorum.");
    }
}

// YENİ BÖLÜM: METNİ SESE ÇEVİRME (TEXT-TO-SPEECH)
function sesliOku(metin) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(metin);
        utterance.lang = 'tr-TR';
        utterance.rate = 1.0; // Konuşma hızı (İstersen 1.1 veya 1.2 yapıp hızlandırabilirsin)
        utterance.pitch = 1.0; // Sesin kalınlık/incelik tonu
        
        window.speechSynthesis.speak(utterance);
    } else {
        alert("Tarayıcınız sesli okuma özelliğini desteklemiyor.");
    }
}

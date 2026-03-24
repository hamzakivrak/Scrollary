// sesli-asistan.js - Adım 1: Sesi Dinleme ve Yazıya Çevirme

document.addEventListener('DOMContentLoaded', () => {
    // HTML'deki mikrofon butonunu buluyoruz
    const micBtn = document.querySelector('.mic-fab');
    
    // Eğer sayfada mikrofon butonu yoksa boşuna çalışma
    if (!micBtn) return;

    // Tarayıcının yerleşik Ses Tanıma (Speech API) motorunu hazırlıyoruz
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        alert("Tarayıcınız ses tanıma özelliğini desteklemiyor. Lütfen Chrome veya Safari kullanın.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'tr-TR'; // Türkçe dinle
    recognition.interimResults = false; // Sadece konuşma bitince tek seferde sonucu ver
    recognition.maxAlternatives = 1;

    // 1. AŞAMA: Butona basıldığında dinlemeyi başlat
    micBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Varsayılan tıklama olaylarını engelle
        recognition.start();
        micBtn.classList.add('listening'); // CSS'teki kırmızı yanıp sönme efektini başlat
    });

    // 2. AŞAMA: Söylediğin söz metne başarıyla çevrildiğinde
    recognition.onresult = (event) => {
        const komut = event.results[0][0].transcript.toLowerCase(); // Metni al ve küçük harfe çevir
        micBtn.classList.remove('listening'); // Yanıp sönme efektini durdur
        
        // Mobilden test edebilmen için geçici olarak ekrana uyarı veriyoruz:
        alert("Seni duydum! Komutun: " + komut);
        
        // ---- İKİNCİ AŞAMADA GROQ API KODLARINI BURAYA YAZACAĞIZ ----
        // processVoiceCommand(komut); 
    };

    // 3. AŞAMA: Konuşma bittiğinde veya mikrofon kapandığında
    recognition.onspeechend = () => {
        recognition.stop();
        micBtn.classList.remove('listening');
    };

    // 4. AŞAMA: Bir hata olursa (sessizlik, izin verilmemesi vs.)
    recognition.onerror = (event) => {
        recognition.stop();
        micBtn.classList.remove('listening');
        
        // Sadece izin hatası değilse uyarı ver (bazen yanlışlıkla basılıp kapatılıyor)
        if(event.error !== 'no-speech') {
            alert("Sesi tam anlayamadım veya mikrofon izni yok. Hata: " + event.error);
        }
    };
});

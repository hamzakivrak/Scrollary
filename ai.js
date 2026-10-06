// ai.js (Final Sürüm: Sohbet + Akıllı Metin Bulma + Çeviri + Ses + Özel Prompt Yönetimi)

const ttsLangMap = { 'EN': 'en-US', 'TR': 'tr-TR', 'DE': 'de-DE', 'ES': 'es-ES', 'FR': 'fr-FR', 'RU': 'ru-RU', 'AR': 'ar-SA', 'HI': 'hi-IN' };

// ==========================================
// YENİ: YAPAY ZEKA SABİT KOMUTLARI (PROMPTS) YÖNETİCİSİ
// ==========================================
const DEFAULT_AI_PROMPTS = {
    chatAssistant: `Sen üst düzey bir dijital haber editörü ve stratejistisin. 
GÖREVİN: Haberi analiz edip, okuyucuya en profesyonel "Haber Özeti" raporunu sunmak.

KURAL 1: Yanıtlarını mutlaka aşağıdaki profesyonel HTML yapısında kur.
KURAL 2: Önemli kavramları veya kritik verileri <span class="badge-blue">Önemli</span> veya <span class="badge-red">Kritik</span> sınıflarıyla vurgula.
KURAL 3: Markdown (** veya ## gibi) KESİNLİKLE kullanma. Sadece sağladığım HTML etiketlerini kullan.

YAPI TASLAĞI:
<div class="summary-card">
   <div class="card-header">📊 HABER ÖZETİ & ANALİZ</div>
   <p class="card-intro">...haberin ana fikrini anlatan, okuyucuyu bilgilendiren güçlü bir giriş cümlesi...</p>
   
   <div class="card-section">
      <h4>📌 Temel Gelişmeler</h4>
      <ul class="card-list">
         <li>Buraya önemli bir madde...</li>
         <li>Buraya diğer önemli madde...</li>
      </ul>
   </div>

   <div class="card-section">
      <h4>🔍 Detaylar ve Arkaplan</h4>
      <p>Gerekiyorsa burada ek bir alt başlık veya açıklayıcı paragraf sunabilirsin.</p>
   </div>

   <div class="card-section">
      <h4>💡 Uzman Görüşü / Sonuç</h4>
      <ul class="card-list">
         <li>Haberin olası etkileri veya sonucu...</li>
      </ul>
   </div>
</div>

NOT: Haberin uzunluğuna göre birden fazla <div class="card-section"> ve <h4> kullanabilirsin. Listeleri her zaman <ul><li> yapısında kur.`,
    voiceIntent: `Sen akıllı bir haber asistanısın. Kullanıcı komutunu SADECE JSON vererek analiz et.\n\nKURALLAR:\n1. DETAY: Kullanıcı daha önce listelenen spesifik bir haberin detayını, tamamını veya içeriğini istiyorsa (Örn: "3. haberin detayını ver", "ikinciyi oku", "ilk haberi aç") intent: "detail" yap ve "list_index" alanına o haberin numarasını SAYI olarak yaz (Örn: 3).\n2. DEVAM ET: Kullanıcı listeye devam edilmesini istiyorsa (Örn: "devam et", "sonraki haberler", "başka var mı") intent: "continue" yap.\n3. GENEL LİSTE/ÖZET: Kullanıcı genel gündemi soruyorsa (Örn: "gündemi özetle", "haber oku") intent: "general_list" yap.\n4. YENİ ARAMA: Kullanıcı spesifik bir konu/kaynak arıyorsa intent: "search" yap.\n   - ÇOK ÖNEMLİ: "search_query" kısmına SADECE salt anahtar kelimeyi yaz. "haber", "haberleri", "haberler", "var mı", "aç", "göster", "oku" kelimelerini KESİNLİKLE ÇIKAR!\n   - (Örn: "sözcü haberleri aç" -> "sözcü")\n   - (Örn: "iş kazası haberleri var mı" -> "iş kazası")\n5. ui_message: Ekranda belirecek çok kısa bilgi mesajı.\n\nJSON FORMATI: {"intent":"search|detail|continue|general_list", "list_index": 1, "search_query":"", "ui_message":""}`,
    voiceSummary: `Sen bir spikersin. Aşağıdaki haberleri incele. BİREBİR AYNI konuyu anlatan kopya haberler varsa sadece birini tut, kopyaları yoksay.\nKalan benzersiz haberlerin her birini sadece 1 cümleyle özetle.\nSADECE JSON formatında bir dizi dön. Format şu şekilde olmalı:\n[{"id": 0, "summary": "Özet metni..."}, {"id": 2, "summary": "Özet metni..."}]`,
    voiceDetail: `Sen profesyonel bir haber spikerisin. Aşağıdaki metinden yararlanarak olayın ana detaylarını 3-4 cümleyle akıcı Türkçe ile özetle.`,
    textFinder: `Sana bir haberin özetini ve başlığını veriyorum. Bana internetteki eğitim verinden yararlanarak bu haberin GERÇEK TAM METNİNİ BUL VE VER.\nKURAL 1: Kesinlikle uydurma (Halüsinasyon yok). Eğer haberin tam metnini net hatırlamıyorsan veya güncel (Eğitim verinden sonraki) bir haber ise, kesinlikle açıkça "Bu haberin tam metnine internet hafızamdan erişemedim" de.\nKURAL 2: Yanıtını paragraflar halinde ver. Markdown KULLANMA.\nKURAL 3: Sadece haber metnini ver, yorum yapma.`,
    rssFinder: `Kullanıcı "{topic}" konularında haber okumak istiyor. Bana bu alanla ilgili popüler, güvenilir ve gerçekten çalışan 4 adet RSS akışı URL'si bul. Öncelikle Türkçe kaynaklar olsun, bulamazsan İngilizce ver. YANITINI SADECE VE SADECE JSON FORMATINDA DİZİ (ARRAY) OLARAK VER. Başka tek bir kelime bile yazma. Örnek Çıktı Formatı: [{"name": "DonanımHaber", "url": "https://www.donanimhaber.com/rss/tum"}, {"name": "Webtekno", "url": "https://www.webtekno.com/rss.xml"}]`
};

function getAIPrompt(key) {
    const savedPrompts = JSON.parse(localStorage.getItem('customAIPrompts')) || {};
    return savedPrompts[key] || DEFAULT_AI_PROMPTS[key];
}

function initAIPromptsUI() {
    Object.keys(DEFAULT_AI_PROMPTS).forEach(key => {
        const el = document.getElementById('prompt_' + key);
        if(el) el.value = getAIPrompt(key);
    });
}

function saveAIPrompts() {
    const newPrompts = {};
    Object.keys(DEFAULT_AI_PROMPTS).forEach(key => {
        const el = document.getElementById('prompt_' + key);
        if(el) newPrompts[key] = el.value.trim();
    });
    localStorage.setItem('customAIPrompts', JSON.stringify(newPrompts));
    if(typeof showToastGlobal === 'function') showToastGlobal("✅ Yapay Zeka Komutları Kaydedildi!", 3000);
}

function resetAIPrompts() {
    if(!confirm("Tüm Yapay Zeka komutlarını fabrika ayarlarına döndürmek istediğinize emin misiniz? Kendi yazdığınız komutlar silinecek.")) return;
    localStorage.removeItem('customAIPrompts');
    initAIPromptsUI();
    if(typeof showToastGlobal === 'function') showToastGlobal("🔄 Varsayılan komutlara dönüldü!", 3000);
}

document.addEventListener('DOMContentLoaded', initAIPromptsUI);


// ==========================================
// GROQ ORTAK İSTEMCİ (v3.2)
// llama-3.3-70b-versatile Groq'ta 16 Ağu 2026'da kaldırıldı -> tüm istekler hata veriyordu.
// Model değişirse sadece bu listeyi güncelle. Sırayla denenir.
// ==========================================
// Üretim modelleri önce; qwen Groq'ta 'preview' (önizleme) olduğu için son yedek.
const GROQ_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.6-27b'];
const GROQ_MODELS_FAST = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3.6-27b'];   // sesli asistan: hızlı küçük model önce
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Döndürür: metin. Hata olursa Türkçe, GERÇEK sebebi söyleyen bir Error fırlatır.
// opts: { temperature, maxTokens, json (JSON modu), models (sıra) }
async function groqChat(messages, { temperature = 0.5, maxTokens = 2048, json = false, models = GROQ_MODELS } = {}) {
    const keys = JSON.parse(localStorage.getItem('groqApiKeys')) || [];
    if (!keys.length) throw new Error('API anahtarı eksik. Ayarlardan Groq anahtarı ekleyin.');
    let lastReason = 'Bilinmeyen hata';
    let useJson = json;
    let badKeys = 0;

    const once = async (model, key) => {
        const body = { model, messages, temperature, max_tokens: maxTokens };
        if (useJson) body.response_format = { type: 'json_object' };
        if (model.startsWith('openai/gpt-oss')) body.reasoning_effort = 'low';
        const res = await fetchWithTimeout(GROQ_URL, 30000, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (res.ok) {
            const data = await res.json();
            let text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
            text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
            return text ? { text } : { fail: 'Model boş yanıt döndürdü', next: 'key' };
        }
        let detail = '';
        try { detail = ((await res.json()).error || {}).message || ''; } catch (e) {}
        console.warn('[Groq]', model, res.status, detail);
        if (res.status === 429) return { fail: 'Kota/limit doldu (429). Birkaç dakika sonra deneyin.', next: 'key' };
        if (res.status === 401) return { fail: 'API anahtarı geçersiz (401).', next: 'key', badKey: true };
        if (res.status === 413) return { fail: 'Haber çok uzun (413).', next: 'key' };
        if (res.status === 400 && useJson && /json|response_format/i.test(detail)) { useJson = false; return { retry: true }; }   // model JSON modunu desteklemiyor
        if (res.status === 404 || (res.status === 400 && /model/i.test(detail))) return { fail: `Model kullanılamıyor: ${model}`, next: 'model' };
        return { fail: `Sunucu hatası (${res.status}) ${detail}`.trim(), next: 'key' };
    };

    for (const model of models) {
        modelLoop: for (const key of keys) {
            for (let attempt = 0; attempt < 2; attempt++) {
                try {
                    const r = await once(model, key);
                    if (r.text) return r.text;
                    if (r.retry) continue;                       // JSON modu kapatıldı, aynı anahtarla yeniden dene
                    lastReason = r.fail;
                    if (r.badKey) badKeys++;
                    if (r.next === 'model') break modelLoop;
                } catch (e) {
                    lastReason = e.name === 'AbortError' ? 'Zaman aşımı, tekrar deneyin.' : 'Bağlantı hatası (internet/engelleyici?).';
                }
                break;
            }
        }
        if (badKeys >= keys.length) break;   // tüm anahtarlar geçersizse model değiştirmek işe yaramaz
    }
    throw new Error(lastReason);
}

// ==========================================
// 1. YAPAY ZEKA SOHBET & ÖZET (BİRLEŞTİRİLMİŞ)
// ==========================================

let currentArticleChatHistory = []; 
let currentArticleContext = "";   

function resetArticleChat(fullText, description) {
    currentArticleChatHistory = []; 
    if (fullText.length > 100) {
        currentArticleContext = fullText.substring(0, 7000); 
    } else {
        currentArticleContext = "TAM METİN ÇEKİLEMEDİ. HABER ÖZETİ: " + description;
    }
    
    const historyDiv = document.getElementById('aiChatHistory');
    if (historyDiv) {
        historyDiv.innerHTML = ''; 
    }
}

async function handleAIRequest() {
    const resultModal = document.getElementById('aiInlineResult');
    if (resultModal) resultModal.classList.add('show');
    
    if (currentArticleChatHistory.length > 0) return; 

    await getAIResponseWithHistory("Bu haberi benim için özetle ve en önemli detayları maddeler halinde listele.");
}

async function handleNewChatMessage(inputId = 'aiChatInput') {
    const inputEl = document.getElementById(inputId);
    const userInput = inputEl.value.trim();
    if (!userInput) return;

    const resultModal = document.getElementById('aiInlineResult');
    if (resultModal) {
        resultModal.classList.add('show');
        resultModal.style.display = 'flex';
    }

    const historyDiv = document.getElementById('aiChatHistory');
    historyDiv.insertAdjacentHTML('beforeend', `<div class="ai-msg user">${escapeHtml(userInput)}</div>`);
    
    if (inputId === 'aiChatInputInner') {
        inputEl.value = ''; 
    } else {
        const innerInput = document.getElementById('aiChatInputInner');
        if(innerInput) innerInput.value = ''; 
    }
    
    historyDiv.scrollTop = historyDiv.scrollHeight; 

    await getAIResponseWithHistory(userInput);
}

async function getAIResponseWithHistory(query) {
    const historyDiv = document.getElementById('aiChatHistory');
    const sendBtn = document.getElementById('aiChatSendBtn');
    
    const apiKeys = JSON.parse(localStorage.getItem('groqApiKeys')) || [];
    if (apiKeys.length === 0) {
        historyDiv.insertAdjacentHTML('beforeend', `<div class="ai-msg assistant" style="background: var(--danger);">⚠️ API anahtarı eksik. Ayarlardan Groq API anahtarı ekleyin.</div>`);
        return;
    }

    if(sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerText = "⏳";
    }

    const loadingDiv = document.createElement('div');
    loadingDiv.className = "ai-msg assistant loading";
    loadingDiv.innerText = "🤖 Düşünüyor...";
    historyDiv.appendChild(loadingDiv);
    historyDiv.scrollTop = historyDiv.scrollHeight;

    const systemPrompt = getAIPrompt('chatAssistant');

    let messagesPayload = [
        { role: "system", content: systemPrompt },
        { role: "user", content: `[HABER METNİ/ÖZETİ]:\n${currentArticleContext}` }
    ];

    messagesPayload.push(...currentArticleChatHistory);
    messagesPayload.push({ role: "user", content: query });

    try {
        const text = await groqChat(messagesPayload, { temperature: 0.5, maxTokens: 2048 });
        const cleanHtml = text.replace(/```html/g, '').replace(/```/g, '').trim();
        loadingDiv.remove();
        historyDiv.insertAdjacentHTML('beforeend', `<div class="ai-msg assistant">${cleanHtml}</div>`);
        currentArticleChatHistory.push({ role: "user", content: query });
        currentArticleChatHistory.push({ role: "assistant", content: cleanHtml });
    } catch (err) {
        loadingDiv.innerText = "⚠️ " + err.message;
    }
    if(sendBtn) { sendBtn.disabled = false; sendBtn.innerText = "Gönder"; }
    historyDiv.scrollTop = historyDiv.scrollHeight;
}

function closeAIResult() {
    const modal = document.getElementById('aiInlineResult');
    if(modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

// ==========================================
// 2. AKILLI METİN BULUCU (FALLBACK)
// ==========================================

async function attemptToFindMissingTextWithAI(art, textContainer) {
    textContainer.innerHTML = `<div class="loading-pulse" style="padding: 20px; text-align: center; color: var(--accent);">⚠️ Sitenin güvenlik duvarı aşılamadı.<br><br>🤖 Yapay zeka bu haberin tam metnini internet hafızasından bulmaya çalışıyor...</div>`;
    
    const apiKeys = JSON.parse(localStorage.getItem('groqApiKeys')) || [];
    if (apiKeys.length === 0) {
        textContainer.innerHTML = `<div class="status-msg">⚠️ Metni AI ile tamamlamak için Ayarlar'dan API anahtarı eklemelisiniz.</div>`;
        return;
    }

    const prompt = getAIPrompt('textFinder') + `\n\nHaber Başlığı: ${art.title}\nHaber Özeti: ${art.description}`;

    const showSummaryOnly = (msg) => {
        textContainer.innerHTML = `<div class="status-msg" style="padding:15px; border-radius:8px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3);">${escapeHtml(msg)}</div><p style="padding:15px; font-size:1.1rem; line-height:1.6;">${escapeHtml(art.description)}</p>`;
        resetArticleChat(art.description, art.description);
    };
    try {
        const aiFoundText = (await groqChat([{ role: "user", content: prompt }], { temperature: 0.1, maxTokens: 2500 })).trim();
        if (aiFoundText.includes("internet hafızamdan erişemedim") || aiFoundText.length <= art.description.length + 50) {
            showSummaryOnly("🤖 Yapay zeka bu haberin tam metnini bulamadı. Özet aşağıdadır:");
        } else {
            const paragraphs = aiFoundText.split('\n').filter(p => p.trim().length > 30);
            textContainer.innerHTML = `<div style="padding:10px; text-align:center; color:#10b981; font-weight:bold; font-size:0.9rem; border-bottom:1px solid #10b981; margin-bottom:15px;">✨ Bu metin yapay zeka hafızasından üretildi, doğruluğunu kontrol edin.</div>`;
            const tempDiv = document.createElement('div');
            window.formatTextWithControls(paragraphs, tempDiv);
            textContainer.appendChild(tempDiv);
            resetArticleChat(aiFoundText, art.description);
        }
    } catch (err) {
        showSummaryOnly("❌ " + err.message);
    }
}


// ==========================================
// 3. API ANAHTARI VE RSS AI YÖNETİMİ
// ==========================================

function loadGroqKeys() {
    const keys = JSON.parse(localStorage.getItem('groqApiKeys')) || [];
    const listDiv = document.getElementById('groqKeysList');
    if (!listDiv) return;
    
    listDiv.innerHTML = '';
    if (keys.length === 0) {
        listDiv.innerHTML = '<div style="font-size: 0.85rem; color: #ef4444; padding: 10px; background: rgba(239, 68, 68, 0.1); border-radius: 8px; border: 1px dashed #ef4444;">⚠️ Henüz bir API anahtarı eklenmedi. Yapay zeka özellikleri çalışmayacaktır.</div>';
        return;
    }
    
    keys.forEach((key, index) => {
        const maskedKey = key.substring(0, 6) + '••••••••••••••••' + key.substring(key.length - 4);
        listDiv.innerHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 10px 15px; border-radius: 8px; border: 1px solid var(--surface-light);">
                <span style="font-family: monospace; color: #a7f3d0; font-size: 0.9rem;">${maskedKey}</span>
                <button onclick="removeGroqKey(${index})" style="background: rgba(239, 68, 68, 0.2); color: var(--danger); border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: bold; pointer-events: auto;">Sil</button>
            </div>
        `;
    });
}

function addGroqKey() {
    const input = document.getElementById('newGroqKeyInput');
    const newKey = input.value.trim();
    if (!newKey) return;
    
    if (!newKey.startsWith('gsk_')) {
        alert("Lütfen geçerli bir Groq API anahtarı girin (gsk_ ile başlamalıdır).");
        return;
    }

    const keys = JSON.parse(localStorage.getItem('groqApiKeys')) || [];
    if (!keys.includes(newKey)) {
        keys.push(newKey);
        localStorage.setItem('groqApiKeys', JSON.stringify(keys));
        input.value = '';
        loadGroqKeys();
        showToastGlobal("✅ Groq API Anahtarı eklendi!", 3000);
    } else {
        alert("Bu anahtar zaten ekli!");
    }
}

function removeGroqKey(index) {
    let keys = JSON.parse(localStorage.getItem('groqApiKeys')) || [];
    keys.splice(index, 1);
    localStorage.setItem('groqApiKeys', JSON.stringify(keys));
    loadGroqKeys();
}

async function findRssWithAI() {
    const topicInput = document.getElementById('aiRssTopic');
    const topic = topicInput.value.trim();
    const resultsDiv = document.getElementById('aiRssResults');

    if (!topic) {
        alert("Lütfen bir konu veya alan adı girin (Örn: Teknoloji, Kripto, Spor)");
        return;
    }

    const apiKeys = JSON.parse(localStorage.getItem('groqApiKeys')) || [];
    if (apiKeys.length === 0) {
        alert("Lütfen Ayarlar menüsünden geçerli bir Groq API anahtarı ekleyin.");
        return;
    }

    resultsDiv.innerHTML = '<div style="text-align:center; padding: 10px; color: var(--accent); animation: pulse 1s infinite;">⏳ Yapay zeka interneti tarıyor...</div>';
    
    const prompt = getAIPrompt('rssFinder').replace(/{topic}/g, topic);
    
    try {
        let content = (await groqChat([{ role: "user", content: prompt }], { temperature: 0.3, maxTokens: 1200 })).trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        const rssList = JSON.parse(jsonMatch ? jsonMatch[0] : content);
        resultsDiv.innerHTML = '';

        if(rssList.length === 0) {
            resultsDiv.innerHTML = '<div style="color:#fca5a5; font-size:0.85rem;">Sonuç bulunamadı.</div>';
            return;
        }

        rssList.forEach(rss => {
            const btn = document.createElement('div');
            btn.style.cssText = "text-align: left; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; cursor: pointer; display: flex; flex-direction: column; transition: 0.3s;";
            btn.onmouseover = () => { if(btn.style.pointerEvents !== "none") btn.style.borderColor = "var(--primary)"; };
            btn.onmouseout = () => { if(btn.style.pointerEvents !== "none") btn.style.borderColor = "rgba(255,255,255,0.1)"; };
            
            btn.innerHTML = `
                <div style="font-weight: bold; color: white; display:flex; justify-content:space-between; align-items:center;">
                    <span>${rss.name}</span>
                    <span class="ai-add-badge" style="font-size:0.75rem; background:var(--primary); padding:4px 10px; border-radius:6px; transition:0.3s; font-weight:bold;">Ekle</span>
                </div>
                <span style="font-size:0.75rem; color:var(--text-muted); margin-top:5px; word-break:break-all;">${rss.url}</span>
            `;
            
            btn.onclick = function() {
                autoFillAndAddRss(rss.name, rss.url);
                const badge = this.querySelector('.ai-add-badge');
                if(badge) {
                    badge.innerText = "Eklendi ✅";
                    badge.style.background = "var(--success)"; 
                }
                this.style.borderColor = "var(--success)";
                this.style.background = "rgba(16, 185, 129, 0.1)";
                this.style.pointerEvents = "none"; 
            };
            resultsDiv.appendChild(btn);
        });

    } catch (err) {
        console.error("RSS getirme hatası:", err);
        resultsDiv.innerHTML = `<div style="color:var(--danger); font-size:0.85rem;">⚠️ ${escapeHtml(err.message)}</div>`;
    }
}

function autoFillAndAddRss(name, url) {
    const manualSection = document.getElementById('manualAddSection');
    const nameInput = document.getElementById('newRssName');
    const urlInput = document.getElementById('newRssUrl');
    
    if (manualSection && nameInput && urlInput) {
        manualSection.classList.add('show');
        nameInput.value = name;
        urlInput.value = url;
        
        const saveBtn = manualSection.querySelector('button');
        if (saveBtn) {
            setTimeout(() => {
                saveBtn.click(); 
                setTimeout(() => {
                    nameInput.value = '';
                    urlInput.value = '';
                }, 400); 
            }, 100);
        } else {
            if (typeof addCustomRSSManual === "function") addCustomRSSManual();
        }
    } else {
        alert(`Kutucuklar bulunamadı. Lütfen URL'yi kendiniz kopyalayın: ${url}`);
    }
}

// ==========================================
// 4. ÇEVİRİ VE SES İŞLEMLERİ (METİN ETKİLEŞİMLERİ)
// ==========================================

async function getTranslation(text, targetLang) {
    // Uzun paragraflar GET isteğine sığmaz: cümle sınırından parçala
    const chunks = [];
    (text.match(/[^.!?…]+[.!?…]+["”')]*\s*|[^.!?…]+$/g) || [text]).forEach(s => {
        if (chunks.length && (chunks[chunks.length - 1] + s).length < 1200) chunks[chunks.length - 1] += s; else chunks.push(s);
    });
    try {
        const parts = await Promise.all(chunks.map(async c => {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(c)}`;
            const res = await fetchWithTimeout(url, 8000);
            const data = await res.json();
            return data[0].map(x => x[0]).join('');
        }));
        return parts.join(' ').trim();
    } catch (e) {
        return "⚠️ Çeviri bağlantı hatası.";
    }
}

async function translateParagraph(idx, btnEl) {
    const pEl = document.getElementById('p_' + idx);
    const transDiv = document.getElementById('trans_' + idx);
    if (!pEl || !transDiv) return;
    const targetLang = document.getElementById('targetLangSelect').value;

    if (btnEl.classList.contains('on')) {          // ikinci dokunuş: kapat
        transDiv.style.display = 'none';
        btnEl.classList.remove('on');
        return;
    }
    btnEl.classList.add('on');
    transDiv.style.display = 'block';
    if (transDiv.dataset.lang === targetLang && transDiv.dataset.done) { transDiv.textContent = transDiv.dataset.done; return; }
    transDiv.textContent = '⏳ …';
    const translated = await getTranslation(pEl.innerText, targetLang);
    transDiv.textContent = translated;
    if (!translated.startsWith('⚠️')) { transDiv.dataset.lang = targetLang; transDiv.dataset.done = translated; }
}

function translateSingleWord(spanEl, event) {
    document.querySelectorAll('.t-word').forEach(el => el.classList.remove('highlighted'));
    spanEl.classList.add('highlighted');
    const cleanText = spanEl.innerText.replace(/[.,!?;:"()]/g, '');
    const rect = spanEl.getBoundingClientRect();
    showTooltip(cleanText, rect);
}

let tooltipTimeout;
document.addEventListener('selectionchange', () => {
    clearTimeout(tooltipTimeout);
    tooltipTimeout = setTimeout(() => {
        const selection = window.getSelection();
        const text = selection.toString().trim();
        
        if(text.length > 0) {
            document.querySelectorAll('.t-word').forEach(el => el.classList.remove('highlighted'));
        }

        if (text.length > 0 && selection.anchorNode) {
            let parent = selection.anchorNode.nodeType === 3 ? selection.anchorNode.parentNode : selection.anchorNode;
            if (parent && parent.closest && parent.closest('#readerView')) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                showTooltip(text, rect);
            }
        }
    }, 400); 
});

async function showTooltip(text, rect) {
    if(!text) return;
    const tooltip = document.getElementById('wordTooltip');
    const targetLang = document.getElementById('targetLangSelect').value;
    
    tooltip.innerText = '⏳...';
    tooltip.style.display = 'block';
    
    tooltip.style.position = 'fixed';
    tooltip.style.top = (rect.bottom + 10) + 'px'; 
    tooltip.style.left = (rect.left + (rect.width/2)) + 'px';

    const translated = await getTranslation(text, targetLang);
    const safeText = encodeURIComponent(text);

    tooltip.innerHTML = `
        <div onmousedown="listenSingleWord('${safeText}', event)" 
             ontouchstart="listenSingleWord('${safeText}', event)" 
             style="display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; width: 100%; height: 100%;">
            <span style="font-size: 1.05rem; pointer-events: none;">${escapeHtml(translated)}</span>
            <span style="background: rgba(255,255,255,0.2); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; pointer-events: none;">🔊</span>
        </div>
    `;
    setTimeout(() => {
        const tRect = tooltip.getBoundingClientRect();
        if (tRect.right > window.innerWidth) {
            tooltip.style.left = (window.innerWidth - (tRect.width / 2) - 15) + 'px';
        } else if (tRect.left < 0) {
            tooltip.style.left = ((tRect.width / 2) + 15) + 'px';
        }
    }, 50);
}

function listenSingleWord(encodedText, event) {
    if(event) {
        event.preventDefault();
        event.stopPropagation();
    }
    window.speechSynthesis.cancel(); 
    const text = decodeURIComponent(encodedText);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = typeof ttsLangMap !== 'undefined' && ttsLangMap[currentRegion] ? ttsLangMap[currentRegion] : 'en-US';
    window.speechSynthesis.speak(utterance);
}

function hideTooltip() {
    document.getElementById('wordTooltip').style.display = 'none';
}

function listenParagraph(idx, btn) {
    window.speechSynthesis.cancel(); 
    
    if(btn.classList.contains('playing')) {
        btn.classList.remove('playing');
        btn.innerText = '🔊';
        return;
    }
    
    document.querySelectorAll('.btn-action-p').forEach(b => {
        if(b.innerText === '⏹️' || b.classList.contains('playing')) {
            b.classList.remove('playing');
            b.innerText = '🔊';
        }
    });
    const text = document.getElementById('p_' + idx).innerText;
    if(!text) return;
    
    btn.classList.add('playing');
    btn.innerText = '⏹️';
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = ttsLangMap[currentRegion] || 'en-US';
    utterance.onend = () => {
        btn.classList.remove('playing');
        btn.innerText = '🔊';
    };
    utterance.onerror = () => {
        btn.classList.remove('playing');
        btn.innerText = '🔊';
    };
    window.speechSynthesis.speak(utterance);
}

document.addEventListener('click', (e) => {
    if (e.target.closest('input, textarea, select')) return;

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText.length > 0 && !e.target.closest('#wordTooltip')) return;

    if(!e.target.classList.contains('t-word') && !e.target.closest('#wordTooltip')) {
        hideTooltip();
        document.querySelectorAll('.t-word').forEach(el => el.classList.remove('highlighted'));
    }
});

const modalBodyArea = document.getElementById('modalBodyArea');
if(modalBodyArea) {
    modalBodyArea.addEventListener('scroll', () => { hideTooltip(); }, {passive: true});
}

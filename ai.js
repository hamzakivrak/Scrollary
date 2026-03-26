// ai.js (Final Sürüm: Sohbet + Akıllı Metin Bulma + Çeviri + Ses + Özel Prompt Yönetimi)

const ttsLangMap = { 'EN': 'en-US', 'TR': 'tr-TR', 'DE': 'de-DE', 'ES': 'es-ES', 'FR': 'fr-FR', 'RU': 'ru-RU', 'AR': 'ar-SA', 'HI': 'hi-IN' };

// ==========================================
// YENİ: YAPAY ZEKA SABİT KOMUTLARI (PROMPTS) YÖNETİCİSİ
// ==========================================
const DEFAULT_AI_PROMPTS = {
    chatAssistant: `Sen çok zeki, genel kültürü yüksek profesyonel bir asistansın.\nKURAL 1: Kullanıcı haberle ilgili bir şey soruyorsa veya "özetle" diyorsa, öncelikle sana sağlanan [HABER METNİ/ÖZETİ] bağlamını kullan.\nKURAL 2: Eğer kullanıcının sorduğu sorunun cevabı haberde YOKSA veya doğrudan dış dünyayla (genel bilgi) ilgili bir şey soruyorsa, KENDİ GENEL KÜLTÜRÜNÜ VE BİLGİ BİRİKİMİNİ kullanarak cevap ver. Ancak bu bilginin haberde geçmediğini açıkça belirt.\nKURAL 3: Eğer "haberi özetle" deniyorsa, kısa bir giriş yap ve detayları <ul><li> formatında madde madde anlat.\nKURAL 4: Önemli kelimeleri <span style="color:#3b82f6"> (mavi) veya <span style="color:#e11d48"> (kırmızı) ile renklendir. Markdown (** vb.) ASLA kullanma, sadece HTML kullan.`,
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
    historyDiv.innerHTML += `<div class="ai-msg user">${userInput}</div>`;
    
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
        historyDiv.innerHTML += `<div class="ai-msg assistant" style="background: var(--danger);">⚠️ API anahtarı eksik. Ayarlardan Groq API anahtarı ekleyin.</div>`;
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

    async function tryFetchChat(keyIndex) {
        if (keyIndex >= apiKeys.length) {
            loadingDiv.innerText = "⚠️ Kotanız doldu veya bağlantı hatası.";
            if(sendBtn) { sendBtn.disabled = false; sendBtn.innerText = "Gönder"; }
            return;
        }

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKeys[keyIndex]}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: messagesPayload,
                    temperature: 0.5,
                    max_tokens: 1024
                })
            });
            if (!response.ok) throw new Error("KeyFailed");

            const data = await response.json();
            let cleanHtml = data.choices[0].message.content.replace(/```html/g, '').replace(/```/g, '').trim();

            historyDiv.removeChild(loadingDiv);
            historyDiv.innerHTML += `<div class="ai-msg assistant">${cleanHtml}</div>`;
            
            currentArticleChatHistory.push({ role: "user", content: query });
            currentArticleChatHistory.push({ role: "assistant", content: cleanHtml });

        } catch (err) {
            await tryFetchChat(keyIndex + 1);
        }
    }

    await tryFetchChat(0);
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

    async function tryFetchFallback(keyIndex) {
        if (keyIndex >= apiKeys.length) {
            textContainer.innerHTML = `<div class="status-msg">❌ Metin ne proxy ile ne de AI ile bulunamadı. Aşağıda haberin özeti yer almaktadır.</div><p style="padding:15px;">${art.description}</p>`;
            resetArticleChat(art.description); 
            return;
        }

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKeys[keyIndex]}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.1, 
                    max_tokens: 2000
                })
            });
            if (!response.ok) throw new Error("KeyFailed");

            const data = await response.json();
            let aiFoundText = data.choices[0].message.content.trim();

            if (aiFoundText.includes("internet hafızamdan erişemedim") || aiFoundText.length <= art.description.length + 50) {
                textContainer.innerHTML = `<div class="status-msg" style="padding:15px; border-radius:8px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3);">🤖 Yapay zeka bu haberin tam metnini internet hafızasında bulamadı.<br>Haberin mevcut özeti aşağıdadır:</div>
                                          <p style="padding: 15px; font-size:1.1rem; line-height:1.6;">${art.description}</p>`;
                resetArticleChat(art.description); 
            } else {
                const paragraphs = aiFoundText.split('\n').filter(p => p.trim().length > 30);
                if (typeof window.formatTextWithControls === 'function') {
                    textContainer.innerHTML = `<div style="padding:10px; text-align:center; color:#10b981; font-weight:bold; font-size:0.9rem; border-bottom:1px solid #10b981; margin-bottom:15px;">✨ Bu metin Yapay Zeka tarafından internet hafızasından kurtarılmıştır.</div>`;
                    
                    const tempDiv = document.createElement('div');
                    window.formatTextWithControls(paragraphs, tempDiv);
                    textContainer.appendChild(tempDiv);
                    
                    resetArticleChat(aiFoundText); 
                } else {
                    textContainer.innerHTML = `<div class="ai-msg assistant">🤖 Yapay zeka metni kurtardı:</div><br>` + paragraphs.map(p => `<p>${p}</p>`).join('');
                    resetArticleChat(aiFoundText);
                }
            }

        } catch (err) {
            await tryFetchFallback(keyIndex + 1);
        }
    }

    await tryFetchFallback(0);
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
    
    async function tryFetchRss(keyIndex) {
        if (keyIndex >= apiKeys.length) {
            resultsDiv.innerHTML = `<div style="color:var(--danger); font-size:0.85rem;">⚠️ API anahtarı hatası veya kota doldu.</div>`;
            return;
        }

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKeys[keyIndex]}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.3,
                    max_tokens: 500
                })
            });
            if (!response.ok) throw new Error("KeyFailed");

            const data = await response.json();
            let content = data.choices[0].message.content.trim();
            content = content.replace(/```json/g, '').replace(/```/g, '').trim();
            const rssList = JSON.parse(content);
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
            await tryFetchRss(keyIndex + 1);
        }
    }

    await tryFetchRss(0);
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
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data[0].map(x => x[0]).join('');
    } catch(e) { 
        return "⚠️ Çeviri bağlantı hatası.";
    }
}

async function translateParagraph(idx, btnEl) {
    const pText = document.getElementById('p_' + idx).innerText;
    const transDiv = document.getElementById('trans_' + idx);
    const targetLang = document.getElementById('targetLangSelect').value;
    
    if(transDiv.style.display === 'block') {
        transDiv.style.display = 'none';
        btnEl.style.background = 'rgba(255,255,255,0.05)';
        btnEl.style.borderColor = 'rgba(255,255,255,0.1)';
    } else {
        btnEl.style.background = 'var(--accent)';
        btnEl.style.borderColor = 'var(--accent)';
        transDiv.innerText = '⏳ Yapay zeka çeviriyor...';
        transDiv.style.display = 'block';
        const translated = await getTranslation(pText, targetLang);
        transDiv.innerText = translated;
    }
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
            <span style="font-size: 1.05rem; pointer-events: none;">${translated}</span>
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

/* native-voice.js — Yalnızca Android APK kabuğunda (window.ScrollaryNative varken) çalışır.
   Android WebView'de Web Speech API'nin ses tanıma kısmı (webkitSpeechRecognition) yoktur ve konuşma
   (speechSynthesis) güvenilmezdir. Bu dosya, mevcut kodun (sesli-asistan.js, ai.js) hiç değişmeden çalışması için
   aynı arayüzleri APK içindeki yerel Android motoruna (SpeechRecognizer / TextToSpeech) bağlar.
   Tarayıcıda ve TV'de ScrollaryNative olmadığı için hiçbir şey yapmaz. */
(function () {
    'use strict';
    const N = window.ScrollaryNative;
    if (!N || window.__nativeVoiceInit) return;
    window.__nativeVoiceInit = true;

    /* ---------- Ses tanıma ---------- */
    let activeRec = null;

    function NativeRecognition() {
        this.lang = 'tr-TR';
        this.interimResults = false;
        this.maxAlternatives = 1;
        this.continuous = false;
        this.onstart = this.onend = this.onerror = this.onresult = this.onspeechstart = this.onspeechend = this.onaudiostart = null;
        this._running = false;
        activeRec = this;
    }
    NativeRecognition.prototype.start = function () {
        if (this._running) { const e = new Error('recognition has already started'); e.name = 'InvalidStateError'; throw e; }
        this._running = true;
        activeRec = this;
        try { N.sttStart(String(this.lang || 'tr-TR')); } catch (e) { this._running = false; throw e; }
    };
    NativeRecognition.prototype.stop = function () {
        if (!this._running) return;
        try { N.sttStop(); } catch (e) {}
    };
    NativeRecognition.prototype.abort = function () {
        if (!this._running) return;
        try { N.sttAbort(); } catch (e) {}
        const r = this;   // yerel iptal olay göndermez; tarayıcı gibi 'end' biz üretiriz
        setTimeout(() => { if (r._running) { r._running = false; if (r.onend) r.onend({ type: 'end' }); } }, 0);
    };
    NativeRecognition.prototype.addEventListener = function (t, fn) { this['on' + t] = fn; };
    NativeRecognition.prototype.removeEventListener = function (t) { this['on' + t] = null; };

    // Java -> JS
    window.__nvSTT = {
        ev: function (type, payload) {
            const r = activeRec;
            if (!r) return;
            try {
                if (type === 'start') { if (r.onstart) r.onstart({ type: 'start' }); }
                else if (type === 'speechstart') { if (r.onspeechstart) r.onspeechstart({ type: 'speechstart' }); }
                else if (type === 'result') {
                    const alt = { transcript: String(payload || ''), confidence: 0.9 };
                    const res = [alt]; res.isFinal = true;
                    if (r.onresult) r.onresult({ type: 'result', resultIndex: 0, results: [res] });
                }
                else if (type === 'error') { if (r.onerror) r.onerror({ type: 'error', error: String(payload || 'network') }); }
                else if (type === 'end') { r._running = false; if (r.onend) r.onend({ type: 'end' }); }
            } catch (e) { try { console.error(e); } catch (x) {} }
        }
    };

    window.SpeechRecognition = NativeRecognition;
    window.webkitSpeechRecognition = NativeRecognition;

    /* ---------- Konuşma (TTS) ---------- */
    const live = new Map();   // id -> utterance (bitmemiş)
    let seq = 0;

    function NativeUtterance(text) {
        this.text = String(text == null ? '' : text);
        this.lang = 'tr-TR'; this.rate = 1; this.pitch = 1; this.volume = 1; this.voice = null;
        this.onstart = this.onend = this.onerror = this.onboundary = this.onpause = this.onresume = null;
    }

    const synth = {
        speak: function (u) {
            if (!u) return;
            const id = 'u' + (++seq);
            u._id = id; u._started = false;
            live.set(id, u);
            try { N.ttsSpeak(id, u.text, String(u.lang || 'tr-TR'), Number(u.rate) || 1, Number(u.pitch) || 1); }
            catch (e) { live.delete(id); if (u.onerror) setTimeout(() => u.onerror({ type: 'error', error: 'synthesis-failed' }), 0); }
        },
        cancel: function () {
            try { N.ttsCancel(); } catch (e) {}
            const dropped = Array.from(live.values());
            live.clear();
            // Tarayıcı gibi: iptal edilen konuşmalar 'interrupted' hatası alır
            dropped.forEach(u => { if (u.onerror) setTimeout(() => { try { u.onerror({ type: 'error', error: 'interrupted' }); } catch (e) {} }, 0); });
        },
        pause: function () {}, resume: function () {},
        getVoices: function () { return [{ name: 'Android TTS', lang: 'tr-TR', default: true, localService: true, voiceURI: 'android-tts' }]; },
        addEventListener: function () {}, removeEventListener: function () {},
        onvoiceschanged: null
    };
    Object.defineProperty(synth, 'speaking', { get: function () { return Array.from(live.values()).some(u => u._started); } });
    Object.defineProperty(synth, 'pending', { get: function () { return Array.from(live.values()).some(u => !u._started); } });
    Object.defineProperty(synth, 'paused', { get: function () { return false; } });

    window.__nvTTS = {
        ev: function (id, type, detail) {
            const u = live.get(id);
            if (!u) return;
            try {
                if (type === 'start') { u._started = true; if (u.onstart) u.onstart({ type: 'start' }); }
                else if (type === 'end') { live.delete(id); if (u.onend) u.onend({ type: 'end' }); }
                else if (type === 'error') { live.delete(id); if (u.onerror) u.onerror({ type: 'error', error: String(detail || 'synthesis-failed') }); }
            } catch (e) { try { console.error(e); } catch (x) {} }
        }
    };

    window.SpeechSynthesisUtterance = NativeUtterance;
    try { Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true, writable: true }); }
    catch (e) { try { window.speechSynthesis = synth; } catch (x) {} }

    document.documentElement.setAttribute('data-native-voice', '1');
})();

// tv.js - Android TV / kumanda (D-pad) modu
// TV'de otomatik açılır (APK kullanıcı arayüzüne "ScrollaryTV" ekler, adrese ?tv=1 eklenir).
// Telefonda denemek için adrese ?tv=1 ekleyin; kapatmak için ?tv=0.
(function () {
    const q = new URLSearchParams(location.search).get('tv');
    if (q === '0') { try { localStorage.removeItem('tvMode'); } catch (e) {} }
    if (q === '1') { try { localStorage.setItem('tvMode', '1'); } catch (e) {} }
    let on = false;
    try { on = /ScrollaryTV|AndroidTV|Android TV|SmartTV|GoogleTV/i.test(navigator.userAgent) || localStorage.getItem('tvMode') === '1'; } catch (e) {}
    if (q === '0') on = false;
    if (!on) return;
    window.IS_TV = true;

    // TV'de "tarayıcıda aç" yok: ilk açılışta çift basış = pencerede orijinal site
    try {
        if (!localStorage.getItem('tvTapMigrated')) {
            localStorage.setItem('tapAction_single', 'last');
            localStorage.setItem('tapAction_double', 'embedded');
            localStorage.setItem('tvTapMigrated', '1');
        }
    } catch (e) {}

    const css = document.createElement('style');
    css.textContent = `
      body.tv-mode { zoom: 1.35; }
      body.tv-mode .mic-fab, body.tv-mode #aiFab { display: none !important; }
      body.tv-mode .tv-focus, body.tv-mode :focus-visible {
          outline: 4px solid #facc15 !important; outline-offset: 3px; border-radius: 14px;
          box-shadow: 0 0 0 6px rgba(250,204,21,.25), 0 8px 30px rgba(0,0,0,.6); position: relative; z-index: 5; }
      body.tv-mode .news-card { transition: transform .12s; }
      body.tv-mode .news-card.tv-focus { transform: scale(1.03); }
      body.tv-mode * { -webkit-tap-highlight-color: transparent; }
      body.tv-mode { overscroll-behavior: none; }
    `;
    document.head.appendChild(css);
    const start = () => { document.body.classList.add('tv-mode'); setTimeout(() => focusFirst(), 1500); };
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);

    const modalOpen = () => { const m = document.getElementById('newsModal'); return !!m && m.style.display === 'flex'; };
    const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4 && getComputedStyle(el).visibility !== 'hidden'; };

    function candidates() {
        const root = modalOpen() ? document.getElementById('newsModal') : document;
        const sel = modalOpen()
            ? 'button, [role=button], a[href], select, input, .tab-btn'
            : '.swipe-wrapper .news-card, button, [role=button], select, input, .chip, .filter-chip';
        return Array.from(root.querySelectorAll(sel)).filter(el => !el.disabled && !el.closest('[style*="display: none"]') && visible(el) &&
            !el.closest('#voiceStopBtn') && !(el.classList && el.classList.contains('mic-fab')));
    }

    function cur() { const a = document.activeElement; return a && a !== document.body ? a : null; }
    function setFocus(el) {
        if (!el) return;
        if (!el.hasAttribute('tabindex') && !/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) el.setAttribute('tabindex', '0');
        document.querySelectorAll('.tv-focus').forEach(x => x.classList.remove('tv-focus'));
        el.classList.add('tv-focus');
        try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
        try { el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' }); } catch (e) {}
    }
    function focusFirst() { if (modalOpen()) return; const c = candidates().find(e => e.classList.contains('news-card')) || candidates()[0]; if (c && !cur()) setFocus(c); }

    // Yön tuşuna göre en yakın öğeyi bul (uzamsal gezinme)
    function move(dir) {
        const list = candidates(); if (!list.length) return false;
        const from = cur();
        if (!from || !list.includes(from)) { setFocus(list[0]); return true; }
        const a = from.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
        let best = null, bs = Infinity;
        for (const el of list) {
            if (el === from) continue;
            const b = el.getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2;
            const dx = bx - ax, dy = by - ay;
            let ok = dir === 'down' ? dy > 8 : dir === 'up' ? dy < -8 : dir === 'right' ? dx > 8 : dx < -8;
            if (!ok) continue;
            const main = (dir === 'up' || dir === 'down') ? Math.abs(dy) : Math.abs(dx);
            const cross = (dir === 'up' || dir === 'down') ? Math.abs(dx) : Math.abs(dy);
            const s = main + cross * 2.2;
            if (s < bs) { bs = s; best = el; }
        }
        if (best) { setFocus(best); return true; }
        return false;
    }

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        const t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') && !/ArrowUp|ArrowDown/.test(e.key)) return;
        const k = e.key;
        const dir = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[k];

        if (dir) {
            e.preventDefault(); e.stopImmediatePropagation();
            if (modalOpen()) {
                // Pencere açıkken ▲▼ metni kaydırır; ◄► sekmeler/düğmeler arasında gezer
                const body = document.getElementById('modalBodyArea');
                if (dir === 'down' || dir === 'up') {
                    if (body && body.scrollHeight > body.clientHeight + 4) { body.scrollBy({ top: dir === 'down' ? 320 : -320, behavior: 'smooth' }); return; }
                }
                if (!move(dir) && body && (dir === 'down' || dir === 'up')) body.scrollBy({ top: dir === 'down' ? 320 : -320, behavior: 'smooth' });
                return;
            }
            if (!move(dir)) window.scrollBy({ top: dir === 'down' ? 300 : dir === 'up' ? -300 : 0, behavior: 'smooth' });
            return;
        }

        if (k === 'Enter' || k === ' ' || k === 'NumpadEnter' || k === 'MediaPlayPause') {
            const el = cur();
            if (!el || e.repeat) return;
            if (/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return;
            e.preventDefault(); e.stopImmediatePropagation();
            el.click();               // karttaysa mevcut tek/çift basış mantığı çalışır: 1× okuma modu, 2× orijinal site
            return;
        }

        if (k === 'Escape' || k === 'Backspace' || k === 'GoBack' || k === 'BrowserBack') {
            if (modalOpen() && typeof closeModalSafe === 'function') { e.preventDefault(); closeModalSafe('newsModal'); }
        }
    }, true);

    // Pencere kapanınca odak, açılan haber kartına geri dönsün
    let lastCard = null;
    document.addEventListener('click', (e) => { const c = e.target.closest && e.target.closest('.news-card'); if (c) lastCard = c; }, true);
    new MutationObserver(() => {
        if (!modalOpen() && lastCard && document.body.contains(lastCard) && !cur()) { setFocus(lastCard); }
    }).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['style'] });
})();

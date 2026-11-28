// auth.js
firebase.initializeApp(firebaseConfig); 
const auth = firebase.auth(); 
const db = firebase.firestore(); 
const provider = new firebase.auth.GoogleAuthProvider();

auth.onAuthStateChanged(async user => {
    if (user) { 
        currentUser = user; 
        document.getElementById('loginBtn').style.display = 'none'; 
        document.getElementById('userInfo').style.display = 'flex'; 
        document.getElementById('userPic').src = user.photoURL; 
        document.getElementById('userName').innerText = user.displayName.split(' ')[0]; 
        await loadFromCloud(); 
        if(!initialFetchDone) { initialFetchDone = true; }
    } else { 
        currentUser = null; 
        document.getElementById('loginBtn').style.display = 'flex'; 
        document.getElementById('userInfo').style.display = 'none'; 
        readArticles = JSON.parse(localStorage.getItem('readArticlesList')) || []; 
        archivedArticles = JSON.parse(localStorage.getItem('archivedArticlesList')) || []; 
        loadCustomFeeds(); 
        if(!initialFetchDone) { initialFetchDone = true; }
    }
});

// Giriş tanısı: tarayıcıdan dönüşte ne olduğu Ayarlar > Hesap Girişi altında görünür (sorun olursa nerede koptuğu anlaşılır)
function authDiag(msg) {
    try { localStorage.setItem('authDiag', new Date().toLocaleTimeString() + ' • ' + msg); } catch (e) {}
    const el = document.getElementById('authDiagLine');
    if (el) { el.textContent = 'Giriş durumu: ' + (localStorage.getItem('authDiag') || ''); el.style.display = 'block'; }
}
window.addEventListener('DOMContentLoaded', () => { try { if (window.ScrollaryNative && localStorage.getItem('authDiag')) authDiag(localStorage.getItem('authDiag').split(' • ').slice(1).join(' • ')); } catch (e) {} });

function signInWithGoogle() { 
    // Android uygulamasında (WebView) Google girişi engellenir: giriş gerçek tarayıcıda yapılır, sonuç uygulamaya geri döner
    if (window.ScrollaryNative && window.ScrollaryNative.openAuth) {
        try { window.ScrollaryNative.openAuth(new URL('auth-bridge.html', location.href).href); authDiag('tarayıcı açıldı, giriş bekleniyor'); return; } catch (e) { authDiag('tarayıcı açılamadı: ' + e.message); }
    }
    auth.signInWithPopup(provider).catch(err => { alert("Google Login Error: " + err.message); });
}

// Tarayıcıdan dönen giriş bilgisini al (uygulama kapalıyken açıldıysa da, arka plandan döndüyse de)
let _authBusy = false;
window.__nativeAuthPoll = function () {
    if (_authBusy) return;
    try {
        const raw = window.ScrollaryNative && window.ScrollaryNative.takeAuth && window.ScrollaryNative.takeAuth();
        if (!raw) return;
        const t = JSON.parse(raw);
        if (!t.idToken && !t.accessToken) { authDiag('boş giriş bilgisi geldi'); return; }
        _authBusy = true;
        authDiag('giriş bilgisi alındı (' + (t.idToken || '').length + '/' + (t.accessToken || '').length + '), Firebase\'e bağlanılıyor…');
        if (typeof showToastGlobal === 'function') showToastGlobal('🔐 Google girişi alındı, bağlanıyor…', 3000);
        const cred = firebase.auth.GoogleAuthProvider.credential(t.idToken || null, t.accessToken || null);
        auth.signInWithCredential(cred)
            .then(r => { authDiag('başarılı: ' + ((r.user && r.user.email) || 'kullanıcı')); if (typeof showToastGlobal === 'function') showToastGlobal('✅ Giriş yapıldı', 3000); })
            .catch(err => { authDiag('Firebase hatası: ' + (err.code || '') + ' ' + err.message); alert("Google Login Error: " + err.message); })
            .finally(() => { _authBusy = false; });
    } catch (e) { _authBusy = false; authDiag('hata: ' + e.message); }
};
window.addEventListener('focus', window.__nativeAuthPoll);
document.addEventListener('visibilitychange', () => { if (!document.hidden) window.__nativeAuthPoll(); });
setTimeout(window.__nativeAuthPoll, 800);

function signOut() { 
    auth.signOut(); 
}

async function syncToCloud() { 
    if (!currentUser) return;
    try { 
        await db.collection('users').doc(currentUser.uid).set({ 
            readArticles: readArticles, 
            archivedArticles: archivedArticles, 
            customRSSFeeds: JSON.parse(localStorage.getItem('customRSSFeeds')) || [], 
            appTheme: currentTheme, 
            activeSources: activeSources, 
            scrollaryRegion: currentRegion 
        }, { merge: true });
    } catch (e) {} 
}

async function loadFromCloud() {
    if (!currentUser) return;
    try {
        const doc = await db.collection('users').doc(currentUser.uid).get();
        if (doc.exists) {
            const data = doc.data();
            if (data.readArticles) { 
                readArticles = data.readArticles;
                localStorage.setItem('readArticlesList', JSON.stringify(readArticles)); 
            }
            if (data.archivedArticles) { 
                archivedArticles = data.archivedArticles;
                localStorage.setItem('archivedArticlesList', JSON.stringify(archivedArticles)); 
            }
            if (data.customRSSFeeds) { 
                localStorage.setItem('customRSSFeeds', JSON.stringify(data.customRSSFeeds));
            }
            if (data.appTheme) { 
                changeTheme(data.appTheme);
            }
            if (data.scrollaryRegion && data.scrollaryRegion !== currentRegion) { 
                currentRegion = data.scrollaryRegion;
                document.getElementById('regionSelect').value = currentRegion; 
                localStorage.setItem('scrollaryRegion', currentRegion); 
                applyTranslations(currentRegion, true); 
                loadCustomFeeds();
                fetchAllRSS(true); 
            }
            if (data.activeSources) { 
                activeSources = data.activeSources;
                localStorage.setItem('activeSourcesList', JSON.stringify(activeSources)); 
            }
        }
    } catch (e) {}
    loadCustomFeeds();
}

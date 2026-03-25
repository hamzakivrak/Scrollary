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

function signInWithGoogle() { 
    auth.signInWithPopup(provider).catch(err => { alert("Google Login Error: " + err.message); });
}

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

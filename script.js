// Service Worker Kaydı (PWA için)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(registration => {
        console.log('ServiceWorker başarıyla kaydedildi:', registration.scope);
      })
      .catch(err => {
        console.log('ServiceWorker kaydı başarısız oldu:', err);
      });
  });
}

const TRANSLATIONS = {
    'EN': { tabSearch: "🔍 Search", tabFilter: "📚 Filter", tabAddSource: "➕ Add Source", subtitle: "Sourced from You, Your News Source", menuTitle: "Search, Filter & Add Sources", regionLabel: "🌍 News Region:", themeTitle: "🎨 Themes", themes: { 'default': '🌑 Dark', 'glass': '🪟 Glass', 'metallic': '⚙️ Metal', 'hologram': '🌈 Holo', 'animated': '🌊 Studio', 'cyber': '⚡ Cyber' }, layoutTitle: "📐 Layout Size", layouts: { 'list': '🔠 List', 'small': '≣ Small', 'medium': '⊞ Med', 'large': '🔲 Large', 'shorts': '📱 Shorts' }, searchPlaceholder: "Search within fetched news...", catTitle: "📚 Quick Filters", cats: { '': 'All', 'Arşiv': '💾 Archive', 'News': '📰 News', 'Tech': '💻 Tech', 'Science': '🧬 Science', 'Health': '⚕️ Health', 'Sport': '⚽ Sport', 'Finance': '📈 Finance', 'World': '🌍 World', 'Philo': '🦉 Philo' }, hideReadText: "👁️ Hide Read Articles", sourceTitle: "📰 Source Filters (Expand)", selectAllBtn: "Select All", addRssTitle: "➕ Add Custom Source", addRssSearchHint: "🔍 Search Topic or Website URL:", addRssSearchBtn: "Find / Track", addRssManualHint: "➕ Advanced: Manual Add", addRssNamePlace: "Source Name", addRssSaveBtn: "Save to Cloud", fetchBtnText: "FETCH LATEST NEWS", loadingText: "Initializing global radar...", scanning: "Scanning:", pullToRefresh: "Pull to refresh", login: "Login via Google", logout: "Exit", manageSourcesTitle: "📰 Manage Sources", searchSourcesPh: "Search sources...", hideReadPopup: "Hide Read", refreshBtn: "🔄 Refresh", applyCloseBtn: "Apply & Close", readerTab: "📖 Reader View", originalTab: "🌐 Original Site", tripleTapHint: "Press Back or Triple tap to close", loadingSite: "Loading original site...", extracting: "Extracting article text...", scrollLoading: "Loading more...", checkingUpdates: "Checking network for updates...", swipeArchive: "💾 Archive", swipeArchived: "💾 Archived", swipeHide: "👁️ Hide", readMore: "Read →", guideTitle: "💡 Quick Start Guide", guide1: "👈 Swipe Left: Mark as read", guide2: "👉 Swipe Right: Save to Archive", guide3: "⬇️ Pull Down: Fetch latest news", guide4: "🏷️ Source Name: Open filtering by clicking source name on card", guide5: "📚 Top Menu: Filter topics or add new RSS", guide6: "👆 Tap Card Once: Open in reading mode", guide7: "✌️ Double Tap Card: Open in original site", guide8: "📖 Reading Mode: Triple tap or press Back to close", addedSuccess: "Successfully Added!", adSlotText: "Sponsored Content", waitingText: "⏳ Fetching news, please wait...", notFoundText: "🔍 No news found for this filter.", firewallBlockTitle: "Text Blocked", firewallBlock: "The site's security wall prevented ad-free reading. Please click the blue arrow icon at the top right to open the original site.", googleNewsBlockTitle: "Google Redirect Wall", googleNewsBlockDesc: "Google hides this link. To use reading, translation, and audio features, open the original site, copy the real link from the address bar, and paste it below.", manualPasteHint: "Paste the real link here...", unlockBtn: "🚀 Unlock & Fetch Text", openOriginalBtn: "🌐 Open Original Site" },
    'TR': { tabSearch: "🔍 Ara", tabFilter: "📚 Filtrele", tabAddSource: "➕ Kaynak Ekle", subtitle: "Sizden Kaynaklı, Sizin Haber Kaynağınız", menuTitle: "Haber Ara, Filtrele ve Kaynak Ekle", regionLabel: "🌍 Küresel Haber Bölgesi:", themeTitle: "🎨 Temalar", themes: { 'default': '🌑 Standart', 'glass': '🪟 Cam', 'metallic': '⚙️ Metalik', 'hologram': '🌈 Hologram', 'animated': '🌊 Stüdyo', 'cyber': '⚡ Cyber' }, layoutTitle: "📐 Görünüm Boyutu", layouts: { 'list': '🔠 Liste', 'small': '≣ Küçük', 'medium': '⊞ Orta', 'large': '🔲 Büyük', 'shorts': '📱 Shorts' }, searchPlaceholder: "Çekilen haberler içinde ara...", catTitle: "📚 Hızlı Konu Filtreleri", cats: { '': 'Tümü', 'Arşiv': '💾 Arşiv', 'News': '📰 Gündem', 'Tech': '💻 Teknoloji', 'Science': '🧬 Bilim', 'Health': '⚕️ Sağlık', 'Sport': '⚽ Spor', 'Finance': '📈 Ekonomi', 'World': '🌍 Dünya', 'Philo': '🦉 Felsefe' }, hideReadText: "👁️ Okunanları Gizle", sourceTitle: "📰 Kaynak Filtreleri (Genişlet)", selectAllBtn: "Tümünü Seç/Kaldır", addRssTitle: "➕ İnternetten Kaynak Ekle", addRssSearchHint: "🔍 Site Adresi veya Konu Yazın:", addRssSearchBtn: "Bul / Ekle", addRssManualHint: "➕ Gelişmiş: Manuel Kayıt Aç", addRssNamePlace: "Kaynağın Adı", addRssSaveBtn: "Buluta Kaydet", fetchBtnText: "AĞDAN YENİ HABERLERİ ÇEK", loadingText: "Radar başlatılıyor...", scanning: "Taranıyor:", pullToRefresh: "Yenilemek için çekin", login: "Google ile Giriş Yap", logout: "Çıkış", manageSourcesTitle: "📰 Kaynakları Yönet", searchSourcesPh: "Kaynak arayın...", hideReadPopup: "Okunanları Gizle", refreshBtn: "🔄 Yenile", applyCloseBtn: "Uygula ve Kapat", readerTab: "📖 Okuma Modu", originalTab: "🌐 Orijinal Site", tripleTapHint: "Geri tuşuna basarak veya 3 kez dokunarak kapat", loadingSite: "Orijinal site yükleniyor...", extracting: "Haber metni analiz ediliyor...", scrollLoading: "Daha fazla yükleniyor...", checkingUpdates: "Ağda yeni gelişme var mı kontrol ediliyor...", swipeArchive: "💾 Arşivle", swipeArchived: "💾 Arşivlendi", swipeHide: "👁️ Gizle", readMore: "Oku →", guideTitle: "💡 Kolay Kullanım Rehberi", guide1: "👈 Sola Kaydır: Haberi gizle (Okundu yap)", guide2: "👉 Sağa Kaydır: Arşive kaydet", guide3: "⬇️ Ekranı Aşağı Çek: Yeni haberleri tara", guide4: "🏷️ Kaynak İsmine Tıkla: Kart üzerinde kaynak ismine tıklayarak filtrelemeyi aç", guide5: "📚 Üst Menü (Büyüteç): Konu filtrele veya yeni kaynak ekle", guide6: "👆 Karta 1 Kez Dokun: Okuma modunda aç", guide7: "✌️ Karta 2 Kez Dokun: Orijinal sitede aç", guide8: "📖 Okuma Ekranı: Kapatmak için 3 kez dokun veya geri dön", addedSuccess: "Başarıyla Eklendi!", adSlotText: "Sponsorlu İçerik Alanı", waitingText: "⏳ Haberler çekiliyor, lütfen bekleyin...", notFoundText: "🔍 Bu filtrede haber bulunamadı.", firewallBlockTitle: "Güvenlik Duvarı", firewallBlock: "Reklamsız görünüm için sitenin güvenlik duvarı geçilemedi. Orijinal siteyi açmak için sağ üst köşedeki mavi ok butonuna tıklayın.", googleNewsBlockTitle: "Google Yönlendirme Duvarı", googleNewsBlockDesc: "Google bu bağlantıyı gizliyor. Okuma, çeviri ve dinleme özelliklerini kullanmak için orijinal siteyi açın, adres çubuğundaki gerçek linki kopyalayıp aşağıdaki alana yapıştırın.", manualPasteHint: "Kopyaladığın gerçek linki yapıştır...", unlockBtn: "🚀 Kilidi Aç ve Metni Çek", openOriginalBtn: "🌐 Orijinal Siteyi Aç" },
    'ES': { tabSearch: "🔍 Buscar", tabFilter: "📚 Filtrar", tabAddSource: "➕ Añadir Fuente", subtitle: "Tus fuentes, tu fuente de noticias", menuTitle: "Buscar, Filtrar y Fuentes", regionLabel: "🌍 Región de Noticias:", themeTitle: "🎨 Temas", themes: { 'default': '🌑 Oscuro', 'glass': '🪟 Cristal', 'metallic': '⚙️ Metal', 'hologram': '🌈 Holo', 'animated': '🌊 Estudio', 'cyber': '⚡ Cyber' }, layoutTitle: "📐 Tamaño de Vista", layouts: { 'list': '🔠 Lista', 'small': '≣ Pequeño', 'medium': '⊞ Medio', 'large': '🔲 Grande', 'shorts': '📱 Shorts' }, searchPlaceholder: "Buscar en noticias...", catTitle: "📚 Filtros", cats: { '': 'Todo', 'Arşiv': '💾 Archivo', 'News': '📰 Noticias', 'Tech': '💻 Tecno', 'Science': '🧬 Ciencia', 'Health': '⚕️ Salud', 'Sport': '⚽ Deporte', 'Finance': '📈 Finanzas', 'World': '🌍 Mundo', 'Philo': '🦉 Filo' }, hideReadText: "👁️ Ocultar Leídos", sourceTitle: "📰 Fuentes", selectAllBtn: "Seleccionar Todo", addRssTitle: "➕ Añadir Fuente", addRssSearchHint: "🔍 Buscar Tema o URL:", addRssSearchBtn: "Buscar", addRssManualHint: "➕ Manual", addRssNamePlace: "Nombre", addRssSaveBtn: "Guardar", fetchBtnText: "ACTUALIZAR", loadingText: "Iniciando radar...", scanning: "Buscando:", pullToRefresh: "Desliza para actualizar", login: "Entrar con Google", logout: "Salir", manageSourcesTitle: "📰 Fuentes", searchSourcesPh: "Buscar...", hideReadPopup: "Ocultar", refreshBtn: "🔄 Refrescar", applyCloseBtn: "Aplicar", readerTab: "📖 Lectura", originalTab: "🌐 Original", tripleTapHint: "Atrás o 3 toques para cerrar", loadingSite: "Cargando...", extracting: "Extrayendo...", scrollLoading: "Cargando más...", checkingUpdates: "Buscando actualizaciones...", swipeArchive: "💾 Guardar", swipeArchived: "💾 Guardado", swipeHide: "👁️ Ocultar", readMore: "Leer →", guideTitle: "💡 Guía", guide1: "👈 Deslizar Izq: Ocultar artículo", guide2: "👉 Deslizar Der: Guardar en Archivo", guide3: "⬇️ Deslizar Abajo: Actualizar", guide4: "🏷️ Nombre de la fuente: Haga clic en la tarjeta para filtrar", guide5: "📚 Menú Superior: Filtrar temas o añadir RSS", guide6: "👆 Toque 1 vez: Modo de lectura", guide7: "✌️ Toque 2 veces: Abrir en sitio original", guide8: "📖 Modo Lectura: Tocar 3 veces o Atrás para cerrar", addedSuccess: "¡Añadido!", adSlotText: "Contenido Patrocinado", waitingText: "⏳ Obteniendo noticias...", notFoundText: "🔍 No se encontraron noticias.", firewallBlockTitle: "Muro de Seguridad", firewallBlock: "El muro de seguridad impidió la vista sin anuncios. Haga clic en la flecha azul arriba a la derecha para abrir el sitio original.", googleNewsBlockTitle: "Muro de Redirección de Google", googleNewsBlockDesc: "Google oculta este enlace. Para usar las funciones de lectura, traducción y audio, abra el sitio original, copie el enlace real de la barra de direcciones y péguelo a continuación.", manualPasteHint: "Pegue el enlace real aquí...", unlockBtn: "🚀 Desbloquear y Extraer Texto", openOriginalBtn: "🌐 Abrir Sitio Original" },
    'DE': { tabSearch: "🔍 Suche", tabFilter: "📚 Filter", tabAddSource: "➕ Quelle", subtitle: "Ihre Quellen, Ihre Nachrichtenquelle", menuTitle: "Suche, Filter & Quellen", regionLabel: "🌍 Region:", themeTitle: "🎨 Themes", themes: { 'default': '🌑 Dunkel', 'glass': '🪟 Glas', 'metallic': '⚙️ Metall', 'hologram': '🌈 Holo', 'animated': '🌊 Studio', 'cyber': '⚡ Cyber' }, layoutTitle: "📐 Layout", layouts: { 'list': '🔠 Liste', 'small': '≣ Klein', 'medium': '⊞ Mittel', 'large': '🔲 Groß', 'shorts': '📱 Shorts' }, searchPlaceholder: "Suche...", catTitle: "📚 Filter", cats: { '': 'Alle', 'Arşiv': '💾 Archiv', 'News': '📰 News', 'Tech': '💻 Tech', 'Science': '🧬 Wissen', 'Health': '⚕️ Gesundheit', 'Sport': '⚽ Sport', 'Finance': '📈 Finanzen', 'World': '🌍 Welt', 'Philo': '🦉 Philo' }, hideReadText: "👁️ Gelesene ausblenden", sourceTitle: "📰 Quellen", selectAllBtn: "Alle", addRssTitle: "➕ Quelle hinzufügen", addRssSearchHint: "🔍 Thema/URL:", addRssSearchBtn: "Finden", addRssManualHint: "➕ Manuell", addRssNamePlace: "Name", addRssSaveBtn: "Speichern", fetchBtnText: "AKTUALISIEREN", loadingText: "Lade Radar...", scanning: "Suche:", pullToRefresh: "Zum Aktualisieren ziehen", login: "Google Login", logout: "Beenden", manageSourcesTitle: "📰 Quellen", searchSourcesPh: "Suche...", hideReadPopup: "Ausblenden", refreshBtn: "🔄 Aktualisieren", applyCloseBtn: "Anwenden", readerTab: "📖 Lesen", originalTab: "🌐 Original", tripleTapHint: "Zurück oder 3x tippen", loadingSite: "Lade...", extracting: "Extraktion...", scrollLoading: "Mehr...", checkingUpdates: "Suche Updates...", swipeArchive: "💾 Speichern", swipeArchived: "💾 Gespeichert", swipeHide: "👁️ Verbergen", readMore: "Lesen →", guideTitle: "💡 Anleitung", guide1: "👈 Nach links wischen: Artikel ausblenden", guide2: "👉 Nach rechts wischen: Im Archiv speichern", guide3: "⬇️ Nach unten ziehen: Aktualisieren", guide4: "🏷️ Quellenname: Auf Karte klicken, um zu filtern", guide5: "📚 Oberes Menü: Themen filtern", guide6: "👆 1x Tippen: Lesemodus öffnen", guide7: "✌️ 2x Tippen: Originalseite öffnen", guide8: "📖 Lesemodus: 3x tippen oder Zurück", addedSuccess: "Hinzugefügt!", adSlotText: "Gesponserter Inhalt", waitingText: "⏳ Nachrichten werden geladen...", notFoundText: "🔍 Keine Nachrichten gefunden.", firewallBlockTitle: "Sicherheitsmauer", firewallBlock: "Sicherheitsmauer verhinderte werbefreies Lesen. Klicken Sie auf den blauen Pfeil oben rechts, um die Originalseite zu öffnen.", googleNewsBlockTitle: "Google Umleitungs-Mauer", googleNewsBlockDesc: "Google verbirgt diesen Link. Um die Lese-, Übersetzungs- und Audiofunktionen zu nutzen, öffnen Sie die Originalseite, kopieren Sie den echten Link aus der Adressleiste und fügen Sie ihn unten ein.", manualPasteHint: "Fügen Sie den echten Link hier ein...", unlockBtn: "🚀 Entsperren & Text abrufen", openOriginalBtn: "🌐 Originalseite öffnen" },
    'FR': { tabSearch: "🔍 Recherche", tabFilter: "📚 Filtrer", tabAddSource: "➕ Source", subtitle: "Vos sources, votre source d'actualités", menuTitle: "Recherche & Sources", regionLabel: "🌍 Région:", themeTitle: "🎨 Thèmes", themes: { 'default': '🌑 Sombre', 'glass': '🪟 Verre', 'metallic': '⚙️ Métal', 'hologram': '🌈 Holo', 'animated': '🌊 Studio', 'cyber': '⚡ Cyber' }, layoutTitle: "📐 Affichage", layouts: { 'list': '🔠 Liste', 'small': '≣ Petit', 'medium': '⊞ Moyen', 'large': '🔲 Grand', 'shorts': '📱 Shorts' }, searchPlaceholder: "Rechercher...", catTitle: "📚 Filtres", cats: { '': 'Tout', 'Arşiv': '💾 Archive', 'News': '📰 Actus', 'Tech': '💻 Tech', 'Science': '🧬 Science', 'Health': '⚕️ Santé', 'Sport': '⚽ Sport', 'Finance': '📈 Finance', 'World': '🌍 Monde', 'Philo': '🦉 Philo' }, hideReadText: "👁️ Masquer lus", sourceTitle: "📰 Sources", selectAllBtn: "Tout", addRssTitle: "➕ Ajouter Source", addRssSearchHint: "🔍 Sujet/URL:", addRssSearchBtn: "Trouver", addRssManualHint: "➕ Manuel", addRssNamePlace: "Nom", addRssSaveBtn: "Sauvegarder", fetchBtnText: "ACTUALISER", loadingText: "Chargement...", scanning: "Analyse:", pullToRefresh: "Tirer pour actualiser", login: "Connexion Google", logout: "Quitter", manageSourcesTitle: "📰 Sources", searchSourcesPh: "Rechercher...", hideReadPopup: "Masquer", refreshBtn: "🔄 Actualiser", applyCloseBtn: "Appliquer", readerTab: "📖 Lecture", originalTab: "🌐 Original", tripleTapHint: "Retour ou 3 tapes", loadingSite: "Chargement...", extracting: "Extraction...", scrollLoading: "Plus...", checkingUpdates: "Vérification...", swipeArchive: "💾 Archiver", swipeArchived: "💾 Archivé", swipeHide: "👁️ Masquer", readMore: "Lire →", guideTitle: "💡 Guide", guide1: "👈 Glisser Gauche : Masquer l'article", guide2: "👉 Glisser Droite : Sauvegarder", guide3: "⬇️ Tirer vers le bas : Actualiser", guide4: "🏷️ Nom Source : Cliquer sur la carte pour filtrer", guide5: "📚 Menu Supérieur : Filtrer ou ajouter", guide6: "👆 Taper 1 fois : Mode lecture", guide7: "✌️ Taper 2 fois : Ouvrir le site", guide8: "📖 Mode Lecture : Taper 3 fois ou Retour pour fermer", addedSuccess: "Ajouté!", adSlotText: "Contenu Sponsorisé", waitingText: "⏳ Récupération des actualités...", notFoundText: "🔍 Aucune actualité trouvée.", firewallBlockTitle: "Mur de Sécurité", firewallBlock: "Le mur de sécurité a empêché la lecture sans publicité. Cliquez sur la flèche bleue en haut à droite pour ouvrir le site original.", googleNewsBlockTitle: "Mur de Redirection Google", googleNewsBlockDesc: "Google masque ce lien. Pour utiliser les fonctions de lecture, de traduction et d'audio, ouvrez le site d'origine, copiez le vrai lien de la barre d'adresse et collez-le ci-dessous.", manualPasteHint: "Collez le vrai lien ici...", unlockBtn: "🚀 Débloquer et Extraire le Texte", openOriginalBtn: "🌐 Ouvrir le site original" },
    'RU': { tabSearch: "🔍 Поиск", tabFilter: "📚 Фильтр", tabAddSource: "➕ Источник", subtitle: "Ваши источники, ваш источник новостей", menuTitle: "Поиск и Источники", regionLabel: "🌍 Регион:", themeTitle: "🎨 Темы", themes: { 'default': '🌑 Темная', 'glass': '🪟 Стекло', 'metallic': '⚙️ Металл', 'hologram': '🌈 Голо', 'animated': '🌊 Студия', 'cyber': '⚡ Cyber' }, layoutTitle: "📐 Вид", layouts: { 'list': '🔠 Список', 'small': '≣ Мал', 'medium': '⊞ Сред', 'large': '🔲 Большой', 'shorts': '📱 Shorts' }, searchPlaceholder: "Искать...", catTitle: "📚 Фильтры", cats: { '': 'Все', 'Arşiv': '💾 Архив', 'News': '📰 Новости', 'Tech': '💻 Техно', 'Science': '🧬 Наука', 'Health': '⚕️ Здоровье', 'Sport': '⚽ Спорт', 'Finance': '📈 Финансы', 'World': '🌍 Мир', 'Philo': '🦉 Филос.' }, hideReadText: "👁️ Скрыть прочитанное", sourceTitle: "📰 Источники", selectAllBtn: "Все", addRssTitle: "➕ Добавить", addRssSearchHint: "🔍 Тема/URL:", addRssSearchBtn: "Найти", addRssManualHint: "➕ Вручную", addRssNamePlace: "Имя", addRssSaveBtn: "Сохранить", fetchBtnText: "ОБНОВИТЬ", loadingText: "Запуск...", scanning: "Скан:", pullToRefresh: "Потяните", login: "Google Вход", logout: "Выйти", manageSourcesTitle: "📰 Источники", searchSourcesPh: "Искать...", hideReadPopup: "Скрыть", refreshBtn: "🔄 Обновить", applyCloseBtn: "Применить", readerTab: "📖 Чтение", originalTab: "🌐 Оригинал", tripleTapHint: "Назад или 3 касания", loadingSite: "Загрузка...", extracting: "Текст...", scrollLoading: "Еще...", checkingUpdates: "Проверка...", swipeArchive: "💾 В архив", swipeArchived: "💾 В архиве", swipeHide: "👁️ Скрыть", readMore: "Читать →", guideTitle: "💡 Руководство", guide1: "👈 Свайп влево: Скрыть новость", guide2: "👉 Свайп вправо: В архив", guide3: "⬇️ Потянуть вниз: Загрузить свежие новости", guide4: "🏷️ Имя источника: Нажмите на карточку для фильтра", guide5: "📚 Верхнее меню: Поиск и фильтр", guide6: "👆 1 тап: Режим чтения", guide7: "✌️ 2 тапа: Оригинальный сайт", guide8: "📖 Режим чтения: 3 тапа или Назад для закрытия", addedSuccess: "Добавлено!", adSlotText: "Реклама", waitingText: "⏳ Загрузка новостей...", notFoundText: "🔍 Новости не найдены.", firewallBlockTitle: "Блокировка", firewallBlock: "Защита сайта заблокировала чтение без рекламы. Нажмите на синюю стрелку в правом верхнем углу, чтобы открыть оригинальный сайт.", googleNewsBlockTitle: "Блокировка перенаправления Google", googleNewsBlockDesc: "Google скрывает эту ссылку. Чтобы использовать функции чтения, перевода и аудио, откройте исходный сайт, скопируйте реальную ссылку из адресной строки и вставьте ее ниже.", manualPasteHint: "Вставьте реальную ссылку здесь...", unlockBtn: "🚀 Разблокировать и получить текст", openOriginalBtn: "🌐 Открыть оригинальный сайт" },
    'AR': { tabSearch: "🔍 بحث", tabFilter: "📚 تصفية", tabAddSource: "➕ مصدر", subtitle: "مصادر منك، مصدر أخبارك", menuTitle: "بحث ومصادر", regionLabel: "🌍 منطقة:", themeTitle: "🎨 مظاهر", themes: { 'default': '🌑 داكن', 'glass': '🪟 زجاج', 'metallic': '⚙️ معدني', 'hologram': '🌈 هولو', 'animated': '🌊 استوديو', 'cyber': '⚡ Cyber' }, layoutTitle: "📐 عرض", layouts: { 'list': '🔠 قائمة', 'small': '≣ صغير', 'medium': '⊞ متوسط', 'large': '🔲 كبير', 'shorts': '📱 شورتس' }, searchPlaceholder: "بحث...", catTitle: "📚 فلاتر", cats: { '': 'الكل', 'Arşiv': '💾 أرشيف', 'News': '📰 أخبار', 'Tech': '💻 تقنية', 'Science': '🧬 علوم', 'Health': '⚕️ صحة', 'Sport': '⚽ رياضة', 'Finance': '📈 مال', 'World': '🌍 عالم', 'Philo': '🦉 فلسفة' }, hideReadText: "👁️ إخفاء المقروء", sourceTitle: "📰 مصادر", selectAllBtn: "الكل", addRssTitle: "➕ إضافة", addRssSearchHint: "🔍 موضوع/رابط:", addRssSearchBtn: "بحث", addRssManualHint: "➕ يدوي", addRssNamePlace: "اسم", addRssSaveBtn: "حفظ", fetchBtnText: "تحديث", loadingText: "تحميل...", scanning: "مسح:", pullToRefresh: "اسحب للتحديث", login: "دخول جوجل", logout: "خروج", manageSourcesTitle: "📰 مصادر", searchSourcesPh: "بحث...", hideReadPopup: "إخفاء", refreshBtn: "🔄 تحديث", applyCloseBtn: "تطبيق", readerTab: "📖 قراءة", originalTab: "🌐 أصلي", tripleTapHint: "رجوع أو 3 نقرات", loadingSite: "تحميل...", extracting: "نص...", scrollLoading: "المزيد...", checkingUpdates: "تحديثات...", swipeArchive: "💾 حفظ", swipeArchived: "💾 محفوظ", swipeHide: "👁️ إخفاء", readMore: "اقرأ →", guideTitle: "💡 دليل", guide1: "👈 سحب لليسار: إخفاء الخبر", guide2: "👉 سحب لليمين: حفظ في الأرشيف", guide3: "⬇️ سحب للأسفل: جلب أحدث الأخبار", guide4: "🏷️ اسم المصدر: اضغط على البطاقة للتصفية", guide5: "📚 القائمة العلوية: تصفية أو إضافة", guide6: "👆 نقرة واحدة: وضع القراءة", guide7: "✌️ نقرتين: الموقع الأصلي", guide8: "📖 وضع القراءة: اضغط 3 مرات أو رجوع للإغلاق", addedSuccess: "تمت الإضافة!", adSlotText: "إعلان", waitingText: "⏳ جاري جلب الأخبار...", notFoundText: "🔍 لم يتم العثور على أخبار.", firewallBlockTitle: "جدار الحماية", firewallBlock: "منع جدار الحماية القراءة بدون إعلانات. يرجى النقر على السهم الأزرق في أعلى اليمين لفتح الموقع الأصلي.", googleNewsBlockTitle: "جدار توجيه جوجل", googleNewsBlockDesc: "يخفي جوجل هذا الرابط. لاستخدام ميزات القراءة والترجمة والصوت، افتح الموقع الأصلي، وانسخ الرابط الحقيقي من شريط العناوين والصقه أدناه.", manualPasteHint: "الصق الرابط الحقيقي هنا...", unlockBtn: "🚀 فتح واستخراج النص", openOriginalBtn: "🌐 فتح الموقع الأصلي" },
    'HI': { tabSearch: "🔍 खोज", tabFilter: "📚 फ़िल्टर", tabAddSource: "➕ स्रोत", subtitle: "आपसे प्राप्त, आपका समाचार स्रोत", menuTitle: "खोज और स्रोत", regionLabel: "🌍 क्षेत्र:", themeTitle: "🎨 थीम्स", themes: { 'default': '🌑 डार्क', 'glass': '🪟 ग्लास', 'metallic': '⚙️ मेटल', 'hologram': '🌈 होलो', 'animated': '🌊 स्टूडियो', 'cyber': '⚡ Cyber' }, layoutTitle: "📐 लेआउट", layouts: { 'list': '🔠 सूची', 'small': 'मोटा', 'medium': 'मध्य', 'large': 'बड़ा', 'shorts': 'शॉर्ट्स' }, searchPlaceholder: "खोजें...", catTitle: "📚 फ़िल्टर", cats: { '': 'सभी', 'Arşiv': '💾 आर्काइव', 'News': '📰 समाचार', 'Tech': '💻 टेक', 'Science': '🧬 विज्ञान', 'Health': 'स्वास्थ्य', 'Sport': '⚽ खेल', 'Finance': '📈 वित्त', 'World': '🌍 विश्व', 'Philo': '🦉 दर्शन' }, hideReadText: "👁️ पढ़े गए छिपाएं", sourceTitle: "📰 स्रोत", selectAllBtn: "सभी", addRssTitle: "➕ जोड़ें", addRssSearchHint: "🔍 विषय/URL:", addRssSearchBtn: "खोजें", addRssManualHint: "➕ मैन्युअल", addRssNamePlace: "नाम", addRssSaveBtn: "सहेजें", fetchBtnText: "अपडेट करें", loadingText: "लोड हो रहा है...", scanning: "स्कैनिंग:", pullToRefresh: "खींचें", login: "Google लॉगिन", logout: "बाहर", manageSourcesTitle: "📰 स्रोत", searchSourcesPh: "खोजें...", hideReadPopup: "छिपाएं", refreshBtn: "🔄 रीफ़्रेश", applyCloseBtn: "लागू करें", readerTab: "📖 रीडर", originalTab: "🌐 मूल", tripleTapHint: "वापस या 3 टैप", loadingSite: "लोड...", extracting: "टेक्स्ट...", scrollLoading: "और...", checkingUpdates: "अपडेट...", swipeArchive: "💾 सहेजें", swipeArchived: "💾 सहेजा गया", swipeHide: "👁️ छिपाएं", readMore: "पढ़ें →", guideTitle: "💡 मार्गदर्शिका", guide1: "👈 बाएँ स्वाइप: लेख छिपाएं", guide2: "👉 दाएँ स्वाइप: आर्काइव में सहेजें", guide3: "⬇️ नीचे खींचें: नवीनतम समाचार", guide4: "🏷️ स्रोत नाम: फ़िल्टर करने के लिए कार्ड पर टैप करें", guide5: "📚 शीर्ष मेनू: फ़िल्टर और खोज", guide6: "👆 1 टैप: रीडिंग मोड", guide7: "✌️ 2 टैप: मूल साइट", guide8: "📖 रीडिंग मोड: बंद करने के लिए 3 बार टैप या बैक करें", addedSuccess: "जोड़ा गया!", adSlotText: "विज्ञापन", waitingText: "⏳ समाचार प्राप्त कर रहे हैं...", notFoundText: "🔍 कोई समाचार नहीं मिला।", firewallBlockTitle: "सुरक्षा दीवार", firewallBlock: "सुरक्षा दीवार ने विज्ञापन-मुक्त पढ़ने को रोक दिया। मूल साइट खोलने के लिए ऊपर दाईं ओर नीले तीर पर क्लिक करें.", googleNewsBlockTitle: "Google रीडायरेक्ट वॉल", googleNewsBlockDesc: "Google इस लिंक को छुपाता है। पढ़ने, अनुवाद और ऑडियो सुविधाओं का उपयोग करने के लिए, मूल साइट खोलें, एड्रेस बार से वास्तविक लिंक कॉपी करें और इसे नीचे पेस्ट करें।", manualPasteHint: "असली लिंक यहाँ पेस्ट करें...", unlockBtn: "🚀 अनलॉक करें और टेक्स्ट प्राप्त करें", openOriginalBtn: "🌐 मूल साइट खोलें" }
};

const firebaseConfig = { apiKey: "AIzaSyCVIiXeaZKfS9QpXO6LU1LlKVfbyuiTZbE", authDomain: "scrollary.firebaseapp.com", projectId: "scrollary", storageBucket: "scrollary.firebasestorage.app", messagingSenderId: "636511730600", appId: "1:636511730600:web:d61b1335232cdcfe6e3b9d", measurementId: "G-MXHQDXS8LH" };
firebase.initializeApp(firebaseConfig); 
const auth = firebase.auth(); 
const db = firebase.firestore(); 
const provider = new firebase.auth.GoogleAuthProvider();

const GLOBAL_RSS_DB = {
    'TR': [ { id: 'sozcu', name: 'Sözcü', url: 'https://www.sozcu.com.tr/rss/tum-haberler.xml', cat: 'News' }, { id: 'cumhuriyet', name: 'Cumhuriyet', url: 'https://www.cumhuriyet.com.tr/rss', cat: 'News' }, { id: 'sabah', name: 'Sabah', url: 'https://www.sabah.com.tr/rss/sondakika.xml', cat: 'News' }, { id: 'cnnturk', name: 'CNN Türk', url: 'https://www.cnnturk.com/feed/rss/all/news', cat: 'News' }, { id: 'webtekno', name: 'Webtekno', url: 'https://www.webtekno.com/rss.xml', cat: 'Tech' }, { id: 'shiftdelete', name: 'ShiftDelete', url: 'https://shiftdelete.net/feed', cat: 'Tech' }, { id: 'evrim', name: 'Evrim Ağacı', url: 'https://evrimagaci.org/rss.xml', cat: 'Science' }, { id: 'fotomac', name: 'Fotomaç', url: 'https://www.fotomac.com.tr/rss/anasayfa.xml', cat: 'Sport' }, { id: 'aspor', name: 'A Spor', url: 'https://www.aspor.com.tr/rss/anasayfa.xml', cat: 'Sport' }, { id: 'bloomberg', name: 'Bloomberg HT', url: 'https://www.bloomberght.com/rss', cat: 'Finance' }, { id: 'bbctr', name: 'BBC Türkçe', url: 'https://feeds.bbci.co.uk/turkce/rss.xml', cat: 'World' }, { id: 'haberturk', name: 'Habertürk', url: 'https://www.haberturk.com/rss', cat: 'News' } ],
    'EN': [ { id: 'nytimes', name: 'NY Times', url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', cat: 'World' }, { id: 'bbc', name: 'BBC News', url: 'http://feeds.bbci.co.uk/news/rss.xml', cat: 'News' }, { id: 'fox', name: 'Fox News', url: 'http://feeds.foxnews.com/foxnews/world', cat: 'World' }, { id: 'yahoo', name: 'Yahoo News', url: 'https://news.yahoo.com/rss', cat: 'News' }, { id: 'tc', name: 'TechCrunch', url: 'https://techcrunch.com/feed/', cat: 'Tech' }, { id: 'verge', name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', cat: 'Tech' }, { id: 'sciam', name: 'Scientific American', url: 'http://rss.sciam.com/ScientificAmerican-Global', cat: 'Science' }, { id: 'webmd', name: 'WebMD', url: 'https://rssfeeds.webmd.com/rss/rss.aspx?RSSSource=RSS_PUBLIC', cat: 'Health' }, { id: 'espn', name: 'ESPN', url: 'https://www.espn.com/espn/rss/news', cat: 'Sport' }, { id: 'cnbc', name: 'CNBC', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000397', cat: 'Finance' }, { id: 'aljazeera', name: 'Al Jazeera EN', url: 'https://www.aljazeera.com/xml/rss/all.xml', cat: 'World' }, { id: 'philo', name: 'Philosophy Now', url: 'https://philosophynow.org/rss', cat: 'Philo' } ],
    'DE': [ { id: 'spiegel', name: 'Der Spiegel', url: 'https://www.spiegel.de/schlagzeilen/tops/index.rss', cat: 'News' }, { id: 'tagesschau', name: 'Tagesschau', url: 'https://www.tagesschau.de/xml/rss2/', cat: 'News' }, { id: 'faz', name: 'FAZ', url: 'https://www.faz.net/rss/aktuell/', cat: 'News' }, { id: 'sz', name: 'Süddeutsche', url: 'https://rss.sueddeutsche.de/rss/Topthemen', cat: 'News' }, { id: 'heise', name: 'Heise Online', url: 'https://www.heise.de/rss/heise-atom.xml', cat: 'Tech' }, { id: 'spektrum', name: 'Spektrum', url: 'https://www.spektrum.de/rss/alles', cat: 'Science' }, { id: 'kicker', name: 'Kicker', url: 'https://rss.kicker.de/news/aktuell', cat: 'Sport' }, { id: 'sport1', name: 'Sport1', url: 'https://www.sport1.de/news/rss.xml', cat: 'Sport' }, { id: 'handelsblatt', name: 'Handelsblatt', url: 'https://www.handelsblatt.com/contentexport/feed/top-themen', cat: 'Finance' }, { id: 'wiwo', name: 'WirtschaftsWoche', url: 'https://www.wiwo.de/contentexport/feed/rss/schlagzeilen', cat: 'Finance' }, { id: 'zeit', name: 'Die Zeit', url: 'https://newsfeed.zeit.de/index', cat: 'World' }, { id: 'philomag', name: 'Philo Magazin', url: 'https://www.philomag.de/rss.xml', cat: 'Philo' } ],
    'ES': [ { id: 'elpais', name: 'El País', url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada', cat: 'News' }, { id: 'elmundo', name: 'El Mundo', url: 'https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml', cat: 'News' }, { id: 'abc', name: 'ABC.es', url: 'https://www.abc.es/rss/2.0/espana/', cat: 'News' }, { id: '20min', name: '20 Minutos', url: 'https://www.20minutos.es/rss/', cat: 'World' }, { id: 'hiper', name: 'Hipertextual', url: 'https://hipertextual.com/feed', cat: 'Tech' }, { id: 'muy', name: 'Muy Interesante', url: 'https://www.muyinteresante.es/feed', cat: 'Science' }, { id: 'cuidate', name: 'CuidatePlus', url: 'https://www.cuidateplus.com/rss', cat: 'Health' }, { id: 'marca', name: 'Marca', url: 'https://e00-marca.uecdn.es/rss/futbol/primera-division.xml', cat: 'Sport' }, { id: 'as', name: 'Diario AS', url: 'https://as.com/rss/futbol/primera.xml', cat: 'Sport' }, { id: 'expansion', name: 'Expansión', url: 'https://e00-expansion.uecdn.es/rss/empresas.xml', cat: 'Finance' }, { id: 'bbcmundo', name: 'BBC Mundo', url: 'http://www.bbc.co.uk/mundo/temas/america_latina/index.xml', cat: 'World' }, { id: 'filosofia', name: 'Filosofía&Co', url: 'https://filco.es/feed/', cat: 'Philo' } ],
    'FR': [ { id: 'lemonde', name: 'Le Monde', url: 'https://www.lemonde.fr/rss/une.xml', cat: 'News' }, { id: 'figaro', name: 'Le Figaro', url: 'https://www.figaro.fr/rss/figaro_actualites.xml', cat: 'News' }, { id: 'libe', name: 'Libération', url: 'https://www.liberation.fr/arc/outboundfeeds/rss-all/collection/accueil-une/?outputType=xml', cat: 'News' }, { id: 'france24', name: 'France 24', url: 'https://www.france24.com/fr/rss', cat: 'World' }, { id: 'numerama', name: 'Numerama', url: 'https://www.numerama.com/feed/', cat: 'Tech' }, { id: 'futura', name: 'Futura Sciences', url: 'https://www.futura-sciences.com/rss/actualites.xml', cat: 'Science' }, { id: 'doctissimo', name: 'Doctissimo', url: 'https://www.doctissimo.fr/rss/news.xml', cat: 'Health' }, { id: 'equipe', name: 'L\'Équipe', url: 'https://dwh.lequipe.fr/api/edito/rss?path=/', cat: 'Sport' }, { id: 'echos', name: 'Les Echos', url: 'https://services.lesechos.fr/rss/les-echos-accueil.xml', cat: 'Finance' }, { id: 'tribune', name: 'La Tribune', url: 'https://www.latribune.fr/feed.xml', cat: 'Finance' }, { id: 'rtbf', name: 'RTBF Info', url: 'https://rss.rtbf.be/article/rss/highlight_rtbfinfo_info-accueil.xml', cat: 'World' }, { id: 'philomag', name: 'Philosophie Mag', url: 'https://www.philomag.com/rss.xml', cat: 'Philo' } ],
    'RU': [ { id: 'lenta', name: 'Lenta.ru', url: 'https://lenta.ru/rss/news', cat: 'News' }, { id: 'meduza', name: 'Meduza', url: 'https://meduza.io/rss/all', cat: 'News' }, { id: 'ria', name: 'RIA Novosti', url: 'https://ria.ru/export/rss2/archive/index.xml', cat: 'World' }, { id: 'tass', name: 'TASS', url: 'http://tass.ru/rss/v2.xml', cat: 'World' }, { id: 'habr', name: 'Habr', url: 'https://habr.com/ru/rss/all/all/', cat: 'Tech' }, { id: 'naked', name: 'Naked Science', url: 'https://naked-science.ru/feed', cat: 'Science' }, { id: 'champ', name: 'Championat', url: 'https://www.championat.com/xml/rss.xml', cat: 'Sport' }, { id: 'sportex', name: 'Sport Express', url: 'https://www.sport-express.ru/services/materials/news/se/', cat: 'Sport' }, { id: 'kommersant', name: 'Kommersant', url: 'https://www.kommersant.ru/RSS/news.xml', cat: 'Finance' }, { id: 'vedomosti', name: 'Vedomosti', url: 'https://www.vedomosti.ru/rss/news', cat: 'Finance' }, { id: '3dnews', name: '3DNews', url: 'https://3dnews.ru/news/rss/', cat: 'Tech' }, { id: 'rt_ru', name: 'RT', url: 'https://russian.rt.com/rss', cat: 'World' } ],
    'AR': [ { id: 'aljazeera', name: 'Al Jazeera', url: 'https://www.aljazeera.net/aljazeerarss/a7c186be-1baa-4bd4-9d80-a84db769f779/73d0e1b4-532f-45ef-b135-bfdff8b8cab9', cat: 'News' }, { id: 'alarabiya', name: 'Al Arabiya', url: 'https://www.alarabiya.net/.mrss/ar', cat: 'News' }, { id: 'skynews', name: 'Sky News Arabia', url: 'https://www.skynewsarabia.com/rss/home', cat: 'World' }, { id: 'bbc', name: 'BBC Arabic', url: 'http://feeds.bbci.co.uk/arabic/rss.xml', cat: 'World' }, { id: 'ait', name: 'AIT News', url: 'https://aitnews.com/feed/', cat: 'Tech' }, { id: 'techwd', name: 'Tech WD', url: 'https://www.tech-wd.com/wd/feed/', cat: 'Tech' }, { id: 'sciarab', name: 'Scientific Arab', url: 'https://scientificarab.com/feed/', cat: 'Science' }, { id: 'webteb', name: 'WebTeb', url: 'https://www.webteb.com/rss/health', cat: 'Health' }, { id: 'kooora', name: 'Kooora', url: 'https://www.kooora.com/rss/news.xml', cat: 'Sport' }, { id: 'cnbc', name: 'CNBC Arabia', url: 'https://www.cnbcarabia.com/rss', cat: 'Finance' }, { id: 'rt_ar', name: 'RT Arabic', url: 'https://arabic.rt.com/rss', cat: 'World' }, { id: 'cnn_ar', name: 'CNN Arabic', url: 'https://arabic.cnn.com/api/v1/rss/middle_east/rss.xml', cat: 'World' } ],
    'HI': [ { id: 'ndtv', name: 'NDTV India', url: 'https://feeds.feedburner.com/ndtvkhabar-latest', cat: 'News' }, { id: 'aajtak', name: 'Aaj Tak', url: 'https://feeds.feedburner.com/aajtak/home', cat: 'News' }, { id: 'jagran', name: 'Dainik Jagran', url: 'https://rss.jagran.com/rss/news/national.xml', cat: 'News' }, { id: 'amar', name: 'Amar Ujala', url: 'https://www.amarujala.com/rss/india-news.xml', cat: 'News' }, { id: 'bbc', name: 'BBC Hindi', url: 'https://feeds.bbci.co.uk/hindi/rss.xml', cat: 'World' }, { id: 'wire', name: 'The Wire Hindi', url: 'https://thewirehindi.com/feed/', cat: 'World' }, { id: 'tech', name: 'Tech in Hindi', url: 'https://www.techinhindi.com/feed/', cat: 'Tech' }, { id: 'health', name: 'OnlyMyHealth', url: 'https://www.onlymyhealth.com/rss/hindi.xml', cat: 'Health' }, { id: 'sports', name: 'Sportskeeda', url: 'https://hindi.sportskeeda.com/feed', cat: 'Sport' }, { id: 'money', name: 'Moneycontrol', url: 'https://hindi.moneycontrol.com/rss/latest-news.xml', cat: 'Finance' }, { id: 'zee', name: 'Zee News', url: 'https://zeenews.india.com/hindi/india/rss', cat: 'World' }, { id: 'abp', name: 'ABP News', url: 'https://www.abplive.com/home/feed', cat: 'News' } ]
};

let currentUser = null; 
let currentRegion = 'EN'; 
let currentCategory = ''; 
let isArchiveView = false;

let RSS_FEEDS = []; 
let allArticles = []; 
let filteredArticles = []; 
let activeSources = []; 

let archivedArticles = JSON.parse(localStorage.getItem('archivedArticlesList')) || [];
let readArticles = JSON.parse(localStorage.getItem('readArticlesList')) || [];
let showReadArticles = false; 
let displayedCount = 0; 
let isFetchingRefresh = false; 
const ITEMS_PER_PAGE = 20;

const ptrEl = document.getElementById('pullToRefresh');
const ptrIcon = document.getElementById('ptrIcon');
const ptrText = document.getElementById('ptrText');

async function fetchWithTimeout(resource, timeout = 10000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(resource, { signal: controller.signal });
        clearTimeout(id); 
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

let currentTheme = localStorage.getItem('appTheme') || 'animated';
let currentLayout = localStorage.getItem('appLayout') || 'medium';
let initialFetchDone = false; 

function detectUserRegion() {
    const savedRegion = localStorage.getItem('scrollaryRegion'); 
    if (savedRegion) return savedRegion;
    const shortLang = (navigator.language || navigator.userLanguage).substring(0, 2).toUpperCase();
    return ['TR', 'EN', 'ES', 'DE', 'FR', 'RU', 'AR', 'HI'].includes(shortLang) ? shortLang : 'EN';
}

window.onload = () => {
    currentRegion = detectUserRegion(); 
    document.getElementById('regionSelect').value = currentRegion;
    applyTranslations(currentRegion, true); 
    loadCustomFeeds(); 
    changeTheme(currentTheme); 
    setGridSize(currentLayout, null, true);

    const cached = JSON.parse(localStorage.getItem('savedNewsArticles')) || [];
    if(cached.length > 0) {
        allArticles = interlaceArticles(cached);
        handleSearch(true); 
        setTimeout(() => { fetchAllRSS(true); }, 1500); 
    } else {
        fetchAllRSS(false); 
    }
};

function openModalSafe(modalId) {
    document.getElementById(modalId).style.display = 'flex';
    document.body.style.overflow = 'hidden';
    history.pushState({ modal: modalId }, '');
}

window.addEventListener('popstate', (e) => {
    document.getElementById('newsModal').style.display = 'none';
    document.getElementById('settingsModal').style.display = 'none';
    document.getElementById('sourceFilterModal').style.display = 'none';
    document.getElementById('guideModal').style.display = 'none';
    document.getElementById('voiceModal').style.display = 'none';
    
    // AI Yanıt Modalını Geri Dönüşte Kapat
    const aiModal = document.getElementById('aiInlineResult');
    if(aiModal) aiModal.classList.remove('show');
    
    const wrapper = document.getElementById('controlsWrapper');
    if (wrapper && !wrapper.classList.contains('collapsed')) {
        wrapper.classList.add('collapsed');
        document.getElementById('toggleIcon').innerText = '▼';
    }

    document.body.style.overflow = 'auto';
});

function closeModalSafe(modalId) {
    if(history.state && history.state.modal === modalId) {
        history.back();
    } else {
        document.getElementById(modalId).style.display = 'none';
        document.body.style.overflow = 'auto';
        if(modalId === 'newsModal') {
            window.speechSynthesis.cancel();
            
            // AI Yanıt Modalını Çıkışta Kapat
            const aiModal = document.getElementById('aiInlineResult');
            if(aiModal) aiModal.classList.remove('show');
            
            const oldIframe = document.getElementById('modalIframe');
            if(oldIframe) { 
                const newIframe = document.createElement('iframe'); 
                newIframe.id = 'modalIframe'; 
                newIframe.className = 'modal-iframe'; 
                oldIframe.parentNode.replaceChild(newIframe, oldIframe); 
            }
        }
    }
}

function applyTranslations(regionCode, skipRender = false) {
    const t = TRANSLATIONS[regionCode] || TRANSLATIONS['EN'];
    document.querySelectorAll('[data-i18n]').forEach(el => { 
        const key = el.getAttribute('data-i18n'); 
        if(t[key]) el.innerText = t[key]; 
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { 
        const key = el.getAttribute('data-i18n-ph'); 
        if(t[key]) el.placeholder = t[key]; 
    });
    
    const tWrap = document.getElementById('themeBtnsWrapper'); 
    tWrap.innerHTML = '';
    for (const [key, val] of Object.entries(t.themes)) { 
        tWrap.innerHTML += `<button class="view-btn theme-btn ${currentTheme === key ? 'active' : ''}" onclick="changeTheme('${key}', this)">${val}</button>`; 
    }
    
    const lWrap = document.getElementById('layoutBtnsWrapper'); 
    lWrap.innerHTML = '';
    for (const [key, val] of Object.entries(t.layouts)) { 
        lWrap.innerHTML += `<button class="view-btn ${currentLayout === key ? 'active' : ''}" onclick="setGridSize('${key}', this, true)">${val}</button>`; 
    }
    
    const cWrap = document.getElementById('catWrapper'); 
    cWrap.innerHTML = '';
    for (const [key, val] of Object.entries(t.cats)) { 
        const isArc = key === 'Arşiv'; 
        cWrap.innerHTML += `<button class="cat-btn ${isArc ? 'cat-btn-archive' : ''} ${currentCategory === key ? 'active' : ''}" onclick="filterCategory('${key}', this)">${val}</button>`; 
    }
    
    if(initialFetchDone && !skipRender) renderNextBatch(true); 
}

function switchGlobalRegion(regionCode) {
    currentRegion = regionCode; 
    document.getElementById('regionSelect').value = regionCode; 
    localStorage.setItem('scrollaryRegion', regionCode);
    applyTranslations(currentRegion, true); 
    localStorage.removeItem('activeSourcesList'); 
    loadCustomFeeds(); 
    allArticles = []; 
    document.getElementById('newsGrid').innerHTML = '';
    fetchAllRSS(false); 
}

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

function toggleControls(event) { 
    if(event) event.stopPropagation(); 
    const wrapper = document.getElementById('controlsWrapper'); 
    const icon = document.getElementById('toggleIcon'); 
    if (wrapper.classList.contains('collapsed')) { 
        wrapper.classList.remove('collapsed'); 
        if(icon) icon.innerText = '▲'; 
        history.pushState({ menu: 'controls' }, '');
    } else { 
        wrapper.classList.add('collapsed'); 
        if(icon) icon.innerText = '▼'; 
        if(history.state && history.state.menu === 'controls') history.back();
    } 
}

function changeTheme(themeName, btnElement) { 
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active')); 
    if(btnElement) {
        btnElement.classList.add('active'); 
    } else { 
        Array.from(document.querySelectorAll('.theme-btn')).find(b => b.getAttribute('onclick').includes(themeName))?.classList.add('active'); 
    } 
    document.body.setAttribute('data-theme', themeName); 
    currentTheme = themeName; 
    localStorage.setItem('appTheme', themeName); 
    syncToCloud(); 
}

function toggleReadVisibility(show) { 
    showReadArticles = show; 
    document.getElementById('showReadMain').checked = show; 
    handleSearch(); 
}

function markAsRead(link, fromSwipe = false) { 
    if (!readArticles.includes(link)) { 
        readArticles.push(link); 
        localStorage.setItem('readArticlesList', JSON.stringify(readArticles)); 
        syncToCloud(); 
        if (!fromSwipe && !showReadArticles) handleSearch(true); 
        else if (!fromSwipe) handleSearch(true); 
    } 
}

function archiveArticleByLink(link) { 
    const art = allArticles.find(a => a.link === link) || archivedArticles.find(a => a.link === link); 
    if(!art) return; 
    if(!archivedArticles.find(a => a.link === link)) { 
        archivedArticles.push(art); 
        localStorage.setItem('archivedArticlesList', JSON.stringify(archivedArticles)); 
        syncToCloud(); 
    } 
    showToastGlobal(TRANSLATIONS[currentRegion].swipeArchived); 
}

function setGridSize(size, btnElement, skipSave = false) { 
    document.querySelectorAll('.view-btn:not(.theme-btn)').forEach(b => b.classList.remove('active')); 
    if(btnElement) {
        btnElement.classList.add('active'); 
    } else { 
        Array.from(document.querySelectorAll('.view-btn:not(.theme-btn)')).find(b => b.getAttribute('onclick').includes(size))?.classList.add('active'); 
    } 
    const grid = document.getElementById('newsGrid'); 
    grid.className = 'news-grid grid-' + size; 
    if (size === 'shorts') document.body.classList.add('shorts-mode'); 
    else document.body.classList.remove('shorts-mode'); 
    if(!skipSave) { 
        currentLayout = size; 
        localStorage.setItem('appLayout', size); 
    } 
}

function filterCategory(catKey, btnElement) { 
    isArchiveView = (catKey === 'Arşiv' || catKey === 'Archive'); 
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active')); 
    if(btnElement) btnElement.classList.add('active'); 
    currentCategory = catKey; 
    handleSearch(); 
}

function openSourceFilterModal(event) { 
    if(event) event.stopPropagation(); 
    openModalSafe('sourceFilterModal'); 
    document.getElementById('popupSearchInput').value = document.getElementById('searchInput').value; 
    loadCustomFeeds(); 
}

function syncSearchInputs(val) { 
    document.getElementById('searchInput').value = val; 
    handleSearch(); 
}

function popupRefresh() { 
    document.getElementById('popupFilterList').innerHTML = '🔄...'; 
    fetchAllRSS(true); 
    setTimeout(() => { loadCustomFeeds(); }, 1500); 
}

function loadCustomFeeds() {
    RSS_FEEDS = [...(GLOBAL_RSS_DB[currentRegion] || GLOBAL_RSS_DB['EN'])];
    const savedFeeds = JSON.parse(localStorage.getItem('customRSSFeeds')) || [];
    const regionFeeds = savedFeeds.filter(f => (f.lang || 'EN') === currentRegion);
    RSS_FEEDS.push(...regionFeeds);
    const savedActive = JSON.parse(localStorage.getItem('activeSourcesList'));
    
    if (savedActive && savedActive.length > 0) { 
        activeSources = savedActive; 
    } else { 
        activeSources = RSS_FEEDS.map(f => f.name); 
    }
    renderChips();
}

function saveActiveSources() { 
    localStorage.setItem('activeSourcesList', JSON.stringify(activeSources)); 
    syncToCloud(); 
}

function interlaceArticles(articles) {
    const grouped = {};
    articles.forEach(art => {
        const src = art.source || 'Bilinmeyen';
        if(!grouped[src]) grouped[src] = [];
        grouped[src].push(art);
    });
    for(let src in grouped) {
        grouped[src].sort((a,b) => b.timestamp - a.timestamp);
    }
    const result = [];
    let hasMore = true;
    while(hasMore) {
        hasMore = false;
        let currentRound = [];
        for(let src in grouped) {
            if(grouped[src].length > 0) {
                currentRound.push(grouped[src].shift());
                hasMore = true;
            }
        }
        currentRound.sort((a,b) => b.timestamp - a.timestamp);
        result.push(...currentRound);
    }
    return result;
}

async function addDiscoveredRss(name, url) { 
    const newFeed = { id: 'custom_' + Date.now(), name: name.substring(0, 30), url: url, isCustom: true, lang: currentRegion, cat: 'News' };
    const savedFeeds = JSON.parse(localStorage.getItem('customRSSFeeds')) || []; 
    if(!savedFeeds.find(f => f.url === url)) { 
        savedFeeds.push(newFeed); 
        localStorage.setItem('customRSSFeeds', JSON.stringify(savedFeeds)); 
    }
    if(!activeSources.includes(newFeed.name)) { 
        activeSources.push(newFeed.name); 
        saveActiveSources(); 
    }
    
    document.getElementById('rssSearchResults').innerHTML = `<span style="color:#10b981; font-weight:bold; margin-top:10px; display:block;">⏳ Haberler listene düşüyor...</span>`;
    
    currentCategory = '';
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    const catBtns = document.querySelectorAll('.cat-btn');
    if(catBtns.length > 0) catBtns[0].classList.add('active');

    loadCustomFeeds(); 
    syncToCloud(); 
    document.getElementById('controlsWrapper').classList.add('collapsed'); 
    document.getElementById('toggleIcon').innerText = '▼'; 
    
    const arts = await fetchFeedData(newFeed);
    if(arts && arts.length > 0) {
        arts.forEach(a => { if(!allArticles.find(x => x.link === a.link)) allArticles.push(a); });
        allArticles = interlaceArticles(allArticles);
        saveToLocalMemory();
        handleSearch(true); 
    }
    document.getElementById('rssSearchResults').innerHTML = `<span style="color:#10b981; font-weight:bold; margin-top:10px; display:block;">${TRANSLATIONS[currentRegion].addedSuccess}</span>`;
}

async function findRssFromUrl() {
    const urlInput = document.getElementById('searchRssUrl').value.trim(); 
    if (!urlInput) return;
    const resultsDiv = document.getElementById('rssSearchResults'); 
    resultsDiv.innerHTML = '⏳ Aranıyor...';
    const isUrl = urlInput.includes('.') && !urlInput.includes(' ');
    
    let hl = currentRegion.toLowerCase(); 
    let gl = currentRegion.toUpperCase();
    if (currentRegion === 'EN') { hl = 'en-US'; gl = 'US'; }
    else if (currentRegion === 'ES') { hl = 'es'; gl = 'ES'; }
    
    const gNewsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(urlInput)}&hl=${hl}&gl=${gl}&ceid=${gl}:${hl.split('-')[0]}`;
    let cleanTitle = urlInput.replace(/'/g, "\\'");
    
    if (!isUrl) {
        resultsDiv.innerHTML = `<span style="color:#10b981; font-weight:bold;">✅ Konu bulundu:</span><br><button style="background:var(--surface-light); text-align:left; font-size:0.85rem; color:white; padding:10px; border-radius:5px; width:100%; margin-top:8px; cursor:pointer;" onclick="addDiscoveredRss('${cleanTitle}', '${gNewsUrl}')">➕ Google Haberler: ${urlInput}</button>`;
        return;
    }
    
    let targetUrl = urlInput.startsWith('http') ? urlInput : 'https://' + urlInput;
    try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
        const resH = await fetchWithTimeout(proxyUrl, 8000); 
        const dataH = await resH.json();
        if (dataH.contents) {
            const parser = new DOMParser(); 
            const doc = parser.parseFromString(dataH.contents, 'text/html');
            const rssLinks = doc.querySelectorAll('link[type="application/rss+xml"], link[type="application/atom+xml"]');
            if (rssLinks.length > 0) {
                resultsDiv.innerHTML = '<span style="color:#10b981; font-weight:bold;">✅ Site kaynakları bulundu:</span>';
                rssLinks.forEach((link) => {
                    let href = link.getAttribute('href'); let title = link.getAttribute('title') || 'Ana RSS';
                    if(href.startsWith('/')) { href = new URL(targetUrl).origin + href; } 
                    else if (!href.startsWith('http')) { href = targetUrl.replace(/\/$/, '') + '/' + href; }
                    let linkTitle = title.replace(/'/g, "\\'");
                    resultsDiv.innerHTML += `<button style="background:var(--surface-light); text-align:left; font-size:0.85rem; color:white; padding:10px; border-radius:5px; width:100%; margin-top:8px; cursor:pointer;" onclick="addDiscoveredRss('${linkTitle}', '${href}')">➕ ${title}</button>`;
                });
                return;
            }
        }
        throw new Error("No RSS found on site");
    } catch (err) { 
        resultsDiv.innerHTML = `⚠️ Sitede açık RSS bulunamadı.<br><span style="color:#10b981; font-weight:bold;">✅ Alternatif (Google Haberler):</span><br><button style="background:var(--surface-light); text-align:left; font-size:0.85rem; color:white; padding:10px; border-radius:5px; width:100%; margin-top:8px; cursor:pointer;" onclick="addDiscoveredRss('${cleanTitle}', '${gNewsUrl}')">➕ Haber Taraması: ${urlInput}</button>`;
    }
}

function addCustomRSSManual() {
    const nameInput = document.getElementById('newRssName'); 
    const urlInput = document.getElementById('newRssUrl'); 
    const name = nameInput.value.trim(); 
    const url = urlInput.value.trim();
    if(!name || !url) return;
    addDiscoveredRss(name, url);
    nameInput.value = ''; 
    urlInput.value = ''; 
    document.getElementById('manualAddSection').classList.remove('show'); 
}

function deleteCustomRSS(id, event) { 
    event.stopPropagation(); 
    if(!confirm("Delete?")) return; 
    let savedFeeds = JSON.parse(localStorage.getItem('customRSSFeeds')) || []; 
    savedFeeds = savedFeeds.filter(f => f.id !== id); 
    localStorage.setItem('customRSSFeeds', JSON.stringify(savedFeeds)); 
    syncToCloud(); 
    loadCustomFeeds(); 
    handleSearch(); 
}

function toggleSourceState(sourceName) { 
    if(activeSources.includes(sourceName)) { 
        activeSources = activeSources.filter(s => s !== sourceName); 
    } else { 
        activeSources.push(sourceName); 
    } 
    saveActiveSources(); 
    renderChips(); 
    handleSearch(); 
}

function toggleAllSourcesState(event) { 
    event.stopPropagation(); 
    if(activeSources.length === RSS_FEEDS.length) { 
        activeSources = []; 
    } else { 
        activeSources = RSS_FEEDS.map(f => f.name); 
    } 
    saveActiveSources(); 
    renderChips(); 
    handleSearch(); 
}

function renderChips() {
    const listMain = document.getElementById('filterList');
    const listPopup = document.getElementById('popupFilterList');
    if(listMain) listMain.innerHTML = '';
    if(listPopup) listPopup.innerHTML = '';
    RSS_FEEDS.forEach(feed => {
        const isActive = activeSources.includes(feed.name); 
        let deleteBtn = feed.isCustom ? `<span class="chip-delete" onclick="deleteCustomRSS('${feed.id}', event)">✕</span>` : '';
        const htmlStr = `<input type="checkbox" style="display:none;" value="${feed.name}" ${isActive ? 'checked' : ''} onchange="toggleSourceState('${feed.name}')"> ${feed.name} ${deleteBtn}`;
        
        const labelMain = document.createElement('label'); 
        labelMain.className = `chip ${isActive ? 'active' : ''}`; 
        labelMain.innerHTML = htmlStr; 
        if(listMain) listMain.appendChild(labelMain);
        
        const labelPopup = document.createElement('label'); 
        labelPopup.className = `chip ${isActive ? 'active' : ''}`; 
        labelPopup.innerHTML = htmlStr; 
        if(listPopup) listPopup.appendChild(labelPopup);
    });
}

async function fetchFeedData(feed) {
    const apiUrl = `https://scrollary-api.onrender.com/api/fetch-news?url=${encodeURIComponent(feed.url)}`;
    try {
        const res = await fetchWithTimeout(apiUrl, 25000); 
        if (res.ok) {
            const data = await res.json();
            if (data && data.articles && data.articles.length > 0) {
                return data.articles.map(item => {
                    let pubDate = new Date(item.date);
                    if (isNaN(pubDate.getTime())) pubDate = new Date();
                    return { title: item.title || "İsimsiz Haber", description: item.description || "", link: item.link || "#", image: item.image || "", source: feed.name, date: pubDate, timestamp: pubDate.getTime(), categories: feed.cat ? [feed.cat] : [] };
                });
            }
        }
    } catch(e) {}
    
    const fallbackProxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(feed.url)}`;
    try {
        const fallbackRes = await fetchWithTimeout(fallbackProxy, 8000);
        if (fallbackRes.ok) {
            const text = await fallbackRes.text();
            return parseXMLToArticles(text, feed);
        }
    } catch(err) {} 

    return [];
}

function parseXMLToArticles(textData, feed) {
    const parser = new DOMParser(); 
    const xmlDoc = parser.parseFromString(textData, "text/xml"); 
    const items = [...Array.from(xmlDoc.getElementsByTagName("item")), ...Array.from(xmlDoc.getElementsByTagName("entry"))];
    let result = []; 
    let baseUrl = ""; 
    try { baseUrl = new URL(feed.url).origin; } catch(e){}
    
    items.forEach(item => {
        try {
            let title = "Haber Başlığı"; 
            const titleNode = item.getElementsByTagName("title")[0];
            if (titleNode) title = titleNode.textContent.trim() || "Haber Başlığı";

            let link = "#"; 
            const linkNode = item.getElementsByTagName("link")[0];
            if (linkNode) { 
                link = linkNode.textContent ? linkNode.textContent.trim() : ""; 
                if(!link) link = linkNode.getAttribute("href") || "#"; 
            }

            let desc = ""; 
            const descNode = item.getElementsByTagName("description")[0] || item.getElementsByTagName("summary")[0] || item.getElementsByTagName("content")[0];
            if (descNode) desc = descNode.textContent || "";
            
            const contentEnc = item.getElementsByTagName("content:encoded")[0] || item.getElementsByTagNameNS("*", "encoded")[0];
            if (!desc && contentEnc) desc = contentEnc.textContent || "";

            let fullText = desc + " " + (contentEnc ? (contentEnc.textContent || "") : "");

            let pubDate = new Date();
            const pubNodes = item.getElementsByTagName("pubDate")[0] || item.getElementsByTagName("published")[0] || item.getElementsByTagName("updated")[0] || item.getElementsByTagName("date")[0];
            if (pubNodes && pubNodes.textContent) { 
                const parsed = new Date(pubNodes.textContent); 
                if (!isNaN(parsed.getTime())) pubDate = parsed; 
            }
            if (pubDate.getTime() > Date.now() + 3600000) { pubDate = new Date(); }

            let image = "";
            const enclosure = item.getElementsByTagName("enclosure")[0];
            const mediaContent = item.getElementsByTagName("media:content")[0] || item.getElementsByTagNameNS("*", "content")[0];
            const mediaThumb = item.getElementsByTagName("media:thumbnail")[0] || item.getElementsByTagNameNS("*", "thumbnail")[0];

            if (enclosure && enclosure.getAttribute("url")) image = enclosure.getAttribute("url");
            else if (mediaContent && mediaContent.getAttribute("url")) image = mediaContent.getAttribute("url");
            else if (mediaThumb && mediaThumb.getAttribute("url")) image = mediaThumb.getAttribute("url");
            else { 
                const imgMatch = fullText.match(/<img[^>]+src=["']([^"']+)["']/i); 
                if (imgMatch && imgMatch[1]) image = imgMatch[1]; 
            }

            if (image && image.startsWith('/')) image = baseUrl + image; 
            if (image && image.startsWith('http:')) image = image.replace('http:', 'https:');

            let resultItem = { 
                title, 
                description: desc.replace(/<[^>]*>?/gm, '').trim().substring(0, 180) + '...', 
                link, 
                image: image || '', 
                source: feed.name, 
                date: pubDate, 
                timestamp: pubDate.getTime(), 
                categories: feed.cat ? [feed.cat] : [] 
            };
            result.push(resultItem);
        } catch(err) {} 
    }); 
    return result;
}

function saveToLocalMemory() { 
    try {
        const toSave = allArticles.slice(0, 300); 
        localStorage.setItem('savedNewsArticles', JSON.stringify(toSave)); 
    } catch(e) {} 
}

async function fetchAllRSS(isSilent = false) {
    if(isFetchingRefresh) return;
    isFetchingRefresh = true;
    
    const fetchBtn = document.getElementById('fetchBtn');
    const endSpinner = document.getElementById('endRefreshSpinner');
    
    fetchBtn.innerText = "🔄 " + TRANSLATIONS[currentRegion].scanning;
    fetchBtn.style.opacity = "0.7";
    if(!isSilent) endSpinner.style.display = 'block';

    let newCount = 0;
    
    const CHUNK_SIZE = 3;
    for (let i = 0; i < RSS_FEEDS.length; i += CHUNK_SIZE) {
        const chunk = RSS_FEEDS.slice(i, i + CHUNK_SIZE);
        await new Promise(r => setTimeout(r, 200)); 
        
        const promises = chunk.map(feed => fetchFeedData(feed));
        const results = await Promise.allSettled(promises);
        
        let chunkHasNew = false;
        results.forEach(res => {
            if (res.status === 'fulfilled' && res.value) {
                res.value.forEach(art => { 
                    if(!allArticles.find(a => a.link === art.link)) { 
                        allArticles.push(art); 
                        newCount++; 
                        chunkHasNew = true;
                    } 
                });
            }
        });

        if(chunkHasNew) {
            allArticles = interlaceArticles(allArticles);
            saveToLocalMemory();
            if(window.scrollY < 100) handleSearch(true); 
        }
    }

    if (newCount > 0 && window.scrollY >= 100) { 
        showToastGlobal(`⬆️ ${newCount} Yeni Haber Düştü!`);
    } else if (isSilent && newCount === 0) { 
        showToastGlobal(`✔️ En günceldesiniz`, 3000);
    }
    
    if (isSilent) { resetPullToRefresh(); } 
    
    endSpinner.style.display = 'none';
    fetchBtn.innerText = TRANSLATIONS[currentRegion].fetchBtnText;
    fetchBtn.style.opacity = "1";
    isFetchingRefresh = false;
    
    if(!isSilent) handleSearch(true);
}

function showToastGlobal(message, duration = 3000) {
    const toast = document.getElementById('toastNotification');
    document.getElementById('toastText').innerText = message;
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, duration);
}

function handleToastClick() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    handleSearch(true);
    document.getElementById('toastNotification').classList.remove('show');
}

function handleSearch(isSilentRefresh = false) {
    const searchText = (document.getElementById('searchInput').value.trim()).toLowerCase(); 
    const searchTerms = searchText.split(' ').filter(t => t.length > 0);
    let sourceArray = isArchiveView ? archivedArticles : allArticles;
    
    filteredArticles = sourceArray.filter(art => {
        if (!isArchiveView && !showReadArticles && readArticles.includes(art.link)) return false;
        const sourceMatch = isArchiveView ? true : activeSources.includes(art.source); 
        if(!sourceMatch) return false;
        if (currentCategory && currentCategory !== 'Arşiv' && currentCategory !== 'Archive') { 
            let hasCat = art.categories && art.categories.includes(currentCategory); 
            if (!hasCat) return false; 
        }
        const searchSpace = (art.title + " " + art.description + " " + (art.categories ? art.categories.join(' ') : "") + " " + art.source).toLowerCase();
        return searchTerms.length === 0 || searchTerms.every(term => searchSpace.includes(term)); 
    });
    
    if (!isSilentRefresh) { 
        document.getElementById('newsGrid').innerHTML = ''; 
        displayedCount = 0; 
    } else { 
        document.getElementById('newsGrid').innerHTML = ''; 
        displayedCount = 0; 
    }
    
    if (filteredArticles.length === 0) { 
        const t = TRANSLATIONS[currentRegion];
        const statusMsg = isFetchingRefresh ? t.waitingText : t.notFoundText;
        const icon = isFetchingRefresh ? '⏳' : '🔍';
        document.getElementById('newsGrid').innerHTML = `<div class="status-msg"><div style="font-size:3rem; margin-bottom:15px;">${icon}</div>${statusMsg}</div>`; 
        return; 
    }
    renderNextBatch();
}

function renderNextBatch(forceClear = false) {
    const grid = document.getElementById('newsGrid'); 
    if(forceClear) { 
        grid.innerHTML = ''; 
        displayedCount = 0; 
    }
    const nextBatch = filteredArticles.slice(displayedCount, displayedCount + ITEMS_PER_PAGE); 
    const t = TRANSLATIONS[currentRegion];
    
    nextBatch.forEach((art, i) => {
        if ((displayedCount + i) % 10 === 0 && (displayedCount + i) !== 0) {
            const adWrapper = document.createElement('div'); 
            adWrapper.className = 'swipe-wrapper ad-slot-wrapper';
            adWrapper.innerHTML = `
                <div class="news-card ad-slot-card">
                    <div class="ad-slot-label">${t.adSlotText}</div>
                    <img src="splash.png" class="default-splash-thumb">
                    <div style="font-size:0.8rem; color:#888; margin-top:10px;">(AdMob Ready Area)</div>
                </div>
            `;
            grid.appendChild(adWrapper);
        }

        const wrapper = document.createElement('div'); 
        wrapper.className = 'swipe-wrapper'; 
        wrapper.dataset.link = art.link;
        const isRead = readArticles.includes(art.link); 
        const isArchived = !!archivedArticles.find(a=> a.link === art.link);
        const dateObj = new Date(art.date); 
        const today = new Date(); 
        let dateStr = (dateObj.getDate() === today.getDate() && dateObj.getMonth() === today.getMonth()) ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : dateObj.toLocaleDateString([], { day: '2-digit', month: 'short' }) + " " + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        let catText = ""; 
        if(art.categories && art.categories.length > 0) { 
            let rawCat = art.categories[0]; 
            catText = t.cats[rawCat] || rawCat; 
        }

        let isDefault = !art.image;
        let safeImgUrl = art.image ? art.image.replace(/"/g, '&quot;') : '';
        let imgHtml = !isDefault ? `<img class="main-img" src="${safeImgUrl}" onload="this.style.opacity=1; this.parentElement.classList.remove('img-skeleton');" onerror="this.onerror=null; this.style.display='none'; this.parentElement.insertAdjacentHTML('beforeend', '<img src=\\'icon.png\\' class=\\'fallback-logo\\'>'); this.parentElement.setAttribute('data-default-img', 'true'); this.parentElement.classList.remove('img-skeleton');">` : '<img src="icon.png" class="fallback-logo">';

        wrapper.innerHTML = `
            <div class="swipe-bg swipe-bg-left">${isArchived ? t.swipeArchived : t.swipeArchive}</div><div class="swipe-bg swipe-bg-right">${t.swipeHide}</div>
            <div class="news-card ${isRead && !isArchiveView ? 'read-article' : ''}">
                <div class="card-img-wrapper ${isDefault ? '' : 'img-skeleton'}" ${isDefault ? 'data-default-img="true"' : ''}>
                    <div class="source-badge" onclick="openSourceFilterModal(event)">${art.source} ${catText ? '• '+catText : ''}</div>
                    ${imgHtml}
                </div>
                <div class="news-content"><h3>${art.title}</h3><div class="meta"><span>🕒 ${dateStr}</span><span class="read-more">${t.readMore || 'Oku →'}</span></div></div>
            </div>
        `;

        const card = wrapper.querySelector('.news-card'); 
        let clickTimer = null;
        card.onclick = (e) => { 
            if(e.target.tagName === 'A' || e.target.closest('.source-badge')) return; 
            if(e.detail === 1) { 
                clickTimer = setTimeout(() => { markAsRead(art.link); openModal(art); }, 250); 
            } else if(e.detail === 2) { 
                clearTimeout(clickTimer); markAsRead(art.link); window.open(art.link, '_blank'); 
            } 
        };
        grid.appendChild(wrapper);
    }); 
    displayedCount += nextBatch.length;
}

// -------------------- YAPAY ZEKA GÜNCELLEMELERİ VE SEKME MANTIĞI --------------------

function switchTab(tab) { 
    document.getElementById('tabReader').classList.remove('active'); 
    document.getElementById('tabWeb').classList.remove('active'); 
    
    // AI Yapışkan Çubuğunu Seçiyoruz
    const aiStickyBar = document.getElementById('aiStickyBar');

    if(tab === 'reader') { 
        document.getElementById('tabReader').classList.add('active'); 
        document.getElementById('readerView').style.display = 'block'; 
        document.getElementById('iframeView').style.display = 'none'; 
        if (aiStickyBar) aiStickyBar.style.display = 'flex'; // Okuma modundaysa göster
    } else { 
        document.getElementById('tabWeb').classList.add('active'); 
        document.getElementById('readerView').style.display = 'none'; 
        document.getElementById('iframeView').style.display = 'flex'; 
        if (aiStickyBar) aiStickyBar.style.display = 'none'; // Web modundaysa gizle
    } 
}

// AI Yanıt Kutucuğunu Kapatma Fonksiyonu
function closeAIResult() {
    const modal = document.getElementById('aiInlineResult');
    if(modal) modal.classList.remove('show');
}

// 🤖 POLLINATIONS AI SORU SORMA VE ÖZETLEME FONKSİYONU
async function handleAIRequest() {
    const inputEl = document.getElementById('aiInput');
    const query = inputEl.value.trim() || "Bu haberi özetle";
    const resultModal = document.getElementById('aiInlineResult');
    const resultContent = document.getElementById('aiResultContent');
    const btn = document.getElementById('aiSendBtn');

    const textContainer = document.getElementById('fullTextContainer');
    const paragraphs = Array.from(textContainer.querySelectorAll('p')).map(p => p.innerText);
    
    // ÇÖKME ÖNLEYİCİ: Uzun metinleri 2500 karakterle sınırlıyoruz
    let articleText = paragraphs.join(' ').substring(0, 2500); 

    if(articleText.length < 50) {
        alert("Haber metni henüz yüklenmedi veya çok kısa.");
        return;
    }

    // Toggle: Zaten açıksa kapat
    if (resultModal.classList.contains('show') && query === "Bu haberi özetle") {
        closeAIResult();
        return;
    }

    // Yükleniyor animasyonu
    resultModal.scrollTo(0, 0); // Pencere açıldığında en yukarıdan başla
    resultContent.innerHTML = '<div style="text-align:center; padding: 20px;"><span style="font-size:3rem; display:inline-block; animation:pulse 1s infinite;">⏳</span><br><br><span style="color:var(--accent); font-weight:bold;">Yapay zeka metni inceliyor...</span></div>';
    btn.disabled = true;

    const systemPrompt = `Sen profesyonel bir haber analiz asistanısın. 
Görevin, verilen haberi şu kurallara göre özetlemektir:
1. Haberin EN ÖNEMLİ özünü en başa, tek bir paragraf ve çarpıcı bir cümle olarak yaz.
2. Ardından önemli noktaları 'Maddelerle Detaylar' başlığı altında liste (<ul><li>) halinde ver.
3. Önemli isim, tarih veya kavramları <b></b> içine alarak vurgula.
4. Okuma kolaylığı için gerekli yerlerde <i></i> kullan.
5. Yanıtı doğrudan HTML formatında ver (Markdown kullanma).`;
    
    // GET İsteği İçin Güvenli Parametre (Çökmeyi tamamen engeller)
    const fullQuery = `${systemPrompt}\n\nHaber Metni:\n${articleText}\n\nKullanıcı İsteği: ${query}`;

    try {
        const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(fullQuery)}?model=openai`);

        if (!response.ok) throw new Error("API hatası");
        const data = await response.text();
        
        let cleanHtml = data.replace(/```html/g, '').replace(/```/g, '').trim();
        resultContent.innerHTML = cleanHtml;

        // Okuma ekranını en yukarı kaydır ki yanıt penceresi görünsün
        setTimeout(() => {
            const readerView = document.getElementById('modalBodyArea');
            readerView.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);

    } catch (err) {
        resultContent.innerHTML = `<div style="color:var(--danger); text-align:center; padding: 20px;">⚠️ Yapay zekaya ulaşılamadı. Haber çok uzun veya sunucu yoğun olabilir. Lütfen tekrar deneyin.</div>`;
    } finally {
        btn.disabled = false;
    }
}

async function openModal(art) {
    const t = TRANSLATIONS[currentRegion];
    document.getElementById('modalSource').innerText = art.source; 
    document.getElementById('modalLinkExt').href = art.link; 
    document.getElementById('modalTitle').innerText = art.title; 
    document.getElementById('modalDesc').innerText = art.description;
    
    // AI Input'u her girişte varsayılana döndür ve pencereyi gizle
    const aiInput = document.getElementById('aiInput');
    if (aiInput) aiInput.value = "Bu haberi özetle";
    const aiModal = document.getElementById('aiInlineResult');
    if (aiModal) aiModal.classList.remove('show');

    const imgEl = document.getElementById('modalImg'); 
    const modalBody = document.getElementById('modalBodyArea');
    
    if(!art.image) { 
        modalBody.setAttribute('data-default-img', 'true'); 
        imgEl.style.display = 'none'; 
    } else { 
        modalBody.removeAttribute('data-default-img'); 
        imgEl.src = art.image; 
        imgEl.style.display = 'block'; 
        imgEl.className = 'reader-image';
    }

    switchTab('reader'); 
    openModalSafe('newsModal'); 
    
    const textContainer = document.getElementById('fullTextContainer'); 
    textContainer.innerHTML = `<div class="loading-pulse">${t.extracting}</div>`;
    
    const oldIframe = document.getElementById('modalIframe'); 
    const iframe = document.createElement('iframe'); 
    iframe.id = 'modalIframe'; 
    iframe.className = 'modal-iframe'; 
    iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms allow-popups'); 
    oldIframe.parentNode.replaceChild(iframe, oldIframe); 
    
    const banner = document.getElementById('iframeBanner'); 
    banner.innerHTML = `<span style="animation: pulse 1.5s infinite;">⏳</span> ${t.loadingSite}`;

    let html = null;
    const encodedUrl = encodeURIComponent(art.link);

    const proxyGroup1 = [ `https://corsproxy.io/?${encodedUrl}`, `https://api.allorigins.win/raw?url=${encodedUrl}`, `https://api.codetabs.com/v1/proxy?quest=${encodedUrl}` ];
    const proxyGroup2 = [ `https://thingproxy.freeboard.io/fetch/${art.link}`, `https://cors.eu.org/${art.link}`, `https://api.codetabs.com/v1/proxy?quest=${encodedUrl}` ];

    async function fireProxies(proxies, timeoutMs) {
        const fetchPromises = proxies.map(proxy =>
            fetchWithTimeout(proxy, timeoutMs).then(async res => {
                if (!res.ok) throw new Error("Sunucu hatasi");
                const text = await res.text();
                if (!text || text.includes('security service to protect itself') || text.length < 500) throw new Error("Engellendi");
                return text;
            })
        );
        return Promise.any(fetchPromises);
    }

    try {
        if(art.link.includes('news.google.com')) {
            throw new Error("GoogleNewsLink");
        }

        try { 
            html = await fireProxies(proxyGroup1, 3000); 
        } catch (e1) {
            try { 
                html = await fireProxies(proxyGroup2, 4000); 
            } catch (e2) { 
                html = null; 
            }
        }

        if (!html) throw new Error("Bütün proxy denemeleri başarısız oldu.");

        const parser = new DOMParser(); 
        const doc = parser.parseFromString(html, 'text/html'); 
        const paragraphs = Array.from(doc.querySelectorAll('p, .content p, .news-text p, article p'));
        const validText = paragraphs.map(p => p.textContent.trim()).filter(txt => txt.length > 70); 
        const uniqueText = [...new Set(validText)];
        
        if (uniqueText.length > 0) { 
            textContainer.innerHTML = uniqueText.map((txt, idx) => {
                const clickableWords = txt.split(' ').map(w => `<span class="t-word" onclick="translateSingleWord(this, event)">${w}</span>`).join(' ');
                return `<div class="p-container">
                            <p id="p_${idx}">${clickableWords}</p>
                            <div class="p-actions-row">
                                <button class="btn-action-p" onclick="listenParagraph(${idx}, this)" title="Dinle">🔊</button>
                                <button class="btn-action-p" onclick="translateParagraph(${idx}, this)" title="Çevir">🌐</button>
                            </div>
                            <div class="translated-text" id="trans_${idx}"></div>
                        </div>`;
            }).join(''); 
        } else { throw new Error("Okunabilir metin bulunamadı"); }
        
        html = html.replace(/<meta[^>]+http-equiv=['"]?refresh['"]?[^>]*>/gi, ''); 
        html = html.replace(/window\.location\.replace/gi, 'console.log'); 
        html = html.replace(/window\.location\.href\s*=/gi, 'console.log=');
        
        const urlObj = new URL(art.link); 
        const baseUrl = urlObj.protocol + "//" + urlObj.host + "/";
        if (html.toLowerCase().includes('<head>')) { 
            html = html.replace(/<head>/i, `<head><base href="${baseUrl}">`); 
        } else { 
            html = `<base href="${baseUrl}">` + html; 
        }
        
        const scriptFix = `<script> window.onload = function() { const links = document.querySelectorAll('a'); links.forEach(l => l.setAttribute('target', '_blank')); }; <\/script>`;
        html = html.replace(/<\/body>/i, scriptFix + '</body>'); 
        
        iframe.srcdoc = html; 
        iframe.onload = () => { 
            banner.innerHTML = `✅`; 
            setTimeout(()=>{ banner.style.display='none'; }, 2000); 
        };
    } catch (err) { 
        const isGoogle = err.message === "GoogleNewsLink";
        const titleText = isGoogle ? (t.googleNewsBlockTitle || "Google Yönlendirme Duvarı") : (t.firewallBlockTitle || "Güvenlik Duvarı");
        const descText = isGoogle ? (t.googleNewsBlockDesc || "Google bu bağlantıyı gizliyor. Okuma, çeviri ve dinleme özelliklerini kullanmak için orijinal siteyi açın, adres çubuğundaki gerçek linki kopyalayıp aşağıdaki alana yapıştırın.") : (t.firewallBlock || "Reklamsız görünüm için sitenin güvenlik duvarı geçilemedi. Orijinal siteyi açmak için sağ üst köşedeki mavi ok butonuna tıklayın.");

        textContainer.innerHTML = `
            <div class="status-msg" style="padding: 30px 20px; text-align: center; cursor: default;">
                <div style="font-size: 3rem; margin-bottom: 15px;">${isGoogle ? '🤝' : '🛡️'}</div>
                <h3 style="color: white; margin-bottom: 10px;">${titleText}</h3>
                <p style="color: var(--text-muted); line-height: 1.6; font-size: 0.95rem; margin-bottom: 20px;">
                    ${descText}
                </p>
                
                <div style="display: flex; gap: 10px; justify-content: center; margin-bottom: 20px;">
                    <button onclick="window.open('${art.link}', '_blank')" style="background: var(--surface-light); color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 0.95rem;">
                        ${t.openOriginalBtn || '🌐 Orijinal Siteyi Aç'}
                    </button>
                </div>

                <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; border: 1px dashed var(--surface-light); display: flex; flex-direction: column; gap: 10px;">
                    <input type="text" id="manualLinkInput" placeholder="${t.manualPasteHint || 'Kopyaladığın gerçek linki buraya yapıştır...'}" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--accent); background: #0f172a; color: white; outline: none;">
                    <button onclick="fetchWithUserHelp()" style="background: var(--accent); color: white; border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer;">
                        ${t.unlockBtn || '🚀 Kilidi Aç ve Metni Çek'}
                    </button>
                </div>
            </div>`;
    }
}

async function fetchWithUserHelp() {
    const manualUrl = document.getElementById('manualLinkInput').value.trim();
    const textContainer = document.getElementById('fullTextContainer');
    const t = TRANSLATIONS[currentRegion];

    if(!manualUrl || !manualUrl.startsWith('http')) {
        alert("Lütfen geçerli bir http/https linki yapıştırın.");
        return;
    }

    textContainer.innerHTML = `<div class="loading-pulse">Farklı sunucularla kilit kırılıyor... Lütfen bekleyin ⏳</div>`;

    const fetchJina = async (url) => {
        const res = await fetch("https://r.jina.ai/" + url, { headers: { "Accept": "application/json" } });
        if (!res.ok) throw new Error("Jina failed");
        const data = await res.json();
        if (!data || !data.data || !data.data.content) throw new Error("Jina no content");
        
        let text = data.data.content;
        text = text.replace(/!\[.*?\]\(.*?\)/g, ''); 
        text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); 
        text = text.replace(/^#+\s*/gm, ''); 
        text = text.replace(/[*_]{1,2}/g, ''); 
        text = text.replace(/<[^>]*>/g, ''); 
        
        const paragraphs = text.split('\n').map(t => t.trim()).filter(t => {
            if (t.length < 70) return false; 
            if (t.includes('redirect=')) return false; 
            return true;
        });
        
        if (paragraphs.length < 1) throw new Error("Jina text too short");
        return paragraphs;
    };

    const fetchProxy = async (proxyBase, url) => {
        const res = await fetch(proxyBase + encodeURIComponent(url));
        if (!res.ok) throw new Error("Proxy failed");
        const html = await res.text();
        if (html.includes('security service to protect itself') || html.length < 1000) throw new Error("Blocked by Firewall");
        
        const parser = new DOMParser(); 
        const doc = parser.parseFromString(html, 'text/html'); 
        const pTags = Array.from(doc.querySelectorAll('p, .content p, .news-text p, article p'));
        const validText = pTags.map(p => p.textContent.trim()).filter(txt => txt.length > 70); 
        const uniqueText = [...new Set(validText)];
        
        if (uniqueText.length < 1) throw new Error("Proxy text too short");
        return uniqueText;
    };

    try {
        const paragraphs = await Promise.any([
            fetchProxy("https://corsproxy.io/?", manualUrl),
            fetchProxy("https://api.allorigins.win/raw?url=", manualUrl),
            fetchProxy("https://api.codetabs.com/v1/proxy?quest=", manualUrl),
            fetchJina(manualUrl) 
        ]);
        
        textContainer.innerHTML = paragraphs.map((txt, idx) => {
            const clickableWords = txt.split(' ').map(w => `<span class="t-word" onclick="translateSingleWord(this, event)">${w}</span>`).join(' ');
            return `<div class="p-container">
                        <p id="p_${idx}">${clickableWords}</p>
                        <div class="p-actions-row">
                            <button class="btn-action-p" onclick="listenParagraph(${idx}, this)" title="Dinle">🔊</button>
                            <button class="btn-action-p" onclick="translateParagraph(${idx}, this)" title="Çevir">🌐</button>
                        </div>
                        <div class="translated-text" id="trans_${idx}"></div>
                    </div>`;
        }).join('');
        
    } catch (err) {
        textContainer.innerHTML = `<div class="status-msg" style="color: #ef4444;">❌ Maalesef bu sitenin duvarı tüm sunucularımızı engelledi. Lütfen orijinal sekmede okuyun.</div>`;
    }
}

let tapCount = 0; 
let tapTimeout; 
document.getElementById('modalBodyArea').addEventListener('click', (e) => { 
    if(e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return; 
    tapCount++; 
    clearTimeout(tapTimeout); 
    if(tapCount >= 3) { 
        closeModalSafe('newsModal'); 
        tapCount = 0; 
    } else { 
        tapTimeout = setTimeout(() => { tapCount = 0; }, 600); 
    } 
});

let touchStartX = 0; 
let touchStartY = 0; 
let pullDistance = 0; 
let swipingCard = null; 
let swipeCurrentX = 0; 
let isVerticalScroll = false;

function handleDragStart(clientX, clientY, target) { 
    if (window.scrollY <= 5) touchStartY = clientY; 
    const card = target.closest('.news-card'); 
    if(card) { 
        swipingCard = card; 
        touchStartX = clientX; 
        touchStartY = clientY; 
        swipeCurrentX = 0; 
        isVerticalScroll = false; 
        card.classList.add('swiping'); 
    } 
}

function handleDragMove(clientX, clientY) {
    if (window.scrollY <= 5 && touchStartY > 0 && !swipingCard) { 
        pullDistance = clientY - touchStartY; 
        if (pullDistance > 0 && pullDistance < 150) { 
            ptrEl.style.opacity = Math.min(pullDistance / 80, 1); 
            ptrEl.style.transform = `translateX(-50%) translateY(${pullDistance * 0.5}px)`; 
            if (pullDistance > 80) { 
                ptrIcon.innerText = "🔄"; 
                ptrText.innerText = "..."; 
            } else { 
                ptrIcon.innerText = "⬇️"; 
                ptrText.innerText = TRANSLATIONS[currentRegion].pullToRefresh; 
            } 
        } 
    }
    if (swipingCard) { 
        const diffX = clientX - touchStartX; 
        const diffY = clientY - touchStartY; 
        if(!isVerticalScroll && Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 10) { 
            isVerticalScroll = true; 
            swipingCard.style.transform = `translateX(0px)`; 
            swipingCard.classList.remove('swiping'); 
            swipingCard = null; 
            return; 
        } 
        if(isVerticalScroll) return; 
        swipeCurrentX = diffX; 
        swipingCard.style.transform = `translateX(${swipeCurrentX}px)`; 
    }
}

function handleDragEnd() {
    if (pullDistance > 80 && !isFetchingRefresh && !swipingCard) { 
        ptrIcon.innerText = "⏳"; 
        ptrText.innerText = "..."; 
        fetchAllRSS(true); 
    } else { 
        resetPullToRefresh(); 
    }
    if (swipingCard) { 
        const wrapper = swipingCard.closest('.swipe-wrapper'); 
        const link = wrapper.dataset.link; 
        swipingCard.classList.remove('swiping'); 
        if(swipeCurrentX > 100) { 
            swipingCard.style.transform = `translateX(100%)`; 
            setTimeout(() => { archiveArticleByLink(link); wrapper.style.display = 'none'; }, 300); 
        } else if(swipeCurrentX < -100) { 
            swipingCard.style.transform = `translateX(-100%)`; 
            setTimeout(() => { markAsRead(link, true); wrapper.style.display = 'none'; }, 300); 
        } else { 
            swipingCard.style.transform = `translateX(0px)`; 
        } 
        swipingCard = null; 
    }
}

document.addEventListener('touchstart', e => handleDragStart(e.touches[0].clientX, e.touches[0].clientY, e.target), {passive: true}); 
document.addEventListener('touchmove', e => handleDragMove(e.touches[0].clientX, e.touches[0].clientY), {passive: true}); 
document.addEventListener('touchend', e => handleDragEnd()); 

document.addEventListener('mousedown', e => { 
    const card = e.target.closest('.news-card'); 
    if(card) { 
        this.isDragging = true; 
        handleDragStart(e.clientX, e.clientY, e.target); 
    } 
}); 

document.addEventListener('mousemove', e => { 
    if (!this.isDragging) return; 
    handleDragMove(e.clientX, e.clientY); 
}); 

document.addEventListener('mouseup', e => { 
    if (!this.isDragging) return; 
    this.isDragging = false; 
    handleDragEnd(); 
}); 

function resetPullToRefresh() { 
    ptrEl.style.transform = `translateX(-50%) translateY(0)`; 
    ptrEl.style.opacity = 0; 
    touchStartY = 0; 
    pullDistance = 0; 
    setTimeout(() => { 
        ptrIcon.innerText = "⬇️"; 
        ptrText.innerText = TRANSLATIONS[currentRegion].pullToRefresh; 
    }, 300); 
}

window.addEventListener('scroll', () => { 
    const cWrap = document.getElementById('controlsWrapper');
    if (window.scrollY > 60) { 
        cWrap.classList.add('is-scrolled'); 
    } else { 
        cWrap.classList.remove('is-scrolled'); 
    }
    
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 400) { 
        if (displayedCount < filteredArticles.length) { 
            const spinner = document.getElementById('scrollSpinner'); 
            spinner.style.display = 'block'; 
            setTimeout(() => { renderNextBatch(); spinner.style.display = 'none'; }, 100); 
        } else if (filteredArticles.length > 0 && !isFetchingRefresh) { 
            fetchAllRSS(true); 
        } 
    } 
});        

function copyPapara() {
    const paparaInput = document.getElementById("paparaInput");
    const numberOnly = paparaInput.value.replace("Papara No: ", "");
    navigator.clipboard.writeText(numberOnly).then(() => {
        showToastGlobal("Papara Numarası Kopyalandı! ✔️", 3000);
    });
}

function switchControlTab(tabId) {
    document.querySelectorAll('.c-tab').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.c-pane').forEach(pane => pane.classList.remove('active'));
    document.getElementById('tabBtn_' + tabId).classList.add('active');
    document.getElementById('pane_' + tabId).classList.add('active');
    
    setTimeout(() => {
        const wrapper = document.getElementById('controlsWrapper');
        const rect = wrapper.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > window.innerHeight) {
            wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
}

const layoutOrder = ['list', 'small', 'medium', 'large'];

document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if ((e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=')) || (!e.ctrlKey && (e.key === '+' || e.key === '-'))) {
        e.preventDefault(); 
        let direction = (e.key === '+' || e.key === '=') ? 1 : -1;
        let currentIndex = layoutOrder.indexOf(currentLayout);
        if (currentIndex === -1) currentIndex = 2; 

        let newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= layoutOrder.length) newIndex = layoutOrder.length - 1;

        if (newIndex !== currentIndex) {
            setGridSize(layoutOrder[newIndex], null);
            showToastGlobal("🔍 Görünüm: " + TRANSLATIONS[currentRegion].layouts[layoutOrder[newIndex]], 1500);
        }
    }

    if (!e.ctrlKey && e.key === 'ArrowDown') {
        e.preventDefault();
        window.scrollBy({ top: 300, left: 0, behavior: 'smooth' });
    }
    if (!e.ctrlKey && e.key === 'ArrowUp') {
        e.preventDefault();
        window.scrollBy({ top: -300, left: 0, behavior: 'smooth' });
    }
}, { passive: false });

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

const ttsLangMap = { 'EN': 'en-US', 'TR': 'tr-TR', 'DE': 'de-DE', 'ES': 'es-ES', 'FR': 'fr-FR', 'RU': 'ru-RU', 'AR': 'ar-SA', 'HI': 'hi-IN' };

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

document.getElementById('modalBodyArea').addEventListener('scroll', () => { hideTooltip(); }, {passive: true});        

const VOICE_LANG_MAP = { 'TR': 'tr-TR', 'EN': 'en-US', 'DE': 'de-DE', 'ES': 'es-ES', 'FR': 'fr-FR', 'RU': 'ru-RU', 'AR': 'ar-SA', 'HI': 'hi-IN' };

const VOICE_HINTS = {
    'TR': "Örn: 'Almanca haberlere geç', 'Maden ara', 'Filtreleri temizle'",
    'EN': "Ex: 'Switch to German', 'Search for mining', 'Clear filters'",
    'DE': "Bsp: 'Zu Englisch wechseln', 'Suche nach Bergbau', 'Filter löschen'",
    'ES': "Ej: 'Cambiar a inglés', 'Buscar minería', 'Limpiar filtros'",
    'FR': "Ex: 'Passer en anglais', 'Chercher mine', 'Effacer les filtres'",
    'RU': "Пример: 'Перейти на английский', 'Искать шахту', 'Очистить фильтры'",
    'AR': "مثال: 'التبديل إلى الإنجليزية' ، 'البحث عن تعدين' ، 'مسح الفلاتر'",
    'HI': "उदाहरण: 'अंग्रेजी पर जाएं', 'माइनिंग खोजें', 'फ़िल्टर साफ़ करें'"
};

const INTENT_DICT = {
    'TR': {
        search: ['ara', 'bul', 'göster', 'hakkında', 'getir', 'nedir', 'haberleri'],
        clearSearch: ['arama kelimelerini sil', 'arama çubuğunu boşalt', 'arama çubuğunu temizle', 'aramayı temizle', 'aramayı sil'],
        clearFilters: ['filtreleri kaldır', 'filtreyi temizle', 'tüm filtreleri temizle', 'filtreleri sıfırla'],
        hideRead: ['okunanları gizle', 'okunan haberleri gizle', 'okuduklarımı gizle'],
        showRead: ['okunanları göster', 'okunan haberleri göster', 'okuduklarımı göster'],
        regions: { 'TR': ['türkçe', 'türkiye'], 'EN': ['ingilizce', 'amerikan', 'global'], 'DE': ['almanca', 'almanya'], 'ES': ['ispanyolca', 'ispanya'], 'FR': ['fransızca', 'fransa'], 'RU': ['rusça', 'rusya'], 'AR': ['arapça', 'arap'], 'HI': ['hintçe', 'hindistan'] }
    },
    'EN': {
        search: ['search', 'find', 'show', 'about', 'news'],
        clearSearch: ['clear search', 'empty search bar', 'clear bar', 'clear search bar'],
        clearFilters: ['clear filters', 'remove filters', 'reset filters'],
        hideRead: ['hide read', 'hide read news', 'hide read articles'],
        showRead: ['show read', 'show read news', 'show read articles'],
        regions: { 'TR': ['turkish', 'turkey'], 'EN': ['english', 'global', 'us'], 'DE': ['german', 'germany'], 'ES': ['spanish', 'spain'], 'FR': ['french', 'france'], 'RU': ['russian', 'russia'], 'AR': ['arabic', 'arab'], 'HI': ['hindi', 'india'] }
    },
    'DE': {
        search: ['suche', 'finde', 'zeige', 'über', 'nachrichten'],
        clearSearch: ['suche löschen', 'suchleiste leeren', 'suche zurücksetzen'],
        clearFilters: ['filter löschen', 'alle filter entfernen', 'filter zurücksetzen'],
        hideRead: ['gelesene verbergen', 'gelesene ausblenden'],
        showRead: ['gelesene zeigen', 'gelesene einblenden'],
        regions: { 'TR': ['türkisch', 'türkei'], 'EN': ['englisch', 'global'], 'DE': ['deutsch', 'deutschland'], 'ES': ['spanisch', 'spanien'], 'FR': ['französisch', 'frankreich'], 'RU': ['russisch', 'russland'], 'AR': ['arabisch'], 'HI': ['hindi'] }
    },
    'ES': {
        search: ['buscar', 'encuentra', 'mostrar', 'sobre', 'noticias'],
        clearSearch: ['limpiar búsqueda', 'vaciar barra de búsqueda', 'limpiar barra'],
        clearFilters: ['borrar filtros', 'quitar filtros', 'limpiar filtros'],
        hideRead: ['ocultar leídos', 'ocultar noticias leídas'],
        showRead: ['mostrar leídos', 'ver leídos'],
        regions: { 'TR': ['turco', 'turquía'], 'EN': ['inglés', 'global'], 'DE': ['alemán', 'alemania'], 'ES': ['español', 'españa'], 'FR': ['francés', 'francia'], 'RU': ['ruso', 'rusia'], 'AR': ['árabe'], 'HI': ['hindi'] }
    },
    'FR': {
        search: ['cherche', 'trouve', 'montre', 'sur', 'actualités'],
        clearSearch: ['effacer la recherche', 'vider la barre', 'effacer la barre'],
        clearFilters: ['effacer les filtres', 'supprimer les filtres', 'réinitialiser les filtres'],
        hideRead: ['masquer les lus', 'cacher les actualités lues'],
        showRead: ['afficher les lus', 'montrer les lus'],
        regions: { 'TR': ['turc', 'turquie'], 'EN': ['anglais', 'global'], 'DE': ['allemand', 'allemagne'], 'ES': ['espagnol', 'espagne'], 'FR': ['français', 'france'], 'RU': ['russe', 'russie'], 'AR': ['arabe'], 'HI': ['hindi'] }
    },
    'RU': {
        search: ['найди', 'ищи', 'покажи', 'про', 'новости'],
        clearSearch: ['очистить поиск', 'очистить строку поиска', 'сбросить поиск'],
        clearFilters: ['очистить фильтры', 'удалить фильтры', 'сбросить фильтры'],
        hideRead: ['скрыть прочитанное', 'скрыть прочитанные новости'],
        showRead: ['показать прочитанное', 'показать прочитанные новости'],
        regions: { 'TR': ['турецкий', 'турция'], 'EN': ['английский', 'глобальный'], 'DE': ['немецкий', 'германия'], 'ES': ['испанский', 'испания'], 'FR': ['французский', 'франция'], 'RU': ['русский', 'россия'], 'AR': ['арабский'], 'HI': ['хинди'] }
    },
    'AR': {
        search: ['ابحث', 'ابحث عن', 'اعرض', 'حول', 'أخبار'],
        clearSearch: ['مسح البحث', 'إفراغ شريط البحث', 'مسح شريط البحث'],
        clearFilters: ['مسح الفلاتر', 'إزالة الفلاتر', 'إعادة تعيين الفلاتر'],
        hideRead: ['إخفاء المقروء', 'إخفاء الأخبار المقروءة'],
        showRead: ['إظهار المقروء', 'عرض المقروء'],
        regions: { 'TR': ['تركي', 'تركيا'], 'EN': ['إنجليزي', 'عالمي'], 'DE': ['ألماني', 'ألمانيا'], 'ES': ['إسباني', 'إسبانيا'], 'FR': ['فرنسي', 'فرنسا'], 'RU': ['روسي', 'روسيا'], 'AR': ['عربي', 'عرب'], 'HI': ['هندي'] }
    },
    'HI': {
        search: ['खोज', 'खोजें', 'दिखाओ', 'के बारे में', 'समाचार'],
        clearSearch: ['खोज साफ़ करें', 'सर्च बार खाली करें', 'खोज मिटाएं'],
        clearFilters: ['फ़िल्टर साफ़ करें', 'फ़िल्टर हटाएं', 'फ़िल्टर रीसेट करें'],
        hideRead: ['पढ़े गए छिपाएं', 'पढ़ी गई खबरें छिपाएं'],
        showRead: ['पढ़े गए दिखाएं', 'पढ़ी गई खबरें दिखाएं'],
        regions: { 'TR': ['तुर्की'], 'EN': ['अंग्रेजी', 'वैश्विक'], 'DE': ['जर्मन'], 'ES': ['स्पेनिश'], 'FR': ['फ़्रेंच'], 'RU': ['रूसी'], 'AR': ['अरबी'], 'HI': ['हिंदी', 'भारत'] }
    }
};

function startVoiceAssistant() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SpeechRecognition) { 
        alert("Üzgünüm, tarayıcınız sesli asistanı desteklemiyor. (Chrome/Safari tavsiye edilir)"); 
        return; 
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = VOICE_LANG_MAP[currentRegion] || 'tr-TR';
    
    recognition.continuous = true; 
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const fab = document.getElementById('micFab');
    const title = document.getElementById('voiceTitle');
    const inputEl = document.getElementById('voiceTextInput');
    const actionsDiv = document.getElementById('voiceActions');
    
    let stopTimer; 

    recognition.onstart = function() {
        fab.classList.add('listening');
        title.innerText = "🎙️ Asistan Dinliyor...";
        inputEl.value = "";
        
        const hintText = VOICE_HINTS[currentRegion] || VOICE_HINTS['EN'];
        inputEl.placeholder = hintText;
        
        actionsDiv.innerHTML = '';
        openModalSafe('voiceModal');

        stopTimer = setTimeout(() => {
            recognition.stop();
            if(inputEl.value === "") {
                title.innerText = "💤 Dinleme sonlandırıldı.";
            }
        }, 20000);
    };

    recognition.onresult = function(event) {
        let finalTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
            finalTranscript += event.results[i][0].transcript + ' ';
        }
        
        inputEl.value = finalTranscript.trim();
        reparseVoiceCommand(); 
    };

    recognition.onerror = function(event) {
        title.innerText = "❌ Hata Oluştu";
        inputEl.placeholder = "Sizi duyamadım veya mikrofon izni verilmedi.";
        clearTimeout(stopTimer);
    };

    recognition.onend = function() {
        fab.classList.remove('listening');
        clearTimeout(stopTimer); 
    };

    recognition.start();
}

function reparseVoiceCommand() {
    const text = document.getElementById('voiceTextInput').value.trim();
    if(!text) return;

    const title = document.getElementById('voiceTitle');
    const actionsDiv = document.getElementById('voiceActions');
    
    title.innerText = "🤖 Anlaşılıyor...";
    const actions = parseVoiceCommand(text); 
    
    actionsDiv.innerHTML = '';
    if(actions.length > 0) {
        title.innerText = "💡 Şunları yapabilirim:";
        actions.forEach(act => {
            const btn = document.createElement('button');
            btn.className = 'voice-btn-action';
            btn.innerText = act.label;
            btn.onclick = () => { act.action(); closeModalSafe('voiceModal'); };
            actionsDiv.appendChild(btn);
        });
    }
}

function parseVoiceCommand(rawText) {
    const text = rawText.toLowerCase();
    const normalizedText = rawText.toLocaleLowerCase(currentRegion === 'TR' ? 'tr-TR' : 'en-US');
    const actions = [];
    let queryMatched = false;

    for (const lang of Object.keys(INTENT_DICT)) {
        const dict = INTENT_DICT[lang];

        if(dict.regions) {
            for (const [regionCode, keywords] of Object.entries(dict.regions)) {
                if (keywords.some(kw => text.includes(kw))) {
                    actions.push({
                        label: `🌍 ${regionCode} Bölgesine/Haberlerine Geç`,
                        action: () => switchGlobalRegion(regionCode)
                    });
                }
            }
        }

        if (dict.clearSearch && dict.clearSearch.some(kw => text.includes(kw))) {
            actions.push({
                label: `🧹 Arama Çubuğunu Temizle`,
                action: () => {
                    document.getElementById('searchInput').value = '';
                    handleSearch();
                }
            });
        }

        if (dict.clearFilters && dict.clearFilters.some(kw => text.includes(kw))) {
            actions.push({
                label: `🗑️ Filtreleri Kaldır`,
                action: () => {
                    currentCategory = '';
                    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
                    if(document.querySelectorAll('.cat-btn').length > 0) document.querySelectorAll('.cat-btn')[0].classList.add('active');
                    activeSources = RSS_FEEDS.map(f => f.name);
                    saveActiveSources();
                    renderChips();
                    handleSearch();
                }
            });
        }

        if (dict.hideRead && dict.hideRead.some(kw => text.includes(kw))) {
            actions.push({
                label: `👁️ Okunanları Gizle`,
                action: () => toggleReadVisibility(true)
            });
        }

        if (dict.showRead && dict.showRead.some(kw => text.includes(kw))) {
            actions.push({
                label: `👁️ Okunanları Göster`,
                action: () => toggleReadVisibility(false)
            });
        }

        const searchKeyword = dict.search && dict.search.find(kw => text.includes(kw));
        if (searchKeyword && !queryMatched) {
            let query = text;
            dict.search.forEach(kw => { query = query.replace(new RegExp(`\\b${kw}\\b`, 'gi'), ''); });
            query = query.replace(/içinde|geçen/gi, '').replace(/\s+/g, ' ').trim();
            
            if (query.length > 2) {
                queryMatched = true; 
                actions.push({
                    label: `🔍 "${query}" Kelimesini Ara`,
                    action: () => {
                        document.getElementById('searchInput').value = query;
                        switchControlTab('search');
                        handleSearch();
                        window.scrollTo(0,0);
                    }
                });
            }
        }
    }

    const matchedSources = [];
    const sourceKeywords = ['filtrele', 'sadece', 'göster', 'kaynak', 'gazete', 'filter', 'source', 'only'];
    const isFilterIntent = sourceKeywords.some(kw => normalizedText.includes(kw));

    RSS_FEEDS.forEach(feed => {
        let sourceName = feed.name.toLocaleLowerCase(currentRegion === 'TR' ? 'tr-TR' : 'en-US');
        
        if (normalizedText.includes(sourceName)) {
            if(!matchedSources.includes(feed.name)) matchedSources.push(feed.name);
        } else {
            const firstWord = sourceName.split(' ')[0];
            if (firstWord.length > 2 && normalizedText.includes(firstWord)) {
                if(!matchedSources.includes(feed.name)) matchedSources.push(feed.name);
            }
        }
    });

    if (matchedSources.length > 0) {
        actions.push({
            label: `📰 Filtrele: ${matchedSources.join(', ')}`,
            action: () => {
                activeSources = [...matchedSources];
                saveActiveSources();
                renderChips();
                switchControlTab('filter');
                handleSearch();
                window.scrollTo(0,0);
            }
        });
    } else if (isFilterIntent && matchedSources.length === 0) {
        actions.push({
            label: `⚙️ Kaynakları Filtrele (Menüyü Aç)`,
            action: () => {
                switchControlTab('filter');
                window.scrollTo(0,0);
            }
        });
    }

    const uniqueActions = [];
    const seenLabels = new Set();
    for (const act of actions) {
        if (!seenLabels.has(act.label)) {
            seenLabels.add(act.label);
            uniqueActions.push(act);
        }
    }

    if (uniqueActions.length === 0 && text.length > 2) {
        uniqueActions.push({
            label: `🔍 Sadece "${rawText}" Olarak Ara`,
            action: () => {
                document.getElementById('searchInput').value = rawText;
                switchControlTab('search');
                handleSearch();
                window.scrollTo(0,0);
            }
        });
        uniqueActions.push({
            label: `🧹 Arama Çubuğunu Temizle`,
            action: () => {
                document.getElementById('searchInput').value = '';
                handleSearch();
            }
        });
        uniqueActions.push({
            label: `🔄 Haberleri Yenile`,
            action: () => { fetchAllRSS(); }
        });
    }

    return uniqueActions;
}

// --- ZORLU YENİLEME (HARD REFRESH & CACHE CLEAR) FONKSİYONU ---
function hardRefreshApp() {
    if(confirm("Tüm uygulama önbelleği temizlenip güncel versiyon çekilecek. Emin misiniz?")) {
        // 1. Sadece haberlerin önbelleğini temizle (Kullanıcı ayarları, kaynaklar ve okunanlar KALIR)
        localStorage.removeItem('savedNewsArticles');
        
        // 2. Service Worker (PWA) önbelleğini temizle
        if ('caches' in window) {
            caches.keys().then(function(names) {
                for (let name of names) caches.delete(name);
            });
        }
        
        // 3. Service Worker'ı devre dışı bırak ve sayfayı serverdan (zorla) yenile
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for(let registration of registrations) {
                    registration.unregister();
                }
                // true parametresi browser'a cache'i yok saymasını söyler
                window.location.reload(true); 
            });
        } else {
            window.location.reload(true);
        }
    }
}

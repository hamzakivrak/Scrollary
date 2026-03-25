// api.js
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

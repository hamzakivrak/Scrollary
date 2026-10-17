/**
 * Scrollary Hızlı Sunucu (Cloudflare Worker)
 *
 *  GET /resolve?url=<google haber linki>  -> { url }                       Google Haberler linkini gerçek yayıncı adresine çevirir
 *  GET /read?url=<google veya yayıncı>    -> { url, title, image, paras }  Çözer + sayfayı indirir + metni ayıklar (tek istek)
 *  GET /raw?url=<herhangi adres>          -> ham metin (RSS / HTML)        CORS'lu basit proxy (ücretsiz proxy'lerin yerine)
 *
 * Sonuçlar Cloudflare önbelleğinde tutulur (resolve 7 gün, read 6 saat, raw 2 dk).
 */

const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
};
const TTL = { '/resolve': 604800, '/read': 21600, '/raw': 120 };

const json = (obj, status = 200, ttl = 0) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', ...(ttl ? { 'Cache-Control': 'public, max-age=' + ttl } : { 'Cache-Control': 'no-store' }) },
  });

function isSafe(raw) {
  try {
    const u = new URL(raw);
    if (!/^https?:$/.test(u.protocol)) return false;
    const h = u.hostname.toLowerCase();
    if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return false;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes(':') || h.startsWith('[')) return false;   // IP adresleri yok
    return true;
  } catch (e) { return false; }
}

export default {
  async fetch(req, env, ctx) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const u = new URL(req.url);
    const target = u.searchParams.get('url');
    if (!target) return json({ ok: true, name: 'scrollary-worker', endpoints: ['/resolve?url=', '/read?url=', '/raw?url='] });
    if (!TTL[u.pathname]) return json({ error: 'bulunamadı' }, 404);
    if (!isSafe(target)) return json({ error: 'geçersiz adres' }, 400);

    const cache = caches.default;
    const key = new Request(u.toString(), { method: 'GET' });
    const hit = await cache.match(key);
    if (hit) return hit;

    let res;
    try {
      if (u.pathname === '/resolve') {
        const real = await resolveGnews(target);
        res = json({ url: real }, 200, TTL['/resolve']);
      } else if (u.pathname === '/read') {
        res = await handleRead(target);
      } else {
        res = await handleRaw(target);
      }
    } catch (e) {
      res = json({ error: String((e && e.message) || e) }, 502);
    }
    if (res.status === 200) ctx.waitUntil(cache.put(key, res.clone()));
    return res;
  },
};

/* ---------------- Google Haberler linkini çözme ---------------- */

function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Eski biçim: adres base64 içinde düz duruyor. Yeni biçim ("AU_yqL...") şifreli -> null döner.
function decodeLegacy(id) {
  try {
    const b = b64urlToBytes(id);
    if (!(b[0] === 0x08 && b[1] === 0x13 && b[2] === 0x22)) return null;
    let i = 3, len = b[i++];
    if (len >= 0x80) len = (len & 0x7f) | (b[i++] << 7);
    const str = new TextDecoder().decode(b.slice(i, i + len));
    if (str.startsWith('AU_yqL')) return null;
    return /^https?:\/\//.test(str) ? str : null;
  } catch (e) { return null; }
}

function parseGnBatch(text) {
  const ok = (u) => (/^https?:\/\//.test(u) && !/(^|\.)google\./.test(new URL(u).hostname) ? u : null);
  try {
    const arr = JSON.parse(text.split('\n\n')[1]);
    const u = ok(JSON.parse(arr[0][2])[1]);
    if (u) return u;
  } catch (e) {}
  const m = text.match(/garturlres[^h]{0,12}(https?:(?:\\+u003d|\\+u0026|\\+\/|[^"\\\s])+)/);
  if (m) {
    try { return ok(m[1].replace(/\\+u003d/g, '=').replace(/\\+u0026/g, '&').replace(/\\+\//g, '/')); } catch (e) {}
  }
  return null;
}

// Google'ın "çerez onayı" duvarını geçmek için onay kararı kayıtlı SOCS çerezi gerekir (yoksa consent.google.com'a yönlendirir ve imza gelmez)
const GN_COOKIES = [
  'CONSENT=PENDING+999; SOCS=CAESHAgBEhJnd3NfMjAyNTAxMjMtMF9SQzMaAmVuIAEaBgiAvLW8Bg',
  'CONSENT=PENDING+999; SOCS=CAISHAgBEhJnd3NfMjAyNDAzMjUtMF9SQzEaAmVuIAEaBgiAw42wBg',
  'CONSENT=YES+cb.20250101-07-p0.en+FX+419; SOCS=CAI',
];
const gnHeaders = (cookie) => ({ 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9', Cookie: cookie });

async function resolveGnews(link) {
  if (!/news\.google\.com/.test(link)) return link;                 // zaten gerçek adres
  const m = link.match(/news\.google\.com\/(?:rss\/)?(?:articles|read)\/([^?/#]+)/);
  if (!m) throw new Error('geçersiz Google Haberler linki');
  const id = m[1];
  const legacy = decodeLegacy(id);
  if (legacy) return legacy;

  let sg, ts, cookie, notes = [];
  // Üç çerez varyantı aynı anda denenir (her biri 4,5 sn ile sınırlı); ilk imza veren kazanır
  const tryCookie = async (c) => {
    const r = await fetch(`https://news.google.com/rss/articles/${id}?hl=en-US&gl=US&ceid=US:en`, { headers: gnHeaders(c), redirect: 'follow', signal: AbortSignal.timeout(4500) });
    const html = await r.text();
    if (/consent\.google\.com/.test(r.url)) throw new Error('onay duvarı');
    if (r.status === 429) throw new Error('429 sınır');
    const s = (html.match(/data-n-a-sg="([^"]+)"/) || [])[1];
    const t = (html.match(/data-n-a-ts="([^"]+)"/) || [])[1];
    if (!s || !t) throw new Error('imza yok (' + r.status + ')');
    return { s, t, c };
  };
  try { const got = await Promise.any(GN_COOKIES.map(tryCookie)); sg = got.s; ts = got.t; cookie = got.c; }
  catch (e) { notes = ((e && e.errors) || [e]).map((x) => (x && x.message) || String(x)); }
  if (!sg || !ts) throw new Error('imza alınamadı: ' + [...new Set(notes)].join(', '));

  const args = `["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"${id}",${ts},"${sg}"]`;
  const body = 'f.req=' + encodeURIComponent(JSON.stringify([[['Fbv4je', args]]]));
  const r2 = await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', {
    method: 'POST',
    headers: { ...gnHeaders(cookie), 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body,
    signal: AbortSignal.timeout(5000),
  });
  if (!r2.ok) throw new Error('batchexecute ' + r2.status);
  const real = parseGnBatch(await r2.text());
  if (!real) throw new Error('batchexecute yanıtı çözülemedi');
  return real;
}

/* ---------------- Sayfa indirme + metin ayıklama ---------------- */

async function fetchPage(url) {
  const r = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.7', Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
    redirect: 'follow',
  });
  if (!r.ok) throw new Error('site ' + r.status);
  let buf = await r.arrayBuffer();
  if (buf.byteLength > 3_000_000) buf = buf.slice(0, 3_000_000);
  let cs = ((r.headers.get('content-type') || '').match(/charset=([\w-]+)/i) || [])[1];
  if (!cs) {
    const head = new TextDecoder('latin1').decode(buf.slice(0, 4096));
    cs = (head.match(/<meta[^>]+charset=["']?([\w-]+)/i) || [])[1];
  }
  let text;
  try { text = new TextDecoder(cs || 'utf-8').decode(buf); } catch (e) { text = new TextDecoder('utf-8').decode(buf); }
  return { text, finalUrl: r.url || url, type: r.headers.get('content-type') || '' };
}

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', laquo: '«', raquo: '»', ouml: 'ö', Ouml: 'Ö', uuml: 'ü', Uuml: 'Ü', ccedil: 'ç', Ccedil: 'Ç', auml: 'ä', Auml: 'Ä', szlig: 'ß', eacute: 'é', Eacute: 'É', egrave: 'è', agrave: 'à', acirc: 'â', Acirc: 'Â', icirc: 'î', ocirc: 'ô', ucirc: 'û', ntilde: 'ñ', aacute: 'á', iacute: 'í', oacute: 'ó', uacute: 'ú', copy: '©', reg: '®', euro: '€', bull: '•', middot: '·', trade: '™', deg: '°' };
function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => (NAMED[n] !== undefined ? NAMED[n] : NAMED[n.toLowerCase()] !== undefined ? NAMED[n.toLowerCase()] : m));
}
const stripTags = (s) => s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '');
const clean = (s) => decodeEntities(stripTags(s)).replace(/\s+/g, ' ').trim();

function metaContent(html, key) {
  const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`, 'i');
  const m = html.match(re1) || html.match(re2);
  return m ? decodeEntities(m[1]).trim() : '';
}

const BOILER = /(çerez|cookie|tüm hakları|all rights reserved|bültenimize|abone ol|kvkk|gizlilik politikası|©|whatsapp kanal|google haberler'de takip|sosyal medya)/i;

function chunkSentences(text) {
  const sents = text.split(/(?<=[.!?…])\s+(?=[A-ZÇĞİÖŞÜ0-9"“‘'])/);
  const out = []; let cur = '';
  for (const s of sents) {
    if ((cur + ' ' + s).length > 420 && cur) { out.push(cur.trim()); cur = s; } else cur += ' ' + s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function findArticleBody(node) {
  if (!node || typeof node !== 'object') return '';
  if (Array.isArray(node)) { for (const n of node) { const r = findArticleBody(n); if (r) return r; } return ''; }
  if (typeof node.articleBody === 'string' && node.articleBody.length > 400) return node.articleBody;
  for (const k of Object.keys(node)) {
    if (node[k] && typeof node[k] === 'object') { const r = findArticleBody(node[k]); if (r) return r; }
  }
  return '';
}

function extract(html) {
  const title = metaContent(html, 'og:title') || clean((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
  const image = metaContent(html, 'og:image');

  // 1) JSON-LD articleBody (çoğu haber sitesinde tam metin burada)
  const lds = html.match(/<script[^>]+application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi) || [];
  for (const block of lds) {
    try {
      const data = JSON.parse(block.replace(/^[\s\S]*?>/, '').replace(/<\/script>$/i, '').trim());
      const body = findArticleBody(data);
      if (body) {
        const text = decodeEntities(body.replace(/<\/p>|<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''));
        let paras = text.split(/\n+/).map((p) => p.replace(/\s+/g, ' ').trim()).filter((p) => p.length >= 30);
        if (paras.length < 3 && text.length > 600) paras = chunkSentences(text.replace(/\s+/g, ' ').trim());
        if (paras.join(' ').length >= 400) return { title, image, paras: paras.slice(0, 120), via: 'json-ld' };
      }
    } catch (e) {}
  }

  // 2) HTML paragrafları
  let seg = html.replace(/<(script|style|noscript|nav|footer|aside|header|form|svg|iframe|template)\b[\s\S]*?<\/\1>/gi, '');
  const arts = seg.match(/<article\b[\s\S]*?<\/article>/gi) || [];
  let best = '';
  for (const a of arts) if (a.length > best.length) best = a;
  const scope = best && clean(best).length > 600 ? best : seg;

  const paras = []; const seen = new Set();
  const re = /<p\b[^>]*>([\s\S]*?)<\/p>/gi; let m;
  while ((m = re.exec(scope))) {
    const t = clean(m[1]);
    if (t.length < 40 || seen.has(t)) continue;
    if (t.length < 220 && BOILER.test(t)) continue;
    seen.add(t); paras.push(t);
  }
  return { title, image, paras: paras.slice(0, 120), via: 'html' };
}

async function handleRead(target) {
  const real = await resolveGnews(target);
  if (!real) throw new Error('adres çözülemedi');
  const page = await fetchPage(real);
  const info = extract(page.text);
  return json({ url: page.finalUrl || real, title: info.title, image: info.image, paras: info.paras, via: info.via }, 200, TTL['/read']);
}

async function handleRaw(target) {
  const page = await fetchPage(target);
  return new Response(page.text, {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=' + TTL['/raw'] },
  });
}

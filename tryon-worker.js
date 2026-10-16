/* =====================================================================
   mygem.ge — AI try-on backend (Cloudflare Worker, single file)

   POST  { action:"ping" }                                -> { ok, ready }  is the AI key configured?
   POST  { action:"resolve", link }                       -> { image }   product image found at a link
   POST  { action:"tryon", person, jewelry, kind }        -> { image }   person wearing the jewelry

   POST  { action:"auth_config" }                          -> { ok, ready, clientId }   Google sign-in available?
   POST  { action:"google_auth", credential }              -> { ok, profile }  Google ID token verified server-side

   The AI key stays here (never in the browser). Setup: see SETUP-TRYON.md
   Env:  GEMINI_API_KEY (secret, required)   GEMINI_MODEL (default gemini-3.1-flash-image)
         ALLOWED_ORIGINS (comma list, e.g. "https://mygem.ge,https://www.mygem.ge")
         GOOGLE_CLIENT_ID (OAuth 2.0 Web client ID, for "Continue with Google"; see SETUP-GOOGLE-AUTH.md)
         RATE_LIMITER (optional Cloudflare rate-limit binding)
   ===================================================================== */

const MAX_BODY = 14 * 1024 * 1024;   // request JSON
const MAX_IMG = 8 * 1024 * 1024;     // a fetched product image
const MAX_HTML = 2 * 1024 * 1024;    // a fetched product page
const OK_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const UA = 'Mozilla/5.0 (compatible; mygem-tryon/1.0; +https://mygem.ge)';

const KINDS = {
  auto: 'piece of jewelry (decide where on the body it is naturally worn)',
  ring: 'ring, worn on a finger of the person\'s visible hand (the ring finger unless another finger is clearly more natural)',
  earring: 'pair of earrings, worn on the person\'s ears (only the ears that are visible)',
  necklace: 'necklace/pendant, worn around the person\'s neck, resting naturally on the collarbone/chest',
  chain: 'chain, worn around the person\'s neck, resting naturally on the collarbone/chest',
  bracelet: 'bracelet, worn on the person\'s wrist',
  watch: 'wristwatch, worn on the person\'s wrist with the dial on the top side of the wrist',
  brooch: 'brooch, pinned on the person\'s clothing near the upper chest or lapel',
  cross: 'cross pendant on a chain, worn around the person\'s neck',
  coin: 'coin pendant on a chain, worn around the person\'s neck',
  other: 'piece of jewelry (decide where on the body it is naturally worn)'
};

class HttpError extends Error {
  constructor(status, code, message) { super(message || code); this.status = status; this.code = code; }
}

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return json({ error: 'method' }, 405, cors);
    if (!originAllowed(req, env)) return json({ error: 'forbidden' }, 403, cors);
    if (Number(req.headers.get('content-length') || 0) > MAX_BODY) return json({ error: 'too_large' }, 413, cors);

    try {
      if (env.RATE_LIMITER && env.RATE_LIMITER.limit) {
        const { success } = await env.RATE_LIMITER.limit({ key: req.headers.get('cf-connecting-ip') || 'anon' });
        if (!success) throw new HttpError(429, 'rate_limited');
      }
      let body;
      try { body = await req.json(); } catch { throw new HttpError(400, 'bad_request'); }
      if (body.action === 'ping') return json({ ok: true, ready: !!env.GEMINI_API_KEY }, 200, cors);
      if (body.action === 'auth_config') return json({ ok: true, ready: !!env.GOOGLE_CLIENT_ID, clientId: env.GOOGLE_CLIENT_ID || '' }, 200, cors);
      if (body.action === 'google_auth') return json(await googleAuth(body, env), 200, cors);
      if (body.action === 'resolve') return json(await resolveLink(body.link), 200, cors);
      if (body.action === 'tryon') return json(await tryOn(body, env), 200, cors);
      throw new HttpError(400, 'bad_request');
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.code, message: e.message }, e.status, cors);
      console.error('unhandled', e);
      return json({ error: 'server' }, 500, cors);
    }
  }
};

/* ---------- http helpers ---------- */
function allowedList(env) { return String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean); }
function originAllowed(req, env) {
  const list = allowedList(env); if (!list.length) return true;           // dev: no restriction configured
  return list.includes(req.headers.get('origin') || '');
}
function corsHeaders(req, env) {
  const list = allowedList(env), o = req.headers.get('origin') || '';
  return {
    'Access-Control-Allow-Origin': !list.length ? '*' : (list.includes(o) ? o : list[0]),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}
const json = (obj, status, cors) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/* ---------- binary helpers ---------- */
function toB64(bytes) {
  let s = ''; const c = 0x8000;
  for (let i = 0; i < bytes.length; i += c) s += String.fromCharCode.apply(null, bytes.subarray(i, i + c));
  return btoa(s);
}
function parseDataUrl(s, what) {
  if (typeof s !== 'string') throw new HttpError(400, 'bad_request', `${what} missing`);
  const m = /^data:(image\/[a-z+.-]+);base64,/i.exec(s.slice(0, 64));
  if (!m) throw new HttpError(400, 'bad_request', `${what} must be a base64 data URL`);
  const mime = m[1].toLowerCase();
  if (!OK_MIME.includes(mime)) throw new HttpError(400, 'unsupported_image', `${what}: unsupported type`);
  const data = s.slice(m[0].length);
  if (data.length > MAX_IMG * 1.4) throw new HttpError(413, 'too_large', `${what} too large`);
  return { mime, data };
}
function sniff(bytes) {
  const h = (...a) => a.every((v, i) => bytes[i] === v);
  if (h(0xFF, 0xD8, 0xFF)) return 'image/jpeg';
  if (h(0x89, 0x50, 0x4E, 0x47)) return 'image/png';
  if (h(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45) return 'image/webp';
  return '';
}

/* ---------- SSRF-safe fetching of user-supplied links ---------- */
function assertPublicUrl(raw) {
  let u; try { u = new URL(String(raw).trim()); } catch { throw new HttpError(400, 'bad_link', 'invalid url'); }
  if (!/^https?:$/.test(u.protocol)) throw new HttpError(400, 'bad_link', 'http(s) only');
  const h = u.hostname.toLowerCase();
  if (u.username || u.password) throw new HttpError(400, 'bad_link', 'credentials in url');
  if (h.includes(':') || h.startsWith('[')) throw new HttpError(400, 'bad_link', 'ip literals not allowed');
  if (h === 'localhost' || /\.(localhost|local|internal|lan|home|corp)$/.test(h) || !h.includes('.')) throw new HttpError(400, 'bad_link', 'private host');
  const ip = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h);
  if (ip) {
    const [a, b] = [+ip[1], +ip[2]];
    if (a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127))
      throw new HttpError(400, 'bad_link', 'private address');
  }
  return u;
}
async function fetchLimited(url, cap, accept) {
  let cur = assertPublicUrl(url);
  for (let hop = 0; hop < 5; hop++) {
    let res;
    try {
      res = await fetch(cur.href, { redirect: 'manual', headers: { 'User-Agent': UA, 'Accept': accept, 'Accept-Language': 'en,ka;q=0.8' }, signal: AbortSignal.timeout(12000) });
    } catch { throw new HttpError(502, 'fetch_failed', 'could not fetch link'); }
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      try { cur = assertPublicUrl(new URL(res.headers.get('location'), cur).href); } catch { throw new HttpError(400, 'bad_link', 'bad redirect'); }
      continue;
    }
    if (!res.ok) throw new HttpError(502, 'fetch_failed', `link returned ${res.status}`);
    const declared = Number(res.headers.get('content-length') || 0);
    if (declared > cap) throw new HttpError(413, 'too_large', 'remote file too large');
    const reader = res.body.getReader(), chunks = []; let n = 0;
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      n += value.length; if (n > cap) { try { reader.cancel(); } catch {} throw new HttpError(413, 'too_large', 'remote file too large'); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(n); let o = 0; for (const c of chunks) { bytes.set(c, o); o += c.length; }
    return { bytes, type: (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase(), url: cur };
  }
  throw new HttpError(502, 'fetch_failed', 'too many redirects');
}

/* ---------- product image discovery ---------- */
const decodeEnt = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
function attrs(tag) {
  const o = {}, re = /([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g; let m;
  while ((m = re.exec(tag))) o[m[1].toLowerCase()] = decodeEnt(m[2] ?? m[3] ?? m[4] ?? '');
  return o;
}
function ldImages(node, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(n => ldImages(n, out)); return; }
  const t = [].concat(node['@type'] || []).join(' ');
  if (/Product/i.test(t) && node.image) {
    [].concat(node.image).forEach(i => { const u = typeof i === 'string' ? i : i && (i.url || i.contentUrl); if (u) out.push(u); });
  }
  if (node['@graph']) ldImages(node['@graph'], out);
}
function findImageUrls(html, base) {
  const found = [], rank = ['og:image:secure_url', 'og:image', 'og:image:url', 'twitter:image', 'twitter:image:src'];
  const metas = (html.match(/<meta\b[^>]*>/gi) || []).map(attrs), byKey = {};
  for (const a of metas) { const k = (a.property || a.name || a.itemprop || '').toLowerCase(); if (k && a.content && !byKey[k]) byKey[k] = a.content; }
  rank.forEach(k => byKey[k] && found.push(byKey[k]));
  for (const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { ldImages(JSON.parse(m[1].trim()), found); } catch {}
  }
  if (byKey.image) found.push(byKey.image);
  const link = (html.match(/<link\b[^>]*rel=["']image_src["'][^>]*>/i) || [])[0]; if (link) { const a = attrs(link); if (a.href) found.push(a.href); }
  const out = [];
  for (const f of found) { try { const u = new URL(f.startsWith('//') ? 'https:' + f : f, base).href; if (!out.includes(u)) out.push(u); } catch {} }
  return out;
}
async function resolveLink(link) {
  const first = await fetchLimited(link, MAX_HTML > MAX_IMG ? MAX_HTML : MAX_IMG, 'text/html,image/*;q=0.9,*/*;q=0.5');
  const asImage = (r) => {
    const t = sniff(r.bytes) || (OK_MIME.includes(r.type) ? r.type : '');
    if (t) return { image: `data:${t};base64,${toB64(r.bytes)}`, source: r.url.href };
    if (/^image\//.test(r.type)) throw new HttpError(415, 'unsupported_image', 'unsupported image format');
    return null;
  };
  if (/^image\//.test(first.type) || sniff(first.bytes)) {
    const direct = asImage(first); if (direct) return direct;
  }
  if (first.bytes.length > MAX_HTML) throw new HttpError(422, 'no_image', 'no image found');
  const html = new TextDecoder().decode(first.bytes);
  let unsupported = false;
  for (const u of findImageUrls(html, first.url).slice(0, 4)) {
    try {
      const r = await fetchLimited(u, MAX_IMG, 'image/jpeg,image/png,image/webp,image/*;q=0.5');
      const img = asImage(r); if (img) return img;
    } catch (e) { if (e instanceof HttpError && e.code === 'unsupported_image') unsupported = true; }
  }
  throw new HttpError(422, unsupported ? 'unsupported_image' : 'no_image', 'no usable product image found');
}

/* ---------- AI try-on ---------- */
function buildPrompt(kind) {
  const what = KINDS[kind] || KINDS.auto;
  return [
    'You are a photorealistic virtual jewelry try-on engine.',
    `IMAGE 1 is a photo of a person. IMAGE 2 is a product photo of one jewelry item: a ${what}.`,
    'Edit IMAGE 1 so that the person is wearing exactly the jewelry item from IMAGE 2, placed where it is naturally worn.',
    'Rules:',
    '- Reproduce the jewelry faithfully: same shape, metal color, stones, chain links, clasp and proportions as IMAGE 2. Do not redesign, recolor, simplify or add anything.',
    '- Scale it realistically relative to the person\'s body (a ring fits one finger, earrings hang from the earlobes, a necklace follows the neckline).',
    '- Match the lighting, shadows, reflections, perspective and sharpness of IMAGE 1, and add natural contact shadows.',
    '- Respect occlusion: hair, collar, sleeves or fingers cover the jewelry where physically correct.',
    '- Do NOT change the person\'s face, identity, skin, hair, body, clothing, pose, the background, or the image framing and aspect ratio.',
    '- Do not add text, watermarks, borders or any other accessories. Do not copy the background of IMAGE 2.',
    '- If the body part needed for this jewelry is not visible in IMAGE 1, do not invent it: reply with a short text explanation and no image.',
    'Output only the final edited version of IMAGE 1.'
  ].join('\n');
}
async function tryOn(body, env) {
  if (!env.GEMINI_API_KEY) throw new HttpError(503, 'not_configured', 'AI key is not set');
  const person = parseDataUrl(body.person, 'person');
  let jewel;
  if (body.jewelry) jewel = parseDataUrl(body.jewelry, 'jewelry');
  else if (body.link) { const r = await resolveLink(body.link); jewel = parseDataUrl(r.image, 'jewelry'); }
  else throw new HttpError(400, 'bad_request', 'jewelry missing');

  const kind = Object.prototype.hasOwnProperty.call(KINDS, body.kind) ? body.kind : 'auto';
  const model = env.GEMINI_MODEL || 'gemini-3.1-flash-image';
  let res;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [
          { text: buildPrompt(kind) },
          { text: 'IMAGE 1 (the person):' }, { inline_data: { mime_type: person.mime, data: person.data } },
          { text: 'IMAGE 2 (the jewelry):' }, { inline_data: { mime_type: jewel.mime, data: jewel.data } }
        ] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
      }),
      signal: AbortSignal.timeout(100000)
    });
  } catch { throw new HttpError(504, 'network', 'AI service timeout'); }

  if (res.status === 429) throw new HttpError(429, 'rate_limited', 'AI quota reached');
  const data = await res.json().catch(() => null);
  if (res.status === 404) { console.error('gemini model not found', model); throw new HttpError(502, 'model_unavailable', 'AI model unavailable'); }
  if (res.status === 400 || res.status === 401 || res.status === 403) { console.error('gemini auth/request error', res.status, JSON.stringify(data).slice(0, 300)); throw new HttpError(502, 'ai_auth', 'AI key rejected or billing not enabled'); }
  if (!res.ok) { console.error('gemini error', res.status, JSON.stringify(data).slice(0, 500)); throw new HttpError(502, 'server', 'AI service error'); }

  const parts = (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
  const img = parts.map(p => p.inlineData || p.inline_data).find(Boolean);
  if (!img || !img.data) {
    console.warn('no image returned', JSON.stringify({ fb: data && data.promptFeedback, fr: data && data.candidates && data.candidates[0] && data.candidates[0].finishReason, t: parts.map(p => p.text).filter(Boolean).join(' ').slice(0, 200) }));
    throw new HttpError(422, 'no_result', 'AI did not return an image');
  }
  return { image: `data:${img.mimeType || img.mime_type || 'image/png'};base64,${img.data}` };
}

/* ---------- Google sign-in: verify the ID token (never trust the browser) ---------- */
const GOOGLE_JWKS = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISS = ['https://accounts.google.com', 'accounts.google.com'];

const b64uBytes = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); s += '='.repeat((4 - s.length % 4) % 4); const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
const b64uJson = s => JSON.parse(new TextDecoder().decode(b64uBytes(s)));

async function googleKey(kid, fresh) {
  const res = await fetch(GOOGLE_JWKS, fresh ? { cache: 'no-store' } : { cf: { cacheTtl: 3600, cacheEverything: true } });
  if (!res.ok) throw new HttpError(502, 'google_unreachable');
  const jwk = ((await res.json()).keys || []).find(k => k.kid === kid && k.kty === 'RSA');
  return jwk || null;
}

async function googleAuth(body, env) {
  if (!env.GOOGLE_CLIENT_ID) throw new HttpError(503, 'google_not_configured');
  const token = typeof body.credential === 'string' ? body.credential : '';
  const parts = token.split('.');
  if (token.length > 4096 || parts.length !== 3) throw new HttpError(401, 'bad_token');

  let header, claims;
  try { header = b64uJson(parts[0]); claims = b64uJson(parts[1]); } catch { throw new HttpError(401, 'bad_token'); }
  if (header.alg !== 'RS256' || !header.kid) throw new HttpError(401, 'bad_token');

  // signature: Google's public keys (cached; refetched once if the key id is unknown, e.g. after rotation)
  let jwk = await googleKey(header.kid, false);
  if (!jwk) jwk = await googleKey(header.kid, true);
  if (!jwk) throw new HttpError(401, 'bad_token');
  const key = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const okSig = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64uBytes(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
  if (!okSig) throw new HttpError(401, 'bad_token');

  // claims
  const now = Math.floor(Date.now() / 1000), skew = 60;
  if (!GOOGLE_ISS.includes(claims.iss)) throw new HttpError(401, 'bad_token');
  if (claims.aud !== env.GOOGLE_CLIENT_ID) throw new HttpError(401, 'bad_audience');   // token was issued for a different app
  if (typeof claims.exp !== 'number' || claims.exp + skew < now) throw new HttpError(401, 'token_expired');
  if (typeof claims.iat === 'number' && claims.iat - skew > now) throw new HttpError(401, 'bad_token');
  if (!claims.sub || typeof claims.email !== 'string' || !claims.email) throw new HttpError(401, 'bad_token');
  if (claims.email_verified !== true && claims.email_verified !== 'true') throw new HttpError(403, 'email_not_verified');

  const clean = (v, n) => String(v || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
  const pic = typeof claims.picture === 'string' && /^https:\/\/[a-z0-9-]+\.googleusercontent\.com\//i.test(claims.picture) ? claims.picture : '';
  return {
    ok: true,
    profile: {
      sub: String(claims.sub),
      email: String(claims.email).trim().toLowerCase(),
      name: clean(claims.name, 80),
      given: clean(claims.given_name, 60),
      family: clean(claims.family_name, 60),
      picture: pic
    }
  };
}
/* mygem.ge - metals proxy (Cloudflare Worker)
   Returns the latest LBMA benchmark prices in USD per troy ounce:
   gold (PM fix), silver, platinum (PM fix) - the same LBMA price the National Bank of Georgia uses for its gold.
   Deploy like tryon-worker.js, then put the worker URL into window.METALS_API in index.html.
   The browser calls this worker instead of lbma.org.uk directly (the LBMA files are large and have no CORS headers);
   the worker caches the result, so LBMA is contacted at most about twice an hour.
   NOTE: LBMA/IBA benchmark data is licensed - check IBA's terms before using it commercially. */
const FILES = { au: 'gold_pm', ag: 'silver', pt: 'platinum_pm' };
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const JSON_H = { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=900' };

/* each LBMA file is an array [{d:"2026-10-15", v:[usd, gbp, eur]}, ...]; take the newest row that has a USD value */
async function latest(file) {
  const r = await fetch(`https://prices.lbma.org.uk/json/${file}.json`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; mygem.ge)', Accept: 'application/json' },
    cf: { cacheTtl: 1800, cacheEverything: true },
  });
  if (!r.ok) throw new Error(file + ' HTTP ' + r.status);
  const j = await r.json();
  for (let i = j.length - 1; i >= 0; i--) {
    const v = j[i] && j[i].v && +j[i].v[0];
    if (v > 0) return { usd: v, date: j[i].d };
  }
  throw new Error(file + ' has no price');
}

export default {
  async fetch(req, env, ctx) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const cache = caches.default;
    const key = new Request(new URL(req.url).origin + '/__metals_v1');
    const hit = await cache.match(key);
    if (hit) return new Response(hit.body, { headers: { ...JSON_H, 'X-Cache': 'HIT' } });
    try {
      const [au, ag, pt] = await Promise.all(Object.values(FILES).map(latest));
      const body = JSON.stringify({ au, ag, pt, src: 'LBMA', ts: Date.now() });
      ctx.waitUntil(cache.put(key, new Response(body, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=1800' } })));
      return new Response(body, { headers: JSON_H });
    } catch (e) {
      /* the site falls back to a public spot feed when this returns an error */
      return new Response(JSON.stringify({ error: String(e && e.message || e) }), { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }
  },
};

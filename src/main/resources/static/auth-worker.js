/* mygem.ge — Google sign-in backend (Cloudflare Worker)
   Contract expected by script.js:
     POST {action:'auth_config'}                  -> {ok:true, ready:true, clientId}
     POST {action:'google_auth', credential:JWT}  -> {ok:true, profile:{sub,email,name,given,family,picture}}
   Errors: {ok:false, error:'email_not_verified' | 'rate_limited' | 'server' | 'google_not_configured'}

   Settings -> Variables of the Worker:
     GOOGLE_CLIENT_ID   = your OAuth Client ID (xxxx.apps.googleusercontent.com)
     ALLOWED_ORIGINS    = https://mygem.ge,https://www.mygem.ge     (comma separated)
*/
export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const okOrigin = !allowed.length || allowed.includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': okOrigin && origin ? origin : (allowed[0] || '*'),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin'
    };
    const out = (obj, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return out({ ok: false, error: 'server' }, 405);
    if (!okOrigin) return out({ ok: false, error: 'server' }, 403);

    const clientId = String(env.GOOGLE_CLIENT_ID || '').trim();
    let body = {};
    try { body = await req.json(); } catch { return out({ ok: false, error: 'server' }, 400); }

    if (body.action === 'auth_config') {
      return out({ ok: true, ready: !!clientId, clientId });
    }

    if (body.action === 'google_auth') {
      if (!clientId) return out({ ok: false, error: 'google_not_configured' }, 500);
      const token = String(body.credential || '');
      if (!token) return out({ ok: false, error: 'server' }, 400);

      let info;
      try {
        const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token));
        if (!r.ok) return out({ ok: false, error: 'server' }, 401);
        info = await r.json();
      } catch {
        return out({ ok: false, error: 'server' }, 502);
      }

      const issOk = info.iss === 'accounts.google.com' || info.iss === 'https://accounts.google.com';
      if (info.aud !== clientId || !issOk || +info.exp * 1000 < Date.now()) {
        return out({ ok: false, error: 'server' }, 401);
      }
      if (String(info.email_verified) !== 'true') {
        return out({ ok: false, error: 'email_not_verified' }, 403);
      }

      return out({
        ok: true,
        profile: {
          sub: info.sub,
          email: String(info.email || '').toLowerCase(),
          name: info.name || '',
          given: info.given_name || '',
          family: info.family_name || '',
          picture: info.picture || ''
        }
      });
    }

    return out({ ok: false, error: 'server' }, 400);
  }
};

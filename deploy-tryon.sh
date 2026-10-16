#!/usr/bin/env bash
# One-command deploy of the AI try-on backend (Cloudflare Worker + Gemini key).
# Usage:  bash deploy-tryon.sh
# Needs: Node.js 18+, a Cloudflare account (free), and a Gemini API key with billing enabled
#        (https://aistudio.google.com/apikey). The key is stored as a Cloudflare *secret*; it is never written to any file.
set -euo pipefail
cd "$(dirname "$0")"

echo "1/4  Logging in to Cloudflare (a browser window opens)…"
npx --yes wrangler login

echo "2/4  Paste your Gemini API key when asked (input is hidden, stored as a secret):"
npx --yes wrangler secret put GEMINI_API_KEY

echo "3/4  Deploying the worker…"
OUT=$(npx --yes wrangler deploy 2>&1 | tee /dev/stderr)
URL=$(printf '%s' "$OUT" | grep -oE 'https://[A-Za-z0-9._-]+\.workers\.dev' | head -1)
[ -n "$URL" ] || { echo "Could not read the worker URL. Copy it from the output above and set window.TRYON_API in index.html by hand."; exit 1; }

echo "4/4  Wiring $URL into index.html and checking the service…"
sed -i.bak -E "s#window\.TRYON_API=\"[^\"]*\"#window.TRYON_API=\"$URL\"#" index.html && rm -f index.html.bak
RES=$(curl -s -X POST "$URL" -H 'Content-Type: application/json' -d '{"action":"ping"}' || true)
echo "ping -> $RES"
case "$RES" in
  *'"ready":true'*) echo "✅ Live. Upload index.html (+ script.js, blog.js, style.css, tryon.js, mygem.jpg) to your host.";;
  *) echo "⚠️  Worker answered but is not ready (missing key?). Re-run: npx wrangler secret put GEMINI_API_KEY";;
esac

# "Continue with Google": needs GOOGLE_CLIENT_ID in wrangler.toml (see SETUP-GOOGLE-AUTH.md)
AUTH=$(curl -s -X POST "$URL" -H 'Content-Type: application/json' -d '{"action":"auth_config"}' || true)
case "$AUTH" in
  *'"ready":true'*) echo "✅ Google sign-in is configured.";;
  *) echo "ℹ️  Google sign-in not configured yet: set GOOGLE_CLIENT_ID in wrangler.toml, then run: npx wrangler deploy (see SETUP-GOOGLE-AUTH.md).";;
esac
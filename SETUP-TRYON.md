# AI Try-On — setup (about 10 minutes)

The try-on opens from a listing's page (icon-only sparkle button, label "AI აირჩიე და მოირგე") and works only for that listing.
Until the steps below are done, the dialog says the AI service is not connected and the button stays disabled — it never shows a fake result.

The browser never sees the AI key. The page talks to a small server function
(`tryon-worker.js`, a Cloudflare Worker — free tier is enough to start) which:

1. fetches the product image when the user pastes a **product link** (reads `og:image` / JSON-LD / direct image links),
2. sends *person photo + jewelry image* to Google's Gemini image-editing model (`gemini-2.5-flash-image`),
3. returns the edited picture.

## Steps
1. Create a Gemini API key at https://aistudio.google.com/apikey and **enable billing** on it
   (image generation has little or no free quota, and free-tier data may be used by Google to improve products).
2. In this folder:
   ```bash
   npm i -g wrangler          # or: npx wrangler ...
   wrangler login
   wrangler secret put GEMINI_API_KEY     # paste the key when asked
   wrangler deploy
   ```
   Wrangler prints a URL like `https://mygem-tryon.<you>.workers.dev`.
3. Open `index.html` and set it:
   ```html
   <script>window.TRYON_API="https://mygem-tryon.<you>.workers.dev";</script>
   ```
4. Check it is live (should print `{"ok":true,"ready":true}`; `ready:false` means the key is missing):
   ```bash
   curl -s -X POST https://mygem-tryon.<you>.workers.dev -H 'Content-Type: application/json' -d '{"action":"ping"}'
   ```
5. Upload `index.html`, `script.js`, `style.css`, `tryon.js` (+ `mygem.jpg`) as usual.

## Notes
* `ALLOWED_ORIGINS` in `wrangler.toml` must list your real domain(s), otherwise the browser is blocked (CORS) — and nobody else can use your key through your worker.
* Every try-on is one paid Gemini call. Enable the optional `RATE_LIMITER` block in `wrangler.toml` to cap abuse.
* Listings with no photo (like the 8 demo items) can't be tried on — the dialog says so. Add a photo to a listing to test.

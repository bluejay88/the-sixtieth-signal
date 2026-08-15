# The Sixtieth Signal — web experience

Static Netlify site for the audiobook, companion podcast, store, donations, and LOAM Archives membership funnel.

## Configure commerce

Edit `site/config.js` and paste secure hosted checkout URLs from Stripe Payment Links, PayPal, Ko-fi, or the selected retailers. Empty links intentionally route visitors to the Netlify release-interest form; the preview never simulates a completed payment.

## Run locally

```powershell
npm install
npm run dev
```

BrowserSync serves the public site at `http://localhost:3000` and live-reloads HTML, CSS, and JavaScript. Use `npm run dev:netlify` when testing Netlify Functions.

## ElevenLabs voice previews

The browser calls `/.netlify/functions/voice-preview`, which keeps the ElevenLabs API key server-side and permits only the ten approved character samples. Copy `.env.example` values into Netlify Environment Variables, using your own licensed ElevenLabs voice IDs. When ElevenLabs is not configured or unavailable, the site automatically falls back to browser speech synthesis so every cast preview still works.

## Deploy

```powershell
npx netlify deploy
npx netlify deploy --prod
```

Netlify Forms captures `loam-archives` and `edition-interest` submissions after deployment.

## Developer dashboard

`/dashboard.html` is an aggregate-data product prototype with an 80-metric registry, 20 specialist agent roles, a 50-item roadmap, and PII/RBAC requirements. It intentionally contains no real customer records. Do not connect customer PII until server-side authentication, MFA, encryption, audit logging, and deletion/retention controls are implemented.

## Plugin orchestration

See `PLUGIN_MAP.md` for active capabilities, relevant next-stage plugins, connection requirements, and least-privilege approval boundaries.

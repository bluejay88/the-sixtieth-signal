# The Sixtieth Signal — web experience

Static Netlify site for the audiobook, companion podcast, store, donations, and LOAM Archives membership funnel.

## Configure commerce

Edit `site/config.js` and paste secure hosted checkout URLs from Stripe Payment Links, PayPal, Ko-fi, or the selected retailers. Empty links intentionally route visitors to the Netlify release-interest form; the preview never simulates a completed payment.

## Run locally

```powershell
npx netlify dev
```

## Deploy

```powershell
npx netlify deploy
npx netlify deploy --prod
```

Netlify Forms captures `loam-archives` and `edition-interest` submissions after deployment.

## Developer dashboard

`/dashboard.html` is an aggregate-data product prototype with an 80-metric registry, 20 specialist agent roles, a 50-item roadmap, and PII/RBAC requirements. It intentionally contains no real customer records. Do not connect customer PII until server-side authentication, MFA, encryption, audit logging, and deletion/retention controls are implemented.

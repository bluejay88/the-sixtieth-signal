# Hourly Growth Command — 2026-08-15 19:28 CT

## Evidence snapshot

- Public site, developer dashboard, robots file, and sitemap returned HTTP 200.
- The legacy reader PDF remains directly public at `/downloads/the-sixtieth-signal-reader-edition.pdf` (HTTP 200; 4,273,059 bytes). This bypasses signed coupon access and is a release-control blocker.
- Coupon issuance returns a correctly formatted code, but the production function reports `stored: false`. Do not count the submission as a captured CRM lead until persistence is verified end to end.
- All ten voice preview endpoints return HTTP 503. Netlify has no `ELEVENLABS_*` variables; the local `labs.py` value is a key ID rather than a valid `sk_` secret.
- Commerce, donations, and social destinations are intentionally blank in `site/config.js`; no payment or social conversion is available.
- BrowserSync starts from `npm run dev`.
- No verified revenue, traffic, subscriber, playback, or conversion source is connected. Dashboard placeholder numbers were removed in this cycle.

## Completed safe internal work

1. Confirmed main-site availability.
2. Confirmed dashboard availability.
3. Confirmed robots and sitemap availability.
4. Confirmed the legacy PDF exposure.
5. Exercised production coupon issuance without reading customer records.
6. Confirmed the coupon code format.
7. Confirmed production persistence is not reporting success.
8. Tested all ten character voice endpoints.
9. Confirmed all voice endpoints fail closed without robotic fallback.
10. Confirmed the ElevenLabs environment variables are absent.
11. Confirmed the local credential file is excluded from Git.
12. Confirmed BrowserSync starts successfully.
13. Verified the cover is present in the hero and store markup.
14. Verified explicit email and SMS marketing consent controls exist.
15. Verified delivery consent is separate from promotional consent.
16. Verified newsletter, LOAM Archives, and discussion selections exist.
17. Verified donation controls do not pretend to collect payment.
18. Verified social controls do not pretend blank destinations are live.
19. Reviewed the Supabase 2026 Data API exposure change against the RPC design.
20. Removed invented dashboard KPI values; unavailable metrics now state `Not connected` and `No verified source`.

## Approval-ready blockers

- Owner: replace the value in `labs.py` locally with a valid ElevenLabs `sk_` secret; never paste it into chat.
- Owner: approve licensed voice selections after ten audition samples are generated.
- Owner: provide hosted checkout/donation URLs and approve products, prices, refund terms, and tax settings.
- Owner: provide official social-profile URLs.
- Owner/legal: approve privacy, terms, refund, membership, AI-voice disclosure, and rights language.
- Engineering: repair and verify Supabase persistence before treating coupon submissions as leads.
- Release: remove the legacy public PDF after confirming signed downloads remain functional.

## Next queue (highest value first)

1. Capture the exact sanitized Supabase RPC error from Netlify.
2. Add a persistence-failure response so the UI never implies CRM storage succeeded.
3. Add rate limiting to coupon issuance.
4. Add coupon campaign capacity and expiry enforcement.
5. Add redemption logging without exposing raw PII.
6. Remove the public legacy PDF after signed-download regression QA.
7. Configure the valid ElevenLabs secret in Netlify.
8. Retrieve licensed ElevenLabs voice inventory.
9. Produce ten character auditions using the casting bible.
10. Conduct author voice-selection approval.
11. Add cached, pre-generated audition files to reduce API cost.
12. Add audio-player loading, failure, and retry states.
13. Add transcripts for every published preview.
14. Run keyboard, contrast, reduced-motion, and screen-reader QA.
15. Draft the six Signal Pause podcast briefs.
16. Draft the spoiler-safe podcast pilot rundown.
17. Draft LOAM Archive Drop 001 without altering locked manuscript prose.
18. Prepare checkout product/price decision sheet.
19. Prepare donation platform comparison for owner approval.
20. Connect consent-aware analytics only after policy approval.
21. Define event names for coupon, preview, archive, store, and donation funnels.
22. Connect error monitoring after owner authorizes the provider.
23. Draft welcome, coupon-delivery, and archive onboarding emails without sending.
24. Draft suppression, unsubscribe, deletion, and retention procedures.
25. Prepare Discord community structure and moderation rules without creating the server.
26. Prepare BookTok/TikTok creative briefs without posting.
27. Prepare podcast and reviewer prospect criteria without contacting anyone.
28. Prepare library and book-club one-sheets.
29. Add owner-authenticated dashboard architecture before exposing operational data.
30. Define the verified source contract required to populate the dashboard time-series empty state.

## Stop / continue / test

- Continue: reliability QA, consent design, scripts, briefs, documentation, and approval-ready assets.
- Test: coupon persistence, signed downloads, accessible audio controls, and source-connected analytics.
- Stop: claiming revenue or growth, sending campaigns, publishing content, enabling payments, or processing raw PII without owner approval and verified integrations.

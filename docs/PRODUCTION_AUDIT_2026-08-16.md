# Production audit — 2026-08-16

## Verified live

- Main website returns HTTP 200.
- LOAM Operations Gateway returns HTTP 200.
- Supabase health reports reachable with migrations applied.
- Public statistics API returns HTTP 200.
- Audiobook inventory API returns HTTP 200.
- Waitlist submission with affirmative email consent stores successfully.
- Duplicate waitlist submission is idempotent and does not create a second membership.
- Waitlist requests without affirmative consent return HTTP 400.
- Feedback submission stores successfully.
- Coupon requests reject incomplete profiles with HTTP 400.
- Valid Part One coupon requests create a stored coupon and signed download URL.
- Signed Part One download returns HTTP 200, `application/pdf`, 89 pages.
- Desktop accessibility snapshot exposes labeled forms, navigation, headings, and disabled unavailable-audio state.
- Live browser console reported zero errors and zero warnings during the tested flows.
- BrowserSync is available for the reader site (`npm run dev`) and gateway (`npm run dev:gateway`).

## Corrected during audit

- Removed false “check your inbox” success behavior from the free-reader flow.
- Added secure immediate Part One delivery through the signed coupon endpoint.
- Kept optional marketing consent separate from required download-delivery consent.
- Added server-side waitlist email/consent validation and feedback-message validation.
- Changed invalid consent requests from misleading HTTP 503 responses to HTTP 400.

## Not configured / not releasable

- Outbound email delivery is not configured. No Gmail, SMTP, Resend, SendGrid, or Postmark environment integration was detected. Contacts and consent are stored, but welcome/newsletter messages are not sent.
- Audiobook inventory contains zero approved published clips. The site correctly disables playback rather than presenting placeholders as completed audio.
- Podcast episodes remain explicitly marked coming soon.
- Store checkout, donations, paid LOAM Archives membership, and live community accounts are not connected to payment/community providers.

## Audit data note

The audit inserted synthetic `example.com` waitlist, coupon, and feedback records so production persistence could be verified without using a real person's data.

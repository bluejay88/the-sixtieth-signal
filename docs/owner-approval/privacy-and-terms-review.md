# Owner Review — Privacy, Terms, and AI Voice Disclosures

Status: operational draft only; obtain qualified legal review before publication.

## Verified data flows to disclose

- Coupon form: first name, last name, email, selected reward, required delivery consent, optional phone, country, mailing fields, format preference, discovery source, interests, program choices, and campaign parameters.
- Database records: contact profile, timestamped consent events, coupon, campaign association, and selected memberships.
- Download token: reward, coupon code, issue time, and a shortened one-way email hash; expires after 30 days.
- LOAM Archives and edition-interest forms: submitted email, selected tier or edition, consent where displayed, and Netlify form metadata.
- Infrastructure: Netlify hosts the site and functions; Supabase stores marketing and coupon records; ElevenLabs will process approved preview text after configuration.

## Required owner decisions

1. Business/legal name and mailing address.
2. Public privacy contact address.
3. Applicable governing law and sales territories.
4. Minimum-age policy and whether submissions from minors are accepted.
5. Retention periods for profiles, consent evidence, coupons, email queues, and operational logs.
6. Process and verification method for access, correction, deletion, export, and consent withdrawal requests.
7. Email and SMS providers and their required disclosures.
8. Analytics, cookies, advertising pixels, and consent-management provider.
9. Refund and replacement policy for each edition and membership.
10. LOAM Archives billing cadence, benefits, cancellation, renewal, and content-availability rules.
11. Donation platform, tax characterization, refund treatment, and whether contributions are non-charitable.
12. AI-voice provider, voice licenses, performer consent, disclosure placement, and generated-audio retention.

## Proposed plain-language disclosures for review

### Coupon delivery

“We use the information you submit to issue and secure your requested reader coupon, prevent misuse, and provide necessary service messages. Promotional email and SMS consent are optional and separate from delivery.”

### Marketing choice

“If you opt in, we may send book, podcast, archive, event, and community updates. You can unsubscribe from promotional messages without losing access already granted to you.”

### AI voice

“Clearly labeled previews may use licensed synthetic voices generated through ElevenLabs. The retail audiobook, final cast, and performer agreements are separately approved and credited. Synthetic previews are not represented as performances by real people.”

### Metrics

“Operational reporting should use aggregated measurements. Raw addresses, phone numbers, and email addresses are customer records—not performance metrics—and must not be exposed to autonomous agents or public dashboards.”

## Do not publish until

- Owner supplies the missing identity, address, territory, age, retention, vendor, and commerce decisions.
- Legal reviewer confirms privacy, consumer, email, SMS, recurring-billing, donation, accessibility, and AI-voice requirements for launch territories.
- Website behavior matches the final language.

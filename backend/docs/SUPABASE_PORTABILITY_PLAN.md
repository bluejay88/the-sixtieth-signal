# Supabase Portability Plan

Status: internal implementation plan; no migration applied  
Reason: Netlify Database provisioning returned HTTP 403 for the dedicated backend project.

## Reuse existing assets

The current Supabase schema already contains contacts, consent events, campaigns, coupons, memberships, email queue, and agent runs. The uploaded operations backend adds feedback, blog drafts, security events, signal engagement, rate-limit buckets, support tickets/replies, orders, and audiobook clip metadata.

Do not create a second subscriber table. Operations APIs should map subscriber views to `contacts`, `consent_events`, and `memberships` so consent history remains authoritative.

## Required migration sequence

1. Add the seven missing operations tables with UUID primary keys, timestamps, check constraints, and indexes.
2. Enable row-level security on every new table before granting access.
3. Create narrowly scoped RPCs for public waitlist, feedback, anonymous events, aggregate stats, and live audiobook clips.
4. Keep admin reads/writes behind a server-held service credential; never place it in browser code or an agent prompt.
5. Replace all `@netlify/database` calls with a small server-only Supabase adapter.
6. Add strict request allowlists and maximum lengths before invoking RPCs.
7. Return only rounded aggregates from public stats and only `status='live'` audiobook metadata.
8. Add contract tests for unauthenticated rejection, CORS, rate limits, PII exclusion, and allowed state transitions.
9. Deploy to a preview backend and run smoke tests before production.
10. Retire the unavailable Netlify Database integration only after parity is verified.

## Mandatory fixes before migration

- The current anonymous coupon RPC is `SECURITY DEFINER`; keep its privileges minimal and add server-controlled input allowlisting.
- Program membership must require matching consent. Selecting `newsletter`, `loam_archives`, or `discussion` must not activate membership unless the corresponding consent is granted.
- Postal fields should not be collected or returned unless a fulfillment purpose exists.
- Public referral creation needs collision-safe generation and a retry path.
- Rate limiting must fail closed when the salt/database is unavailable.
- Admin authentication should use separate role-scoped credentials or signed claims rather than one shared all-powerful token before autonomous operations.
- Orders must remain a non-payment ledger until a verified payment webhook is implemented.
- Audiobook records cannot become `live` without a real asset URL, checksum, duration, transcript, and human QA approval.

## Acceptance evidence

- Schema migration applies cleanly in preview and rolls back cleanly.
- Public endpoints expose no email, phone, address, consent history, support text, or order records.
- Invalid origin, method, payload, state, and credential tests fail closed.
- Coupon delivery works independently of marketing consent.
- Program membership cannot be created without matching consent.
- Admin actions create audit events.
- No live audiobook clip is returned unless its publication gate passed.
- Production secrets exist only in the deployment environment.

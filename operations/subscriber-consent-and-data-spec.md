# Subscriber Consent and Data Specification

Status: owner/legal review draft; not deployed  
Scope: free-book coupon, newsletter, LOAM Archives, reader discussion, and optional SMS  

## Core rule

Coupon delivery is a requested service and must not require marketing consent. Newsletter, LOAM Archives, discussion invitations, and SMS are separate choices. A single checkbox must never silently enroll a reader in every channel.

## Minimum data by program

| Program | Required | Optional | Must not be required |
|---|---|---|---|
| Free-book coupon | email, first name, last name, delivery consent, reward selection | country, preferred format, discovery source, interests | phone, street address, marketing consent |
| Newsletter | email, newsletter consent timestamp/source | display name, interests | phone, postal address |
| LOAM Archives | email, archive consent timestamp/source, tier acceptance | display name, spoiler preference | phone, postal address |
| Reader discussion | email or platform identity, community consent | display name, timezone | street address |
| SMS | phone, SMS consent timestamp/source, jurisdiction-required disclosure version | timezone | postal address |
| Physical fulfillment | recipient name, delivery address, order reference | phone when carrier needs it | marketing consent |

Postal address is fulfillment data, not a marketing profile field. It should live in a restricted order/fulfillment record and should never be exposed to marketing agents.

## Separate consent records

Each consent event should append an immutable record:

```text
consent_id
customer_id
program                 coupon_delivery | newsletter | loam_archives | discussion | sms
action                  granted | withdrawn
channel                 email | sms | community
disclosure_version
source_page
source_form
occurred_at_utc
ip_hash                  short-lived abuse evidence only; never a reusable identity
user_agent_family        optional, coarse
```

Do not overwrite the original grant when someone unsubscribes. Append a withdrawal event and update the current subscription state.

## Subscriber profile

```text
customer_id              random internal identifier
email_normalized         restricted
email_hash               deduplication/indexing
first_name               restricted
last_name                restricted
display_name             optional
phone_e164               restricted, only when supplied for SMS or service need
country_code             optional
timezone                 optional
preferred_format         optional
discovery_source         optional controlled value
created_at_utc
updated_at_utc
deletion_requested_at    nullable
```

Interests and program memberships should use join tables, not repeated free-text columns. UTM values belong to an acquisition-event table and must be length-limited and sanitized.

## Recommended copy

Coupon service:

> Send my coupon and service messages needed to deliver this requested book. Required for delivery; this does not enroll me in promotional email.

Newsletter:

> Send me book, audiobook, and podcast news by email. I can unsubscribe at any time.

LOAM Archives:

> Enroll me in LOAM Archives updates, including monthly world files and spoiler-gated material. Show the price, frequency, renewal, and cancellation terms before any paid enrollment.

Discussion:

> Invite me to moderated reader discussions. Community rules and platform terms will be shown before I join.

SMS:

> Send optional text updates to the number I provided. Message frequency varies; message and data rates may apply. Consent is not a condition of purchase. Reply STOP to opt out.

Final SMS language requires jurisdiction-specific legal review.

## Access controls

- Owner: full access with MFA and audit logging.
- Support: one customer record per active case; masked by default.
- Marketing operator: consented segments and aggregate performance; no postal address.
- Fulfillment: delivery fields for paid/authorized orders only.
- Finance: order and refund identifiers; masked contact fields.
- AI agents: aggregate or pseudonymous data by default; no raw email, phone, or address.
- Export: owner-approved, time-limited, logged, encrypted, and purpose-bound.

## Lifecycle gates

1. Validate and normalize input server-side.
2. Record the exact disclosure version and consent source.
3. Confirm email ownership before promotional enrollment where practical.
4. Keep coupon delivery operationally separate from marketing enrollment.
5. Honor unsubscribe/suppression across every email tool before the next send.
6. Maintain bounce, complaint, and legal-suppression lists without reactivating them through imports.
7. Publish retention periods only after owner/legal approval.
8. Provide access, correction, deletion, and export workflows appropriate to applicable law.
9. Delete or anonymize data when the approved purpose/retention period ends.
10. Never store card data in the application database.

## Current implementation findings

- The coupon form correctly separates required `delivery_consent` from optional email and SMS marketing consent.
- Phone and postal address are optional on the coupon path, which follows data-minimization principles.
- The LOAM Archives form currently uses one Archives-specific required checkbox.
- Program checkboxes and marketing consent need server-side consistency rules so selecting a program without the corresponding consent cannot create an active marketing subscription.
- Coupon persistence currently passes the submitted body to a database RPC; its allowlist, retention, and restricted-field handling need a server-side migration review.
- No production email sending or automated response workflow should be enabled until consent synchronization, suppression, authentication, and owner approval are verified.

## Acceptance tests before activation

- Coupon succeeds with service consent and no marketing consent.
- Coupon fails without service consent.
- Newsletter enrollment cannot occur without newsletter consent.
- SMS enrollment cannot occur without a normalized phone number and SMS consent.
- Withdrawing one program does not withdraw unrelated programs.
- Global email unsubscribe suppresses promotional email across all lists.
- Service messages remain narrowly limited to the requested transaction.
- Agents cannot retrieve raw PII through analytics or dashboard endpoints.
- Every PII export creates an audit event.
- Deletion requests propagate to all processors according to the approved policy.

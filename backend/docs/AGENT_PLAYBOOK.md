# Agent Playbook

This backend gives AI agents everything they'd need to run day-to-day
reporting, content, customer service, and sales tracking for the site
without a human touching the database directly. It does **not** include
email delivery, ad platforms, or a payment processor — those are real
third-party integrations you'd still need to connect (see "What this
backend doesn't do" below) before agents can act fully autonomously.

## Suggested role → tool mapping

| Role | Tools it needs | What it should never do unsupervised |
|---|---|---|
| **Analytics agent** | `get_overview_report`, `get_demographics_report`, `get_security_log` | Nothing — read-only by design |
| **Content agent** | `create_blog_draft`, `list_blog_queue` | Move a post to `live` — that's a publish action, reserve it for a review step or human sign-off |
| **Customer success agent** | `list_support_tickets`, `reply_to_support_ticket`, `update_support_ticket` | Issue refunds directly (it can flag `update_order_status` to `refunded`, but see guardrail below); should set `status: escalated` for anything it isn't confident about |
| **Growth/ops agent** | `list_subscribers`, `update_subscriber_status`, `list_orders` | Promote/demote subscribers in bulk without a spot-check |
| **Orchestrator/CEO-style agent** | All of the above, read-heavy | Any single action listed in "hard guardrails" below without the review step you've configured |

## Hard guardrails worth keeping regardless of orchestration framework

These mirror the kind of guardrails in your own agent-system notes — the
backend enforces some of them structurally, but the rest are on you (or your
orchestrator's system prompts) to hold:

- **Blog posts never auto-publish.** The API only lets a post reach `draft` on creation; moving it to `live` is a separate, explicit call — wire that to a review step or human approval, not the same agent that drafted it.
- **Refunds and escalations are logged at `warning` severity** in the security log automatically, so a daily digest can surface them without an agent needing to remember to report itself.
- **No endpoint returns raw IP addresses or full audit detail to the public** — the security log and all PII-bearing tables are behind the admin key only.
- **Rate limits are server-enforced**, not just agent-promised — even a misbehaving or compromised agent script can't flood the public endpoints.
- Set your own **spend, refund-count, and escalation thresholds** in whatever orchestrator you run on top of this (CrewAI, LangGraph, Assistants API, etc.) — this backend gives agents the data to make those calls but doesn't itself enforce dollar limits, since it has no payment processor wired in yet.

## What this backend doesn't do (yet)

- **No payment processor.** `orders` is a ledger agents can read/write, but nothing charges a card. Wire Stripe (or similar) and point its webhook at a new function that inserts into `orders` with `status: paid`.
- **No email delivery.** Waitlist signups land in `subscribers`; actually emailing them needs a provider (Mailchimp, ConvertKit, Postmark, etc.) that an agent can call — that's a separate connector to add.
- **No live publishing pipeline for the marketing site itself.** `blog_posts.status = 'live'` marks a post ready — actually rendering it on the public site is a follow-on step (static regeneration, a public read endpoint scoped to `status = 'live'` only, etc.).

None of this is hard to add — it's scoped out here specifically so the
initial backend can be reviewed, deployed, and trusted before financial or
email-sending capabilities are layered on top of it.

# Email delivery runbook

## Current mode

The site stores consented signups, and migration `006_email_outbox.sql` adds a deduplicated, approval-required outbox. Sending remains disabled until the owner intentionally connects and enables a provider.

## Activation checklist

1. Apply `supabase/migrations/006_email_outbox.sql` to the linked Supabase project.
2. Verify new signups create one `draft` `waitlist_welcome` row without exposing contact data publicly.
3. Add these Netlify environment variables: `SUPABASE_SERVICE_ROLE_KEY`, `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, and a verified `EMAIL_FROM` address.
4. Set `EMAIL_QUEUE_READY=true` only after the migration is verified.
5. Review template copy and approve specific queue rows by setting `status='approved'` and `approval_required=false` in a restricted owner workflow.
6. Set `EMAIL_DISPATCH_ENABLED=true` only after a test delivery to an owner-controlled address passes.

The scheduled function runs every 15 minutes, claims at most ten approved rows, retries at most three times, and never logs recipient addresses. Disabling `EMAIL_DISPATCH_ENABLED` stops delivery without deleting queued work.

## Required release tests

- Signup is stored with consent evidence.
- Duplicate active welcome jobs are suppressed.
- Draft or approval-required jobs are never claimed.
- Missing configuration returns `mode: disabled` and processes zero jobs.
- Provider failure records a bounded error and permits a controlled retry.
- Successful delivery stores only the provider message ID and send time.
- Unsubscribe handling must be connected before any marketing campaign is approved.

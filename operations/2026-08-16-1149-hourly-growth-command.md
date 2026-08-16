# Hourly Growth Command — 2026-08-16 11:49 CT

## Completed internal work

- Drafted the Supabase operations migration required to replace unavailable Netlify Database provisioning.
- Added nine private-by-default operational tables with constraints, indexes, RLS, and revoked browser roles.
- Reused existing contacts instead of duplicating subscriber identities.
- Added a narrowly scoped public audiobook RPC returning live metadata only.
- Added a database constraint preventing any audiobook clip from becoming live without an HTTPS asset, transcript, duration, checksum, QA timestamp, and approved status.
- This migration was not applied. No database records, PII, messages, public deployments, spending, pricing, legal commitments, or revenue claims were involved.

## Required review

- Database-owner review of table names, retention, roles, and rollback.
- Confirm public audiobook checksum exposure is desired.
- Add server-only RPCs and contract tests before applying.
- Fix program/consent matching in the coupon RPC before marketing automation.

## Rolling queue

1. Review draft operations migration.
2. Add rollback migration.
3. Add consent-consistency migration.
4. Add public waitlist RPC.
5. Add public feedback RPC.
6. Add anonymous event RPC.
7. Add rounded-stats RPC.
8. Add server-side admin adapter.
9. Add role-scoped admin credentials.
10. Add API contract tests.
11. Apply migration in preview.
12. Test RLS and PII exclusion.
13. Configure valid ElevenLabs secret.
14. Approve principal voices.
15. Approve ensemble voices.
16. Lock pronunciations.
17. Decide signal treatment.
18. Complete Chapter 1 routing.
19. Generate cached auditions.
20. Run narration QA.
21. Review podcast Episode 0.
22. Review podcast Episode 1.
23. Test coupon entitlement with approved identity.
24. Finalize newsletter consent.
25. Finalize Archives terms.
26. Configure store links.
27. Configure donation links.
28. Configure community links.
29. Run accessibility QA.
30. Re-audit truth claims.

This was not a Monday run; no weekly roundtable was due.

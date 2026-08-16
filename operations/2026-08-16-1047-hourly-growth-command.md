# Hourly Growth Command — 2026-08-16 10:47 CT

## Completed internal work

- Compared the existing Supabase marketing schema with all ten tables in the uploaded Netlify Database migration.
- Prepared a Supabase portability plan that avoids creating a duplicate subscriber identity system.
- Defined a ten-step migration sequence, eight acceptance-evidence gates, and mandatory consent/security fixes.
- Identified that program membership can currently be activated independently of matching marketing consent; this must be corrected before expanding automated email operations.
- No migration was applied, no database rows or raw PII were accessed, and no public deployment, message, purchase, price change, legal commitment, or revenue claim occurred.

## Owner approvals required

- Approve Supabase as the replacement database for the dedicated operations backend.
- Approve role-scoped credential design and retention policy.
- Approve program-specific consent rules before newsletter/Archives automation.

## Rolling queue

1. Approve Supabase backend path.
2. Draft operations-table migration.
3. Draft public RPCs.
4. Draft admin adapter.
5. Add strict input allowlists.
6. Enforce program/consent matching.
7. Add RLS policies.
8. Add API contract tests.
9. Run preview migration.
10. Deploy preview backend.
11. Test public PII exclusion.
12. Test admin rejection behavior.
13. Configure valid ElevenLabs secret.
14. Approve principal voices.
15. Approve ensemble voices.
16. Lock pronunciations.
17. Decide signal treatment.
18. Complete Chapter 1 routing.
19. Generate cached auditions.
20. Run narration text-parity QA.
21. Review podcast Episode 0.
22. Review podcast Episode 1.
23. Verify coupon entitlement with approved test identity.
24. Finalize newsletter consent/cadence.
25. Finalize LOAM Archives terms.
26. Configure store destinations.
27. Configure donation destinations.
28. Configure community destinations.
29. Run accessibility QA.
30. Re-audit public truth claims.

This was not a Monday run; no weekly roundtable was due.

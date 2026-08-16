# The Sixtieth Signal Backend

Owner/developer API for subscriber operations, aggregate reporting, customer support, content drafts, audiobook clip metadata, and security events.

## Security boundary

- Admin routes require `Authorization: Bearer <ADMIN_API_KEY>`.
- Never store API keys in source, documentation, example files, browser code, tickets, or chat.
- Public routes are limited to approved write operations and aggregate/non-sensitive reads.
- Raw PII must not be exposed to public endpoints, analytics, or AI-agent tools by default.
- Publishing, refunds, outbound messages, purchases, and legal commitments require owner approval.

## Required Netlify environment variables

- `ADMIN_API_KEY`: randomly generated high-entropy secret; rotate immediately after suspected exposure.
- `IP_HASH_SALT`: separate random high-entropy secret used for IP hashing.
- `ALLOWED_PUBLIC_ORIGINS`: comma-separated exact frontend origins.

## Deploy

```bash
npm install
npx netlify link --id b36fe7c6-ffbd-4fca-a7da-4b3f40b5725c
npx netlify deploy
npx netlify deploy --prod
```

Use a preview deploy and endpoint smoke tests before production.

## Interfaces

- `netlify/functions/`: Netlify API endpoints.
- `netlify/database/migrations/`: database schema.
- `docs/openapi.yaml`: connector contract.
- `mcp-server/`: optional owner-side MCP adapter. It requires environment variables and must never ship credentials.

Audiobook metadata may be published only for real, approved audio assets. The backend stores URLs and metadata; it does not establish narration completion or quality by itself.

# The Sixtieth Signal Supabase API

Dedicated Netlify API deployment backed by Supabase.

Required environment variables:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` for future server-only admin routes

Public endpoints:

- `GET /api/health`
- `GET /api/public/audiobook`

The audiobook endpoint returns only rows approved by `list_live_audiobook_clips()`. Until migrations 003–004 are applied, it returns HTTP 503 with an empty list rather than fabricated audio.

# Audiobook Production Workspace

This workspace converts the publication-locked manuscript into auditable chapter and synthesis segments without rewriting prose.

## Current completion definition

- `production-manifest.json`: 50 extracted chapters with word counts, hashes, timing estimates, and segment inventories.
- `manuscript/`: verbatim normalized chapter masters.
- `segments/`: synthesis-sized text segments, each hashed and initially routed to the narrator.
- `voice-cast.json`: ten principal voice roles; licensed ElevenLabs voice IDs intentionally remain blank until casting approval.
- `audio/`: generated MP3 segments. This directory remains incomplete until credentials, casting, routing QA, generation, mastering, and listening QA pass.

## Commands

```powershell
node scripts/prepare-audiobook.mjs "C:\Users\jayla\Downloads\Stage58_Publication_Lock_Final_Proof_Manuscript.txt"
node scripts/generate-elevenlabs.mjs --dry-run
node scripts/generate-elevenlabs.mjs --chapter=1
```

## Required gates before “complete”

1. Valid ElevenLabs `sk_` secret configured locally and in Netlify.
2. Licensed voice IDs approved for all ten principals.
3. Pronunciation decisions locked.
4. Every non-narrator segment speaker-routed and human-reviewed.
5. All 50 chapters synthesized without missing or duplicate text.
6. Chapter masters assembled and loudness-normalized.
7. Human listening QA for intelligibility, continuity, pronunciation, glitches, and dramatic consistency.
8. Retail metadata, credits, AI-voice disclosure, and distribution requirements approved.

The retail audiobook must never include companion-panel interruptions. Signal Pause discussions are separate bonus/podcast tracks.

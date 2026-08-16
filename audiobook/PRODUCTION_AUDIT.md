# Audiobook Production Audit

Audit date: 2026-08-15

## Executive status

The audiobook is **in production, not complete**. The complete locked manuscript has now been converted into an auditable synthesis plan, but zero finished chapter masters exist because the ElevenLabs credential is invalid and casting, routing, mastering, and listening approval remain open.

## Completed and machine-verified

- Source SHA-256: `08b6741f2be8006111a3f124f99dee21b98307559af66c91e5209a80991d27e0`.
- Source structure: 5 parts, 50 chapters, 10 chapters per part.
- Locked-text word count: 100,008.
- Extracted chapter masters: 50.
- Synthesis-sized text segments: 209.
- Maximum segment size: 3,799 characters.
- Estimated base narration: 11.1 hours at 150 words per minute, before pauses and credits.
- Whole-book normalized reconstruction hash matches the normalized source hash.
- Every chapter and segment has an individual SHA-256 digest.
- ElevenLabs dry run schedules all 209 narrator-edition jobs.
- Live generation correctly blocks because `labs.py` does not contain a valid `sk_` secret.
- Public website status data reports 50 scripts locked, 209 segments, zero generated/mastered/published chapters.
- All 360 signal anchors resolve to their specified chapter paragraph.
- Signal counts pass: 354 ordinary markers, 120 Seren payloads, 60 LOAM payloads, 6 gates.
- Gate sequence passes: S060 COUNT, S120 COMPARE, S180 TURN, S240 OVERLAY, S300 WITNESS, S360 RETURN.

## What is not complete

| Gate | Verified state |
|---|---|
| Valid ElevenLabs credential | Blocked: local value is not an `sk_` secret |
| Principal voice IDs | 0 of 10 approved |
| Supporting ensemble | Required; assignments pending |
| Pronunciation lexicon | Drafted; author approval pending |
| Dialogue speaker routing | 0 of 209 synthesis segments approved for full-cast routing |
| Generated audio | 0 of 209 segments |
| Chapter assembly | 0 of 50 |
| Technical mastering | 0 of 50 |
| Transcript timing | 0 of 50 |
| Human listening QA | 0 of 50 |
| Retail metadata/distribution | Pending business and rights decisions |

## Critical edition decision

The locked TXT contains the prose but not the rendered 360 signal glyphs. Signal placements and hidden Seren/LOAM payloads live in a separate Stage58 map. The retail audiobook must remain verbatim and must not receive hidden payload insertions without explicit author approval. `signal-layer-manifest.json` therefore defines a separate optional Signal Layer Edition with `retail_audiobook_injection: false`.

## Full-cast routing boundary

Safe automation includes narration blocks, exact named dialogue tags, deterministic hashes, caching, retries, file naming, and technical measurements. Pronoun-only tags, untagged multi-speaker exchanges, screen text, broadcasts, recordings, memories, translations, archival documents, crowds, and emotional overrides require human review. Unknown dialogue is prohibited from silently falling back to narrator.

The ten principal roles are insufficient for the recurring supporting cast. A six-slot ensemble plan has been prepared for author/casting approval.

## Release acceptance gates

1. Exact source hash and 100,008-word count pass.
2. All 360 signal anchors and six gates pass.
3. Voice license evidence and AI disclosure are recorded.
4. Pronunciation lexicon is author-approved.
5. Every spoken segment has an approved speaker and voice/settings hash.
6. No missing, duplicated, reordered, or silently rewritten prose.
7. Every audio segment has nonzero duration, expected format, checksum, and no clipping.
8. Each assembled chapter passes the selected distributor’s current loudness and true-peak requirements.
9. Transcripts derive from the production script and pass parity review.
10. All 50 chapters receive human listening approval.
11. Final three beats remain distinct: “The page stayed blank.” / “Not unfinished.” / “Available.”
12. Retail credits, cover, metadata, rights, and disclosures are approved.

## Immediate critical path

1. Owner replaces the local key identifier with an actual ElevenLabs `sk_` secret without sharing it in chat.
2. Generate ten controlled audition samples using the existing casting directions.
3. Author approves voices and pronunciation lexicon.
4. Cast the supporting ensemble.
5. Route and review Chapter 1 dialogue before generating a full Chapter 1 pilot.
6. Master and listen-QA Chapter 1; lock settings only after approval.
7. Repeat in controlled batches, not a blind 100,008-word render.

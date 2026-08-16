# Major Audiobook Production Update and Audit

## Completed in this production cycle

1. Verified the locked source SHA-256.
2. Verified exactly 100,008 whitespace-delimited words.
3. Verified five parts and fifty sequential chapters.
4. Extracted fifty normalized, verbatim chapter masters.
5. Split the complete manuscript into 209 synthesis-sized segments.
6. Enforced a 3,800-character synthesis ceiling; observed maximum is 3,799.
7. Added chapter-level SHA-256 hashes.
8. Added segment-level SHA-256 hashes.
9. Reconstructed the entire book and matched its normalized source hash.
10. Calculated chapter word counts and duration estimates.
11. Created the resumable ElevenLabs batch generator.
12. Added idempotent output skipping to avoid paying twice for completed segments.
13. Added a safe dry-run covering all 209 jobs.
14. Confirmed live generation blocks without a valid `sk_` secret.
15. Created the ten-principal voice-cast manifest.
16. Created a supporting-cast plan covering twenty recurring roles.
17. Created a pronunciation lexicon with nineteen approval decisions.
18. Validated all 360 signal anchors against exact chapter paragraphs.
19. Verified 120 Seren payloads, 60 LOAM payloads, and six gates.
20. Kept the optional Signal Layer separate from the retail audiobook.
21. Created a sanitized public production-status manifest.
22. Replaced generic chapter “Preview soon” labels with source-backed production states.
23. Corrected the audiobook product copy so it does not imply a finished edition.
24. Created a formal production audit with twelve release acceptance gates.
25. Audited the website and confirmed zero completed audio files, transcripts, masters, or listening approvals.

## Verified numbers

- Finished prose preparation: 50 of 50 chapters.
- Text-integrity audit: passed.
- Signal-anchor audit: 360 of 360 passed.
- Synthesis plan: 209 of 209 segments scheduled in dry run.
- Approved principal voices: 0 of 10.
- Approved supporting voices: 0.
- Generated audio segments: 0 of 209.
- Mastered chapters: 0 of 50.
- Human listen-approved chapters: 0 of 50.
- Estimated base narration: 11.1 hours at 150 words per minute.

## Next critical queue

1. Install a valid ElevenLabs `sk_` secret locally.
2. Fetch the licensed ElevenLabs voice inventory.
3. Render the same audition passage for all ten principal candidates.
4. Review voice age, register, cadence, artifacts, and emotional ceiling.
5. Lock all nineteen pronunciation decisions.
6. Approve or replace the six supporting ensemble slots.
7. Extract dialogue spans for Chapter 1 with source offsets.
8. Human-review every Chapter 1 speaker attribution.
9. Render Chapter 1 in isolated, replaceable segments.
10. Assemble the Chapter 1 pilot master.
11. Measure duration, silence, clipping, loudness, and true peak.
12. Produce the Chapter 1 transcript and parity diff.
13. Complete a human Chapter 1 listening report.
14. Lock or revise casting/settings based on the pilot.
15. Route Chapters 2–10 and complete Part I attribution QA.
16. Render Part I in bounded batches with cost tracking.
17. Assemble and master Part I.
18. Complete Part I listening QA and pickup log.
19. Repeat routing, rendering, mastering, and QA for Parts II–V.
20. Create retail chapter metadata, credits, cover art, and AI disclosure.
21. Verify current distributor loudness and file-format requirements.
22. Build an accessible player using approved cached audio.
23. Publish HTML/text transcripts for released samples.
24. Generate checksums for every final chapter master.
25. Perform a complete-book human listen-through before calling the audiobook complete.

## Blocking owner action

Replace the identifier currently stored in `labs.py` with the actual ElevenLabs secret beginning `sk_`. Do not paste it into chat. After that single change, the next automated run can fetch voices and generate controlled auditions rather than attempting a blind full-book render.

# Full-Cast Routing Review Guide

## Purpose

The routing console assigns each quoted span to an approved voice without changing the locked manuscript. Its export is not production-ready until the validation command passes.

## Start the console

```powershell
npm run audio:review
```

Open `http://localhost:3001/tools/routing-review/`.

## Review rules

1. Read both context panels before assigning a speaker.
2. Do not assign quotation marks used around a term, label, or cited phrase as spoken dialogue unless the scene makes speech explicit.
3. Use a named principal only when the manuscript supports the attribution.
4. Use supporting ensemble slots only after the casting plan is approved.
5. Keep screen text, LOAM output, broadcasts, recordings, translations, memories, documents, and nested quotations unresolved when their treatment is undecided.
6. Confidence `1.0` is reserved for exact named attribution or author confirmation.
7. A deterministic two-person continuation may be `0.95`–`0.99`, but still requires review.
8. Pronoun or contextual inference should not exceed `0.90` without author confirmation.
9. If uncertain, mark unresolved. Never force completion.
10. Add a note for unusual delivery, translation, archival treatment, or scene-specific casting.

## Export and validate

Export decisions from the console, then run:

```powershell
npm run audio:validate-routing -- "C:\path\to\chapter-01-routing-decisions.json" --validate-only
```

The validator rejects:

- stale or incorrect chapter hashes;
- changed dialogue text hashes;
- duplicate or unknown dialogue IDs;
- unknown speaker roles;
- invalid confidence values;
- approved-but-unresolved decisions;
- incomplete chapter reviews unless `--allow-partial` is explicitly supplied.

Even a valid partial review remains `render_allowed: false`. A chapter becomes renderable only when every span has an approved, non-unresolved assignment.

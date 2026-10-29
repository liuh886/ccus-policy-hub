# Minimal versioned source evidence

This revision follows the confirmed [product boundary in PR #105](https://github.com/liuh886/ccus-policy-hub/pull/105)
and the owner review on #104. It supplies static Agent-ready source data,
not a Q&A Agent or a qualification engine. The only active task queue remains
`docs/ROADMAP.md` from #105; this guide documents the data interface and review.

## Storage decision

The pilot needs one existing policy ID, one frozen original and one exact-text
anchor. Git-versioned evidence files and the current SQLite policy record fully
support that consumption path; no observed query/maintenance need justifies
three new tables. The previous migration proposal, staging implementation and
condition cards have been removed. There is no migration request to approve.

- SQLite is the sole editable authority for accepted policy facts and analysis.
- `scripts/data/evidence/us-45q-2024/source.html` is the sole archived original
  input (44,489 bytes). Git preserves exact bytes; it is excluded from formatting.
- Its sibling `packet.json` owns only snapshot identity, hashes, dates, locator
  and source-review metadata. It does not duplicate or overwrite policy facts.
- `public/data/evidence/` is a deterministic publication projection of those
  inputs and an existing-policy join. Published copies are never maintenance
  inputs. No original text or metadata is copied into SQLite BLOB storage.

Revisit storage only if actual multi-document/version queries or review
maintenance cannot be managed reliably. Do not add a compatibility layer,
service, legal corpus, graph or speculative tables for this single sample.

## Provenance and historical scope

The input is the [official 2024 edition of 26 USC 45Q](https://www.govinfo.gov/content/pkg/USCODE-2024-title26/html/USCODE-2024-title26-subtitleA-chap1-subchapA-partIV-subpartD-sec45Q.htm).
The embedded `currentthrough:20250106` is coverage through 2025-01-06. It is not
current law as of retrieval. Publication date remains null; retrieval time,
code edition, coverage cutoff and legal-effective dates are distinct.
No later amendment or guidance coverage is asserted.

The 2025-edition endpoint previously returned an HTTP 200 error page; the
validator rejected it instead of accepting transport success as source validity.
The existing 2025 record's foreign-entity timing still needs review against
[Public Law 119-21, section 70522(a)/(d)](https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm).
This change does not alter that record or resolve legal interpretation.

## Consumer path

1. Read manifest `datasets.source_evidence.file` and `schemas.source_evidence`.
2. Read the index, select the policy/document ID and resolve the record URL
   relative to the index (preserving the site's base path).
3. Validate the JSON with the published schema and verify its index hash.
4. Read `raw_file` and `normalized_file`, both relative to the index. Verify
   their SHA-256 against the record. Original HTML is served as `.html.txt` so
   consumers read bytes as data rather than execute them as same-origin HTML.
5. Resolve the anchor by document ID, raw hash, extractor version and anchor ID.
   Its UTF-16 offsets must reproduce the exact quote from normalized text.
6. Read review state, `usable_as_reviewed_reference`, historical coverage and
   gaps. A draft is available for inspection, never presented as reviewed evidence.

The record is `source_document` evidence. The frozen original and one locator
are sufficient to test reference mechanics; they do not make database summaries
clause evidence. No automatic project association or legal conclusion is added.

## Commands and negative checks

```bash
pnpm gen
pnpm --silent evidence:inspect --file scripts/data/evidence/us-45q-2024/packet.json
pnpm --silent evidence:inspect --file scripts/data/evidence/us-45q-2024/packet.json --observed-file /path/to/download.html
pnpm data:consume --root public
```

Commands print JSON; invalid input gives a nonzero exit and structured stderr.
No command fetches sources, writes SQLite or accepts `--write`/`--preview-migration`.
An observed raw hash change yields `source_changed`; extractor changes yield
`extractor_changed`. Neither can silently reuse review of the old extraction.
Historical bytes remain available. Raw/text tampering, unsupported entities,
wrong editions, invalid paths, non-unique quotes and dangling policy IDs fail.

The standalone consumer uses only public resources and standard JSON Schema
validation (AJV/ajv-formats, development dependencies). It imports no SQLite,
Astro, private source parser or generator and produces no Agent answer. It also
validates all six bilingual context bundles and their references/hashes.

## Human review gate

The real document and the single `26 USC 45Q(d), 2024 edition` anchor remain
`draft`, `method: not_reviewed`, with null reviewer/date. The pending review is
visible in both the public record and consumer output; P2 is **not complete**.
Positive verified-state tests use explicit synthetic review records only.

A human reviewer must inspect the original and the complete section (including
alternatives and category-specific requirements), compare the exact normalized
quote and offsets, and confirm this historical edition's coverage. Only after
explicit human approval may the packet record `method: human`, reviewer/date
and verified status for the reviewed document and anchor. Approval of the data
locator is not approval of current-law interpretation, tax eligibility or an
Agent-generated answer. No automatic review promotion is implemented.

# Versioned source evidence: 45Q pilot

Status: **review preparation; schema approval pending**. This implements the
offline validation and migration-preview part of S2 in [PR #101](https://github.com/liuh886/ccus-policy-hub/pull/101).
It does not enable clause-level answers in the public S1 bundles.

## Reviewable input

The frozen input is the [official 2024 edition of 26 USC 45Q](https://www.govinfo.gov/content/pkg/USCODE-2024-title26/html/USCODE-2024-title26-subtitleA-chap1-subchapA-partIV-subpartD-sec45Q.htm).
Its embedded metadata says `currentthrough:20250106`; this is coverage through
2025-01-06, not current law as of the retrieval date. The publication date is
unknown in the packet and remains null. Retrieval date, edition, legal coverage
date and project applicability are different concepts.

- Frozen bytes: `scripts/data/evidence/us-45q-2024/source.html` (44,489 bytes).
- Review input: `scripts/data/evidence/us-45q-2024/packet.json`.
- Two exact-text anchors: section 45Q(d), and section 45Q(e)(3), including the
  surrounding alternatives and exclusions rather than a detached threshold.
- Three bilingual condition drafts: construction timing, category-dependent
  capture thresholds, and DAC definition. Each names required inputs, but its
  applicability period and exceptions remain `not_reviewed`.
- Document and anchors remain `draft`, with no fabricated reviewer or approval.
  Every condition reports `unknown` and `publishable: false`.

These inputs are an unaccepted review proposal. After approved import, SQLite
holds accepted document metadata, original bytes, normalized text and anchors;
the candidate files are replay inputs, never a second editable source of truth.
No generator currently reads these candidates or publishes them to the website.

## Commands

```bash
pnpm --silent evidence:inspect -- --file scripts/data/evidence/us-45q-2024/packet.json

# Stage the proposed schema and draft rows in a disposable in-memory clone.
pnpm --silent evidence:inspect -- --file scripts/data/evidence/us-45q-2024/packet.json --preview-migration

# Compare independently downloaded bytes without accepting or replacing them.
pnpm --silent evidence:inspect -- --file scripts/data/evidence/us-45q-2024/packet.json --observed-file /path/to/new-source.html
```

Successful commands print JSON. Errors print `error.code` and `error.message`
on stderr and exit nonzero. No command fetches sources or writes SQLite. There
is intentionally no `--write` option before schema approval. Invalid IDs, file
names, source URLs, duplicate references, missing quote text, malformed UTF-8,
unsupported entities and hash mismatches fail explicitly.

## Version and anchor contract

1. SHA-256 pins the exact archived HTTP response bytes. Git line-ending
   conversion and Prettier are disabled for those bytes.
2. `govinfo-usc-html-v1` accepts the specific GPO USC 45Q HTML profile. It checks
   document markers, removes non-content markup, decodes supported entities,
   normalizes NFC/whitespace and retains visible content and headings. It is
   not a general-purpose scraper. An HTTP 200 error page fails validation.
3. A second hash pins the normalized text. Changing the extractor requires a
   new extraction version and new review, even if the source bytes are equal.
4. A quote must resolve exactly once in that text. Offsets are explicitly
   UTF-16 code units, so JavaScript consumers can reproduce `slice(start,end)`.
5. Changing observed source bytes yields `source_changed`; changing the
   extractor yields `extractor_changed`. Both make dependent anchors unusable
   for the newly observed state. Historical evidence is retained, not deleted.
6. Only an explicitly reviewed document and anchor can be usable as a reviewed
   historical citation. This does not prove currentness, legal interpretation,
   a condition's satisfaction, or tax eligibility. Candidate staging forbids
   promoting either document or anchor to `verified`.

## Proposed storage

The [migration manifest](../agent/ccus-ai-agent/migrations/2026-10-source-evidence/manifest.md)
and `proposed-schema.sql` describe three additive tables:

| Table                      | Responsibility                                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| `source_documents`         | Stable document identity, policy association, bilingual title and official URL                       |
| `source_document_versions` | Exact bytes, raw/text hashes, extractor version, edition, retrieval/coverage dates and review record |
| `source_document_anchors`  | Version-bound quote, locator, offsets and independent review record                                  |

The composite version key is `(document_id, raw_sha256, extractor_version)`.
Foreign keys prevent orphan anchors; staging rejects replacement of a pinned
version or anchor, is transactional and can be replayed without duplicate rows.
Existing policies, analyses, scores and relationship semantics do not change.
`db/schema.sql` remains unchanged until approval and actual migration.
Condition drafts are not imported by this proposal; their eventual governed
storage and condition-evaluation workflow are a later S3 change.

## Review findings and remaining work

- The 2024 snapshot predates the 2025 amendment and cannot answer present-law
  questions by itself. Attempts to retrieve a 2025 edition returned an error
  page despite HTTP 200; that response was rejected rather than archived as law.
- The existing 2025 record's phased foreign-entity timing needs review against
  [Public Law 119-21, section 70522(a) and (d)](https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm).
  No database narrative or timeline was silently corrected in this proposal.
- Before publishing clause evidence, freeze the enacted amendment and applicable
  regulations/guidance, review the extraction against the original, record a
  real reviewer/date, and review the conditions' time boundaries and exceptions.
- Project-specific evidence remains absent; no facility association is inferred.

## Verification

Tests cover exact quote recovery, byte/hash integrity, source/parser invalidation,
draft review gates, null publication date, error-page rejection, duplicate and
orphan references, foreign keys, transactional rollback, idempotent staging,
and byte-identical preservation of the real SSOT during preview. None of those
tests substitutes for legal-content review by the approving maintainer.

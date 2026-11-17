# Original-source readiness audit method

This implements the read-only inventory slice of [issue #106](https://github.com/liuh886/ccus-policy-hub/issues/106).
It does not complete the reviewed priority corpus or close that issue.
Product scope and scheduling remain exclusively in `PRODUCT_BOUNDARIES.md` and
`ROADMAP.md`; this page documents the audit, not a parallel task queue.

## Inputs and authority

- Canonical policy IDs, countries, record review states and reference URLs come
  from the current SQLite SSOT. No network requests or database writes occur.
- `scripts/data/source-readiness/v4-transfer-observations.json` is a generated,
  redacted capture of two **actual** private v4 CSV exports, not a hand-maintained
  source registry. It retains input SHA-256, per-row inventory SHA and observation
  times. File IDs, private links and original contents are excluded.
- Optional Git evidence packets are read only from an explicit packet root.
  Default: `scripts/data/evidence` on the audited branch. Missing directories do
  not mean no private archive exists. Packet manifests and raw bytes are hashed;
  evidence files must be named siblings, with no path traversal or symlink escape.
- Captured transfer states never establish instrument identity, legal edition,
  currentness, copyright permission or reviewed clauses. Neither an official
  URL nor a verified database policy proves those properties.

The actual observed exports are `Policy_Primary_Source_Audit_20261030T042348Z.csv`
and `Policy_Official_Registry_Research_Backlog_20261030T042408Z.csv`. Their raw
SHA-256 values are `f8990ac91f9a443ed81117efe9b87b0099c16c5dda90d8a66f83ecf0f4922909`
and `e012e3adbda2b9ab5c146520e1e2b395034a5d083409efc208d57029b4c94c74`.
Both cover 130 unique IDs and bind to the 2026-10-30 SQLite checksum
`1aa9c830c7cd13dd026ebf6118bff9df590b05dc70bea1de0c8567aac15fa53d`.
The [owner's v4 acceptance review](https://github.com/liuh886/ccus-policy-hub/pull/107#issuecomment-6507527963)
also reports 44 total archived files at that capture. This is not 44 verified documents, nor a
count of new uploads performed by this audit.

## Per-policy `(id, url)` binding and URL-change quarantine

When the current SQLite checksum matches a capture row's `inventory_sha256`,
binding is direct (`exact_inventory_sha256`). When the database checksum changes
(for example, after #102 merged on `main`, producing
`0ae85e1972c8131c45c573a036caac1f6f857b08300325154160d4658596f00d`), observations
are never silently carried over by `inventory_sha256` guesswork or across
changed URLs. Instead, the audit consults the SHA-256-verified `(id, url)`
baseline snapshot
`scripts/data/source-readiness/inventory-url-baseline-1aa9c830.json`
(extracted read-only from `dd3a74d6`):

- **116 policies with identical `(id, url)`**: bind their 2026-10-30 v4 and
  manual observations via `policy_url_match` (`34` v4 raw candidates, `5` v4
  homepage-only archives, `77` no raw file).
- **14 policies whose canonical `url` changed in #102** (and any newly added
  policy IDs not present in the baseline): quarantined with
  `ARCHIVE_URL_CHANGED_SINCE_CAPTURE` and `ARCHIVE_OBSERVATION_UNAVAILABLE`
  (`archive.state: "unknown"`). Old-URL transfer states, candidate counts and
  local hash checks are never carried over to a new URL.
- **Unrecognized `inventory_sha256`** without a matching verified baseline
  snapshot: preserves strict failure (`ARCHIVE_INVENTORY_MISMATCH` in per-policy
  readiness; error in manual reconciliation).

## Cumulative manual reconciliation

`manual-transfer-observations.json` captures the actual 52-row private manifest
`Policy_Manual_Acquisition_Cumulative_20261030_R3.csv`, SHA-256
`595e52b1357613b09d50140ecf3692d35a37a574357a401cf5c47829fa22997a`.
At capture time, all 28 retained source files were read locally and checked against
their full manifest SHA-256 and byte length. Candidate files must be in the private
primary directory; supporting files must be in the metadata directory. Filename
prefix alone is insufficient. Symlink escape, missing/ambiguous files, wrong hashes,
unknown policy IDs, stale unrecognized inventory checksums and duplicate observations fail.
No source bytes, local paths, Drive IDs or private links enter the committed capture.

On the post-#102 inventory (`0ae85e19...`), 45 of the 52 captured attempts bind
to unchanged `(id, url)` policies (`24` locally hash-checked unique blobs), while
7 attempts belonging to 5 URL-changed policies (`cn-ordos-pilot-2024`,
`vn-decree-119-2025`, `hr-hydrocarbon-act-ccs`, `co-law-2099-energy-transition`,
`ro-law-114-2013-ccs`, covering `4` unique blobs) are quarantined from current-URL
coverage. The 17 current-URL-aligned manual candidates plus 34 v4 candidates
produce **51** current-URL-aligned cumulative candidates, leaving **79** policies
without a current-URL-aligned raw candidate. Four previously captured candidate
policies whose canonical URL changed in #102 (`br-anp-ccs-resolution`,
`ca-sk-ccs-directives`, `cn-ordos-pilot-2024`, `vn-decree-119-2025`) are recorded
separately in `superseded_url_candidates`. Supporting files and rejected
non-documents do not add candidate coverage; retry rows do not add policy counts.
This is a capture of local byte integrity, not a fresh Drive-presence check,
instrument/edition approval or acceptance of the source-role descriptions as law.
The baseline table/triage continues to describe current-URL-bound observations;
`manual_acquisition` holds cumulative ID lists separately and does not clear gaps.

```bash
node scripts/audit-policy-source-readiness.mjs --capture-manual <private-manifest.csv> --private-primary-root <private-primary-directory> --private-supporting-root <private-metadata-directory>
```

## Commands

```bash
pnpm manage:db:audit:source-readiness
pnpm manage:db:audit:source-readiness --check

# Recapture observed metadata from real exports; never from invented rows.
node scripts/audit-policy-source-readiness.mjs --capture-audit <private-audit.csv> --capture-backlog <private-backlog.csv> --as-of 2026-10-30

# Explicit supplemental review of an unmerged evidence directory.
node scripts/audit-policy-source-readiness.mjs --evidence-root <git-evidence-directory> --as-of 2026-10-30
```

Generation writes only the redacted input capture (when explicitly requested)
and the two derived reports in `docs/`. `--check` compares deterministic report
bytes and fails on drift or invalid previously human-reviewed evidence. It never
requires all legacy policies to acquire originals before other work can proceed.
The default report date is the explicit baseline date 2026-10-30; pass `--as-of`
when intentionally establishing a later reporting snapshot. This is not a legal
review date or a fresh network check.

## What the baseline establishes

- All 130 policies appear once in the inventory; all have reference URLs.
- After #102's 14 URL updates (`0ae85e19...`), 116 policies retain identical
  `(id, url)` binding to the 2026-10-30 capture (`34` v4 non-homepage raw
  candidates, `5` v4 homepage-only archives, `77` no attached raw file in that
  run; `17` additional current-URL-aligned manual candidates from `24` blobs),
  giving **51** current-URL-aligned cumulative candidates and **79** policies
  without a current-URL-aligned raw candidate.
- The 14 URL-changed policies are quarantined (`ARCHIVE_URL_CHANGED_SINCE_CAPTURE`),
  with the 4 prior-URL candidates (`br-anp-ccs-resolution`,
  `ca-sk-ccs-directives`, `cn-ordos-pilot-2024`, `vn-decree-119-2025`) recorded
  separately in `superseded_url_candidates`.
- Main has no accepted Git evidence-packet directory at this baseline. Its
  recorded Git document/version/validated-human-anchor counts are therefore 0.
  The unmerged #104 pilot is a separate historical, draft specimen and is not
  silently counted as mainline evidence.
- There are no accepted policy-to-instrument identity attestations in these
  inputs. `primary_document_identified`, `document_kind` and currentness remain
  unknown; the recorded accepted-identity count is 0. This does not assert that
  official documents do not exist. Scope-limited locator review would not by
  itself establish policy-to-instrument identity either.

Policy records, distinct document IDs, raw hash/extractor versions and human
locator records are separate denominators. One document may link multiple
policies and one policy may require multiple documents. Counts do not determine
`single_document`, `multi_document` or `programme_or_composite`: no taxonomy is
inferred from titles or numbers of attached files.

## States, priorities and regression behavior

The report preserves transfer status/time, reported HTTP status/hash/edition,
private-file presence, local integrity, locator status, historical coverage and
explicit gaps. A stored hash without available bytes is not a verified original.
A draft, missing edition, unsupported identity claim or restricted/unknown
redistribution permission remains visible rather than receiving a pass.

P0 flags broad source URLs, homepage-only evidence and observed missing/insecure
references. P1 covers unresolved acquisition/identity work; P2 candidates still
need manual document review. The machine-readable `triage` sorts P0/P1 IDs with
their blockers. These are evidence tasks, not executed registry searches.

An archival observation with an unrecognized SQLite checksum (or no matching
verified `(id, url)` baseline snapshot) is excluded from current per-policy
readiness and explicitly flagged `ARCHIVE_INVENTORY_MISMATCH`; an observation
whose policy URL changed since capture is quarantined with
`ARCHIVE_URL_CHANGED_SINCE_CAPTURE`. Observations are never silently carried over
across altered URLs or unverified database states. Re-run the collector or
review the mismatch/URL change before recapturing a new baseline.

Known error/login HTML, altered/missing original bytes, orphan policy links and
invalid normalized quote ranges cannot masquerade as reviewed evidence. Broken
previously human-reviewed integrity creates a blocking regression. Legacy
unknown/draft evidence remains visible debt. Without normalized bytes, a locator
cannot be revalidated by this audit; it is not counted as validated merely from
a reviewer-name field. Real legal/content review and redistribution approval
remain human responsibilities; no raw private or licensed text is published.

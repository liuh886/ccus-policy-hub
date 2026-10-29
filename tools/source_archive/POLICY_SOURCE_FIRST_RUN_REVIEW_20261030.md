# Policy primary-source archive — first live run and v2.2 follow-up

**Source of truth**: [Colab audit CSV](https://drive.google.com/file/d/1RuY7qw1uAfTC38YgY5jFw6u9bBcYiwxX/view), dated 2026-10-29T19:17Z. Read-only canonical policy SQLite SHA-256: `1aa9c830c7cd13dd026ebf6118bff9df590b05dc70bea1de0c8567aac15fa53d`. Detailed 130-policy [repair queue](https://drive.google.com/file/d/1YWWJp8CtERGhtRppkb79xRxb7bBbJzJ7/view), retained privately in the author's Drive.

## Observed first-run results

| First-run status | Policies |
| --- | ---: |
| `uploaded_original` (raw-source files; **not** policy-identity verification) | 34 |
| `needs_official_source_review` | 65 |
| `not_found` | 7 |
| `http_error` (6 HTTP 202 + 412/419) | 8 |
| `missing_source_url` (actually HTTP-only original URL) | 5 |
| `network_error` | 4 |
| `blocked_html` | 3 |
| `access_blocked` | 3 |
| `html_too_short` | 1 |
| **Total** | **130** |

Detailed breakdown of **65** `needs_official_source_review` records under the **v2.2 URL prefilter**:

- **20** have government/institutional hostnames now admitted to the *acquisition* prefilter, so may be retried.
- **32** are publisher homepages and need an instrument-specific original URL. Permitting their domains is not a solution.
- **13** are not admitted and still need source/issuer verification (including private registries and standards organizations).

Among the **34** already uploaded raw sources, **8** point at ministry/publisher homepages and must **not** be counted as verified policy originals. All pre-existing Drive files are retained for audit; there is no deletion or reclassification of the underlying SQLite by this patch. The narrow URL heuristic identifies 44 homepage references across the 130-policy backlog (32 withheld by old allowlist, 8 uploaded, and 4 other historical statuses). A homepage might be useful organizational context, but not the text of a specific law or regulation.

The five `missing_source_url` records actually have **non-HTTPS** URLs in canonical SQLite, so v2.2 reports `non_https_source` and requires manual HTTPS URL verification. Don't silently rewrite `http` to `https` without checking the target.

## Fixed in this PR

1. Preserve both source-fetch and policy-instrument-review dimensions in each audit row with `url_scope` and `instrument_verification`.
2. Reject homepage-only targets before download as `source_too_broad`; preserve existing historical raw files.
3. Extend official-domain acceptance for identified government portals, while retaining manual review for private standards and non-government issuers; no URL is invented.
4. Classify HTTP 202 (`http_202_not_document`) separately from genuine 404, and 412/419 with access restrictions.
5. Reduce per-request read timeout from 110 to 35 seconds and read retries from 2 to 0; network errors remain resumable via subsequent runs.
6. Create Google API transports with `httplib2.Http(timeout=90)` to avoid per-request timeout warnings.
7. Distinguish non-HTTPS from empty URLs: `non_https_source` vs `missing_source_url`.
8. Update Drive Colab notebooks (same IDs as before) and expand offline regression tests to 8 cases.

## Acceptance for next Colab execution

- For **130** canonical policy IDs, audit all statuses, include both URL specificity and validation flags, and preserve old Drive originals. An extra manual target can legitimately increase attempt count; calculate unique policy coverage by ID.
- In particular, check 20 newly accepted targets, and verify **no new file uploads** for 44 known homepage references.
- Policy evidence coverage KPI must be computed from a separately reviewed `policy_id → official instrument / edition` mapping, **not** the number of `uploaded_original` or `already_archived` raw files.
- Do not mutate `ccus_master.sqlite`, public JSON or generated bilingual Markdown; source-target repairs should be performed in a separately reviewed data migration/PR.

## Further planned work (not automated by this patch)

- Replace 32 obvious publisher-homepage URL entries with exact primary source and resolve remaining 13 issuers.
- Investigate the 7 404s and EU EUR-Lex six HTTP 202s with official alternatives or retry at the publisher; don't assume rights restrictions.
- Verify the 26 non-homepage already-uploaded files actually match the named policy, including legal instrument identifiers, consolidated versions, effective dates and languages.
- Produce a `policy_source_evidence` registry in an explicitly reviewed schema migration only after policy-content validation.

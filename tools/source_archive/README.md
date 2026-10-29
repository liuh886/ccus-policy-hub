# CCUS original-source archive utilities — v2.1 (2026-10-30)

## Run from Google Colab

- **GCCSI_Bulk_Archive_Colab.ipynb**: recurring/incremental Global CCS Institute report backup to Drive `CCUS/01_Institute_Reports`.
- **CCUS_Policy_Primary_Source_Archive_Colab.ipynb**: primary government/regulator policy evidence backup to Drive `CCUS/02_Primary_Policies`.
- Each notebook is self-contained. Open in Colab, `Runtime → Run all`, grant Drive authorization once per session, rerun as required. Neither requires GitHub private credentials or a third-party login.
- After each run, inspect `CCUS/00_Catalog_and_Metadata/{GCCSI_Incremental,Policy_Primary_Source}_Audit_UTC.csv` (one immutable CSV per run).

## Incremental rules

1. Discover current source URLs. List existing files in Drive, using `appProperties.source_url_sha256` and `sha256`.
2. Skip already archived sources if their latest version is younger than `RECHECK_DAYS`. Existing archives are **not** deleted or overwritten.
3. Older source URL: perform conditional GET if ETag or Last-Modified was previously captured; 304 → record `not_modified`.
4. Modified bytes: verify PDF/DOCX/HTML signature and SHA-256. For new content preserve a new filename with a digest suffix, keeping old editions intact.
5. Same bytes but new source URL: record `duplicate_content`, reuse existing Drive file ID, and persist URL alias to avoid repeat downloads.
6. Network error, 401/403, HTTP 404/410, HTML/CAPTCHA, and unsupported documents have distinct audit states, none automatically classified as 'members only'.
7. Each run writes an audit CSV (all URLs including skips and failures). No source file is removed automatically.

## Policy-specific source authority and safety

- Source-of-truth for the **policy inventory**: public GitHub `liuh886/ccus-policy-hub` `main`, `agent/ccus-ai-agent/db/ccus_master.sqlite`, **read only**.
- Uses `policies.id`, `country`, `url`, `source`, `policy_i18n.title`. The first pass never invents URLs; unknown/empty sources become `missing_source_url`. Non-official hosts become `needs_official_source_review`.
- `OFFICIAL_HOSTS` and `OFFICIAL_SUFFIXES` are a conservative **pre-filter**, not a declaration of authoritative legal standing; `EXTRA_OFFICIAL_HOSTS` requires an explicit reviewed hostname.
- Source accepted: original PDFs, DOCX and substantive HTML, saved privately with source URL, policy ID, timestamp and checksum. Non-HTML PDF-filename URLs that return official HTML are correctly saved as `.html`.
- Optional manual CSV (verified target URLs) can be provided by setting `POLICY_ADDITIONAL_TARGETS_CSV_ID` in notebook; headers: `policy_id,country,title,url,publisher`. It also passes official-host screening.
- For dynamic JavaScript pages, login-only policies, archival consolidated versions, multilingual official counterparts, and legal authenticity: **human review/research follow-up required**. Source URL alone is not sufficient proof of jurisdiction, enactment, legal weight or current force.
- **No automatic write into `ccus_master.sqlite` or published bilingual Markdown.** No automatic public republication of raw licensed sources. An approved project import/metadata reconciliation PR is required to integrate into Context Layer.

## Known caveats / validation

- Offline unit tests and notebook syntax checks were run; Google OAuth and live first-run uploads have **not** been executed from this environment.
- `GITHUB_DB_URL` references the `main` branch; pin to a commit when a reproducible historical dataset snapshot is needed.
- Source discovery is bounded (publications pages, WP API page limits). Absence from results does not prove a source does not exist.
- `createdTime` is a fallback for legacy GCCSI files lacking `checked_at`, so initial v2 run may recheck old files; rechecks are deduplicated by SHA-256.
- Transient HTTP 403/429 can represent bot mitigation rather than membership restrictions. HTML snapshot is raw evidence; no interpretation or content extraction is attempted.


## First live Policy Colab audit: remediation (2026-10-30)

Input: `Policy_Primary_Source_Audit_20261029T191752Z.csv` in the connected Google Drive metadata folder; immutable inventory SHA-256 `1aa9c830c7cd13dd026ebf6118bff9df590b05dc70bea1de0c8567aac15fa53d`.

- 130 policies evaluated: 34 downloaded files; 65 old host-allowlist rejects; 7 HTTP 404; 6 HTTP 202/8 HTTP-error total; 4 network errors; 5 insecure HTTP URLs; 3 blocked HTML, 3 403 and 1 too-short HTML.
- 65 rejects decomposed: **20 official host false negatives** accepted by v2.2 acquisition filter; **32 generic publisher homepages** now `source_too_broad` and not considered originals; **13 issuer/source cases** remain for manual review.
- **8 of the 34 already uploaded sources** pointed at publisher homepages; pre-existing files are *not* deleted, but must not be counted as primary policy texts or indexed as legal instruments.
- Source authenticity requires policy-to-instrument matching, legal title/number, official issuer, applicable edition/effective date, and evidence of document content. `uploaded_original` is only a file-transfer status, not policy evidence verification.
- The 5 non-HTTPS URLs remain in the backlog, now explicitly `non_https_source`; the source inventory still contains 130 nonempty `p.url` values but only 125 initially valid HTTPS URLs.
- `http_202_not_document` records upstream 202 responses (not a PDF or HTML body); don't infer permanent link death.
- `google_auth_httplib2` timeout warning addressed by constructing `AuthorizedHttp` with `httplib2.Http(timeout=90)`; request read timeout now bounded, leaving transient retrieval errors for the next incremental run instead of holding the session for multiple 110-second waits.
- Before repeating, use latest updated Google Drive policy notebook. The first new run after v2.2 is **not yet live verified**; compare its CSV with this queue before approving any primary-source coverage KPI.

Repair CSV: `Policy_Source_Repair_Queue_20261030.csv`, columns `queue_bucket`, `priority`, `action`, `policy_id`, original source URL and the canonical SQLite hash. Treat all `archived_unverified` as needing content validation, even though the file exists in private Drive. This CSV is a planning aid and must not modify the policy database.


## v3: read-only candidate discovery and reviewer gate

The Policy Colab notebook now creates **two** CSVs in `00_Catalog_and_Metadata`: the usual `Policy_Primary_Source_Audit_<UTC>.csv` and `Policy_Source_Review_Candidates_<UTC>.csv`. Candidate discovery is bounded to official anchor links in previously archived HTML and three separately verified publisher reference seeds. All suggested links remain **pending**, even when they resemble statute URLs; no candidate is automatically downloaded or marked as law.

For human-approved exact URLs, use the versioned `policy_approval_template.csv` with `policy_id,url,review_status,reviewer,source_edition`. Check the correct document and edition, change `pending` to `approved`, fill reviewer, upload the reviewed CSV privately to Drive, then set `POLICY_ADDITIONAL_TARGETS_CSV_ID`. The notebook validates canonical policy IDs and HTTPS official URLs; it never alters SQLite.

The standalone Python collectors import adjacent `archive_core.py` in GitHub, while Drive scripts accept `ccus_archive_core.py`; both Colab notebooks embed the complete engine. Run `python tools/source_archive/test_source_discovery_v3.py` and the existing core tests before merging.

**Evidence KPI:** 44 files currently preserved in the Policy Drive folder, but 36 non-homepage source candidates (not 36 legally verified originals). 44 broad canonical source URLs remain a provenance-repair backlog.

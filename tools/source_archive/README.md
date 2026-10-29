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

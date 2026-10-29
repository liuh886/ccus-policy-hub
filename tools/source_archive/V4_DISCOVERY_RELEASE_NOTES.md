# CCUS original-source archive utilities — v2.2 (2026-10-30)

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

## v3: Reviewed source discovery and exact citation repairs (2026-10-30)

**Why**: The second Colab run stored 44 total raw files, but only 36 canonical IDs have non-homepage candidate material (26 already archived + 10 new). 44 canonical URLs were `source_too_broad` and 13 publishers were still outside the official-source prefilter. Upload success is not proof of a policy instrument. The newly downloaded HTML samples include ministry or programme overviews, so the source-identity problem must not be hidden with more retries.

1. Running `CCUS_Policy_Primary_Source_Archive_Colab.ipynb` now writes **two** CSVs: the original per-run archival audit and `Policy_Source_Review_Candidates_<UTC>.csv` under `00_Catalog_and_Metadata`. The latter has **every canonical policy ID** and zero or more unreviewed link suggestions.
2. Source discovery **does not crawl the web**: it reads bounded, already-archived first-party HTML snapshots, extracts same/other official-host candidate links, scores by lexical overlap and file indicators, and filters insecure/non-official links. Scores are **ranking only**, not legal verification. File IDs prove the particular archived source page used to discover a link, not a reviewed legal citation. A bounded list of verified official online references (UK Energy Act 2023 c.52, EPA UIC primacy, DOE CIFIA) is inserted as a **pending review suggestion** with explicit legal-vs-programme type.
3. `POLICY_ADDITIONAL_TARGETS_CSV_ID` now accepts an **approved** Drive CSV. Mandatory headers: `policy_id,url,review_status,reviewer,source_edition`. Only `review_status=approved` rows are ingested, every ID must exist in the canonical SQLite, URLs must be HTTPS/official/non-homepage, and approval requires reviewer and edition. The built-in review queue uses `review_status=pending` and **must not be passed directly** to this setting. Reviewers must first verify the exact instrument, source issuer, version and rights. The approval file is a separate governed artifact.
4. Existing raw originals remain immutable. The archive audit now records `target_origin` and `source_edition`; new uploaded files include those as Drive app properties. **No policy SQLite mutation or public redistribution**. The canonical source URL is left untouched until an approved policy-data repair PR.
5. Discovery is capped at 55 archived HTML files, 3.5 MB each, and top 6 anchors per policy snapshot; it is not a completeness guarantee. Unreadable files do not abort the whole review queue.

**Recommended next cycle:** run v3 once, inspect the review CSV, approve a small P0 group beginning with the confirmed `uk-energy-act-2023` official PDF, and rerun with an approved-only CSV ID. Don't mark the policy as `verified` until the PDF title/number/edition has been checked and its appropriate provisions traced. EUR-Lex six HTTP 202 responses stay an independent adapter/research backlog; do not fabricate endpoints.

**Offline verification:** `python -m py_compile tools/source_archive/{archive_core,ccus_policy_primary_archive,gccsi_bulk_archive}.py && python tools/source_archive/test_archive_core.py` and check both self-contained notebook Python cells compile. New Colab OAuth/incremental upload and reviewer CSV path require a real Colab rerun to confirm end-to-end behavior.

**Source layout:** The GitHub/Drive standalone `ccus_policy_primary_archive.py` imports the neighbouring shared `archive_core.py` / `ccus_archive_core.py`; the Colab Notebook embeds both and is self-contained. To execute locally, use both source files together. This eliminates drift across duplicated common functions.

## v4 policy discovery precision and research queue (2026-10-30)

**Observed v3 regression corpus:** the live v3 run archived 0 new originals, preserved 44 raw Drive files and produced 160 reviewer rows. Only 46 contained URL proposals across 16 policy IDs; 114 were no-candidate markers. The old ranking scored irrelevant ANP privacy documents, unrelated IRS credits, India general budget tables and EU programme navigation as high as relevant evidence. v4 addresses those errors **without asserting new document coverage**.

Changes to `CCUS_Policy_Primary_Source_Archive_Colab.ipynb` and `ccus_policy_primary_archive.py`:

- Candidate ranking uses **anchor and final URL path component** instead of generic publisher directory prefixes, excludes unrelated privacy/individual tax-credit/budget navigation patterns, requires two distinctive policy-title terms or a specific instrument identifier, adds policy-specific subject guards, and marks `version_alignment` explicitly. A matched URL remains only a research *suggestion*.
- The candidate review CSV now keeps `archive_state`, `archive_audit_status`, `archived_source_file_id`, `source_role`, `discovery_state`, `instrument_match_review_state`, `version_alignment`, `publisher_lookup_route`, **separate** from `candidate_url`. A raw file exists even when no outbound links were extracted; lack of discovered links is not misreported as missing archive evidence.
- A third artifact, `Policy_Official_Registry_Research_Backlog_UTC.csv`, gives **one row per canonical policy ID** with issuer, domain hint, lookup route, research priority, raw archive state and candidate count. These are structured search *instructions*, not invented links, executed queries or verified legal sources. No extra HTTP traffic is generated by this stage.
- Raw archive bytes remain immutable; no SQLite, publication JSON or policy verdict is updated. Reviewer approval is still required before candidate URLs enter the download queue.

**Offline gates:** Python compilation; both Colab's embedded cells parsed as Python; 18 preexisting checks + 5 v4 checks; a 20-row actual-v3 false-positive fixture is fully rejected by the revised scorer. This validation does **not** prove v4 Colab runtime retrieval or legal correctness; confirm three CSV exports and 130/130 policy IDs on next live run.

**Follow-on milestone:** true publisher registry query adapters (per official API/search endpoint), historical version retrieval, and verified policy-to-law evidence matching are outside this v4 retrieval-independent research-hint stage and must be implemented and tested separately. The heuristic's recall is knowingly lower than v3, prioritizing precision and explicit uncertainty.

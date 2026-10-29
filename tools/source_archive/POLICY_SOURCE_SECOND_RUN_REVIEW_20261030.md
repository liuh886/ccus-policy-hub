# CCUS Policy Hub — policy primary text acquisition: second Colab live-run audit

**Audit timestamp**: 2026-10-29 19:33 UTC, reviewed 2026-10-30 (Asia/Singapore).  
**Canonical policy database SHA-256**: `1aa9c830c7cd13dd026ebf6118bff9df590b05dc70bea1de0c8567aac15fa53d`; 130 unique policy records, same input snapshot as first run.  
**Source audit**: https://drive.google.com/file/d/1O75aQsUiEJuy1qVijRzeJLrirVVnf3rJ/view  
**Primary evidence Drive folder**: https://drive.google.com/drive/folders/1S07jkytGKENRvA7zwXjnGARiKVZr5Vnx

## Grounded outcome (do not conflate these denominators)

- Existing raw files: **44 Drive files** (=34 first run +10 second run); first audit had 34 `uploaded_original`; second audit: 26 `already_archived`, 10 `uploaded_original`, 8 historically uploaded broad institutional homepages reclassified to `source_too_broad`.
- 36 unique policy IDs now point to a newly saved or previously retained **non-homepage *candidate***; 36/130 = 27.7%. This is **NOT** legal-instrument verified coverage. 44/130 = 33.8% is raw-file retention, and includes the 8 historical broad homepages.
- 44 policy records (33.8%) have `source_too_broad`; 50 remaining records have other unavailable/blocked/review statuses. All 130 IDs appear in the audit.
- All 36 `already_archived`/`uploaded_original` audit IDs were checked against actual files in the target Google Drive folder; **0 missing**. The folder held 41 HTML and 3 PDF files. The 10 newly downloaded files were all HTML.

| Second run status | Count |
| --- | ---: |
| `source_too_broad` | 44 |
| `already_archived` | 26 |
| `needs_official_source_review` | 13 |
| `not_found` | 10 |
| `uploaded_original` | 10 |
| `http_202_not_document` | 6 |
| `non_https_source` | 5 |
| `access_blocked` | 5 |
| `network_error` | 5 |
| `blocked_html` | 3 |
| `redirect_outside_official` | 2 |
| `html_too_short` | 1 |

## Actual HTML-title spot-check of the 10 newly uploaded files

The checks below inspect the saved HTML's `<title>`/`<h1>`, **not** an external summary. These files are retained even if they are not the target legal instrument.

| Policy ID | Observed document/page | Preliminary result |
| --- | --- | --- |
| `br-bill-1425-2022` | Brazilian Senate title **PL 1425/2022** | Specific bill docket candidate; bill status still needs confirmation |
| `ca-ab-sequestration-tenure` | Alberta King's Printer | Publisher catalog/entry; regulations text not established |
| `ca-sk-ccs-directives` | Government of Saskatchewan: **Oil and Gas** | Generic category page, **not the directive** |
| `kz-ecology-code-ccus-2024` | Kazakhstan Ministry of Ecology home | Agency page, **not Ecology Code** |
| `my-ccus-act-2025` | MyCCUS **Activities & Initiatives** | Portal activities, **not CCUS Act** |
| `my-mida-incentives` | MIDA **Equilibrium Through Carbon Capture** | Promotional/sector article, not the formal incentive text |
| `netherlands-sde` | RVO **SDE++ programme** | Official program overview, not necessarily its regulation |
| `nl-mining-act-co2-storage-2011` | wetten.nl **Mijnbouwwet — BWBR0014168** | Legal statute text candidate; provisions and version still need verification |
| `nl-porthos-sde-subsidy` | RVO **SDE++ programme** | Scheme overview, not proof of the Porthos award |
| `pl-mining-law-ccs-2024` | Gov.pl **Ministry of Climate and Environment** | Ministry portal, **not mining law** |

## Confirmed source repair and manual research candidates

1. **UK `uk-energy-act-2023`: P0 exact citation defect.** Existing canonical URL points at 2023 Chapter 67 and returned 404. UK Energy Act 2023 is **Chapter 52**; the official legislation website hosts the complete original enacted PDF at https://www.legislation.gov.uk/ukpga/2023/52/pdfs/ukpga_20230052_en.pdf and original enacted HTML at https://www.legislation.gov.uk/ukpga/2023/52/england/enacted . Verify live Colab retrieval and policy ID/title/version match, then propose a reviewed SQLite URL correction.
2. **`us-epa-class-vi-primacy`**: obsolete EPA link 404. The official EPA program explainer is https://www.epa.gov/uic/primary-enforcement-authority-underground-injection-control-program . **Supporting regulatory interpretation**, not a standalone law. For statutory grounding trace Safe Drinking Water Act §1422, 40 CFR 145/147 and the applicable individual primacy approvals.
3. **`us-cifia-lpo`**: obsolete DOE landing page 404. DOE publishes CIFIA program overview at https://www.energy.gov/edf/carbon-dioxide-transportation-infrastructure-finance-and-innovation-program . **Programme overview, not statutory legal text.**
4. **`us-iija-hubs`**: original source points at the **CIFIA** programme, not an identified hubs policy. Require policy-instrument identity review **before substituting a convenient DOE URL**.
5. **EUR-Lex 6× HTTP 202**: site response was 202 and not a document. Preserve retries as an independent publisher adapter challenge; don't classify as 404 or invent a working API endpoint. Prefer regulation/CELEX/ELI-specific official PDF or HTML after testing.

## Architecture and work order

**P0:** Fix the policy inventory provenance backlog. Distinguish the original legal instrument from implementation/overview/news links, and record version (enacted/consolidated), publisher, instrument number, effective dates, original URL. Treat `source_too_broad` as a content-quality/data problem, not a downloader problem.

**P1:** Provide a reviewable `policy_id -> source_candidate[]` queue with provenance and `candidate_type`, `source_edition`, `evidence_match_status`, `reviewer`, `checked_at`, and site metadata. Implement a read-only source-discovery helper that proposes actual documents from publisher official search and internal links; **never** silently rewrite `ccus_master.sqlite` or promote a downloaded HTML to verified law.

**P2:** Improve publisher-specific retrieval (EUR-Lex 202, bot-blocks, DNS failures, changed agency domains) with isolated adapters, retries and negative tests; rate limits must be respected. Do not add generic CAPTCHA bypass or mass scrape arbitrary websites.

**P3:** Verify title/number/text/version of archived candidates; only after manual/automated evidence review should a reviewed migration establish `policy_source_evidence` links in the authoritative project database. Do not infer legal force, membership restrictions or grant public redistribution rights automatically.

**Validation:** This report is based on two actual Drive audit CSVs, an exact Drive-folder file-count/ID check, and raw HTML title spot-checks. External official sources linked above were separately checked by web search, but **the alternate URLs were not executed through the Colab archiver**. GitHub main and production SQLite remain unchanged.

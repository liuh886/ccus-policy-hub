# CCUS Policy Hub — Active Roadmap

> Last reviewed: 2026-11-17. This is the single active task queue. Product scope, architectural responsibilities and stop rules are defined in [PRODUCT_BOUNDARIES.md](PRODUCT_BOUNDARIES.md).

## Goal and baseline

CCUS Policy Hub is a bilingual evidence-grounded research and data platform. It publishes verifiable static Agent-ready data for downstream consumers; it **does not build or evaluate a professional Q&A Agent**.

The mainline baseline includes #102, #103, #104, #111 and #113 (**merged on main**), with 130 policy records, 1,110 facility records and 65 country profiles. SQLite is the authoritative maintenance source; public JSON, Markdown and Astro pages are generated projections.

Passing CI on a feature branch is not proof of public release. Product boundary #105, architecture-research plan #108, consumption specification #109, search-runtime alignment #113, policy/workflow update #102, source-readiness inventory #111, static context contract #103 and frozen 45Q source-evidence contract #104 have **merged on main**; obsolete draft #101 and superseded RFC #112 are closed, not merged. The remaining separate private acquisition workflow is #107, and #114 delivers the three-source-type discovery catalog prototype.

## P0 — Align existing work and audit original-source readiness

- **Inputs:** #102, #103, #104, #105, #108, #109, #111 and #113 merged on `main`; [#106 source coverage audit](https://github.com/liuh886/ccus-policy-hub/issues/106) open; [#107 private acquisition](https://github.com/liuh886/ccus-policy-hub/pull/107) open.
- **Work — integration:** #102's policy-data corrections, #103's static context bundles, #104's single historical 45Q evidence packet (with human snapshot/locator review bounded to the 2024 snapshot) and #111's readiness inventory are merged on `main`.
- **Work — #107 source collector:** Corrective head `a6a6aecd` has [green full CI](https://github.com/liuh886/ccus-policy-hub/actions/runs/41034223014). The owner's actual post-change CSVs cover 130 IDs, give P0/P1/P2=59/35/36 and keep all eight homepage-only records P0. Relation labels remain unreviewed. The exact executed notebook export is still needed for executable-cell parity; the old local notebook fails that comparison. No SQLite mutation or automatic candidate approval.
- **Work — #106 readiness inventory (#111 merged):** The read-only audit derives all 130 rows from SQLite and reconciles the 2026-10-30 audit/backlog and 52-attempt manual manifest against the SHA-256-verified pre-#102 `(id, url)` baseline (`1aa9c830...`). On post-#102 SQLite (`0ae85e19...`), 116 policies retain identical `(id, url)` binding (`34` v4 raw candidates, `5` homepage-only, `17` manual candidates from `24` locally hash-checked blobs), giving **51/130 current-URL-aligned cumulative candidates and 79 gaps**. The 14 policies whose URLs changed in #102 are quarantined (`ARCHIVE_URL_CHANGED_SINCE_CAPTURE`), with the 4 prior-URL candidates (`br-anp-ccs-resolution`, `ca-sk-ccs-directives`, `cn-ordos-pilot-2024`, `vn-decree-119-2025`) recorded separately in `superseded_url_candidates`. Supporting/rejected materials are excluded from candidate coverage; current Drive presence was not rechecked, primary identity/edition review remains pending, and #104's single historical 45Q specimen is not full-corpus coverage. Do not claim completion of #106.
- **Done:** Mainline, published data, README and this roadmap agree. #107 has green **current-HEAD** CI covering Python + notebook sync, with real post-change Colab audit readback. All 130 policy IDs appear once in a reproducible source-readiness report: document identities/versions/anchors are distinct denominators; upload count or `policy.url` alone never means verified primary evidence. Geographic facility matches never count as direct evidence.
- **Stop:** Do not introduce chat, agent inference, new databases, universal crawlers or new services. The private Drive archive is acquisition staging, not the public Agent-ready source of truth.

## P1 — Publish a consumable Agent-ready data contract

- **Discovery prerequisite (#113, merged on `main`):** The accepted product priority is research-question-driven discovery. The merged search-runtime update pins Pagefind 1.5.2, honors explicit SDK languages, restores English recall and aligns tested CCUS terms with native CJK boundaries (covered by Node HTTP regressions, browser Worker checks and search-page checks). No private PDFs are indexed.
- **Input:** Completed P0 and #103's static 45Q policy/family bundle implementation (merged on `main`).
- **Work:** Verify manifest discovery, JSON Schema, stable IDs, deterministic JSON/Markdown output, source references, evidence type, time, translation status and explicit gaps; test invalid IDs and languages.
- **Done:** An independent consumer can discover, validate, read and cite data using public resources only, without the site's private runtime. The same inputs give byte-identical outputs.
- **Stop:** Do not implement Q&A, prompt orchestration, RAG, MCP or answer-accuracy benchmarks.

## P2 — Review and publish citable original-source evidence

- **Input:** P1, #106 audited source gaps, #107 verified originals/approval queue, #104's merged 45Q history pilot, and [#108 source-to-citable-context research](https://github.com/liuh886/ccus-policy-hub/pull/108).
- **Three-source-type discovery catalog prototype (#114):** Projects the frozen historical 45Q HTML packet (`us-45q-usc-2024`) and two explicitly captured archived PDFs (`uk-energy-act-2023-enacted`, `gccsi-ccus-progress-china-en`) into `data/discovery/catalog.json`. The independent `catalog:consume` consumer resolves selected versions/locators (`us-45q-usc-2024` as `reviewed_historical_locator`, and both PDFs as `candidate_only` with explicit private-byte, edition and review gaps) without rerunning discovery/acquisition or performing semantic knowledge extraction.
- **Work — source repair:** First validate identity/issuer/instrument/edition for the 26 archived candidates from the first run; compare the 10 new non-homepage candidates from the second run separately, using actual original bytes. Repair 44 broad homepage URLs to precise official documents through reviewed SQLite changes; separately triage 20 newly accepted official hosts, 7 initial 404s, six EUR-Lex HTTP 202 results and five legacy HTTP sources. **No guessing or silent URL rewriting.**
- **Work — publication:** Only after issuer, edition, quote/page or clause, and human-review scope are confirmed, publish minimal citable evidence. Report summaries remain **secondary sources**; neither PDFs nor web pages automatically substantiate legal applicability. Preserve historical editions and reject stale/altered/unreviewed citations.
- **Done:** The #108 three-source-type prototype (#114) demonstrates concrete 45Q/UK-law/GCCSI specimens with evidence identities, format-specific locators, licensing and review scope; an independent consumer can resolve approved references to immutable version/hash/locator and see draft/restricted/currentness gaps. For #106 each policy's source readiness remains visible; previously verified evidence regressions fail validation, not-yet-reviewed legacy records remain known backlog.
- **Stop:** A single historical example proves the mechanism, not readiness of 130 policies. Do **not** copy licensed/private Drive PDFs into public Git or publish large text without permission. No automatic eligibility, bulk condition cards, generic crawler or unapproved SQLite migration. Prefer versioned Git evidence files (when redistributable) + existing SQLite records; no duplicate BLOB full text.

## P3 — Demonstrate limited cross-jurisdiction reuse

- **Input:** P2 evidence contract and current governance-comparison methodology.
- **Work:** Apply the same evidence and projection contract to no more than two or three important policy instruments from different jurisdictions.
- **Done:** New records retain source, version, caveats and citation semantics without creating a second truth source or special-case answer workflow.
- **Stop:** No universal legal graph, automated policy applicability engine or indiscriminate bulk ingestion.

## P4 — Sustain data quality and the existing research experience

- **Input:** Actual consumer feedback and maintenance needs from P1–P3.
- **Work:** Prioritize reviewed Chinese analysis, policy-source fixes, selected facility evidence, source-change review signals, deployment/report version checks and targeted navigation or performance improvements.
- **Done:** Scoped validation and published artifacts remain reliable; the human-facing comparison, facility pages and ESG30 academic reading experience remain intact.
- **Stop:** No new CMS, broad redesign, redundant CI chains or new backend without a demonstrated requirement.

## Existing maintenance queue

- **Source completeness:** [#106](https://github.com/liuh886/ccus-policy-hub/issues/106) is P0: the 2026-07-22 source/URL gap report shows zero missing fields but does not check original bytes/hash/version/review. #111 reconciles the 2026-10-30 baseline (34 current-URL-aligned v4 candidates / 5 homepage-only observations) with 17 current-URL-aligned manual candidates to **51/130** (`+ 4` URL-superseded candidates in `superseded_url_candidates`; 79 policy IDs still lack a current-URL-aligned raw candidate). These are **not** verified legal-instrument coverage; the merged #104 historical 45Q specimen is an isolated single-instrument pilot.
- **Source-asset-to-context architecture:** [#108](https://github.com/liuh886/ccus-policy-hub/pull/108) merged as an architecture research plan; #114 implements the three-source-type catalog prototype (`us-45q-usc-2024`, `uk-energy-act-2023-enacted`, `gccsi-ccus-progress-china-en`) over frozen inputs without performing semantic knowledge extraction.
- **Policy depth:** #102 (merged on `main`) updated 41 below-threshold verified records; verify generated reports on `main` against the current SQLite baseline.
- **Analysis translation:** #102 identifies remaining analytical dimensions requiring reviewed Chinese versions; prioritize by use, while retaining explicit source language.
- **Facility curation:** #102 identifies remaining active-facility records; prioritize sources by value, not by an arbitrary universal news coverage target.
- **Relationship evidence:** #102 distinguishes country and subnational contextual links from directly evidenced project-policy relationships (which remain zero unless directly substantiated).
- **Publication and CI:** Keep ESG30 upstream synchronization and structural checks; run expensive data audits when authoritative inputs change, not for unrelated cosmetic edits.

## Required evidence for each implementation PR

- State the accepted authority input and generated output.
- Document schema/field meanings, missing-value states, source versions, review and language status.
- Verify citation integrity, negative cases and deterministic generation.
- Confirm SQLite consistency and the correct release state: implemented on branch, merged on main, or published on Pages.
- Explain why any new service, table, dependency or subsystem is necessary for a tested consumer or maintenance need.

See [PRODUCT_BOUNDARIES.md](PRODUCT_BOUNDARIES.md) for full ownership, exclusion and stop criteria. Do not maintain another status queue inside drafts or component documentation.

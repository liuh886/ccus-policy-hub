# CCUS Policy Hub — Active Roadmap

> Last reviewed: 2026-10-30. This is the single active task queue. Product scope, architectural responsibilities and stop rules are defined in [PRODUCT_BOUNDARIES.md](PRODUCT_BOUNDARIES.md).

## Goal and baseline

CCUS Policy Hub is a bilingual evidence-grounded research and data platform. It publishes verifiable static Agent-ready data for downstream consumers; it **does not build or evaluate a professional Q&A Agent**.

The mainline baseline reviewed at `aa68b45f` contains 130 policy records, 1,110 facility records and 65 country profiles. SQLite is the authoritative maintenance source; public JSON, Markdown and Astro pages are generated projections.

The current implementation PR chain is **#102 → #103 → #104**, with #107 as a separate private acquisition workflow. Each is an independent checkpoint; passing CI on a feature branch is not proof of public release. Product boundary #105, architecture-research plan #108 and the single consumption specification #109 have **merged on main**; obsolete draft #101 is closed, not merged. The three-source evidence research experiments in #108 remain **unperformed**, not completed product capabilities.

## P0 — Align existing work and audit original-source readiness

- **Inputs:** #102 open and awaiting factual review, #103 open on #102, #104 draft on #103; [#106 source coverage audit](https://github.com/liuh886/ccus-policy-hub/issues/106) open; [#107 private acquisition](https://github.com/liuh886/ccus-policy-hub/pull/107) draft. #105, #108 and #109 are already merged.
- **Work — integration:** Review #102's substantive policy-data corrections and approved translations before merge; its obsolete roadmap has already been replaced with the mainline canonical file. Then retarget #103 to `main`, rerun CI and verify Pages. Keep #104 draft until the original/locator receives genuine human review. The #109 consumption specification and #108 research plan need no further branch merge.
- **Work — #107 source collector:** Python core/v3/v4 regression tests now run in a scoped CI job and passed at `250015ab`; **full CI still fails Prettier** on archive documentation. Fix formatting and obtain a green full CI; preserve one authoritative Python module, add a verifiable notebook/source drift check, and validate v4's three CSV exports through a real Colab run. Do not modify SQLite or promote source candidates automatically.
- **Work — #106 readiness inventory:** From canonical SQLite plus **observed** archival audit and reviewed evidence packets, generate a read-only per-policy report. Baseline after second Colab run: 130 policy IDs, 44 private Drive files (including broad pages), 36 non-homepage **unverified** candidates, 44 too-broad source URLs. Distinguish policies, unique original documents, editions and reviewed anchors. Record `unknown` explicitly.
- **Done:** Mainline, published data, README and this roadmap agree. #107 has green **current-HEAD** CI covering Python + notebook sync, with real post-change Colab audit readback. All 130 policy IDs appear once in a reproducible source-readiness report: document identities/versions/anchors are distinct denominators; upload count or `policy.url` alone never means verified primary evidence. Geographic facility matches never count as direct evidence.
- **Stop:** Do not introduce chat, agent inference, new databases, universal crawlers or new services. The private Drive archive is acquisition staging, not the public Agent-ready source of truth.

## P1 — Publish a consumable Agent-ready data contract

- **Input:** Completed P0 and #103's static 45Q policy/family bundle implementation.
- **Work:** Verify manifest discovery, JSON Schema, stable IDs, deterministic JSON/Markdown output, source references, evidence type, time, translation status and explicit gaps; test invalid IDs and languages.
- **Done:** An independent consumer can discover, validate, read and cite data using public resources only, without the site's private runtime. The same inputs give byte-identical outputs.
- **Stop:** Do not implement Q&A, prompt orchestration, RAG, MCP or answer-accuracy benchmarks.

## P2 — Review and publish citable original-source evidence

- **Input:** P1, #106 audited source gaps, #107 verified originals/approval queue, #104's 45Q history pilot, and [#108 source-to-citable-context research](https://github.com/liuh886/ccus-policy-hub/pull/108).
- **Work — source repair:** First validate identity/issuer/instrument/edition for the 26 archived candidates from the first run; compare the 10 new non-homepage candidates from the second run separately, using actual original bytes. Repair 44 broad homepage URLs to precise official documents through reviewed SQLite changes; separately triage 20 newly accepted official hosts, 7 initial 404s, six EUR-Lex HTTP 202 results and five legacy HTTP sources. **No guessing or silent URL rewriting.**
- **Work — research and prototype (#108):** Compare Drive-only vs Git-backed version evidence + existing SQLite + static JSON vs new data store; demonstrate three **different** source types: historical 45Q HTML, one EU/UK regulation and one GCCSI PDF report. Define document identity/version/anchor/claim review relationships, independent consumers and permissions. Prefer reuse of #104's existing manifest and source packet.
- **Work — publication:** Only after issuer, edition, quote/page or clause, and human-review scope are confirmed, publish minimal citable evidence. Report summaries remain **secondary sources**; neither PDFs nor web pages automatically substantiate legal applicability. Preserve historical editions and reject stale/altered/unreviewed citations.
- **Done:** The #108 decision record includes concrete 45Q/EU-or-UK/GCCSI specimens with evidence identities, format-specific locators, licensing and review scope; an independent consumer can resolve approved references to immutable version/hash/locator and see draft/restricted/currentness gaps. For #106 each policy's source readiness remains visible; previously verified evidence regressions fail validation, not-yet-reviewed legacy records remain known backlog.
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

- **Source completeness:** [#106](https://github.com/liuh886/ccus-policy-hub/issues/106) is P0: the 2026-07-22 source/URL gap report shows zero missing fields but does not check original bytes/hash/version/review. #107 second-run audit confirms 44 archived private files / 36 non-homepage policy candidates / 44 broad URLs, **not** verified legal-instrument coverage; the draft #104 historical 45Q is an isolated evidence pilot.
- **Source-asset-to-context architecture:** [#108](https://github.com/liuh886/ccus-policy-hub/pull/108) **merged as an architecture research plan**, not three completed empirical validations. Continue the 45Q historical HTML / another jurisdiction's official law / GCCSI PDF evidence experiments; only then approve any new implementation schema or permission model.
- **Policy depth:** #102 reports that 41 below-threshold verified records were corrected; confirm this on main after merge rather than claiming completion from an open PR.
- **Analysis translation:** #102 reports 609 of 649 analytical dimensions still require reviewed Chinese versions; prioritize by use, while retaining explicit source language.
- **Facility curation:** #102 identifies 65 remaining active-facility records; prioritize sources by value, not by an arbitrary universal news coverage target.
- **Relationship evidence:** #102 distinguishes 4,287 country and 509 subnational contextual links; it reports zero directly evidenced project-policy relationships.
- **Publication and CI:** Keep ESG30 upstream synchronization and structural checks; run expensive data audits when authoritative inputs change, not for unrelated cosmetic edits.

## Required evidence for each implementation PR

- State the accepted authority input and generated output.
- Document schema/field meanings, missing-value states, source versions, review and language status.
- Verify citation integrity, negative cases and deterministic generation.
- Confirm SQLite consistency and the correct release state: implemented on branch, merged on main, or published on Pages.
- Explain why any new service, table, dependency or subsystem is necessary for a tested consumer or maintenance need.

See [PRODUCT_BOUNDARIES.md](PRODUCT_BOUNDARIES.md) for full ownership, exclusion and stop criteria. Do not maintain another status queue inside drafts or component documentation.

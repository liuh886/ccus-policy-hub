# CCUS Policy Hub — Active Roadmap

> Last reviewed: 2026-10-30. This is the single active task queue. Product scope, architectural responsibilities and stop rules are defined in [PRODUCT_BOUNDARIES.md](PRODUCT_BOUNDARIES.md).

## Goal and baseline

CCUS Policy Hub is a bilingual evidence-grounded research and data platform. It publishes verifiable static Agent-ready data for downstream consumers; it **does not build or evaluate a professional Q&A Agent**.

The mainline baseline reviewed at `aa68b45f` contains 130 policy records, 1,110 facility records and 65 country profiles. SQLite is the authoritative maintenance source; public JSON, Markdown and Astro pages are generated projections.

The current implementation PR chain is **#102 → #103 → #104**. Each is an independent checkpoint; code passing CI on a feature branch is not proof of public release. #101 is a separate draft specification requiring revision before merging.

## P0 — Align and deliver the existing work

- **Inputs:** #102 open, #101 draft, #103 open on #102, #104 draft on #103.
- **Work:** Review and integrate #102 data quality, source review, relationship and i18n fixes; remove Q&A acceptance criteria from #101; retarget #103 to updated main, rerun CI and verify publishing; keep #104 in evidence review.
- **Done:** Mainline, published data, README and the active roadmap describe the same capabilities. The verified project-policy direct evidence count must not be invented from geographic matches.
- **Stop:** Do not introduce chat, agent inference, new databases or new services.

## P1 — Publish a consumable Agent-ready data contract

- **Input:** Completed P0 and #103's static 45Q policy/family bundle implementation.
- **Work:** Verify manifest discovery, JSON Schema, stable IDs, deterministic JSON/Markdown output, source references, evidence type, time, translation status and explicit gaps; test invalid IDs and languages.
- **Done:** An independent consumer can discover, validate, read and cite data using public resources only, without the site's private runtime. The same inputs give byte-identical outputs.
- **Stop:** Do not implement Q&A, prompt orchestration, RAG, MCP or answer-accuracy benchmarks.

## P2 — Verify one versioned primary-source evidence path

- **Input:** P1 and the reviewed candidates in #104.
- **Work:** Freeze one official 45Q source version and review at least one clause locator. Confirm source/extractor changes invalidate dependent anchors. State historical/current-law coverage boundaries.
- **Done:** A consumer can trace an approved reference to one immutable source version, valid locator and human review state; tampered or stale evidence cannot be silently used as verified.
- **Stop:** No automatic eligibility decisions, exhaustive 45Q ingestion, bulk condition cards or unapproved SQLite schema changes. Test whether versioned Git evidence files plus existing structured fields suffice before adding tables or duplicating source text.

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

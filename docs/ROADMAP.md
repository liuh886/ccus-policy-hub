# CCUS Policy Hub — Active Roadmap

> Updated: 2026-10-30 · Status: implementation planning. This is the **only active task queue**.
>
> **Normative scope and stop rules**: [PRODUCT_BOUNDARIES.md](PRODUCT_BOUNDARIES.md). Historical delivery logs live in Git history and merged PRs, not in this file.

## Product objective

Provide **evidence-grounded CCUS policy/facility/governance data** to people through the existing bilingual research site and to downstream agents through **static, documented, verifiable Agent-ready interfaces**. This repository **does not build or evaluate a professional Q&A Agent**.

An external consumer must be able to discover → validate → read → cite → identify gaps using public structured data. No on-site chat, Q&A API, RAG, MCP service, eligibility engine or new backend is needed to pass this milestone.

## Verified baseline vs. proposed changes

- `main` assessed at `aa68b45f` (2026-10-28); README snapshot: **130 policies, 1,110 facility records, 65 country profiles**. Counts are record counts, not proof of current law or independent projects.
- Main already has SQLite SSOT, governed exports, Astro bilingual site, comparison/facility workspaces, public JSON/Schema and ESG30 publication sync.
- **#102 open**, data/content/source/relationship/UX reliability repairs not yet merged.
- **#101 draft**, Agent context specification must be revised to the product scope in PRODUCT_BOUNDARIES before merging. Its `us_45q_policy_qa` and Q&A-specific acceptance language are not the product's success measures.
- **#103 open**, static bilingual 45Q bundles implemented and CI-verified on stacked branch `feature/static-policy-context`, **not deployed from main**. Depends on #102.
- **#104 draft**, versioned source/anchor candidate and dry-run schema proposal CI-verified on stacked branch; **no approved production SQLite migration or published verified clause**. Depends on #103.
- Dependency chain for relevant code: **#102 → #103 → #104**. #101 is a specification branch, not an implementation dependency or permission to expand scope.
- Existing country/subnational facility-policy links provide geographic context; **direct verified project-policy evidence is zero** on the #102 audit baseline. Do not change this through inference.

## Work queue in execution order

| Priority | Deliverable | Concrete actions | Merge / release gate | Explicit stop point |
| --- | --- | --- | --- | --- |
| **P0** | Converge the mainline | Review #102 for source integrity, relation semantics, i18n and deployment; integrate on passing CI. Revise #101 to remove in-repository Q&A goals, point to product contract, and close/rescope conflicts. Retarget #103 onto updated main, run full CI and deploy. Keep #104 draft. | `main`, docs, public manifest and site agree; PR dependence clean; no speculative capabilities in README. | No schema, service or chat UI changes to finish this step. |
| **P1** | Agent-ready **data consumption contract** | Verify/finish #103 bundles and discovery endpoints; validate schema, references, language fallbacks, statuses, timestamps, integrity/hash and negative cases. Document one **external consumer smoke test**, not a Q&A test. | Manifest → schema → bundle → source can be read without private runtime; identical input yields identical bytes; unsupported ID/lang fail explicitly. | Stop when data is consumable; do not grade agent-generated answers. |
| **P2** | Minimal versioned regulation evidence | With #104 as candidate, freeze and review **one** official 45Q document version and **one** clause locator; report historical/current coverage limits. Verify tampering or extractor changes invalidate dependent anchors. Decide whether Git-hashed files plus existing structured metadata suffice **before** changing SQLite schema. | Primary source version + review + locator resolve; stale/altered evidence is rejected. Schema changes require separate justification and explicit approval. | No auto eligibility, condition engine, full statute coverage, bulk card generation or redundant fulltext storage. |
| **P3** | Small cross-jurisdiction reuse | Add **2–3** high-value policy instruments from different legal designs through the **same** source/review/projection contract; preserve the existing human comparison pages. | No duplicate source of truth or jurisdiction-specific bypasses; citations/versions/caveats survive export; comparison methodology unchanged. | No universal legal knowledge graph, bulk ingestion or all-jurisdiction exhaustiveness. |
| **P4** | Maintainability and research UX | Prioritize high-use policy-source fixes, selected facility records, missing reviewed Chinese analysis, source-change signals, publish-version consistency, small navigation/performance fixes. | Evidence-driven editorial queue, deterministic CI, deployed output checks, no regressions to human site or ESG30 reading. | No redesign, new CMS, additional analytics platform or blanket data enrichment without demonstrated value. |

### Existing maintenance work (not a competing product roadmap)

- **Content depth**: #102 reports prior 41 verified policies below the content threshold reduced to zero; confirm that result after merge. No mechanical demand for every policy to be at identical depth.
- **Chinese analysis**: #102 reports 609 of 649 analytical dimensions still need reviewed Chinese versions; prioritize actual high-use content, explicitly expose original language in the interim.
- **Facility curation**: #102 reports an active facility curation queue of 65 records; work by verified importance and source value, not artificial 100% news coverage.
- **Relationship governance**: #102 distinguishes 4,287 `country` and 509 `subnational_region` contextual matches; the directly evidenced relation count remains 0.
- **Report publishing**: preserve verified upstream ESG30 HTML/PDF sync and structural parity. An independent research report is not the Agent-ready implementation plan.
- **CI**: retain full data audit for changed authority layers; avoid mutable validation runs and duplicated all-project checks for doc/CSS-only PRs.

## Mandatory acceptance checklist for data-feature PRs

- [ ] Authority owner stated (official source / SQLite accepted record / derived projection).
- [ ] Consumer field semantics, schema, supported values and `unknown` handling are explicit.
- [ ] Source URL, source version/review dates and evidence level are traceable; published direct evidence is not inferred from geography.
- [ ] Generated JSON/Markdown/site content stays in agreement with SQLite and external evidence snapshots.
- [ ] Same inputs produce deterministic bytes; tampered/stale source versions fail closed for *verified evidence*.
- [ ] Chinese/English missing translations are labeled, not fabricated.
- [ ] CLI/public consumer positive and negative tests, CI result and deployment boundary are recorded.
- [ ] No new runtime service, storage authority, redundant abstraction or answer-generation feature is added without an observed need.

## Release rule

A PR is **implemented on a branch**, **merged on main**, and **published on GitHub Pages** at three different checkpoints. Report each state separately. A green CI on a stacked feature branch does **not** imply public availability. The project's single product scope is in PRODUCT_BOUNDARIES; this file alone tracks work status and order.

# Roadmap

Single aggregation point for current work. SQLite is the structured authority;
this document records delivery scope and remaining editorial work.

Last updated: 2026-10-28

## Current delivery — awaiting review

- Relationship trust: country, subnational, sector and direct-evidence matches
  are counted separately. The 509 subnational matches no longer inflate the
  direct-evidence count. No confidence values or scoring formulas changed.
  A typed `relationships.json` endpoint, schema and bilingual detail labels
  preserve the distinction alongside the legacy linked-ID arrays.
- Policy depth: 130 records now meet the existing content-depth threshold;
  verified records below threshold fell from 41 to 0. Bilingual scope,
  lifecycle information and source-specific corrections were added. This is
  an editorial completeness result, not universal legal re-verification.
- Source corrections: Italy's small-project exception is not a blanket EIA
  exemption; Denmark's three funds have separate terms; Saskatchewan credit
  reporting is distinct from storage approvals. Romania, Croatia and Vietnam
  now cite specific sources. The supposed Chinese 2024 environmental update
  is corrected to the verifiable 2016 trial guideline; IMO OCCS is described
  as regulatory work in progress rather than enacted automatic crediting.
- Analysis localization: source-bound Chinese versions for 40 of 649 existing
  dimensions across eight reviewed policies. Canonical scores are unchanged.
  Changed source sentences invalidate translations; missing Chinese versions
  display an explicit English fallback, expandable by touch or keyboard.
- Facility sources: curated coverage increased from 339 to 345 facilities,
  using the dated supplementary research input. Adding sources did not change
  facility status, capacity, coordinates or operational dates.
- Maintenance: a read-only queue records drafts, stale reviews, specific-source
  gaps, missing analysis and translation work. A weekly advisory workflow
  samples rotating source URLs and retains review reports; a fetch never
  marks a policy verified or refreshes its factual review date.
- Performance: `facilities.json` preserves every field and all 1,110 records,
  while compact serialization reduces the payload from 2,707,559 to 2,072,451
  bytes (23.5%). The existing compact map payload remains in use. Detail-page
  copy now lives in a shared bilingual catalogue. Home-only editorial rules
  are no longer loaded on every route; shared dark tokens remain global.
  Tablet navigation switches to the mobile menu below 1024 px, preventing
  overflow of the English navigation. Capacity charts initialize once per live
  canvas so duplicate page-load events cannot leave stale filter listeners.
  Decorative hero backgrounds no longer create horizontal page scrolling.

## Remaining editorial work

| Priority | Item                                                | Evidence / next action                                                                                                                                                                                    |
| -------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | Six composite draft policies                        | `scripts/data/policy-reviews-2026-10.json` records a primary source and review disposition for each. Reconcile law/implementation/project claims before graduating a draft.                               |
| 1        | Chinese analysis completion                         | 609 of 649 existing dimensions still need reviewed Chinese versions. The quality dashboard exposes this separately from bilingual record parity.                                                          |
| 2        | Factual currency                                    | Run `pnpm manage:review:queue`; intervals of 90 days for policies and 180 days for facilities are reminders, not legal-validity tests. Do not advance the whole-dataset check date after a partial batch. |
| 2        | Remaining facility curation                         | Prioritize the 65 operational/under-construction records without curated sources, then extend planned-project coverage.                                                                                   |
| 2        | Lifecycle/source depth beyond the scoring threshold | Meeting the threshold does not fill every missing milestone or establish current legal applicability. Use explicit sources; never add milestones merely to raise a score.                                 |
| 3        | Canonical analytical review                         | Source corrections preserve existing numerical scores. Any rescoring requires its own methodology review and comparison. `uk-ccs-network-code` currently has four canonical dimensions.                   |
| 3        | Wider i18n consolidation                            | Detail catalogues and relationship labels are centralized; page-specific and governance catalogues still exist. Migrate shared strings when their consumers change.                                       |

## Validation and handoff

Use `agent/ccus-ai-agent/RUNBOOK.md` for commands. The policy review importer
is dry-run by default, applies a transaction, locks writes and keeps an external
backup. Generated publication data is not committed. Human review and passing
required CI remain prerequisites for merging this delivery.

## Done (2026-09 sessions, for context)

- Content schema tightened to `z.enum(POLICY_CATEGORIES/POLICY_STATUSES)` on
  the en collection after the governed taxonomy normalization migration;
  `categoryMap` compatibility patch removed and a taxonomy guard test added
  ([#69](https://github.com/liuh886/ccus-policy-hub/issues/69))
- Facility–policy relationship model Phase 2 executed:
  `link_type`/`confidence`/`evidence`/`source_url`/`review_status`/timestamps
  added to `policy_facility_links` and all 6,938 links backfilled country/0.3;
  `schema.sql` aligned with the live schema
- Policy content depth remediated: critical 103 → 0, median 44 → 100 across the
  Phase 1A–3K batches; residual editorial tail tracked separately
- Compare governance–deployment quadrant split moved from the median to the
  75th percentile (`BENCHMARK_QUANTILE`), so "integrated leaders" reflects the
  top band instead of a crowded mid-point; timeline groups restyled with a
  colour rail (#97)
- Compare heatmap header no longer pinned mid-table: the sticky `thead` rule
  is scoped to the regulatory detail table (#90)
- PR #80 closed as superseded — its contributor-toggle and facility-filter
  fixes were already on `main`
- Facility profiles: added `facility_news`, a deduplicated, tier-classified
  external source list (official → press_release → media → reference), seeded
  from the existing IEA links and rendered as a formal "Press Releases &
  Coverage" section (Phase A–C)
- Facility news titles/dates fetched for ~1,100 of ~1,840 distinct source URLs
  (anti-bot/paywall/spam titles rejected → publisher fallback), plus a
  `facility_news` coverage block in the quality metrics (Phase D, partial)
- Curated research ingest (`scripts/data/facility-news-research.json` +
  `manage:db:import:facility-news-research`); all 17 operational ≥1 Mtpa
  facilities enriched (51 curated items) (Phase D)
- Facility-news link-rot checker (`manage:db:audit:facility-news-links`,
  read-only report) (Phase D)
- Curated coverage extended to 35 facilities / 122 items: all 17 operational
  ≥1 Mtpa + the top 18 under-construction ≥2 Mtpa (Phase E)
- Pruned 524 rows for 150 confirmed-dead links
  (`manage:db:prune:facility-news-dead-links`) (Phase E)
- Curated coverage extended to 73 facilities / 271 items: added the remaining
  under-construction ≥1 Mtpa and planned ≥10 Mtpa projects (Phase E)
- Curated coverage extended to 101 facilities / 381 items: added planned
  ≥5.4 Mtpa projects (Phase E)
- Curated coverage extended to 117 facilities / 441 items: added planned
  ≥4 Mtpa projects (Phase E)
- Curated coverage extended to 139 facilities / 527 items: added planned
  ≥3 Mtpa projects (Phase E)
- Curated coverage extended to 158 facilities / 601 items: added planned
  ≥2.5 Mtpa projects (Phase E)
- Curated coverage extended to 196 facilities / 751 items: added planned
  ≥2 Mtpa projects (Phase E)
- Curated coverage extended to 234 facilities / 896 items: added planned
  ≥1.5 Mtpa projects (Phase E)
- Curated coverage extended to 251 facilities / 960 items: added planned
  ≥1.3 Mtpa projects (Phase E)
- Curated coverage extended to 262 facilities / 1002 items: added planned
  ≥1.1 Mtpa projects (Phase E)
- Curated coverage extended to 301 facilities / 1154 items: added planned
  ≥1 Mtpa projects (Phase E)
- Curated coverage extended to 339 facilities: the earlier ≥0.5 Mtpa batch left
  16 operational/under-construction facilities uncurated (e.g. Gorgon, Century,
  Petrobras Santos, Trailblazer); these were added. On a URL collision the
  curated tier/title/date now **upgrade the seeded row in place** instead of
  being dropped — 118 rows upgraded, 48 tier corrections (Phase E)
- Facility-news link health runs on a monthly schedule
  (`.github/workflows/facility-news-link-check.yml`, advisory artifact);
  facility-news titles are now included in site search
- CI projection diff gate closed (quality metrics + public data), deterministic
  `data_as_of` timestamps, volatile audit fields removed from generated output
- zh/en page consolidation (8 pairs), Base-path literals eliminated (guard test),
  shared helpers (`db-write`, `sqlite-query`, `i18n-translate`)
- `manage.mjs` split from a ~1,233-line monolith into a thin router plus
  `logic/commands/*` modules (`db.mjs` access layer), with direct tests for the
  heart paths `dbExportMd`, `dbImportMdReverse`, and `dbAuditDeep` (2026-09)
- Home world map driven from the policies collection; every bubble links to a
  real, current policy detail page
- IEA worktree: audited and rejected (0 unique value, 912 precision
  regressions); 2026 workbook replaced by provenance manifest + SHA256 gate
- DB snapshot archaeology removed; 2026-07 migrations archived with manifest

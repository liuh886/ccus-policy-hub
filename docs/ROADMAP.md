# Roadmap

Single aggregation point for open work items. Sources of truth for details:
the linked audit reports and issues. Keep each item's status current.

Last updated: 2026-09-23

## In review / blocked on governance approval

None. Every item previously listed here has landed (see Done): content schema
tightening ([#69](https://github.com/liuh886/ccus-policy-hub/issues/69)), the
facility–policy relationship model Phase 2, and the bulk of the policy
content-depth remediation.

## Editorial backlog

| Item                        | Detail                                                                                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Policy content depth (tail) | `docs/policy-content-depth-report.md` — 41 of 129 verified policies still below bar (3 high, 38 medium; median 100/100, critical 0). Editorial scheduling only; no schema or approval gate. |

## Engineering backlog

| Item                                  | Detail                                                                                                                                                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Facility news — Phase E (remaining)   | Extend curated coverage beyond the 323 facilities already enriched (operational + under-construction ≥0.5 Mtpa, plus planned ≥1 Mtpa) toward the remaining operational/under-construction set. See `agent/ccus-ai-agent/METHODOLOGY.md` §9 |
| Split `manage.mjs`                    | 1,233-line module into `commands/` modules; add direct tests for `dbExportMd`, `dbImportMdReverse`, `dbAuditDeep` (shared helpers already extracted to `scripts/lib/`)                                                                     |
| Consolidate i18n copy                 | Three parallel systems: `src/i18n/ui.ts` (~30 keys), ~48 inline `isEn ? :` ternaries, per-component copy objects (`governanceComparisonCopy.mjs` etc.)                                                                                     |
| Analyze block localization            | Policy five-dimension `analysis` blocks are the same English source in both locales; 32 of 130 en policy files also contain Chinese fragments. Add a zh-translation-rate metric to quality output                                          |
| Remaining zh/en page pairs            | Only decorative/standalone pages remain unmerged (`index` hero, `about`, thin shells elsewhere are done)                                                                                                                                   |
| Facilitate `facilities.json` slimming | 2.8 MB public payload; consider field pruning or per-country lazy loading for the map                                                                                                                                                      |
| Performance polish                    | `light-editorial-capacity.css` loaded site-wide but only used on home (Inter font weights resolved via variable axis)                                                                                                                      |

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
- Curated coverage extended to 323 facilities / 1241 items: added operational
  and under-construction ≥0.5 Mtpa projects (Phase E)
- CI projection diff gate closed (quality metrics + public data), deterministic
  `data_as_of` timestamps, volatile audit fields removed from generated output
- zh/en page consolidation (8 pairs), Base-path literals eliminated (guard test),
  shared helpers (`db-write`, `sqlite-query`, `i18n-translate`)
- Home world map driven from the policies collection; every bubble links to a
  real, current policy detail page
- IEA worktree: audited and rejected (0 unique value, 912 precision
  regressions); 2026 workbook replaced by provenance manifest + SHA256 gate
- DB snapshot archaeology removed; 2026-07 migrations archived with manifest

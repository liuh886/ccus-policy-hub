# Roadmap

Single aggregation point for open work items. Sources of truth for details:
the linked audit reports and issues. Keep each item's status current.

Last updated: 2026-09-08

## In review / blocked on governance approval

| Item                                       | Detail                                                                                                                                                                              | Blocked on           |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Content schema tightening (`z.enum`)       | [#69](https://github.com/liuh886/ccus-policy-hub/issues/69) — 13 raw `category` / 13 raw `status` values need a governed normalization mapping before `config.ts` can enforce enums | Mapping approval     |
| Facility–policy relationship model Phase 2 | `docs/facility-policy-relationship-model.md` — `link_type`/`confidence` schema migration; 6,938 links are 100% country-level (`high_risk_warning`)                                  | Semantics approval   |
| Policy content depth remediation           | `docs/policy-content-depth-report.md` — 103/130 policies below bar, median 44/100                                                                                                   | Editorial scheduling |

## Engineering backlog

| Item                                  | Detail                                                                                                                                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Split `manage.mjs`                    | 1,233-line module into `commands/` modules; add direct tests for `dbExportMd`, `dbImportMdReverse`, `dbAuditDeep` (shared helpers already extracted to `scripts/lib/`)                            |
| Consolidate i18n copy                 | Three parallel systems: `src/i18n/ui.ts` (~30 keys), ~48 inline `isEn ? :` ternaries, per-component copy objects (`governanceComparisonCopy.mjs` etc.)                                            |
| Analyze block localization            | Policy five-dimension `analysis` blocks are the same English source in both locales; 32 of 130 en policy files also contain Chinese fragments. Add a zh-translation-rate metric to quality output |
| Remaining zh/en page pairs            | Only decorative/standalone pages remain unmerged (`index` hero, `about`, thin shells elsewhere are done)                                                                                          |
| Facilitate `facilities.json` slimming | 2.8 MB public payload; consider field pruning or per-country lazy loading for the map                                                                                                             |
| Performance polish                    | Google Fonts: 7 weights → 3 + CJK fallback stack; `light-editorial-capacity.css` loaded site-wide but only used on home                                                                           |

## Done (2026-09 sessions, for context)

- CI projection diff gate closed (quality metrics + public data), deterministic
  `data_as_of` timestamps, volatile audit fields removed from generated output
- zh/en page consolidation (8 pairs), Base-path literals eliminated (guard test),
  shared helpers (`db-write`, `sqlite-query`, `i18n-translate`)
- Home world map driven from the policies collection; every bubble links to a
  real, current policy detail page
- IEA worktree: audited and rejected (0 unique value, 912 precision
  regressions); 2026 workbook replaced by provenance manifest + SHA256 gate
- DB snapshot archaeology removed; 2026-07 migrations archived with manifest

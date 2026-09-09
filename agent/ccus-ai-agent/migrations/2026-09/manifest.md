# manifest — migrations/2026-09

## content-depth-batch3c-2026-09.mjs

- purpose and date: data-quality special Phase 3C — enrich the four China
  records (scores 45/26/33/26); 2026-09-09.
- rows affected: 4 policies × 2 locales + 20 analysis rows. No status
  changes (all stay Active).
- integrity fixes: cn-ccer core claim corrected — no CCUS methodology
  published (first batch and 2025 adds enumerated, CCUS in suggestion
  pool); unsourced 948 figure replaced with MEE-verified 1776/921
  numbers; AI-marked dimensions rewritten.
- post-migration audits and exports: `pnpm gen`, deep audit, consistency
  (0 mismatches), content-depth (4 × 100; critical 46 → 43, healthy
  41 → 45, median 69 → 70), coverage unchanged (missing stays 0).
- approval status: blanket execution approval for the five-task programme.

## content-depth-batch3b-2026-09.mjs

- purpose and date: data-quality special Phase 3B — enrich the four
  Denmark/Netherlands/Norway/Germany records (scores 25/25/43/27);
  2026-09-09.
- rows affected: 4 policies × 2 locales + 20 analysis rows. Status change:
  de-icm-strategy Upcoming → Active (May 2024 cabinet adoption is a fact).
  Title correction: no-14th round renamed to EXL014 round (eighth award
  process, not fourteenth).
- integrity fixes: Danish CCS Fund stated as tender-stage (awards due
  April 2026, state-aid pending), not approved-and-disbursing; no-14th
  pore-space field aligned; six dimensions normalised to five.
- post-migration audits and exports: `pnpm gen`, deep audit, consistency
  (0 mismatches), content-depth (4 × 100; critical 50 → 46, healthy
  37 → 41, median 67 → 69), coverage unchanged (missing stays 0).
- approval status: blanket execution approval for the five-task programme.

## content-depth-batch3a-2026-09.mjs

- purpose and date: data-quality special Phase 3A — enrich the five US
  records (scores 42/23/26/46/70); 2026-09-09.
- rows affected: 5 policies × 2 locales + 25 analysis rows. No status
  changes (all stay Active).
- integrity fixes: LCFS placeholder evidence in all five dimensions
  rewritten from CARB regulation text; OBBBA unsourced primacy claims
  rewritten and six dimensions normalised to five; Wyoming HB0209 repeal
  recorded as failed in Senate committee (March 2025), not enacted.
- post-migration audits and exports: `pnpm gen`, deep audit, consistency
  (0 mismatches), content-depth (5 × 100; critical 54 → 50, healthy
  32 → 37, median holds 67), coverage unchanged (missing stays 0).
- approval status: blanket execution approval for the five-task programme.

## coverage-phase2a-2026-09.mjs

- purpose and date: data-quality special Phase 2A — close the two
  high-priority missing China cells with two new draft records plus curated
  framework updates; 2026-09-09.
- verification first: confirmed no dedicated national CCS permitting or
  liability law (new Mineral Resources Law governs minerals, not storage)
  and no dedicated CO2 transport/access/tariff framework — cells move to
  partial (components documented), not covered.
- rows affected: 2 INSERTs (policies/policy_i18n/policy_analysis),
  `cn-ccus-national-standards-2026` (12 GB/T standards, Jan 8 2026,
  effective Jul 1 2026) and `cn-co2-transport-status-2025` (Qilu-Shengli
  109 km line of Jul 11 2023, GB/T 46875, funded long-distance demo).
  129 → 131 policies. Framework: storage/transport missing → partial,
  legal/mrv partial gain standards evidence, as_of → 2026-09-09.
- debug note: a missing `title` key in one locale produced sql.js
  "tried to bind undefined"; batch tests now assert non-empty titles.
- post-migration audits and exports: `pnpm gen`, deep audit, consistency
  (0 mismatches), content-depth (2 × 100; healthy 30 → 32, median holds
  67), coverage (high-priority missing 2 → 0, missing 4 → 2).
- approval status: approved 2026-09-09 (2A research outline + new records +
  cell moves).

## policy-content-depth-batch2-1c-2026-09.mjs

- purpose and date: data-quality special Phase 1C — enrich the
  Norway/Germany/Korea/France flagship records (scores 40/30/37/44) and merge
  the duplicated Longship records; 2026-09-09.
- rows affected: 4 policies × 2 locales + 20 analysis rows, plus deletion of
  `no-longship-operational-2025` (policies/policy_i18n/policy_analysis and
  its 54 policy_facility_links rows, verified identical to the kept record
  pre-delete; facilities untouched, 129 policies after).
- integrity fixes: `[AI-Generated]` evidence replaced in the
  norway-longship and kr-ccus-act dimensions; France/Norway 2024 partnership
  sharpened (strategic partnership January 2024, export agreement July
  2025); German KSpTG November 2025 enactment recorded.
- follow-up fixed in this batch: merge made idempotent (skip once merged);
  policy-taxonomy test counts derived from bilingual parity instead of a
  hardcoded 130.
- post-migration audits and exports: `pnpm gen`, deep audit, consistency
  (0 mismatches), content-depth (4 × 100; critical 59 → 54, median 65 → 67),
  coverage unchanged.
- approval status: approved 2026-09-09 (1C research outline + merge scheme).

## policy-content-depth-batch2-1b-2026-09.mjs

- purpose and date: data-quality special Phase 1B — enrich the four
  Australia/Canada flagship records (scores 29/27/23/58); 2026-09-09.
- rows affected: 4 policies × 2 locales + 20 analysis rows. No status
  changes (all stay Active).
- integrity fixes: `[AI-Generated]` evidence replaced in all ten
  safeguard/ITC dimensions; alberta-tier $170/t-by-2030 claim corrected to
  the May 12, 2025 C$95/t freeze plus December 2025 amendments, six analysis
  dimensions normalised to five; offshore "2023 regulations" sharpened to
  the exact instruments (Environment 2023, Safety 2024, Resource Management 2025) with first five analysis dimensions; ITC EOR exclusion verified
  against Income Tax Act s.127.44 and kept.
- post-migration audits and exports: `pnpm gen`, deep audit, consistency
  (0 mismatches), content-depth (4 × 100; critical 63 → 59, median 59 → 65),
  coverage unchanged.
- approval status: approved 2026-09-09 (1B research outline + sources).

## policy-content-depth-batch2-1a-2026-09.mjs

- purpose and date: data-quality special Phase 1A — enrich the four US/UK
  flagship records (scores 25/27/43/70) with primary-source bilingual content;
  2026-09-09.
- source and target: `policies` core (status/category/legal_weight/
  provenance) + `policy_i18n` (description/scope/tags/impact/evolution, both
  langs) + `policy_analysis` (5 dimensions replaced) for
  `us-doe-carbon-management-strategy`, `uk-ccus-vision`,
  `uk-ccs-network-code`, `us-epa-class-vi-primacy`.
- rows affected: 4 policies × 2 locales + 20 analysis rows. Status change:
  `uk-ccs-network-code` Planned → Active with `legal_weight` Proposed
  Market Rule → Market Rule (January 2025 Code operative, approved 1A).
- integrity fixes: `uk-ccus-vision` `[AI-Generated]` evidence replaced in all
  five dimensions; `us-epa-class-vi-primacy` unsourced claims (permit counts,
  moratorium) removed; Louisiana date verified (FR final rule effective
  2024-02-05); Arizona (2025-09-10), Texas (effective 2025-12-15) and
  Colorado (proposed 2026-03-16) milestones added.
- idempotency: UPDATEs + DELETE/INSERT analysis + marker; re-run converges.
- dry-run: `.test.mjs` (in-memory real-db copy, real scorer ≥ 70 per target).
- backup and rollback: pre-migration DB copy; content-only (no schema).
- post-migration audits and exports: `pnpm gen`, deep audit, consistency
  (0 mismatches), content-depth (4 × 100; critical 66 → 63, median 46 → 59),
  coverage unchanged (high-priority missing still 2 — Phase 2 work).
- approval status: approved 2026-09-09 (1A research outline + sources).

## normalize-policy-taxonomy-2026-09.mjs

- purpose and date: normalize policy `category`/`status` to the canonical
  `POLICY_CATEGORIES` / `POLICY_STATUSES` enums (issue #69); 2026-09-08.
- source and target: `policies.category`/`policies.status` (9 raw values each)
  → 6 canonical categories / 5 canonical statuses; mapping approved in
  `docs/issue-69-normalization-draft.md` (approved 2026-09-08).
- input files: `agent/ccus-ai-agent/db/ccus_master.sqlite` only.
- rows affected: 15 policies (6 法律监管→Regulatory, 3 Methodology→Technical
  Standard, 2 Statutory→Regulatory Framework, 1 Tax Incentives→Incentive,
  6 现行→Active, 1 Proposed→Upcoming, 1 Policy principles adopted→Upcoming,
  1 Draft for public comment→Under development, 1 Awarded→Active).
  Changed rows stamped `provenance_reviewer='Taxonomy normalization (#69)'`,
  `provenance_last_audit_date='2026-09-08'`; `db_meta` records the run.
- idempotency: value-based UPDATEs; re-run changes zero rows (tested).
- dry-run: run `applyTaxonomyNormalizationMigration` against a scratch copy
  of the DB, or run the `.test.mjs` (in-memory fixture covers all raw values).
- backup and rollback: pre-migration DB copy restores via `atomicWriteDb`
  reverse; per-row prior values listed in the draft doc table.
- post-migration audits and exports: `db:export:md`, `db:export:i18n`,
  `manage:db:audit:deep`, `manage:db:audit:policy-consistency`, full gates.
- approval status: approved 2026-09-08 (Q1 Upcoming, Q2 Active).

## relationship-link-types-2026-09.mjs

- purpose and date: relationship model Phase 2
  (docs/facility-policy-relationship-model.md); add link_type / confidence /
  evidence / source_url / review_status / created_at / updated_at to
  policy_facility_links and backfill 6,938 rows as country/0.3; 2026-09-08.
- source and target: policy_facility_links (policy_id, facility_id) →
  - 7 columns; existing rows backfilled country-level.
- input files: `agent/ccus-ai-agent/db/ccus_master.sqlite` only.
- rows affected: 6,938 links backfilled (link_type='country', confidence=0.3,
  review_status='draft', created_at/updated_at stamped once — approved
  wall-clock exemption, SSOT provenance not generated artifacts).
- idempotency: columns added only if missing; only NULL-created_at rows
  backfilled; re-run changes zero rows (tested). Writers (fix-relationships,
  reverse-sync) keep 2-column INSERTs and inherit the column defaults.
- dry-run: `.test.mjs` (legacy 2-column fixture) or scratch-copy run.
- backup and rollback: pre-migration DB copy restores everything; columns are
  independently droppable (DROP COLUMN) if ever needed — backfill is
  metadata-only, source links untouched.
- post-migration audits and exports: quality metrics regenerated (grouped
  counts identical: 6938/0/0), deep audit, consistency, full gates.
- approval status: approved 2026-09-08 (T4/Q3).

## Execution record

All three migrations executed 2026-09-08/09 against
`agent/ccus-ai-agent/db/ccus_master.sqlite`, committed as `078b6608` and
pushed to `origin/main`. Code retired to `_archive/2026-09/` per the lifecycle
rule in `migrations/README.md`; this manifest stays as the record.

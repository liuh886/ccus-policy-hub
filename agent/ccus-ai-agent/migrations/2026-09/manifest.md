# manifest — migrations/2026-09

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

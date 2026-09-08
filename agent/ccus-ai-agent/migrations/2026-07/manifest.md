# Manifest — 2026-07 governed data migrations

Status: **APPLIED and ARCHIVED.** All five migrations have been executed
against `agent/ccus-ai-agent/db/ccus_master.sqlite` and their outputs
(markdown exports, public data, audit reports) are part of the repository.
They are kept here for provenance and rollback reference only — do **not**
re-run them (they are idempotent, but re-running is a governed operation that
requires explicit human approval per `AGENTS.md` section 6).

Common properties (all five):

- Source schema/data version: post-`1d50fc8e` checkpoint (2026-07 baseline)
- Target: same schema, enriched data rows
- Idempotency: transaction-wrapped with a `migration:<id>` marker in
  `db_meta`; re-runs short-circuit after checking baseline counts
- Backup/rollback: the marker commit prior to execution is the rollback
  point; each migration validates baseline counts before writing
- Required post-migration audits: `pnpm manage:db:audit:deep`,
  `pnpm manage:db:audit:policy-consistency` (with `git diff --exit-code`
  projection check), `pnpm manage:db:audit:policy-coverage`
- Approval: applied and reviewed on main via the 2026-07 governance batch
  (commits `be19198f`, `ab9e69ad`, `e46ab0d5`, `bddef714`, `c682f69d`)

| Migration                                         | Purpose                                                                                                                                      | Tables/rows affected                         |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `migrate-policy-lifecycle-2026-07.mjs`            | Consolidate duplicate policy families (JP CCS Business Act notices, MyCCUS Act 870, EU CCS Directive family), repair primary-source metadata | `policies`, `policy_i18n`, lifecycle fields  |
| `migrate-policy-source-metadata-2026-07.mjs`      | Complete official source metadata (publisher, URL, legal weight) for all 130 policies                                                        | `policies`, `policy_i18n`                    |
| `migrate-official-policy-gaps-2026-07.mjs`        | Add verified Brazil, EU and China policy gap records                                                                                         | `policies`, `policy_i18n`, `policy_analysis` |
| `migrate-high-priority-policy-gaps-2026-07.mjs`   | Close high-priority coverage-matrix cells (China storage approval, transport market access, etc.)                                            | `policies`, `policy_i18n`, `policy_analysis` |
| `migrate-policy-content-depth-batch1-2026-07.mjs` | First content-depth remediation batch (deepened analysis blocks for the lowest-scoring policies)                                             | `policy_analysis`, `policy_i18n`             |

Dry-run / comparison: none of the migrations shipped a separate dry-run
mode; each validates expected baseline counts before writing and rolls back
on any assertion failure.

# AGENT OPERATING RULES (SSOT v6.0)

To maintain system integrity, all agents MUST follow these rules when interacting with this repository.

## 1. SQLite Sovereignty
- `governance/db/ccus_master.sqlite` is the SINGLE Source of Truth.
- `src/content/policies/{en,zh}` and `src/content/facilities/{en,zh}` are GENERATED/PUBLISHED artifacts.
- Facilities workflow is **one-way** by default: `SQLite -> Markdown`.
- `Markdown -> SQLite` reverse sync is **migration-only** and requires explicit acknowledgement.
- NEVER rely on `src/data/*_database.json` as the active import source.

## 2. Production Line Order
You MUST run the pipeline in this order:
1. `pnpm manage db:init` (if schema changed)
2. Run explicit SQLite-native ingest/update steps (no legacy JSON import)
3. `pnpm manage db:standardize` (always after ingest/update)
4. `pnpm manage db:fix-relationships`
5. `pnpm manage db:audit:deep` (REQUIRED before export)
6. `pnpm manage db:audit:facilities-parity` (RECOMMENDED before facilities cutover/export)
7. `pnpm manage db:export:i18n`
8. `pnpm manage db:export:md`

Migration-only exception:
- `pnpm manage:db:import:md:migration` may be used for one-time backfill/emergency recovery only.
- Daily use of `db:import:md` is prohibited.

Preferred reusable command:
- `pnpm manage:db:pipeline` (serial, includes audit gate and exports)
- `pnpm manage:db:pipeline --with-imports` is retired.

## 3. Mandatory Safety Gates
- **Locking**: The manage script automatically locks the DB. Do not bypass.
- **Audit Gate**: Exports will fail if `db:audit:deep` has not passed.
- **FK Constraints**: SQLite foreign keys are enforced. Ensure parents exist before children.

## 4. Backups
- Before major destructive operations, run `git commit` or manual file copy of the `.sqlite` file.

## 4.1 Governance File Hygiene
- Keep `governance/` root limited to core files only (see `governance/README.md`).
- Run `pnpm manage:db:lint-governance` before claiming governance work is complete.

## 5. UI/UX Integrity (User-Enforced)
- **Design Freeze**: The current frontend interface (as of Feb 10, 2026) is finalized and considered complete.
- **Refactor Prohibition**: Large-scale refactoring of the frontend codebase, CSS restyling, or component re-architecture is STRICTLY PROHIBITED without explicit user permission.
- **Modification Rule**: Substantial UI/UX modifications (layout changes, major theme shifts, component overhauls) MUST be proposed and APPROVED by the user before execution.
- **Debugging**: Fine-grained bug fixes and data-binding repairs are permitted without prior approval, provided they do not alter the established visual aesthetic.

# AGENT OPERATING RULES (SSOT v6.0)

To maintain system integrity, all agents MUST follow these rules when interacting with this repository.

## 1. SQLite Sovereignty
- `governance/db/ccus_master.sqlite` is the SINGLE Source of Truth.
- All JSON/Markdown files in `src/data/` and `src/content/` are GENERATED artifacts.
- NEVER edit generated artifacts manually. Changes will be overwritten.

## 2. Production Line Order
You MUST run the pipeline in this order:
1. `pnpm manage db:init` (if schema changed)
2. `pnpm manage db:import:i18n` / `pnpm manage db:import:legacy` (if bulk importing)
3. `pnpm manage db:standardize` (always after import)
4. `pnpm manage db:fix-relationships`
5. `pnpm manage db:audit:deep` (REQUIRED before export)
6. `pnpm manage db:export:i18n`
7. `pnpm manage db:export:md`

Preferred reusable command:
- `pnpm manage:db:pipeline` (serial, includes audit gate and exports)

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

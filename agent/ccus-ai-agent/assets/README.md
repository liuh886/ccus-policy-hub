# Agent assets

This directory is intentionally NOT tracked in git (see `.gitignore`):
third-party source workbooks may carry licence terms that do not permit
redistribution, so they must be fetched by the maintainer running the
import, never vendored into the open-source repository.

## IEA CCUS Projects Database

- Official download page:
  https://www.iea.org/data-and-statistics/data-tools/ccus-projects-database
- Expected file: `IEA CCUS Projects Database 2026.xlsx`
- Integrity and sheet details: see `manifest.json` (tracked)

Before running `pnpm manage:db:import:iea:facilities`, place the workbook
here and confirm its SHA256 matches `manifest.json`. The ingestion script
verifies the hash automatically and refuses to run on mismatch.

## Legacy workbook

- `IEA CCUS Projects Database 2025.xlsx` is intentionally untracked. It is
  only the default input of the unwired legacy command
  `db:import:iea:links` (no package.json entry); keep a local copy only if
  you still run that path.

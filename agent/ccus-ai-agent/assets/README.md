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

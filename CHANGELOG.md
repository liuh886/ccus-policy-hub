# Changelog

## v1.1.0 - 2026-09-08

Maintenance CLI split + governance supplements. No public data or API change.

### Changed

- Split `agent/ccus-ai-agent/logic/manage.mjs` (1,233 lines) into `logic/db.mjs`
  (SQLite access + `db:peek` identifier allowlist) and 7 `logic/commands/` modules
  (import/export/standardize/geocode/seed/audit/maintenance); `manage.mjs` is now a
  ~140-line router. Local `translate` replaced by shared `createTranslator`.
- Reverse sync (`dbImportMdReverse`) now upserts parent rows instead of
  delete-and-reinsert, closing a cascade wipe of bilingual child data.
- Report-only wall-clock timestamps renamed `data_as_of` -> `run_at`
  (`export-md-clean-sync`, IEA ingest reports); governed artifacts stay deterministic.
- Legacy 2025 IEA workbook untracked (local copy kept, documented in
  `agent/ccus-ai-agent/assets/README.md`).
- README (en/zh) documents the `/api/policies.json` + `/api/policies.csv` endpoints.
- Note: `tsconfig.json` still excludes `scripts/`; verified harmless because the only
  8 `.ts` files in the repo live under `src/` and are covered by `include: ["**/*"]`
  (checked via `astro check`, 146 files clean).

### Validation

- `pnpm test` 118/118 (10 new: export/import-reverse/audit heart paths + peek allowlist)
- `astro check` 0/0/0, `eslint` clean, `pnpm build` green
- `manage:db:audit:deep` PASS (97.0% fill rate), `policy-consistency` 0 mismatches,
  post-audit `git diff --exit-code` clean

## v1.0.0 - 2026-07-02

First stable release of **CCUS Policy Hub**.

### Highlights

- Production-ready bilingual Astro site for CCUS policy, facility, and project intelligence.
- Structured CCUS data layer covering policies, country profiles, facilities, relationships, provenance, and quality metrics.
- Data governance and trust layer with deep audit checks, parity validation, generated enums, and automated public data export.
- AI-readable / agent-grounding interface for downstream assistants and external analysis workflows.
- Homepage capacity trend aligned to the project-record methodology:
  - `operation → FID → announcement` year fallback;
  - `Pipeline = Planned + Operational + Under construction`;
  - `Committed = Operational + Under construction`;
  - `Cancelled / Decommissioned / Suspended` excluded;
  - clear caveat that values aggregate cross-value-chain project-record capacity, not net deliverable capture or storage capacity.
- Interactive type filter for homepage capacity trends across Capture, Transport, T&S, Storage, Full chain, and CCU.
- Public data generation, quality metrics export, search indexing, sitemap/RSS support, and CI validation.

### Validation

The release branch is expected to pass the standard CI pipeline:

- Lint
- Tests
- Astro Check
- Deep Audit
- Public data export
- Build

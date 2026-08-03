# CCUS Policy Hub | Maintenance Runbook

Run commands from the repository root with Node.js 20 and pnpm 9.

## 1. Establish current state

Before editing:

- inspect recent merged and open PRs;
- check current CI and deployment status;
- read `public/data/dataset-versions.json` and current quality outputs;
- identify whether the task changes evidence, structured data, methodology, UI, or documentation;
- create a focused branch.

Do not use archived task documents as the current backlog.

## 2. Common commands

```bash
pnpm install --frozen-lockfile
pnpm manage:help
pnpm lint
pnpm test
pnpm astro check
pnpm manage:db:audit:deep
pnpm manage:db:quality:export
pnpm manage:db:data:export
pnpm build
```

## 3. Policy or country-governance update

1. Verify primary sources and capture provenance.
2. Update SQLite through a reviewed, scoped ingestion or maintenance path.
3. Run standardization and relationship/country-profile synchronization when affected.
4. Run the deep audit.
5. Export bilingual Markdown.
6. Generate quality metrics and public JSON.
7. Run tests, Astro check, and production build.
8. Review English/Chinese parity and the relevant policy, country, Compare, and quality pages.

Typical commands:

```bash
pnpm manage:db:standardize
pnpm manage:db:fix-relationships
pnpm manage db:sync:country-profiles
pnpm manage:db:audit:deep
pnpm manage:db:export:md
pnpm manage:db:quality:export
pnpm manage:db:data:export
```

## 4. Facility dataset refresh

The approved full refresh entry is:

```bash
pnpm manage:db:import:iea:facilities -- <path-to-approved-workbook>
```

The default local asset path may not exist in a fresh clone. Verify the workbook version, sheet, licensing/reuse conditions, field mapping, record-count delta, removed/added IDs, capacity changes, region normalization, and coordinate precision before writing.

After import, run parity audit, deep audit, exports, public-data generation, tests, and build. Review headline homepage metrics and facility filters against the updated database.

## 5. Frontend or documentation update

- Change source components, styles, translations, or Markdown directly.
- Do not change metrics by hard-coding values that are derived from the database.
- Keep Chinese and English pages aligned.
- Add focused tests for logic, methodology, copy contracts, or visual structure where practical.
- Validate at desktop, tablet, and mobile breakpoints for meaningful UI changes.

## 6. Generated outputs

Regenerate outputs after structured data changes:

```bash
pnpm manage:db:export:md
pnpm manage:db:quality:export
pnpm manage:db:data:export
pnpm prettier --write public/data/*.json
```

Review diffs for unexpected record churn, deleted bilingual files, changed IDs, or methodology drift.

## 7. High-risk recovery and migration

Markdown-to-SQLite reverse sync and facility recovery are migration-only operations. Read `SAFETY.md`, create a database backup, run a dry run where available, inspect the diff, and obtain explicit approval before writing.

## 8. Pull request checklist

A PR should state:

- task and user-visible outcome;
- authoritative sources and dataset version;
- affected data tables/components/generated outputs;
- methodology changes or confirmation that methodology is unchanged;
- bilingual impact;
- validation commands and CI result;
- risks, rollback path, and any deferred cleanup.

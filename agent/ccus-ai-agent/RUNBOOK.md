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

### Facility news / source list

`facility_news` holds a tiered, deduplicated source list per facility (`official` → `press_release` → `media` → `reference`; see `METHODOLOGY.md` §9). It was seeded from `facility_links` in the 2026-09 migration (`migrations/2026-09/manifest.md`). The export pipeline emits it automatically, so routine refreshes only need `pnpm gen`. Adding new evidence-backed items means inserting `origin='agent-research'` rows with a `verified_at` date and a real URL, then regenerating.

Real page titles/dates are populated by a data-preparation step (never in the build):

```bash
node scripts/enrich-facility-news-metadata.mjs            # fetch titles/dates (resumable)
node scripts/enrich-facility-news-metadata.mjs --sanitize-only   # clear placeholder titles only
```

It performs one capped GET per distinct URL, writes to `governance/reports/facility_news_enrichment_report.json`, and is safe to re-run (only rows still missing a title are fetched). Coverage is reported under `facility_news` in the quality metrics.

Curated, evidence-backed news is added by editing
`scripts/data/facility-news-research.json` (real URL + title + tier per item,
verified against a primary source) and running:

```bash
pnpm manage:db:import:facility-news-research -- --dry-run
pnpm manage:db:import:facility-news-research
```

The ingest is idempotent, mirrors items across en/zh, skips duplicates by
normalized URL, and re-sorts by tier. Never invent a URL or title.

Link health is checked (advisory, read-only) with:

```bash
pnpm manage:db:audit:facility-news-links
```

It writes `governance/reports/facility_news_link_health.{json,md}` and buckets
each URL as ok / dead (404/410) / blocked (anti-bot 401/403/406/418/429) /
timeout / non_html / server_error / error. Only `dead` indicates link rot;
`blocked` and `timeout` are environmental.

Confirmed-dead links are removed from the display layer with:

```bash
pnpm manage:db:prune:facility-news-dead-links -- --dry-run
pnpm manage:db:prune:facility-news-dead-links
```

It reads the latest link-health report and deletes `facility_news` rows whose
normalized URL is bucketed `dead`; `facility_links` (raw IEA source) is left
untouched. Idempotent.

## 5. Frontend or documentation update

- Change source components, styles, translations, or Markdown directly.
- Do not change metrics by hard-coding values that are derived from the database.
- Keep Chinese and English pages aligned.
- Add focused tests for logic, methodology, copy contracts, or visual structure where practical.
- Validate at desktop, tablet, and mobile breakpoints for meaningful UI changes.

## 6. Generated outputs

Regenerate outputs after structured data changes:

```bash
pnpm gen
```

Review diffs for unexpected record churn, deleted bilingual files, changed IDs, or methodology drift.

## 7. High-risk recovery and migration

Markdown-to-SQLite reverse sync and facility recovery are migration-only operations. Read `SAFETY.md`, create a database backup, run a dry run where available, inspect the diff, and obtain explicit approval before writing.

Never `git checkout --` the SQLite file after a migration has run: audits that stamp wall-clock metadata (deep audit) dirty the working-tree database by design, and restoring discards the migration itself along with the stamp. The rule is: restore is for audit-only runs on an unmigrated tree; after any migration, the migrated-plus-stamped database is what gets verified and committed. Idempotent migrations make accidental restores recoverable by re-running, but the restore itself is always the wrong move mid-batch.

## 8. Pull request checklist

A PR should state:

- task and user-visible outcome;
- authoritative sources and dataset version;
- affected data tables/components/generated outputs;
- methodology changes or confirmation that methodology is unchanged;
- bilingual impact;
- validation commands and CI result;
- risks, rollback path, and any deferred cleanup.

## 9. Review queue and source monitoring

```bash
pnpm manage:review:queue -- --as-of 2026-10-28
pnpm manage:review:queue -- --check-sources --limit 25
```

The first command is deterministic for an explicit date and reads SQLite only.
Reports live under `governance/reports/maintenance-review.json`. Policy review
reminders use 90 days; active facility reminders use 180 days. These intervals
are editorial scheduling, not a legal-expiry or quality score rule. The queue
also records the most recent source-review attempt, including reasons a draft
was retained, missing canonical dimensions and stale/missing Chinese versions.

The weekly `maintenance-review.yml` workflow checks a rotating URL sample.
Successful response fingerprints persist through an Actions cache. Changed
bytes mean **review needed**, not confirmed policy amendment (dynamic pages
can change for unrelated reasons). Blocked/time-out responses are unavailable,
not dead; only 404/410 indicate dead links. A failed response preserves the last
successful fingerprint. No job edits SQLite, promotes drafts or pushes changes.

Keep `src/data/dataset_versions.json:last_checked_date` as the whole-dataset
check date. A partial source batch or passing database audit must not advance it.
Facility-news `verified_at` means source curation, not re-verification of status,
capacity or location.

## 10. Source-backed policy review patches

The user-authorized 2026-10 delivery adds `policy_analysis_i18n` for source-bound
Chinese analysis. The additive schema is reflected in `db/schema.sql`; canonical
scores remain in `policy_analysis`. Chinese text falls back explicitly to English
when its stored `source_evidence` differs from the current canonical sentence.
The generator publishes valid translations in `policy-analysis-localizations.json`.

```bash
pnpm manage:policy:review -- --file scripts/data/policy-reviews-2026-10.json
pnpm manage:policy:review -- --file scripts/data/policy-reviews-2026-10.json --write
```

Default execution is a dry run. Inspect the input and summary before `--write`.
The importer locks the database, applies a transaction, allows only named fields,
keeps an external content-addressed backup in the user's `.codex/backups` folder,
and atomically writes the result. It cannot set scores. Only patches explicitly
marked `source_reviewed: true` update factual audit dates. Editorial scope-only
patches and draft source attempts retain existing factual dates and statuses.
Review attempts and evidence sources are retained in `db_meta`.

For replay of this delivery, use these inputs in order: `policy-reviews-2026-10.json`,
`policy-scope-clarifications-2026-10.json`, `policy-tail-reviews-2026-10.json`.
Supplementary facility research is separately scoped:

```bash
pnpm manage:db:import:facility-news-research -- --file scripts/data/facility-news-research-2026-10.json --dry-run
pnpm manage:db:import:facility-news-research -- --file scripts/data/facility-news-research-2026-10.json
```

The supplementary file updates only six named facilities. Do not change the old
research file's batch date to imply that all historical URLs were rechecked.
After changes, run deep audit, `pnpm gen`, consistency/parity/depth/coverage checks,
tests, lint, Astro check, production build and bilingual rendered QA.

## 11. Static policy context bundles

`pnpm gen` now also publishes the initial English/Chinese 45Q policy and family
bundles under `public/data/context`. This is a read-only, network-free projection
of the same SQLite snapshot used for the public APIs, not a source-data update.
See `docs/context-bundles.md` for the consumer contract, CLI errors and evidence
limits.

```bash
pnpm context:build
pnpm --silent context:read -- --id us-section-45q --lang zh --format json
pnpm context:check
```

Run `context:check` after generation to verify every file and index hash. The
context directory is excluded from Prettier and ignored by Git; do not hand-edit
it. The pilot does not provide clause-verified current-law or project tax
eligibility answers, and does not change scores, confidence semantics or review
dates. Unknown history and missing project/translation evidence remain explicit.

## 12. Versioned source evidence preparation (approval pending)

The offline pilot validates frozen official source bytes, exact-text anchors and
candidate condition cards without changing accepted policy data:

```bash
pnpm --silent evidence:inspect -- --file scripts/data/evidence/us-45q-2024/packet.json
pnpm --silent evidence:inspect -- --file scripts/data/evidence/us-45q-2024/packet.json --preview-migration
```

See `docs/source-evidence-pilot.md` and
`migrations/2026-10-source-evidence/manifest.md`. The preview stages one document,
one version and two draft anchors in a disposable in-memory clone. It cannot
write the active SQLite file or promote evidence to verified. Three proposed
new tables require explicit schema approval before any live migration; the
canonical schema reference and existing public bundles remain unchanged.
The archived 2024 edition has coverage through 2025-01-06 and does not establish
current 45Q conditions. Condition drafts remain unknown and unpublished.

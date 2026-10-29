# Versioned source evidence proposal — 2026-10-29

Approval status: **pending; not executed against the repository SSOT**.

## Purpose and scope

Prepare S2/F05 source versions and exact-text anchors for review, on top of
PR #103. Source: its current SQLite schema/data plus the frozen official 2024
USC 45Q candidate in `scripts/data/evidence/us-45q-2024/`.
Target: the same policy dataset plus the three additive tables defined in
`proposed-schema.sql`. The authoritative `db/schema.sql` is not updated yet.

The proposed first import stages one document, one historical version and two
anchors, all as draft. It does not update existing policy text, audit dates,
scores, facilities, relationships or dataset version metadata. Three condition
drafts remain review inputs and are not persisted in this migration.

## Preview and replay

```bash
pnpm --silent evidence:inspect -- --file scripts/data/evidence/us-45q-2024/packet.json --preview-migration
node --test scripts/source-evidence.test.mjs
```

Preview reads the current database bytes into a disposable in-memory database,
validates hashes, applies DDL and inserts drafts in one transaction, checks
foreign keys, reports added tables and candidate row totals, then closes without
export. The original file is never written. No `--write` option exists here.

DDL uses `IF NOT EXISTS`; staging uses stable document/version/anchor keys and
rejects conflicting metadata instead of overwriting it. Replaying the same
candidate does not duplicate rows or downgrade a previously reviewed record.
Any error rolls back the whole candidate transaction.

## Approval and eventual execution

The maintainer must explicitly approve the three-table schema and draft import
before an active database migration. This is required by `AGENTS.md` section 6
and `SAFETY.md` sections 1/4. Approval to import a draft is not approval of its
legal interpretation or promotion to verified clause evidence.

After approval, the execution change must:

1. Acquire the existing database lock, hash the active DB and create a verified,
   content-addressed backup outside the active database directory (the existing
   user `.codex/backups/ccus-policy-hub/` location).
2. Run the reviewed transaction with `stageEvidenceCandidate`; compare existing
   table counts and canonical values before/after. Fail on foreign-key errors.
3. Write atomically with the existing `atomicWriteDb` helper and update the
   canonical schema reference to match the accepted migration.
4. Run deep audit, consistency/parity/coverage/content-depth checks, `pnpm gen`,
   `pnpm context:check`, tests, lint, Astro check, build and full CI. Existing
   public S1 bundles must retain their summary-only capabilities until a
   separately reviewed publication change is ready.

Rollback: before commit/publication, stop writers and restore the verified
external pre-migration bytes using the same lock and atomic-write helper; check
the restored SHA-256 and rerun audits/exports. Preserve the proposal and logs.
After merge, use a reviewed revert/recovery PR rather than deleting tables or
restoring over other contributors' newer data. Do not use `git checkout --` to
discard migration writes mixed with audit stamps.

Retire executed one-off code after merge according to `migrations/README.md`;
keep this manifest as the execution and approval record, updated with actual
approval, source/target hashes, backup path, row comparison and validation.

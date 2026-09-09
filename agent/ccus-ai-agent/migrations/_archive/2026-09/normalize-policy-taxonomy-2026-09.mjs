#!/usr/bin/env node
/**
 * Normalize policy category/status taxonomy in the SQLite SSOT (#69).
 *
 * Maps the 9 raw category values and 9 raw status values found in `policies`
 * to the canonical enum entries from src/content/enums.generated.ts
 * (POLICY_CATEGORIES / POLICY_STATUSES), per the approved mapping in
 * docs/issue-69-normalization-draft.md (approved 2026-09-08).
 *
 * Value-based and idempotent: re-running changes zero rows. Generated
 * Markdown and public JSON must be rebuilt from SQLite after this runs.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';
import {
  acquireDbLock,
  atomicWriteDb,
  releaseDbLock,
} from '../../../../scripts/lib/db-write.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../../..');
const DB_PATH = path.join(ROOT, 'agent/ccus-ai-agent/db/ccus_master.sqlite');

export const MIGRATION_ID = 'normalize-policy-taxonomy-2026-09';
export const AUDIT_DATE = '2026-09-08';
const REVIEWER = 'Taxonomy normalization (#69)';

// Canonical targets (must stay within POLICY_CATEGORIES / POLICY_STATUSES
// in src/content/enums.generated.ts — enforced by the test).
export const CATEGORY_MAP = Object.freeze({
  Regulatory: 'Regulatory',
  Strategic: 'Strategic',
  Incentive: 'Incentive',
  Market: 'Market',
  法律监管: 'Regulatory',
  Technical: 'Technical',
  Methodology: 'Technical Standard',
  Statutory: 'Regulatory Framework',
  'Tax Incentives': 'Incentive',
});

export const STATUS_MAP = Object.freeze({
  Active: 'Active',
  现行: 'Active',
  Planned: 'Planned',
  Upcoming: 'Upcoming',
  'Under development': 'Under development',
  Proposed: 'Upcoming',
  'Policy principles adopted': 'Upcoming',
  'Draft for public comment': 'Under development',
  Awarded: 'Active',
});

function execute(db, sql, params = []) {
  const statement = db.prepare(sql);
  statement.run(params);
  statement.free();
}

function scalar(db, sql, params = []) {
  const statement = db.prepare(sql);
  statement.bind(params);
  const value = statement.step() ? statement.get()[0] : null;
  statement.free();
  return value;
}

function rows(db, sql, params = []) {
  const statement = db.prepare(sql);
  statement.bind(params);
  const out = [];
  while (statement.step()) out.push(statement.getAsObject());
  statement.free();
  return out;
}

export function applyTaxonomyNormalizationMigration(
  db,
  { auditDate = AUDIT_DATE } = {}
) {
  db.run('PRAGMA foreign_keys = ON');
  const beforeCategories = rows(
    db,
    'SELECT category AS value, COUNT(*) AS n FROM policies GROUP BY category ORDER BY n DESC'
  );
  const beforeStatuses = rows(
    db,
    'SELECT status AS value, COUNT(*) AS n FROM policies GROUP BY status ORDER BY n DESC'
  );

  const applied = { category: {}, status: {} };
  db.run('BEGIN TRANSACTION');
  try {
    for (const [raw, canonical] of Object.entries(CATEGORY_MAP)) {
      if (raw === canonical) continue;
      execute(
        db,
        `UPDATE policies
         SET category = ?, provenance_reviewer = ?, provenance_last_audit_date = ?
         WHERE category = ?`,
        [canonical, REVIEWER, auditDate, raw]
      );
      applied.category[`${raw} -> ${canonical}`] = Number(
        scalar(db, 'SELECT changes()') || 0
      );
    }
    for (const [raw, canonical] of Object.entries(STATUS_MAP)) {
      if (raw === canonical) continue;
      execute(
        db,
        `UPDATE policies
         SET status = ?, provenance_reviewer = ?, provenance_last_audit_date = ?
         WHERE status = ?`,
        [canonical, REVIEWER, auditDate, raw]
      );
      applied.status[`${raw} -> ${canonical}`] = Number(
        scalar(db, 'SELECT changes()') || 0
      );
    }
    execute(db, 'INSERT OR REPLACE INTO db_meta (key, value) VALUES (?, ?)', [
      `migration:${MIGRATION_ID}`,
      auditDate,
    ]);
    db.run('COMMIT');
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }

  const strayCategories = rows(
    db,
    `SELECT DISTINCT category AS value FROM policies
     WHERE category NOT IN (${Object.values(CATEGORY_MAP)
       .map((v) => `'${v}'`)
       .join(',')})`
  );
  const strayStatuses = rows(
    db,
    `SELECT DISTINCT status AS value FROM policies
     WHERE status NOT IN (${Object.values(STATUS_MAP)
       .map((v) => `'${v}'`)
       .join(',')})`
  );
  if (strayCategories.length > 0 || strayStatuses.length > 0) {
    throw new Error(
      `Unmapped values remain: categories=${JSON.stringify(strayCategories)} ` +
        `statuses=${JSON.stringify(strayStatuses)}`
    );
  }

  return {
    migrationId: MIGRATION_ID,
    before: { categories: beforeCategories, statuses: beforeStatuses },
    applied,
    after: {
      categories: rows(
        db,
        'SELECT category AS value, COUNT(*) AS n FROM policies GROUP BY category ORDER BY n DESC'
      ),
      statuses: rows(
        db,
        'SELECT status AS value, COUNT(*) AS n FROM policies GROUP BY status ORDER BY n DESC'
      ),
    },
  };
}

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database not found: ${DB_PATH}`);
  }

  acquireDbLock();
  try {
    const SQL = await initSqlJs();
    const db = new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)));
    const summary = applyTaxonomyNormalizationMigration(db);
    const output = db.export();
    db.close();
    atomicWriteDb(DB_PATH, output);
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    releaseDbLock();
  }
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  main().catch((error) => {
    console.error(`Taxonomy normalization migration failed: ${error.message}`);
    process.exit(1);
  });
}

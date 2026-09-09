#!/usr/bin/env node
/**
 * Relationship model Phase 2 (docs/facility-policy-relationship-model.md).
 *
 * Extends policy_facility_links with link_type / confidence / evidence /
 * source_url / review_status / created_at / updated_at, and backfills all
 * existing rows as country-level links (link_type='country', confidence=0.3).
 *
 * Approved 2026-09-08 (T4/Q3), including the one-time created_at/updated_at
 * wall-clock exemption: these are migration provenance stamps inside the
 * SSOT, not deterministic generated artifacts.
 *
 * Idempotent: missing columns are added, only NULL rows are backfilled,
 * re-running changes zero rows.
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

export const MIGRATION_ID = 'relationship-link-types-2026-09';
export const AUDIT_DATE = '2026-09-08';

export const LINK_COLUMNS = Object.freeze([
  { name: 'link_type', ddl: "TEXT DEFAULT 'country'" },
  { name: 'confidence', ddl: 'REAL DEFAULT 0.3' },
  { name: 'evidence', ddl: 'TEXT' },
  { name: 'source_url', ddl: 'TEXT' },
  { name: 'review_status', ddl: "TEXT DEFAULT 'draft'" },
  { name: 'created_at', ddl: 'TEXT' },
  { name: 'updated_at', ddl: 'TEXT' },
]);

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

export function columnNames(db) {
  const statement = db.prepare('PRAGMA table_info(policy_facility_links)');
  const names = [];
  while (statement.step()) names.push(statement.getAsObject().name);
  statement.free();
  return names;
}

export function applyLinkTypeMigration(db, { auditDate = AUDIT_DATE } = {}) {
  db.run('PRAGMA foreign_keys = ON');
  const before = columnNames(db);
  const added = [];
  const backfilled = { rows: 0 };

  db.run('BEGIN TRANSACTION');
  try {
    const existing = new Set(columnNames(db));
    for (const column of LINK_COLUMNS) {
      if (!existing.has(column.name)) {
        execute(
          db,
          `ALTER TABLE policy_facility_links ADD COLUMN ${column.name} ${column.ddl}`
        );
        added.push(column.name);
      }
    }
    // NOTE: ALTER TABLE ... ADD COLUMN with a constant DEFAULT fills
    // existing rows automatically (link_type/confidence/review_status land
    // correctly). Only the timestamp columns need an explicit backfill.
    execute(
      db,
      `UPDATE policy_facility_links
       SET link_type = COALESCE(link_type, 'country'),
           confidence = COALESCE(confidence, 0.3),
           review_status = COALESCE(review_status, 'draft'),
           created_at = COALESCE(created_at, datetime('now')),
           updated_at = datetime('now')
       WHERE created_at IS NULL`
    );
    backfilled.rows = Number(scalar(db, 'SELECT changes()') || 0);
    execute(db, 'INSERT OR REPLACE INTO db_meta (key, value) VALUES (?, ?)', [
      `migration:${MIGRATION_ID}`,
      auditDate,
    ]);
    db.run('COMMIT');
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }

  return {
    migrationId: MIGRATION_ID,
    columnsBefore: before,
    columnsAdded: added,
    columnsAfter: columnNames(db),
    backfilledCountryLinks: backfilled.rows,
    totals: {
      all: Number(
        scalar(db, 'SELECT COUNT(*) FROM policy_facility_links') || 0
      ),
      country: Number(
        scalar(
          db,
          "SELECT COUNT(*) FROM policy_facility_links WHERE link_type = 'country'"
        ) || 0
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
    const summary = applyLinkTypeMigration(db);
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
    console.error(`Link-type migration failed: ${error.message}`);
    process.exit(1);
  });
}

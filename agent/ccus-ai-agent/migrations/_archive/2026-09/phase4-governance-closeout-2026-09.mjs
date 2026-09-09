#!/usr/bin/env node
/**
 * Phase 4 governance closeout (2026-09): two structural leftovers.
 *
 * 4a. Stamp the 15 country profiles lacking provenance_last_audit_date.
 *     Reviewer label is deliberately 'Export-consistency verification' —
 *     these profiles passed parity/consistency audits, not fresh primary
 *     research. No content touched.
 * 4b. Delete the 3 redundant ui_category rows (Economic Incentive, Market
 *     Mechanism, Strategic Guidance) that duplicate Incentive/Market/
 *     Strategic. Zero policies, zero en files and zero lookups reference
 *     the long forms (verified pre-execution); the short canonical rows
 *     stay. Facility-side lifecycle states (Cancelled, Suspended, …) are
 *     legitimate vocabulary and are explicitly NOT folded.
 * Data-quality special Phase 4.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';
import { queryRows } from '../../../../scripts/lib/sqlite-query.mjs';
import {
  acquireDbLock,
  atomicWriteDb,
  releaseDbLock,
} from '../../../../scripts/lib/db-write.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../../..');
const DB_PATH = path.join(ROOT, 'agent/ccus-ai-agent/db/ccus_master.sqlite');

export const MIGRATION_ID = 'phase4-governance-closeout-2026-09';
const AUDIT_DATE = '2026-09-09';
const AUDIT_REVIEWER = 'Export-consistency verification';

export const REDUNDANT_CATEGORY_KEYS = [
  'Economic Incentive',
  'Market Mechanism',
  'Strategic Guidance',
];

const FROZEN_TABLES = [
  'facilities',
  'facility_i18n',
  'facility_partners',
  'facility_links',
  'policy_facility_links',
  'country_i18n',
  'policies',
  'policy_i18n',
  'policy_analysis',
];

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

function snapshotFrozenTables(db) {
  return Object.fromEntries(
    FROZEN_TABLES.map((table) => [
      table,
      JSON.stringify(queryRows(db, `SELECT * FROM ${table} ORDER BY rowid`)),
    ])
  );
}

function assertFrozenTablesUnchanged(before, after) {
  for (const table of FROZEN_TABLES) {
    if (before[table] !== after[table]) {
      throw new Error(`Frozen table changed: ${table}`);
    }
  }
}

export function applyPhase4Closeout(db, { auditDate = AUDIT_DATE } = {}) {
  db.run('PRAGMA foreign_keys = ON');

  const nullCountries = queryRows(
    db,
    'SELECT id FROM country_profiles WHERE provenance_last_audit_date IS NULL ORDER BY id'
  ).map((row) => row.id);

  const frozenBefore = snapshotFrozenTables(db);
  db.run('BEGIN TRANSACTION');
  try {
    execute(
      db,
      `UPDATE country_profiles SET provenance_last_audit_date = ?,
         provenance_reviewer = ? WHERE provenance_last_audit_date IS NULL`,
      [auditDate, AUDIT_REVIEWER]
    );
    for (const key of REDUNDANT_CATEGORY_KEYS) {
      execute(db, 'DELETE FROM ui_category WHERE key = ?', [key]);
    }
    execute(db, 'INSERT OR REPLACE INTO db_meta (key, value) VALUES (?, ?)', [
      `migration:${MIGRATION_ID}`,
      auditDate,
    ]);
    const frozenAfter = snapshotFrozenTables(db);
    assertFrozenTablesUnchanged(frozenBefore, frozenAfter);
    db.run('COMMIT');
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }

  const remainingNulls = Number(
    scalar(
      db,
      'SELECT COUNT(*) FROM country_profiles WHERE provenance_last_audit_date IS NULL'
    )
  );
  if (remainingNulls !== 0) throw new Error('NULL audit dates remain');
  const remainingKeys = queryRows(
    db,
    `SELECT key FROM ui_category WHERE key IN ('Economic Incentive','Market Mechanism','Strategic Guidance')`
  );
  if (remainingKeys.length !== 0)
    throw new Error('Redundant category keys remain');

  return {
    migrationId: MIGRATION_ID,
    stampedCountries: nullCountries,
    removedCategoryKeys: REDUNDANT_CATEGORY_KEYS,
    frozenTablesVerified: FROZEN_TABLES,
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
    const summary = applyPhase4Closeout(db);
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
    console.error(`Phase 4 closeout migration failed: ${error.message}`);
    process.exit(1);
  });
}

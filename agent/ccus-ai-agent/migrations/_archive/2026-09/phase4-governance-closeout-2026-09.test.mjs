import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';

import {
  MIGRATION_ID,
  REDUNDANT_CATEGORY_KEYS,
  applyPhase4Closeout,
} from './phase4-governance-closeout-2026-09.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '../../db/ccus_master.sqlite');

async function openDatabase() {
  const SQL = await initSqlJs();
  return new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)));
}

function rows(db, sql, params = []) {
  const statement = db.prepare(sql);
  statement.bind(params);
  const out = [];
  while (statement.step()) out.push(statement.getAsObject());
  statement.free();
  return out;
}

test('phase 4 closeout stamps dates and folds categories in memory (no save)', async () => {
  const db = await openDatabase();
  const preNulls = rows(
    db,
    'SELECT COUNT(*) AS n FROM country_profiles WHERE provenance_last_audit_date IS NULL'
  )[0].n;
  const summary = applyPhase4Closeout(db, { auditDate: '2026-09-09' });

  assert.equal(summary.migrationId, MIGRATION_ID);
  if (preNulls > 0) {
    assert.equal(summary.stampedCountries.length, preNulls);
  } else {
    const marker = rows(db, 'SELECT value FROM db_meta WHERE key = ?', [
      `migration:${MIGRATION_ID}`,
    ]);
    assert.equal(marker.length, 1, 'closeout executed before (marker present)');
  }
  assert.deepEqual(summary.removedCategoryKeys, REDUNDANT_CATEGORY_KEYS);

  const nulls = rows(
    db,
    'SELECT COUNT(*) AS n FROM country_profiles WHERE provenance_last_audit_date IS NULL'
  )[0].n;
  assert.equal(nulls, 0, 'no NULL audit dates remain');

  const stamped = rows(
    db,
    `SELECT DISTINCT provenance_reviewer AS r FROM country_profiles
      WHERE provenance_last_audit_date = '2026-09-09'`
  ).map((row) => row.r);
  assert.ok(
    stamped.includes('Export-consistency verification'),
    'honest reviewer label present'
  );

  const leftovers = rows(
    db,
    `SELECT key FROM ui_category WHERE key IN ('Economic Incentive','Market Mechanism','Strategic Guidance')`
  );
  assert.equal(leftovers.length, 0, 'redundant keys gone');

  const canonicals = rows(
    db,
    `SELECT COUNT(*) AS n FROM ui_category WHERE key IN
      ('Incentive','Market','Regulatory','Regulatory Framework','Strategic','Technical','Technical Standard')`
  )[0].n;
  assert.equal(canonicals, 7, 'canonical rows intact');

  // Idempotency: second run stamps nothing new and deletes nothing.
  const summary2 = applyPhase4Closeout(db, { auditDate: '2026-09-09' });
  assert.equal(summary2.stampedCountries.length, 0);
  db.close();
});

import assert from 'node:assert/strict';
import test from 'node:test';
import initSqlJs from 'sql.js';

import {
  LINK_COLUMNS,
  MIGRATION_ID,
  applyLinkTypeMigration,
  columnNames,
} from './relationship-link-types-2026-09.mjs';

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

async function createLegacyFixture() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run(`
    CREATE TABLE policy_facility_links (
      policy_id TEXT NOT NULL,
      facility_id TEXT NOT NULL,
      PRIMARY KEY (policy_id, facility_id)
    );
    CREATE TABLE db_meta (key TEXT PRIMARY KEY, value TEXT);
  `);
  execute(
    db,
    'INSERT INTO policy_facility_links (policy_id, facility_id) VALUES (?, ?)',
    ['p1', 'f1']
  );
  execute(
    db,
    'INSERT INTO policy_facility_links (policy_id, facility_id) VALUES (?, ?)',
    ['p1', 'f2']
  );
  return db;
}

test('adds link-type columns and backfills country-level rows', async () => {
  const db = await createLegacyFixture();
  const summary = applyLinkTypeMigration(db, { auditDate: '2026-09-08' });

  assert.equal(summary.migrationId, MIGRATION_ID);
  assert.deepStrictEqual(
    summary.columnsAdded.sort(),
    LINK_COLUMNS.map((c) => c.name).sort()
  );
  assert.equal(summary.backfilledCountryLinks, 2);
  assert.deepStrictEqual(summary.totals, { all: 2, country: 2 });

  const statement = db.prepare(
    'SELECT link_type, confidence, review_status FROM policy_facility_links'
  );
  while (statement.step()) {
    const row = statement.getAsObject();
    assert.equal(row.link_type, 'country');
    assert.equal(row.confidence, 0.3);
    assert.equal(row.review_status, 'draft');
  }
  statement.free();
  assert.equal(
    scalar(db, 'SELECT value FROM db_meta WHERE key = ?', [
      `migration:${MIGRATION_ID}`,
    ]),
    '2026-09-08'
  );
  db.close();
});

test('migration is idempotent', async () => {
  const db = await createLegacyFixture();
  applyLinkTypeMigration(db);
  const before = columnNames(db).join(',');
  const second = applyLinkTypeMigration(db);
  assert.deepStrictEqual(second.columnsAdded, []);
  assert.equal(second.backfilledCountryLinks, 0);
  assert.equal(columnNames(db).join(','), before);
  db.close();
});

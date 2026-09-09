import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';

import {
  CATEGORY_MAP,
  MIGRATION_ID,
  STATUS_MAP,
  applyTaxonomyNormalizationMigration,
} from './normalize-policy-taxonomy-2026-09.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function execute(db, sql, params = []) {
  const statement = db.prepare(sql);
  statement.run(params);
  statement.free();
}

function allRows(db, sql, params = []) {
  const statement = db.prepare(sql);
  statement.bind(params);
  const out = [];
  while (statement.step()) out.push(statement.getAsObject());
  statement.free();
  return out;
}

async function createFixture() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run(`
    CREATE TABLE policies (
      id TEXT PRIMARY KEY,
      country TEXT,
      year INTEGER,
      status TEXT,
      category TEXT,
      review_status TEXT,
      legal_weight TEXT,
      source TEXT,
      url TEXT,
      pub_date TEXT,
      provenance_author TEXT,
      provenance_reviewer TEXT,
      provenance_last_audit_date TEXT
    );
    CREATE TABLE db_meta (key TEXT PRIMARY KEY, value TEXT);
  `);
  const seed = [
    ...Object.keys(CATEGORY_MAP).map((category, i) => ({
      id: `cat-${i}`,
      category,
      status: 'Active',
    })),
    ...Object.keys(STATUS_MAP).map((status, i) => ({
      id: `st-${i}`,
      category: 'Regulatory',
      status,
    })),
  ];
  for (const row of seed) {
    execute(
      db,
      `INSERT INTO policies (id, country, year, status, category, review_status)
       VALUES (?, 'X', 2024, ?, ?, 'verified')`,
      [row.id, row.status, row.category]
    );
  }
  return db;
}

test('maps every raw value to its canonical entry and stamps provenance', async () => {
  const db = await createFixture();
  const summary = applyTaxonomyNormalizationMigration(db, {
    auditDate: '2026-09-08',
  });

  assert.equal(summary.migrationId, MIGRATION_ID);
  const remaining = allRows(
    db,
    'SELECT DISTINCT category, status FROM policies'
  );
  for (const row of remaining) {
    assert.ok(
      Object.values(CATEGORY_MAP).includes(row.category),
      `category clean: ${row.category}`
    );
    assert.ok(
      Object.values(STATUS_MAP).includes(row.status),
      `status clean: ${row.status}`
    );
  }
  // Spot checks from the approved draft.
  const byId = Object.fromEntries(
    allRows(db, 'SELECT id, category, status FROM policies').map((r) => [
      r.id,
      r,
    ])
  );
  assert.equal(byId['cat-4'].category, 'Regulatory'); // 法律监管
  assert.equal(byId['cat-6'].category, 'Technical Standard'); // Methodology
  assert.equal(byId['cat-7'].category, 'Regulatory Framework'); // Statutory
  assert.equal(byId['cat-8'].category, 'Incentive'); // Tax Incentives
  assert.equal(byId['st-1'].status, 'Active'); // 现行
  assert.equal(byId['st-5'].status, 'Upcoming'); // Proposed
  assert.equal(byId['st-8'].status, 'Active'); // Awarded

  const stamped = allRows(
    db,
    `SELECT COUNT(*) AS n FROM policies
     WHERE provenance_reviewer = 'Taxonomy normalization (#69)'
       AND provenance_last_audit_date = '2026-09-08'`
  );
  assert.ok(stamped[0].n > 0, 'changed rows are stamped');
  const meta = allRows(db, 'SELECT value FROM db_meta WHERE key = ?', [
    `migration:${MIGRATION_ID}`,
  ]);
  assert.equal(meta[0]?.value, '2026-09-08');
  db.close();
});

test('migration is idempotent', async () => {
  const db = await createFixture();
  const first = applyTaxonomyNormalizationMigration(db);
  const changedFirst = Object.values({
    ...first.applied.category,
    ...first.applied.status,
  }).reduce((a, b) => a + b, 0);
  assert.ok(changedFirst > 0, 'first run changes rows');
  const second = applyTaxonomyNormalizationMigration(db);
  const changedSecond = Object.values({
    ...second.applied.category,
    ...second.applied.status,
  }).reduce((a, b) => a + b, 0);
  assert.equal(changedSecond, 0, 'second run changes nothing');
  db.close();
});

test('mapping targets stay inside the generated enums', () => {
  const generated = fs.readFileSync(
    path.resolve(__dirname, '../../../../src/content/enums.generated.ts'),
    'utf8'
  );
  for (const target of new Set(Object.values(CATEGORY_MAP))) {
    assert.ok(
      generated.includes(`'${target}'`),
      `category target in enum: ${target}`
    );
  }
  for (const target of new Set(Object.values(STATUS_MAP))) {
    assert.ok(
      generated.includes(`'${target}'`),
      `status target in enum: ${target}`
    );
  }
});

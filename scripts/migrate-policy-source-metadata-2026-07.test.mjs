import assert from 'node:assert/strict';
import test from 'node:test';
import initSqlJs from 'sql.js';

import {
  MIGRATION_ID,
  POLICY_UPDATES,
  applyPolicySourceMetadataMigration,
} from './migrate-policy-source-metadata-2026-07.mjs';

const MISSING_SOURCE_IDS = new Set([
  'au-offshore-ghg-act',
  'br-bill-1425-2022',
  'fr-ccus-roadmap',
  'de-icm-strategy',
  'is-cdr-framework',
  'ae-carbon-strategy',
  'uk-ccs-network-code',
  'us-obbba-45q-2025',
  'us-doe-carbon-management-strategy',
  'no-14th-licensing-round-2025',
]);

function execute(db, sql, params = []) {
  const statement = db.prepare(sql);
  statement.run(params);
  statement.free();
}

function firstRow(db, sql, params = []) {
  const statement = db.prepare(sql);
  statement.bind(params);
  const columns = statement.getColumnNames();
  const row = statement.step()
    ? Object.fromEntries(
        columns.map((column, index) => [column, statement.get()[index]])
      )
    : null;
  statement.free();
  return row;
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
      provenance_reviewer TEXT,
      provenance_last_audit_date TEXT
    );

    CREATE TABLE policy_i18n (
      policy_id TEXT NOT NULL,
      lang TEXT NOT NULL,
      title TEXT,
      description TEXT,
      PRIMARY KEY (policy_id, lang)
    );

    CREATE TABLE policy_analysis (
      policy_id TEXT NOT NULL,
      dimension TEXT NOT NULL,
      score REAL,
      label TEXT,
      evidence TEXT,
      citation TEXT,
      PRIMARY KEY (policy_id, dimension)
    );

    CREATE TABLE db_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  for (const update of POLICY_UPDATES) {
    execute(
      db,
      `INSERT INTO policies (
        id, country, year, status, category, review_status, legal_weight,
        source, url, pub_date, provenance_reviewer, provenance_last_audit_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        update.id,
        'Fixture country',
        2024,
        'Active',
        'Regulatory',
        'verified',
        'Guideline/Policy',
        MISSING_SOURCE_IDS.has(update.id) ? '' : 'Existing official body',
        '',
        '2024-01-01',
        'Human Audit Pending',
        '2026-01-01',
      ]
    );

    for (const lang of ['en', 'zh']) {
      execute(
        db,
        `INSERT INTO policy_i18n (policy_id, lang, title, description)
         VALUES (?, ?, ?, ?)`,
        [update.id, lang, `${update.id} ${lang}`, 'Legacy description']
      );
    }

    for (const dimension of [
      'statutory',
      'incentive',
      'market',
      'mrv',
      'strategic',
      'technical',
    ]) {
      execute(
        db,
        `INSERT INTO policy_analysis (
          policy_id, dimension, score, label, evidence, citation
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [update.id, dimension, 40, 'Legacy', 'Legacy evidence', '']
      );
    }
  }

  return db;
}

test('repairs all audited source and URL gaps without changing policy count', async () => {
  const db = await createFixture();
  const beforeCount = firstRow(db, 'SELECT COUNT(*) AS count FROM policies').count;

  const summary = applyPolicySourceMetadataMigration(db, {
    auditDate: '2026-07-21',
  });

  assert.equal(summary.updatedPolicies, 29);
  assert.deepEqual(summary.missingSource, { before: 10, after: 0 });
  assert.deepEqual(summary.missingUrl, { before: 29, after: 0 });
  assert.equal(
    firstRow(db, 'SELECT COUNT(*) AS count FROM policies').count,
    beforeCount
  );

  const brazil = firstRow(db, 'SELECT * FROM policies WHERE id = ?', [
    'br-bill-1425-2022',
  ]);
  assert.equal(brazil.year, 2022);
  assert.equal(brazil.status, 'Proposed');
  assert.equal(brazil.legal_weight, 'Proposed Legislation');

  const standards = firstRow(db, 'SELECT * FROM policies WHERE id = ?', [
    'cn-standards-2024',
  ]);
  assert.equal(standards.year, 2025);
  assert.equal(standards.pub_date, '2025-12-31');

  const networkCode = firstRow(db, 'SELECT * FROM policies WHERE id = ?', [
    'uk-ccs-network-code',
  ]);
  assert.equal(networkCode.status, 'Planned');
  assert.equal(networkCode.legal_weight, 'Proposed Market Rule');

  const doeStrategy = firstRow(db, 'SELECT * FROM policies WHERE id = ?', [
    'us-doe-carbon-management-strategy',
  ]);
  assert.equal(doeStrategy.status, 'Draft for public comment');
  assert.equal(doeStrategy.legal_weight, 'Draft Strategy');

  const obbba = firstRow(
    db,
    `SELECT p.pub_date, i.description
     FROM policies p
     JOIN policy_i18n i ON i.policy_id = p.id AND i.lang = 'en'
     WHERE p.id = ?`,
    ['us-obbba-45q-2025']
  );
  assert.equal(obbba.pub_date, '2025-07-04');
  assert.match(obbba.description, /did not newly create/i);

  const migration = firstRow(db, 'SELECT value FROM db_meta WHERE key = ?', [
    `migration:${MIGRATION_ID}`,
  ]);
  assert.equal(migration.value, '2026-07-21');

  db.close();
});

test('is idempotent after all metadata gaps are repaired', async () => {
  const db = await createFixture();
  applyPolicySourceMetadataMigration(db, { auditDate: '2026-07-21' });
  const second = applyPolicySourceMetadataMigration(db, {
    auditDate: '2026-07-21',
  });

  assert.deepEqual(second.missingSource, { before: 0, after: 0 });
  assert.deepEqual(second.missingUrl, { before: 0, after: 0 });
  assert.equal(second.updatedPolicies, POLICY_UPDATES.length);

  db.close();
});

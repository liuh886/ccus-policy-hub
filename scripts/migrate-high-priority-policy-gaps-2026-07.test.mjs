import assert from 'node:assert/strict';
import test from 'node:test';
import initSqlJs from 'sql.js';

import {
  MIGRATION_ID,
  POLICIES,
  applyHighPriorityPolicyGapMigration,
} from './migrate-high-priority-policy-gaps-2026-07.mjs';

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

function rows(db, sql, params = []) {
  const statement = db.prepare(sql);
  statement.bind(params);
  const columns = statement.getColumnNames();
  const output = [];
  while (statement.step()) {
    const values = statement.get();
    output.push(
      Object.fromEntries(
        columns.map((column, index) => [column, values[index]])
      )
    );
  }
  statement.free();
  return output;
}

function snapshotFrozenTables(db) {
  return JSON.stringify({
    facilities: rows(db, 'SELECT * FROM facilities ORDER BY rowid'),
    facility_i18n: rows(db, 'SELECT * FROM facility_i18n ORDER BY rowid'),
    facility_partners: rows(
      db,
      'SELECT * FROM facility_partners ORDER BY rowid'
    ),
    facility_links: rows(db, 'SELECT * FROM facility_links ORDER BY rowid'),
    policy_facility_links: rows(
      db,
      'SELECT * FROM policy_facility_links ORDER BY rowid'
    ),
    country_profiles: rows(db, 'SELECT * FROM country_profiles ORDER BY rowid'),
    country_i18n: rows(db, 'SELECT * FROM country_i18n ORDER BY rowid'),
  });
}

async function createFixture() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  db.run(`
    PRAGMA foreign_keys = ON;

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

    CREATE TABLE policy_i18n (
      policy_id TEXT NOT NULL,
      lang TEXT NOT NULL,
      title TEXT,
      description TEXT,
      scope TEXT,
      tags_json TEXT,
      impact_analysis_json TEXT,
      interpretation TEXT,
      evolution_json TEXT,
      regulatory_json TEXT,
      PRIMARY KEY (policy_id, lang)
    );

    CREATE TABLE policy_analysis (
      policy_id TEXT NOT NULL,
      dimension TEXT NOT NULL,
      score REAL,
      label TEXT,
      evidence TEXT,
      citation TEXT,
      audit_note TEXT,
      PRIMARY KEY (policy_id, dimension)
    );

    CREATE TABLE db_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE facilities (
      id TEXT PRIMARY KEY,
      name TEXT,
      estimated_capacity_mtpa REAL,
      latitude REAL,
      longitude REAL
    );

    CREATE TABLE facility_i18n (
      facility_id TEXT,
      lang TEXT,
      description TEXT
    );

    CREATE TABLE facility_partners (
      facility_id TEXT,
      partner_name TEXT
    );

    CREATE TABLE facility_links (
      facility_id TEXT,
      url TEXT
    );

    CREATE TABLE policy_facility_links (
      policy_id TEXT,
      facility_id TEXT
    );

    CREATE TABLE country_profiles (
      country TEXT PRIMARY KEY,
      maturity_score REAL
    );

    CREATE TABLE country_i18n (
      country TEXT,
      lang TEXT,
      description TEXT
    );
  `);

  execute(
    db,
    `INSERT INTO policies (
       id, country, year, status, category, review_status, legal_weight,
       source, url, pub_date, provenance_author, provenance_reviewer,
       provenance_last_audit_date
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'us-iija-hubs',
      'United States',
      2021,
      'Active',
      'Regulatory',
      'verified',
      'Guideline/Policy',
      'U.S. Department of Energy',
      'https://www.energy.gov/edf/carbon-dioxide-transportation-infrastructure-finance-and-innovation-program',
      '2021-11-15',
      'Legacy agent',
      'Legacy reviewer',
      '2026-01-01',
    ]
  );

  for (const lang of ['en', 'zh']) {
    execute(
      db,
      `INSERT INTO policy_i18n (
         policy_id, lang, title, description, scope, tags_json,
         impact_analysis_json, interpretation, evolution_json, regulatory_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'us-iija-hubs',
        lang,
        'Legacy IIJA hubs title',
        'Legacy mixed programme description',
        null,
        '[]',
        '{}',
        null,
        '{}',
        '{}',
      ]
    );
  }

  for (const dimension of [
    'incentive',
    'statutory',
    'market',
    'strategic',
    'mrv',
  ]) {
    execute(
      db,
      `INSERT INTO policy_analysis (
         policy_id, dimension, score, label, evidence, citation, audit_note
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['us-iija-hubs', dimension, 40, 'Legacy', 'Legacy evidence', '', '']
    );
  }

  execute(
    db,
    `INSERT INTO facilities
       (id, name, estimated_capacity_mtpa, latitude, longitude)
     VALUES (?, ?, ?, ?, ?)`,
    ['facility-1', 'Frozen facility', 1.5, 10.1, 20.2]
  );
  execute(db, 'INSERT INTO facility_i18n VALUES (?, ?, ?)', [
    'facility-1',
    'en',
    'Frozen description',
  ]);
  execute(db, 'INSERT INTO facility_partners VALUES (?, ?)', [
    'facility-1',
    'Frozen partner',
  ]);
  execute(db, 'INSERT INTO facility_links VALUES (?, ?)', [
    'facility-1',
    'https://example.com/facility',
  ]);
  execute(db, 'INSERT INTO policy_facility_links VALUES (?, ?)', [
    'us-iija-hubs',
    'facility-1',
  ]);
  execute(db, 'INSERT INTO country_profiles VALUES (?, ?)', [
    'United States',
    80,
  ]);
  execute(db, 'INSERT INTO country_i18n VALUES (?, ?, ?)', [
    'United States',
    'en',
    'Frozen country description',
  ]);

  return db;
}

test('adds three policies, refreshes CIFIA and preserves frozen tables', async () => {
  const db = await createFixture();
  const frozenBefore = snapshotFrozenTables(db);

  const summary = applyHighPriorityPolicyGapMigration(db, {
    auditDate: '2026-07-22',
    expectedPolicyCount: 1,
  });

  assert.deepEqual(
    {
      beforePolicyCount: summary.beforePolicyCount,
      addedPolicies: summary.addedPolicies,
      refreshedPolicies: summary.refreshedPolicies,
      afterPolicyCount: summary.afterPolicyCount,
    },
    {
      beforePolicyCount: 1,
      addedPolicies: 3,
      refreshedPolicies: 4,
      afterPolicyCount: 4,
    }
  );
  assert.equal(snapshotFrozenTables(db), frozenBefore);

  for (const policy of POLICIES) {
    assert.equal(
      firstRow(
        db,
        'SELECT COUNT(*) AS count FROM policy_i18n WHERE policy_id = ?',
        [policy.core.id]
      ).count,
      2
    );
    assert.equal(
      firstRow(
        db,
        'SELECT COUNT(*) AS count FROM policy_analysis WHERE policy_id = ?',
        [policy.core.id]
      ).count,
      5
    );
  }

  const cifia = firstRow(
    db,
    `SELECT p.category, p.legal_weight, i.title, i.description
       FROM policies p
       JOIN policy_i18n i
         ON i.policy_id = p.id AND i.lang = 'en'
      WHERE p.id = ?`,
    ['us-iija-hubs']
  );
  assert.equal(cifia.category, 'Incentive');
  assert.equal(cifia.legal_weight, 'Federal Statutory Finance Program');
  assert.match(cifia.title, /CIFIA/);
  assert.match(cifia.description, /\$2\.1 billion/);
  assert.doesNotMatch(cifia.description, /\$12 billion federal investment/);

  const uk = firstRow(
    db,
    `SELECT p.review_status, a.score, a.label
       FROM policies p
       JOIN policy_analysis a
         ON a.policy_id = p.id AND a.dimension = 'incentive'
      WHERE p.id = ?`,
    ['uk-industrial-carbon-capture-business-model-2025']
  );
  assert.equal(uk.review_status, 'verified');
  assert.equal(uk.score, 95);
  assert.match(uk.label, /Long-term capture contract/);

  const migration = firstRow(db, 'SELECT value FROM db_meta WHERE key = ?', [
    `migration:${MIGRATION_ID}`,
  ]);
  assert.equal(migration.value, '2026-07-22');

  db.close();
});

test('is idempotent after the migration marker exists', async () => {
  const db = await createFixture();
  applyHighPriorityPolicyGapMigration(db, {
    auditDate: '2026-07-22',
    expectedPolicyCount: 1,
  });
  const frozenBefore = snapshotFrozenTables(db);

  const second = applyHighPriorityPolicyGapMigration(db, {
    auditDate: '2026-07-22',
    expectedPolicyCount: 1,
  });

  assert.equal(second.alreadyApplied, true);
  assert.equal(second.beforePolicyCount, 4);
  assert.equal(second.addedPolicies, 0);
  assert.equal(second.afterPolicyCount, 4);
  assert.equal(snapshotFrozenTables(db), frozenBefore);

  db.close();
});

test('rejects an unexpected first-run policy baseline', async () => {
  const db = await createFixture();

  assert.throws(
    () =>
      applyHighPriorityPolicyGapMigration(db, {
        auditDate: '2026-07-22',
        expectedPolicyCount: 127,
      }),
    /Unexpected policy baseline/
  );

  assert.equal(firstRow(db, 'SELECT COUNT(*) AS count FROM policies').count, 1);
  db.close();
});

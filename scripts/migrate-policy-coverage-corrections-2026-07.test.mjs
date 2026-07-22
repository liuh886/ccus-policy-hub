import assert from 'node:assert/strict';
import test from 'node:test';
import initSqlJs from 'sql.js';
import {
  MIGRATION_ID,
  applyPolicyCoverageCorrectionMigration,
} from './migrate-policy-coverage-corrections-2026-07.mjs';

function scalar(db, sql, params = []) {
  const statement = db.prepare(sql);
  statement.bind(params);
  const value = statement.step() ? statement.get()[0] : null;
  statement.free();
  return value;
}

function seedPolicy(db, id, country = 'Test') {
  db.run(
    `INSERT INTO policies (
       id, country, year, status, category, review_status, legal_weight,
       source, url, pub_date, provenance_author
     ) VALUES (?, ?, 2025, 'Draft', 'Regulatory', 'draft', 'Draft',
       'Legacy source', 'https://example.com', '2025-01-01', 'Legacy')`,
    [id, country]
  );
}

async function createFixture() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE db_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE policies (
      id TEXT PRIMARY KEY, country TEXT NOT NULL, year INTEGER, status TEXT,
      category TEXT, review_status TEXT, legal_weight TEXT, source TEXT,
      url TEXT, pub_date TEXT, provenance_author TEXT,
      provenance_reviewer TEXT, provenance_last_audit_date TEXT
    );
    CREATE TABLE policy_i18n (
      policy_id TEXT NOT NULL, lang TEXT NOT NULL, title TEXT,
      description TEXT, scope TEXT, tags_json TEXT,
      impact_analysis_json TEXT, interpretation TEXT, evolution_json TEXT,
      regulatory_json TEXT, PRIMARY KEY (policy_id, lang),
      FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE CASCADE
    );
    CREATE TABLE policy_analysis (
      policy_id TEXT NOT NULL, dimension TEXT NOT NULL, score INTEGER NOT NULL,
      label TEXT, evidence TEXT, citation TEXT, audit_note TEXT,
      PRIMARY KEY (policy_id, dimension),
      FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE CASCADE
    );
    CREATE TABLE facilities (
      id TEXT PRIMARY KEY, country TEXT NOT NULL, status TEXT,
      review_status TEXT, announced_capacity_min REAL,
      announced_capacity_max REAL, announced_capacity_raw TEXT,
      estimated_capacity REAL, lat REAL, lng REAL, precision TEXT,
      investment_scale TEXT, provenance_author TEXT,
      provenance_reviewer TEXT, provenance_last_audit_date TEXT
    );
    CREATE TABLE facility_i18n (
      facility_id TEXT, lang TEXT, name TEXT,
      PRIMARY KEY (facility_id, lang)
    );
    CREATE TABLE facility_partners (
      facility_id TEXT, lang TEXT, order_index INTEGER, partner TEXT,
      PRIMARY KEY (facility_id, lang, order_index)
    );
    CREATE TABLE facility_links (
      facility_id TEXT, lang TEXT, order_index INTEGER, link TEXT,
      PRIMARY KEY (facility_id, lang, order_index)
    );
    CREATE TABLE policy_facility_links (
      policy_id TEXT NOT NULL, facility_id TEXT NOT NULL,
      PRIMARY KEY (policy_id, facility_id),
      FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE CASCADE,
      FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE
    );
    CREATE TABLE country_profiles (id TEXT PRIMARY KEY, region TEXT);
    CREATE TABLE country_i18n (
      country_id TEXT, lang TEXT, name TEXT,
      PRIMARY KEY (country_id, lang)
    );
  `);

  for (const [id, country] of [
    ['th-draft-climate-change-act-2025', 'Thailand'],
    ['br-anp-ccs-resolution', 'Brazil'],
    ['kr-ccus-act', 'South Korea'],
    ['uk-ccs-network-code', 'United Kingdom'],
    ['eu-nzia', 'European Union'],
    ['kr-motie-cluster-district-2025', 'South Korea'],
    ['ph-ccus-policy-framework-2025', 'Philippines'],
  ]) {
    seedPolicy(db, id, country);
  }

  db.run(`INSERT INTO facilities (id, country) VALUES ('1', 'South Korea')`);
  db.run(
    `INSERT INTO policy_facility_links (policy_id, facility_id)
     VALUES ('kr-motie-cluster-district-2025', '1')`
  );
  return db;
}

test('policy coverage migration adds, corrects, consolidates and removes safely', async () => {
  const db = await createFixture();
  const result = applyPolicyCoverageCorrectionMigration(db, {
    expectedPolicyCount: 7,
    auditDate: '2026-07-22',
  });

  assert.equal(result.beforePolicyCount, 7);
  assert.equal(result.addedPolicies, 1);
  assert.equal(result.correctedPolicies, 5);
  assert.equal(result.consolidatedPolicies, 1);
  assert.equal(result.consolidatedLinks, 1);
  assert.equal(result.removedPolicies, 1);
  assert.equal(result.afterPolicyCount, 6);
  assert.equal(
    scalar(db, `SELECT COUNT(*) FROM policies WHERE id = 'de-ksptg-amendment-2025'`),
    1
  );
  assert.equal(
    scalar(db, `SELECT COUNT(*) FROM policies WHERE id = 'ph-ccus-policy-framework-2025'`),
    0
  );
  assert.equal(
    scalar(db, `SELECT COUNT(*) FROM policies WHERE id = 'kr-motie-cluster-district-2025'`),
    0
  );
  assert.equal(
    scalar(
      db,
      `SELECT COUNT(*) FROM policy_facility_links
       WHERE policy_id = 'kr-ccus-act' AND facility_id = '1'`
    ),
    1
  );
  assert.equal(
    scalar(db, `SELECT value FROM db_meta WHERE key = 'migration:${MIGRATION_ID}'`),
    '2026-07-22'
  );

  const second = applyPolicyCoverageCorrectionMigration(db, {
    expectedPolicyCount: 7,
    auditDate: '2026-07-22',
  });
  assert.equal(second.alreadyApplied, true);
  assert.equal(second.addedPolicies, 0);
  assert.equal(second.consolidatedPolicies, 0);
  assert.equal(second.removedPolicies, 0);
  assert.equal(second.afterPolicyCount, 6);
  db.close();
});

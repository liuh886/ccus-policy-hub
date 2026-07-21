import assert from 'node:assert/strict';
import test from 'node:test';
import initSqlJs from 'sql.js';
import {
  MIGRATION_ID,
  NEW_POLICIES,
  applyOfficialPolicyGapMigration,
} from './migrate-official-policy-gaps-2026-07.mjs';

function scalar(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const value = stmt.step() ? stmt.get()[0] : null;
  stmt.free();
  return value;
}

function createSchema(db) {
  db.run(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE db_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE policies (id TEXT PRIMARY KEY, country TEXT NOT NULL, year INTEGER, status TEXT, category TEXT, review_status TEXT, legal_weight TEXT, source TEXT, url TEXT, pub_date TEXT, provenance_author TEXT, provenance_reviewer TEXT, provenance_last_audit_date TEXT);
    CREATE TABLE policy_i18n (policy_id TEXT NOT NULL, lang TEXT NOT NULL, title TEXT, description TEXT, scope TEXT, tags_json TEXT, impact_analysis_json TEXT, interpretation TEXT, evolution_json TEXT, regulatory_json TEXT, PRIMARY KEY(policy_id, lang));
    CREATE TABLE policy_analysis (policy_id TEXT NOT NULL, dimension TEXT NOT NULL, score INTEGER NOT NULL, label TEXT, evidence TEXT, citation TEXT, audit_note TEXT, PRIMARY KEY(policy_id, dimension));
    CREATE TABLE facilities (id TEXT PRIMARY KEY, country TEXT NOT NULL, status TEXT, review_status TEXT, announced_capacity_min REAL, announced_capacity_max REAL, announced_capacity_raw TEXT, estimated_capacity REAL, lat REAL, lng REAL, precision TEXT, investment_scale TEXT, provenance_author TEXT, provenance_reviewer TEXT, provenance_last_audit_date TEXT);
    CREATE TABLE facility_i18n (facility_id TEXT NOT NULL, lang TEXT NOT NULL, name TEXT, description TEXT, region TEXT, type TEXT, phase TEXT, sector TEXT, fate_of_carbon TEXT, hub TEXT, operator TEXT, capture_technology TEXT, storage_type TEXT, announcement TEXT, fid TEXT, operation TEXT, suspension_date TEXT, PRIMARY KEY(facility_id, lang));
    CREATE TABLE facility_partners (facility_id TEXT NOT NULL, lang TEXT NOT NULL, order_index INTEGER NOT NULL, partner TEXT NOT NULL, PRIMARY KEY(facility_id, lang, order_index));
    CREATE TABLE facility_links (facility_id TEXT NOT NULL, lang TEXT NOT NULL, order_index INTEGER NOT NULL, link TEXT NOT NULL, PRIMARY KEY(facility_id, lang, order_index));
    CREATE TABLE policy_facility_links (policy_id TEXT NOT NULL, facility_id TEXT NOT NULL, PRIMARY KEY(policy_id, facility_id));
    CREATE TABLE country_profiles (id TEXT PRIMARY KEY, region TEXT, net_zero_year INTEGER, capture_2030 TEXT, storage_2050 TEXT, deployment_capacity_mtpa REAL NOT NULL DEFAULT 0, governance_capability_index REAL NOT NULL DEFAULT 0, maturity_x REAL NOT NULL DEFAULT 0, maturity_y REAL NOT NULL DEFAULT 0, provenance_author TEXT, provenance_reviewer TEXT, provenance_last_audit_date TEXT);
    CREATE TABLE country_i18n (country_id TEXT NOT NULL, lang TEXT NOT NULL, name TEXT NOT NULL, summary TEXT, pore_space_rights TEXT, liability_transfer TEXT, liability_period TEXT, financial_assurance TEXT, permitting_lead_time TEXT, co2_definition TEXT, cross_border_rules TEXT, PRIMARY KEY(country_id, lang));
  `);
}

function seed(db) {
  db.run(
    `INSERT INTO policies VALUES ('br-law-14993-2024','Brazil',2024,'Active','Regulatory','verified','Primary Legislation','Legacy','https://example.com','2024-10-08','Legacy','Pending','2026-02-07')`
  );
  for (const lang of ['en', 'zh']) {
    const stmt = db.prepare(
      `INSERT INTO policy_i18n VALUES (?,?,?,?,?,?,?,?,?,?)`
    );
    stmt.run([
      'br-law-14993-2024',
      lang,
      'Legacy',
      'Law 14,933/2024 integrated the CCS framework with SBCE.',
      null,
      null,
      '{}',
      null,
      '{}',
      '{}',
    ]);
    stmt.free();
  }
  for (const dimension of [
    'incentive',
    'statutory',
    'market',
    'strategic',
    'mrv',
  ]) {
    const stmt = db.prepare(
      `INSERT INTO policy_analysis VALUES (?,?,?,?,?,?,?)`
    );
    stmt.run([
      'br-law-14993-2024',
      dimension,
      50,
      'Legacy',
      'Legacy evidence',
      'Legacy citation',
      '',
    ]);
    stmt.free();
  }
  db.run(
    `INSERT INTO facilities (id,country,estimated_capacity,lat,lng,precision) VALUES ('f1','Brazil',1.25,-22.9,-43.2,'site')`
  );
  db.run(
    `INSERT INTO facility_i18n (facility_id,lang,name) VALUES ('f1','en','Frozen facility')`
  );
  db.run(`INSERT INTO facility_partners VALUES ('f1','en',0,'Frozen partner')`);
  db.run(
    `INSERT INTO facility_links VALUES ('f1','en',0,'https://example.com/f1')`
  );
  db.run(`INSERT INTO policy_facility_links VALUES ('br-law-14993-2024','f1')`);
  db.run(
    `INSERT INTO country_profiles (id,region) VALUES ('Brazil','Latin America')`
  );
  db.run(
    `INSERT INTO country_i18n (country_id,lang,name) VALUES ('Brazil','en','Brazil')`
  );
}

test('adds three policies, corrects Brazil, and preserves frozen tables', async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  createSchema(db);
  seed(db);
  const facilityBefore = JSON.stringify(db.exec('SELECT * FROM facilities'));
  const linksBefore = JSON.stringify(
    db.exec('SELECT * FROM policy_facility_links')
  );

  const summary = applyOfficialPolicyGapMigration(db, {
    expectedPolicyCount: 1,
  });
  assert.equal(summary.addedPolicies, 3);
  assert.equal(summary.afterPolicyCount, 4);

  for (const policy of NEW_POLICIES) {
    assert.equal(
      Number(
        scalar(db, 'SELECT COUNT(*) FROM policies WHERE id=?', [policy.core.id])
      ),
      1
    );
    assert.equal(
      Number(
        scalar(db, 'SELECT COUNT(*) FROM policy_i18n WHERE policy_id=?', [
          policy.core.id,
        ])
      ),
      2
    );
    assert.equal(
      Number(
        scalar(db, 'SELECT COUNT(*) FROM policy_analysis WHERE policy_id=?', [
          policy.core.id,
        ])
      ),
      5
    );
  }

  const description = String(
    scalar(
      db,
      `SELECT description FROM policy_i18n WHERE policy_id='br-law-14993-2024' AND lang='en'`
    )
  );
  assert.match(description, /14,993\/2024/);
  assert.doesNotMatch(description, /14,933\/2024/);
  assert.doesNotMatch(description, /integrated the CCS framework with SBCE/i);
  assert.equal(
    JSON.stringify(db.exec('SELECT * FROM facilities')),
    facilityBefore
  );
  assert.equal(
    JSON.stringify(db.exec('SELECT * FROM policy_facility_links')),
    linksBefore
  );
  assert.equal(
    scalar(db, 'SELECT value FROM db_meta WHERE key=?', [
      `migration:${MIGRATION_ID}`,
    ]),
    '2026-07-21'
  );

  const rerun = applyOfficialPolicyGapMigration(db, { expectedPolicyCount: 1 });
  assert.equal(rerun.alreadyApplied, true);
  assert.equal(rerun.addedPolicies, 0);
  assert.equal(rerun.afterPolicyCount, 4);
  db.close();
});

test('rejects an unexpected baseline before mutation', async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  createSchema(db);
  seed(db);
  assert.throws(
    () => applyOfficialPolicyGapMigration(db),
    /Unexpected policy baseline/
  );
  assert.equal(Number(scalar(db, 'SELECT COUNT(*) FROM policies')), 1);
  assert.equal(Number(scalar(db, 'SELECT COUNT(*) FROM facilities')), 1);
  db.close();
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import initSqlJs from 'sql.js';
import { acquireDbLock } from '../../../../scripts/lib/db-write.mjs';
import { SCHEMA_PATH, SqlJsDatabase } from '../db.mjs';
import { computeGovernanceDeployment } from '../governance-deployment-algo.mjs';
import {
  SUBNATIONAL_MATCHERS_PATH,
  SUBNATIONAL_POLICY_MATCHERS,
  dbFixRelationships,
  dbPipeline,
  loadSubnationalMatchers,
} from './maintenance.mjs';

function makeDb(SQL) {
  const db = new SqlJsDatabase(SQL);
  db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  return db;
}

test('subnational-matchers.json loads valid declarative matchers with jurisdiction metadata', () => {
  const raw = JSON.parse(fs.readFileSync(SUBNATIONAL_MATCHERS_PATH, 'utf8'));
  assert.equal(raw.schema_version, '1.0.0');
  const compiled = loadSubnationalMatchers();
  assert.ok(Object.keys(compiled).length >= 17);
  for (const [id, matcher] of Object.entries(compiled)) {
    assert.ok(matcher.country, `${id} has country`);
    assert.ok(matcher.jurisdiction, `${id} has jurisdiction`);
    assert.ok(matcher.structuredRegex instanceof RegExp);
    assert.ok(SUBNATIONAL_POLICY_MATCHERS[id]);
  }
});

test('dbFixRelationships tightens 2-letter codes, preserves evidence links on --force, and avoids N+1 policy queries', async () => {
  const SQL = await initSqlJs();
  const db = makeDb(SQL);
  try {
    db.run(
      `INSERT INTO policies (id, country, year, status) VALUES (?,?,?,?)`,
      ['california-lcfs', 'United States', 2024, 'Active']
    );
    db.run(
      `INSERT INTO policies (id, country, year, status) VALUES (?,?,?,?)`,
      ['us-la-primacy-rules', 'United States', 2024, 'Active']
    );
    db.run(
      `INSERT INTO policies (id, country, year, status) VALUES (?,?,?,?)`,
      ['us-45q-2022', 'United States', 2022, 'Active']
    );
    db.run(
      `INSERT INTO policies (id, country, year, status) VALUES (?,?,?,?)`,
      ['alberta-tier', 'Canada', 2024, 'Active']
    );

    // Facility 1539: "La Paloma CPX facility (CA)" in CA — must NOT match LA!
    db.run(`INSERT INTO facilities (id, country, address) VALUES (?,?,?)`, [
      '1539',
      'United States',
      'CA, United States',
    ]);
    db.run(
      `INSERT INTO facility_i18n (facility_id, lang, name, region, hub) VALUES (?,?,?,?,?)`,
      ['1539', 'en', 'La Paloma CPX facility (CA)', 'North America', '']
    );

    // Facility 229: "(ALB)" only in name, address is generic "Canada".
    db.run(`INSERT INTO facilities (id, country, address) VALUES (?,?,?)`, [
      '229',
      'Canada',
      'Canada',
    ]);
    db.run(
      `INSERT INTO facility_i18n (facility_id, lang, name, region, hub) VALUES (?,?,?,?,?)`,
      [
        '229',
        'en',
        'Itochu/Petronas ammonia project (ALB)',
        'North America',
        '',
      ]
    );

    // Facility 1075: AB in structured address -> matches alberta-tier.
    db.run(`INSERT INTO facilities (id, country, address) VALUES (?,?,?)`, [
      '1075',
      'Canada',
      'Edmonton, AB, Canada',
    ]);
    db.run(
      `INSERT INTO facility_i18n (facility_id, lang, name, region, hub) VALUES (?,?,?,?,?)`,
      ['1075', 'en', 'Heartland facility', 'North America', '']
    );

    // Direct evidence links (including one on a subnational policy) must survive --force!
    db.run(
      `INSERT INTO policy_facility_links (policy_id, facility_id, link_type, confidence, evidence, source_url, review_status)
       VALUES (?, ?, 'evidence', 1.0, 'Direct permit', 'https://example.gov/permit', 'verified')`,
      ['us-45q-2022', '1539']
    );
    db.run(
      `INSERT INTO policy_facility_links (policy_id, facility_id, link_type, confidence, evidence, source_url, review_status)
       VALUES (?, ?, 'evidence', 1.0, 'LCFS pathway approval', 'https://example.gov/lcfs', 'verified')`,
      ['california-lcfs', '1539']
    );

    let policySelectCount = 0;
    const origAll = db.all.bind(db);
    db.all = (sql, params) => {
      if (/FROM\s+policies\b/i.test(sql)) policySelectCount++;
      return origAll(sql, params);
    };

    await dbFixRelationships(SQL, ['--force'], { db });
    assert.equal(policySelectCount, 1, 'policies loaded once, not N+1');

    const links1539 = db.all(
      'SELECT policy_id, link_type, evidence FROM policy_facility_links WHERE facility_id = ? ORDER BY policy_id',
      ['1539']
    );
    assert.deepEqual(links1539, [
      {
        policy_id: 'california-lcfs',
        link_type: 'evidence',
        evidence: 'LCFS pathway approval',
      },
      {
        policy_id: 'us-45q-2022',
        link_type: 'evidence',
        evidence: 'Direct permit',
      },
    ]);

    // 229 must not match alberta-tier via (ALB) in raw name; 1075 must match via AB in address.
    const links229 = db.all(
      'SELECT policy_id FROM policy_facility_links WHERE facility_id = ?',
      ['229']
    );
    assert.deepEqual(links229, []);

    const links1075 = db.all(
      'SELECT policy_id, link_type FROM policy_facility_links WHERE facility_id = ?',
      ['1075']
    );
    assert.deepEqual(links1075, [
      { policy_id: 'alberta-tier', link_type: 'subnational_region' },
    ]);
  } finally {
    db.close();
  }
});

test('dbPipeline rejects with retired-flag error when --with-imports is passed', async () => {
  const SQL = await initSqlJs();
  await assert.rejects(
    () => dbPipeline(SQL, ['--with-imports']),
    /--with-imports is retired/
  );
});

test('computeGovernanceDeployment manages its sibling .lock standalone and allows caller-held lock with acquireLock: false', async (t) => {
  const SQL = await initSqlJs();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccus-maintenance-'));
  const tmpDbPath = path.join(tempDir, 'test.sqlite');
  const lockPath = path.join(tempDir, '.lock');
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  const seedDb = makeDb(SQL);
  try {
    seedDb.run(`INSERT INTO country_profiles (id) VALUES (?)`, ['Testland']);
    seedDb.run(
      `INSERT INTO policies (id, country, year, status, review_status) VALUES (?,?,?,?,?)`,
      ['p1', 'Testland', 2024, 'Active', 'verified']
    );
    for (const [dimension, score] of [
      ['incentive', 80],
      ['statutory', 60],
      ['market', 40],
      ['strategic', 70],
      ['mrv', 50],
    ]) {
      seedDb.run(
        `INSERT INTO policy_analysis (policy_id, dimension, score) VALUES (?,?,?)`,
        ['p1', dimension, score]
      );
    }
    seedDb.run(
      `INSERT INTO facilities (id, country, status, estimated_capacity) VALUES (?,?,?,?)`,
      ['f1', 'Testland', 'Operational', 12.5]
    );
    fs.writeFileSync(tmpDbPath, new Uint8Array(seedDb.db.export()));
  } finally {
    seedDb.close();
  }

  assert.equal(fs.existsSync(lockPath), false);

  // Standalone call acquires and cleanly releases its sibling .lock.
  await computeGovernanceDeployment(tmpDbPath);
  assert.equal(fs.existsSync(lockPath), false);

  // When a caller (such as manage.mjs) already holds the lock:
  // - default acquireLock: true rejects rather than clobbering the lock
  // - acquireLock: false succeeds without deadlock and leaves the caller's lock intact.
  const release = acquireDbLock(lockPath);
  try {
    assert.equal(fs.existsSync(lockPath), true);
    await assert.rejects(
      () => computeGovernanceDeployment(tmpDbPath),
      /Database is locked/
    );

    await computeGovernanceDeployment(tmpDbPath, { SQL, acquireLock: false });
    assert.equal(fs.existsSync(lockPath), true);
  } finally {
    release();
  }
  assert.equal(fs.existsSync(lockPath), false);

  const verifyDb = new SqlJsDatabase(
    SQL,
    new Uint8Array(fs.readFileSync(tmpDbPath))
  );
  try {
    const row = verifyDb.get(
      `SELECT deployment_capacity_mtpa, governance_capability_index
       FROM country_profiles WHERE id = ?`,
      ['Testland']
    );
    assert.equal(row.deployment_capacity_mtpa, 12.5);
    assert.equal(row.governance_capability_index, 60);
  } finally {
    verifyDb.close();
  }
});

import assert from 'node:assert/strict';
import test from 'node:test';
import initSqlJs from 'sql.js';

import {
  applyPolicyLifecycleMigration,
  CANONICAL_UPDATES,
  POLICY_FAMILIES,
} from './migrate-policy-lifecycle-2026-07.mjs';

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

async function createFixture() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON');
  db.run(`
    CREATE TABLE db_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE policies (
      id TEXT PRIMARY KEY,
      country TEXT NOT NULL,
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
      PRIMARY KEY (policy_id, lang),
      FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE CASCADE
    );
    CREATE TABLE policy_analysis (
      policy_id TEXT NOT NULL,
      dimension TEXT NOT NULL,
      score INTEGER NOT NULL,
      label TEXT,
      evidence TEXT,
      citation TEXT,
      audit_note TEXT,
      PRIMARY KEY (policy_id, dimension),
      FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE CASCADE
    );
    CREATE TABLE facilities (
      id TEXT PRIMARY KEY,
      country TEXT NOT NULL
    );
    CREATE TABLE policy_facility_links (
      policy_id TEXT NOT NULL,
      facility_id TEXT NOT NULL,
      PRIMARY KEY (policy_id, facility_id),
      FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE CASCADE,
      FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE
    );
  `);

  execute(db, 'INSERT INTO facilities (id, country) VALUES (?, ?)', [
    'facility-1',
    'Test',
  ]);

  for (const update of CANONICAL_UPDATES) {
    execute(
      db,
      `INSERT INTO policies (
        id, country, year, status, category, review_status, legal_weight,
        source, url, pub_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        update.id,
        update.core.country,
        update.core.year,
        'Draft',
        'Legacy',
        'draft',
        null,
        null,
        null,
        null,
      ]
    );

    for (const lang of ['en', 'zh']) {
      execute(
        db,
        `INSERT INTO policy_i18n (
          policy_id, lang, title, description, evolution_json
        ) VALUES (?, ?, ?, ?, ?)`,
        [update.id, lang, 'Legacy title', 'Legacy description', '{}']
      );
    }

    for (const dimension of Object.keys(update.analysis || {})) {
      execute(
        db,
        `INSERT INTO policy_analysis (
          policy_id, dimension, score, label, evidence, citation
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [update.id, dimension, 40, 'Legacy', 'Legacy evidence', '']
      );
    }
  }

  for (const family of POLICY_FAMILIES) {
    for (const alias of family.aliases) {
      execute(
        db,
        'INSERT INTO policies (id, country) VALUES (?, ?)',
        [alias, 'Legacy']
      );
      execute(
        db,
        `INSERT INTO policy_facility_links (policy_id, facility_id)
         VALUES (?, ?)`,
        [alias, 'facility-1']
      );
    }
  }

  return db;
}

test('migration consolidates aliases, preserves links and repairs sources', async () => {
  const db = await createFixture();
  const aliasCount = POLICY_FAMILIES.reduce(
    (sum, family) => sum + family.aliases.length,
    0
  );

  const summary = applyPolicyLifecycleMigration(db, {
    auditDate: '2026-07-21',
  });

  assert.equal(summary.removedCount, aliasCount);
  assert.equal(summary.afterCount, CANONICAL_UPDATES.length);

  for (const family of POLICY_FAMILIES) {
    for (const alias of family.aliases) {
      assert.equal(
        scalar(db, 'SELECT COUNT(*) FROM policies WHERE id = ?', [alias]),
        0
      );
    }
    assert.equal(
      scalar(
        db,
        `SELECT COUNT(*) FROM policy_facility_links
         WHERE policy_id = ? AND facility_id = ?`,
        [family.canonicalId, 'facility-1']
      ),
      1
    );
  }

  assert.equal(
    scalar(db, 'SELECT url FROM policies WHERE id = ?', [
      'jp-ccs-business-act-2024',
    ]),
    'https://www.meti.go.jp/english/press/2026/0424_002.html'
  );
  assert.equal(
    scalar(db, 'SELECT pub_date FROM policies WHERE id = ?', [
      'my-ccus-act-2025',
    ]),
    '2025-08-01'
  );
  assert.match(
    scalar(
      db,
      `SELECT title FROM policy_i18n
       WHERE policy_id = ? AND lang = 'en'`,
      ['my-ccus-act-2025']
    ),
    /Act 870/
  );
  assert.equal(
    scalar(
      db,
      `SELECT score FROM policy_analysis
       WHERE policy_id = ? AND dimension = 'incentive'`,
      ['my-mida-incentives']
    ),
    95
  );
  assert.equal(
    scalar(db, 'SELECT value FROM db_meta WHERE key = ?', [
      'migration:policy-lifecycle-cleanup-2026-07',
    ]),
    '2026-07-21'
  );

  const rerun = applyPolicyLifecycleMigration(db, {
    auditDate: '2026-07-21',
  });
  assert.equal(rerun.removedCount, 0);
  assert.equal(rerun.afterCount, CANONICAL_UPDATES.length);
  db.close();
});

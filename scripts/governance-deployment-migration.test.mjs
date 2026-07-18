import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import initSqlJs from 'sql.js';

import { computeGovernanceDeployment } from '../agent/ccus-ai-agent/logic/governance-deployment-algo.mjs';

const readRow = (db, sql) => {
  const result = db.exec(sql);
  if (!result.length || !result[0].values.length) return null;
  return Object.fromEntries(
    result[0].columns.map((column, index) => [
      column,
      result[0].values[0][index],
    ])
  );
};

test('migration creates explicit fields, recomputes values and preserves legacy aliases', async (t) => {
  const SQL = await initSqlJs();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccus-governance-'));
  const dbPath = path.join(tempDir, 'test.sqlite');
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  const db = new SQL.Database();
  db.run(`
    CREATE TABLE country_profiles (
      id TEXT PRIMARY KEY,
      maturity_x REAL NOT NULL DEFAULT 0,
      maturity_y REAL NOT NULL DEFAULT 0
    );
    CREATE TABLE policies (
      id TEXT PRIMARY KEY,
      country TEXT NOT NULL,
      status TEXT
    );
    CREATE TABLE policy_analysis (
      policy_id TEXT NOT NULL,
      dimension TEXT NOT NULL,
      score INTEGER NOT NULL
    );
    CREATE TABLE facilities (
      id TEXT PRIMARY KEY,
      country TEXT NOT NULL,
      status TEXT,
      estimated_capacity REAL,
      announced_capacity_min REAL,
      announced_capacity_max REAL
    );
  `);
  db.run("INSERT INTO country_profiles (id, maturity_x, maturity_y) VALUES ('Testland', 1, 5)");
  db.run("INSERT INTO policies (id, country, status) VALUES ('p1', 'Testland', 'Active')");
  for (const [dimension, score] of [
    ['incentive', 90],
    ['statutory', 80],
    ['market', 70],
    ['strategic', 60],
    ['mrv', 50],
  ]) {
    db.run(
      'INSERT INTO policy_analysis (policy_id, dimension, score) VALUES (?, ?, ?)',
      ['p1', dimension, score]
    );
  }
  db.run(`
    INSERT INTO facilities
      (id, country, status, estimated_capacity, announced_capacity_min, announced_capacity_max)
    VALUES
      ('f1', 'Testland', 'Operational', 10, 0, 0),
      ('f2', 'Testland', 'Under construction', 0, 4, 8),
      ('f3', 'Testland', 'Planned', 99, 0, 0)
  `);
  fs.writeFileSync(dbPath, new Uint8Array(db.export()));
  db.close();

  await computeGovernanceDeployment(dbPath);

  const migrated = new SQL.Database(new Uint8Array(fs.readFileSync(dbPath)));
  const row = readRow(
    migrated,
    `SELECT deployment_capacity_mtpa, governance_capability_index, maturity_x, maturity_y
     FROM country_profiles WHERE id = 'Testland'`
  );
  const columns = migrated.exec('PRAGMA table_info(country_profiles)')[0].values.map(
    (item) => item[1]
  );

  assert.ok(columns.includes('deployment_capacity_mtpa'));
  assert.ok(columns.includes('governance_capability_index'));
  assert.equal(row.deployment_capacity_mtpa, 16);
  assert.equal(row.governance_capability_index, 70);
  assert.equal(row.maturity_x, 16);
  assert.equal(row.maturity_y, 350);
  migrated.close();
});

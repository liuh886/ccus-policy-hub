import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';

import { buildReport } from '../../../../scripts/audit-policy-content-depth.mjs';
import {
  MIGRATION_ID,
  STRATEGIC_UPDATES,
  applyStrategicSweep,
} from './strategic-dim-sweep-2026-09.mjs';

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

test('strategic sweep clears placeholders in memory (no save)', async () => {
  const db = await openDatabase();
  const beforeScores = Object.fromEntries(
    buildReport(db, '2026-09-09').assessments.map((a) => [a.id, a.score])
  );
  const summary = applyStrategicSweep(db, { auditDate: '2026-09-09' });

  assert.equal(summary.migrationId, MIGRATION_ID);
  assert.equal(summary.updatedPolicies.length, 25);

  const remaining = rows(
    db,
    `SELECT COUNT(*) AS n FROM policy_analysis
      WHERE dimension = 'strategic'
        AND (evidence LIKE '%Initial Assessment%' OR evidence LIKE '%Baseline strategic alignment%' OR label LIKE '%Initial Assessment%')`,
    []
  )[0].n;
  assert.equal(remaining, 0, 'no strategic placeholders remain');

  const after = buildReport(db, '2026-09-09');
  const byId = Object.fromEntries(after.assessments.map((a) => [a.id, a]));
  for (const entry of STRATEGIC_UPDATES) {
    assert.ok(
      byId[entry.id].score >= beforeScores[entry.id],
      `${entry.id} did not regress (${beforeScores[entry.id]} -> ${byId[entry.id]?.score})`
    );
    assert.ok(byId[entry.id].score >= 60, `${entry.id} stays medium or better`);
  }
  db.close();
});

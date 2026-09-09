import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';

import { buildReport } from '../../../../scripts/audit-policy-content-depth.mjs';
import {
  MIGRATION_ID,
  POLICY_CONTENT_UPDATES,
  applyContentDepthBatch2C,
} from './policy-content-depth-batch2-1c-2026-09.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '../../db/ccus_master.sqlite');

const TARGETS = [
  'norway-longship',
  'de-carbon-management-strategy-2024',
  'kr-ccus-act',
  'fr-ccus-strategy-2024',
];
const MERGED_AWAY_ID = 'no-longship-operational-2025';

function parse(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

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

function count(db, table, id) {
  return rows(
    db,
    `SELECT COUNT(*) AS n FROM ${table} WHERE ${
      table === 'policies' ? 'id' : 'policy_id'
    } = ?`,
    [id]
  )[0].n;
}

test('content-depth batch 2C enriches four policies and merges longship (no save)', async () => {
  const db = await openDatabase();
  const facilitiesBefore = rows(db, 'SELECT COUNT(*) AS n FROM facilities')[0]
    .n;
  const summary = applyContentDepthBatch2C(db, { auditDate: '2026-09-09' });

  assert.equal(summary.migrationId, MIGRATION_ID);
  assert.deepEqual(
    summary.updatedPolicies,
    POLICY_CONTENT_UPDATES.map((entry) => entry.id)
  );
  assert.equal(summary.mergedAway.id, MERGED_AWAY_ID);
  // The merge is one-way: on a pre-merge database the duplicate is deleted
  // (54 links); on re-runs the step is skipped and the db_meta marker proves
  // the merge executed.
  const mergeSourcePresent = count(db, 'policies', MERGED_AWAY_ID) === 1;
  if (mergeSourcePresent) {
    assert.equal(summary.mergedAway.removedLinks, 54);
  } else {
    const marker = rows(db, 'SELECT value FROM db_meta WHERE key = ?', [
      `migration:${MIGRATION_ID}`,
    ]);
    assert.equal(marker.length, 1, 'merge executed before (marker present)');
  }

  for (const id of TARGETS) {
    const locales = rows(
      db,
      `SELECT lang, description, scope, tags_json, impact_analysis_json,
              evolution_json
         FROM policy_i18n
        WHERE policy_id = ?
        ORDER BY lang`,
      [id]
    );
    assert.equal(locales.length, 2, `${id} should remain bilingual`);
    const en = locales.find((entry) => entry.lang === 'en');
    const zh = locales.find((entry) => entry.lang === 'zh');
    assert.ok(en.description.length >= 500, `${id} en description`);
    assert.ok(zh.description.length >= 260, `${id} zh description`);
    for (const locale of locales) {
      assert.ok(
        Array.isArray(parse(locale.tags_json)) &&
          parse(locale.tags_json).length >= 4,
        `${id} tags`
      );
      const impact = parse(locale.impact_analysis_json, {});
      for (const field of ['economic', 'technical', 'environmental']) {
        assert.ok((impact[field] || '').length >= 35, `${id} impact.${field}`);
      }
      const evolution = parse(locale.evolution_json, {});
      assert.ok(
        Array.isArray(evolution.milestones) && evolution.milestones.length >= 2,
        `${id} milestones`
      );
    }
    const analysisCount = rows(
      db,
      'SELECT COUNT(*) AS n FROM policy_analysis WHERE policy_id = ?',
      [id]
    )[0].n;
    assert.equal(analysisCount, 5, `${id} five dimensions`);
  }

  for (const table of [
    'policies',
    'policy_i18n',
    'policy_analysis',
    'policy_facility_links',
  ]) {
    if (mergeSourcePresent) {
      assert.equal(count(db, table, MERGED_AWAY_ID), 0, `${table} merge clean`);
    }
  }
  const keptLinks = rows(
    db,
    'SELECT facility_id FROM policy_facility_links WHERE policy_id = ? ORDER BY facility_id',
    ['norway-longship']
  ).length;
  assert.equal(keptLinks, 54, 'kept record retains all 54 links');
  const facilitiesAfter = rows(db, 'SELECT COUNT(*) AS n FROM facilities')[0].n;
  assert.equal(facilitiesAfter, facilitiesBefore, 'facilities untouched');

  const aiMarkers = rows(
    db,
    `SELECT COUNT(*) AS n FROM policy_analysis
      WHERE policy_id IN ('norway-longship','de-carbon-management-strategy-2024','kr-ccus-act','fr-ccus-strategy-2024')
        AND (evidence LIKE '%[AI-Generated]%' OR label LIKE '%Initial Assessment%')`,
    []
  )[0].n;
  assert.equal(aiMarkers, 0, 'no AI-generated or placeholder markers remain');
  db.close();
});

test('batch 2C targets score >= 70 on the real audit scorer', async () => {
  const db = await openDatabase();
  applyContentDepthBatch2C(db, { auditDate: '2026-09-09' });
  const report = buildReport(db, '2026-09-09');
  const byId = Object.fromEntries(
    report.assessments.map((entry) => [entry.id, entry])
  );
  for (const id of TARGETS) {
    assert.ok(
      byId[id].score >= 70,
      `${id} scores ${byId[id]?.score}, want >= 70`
    );
  }
  assert.ok(!byId[MERGED_AWAY_ID], 'merged record absent from report');
  db.close();
});

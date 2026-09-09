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
  applyContentDepthBatch3G,
} from './content-depth-batch3g-2026-09.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '../../db/ccus_master.sqlite');

const TARGETS = [
  'br-anp-ccs-resolution',
  'br-bill-1425-2022',
  'co-ccus-regulatory-decree-2025',
  'co-law-2099-energy-transition',
  'cl-green-hydrogen-ccs-2025',
  'mx-sener-ccus-2025',
];

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

test('content-depth batch 3G enriches six LatAm policies in memory (no save)', async () => {
  const db = await openDatabase();
  const summary = applyContentDepthBatch3G(db, { auditDate: '2026-09-09' });

  assert.equal(summary.migrationId, MIGRATION_ID);
  assert.deepEqual(
    summary.updatedPolicies,
    POLICY_CONTENT_UPDATES.map((entry) => entry.id)
  );

  for (const id of TARGETS) {
    const locales = rows(
      db,
      `SELECT lang, title, description, scope, tags_json, impact_analysis_json,
              evolution_json
         FROM policy_i18n
        WHERE policy_id = ?
        ORDER BY lang`,
      [id]
    );
    assert.equal(locales.length, 2, `${id} should remain bilingual`);
    const en = locales.find((entry) => entry.lang === 'en');
    const zh = locales.find((entry) => entry.lang === 'zh');
    for (const locale of locales) {
      assert.ok(
        (locale.title || '').length >= 10,
        `${id} ${locale.lang} title present`
      );
    }
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

  const aiMarkers = rows(
    db,
    `SELECT COUNT(*) AS n FROM policy_analysis
      WHERE policy_id IN ('br-anp-ccs-resolution','br-bill-1425-2022','co-ccus-regulatory-decree-2025','co-law-2099-energy-transition','cl-green-hydrogen-ccs-2025','mx-sener-ccus-2025')
        AND (evidence LIKE '%[AI-Generated]%' OR label LIKE '%Initial Assessment%' OR evidence LIKE '%Batch 4 Offshore Focus update%' OR evidence LIKE '%Strategic focus on green hydrogen integration%')`,
    []
  )[0].n;
  assert.equal(aiMarkers, 0, 'no boilerplate markers remain');

  const coStatus = rows(db, 'SELECT status FROM policies WHERE id = ?', [
    'co-ccus-regulatory-decree-2025',
  ])[0].status;
  assert.equal(coStatus, 'Under development');
  db.close();
});

test('batch 3G targets score >= 70 on the real audit scorer', async () => {
  const db = await openDatabase();
  applyContentDepthBatch3G(db, { auditDate: '2026-09-09' });
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
  db.close();
});

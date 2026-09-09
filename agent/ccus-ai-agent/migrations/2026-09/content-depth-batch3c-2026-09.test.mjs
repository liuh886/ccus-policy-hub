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
  applyContentDepthBatch3C,
} from './content-depth-batch3c-2026-09.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '../../db/ccus_master.sqlite');

const TARGETS = [
  'cn-ccer',
  'cn-ordos-pilot-2024',
  'cn-zero-carbon-parks',
  'cn-demo-tech-2024',
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

test('content-depth batch 3C enriches four China policies in memory (no save)', async () => {
  const db = await openDatabase();
  const summary = applyContentDepthBatch3C(db, { auditDate: '2026-09-09' });

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
      WHERE policy_id IN ('cn-ccer','cn-ordos-pilot-2024','cn-zero-carbon-parks','cn-demo-tech-2024')
        AND (evidence LIKE '%[AI-Generated]%' OR label LIKE '%Initial Assessment%' OR evidence LIKE '%No direct incentive found%' OR evidence LIKE '%No specific market rules%' OR evidence LIKE '%Standard reporting required%')`,
    []
  )[0].n;
  assert.equal(aiMarkers, 0, 'no placeholder markers remain');

  const ccerEn = rows(
    db,
    'SELECT description FROM policy_i18n WHERE policy_id = ? AND lang = ?',
    ['cn-ccer', 'en']
  )[0].description;
  assert.ok(
    !/948\s*万|9.48\s*Mt/.test(ccerEn),
    'corrected CCER figures replace the unsourced 948 claim'
  );
  db.close();
});

test('batch 3C targets score >= 70 on the real audit scorer', async () => {
  const db = await openDatabase();
  applyContentDepthBatch3C(db, { auditDate: '2026-09-09' });
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

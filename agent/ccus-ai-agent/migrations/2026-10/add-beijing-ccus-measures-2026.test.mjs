import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';

import { assessPolicyContent } from '../../../../scripts/audit-policy-content-depth.mjs';
import {
  MIGRATION_ID,
  applyAddBeijingMeasures,
} from './add-beijing-ccus-measures-2026.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '../../db/ccus_master.sqlite');

const TARGET = 'cn-bj-ccus-measures-2026';

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

test('migration add-beijing-ccus-measures-2026 inserts policy in memory and passes content depth', async () => {
  const db = await openDatabase();
  const summary = applyAddBeijingMeasures(db, { auditDate: '2026-10-21' });

  assert.equal(summary.migrationId, MIGRATION_ID);
  assert.ok(
    summary.insertedPolicies.includes(TARGET) ||
      summary.skippedPolicies.includes(TARGET),
    `${TARGET} must be inserted or skipped`
  );

  const core = rows(db, 'SELECT * FROM policies WHERE id = ?', [TARGET])[0];
  assert.ok(core, `${TARGET} exists in policies`);
  assert.equal(core.country, 'China');
  assert.equal(core.category, 'Strategic');
  assert.equal(core.legal_weight, 'Departmental Rules');
  assert.equal(core.review_status, 'draft');
  assert.ok(
    core.url && core.url.startsWith('https://'),
    `${TARGET} has real HTTPS url`
  );

  const locales = rows(
    db,
    `SELECT lang, title, description, scope, tags_json, impact_analysis_json,
            evolution_json
       FROM policy_i18n
      WHERE policy_id = ?
      ORDER BY lang`,
    [TARGET]
  );
  assert.equal(
    locales.length,
    2,
    `${TARGET} must have bilingual records (en, zh)`
  );
  const en = locales.find((entry) => entry.lang === 'en');
  const zh = locales.find((entry) => entry.lang === 'zh');

  assert.ok(
    en.description.length >= 500,
    `en description length: ${en.description.length} >= 500`
  );
  assert.ok(
    zh.description.length >= 260,
    `zh description length: ${zh.description.length} >= 260`
  );
  assert.ok(en.scope.length >= 50, `en scope length: ${en.scope.length} >= 50`);
  assert.ok(zh.scope.length >= 25, `zh scope length: ${zh.scope.length} >= 25`);

  for (const locale of [en, zh]) {
    const tags = parse(locale.tags_json);
    assert.ok(
      Array.isArray(tags) && tags.length >= 4,
      `${locale.lang} tags >= 4`
    );
    const impact = parse(locale.impact_analysis_json, {});
    for (const field of ['economic', 'technical', 'environmental']) {
      assert.ok(
        (impact[field] || '').length >= 35,
        `${locale.lang} impact.${field} length >= 35`
      );
    }
    const evolution = parse(locale.evolution_json, {});
    assert.ok(
      Array.isArray(evolution.milestones) && evolution.milestones.length >= 2,
      `${locale.lang} milestones >= 2`
    );
  }

  const analysisRows = rows(
    db,
    'SELECT dimension, score, label, evidence, citation FROM policy_analysis WHERE policy_id = ?',
    [TARGET]
  );
  assert.equal(
    analysisRows.length,
    5,
    'policy_analysis must have 5 dimensions'
  );
  for (const row of analysisRows) {
    assert.ok(
      row.score >= 0 && row.score <= 100,
      `score ${row.score} between 0 and 100`
    );
    assert.ok(
      (row.evidence || '').length >= 60,
      `evidence for ${row.dimension} length >= 60`
    );
    assert.ok(
      (row.citation || '').length > 0,
      `citation for ${row.dimension} present`
    );
  }

  // Assess depth score
  const policyObj = {
    id: TARGET,
    country: core.country,
    year: core.year,
    locales: { en, zh },
    analysis: analysisRows,
  };
  const depth = assessPolicyContent(policyObj);
  assert.equal(
    depth.score,
    100,
    `Depth score should be 100, got ${depth.score}`
  );
  assert.equal(
    depth.severity,
    'healthy',
    `Severity should be healthy, got ${depth.severity}`
  );
  assert.deepEqual(
    depth.flags,
    [],
    `Flags should be empty, got ${depth.flags.join(', ')}`
  );

  // Test idempotency
  const secondSummary = applyAddBeijingMeasures(db, {
    auditDate: '2026-10-21',
  });
  assert.equal(
    secondSummary.insertedPolicies.length,
    0,
    'Second run inserts 0'
  );
  assert.ok(
    secondSummary.skippedPolicies.includes(TARGET),
    'Second run skips target'
  );
});

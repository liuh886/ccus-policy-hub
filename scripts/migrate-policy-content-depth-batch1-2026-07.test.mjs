import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';

import {
  MIGRATION_ID,
  POLICY_CONTENT_UPDATES,
  applyPolicyContentDepthMigration,
} from './migrate-policy-content-depth-batch1-2026-07.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'agent/ccus-ai-agent/db/ccus_master.sqlite');

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

function rows(db, sql, params = []) {
  const statement = db.prepare(sql);
  statement.bind(params);
  const columns = statement.getColumnNames();
  const result = [];
  while (statement.step()) {
    const values = statement.get();
    result.push(
      Object.fromEntries(
        columns.map((column, index) => [column, values[index]])
      )
    );
  }
  statement.free();
  return result;
}

function parse(value) {
  return value ? JSON.parse(value) : null;
}

function clearMigrationMarker(db) {
  execute(db, 'DELETE FROM db_meta WHERE key = ?', [
    `migration:${MIGRATION_ID}`,
  ]);
}

const PLACEHOLDER_PATTERNS = [
  /no direct .* found/i,
  /not specified/i,
  /no specific .* rules/i,
  /baseline strategic alignment/i,
  /initial assessment/i,
  /standard reporting required/i,
  /upgraded from baseline/i,
];

async function openDatabase() {
  const SQL = await initSqlJs();
  return new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)));
}

test('content-depth migration enriches eight policies without changing policy count', async () => {
  const db = await openDatabase();
  const beforeCount = Number(scalar(db, 'SELECT COUNT(*) FROM policies'));

  const summary = applyPolicyContentDepthMigration(db, {
    auditDate: '2026-07-22',
    expectedPolicyCount: 130,
  });

  assert.equal(beforeCount, 130);
  assert.equal(summary.policyCount, 130);
  assert.deepEqual(
    summary.updatedPolicies,
    POLICY_CONTENT_UPDATES.map((entry) => entry.id)
  );
  assert.equal(summary.updatedPolicies.length, 8);

  for (const update of POLICY_CONTENT_UPDATES) {
    const locales = rows(
      db,
      `SELECT lang, description, scope, tags_json, impact_analysis_json,
              evolution_json, regulatory_json
         FROM policy_i18n
        WHERE policy_id = ?
        ORDER BY lang`,
      [update.id]
    );
    assert.equal(locales.length, 2, `${update.id} should remain bilingual`);

    const en = locales.find((entry) => entry.lang === 'en');
    const zh = locales.find((entry) => entry.lang === 'zh');
    assert.ok(
      en.description.length >= 400,
      `${update.id} English description is thin`
    );
    assert.ok(
      zh.description.length >= 180,
      `${update.id} Chinese description is thin`
    );
    assert.ok(en.scope.length >= 50, `${update.id} English scope is thin`);
    assert.ok(zh.scope.length >= 25, `${update.id} Chinese scope is thin`);

    for (const locale of locales) {
      const tags = parse(locale.tags_json);
      const impact = parse(locale.impact_analysis_json);
      const evolution = parse(locale.evolution_json);
      assert.ok(
        Array.isArray(tags) && tags.length >= 4,
        `${update.id} needs useful tags`
      );
      assert.ok(
        impact.economic?.length >= 35,
        `${update.id} needs economic analysis`
      );
      assert.ok(
        impact.technical?.length >= 35,
        `${update.id} needs technical analysis`
      );
      assert.ok(
        impact.environmental?.length >= 35,
        `${update.id} needs environmental analysis`
      );
      assert.ok(
        Array.isArray(evolution.milestones) && evolution.milestones.length >= 2,
        `${update.id} needs lifecycle milestones`
      );
    }

    const analysis = rows(
      db,
      `SELECT dimension, evidence, citation
         FROM policy_analysis
        WHERE policy_id = ?
        ORDER BY dimension`,
      [update.id]
    );
    assert.equal(
      analysis.length,
      5,
      `${update.id} needs five governance dimensions`
    );
    assert.deepEqual(
      new Set(analysis.map((entry) => entry.dimension)),
      new Set(['incentive', 'statutory', 'market', 'strategic', 'mrv'])
    );
    for (const entry of analysis) {
      assert.ok(
        entry.evidence.length >= 60,
        `${update.id} analysis evidence is thin`
      );
      assert.ok(
        entry.citation.length >= 15,
        `${update.id} analysis citation is thin`
      );
      assert.equal(
        PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(entry.evidence)),
        false,
        `${update.id} still contains placeholder analysis`
      );
    }
  }

  db.close();
});

test('content-depth migration is idempotent from a clean marker state', async () => {
  const db = await openDatabase();
  clearMigrationMarker(db);

  const first = applyPolicyContentDepthMigration(db, {
    auditDate: '2026-07-22',
    expectedPolicyCount: 130,
  });
  const second = applyPolicyContentDepthMigration(db, {
    auditDate: '2026-07-22',
    expectedPolicyCount: 999,
  });

  assert.equal(first.alreadyApplied, false);
  assert.equal(first.policyCount, 130);
  assert.equal(second.alreadyApplied, true);
  assert.equal(second.policyCount, 130);
  db.close();
});

test('content-depth migration rejects an unexpected first-run baseline', async () => {
  const db = await openDatabase();
  clearMigrationMarker(db);

  assert.throws(
    () =>
      applyPolicyContentDepthMigration(db, {
        auditDate: '2026-07-22',
        expectedPolicyCount: 129,
      }),
    /Unexpected policy baseline/
  );
  db.close();
});

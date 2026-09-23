/**
 * fix-en-content-localization-2026-09.test.mjs
 *
 * Guards the localization fix set and the pure apply function:
 * - every `from` fragment carries CJK and every `to` is CJK-free;
 * - no two fixes target the same cell;
 * - applying to a synthetic in-memory database clears the CJK and is
 *   idempotent (second run updates zero rows).
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';
import {
  CONTENT_LOCALIZATION_FIXES,
  applyContentLocalizationFixes,
} from './fix-en-content-localization-2026-09.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(__dirname, '../../db/schema.sql');
const CJK = /[\u4e00-\u9fff]/;

function keyColumn(table) {
  return table === 'policy_analysis' ? 'dimension' : 'lang';
}

describe('content localization fix set', () => {
  it('every replacement removes CJK', () => {
    for (const fix of CONTENT_LOCALIZATION_FIXES) {
      assert.ok(
        CJK.test(fix.from),
        `from must contain CJK: ${fix.policyId}.${fix.column}`
      );
      assert.ok(
        !CJK.test(fix.to),
        `to must be CJK-free: ${fix.policyId}.${fix.column}`
      );
      assert.ok(
        !fix.to.includes(fix.from),
        `to must not re-introduce from: ${fix.policyId}.${fix.column}`
      );
    }
  });

  it('targets are unique', () => {
    const seen = new Set();
    for (const fix of CONTENT_LOCALIZATION_FIXES) {
      const key = `${fix.table}|${fix.policyId}|${fix.key}|${fix.column}`;
      assert.ok(!seen.has(key), `duplicate target: ${key}`);
      seen.add(key);
    }
  });
});

describe('applyContentLocalizationFixes', () => {
  let SQL;
  before(async () => {
    SQL = await initSqlJs();
  });

  function seedAll(db, fixes) {
    const rows = new Map();
    for (const fix of fixes) {
      const rowKey = `${fix.table}|${fix.policyId}|${fix.key}`;
      if (!rows.has(rowKey)) {
        rows.set(rowKey, { fix, columns: {} });
      }
      rows.get(rowKey).columns[fix.column] = fix.from;
    }
    for (const { fix, columns } of rows.values()) {
      db.run('INSERT OR IGNORE INTO policies (id, country) VALUES (?, ?)', [
        fix.policyId,
        'XX',
      ]);
      if (fix.table === 'policy_analysis') {
        db.run(
          'INSERT INTO policy_analysis (policy_id, dimension, score, evidence, citation) VALUES (?,?,?,?,?)',
          [
            fix.policyId,
            fix.key,
            50,
            columns.evidence || '',
            columns.citation || '',
          ]
        );
      } else {
        db.run(
          'INSERT INTO policy_i18n (policy_id, lang, description, impact_analysis_json, evolution_json, regulatory_json) VALUES (?,?,?,?,?,?)',
          [
            fix.policyId,
            fix.key,
            columns.description || '',
            columns.impact_analysis_json || '',
            columns.evolution_json || '',
            columns.regulatory_json || '',
          ]
        );
      }
    }
  }

  it('clears the CJK fragments and is idempotent', () => {
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    const db = new SQL.Database();
    db.run(schema);

    seedAll(db, CONTENT_LOCALIZATION_FIXES);

    const firstPass = applyContentLocalizationFixes(db);
    assert.strictEqual(
      firstPass,
      CONTENT_LOCALIZATION_FIXES.length,
      'first pass should update every target'
    );

    for (const fix of CONTENT_LOCALIZATION_FIXES) {
      const keyCol = keyColumn(fix.table);
      const stmt = db.prepare(
        `SELECT ${fix.column} AS value FROM ${fix.table} WHERE policy_id = ? AND ${keyCol} = ?`
      );
      stmt.bind([fix.policyId, fix.key]);
      const value = stmt.step() ? stmt.get()[0] : '';
      stmt.free();
      assert.ok(
        value.includes(fix.to),
        `expected replacement in ${fix.policyId}.${fix.column}`
      );
      assert.ok(
        !CJK.test(value),
        `expected no CJK in ${fix.policyId}.${fix.column}`
      );
    }

    const secondPass = applyContentLocalizationFixes(db);
    assert.strictEqual(secondPass, 0, 'second pass should be a no-op');
    db.close();
  });
});

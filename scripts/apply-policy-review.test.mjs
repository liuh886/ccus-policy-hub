import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import initSqlJs from 'sql.js';
import { applyPolicyReview } from './apply-policy-review.mjs';
import { localizeAnalysis } from './lib/policy-localization.mjs';

test('policy review preserves scores, applies source-bound translations and is idempotent', async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database(
    fs.readFileSync('agent/ccus-ai-agent/db/ccus_master.sqlite')
  );
  const input = JSON.parse(
    fs.readFileSync('scripts/data/policy-reviews-2026-10.json')
  );
  const scores = db.exec(
    'SELECT policy_id, dimension, score FROM policy_analysis ORDER BY policy_id,dimension'
  );
  applyPolicyReview(db, input);
  const once = db.exec(
    'SELECT * FROM policy_analysis_i18n ORDER BY policy_id,dimension'
  );
  applyPolicyReview(db, input);
  assert.deepEqual(
    once,
    db.exec('SELECT * FROM policy_analysis_i18n ORDER BY policy_id,dimension')
  );
  assert.deepEqual(
    scores,
    db.exec(
      'SELECT policy_id, dimension, score FROM policy_analysis ORDER BY policy_id,dimension'
    )
  );
  const before = db.exec('SELECT url FROM policies ORDER BY id');
  assert.throws(() =>
    applyPolicyReview(db, {
      as_of: input.as_of,
      policies: [...input.policies, { id: 'does-not-exist' }],
    })
  );
  assert.deepEqual(before, db.exec('SELECT url FROM policies ORDER BY id'));
  db.close();
});

test('translations are invalidated when canonical evidence changes', () => {
  const analysis = { mrv: { score: 70, evidence: 'source-v2' } };
  const rows = [
    {
      dimension: 'mrv',
      lang: 'zh',
      source_evidence: 'source-v1',
      evidence: '旧译文',
    },
  ];
  assert.equal(
    localizeAnalysis(analysis, rows, 'zh').mrv.evidence,
    'source-v2'
  );
  rows[0].source_evidence = 'source-v2';
  assert.equal(localizeAnalysis(analysis, rows, 'zh').mrv.evidence, '旧译文');
  assert.equal(
    localizeAnalysis(analysis, rows, 'en').mrv.evidence,
    'source-v2'
  );
});

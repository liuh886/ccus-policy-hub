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

test('source_reviewed: false updates policy_analysis_i18n without altering audit_note, score, or provenance_last_audit_date', async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database(
    fs.readFileSync('agent/ccus-ai-agent/db/ccus_master.sqlite')
  );
  const policyId = 'ca-ccus-itc';
  const beforePolicy = db.exec(
    'SELECT provenance_last_audit_date FROM policies WHERE id=?',
    [policyId]
  )[0].values[0];
  const beforeAnalysis = db.exec(
    'SELECT dimension, score, label, evidence, citation, audit_note FROM policy_analysis WHERE policy_id=? ORDER BY dimension',
    [policyId]
  )[0].values;
  const mrvEvidence = beforeAnalysis.find((r) => r[0] === 'mrv')[3];

  applyPolicyReview(db, {
    as_of: '2026-11-17',
    policies: [
      {
        id: policyId,
        source_reviewed: false,
        sources: [
          {
            url: 'https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-127.44.html',
            finding:
              'Translation-only patch anchored to existing canonical evidence.',
          },
        ],
        analysis: {
          mrv: {
            en: mrvEvidence,
            zh: '翻译测试：遵循法定监测与报告要求。',
            label_zh: '监测与核算',
          },
          incentive: {
            zh: '翻译测试：可退还投资税收抵免。',
            label_zh: '激励机制',
          },
        },
      },
    ],
  });

  const afterPolicy = db.exec(
    'SELECT provenance_last_audit_date FROM policies WHERE id=?',
    [policyId]
  )[0].values[0];
  const afterAnalysis = db.exec(
    'SELECT dimension, score, label, evidence, citation, audit_note FROM policy_analysis WHERE policy_id=? ORDER BY dimension',
    [policyId]
  )[0].values;
  assert.deepEqual(afterPolicy, beforePolicy);
  assert.deepEqual(afterAnalysis, beforeAnalysis);

  const i18nRows = db
    .exec(
      "SELECT dimension, lang, label, evidence, source_evidence, reviewed_at FROM policy_analysis_i18n WHERE policy_id=? AND dimension IN ('mrv','incentive') ORDER BY dimension",
      [policyId]
    )[0]
    .values.map((r) => ({
      dimension: r[0],
      lang: r[1],
      label: r[2],
      evidence: r[3],
      source_evidence: r[4],
      reviewed_at: r[5],
    }));
  assert.equal(i18nRows.length, 2);
  assert.equal(i18nRows[0].dimension, 'incentive');
  assert.equal(
    i18nRows[0].source_evidence,
    beforeAnalysis.find((r) => r[0] === 'incentive')[3]
  );
  assert.equal(i18nRows[1].dimension, 'mrv');
  assert.equal(i18nRows[1].source_evidence, mrvEvidence);
  assert.equal(i18nRows[1].reviewed_at, '2026-11-17');

  const localized = localizeAnalysis(
    { mrv: { score: 80, evidence: mrvEvidence } },
    i18nRows,
    'zh'
  );
  assert.equal(localized.mrv.evidence, '翻译测试：遵循法定监测与报告要求。');
  db.close();
});

test('source_reviewed: false rejects mismatched canonical evidence and rolls back', async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database(
    fs.readFileSync('agent/ccus-ai-agent/db/ccus_master.sqlite')
  );
  const before = db.exec(
    'SELECT policy_id, dimension, evidence, audit_note FROM policy_analysis ORDER BY policy_id, dimension'
  );
  assert.throws(
    () =>
      applyPolicyReview(db, {
        as_of: '2026-11-17',
        policies: [
          {
            id: 'ca-ccus-itc',
            source_reviewed: false,
            sources: [
              {
                url: 'https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-127.44.html',
                finding: 'Mismatched en text without source review.',
              },
            ],
            analysis: {
              mrv: {
                en: 'Different unreviewed canonical text',
                zh: '未核对译文',
                label_zh: '监测与核算',
              },
            },
          },
        ],
      }),
    /without source_reviewed: true/
  );
  assert.deepEqual(
    before,
    db.exec(
      'SELECT policy_id, dimension, evidence, audit_note FROM policy_analysis ORDER BY policy_id, dimension'
    )
  );
  db.close();
});

test('source_reviewed: true sets audit_note and provenance_last_audit_date while preserving scores', async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database(
    fs.readFileSync('agent/ccus-ai-agent/db/ccus_master.sqlite')
  );
  const policyId = 'ca-ccus-itc';
  const beforeScore = db.exec(
    "SELECT score FROM policy_analysis WHERE policy_id=? AND dimension='mrv'",
    [policyId]
  )[0].values[0][0];

  applyPolicyReview(db, {
    as_of: '2026-11-17',
    policies: [
      {
        id: policyId,
        source_reviewed: true,
        sources: [
          {
            url: 'https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-127.44.html',
            finding: 'Primary statutory section reviewed.',
          },
        ],
        analysis: {
          mrv: {
            en: 'Verified statutory reporting requirement.',
            zh: '已核对法定报告要求。',
            label_zh: '监测与核算',
            citation:
              'https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-127.44.html',
          },
        },
      },
    ],
  });

  const afterRow = db.exec(
    "SELECT score, evidence, citation, audit_note FROM policy_analysis WHERE policy_id=? AND dimension='mrv'",
    [policyId]
  )[0].values[0];
  assert.equal(afterRow[0], beforeScore);
  assert.equal(afterRow[1], 'Verified statutory reporting requirement.');
  assert.equal(
    afterRow[2],
    'https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-127.44.html'
  );
  assert.equal(
    afterRow[3],
    'Source text reviewed 2026-11-17; score unchanged.'
  );
  const auditDate = db.exec(
    'SELECT provenance_last_audit_date FROM policies WHERE id=?',
    [policyId]
  )[0].values[0][0];
  assert.equal(auditDate, '2026-11-17');
  db.close();
});

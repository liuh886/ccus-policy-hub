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

function makeValidInsertPatch(overrides = {}) {
  return {
    id: 'test-new-policy-2026',
    sources: [
      {
        url: 'https://example.gov/ccus-act-2026',
        finding: 'Enacted statutory text reviewed.',
      },
    ],
    record: {
      country: 'United States',
      year: 2026,
      status: 'Active',
      category: 'Regulatory',
      legal_weight: 'Primary Legislation',
      source: 'Example Ministry',
      url: 'https://example.gov/ccus-act-2026',
      pub_date: '2026-05-01',
      ...(overrides.record || {}),
    },
    locales: {
      en: {
        title: 'Example CCUS Storage Act 2026',
        description: 'Establishes permitting and liability rules for storage.',
        scope: 'National geological CO2 storage.',
        ...(overrides.enLocale || {}),
      },
      zh: {
        title: '2026年示例CCUS封存法案',
        description: '确立二氧化碳地质封存许可与责任制度。',
        scope: '全国二氧化碳地质封存。',
        ...(overrides.zhLocale || {}),
      },
      ...(overrides.locales || {}),
    },
    analysis: overrides.analysis || {
      incentive: {
        score: 75,
        en: 'Direct tax credit provided in Section 4.',
        zh: '第四条提供直接税收抵免。',
        label_zh: '经济激励',
        citation: 'https://example.gov/ccus-act-2026#sec4',
      },
      market: {
        score: 60,
        en: 'Recognizes verified storage credits in compliance market.',
        citation: 'https://example.gov/ccus-act-2026#sec7',
      },
      mrv: {
        score: 85,
        en: 'Annual third-party MRV reporting mandated.',
        zh: '强制要求年度第三方MRV报告。',
        citation: 'https://example.gov/ccus-act-2026#sec9',
      },
      statutory: {
        score: 90,
        en: 'Binding statutory permitting authority assigned.',
        citation: 'https://example.gov/ccus-act-2026#sec2',
      },
      strategic: {
        score: 70,
        en: 'Aligns with 2035 national storage deployment target.',
        citation: 'https://example.gov/ccus-act-2026#sec1',
      },
    },
    ...overrides.top,
  };
}

test('rejects score updates on existing policies in both default and --allow-insert modes', async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database(
    fs.readFileSync('agent/ccus-ai-agent/db/ccus_master.sqlite')
  );
  const patch = {
    as_of: '2026-11-18',
    policies: [
      {
        id: 'ca-ccus-itc',
        source_reviewed: true,
        sources: [
          {
            url: 'https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-127.44.html',
            finding: 'Attempted score mutation.',
          },
        ],
        analysis: {
          mrv: {
            score: 99,
            en: 'Updated text.',
            zh: '更新文本。',
            label_zh: '技术规范',
            citation:
              'https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-127.44.html',
          },
        },
      },
    ],
  };
  assert.throws(
    () => applyPolicyReview(db, patch, { allowInsert: false }),
    /Cannot modify score/
  );
  assert.throws(
    () => applyPolicyReview(db, patch, { allowInsert: true }),
    /Cannot modify score/
  );
  db.close();
});

test('--allow-insert inserts draft by default and requires source_reviewed + reviewer for verified', async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database(
    fs.readFileSync('agent/ccus-ai-agent/db/ccus_master.sqlite')
  );

  // Requesting verified WITHOUT source_reviewed: true forces draft.
  const draftPatch = makeValidInsertPatch({
    record: { review_status: 'verified' },
    top: {
      id: 'test-draft-insert-2026',
      source_reviewed: false,
      reviewer: 'Alice',
    },
  });
  const draftChanges = applyPolicyReview(
    db,
    { as_of: '2026-11-18', policies: [draftPatch] },
    { allowInsert: true }
  );
  assert.equal(draftChanges[0].review_status, 'draft');
  const draftRow = db.exec(
    'SELECT review_status, provenance_reviewer, provenance_last_audit_date FROM policies WHERE id=?',
    ['test-draft-insert-2026']
  )[0].values[0];
  assert.deepEqual(draftRow, ['draft', null, null]);

  // Requesting verified WITH source_reviewed: true but empty reviewer ALSO forces draft.
  const noReviewerPatch = makeValidInsertPatch({
    record: { review_status: 'verified' },
    top: {
      id: 'test-no-reviewer-2026',
      source_reviewed: true,
      reviewer: '   ',
    },
  });
  const noReviewerChanges = applyPolicyReview(
    db,
    { as_of: '2026-11-18', policies: [noReviewerPatch] },
    { allowInsert: true }
  );
  assert.equal(noReviewerChanges[0].review_status, 'draft');

  // Verified requires BOTH source_reviewed: true AND non-empty reviewer.
  const verifiedPatch = makeValidInsertPatch({
    record: { review_status: 'verified' },
    top: {
      id: 'test-verified-insert-2026',
      source_reviewed: true,
      reviewer: 'Dr. Jane Doe',
    },
  });
  const verifiedChanges = applyPolicyReview(
    db,
    { as_of: '2026-11-18', policies: [verifiedPatch] },
    { allowInsert: true }
  );
  assert.equal(verifiedChanges[0].action, 'insert');
  assert.equal(verifiedChanges[0].review_status, 'verified');
  assert.equal(verifiedChanges[0].translated_dimensions, 2);

  const verifiedRow = db.exec(
    'SELECT review_status, provenance_reviewer, provenance_last_audit_date FROM policies WHERE id=?',
    ['test-verified-insert-2026']
  )[0].values[0];
  assert.deepEqual(verifiedRow, ['verified', 'Dr. Jane Doe', '2026-11-18']);

  const analysisCount = db.exec(
    'SELECT COUNT(*) FROM policy_analysis WHERE policy_id=?',
    ['test-verified-insert-2026']
  )[0].values[0][0];
  assert.equal(analysisCount, 5);

  const i18nRows = db.exec(
    'SELECT dimension, evidence, source_evidence FROM policy_analysis_i18n WHERE policy_id=? ORDER BY dimension',
    ['test-verified-insert-2026']
  )[0].values;
  assert.deepEqual(i18nRows, [
    [
      'incentive',
      '第四条提供直接税收抵免。',
      'Direct tax credit provided in Section 4.',
    ],
    [
      'mrv',
      '强制要求年度第三方MRV报告。',
      'Annual third-party MRV reporting mandated.',
    ],
  ]);
  db.close();
});

test('--allow-insert rejects missing citation, missing locale fields, or invalid scores and rolls back', async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database(
    fs.readFileSync('agent/ccus-ai-agent/db/ccus_master.sqlite')
  );
  const beforeCount = db.exec('SELECT COUNT(*) FROM policies')[0].values[0][0];

  const missingCitation = makeValidInsertPatch({
    top: { id: 'test-bad-citation' },
  });
  missingCitation.analysis.mrv.citation = '  ';
  assert.throws(
    () =>
      applyPolicyReview(
        db,
        { as_of: '2026-11-18', policies: [missingCitation] },
        { allowInsert: true }
      ),
    /citation/
  );

  const missingZh = makeValidInsertPatch({
    top: { id: 'test-bad-locale' },
  });
  delete missingZh.locales.zh;
  assert.throws(
    () =>
      applyPolicyReview(
        db,
        { as_of: '2026-11-18', policies: [missingZh] },
        { allowInsert: true }
      ),
    /locales\.zh required/
  );

  const badScore = makeValidInsertPatch({
    top: { id: 'test-bad-score' },
  });
  badScore.analysis.incentive.score = 105;
  assert.throws(
    () =>
      applyPolicyReview(
        db,
        { as_of: '2026-11-18', policies: [badScore] },
        { allowInsert: true }
      ),
    /integer 0-100/
  );

  assert.equal(
    db.exec('SELECT COUNT(*) FROM policies')[0].values[0][0],
    beforeCount
  );
  db.close();
});

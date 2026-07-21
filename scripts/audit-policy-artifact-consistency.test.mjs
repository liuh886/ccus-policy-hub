import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import test from 'node:test';
import initSqlJs from 'sql.js';

import {
  auditPolicyArtifactConsistency,
  expectedMarkdownPolicy,
  expectedPublicPolicy,
} from './audit-policy-artifact-consistency.mjs';

function writeMarkdown(filePath, frontmatter, body) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `---\n${JSON.stringify(frontmatter, null, 2)}\n---\n\n${body}\n`
  );
}

async function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-consistency-'));
  const dbPath = path.join(root, 'ccus.sqlite');
  const enDir = path.join(root, 'policies/en');
  const zhDir = path.join(root, 'policies/zh');
  const publicPath = path.join(root, 'public/policies.json');
  const dictionaryPath = path.join(root, 'dictionary.json');
  const reportJsonPath = path.join(root, 'report.json');
  const reportMarkdownPath = path.join(root, 'report.md');

  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run(`
    CREATE TABLE policies (
      id TEXT PRIMARY KEY,
      country TEXT,
      year INTEGER,
      status TEXT,
      category TEXT,
      review_status TEXT,
      legal_weight TEXT,
      source TEXT,
      url TEXT,
      pub_date TEXT,
      provenance_author TEXT,
      provenance_reviewer TEXT,
      provenance_last_audit_date TEXT
    );
    CREATE TABLE policy_i18n (
      policy_id TEXT,
      lang TEXT,
      title TEXT,
      description TEXT,
      scope TEXT,
      tags_json TEXT,
      impact_analysis_json TEXT,
      evolution_json TEXT,
      regulatory_json TEXT,
      PRIMARY KEY (policy_id, lang)
    );
    CREATE TABLE policy_analysis (
      policy_id TEXT,
      dimension TEXT,
      score REAL,
      label TEXT,
      evidence TEXT,
      citation TEXT,
      audit_note TEXT,
      PRIMARY KEY (policy_id, dimension)
    );
    CREATE TABLE policy_facility_links (
      policy_id TEXT,
      facility_id TEXT
    );
  `);

  db.run(
    `INSERT INTO policies (
      id, country, year, status, category, review_status, legal_weight,
      source, url, pub_date, provenance_author, provenance_reviewer,
      provenance_last_audit_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'test-policy',
      'China',
      2026,
      'Active',
      'Strategic',
      'verified',
      'National Guidance',
      'Official ministry',
      'https://example.gov/policy',
      '2026-01-02',
      null,
      null,
      null,
    ]
  );
  db.run(
    `INSERT INTO policy_i18n (
      policy_id, lang, title, description, scope, tags_json,
      impact_analysis_json, evolution_json, regulatory_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'test-policy',
      'en',
      'Test policy',
      'English policy body.',
      null,
      '["strategy"]',
      '{}',
      '{"stage":"active"}',
      '{}',
    ]
  );
  db.run(
    `INSERT INTO policy_i18n (
      policy_id, lang, title, description, scope, tags_json,
      impact_analysis_json, evolution_json, regulatory_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'test-policy',
      'zh',
      '测试政策',
      '中文政策正文。',
      null,
      '["战略"]',
      '{}',
      '{"stage":"active"}',
      '{}',
    ]
  );
  db.run(
    `INSERT INTO policy_analysis (
      policy_id, dimension, score, label, evidence, citation, audit_note
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['test-policy', 'strategic', null, null, 'Official evidence', null, null]
  );
  db.run(
    'INSERT INTO policy_facility_links (policy_id, facility_id) VALUES (?, ?)',
    ['test-policy', 'facility-1']
  );

  fs.writeFileSync(dbPath, new Uint8Array(db.export()));
  db.close();

  const dictionary = {
    countries: { 中国: 'China', China: 'China' },
    ui: {
      status: { Active: { zh: '现行' } },
      categories: { Strategic: { zh: '战略引导' } },
    },
  };
  fs.writeFileSync(dictionaryPath, JSON.stringify(dictionary));

  const policy = {
    id: 'test-policy',
    country: 'China',
    year: 2026,
    status: 'Active',
    category: 'Strategic',
    review_status: 'verified',
    legal_weight: 'National Guidance',
    source: 'Official ministry',
    url: 'https://example.gov/policy',
    pub_date: '2026-01-02',
    provenance_author: null,
    provenance_reviewer: null,
    provenance_last_audit_date: null,
    i18n: {
      en: {
        lang: 'en',
        title: 'Test policy',
        description: 'English policy body.',
        scope: null,
        tags_json: '["strategy"]',
        impact_analysis_json: '{}',
        evolution_json: '{"stage":"active"}',
        regulatory_json: '{}',
      },
      zh: {
        lang: 'zh',
        title: '测试政策',
        description: '中文政策正文。',
        scope: null,
        tags_json: '["战略"]',
        impact_analysis_json: '{}',
        evolution_json: '{"stage":"active"}',
        regulatory_json: '{}',
      },
    },
    analysisRows: [
      {
        dimension: 'strategic',
        score: null,
        label: null,
        evidence: 'Official evidence',
        citation: null,
        audit_note: null,
      },
    ],
    relatedFacilities: ['facility-1'],
  };

  const en = expectedMarkdownPolicy(policy, policy.i18n.en, 'en', dictionary);
  const zh = expectedMarkdownPolicy(policy, policy.i18n.zh, 'zh', dictionary);
  writeMarkdown(path.join(enDir, 'test-policy.md'), en.frontmatter, en.body);
  writeMarkdown(path.join(zhDir, 'test-policy.md'), zh.frontmatter, zh.body);

  fs.mkdirSync(path.dirname(publicPath), { recursive: true });
  fs.writeFileSync(
    publicPath,
    JSON.stringify({
      generated_at: 'ignored-by-audit',
      count: 1,
      records: [expectedPublicPolicy(policy)],
    })
  );

  return {
    root,
    paths: {
      dbPath,
      enDir,
      zhDir,
      publicPath,
      dictionaryPath,
      reportJsonPath,
      reportMarkdownPath,
    },
    en,
  };
}

test('passes when Markdown and public JSON are exact SQLite projections', async () => {
  const fixture = await createFixture();
  try {
    assert.equal(fixture.en.frontmatter.provenance, undefined);
    assert.equal(
      fixture.en.frontmatter.analysis.strategic.evidence,
      'Official evidence'
    );
    assert.equal(fixture.en.frontmatter.analysis.strategic.label, undefined);

    const report = await auditPolicyArtifactConsistency(fixture.paths);
    assert.equal(report.pass, true);
    assert.equal(report.summary.mismatches, 0);
    assert.equal(report.summary.db_policies, 1);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('rejects export-time provenance invented outside SQLite', async () => {
  const fixture = await createFixture();
  try {
    const drifted = {
      ...fixture.en.frontmatter,
      provenance: {
        reviewer: 'Human Audit Pending',
        lastAuditDate: '2026-07-21',
      },
    };
    writeMarkdown(
      path.join(fixture.paths.enDir, 'test-policy.md'),
      drifted,
      fixture.en.body
    );

    await assert.rejects(
      auditPolicyArtifactConsistency(fixture.paths),
      /consistency audit failed/i
    );
    const report = JSON.parse(
      fs.readFileSync(fixture.paths.reportJsonPath, 'utf8')
    );
    assert.equal(report.pass, false);
    assert.ok(
      report.mismatches.some(
        (mismatch) =>
          mismatch.policy_id === 'test-policy' &&
          mismatch.artifact === 'markdown:en' &&
          mismatch.field === 'frontmatter'
      )
    );
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

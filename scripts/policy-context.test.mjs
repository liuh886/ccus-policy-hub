import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import initSqlJs from 'sql.js';
import {
  buildPolicyContext,
  contextBundleSchema,
  renderContextMarkdown,
  MAX_RELATIONSHIPS,
} from './lib/policy-context.mjs';
import {
  contextFiles,
  publishContextFiles,
  generatePolicyContexts,
  parseContextArgs,
} from './generate-policy-context.mjs';

let SQL;
before(async () => {
  SQL = await initSqlJs();
});
function fixture() {
  const db = new SQL.Database();
  db.run(`CREATE TABLE policies(id TEXT PRIMARY KEY, country TEXT, year INTEGER, status TEXT, review_status TEXT, legal_weight TEXT, source TEXT, url TEXT, pub_date TEXT, provenance_last_audit_date TEXT);
    CREATE TABLE policy_i18n(policy_id TEXT, lang TEXT, title TEXT, description TEXT, scope TEXT, regulatory_json TEXT, evolution_json TEXT);
    CREATE TABLE policy_analysis(policy_id TEXT, dimension TEXT, score INTEGER, label TEXT, evidence TEXT, citation TEXT);
    CREATE TABLE policy_analysis_i18n(policy_id TEXT, dimension TEXT, lang TEXT, label TEXT, evidence TEXT, source_evidence TEXT);
    CREATE TABLE policy_facility_links(policy_id TEXT, facility_id TEXT, link_type TEXT, confidence REAL, evidence TEXT, source_url TEXT, review_status TEXT);`);
  for (const [id, year, review] of [
    ['us-45q-ira', 2022, 'verified'],
    ['us-obbba-45q-2025', 2025, 'draft'],
  ]) {
    db.run('INSERT INTO policies VALUES (?,?,?,?,?,?,?,?,?,?)', [
      id,
      'United States',
      year,
      'Active',
      review,
      'Tax statute',
      'Fixture publisher',
      `https://example.org/${id}`,
      `${year}-01-01`,
      '2026-01-01',
    ]);
    for (const lang of ['en', 'zh'])
      db.run('INSERT INTO policy_i18n VALUES (?,?,?,?,?,?,?)', [
        id,
        lang,
        lang === 'zh' ? '测试政策' : 'Fixture policy',
        'A maintained narrative, not original statutory text.',
        'Fixture scope',
        '{}',
        JSON.stringify({
          milestones: [{ date: `${year}`, event: 'Fixture event' }],
        }),
      ]);
    db.run('INSERT INTO policy_analysis VALUES (?,?,?,?,?,?)', [
      id,
      'mrv',
      70,
      'Monitoring',
      'Canonical evidence',
      'Fixture citation',
    ]);
  }
  db.run(
    "INSERT INTO policy_facility_links VALUES ('us-45q-ira','fixture-facility','country',0.3,'Same country',NULL,'verified')"
  );
  return db;
}
const codes = (bundle) => bundle.gaps.map((g) => g.code);
function removeTestDirectory(dir) {
  const actual = fs.realpathSync(dir);
  assert.equal(path.dirname(actual), fs.realpathSync(os.tmpdir()));
  assert.match(path.basename(actual), /^ccus-context-/);
  fs.rmSync(actual, { recursive: true });
}

test('family bundles preserve versions, draft status, unknown time and evidence boundaries', () => {
  const db = fixture();
  const bundle = buildPolicyContext(db, 'us-section-45q');
  assert.deepEqual(
    bundle.identity.records.map((r) => r.policy_id),
    ['us-45q-ira', 'us-obbba-45q-2025']
  );
  assert.equal(bundle.identity.records[1].review_status, 'draft');
  assert.equal(bundle.capabilities.clause_level_qa, false);
  assert.equal(bundle.capabilities.project_eligibility, false);
  assert.equal(bundle.capabilities.historical_state, false);
  assert.equal(bundle.capabilities.source_currentness_verified, false);
  assert.ok(codes(bundle).includes('POLICY_REVIEW_PENDING'));
  assert.ok(codes(bundle).includes('DIRECT_PROJECT_EVIDENCE_NOT_AVAILABLE'));
  assert.ok(bundle.sources.every((s) => s.evidence_level === 'record_summary'));
  assert.equal(bundle.relationships.by_type.country, 1);
  assert.equal(bundle.relationships.records[0].confidence, 0.3);
  for (const section of [
    'identity',
    'relationships',
    'time',
    'sources',
    'legal_context',
    'definitions',
  ])
    assert.ok(section in bundle);
  db.close();
});

test('translations are language-labelled and stale translations are ignored', () => {
  const db = fixture();
  db.run(
    "INSERT INTO policy_analysis_i18n VALUES ('us-45q-ira','mrv','zh','监测','已核对译述','Canonical evidence')"
  );
  let bundle = buildPolicyContext(db, 'us-45q-ira', 'zh');
  assert.equal(bundle.legal_context.records[0].analysis[0].language, 'zh');
  db.run(
    "UPDATE policy_analysis SET evidence='Changed evidence' WHERE policy_id='us-45q-ira'"
  );
  bundle = buildPolicyContext(db, 'us-45q-ira', 'zh');
  assert.equal(bundle.legal_context.records[0].analysis[0].language, 'en');
  assert.ok(codes(bundle).includes('ANALYSIS_TRANSLATION_INCOMPLETE'));
  db.run("DELETE FROM policy_i18n WHERE policy_id='us-45q-ira' AND lang='zh'");
  assert.equal(
    buildPolicyContext(db, 'us-45q-ira', 'zh').legal_context.records[0]
      .language,
    'en'
  );
  db.close();
});

test('missing sources and unknown dates remain explicit rather than manufactured', () => {
  const db = fixture();
  db.run(
    'UPDATE policies SET url=NULL, provenance_last_audit_date=NULL, pub_date=NULL'
  );
  const bundle = buildPolicyContext(db, 'us-45q-ira');
  assert.equal(bundle.data_as_of, null);
  assert.deepEqual(bundle.sources, []);
  assert.deepEqual(bundle.legal_context.records[0].source_refs, []);
  assert.ok(codes(bundle).includes('POLICY_SOURCE_URL_NOT_AVAILABLE'));
  assert.equal(bundle.time.records[0].publication_date, null);
  db.close();
});

test('bounded relationships retain complete counts and surface direct evidence first without granting eligibility', () => {
  const db = fixture();
  for (let i = 0; i < MAX_RELATIONSHIPS + 3; i++)
    db.run('INSERT INTO policy_facility_links VALUES (?,?,?,?,?,?,?)', [
      'us-45q-ira',
      `fixture-${i}`,
      'country',
      0.3,
      null,
      null,
      'draft',
    ]);
  db.run(
    "INSERT INTO policy_facility_links VALUES ('us-45q-ira','z-direct','evidence',0.9,'A source names this project','https://example.org/award','verified')"
  );
  const bundle = buildPolicyContext(db, 'us-45q-ira');
  assert.equal(bundle.relationships.total, MAX_RELATIONSHIPS + 5);
  assert.equal(bundle.relationships.returned, MAX_RELATIONSHIPS);
  assert.equal(bundle.relationships.truncated, true);
  assert.equal(bundle.relationships.records[0].facility_id, 'z-direct');
  assert.equal(bundle.capabilities.project_eligibility, false);
  db.close();
});

test('all narrative references resolve and Markdown contains no executable source HTML', () => {
  const db = fixture();
  db.run("UPDATE policy_i18n SET description='<script>untrusted()</script>'");
  const bundle = buildPolicyContext(db, 'us-section-45q');
  const ids = new Set(bundle.sources.map((s) => s.id));
  for (const record of bundle.legal_context.records)
    for (const ref of record.source_refs) assert.ok(ids.has(ref));
  const markdown = renderContextMarkdown(bundle);
  assert.ok(!markdown.includes('<script>'));
  for (const source of bundle.sources)
    assert.ok(markdown.includes(`[${source.id}]: <${source.url}>`));
  for (let i = 1; i <= 6; i++) assert.ok(markdown.includes(`## ${i}.`));
  db.close();
});

test('invalid inputs fail explicitly, with no partial publication', () => {
  const db = fixture();
  assert.throws(() => buildPolicyContext(db, '../../escape'), {
    code: 'CONTEXT_NOT_FOUND',
  });
  assert.throws(() => buildPolicyContext(db, 'us-45q-ira', 'fr'), {
    code: 'UNSUPPORTED_LANGUAGE',
  });
  assert.throws(() => parseContextArgs(['--as-of', '2020-01-01']), {
    code: 'INVALID_ARGUMENT',
  });
  assert.throws(() => parseContextArgs(['--lang', 'zh']), {
    code: 'INVALID_ARGUMENT',
  });
  db.run("DELETE FROM policies WHERE id='us-obbba-45q-2025'");
  assert.throws(() => contextFiles(db), { code: 'POLICY_NOT_FOUND' });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccus-context-path-'));
  try {
    assert.throws(
      () =>
        publishContextFiles(
          new Map([
            ['index.json', '{}'],
            ['../escape', 'bad'],
          ]),
          dir
        ),
      { code: 'INVALID_OUTPUT_PATH' }
    );
    assert.deepEqual(fs.readdirSync(dir), []);
  } finally {
    removeTestDirectory(dir);
    db.close();
  }
});

test('production-schema bundles and generated index hashes are stable; the SQLite file never changes', async () => {
  const db = fixture();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccus-context-'));
  try {
    const dbPath = path.join(dir, 'fixture.sqlite');
    fs.writeFileSync(dbPath, db.export());
    const hash = () =>
      crypto.createHash('sha256').update(fs.readFileSync(dbPath)).digest('hex');
    const before = hash();
    const outputDir = path.join(dir, 'output');
    await generatePolicyContexts({ dbPath, outputDir });
    await generatePolicyContexts({ dbPath, outputDir, check: true });
    assert.equal(hash(), before);
    const index = JSON.parse(
      fs.readFileSync(path.join(outputDir, 'index.json'))
    );
    assert.equal(index.count, 6);
    for (const entry of index.records) {
      const json = fs.readFileSync(path.join(outputDir, entry.json));
      assert.equal(
        crypto.createHash('sha256').update(json).digest('hex'),
        entry.sha256_json
      );
      const markdown = fs.readFileSync(path.join(outputDir, entry.markdown));
      assert.equal(
        crypto.createHash('sha256').update(markdown).digest('hex'),
        entry.sha256_markdown
      );
      contextBundleSchema.parse(JSON.parse(json));
    }
    const schema = JSON.parse(
      fs.readFileSync(
        new URL(
          '../public/data/schemas/context-bundle.schema.json',
          import.meta.url
        )
      )
    );
    assert.deepEqual(
      schema.required.slice().sort(),
      Object.keys(contextBundleSchema.shape).sort()
    );
    fs.appendFileSync(path.join(outputDir, index.records[0].json), ' ');
    await assert.rejects(
      generatePolicyContexts({ dbPath, outputDir, check: true }),
      { code: 'CONTEXT_DRIFT' }
    );
  } finally {
    db.close();
    removeTestDirectory(dir);
  }
});

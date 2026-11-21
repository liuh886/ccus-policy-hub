import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import initSqlJs from 'sql.js';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {
  digest,
  inspectEvidence,
  normalizeOfficialHtml,
} from './lib/source-evidence.mjs';
import {
  DEFAULT_EVIDENCE_ROOT,
  inspectAllEvidence,
  loadEvidencePacket,
  parseEvidenceArgs,
} from './inspect-source-evidence.mjs';
import { sourceEvidenceFiles } from './lib/source-evidence-files.mjs';

const packetPath = new URL(
  './data/evidence/us-45q-2024/packet.json',
  import.meta.url
);
const load = () => loadEvidencePacket(packetPath);
const fresh = () => {
  const p = load();
  return { ...p, input: structuredClone(p.input) };
};

test('frozen official pilot resolves unique versioned anchors and keeps historical coverage explicit', () => {
  const { input, raw } = load();
  const report = inspectEvidence(input, raw);
  assert.equal(report.source_current_through, '2025-01-06');
  assert.equal(report.source_currentness_verified, false);
  assert.equal(report.requires_review, false);
  assert.equal(report.anchors.length, 1);
  for (const a of report.anchors) {
    assert.equal(
      report.normalized_text.slice(a.start_offset, a.end_offset),
      a.exact_quote
    );
    assert.equal(a.offset_unit, 'utf16_code_units');
    assert.equal(a.state, 'verified');
    assert.equal(a.usable_as_reviewed_reference, true);
  }
});

test('unreviewed draft packets stay non-usable until explicit human review', () => {
  const { input, raw } = fresh();
  const draft = {
    status: 'draft',
    reviewer: null,
    reviewed_at: null,
    method: 'not_reviewed',
  };
  input.review = draft;
  input.anchors.forEach((a) => (a.review = draft));
  const report = inspectEvidence(input, raw);
  assert.equal(report.requires_review, true);
  assert.ok(
    report.anchors.every(
      (a) => a.state === 'needs_review' && !a.usable_as_reviewed_reference
    )
  );
});

test('changed source or extractor invalidates previously reviewed anchor usability', () => {
  const { input, raw } = fresh();
  input.review = {
    status: 'verified',
    reviewer: 'Fixture reviewer',
    reviewed_at: '2026-10-29',
    method: 'human',
  };
  input.anchors.forEach((a) => (a.review = input.review));
  assert.ok(
    inspectEvidence(input, raw).anchors.every(
      (a) => a.usable_as_reviewed_reference
    )
  );
  const changed = inspectEvidence(input, raw, {
    observedRaw: Buffer.concat([raw, Buffer.from('changed')]),
  });
  assert.ok(
    changed.anchors.every(
      (a) => a.state === 'source_changed' && !a.usable_as_reviewed_reference
    )
  );
  const parsed = inspectEvidence(input, raw, {
    extractorVersion: 'another-profile',
  });
  assert.ok(
    parsed.anchors.every(
      (a) => a.state === 'extractor_changed' && !a.usable_as_reviewed_reference
    )
  );
});

test('corrupt raw bytes, extraction hashes, anchors and wrong editions fail closed', () => {
  let p = fresh();
  assert.throws(
    () => inspectEvidence(p.input, Buffer.concat([p.raw, Buffer.from('x')])),
    { code: 'RAW_HASH_MISMATCH' }
  );
  p.input.normalized_sha256 = '0'.repeat(64);
  assert.throws(() => inspectEvidence(p.input, p.raw), {
    code: 'TEXT_HASH_MISMATCH',
  });
  p = fresh();
  p.input.anchors[0].version_sha256 = '0'.repeat(64);
  assert.throws(() => inspectEvidence(p.input, p.raw), {
    code: 'ANCHOR_VERSION_MISMATCH',
  });
  p = fresh();
  p.input.anchors[0].exact_quote = 'not a real clause';
  assert.throws(() => inspectEvidence(p.input, p.raw), {
    code: 'ANCHOR_NOT_UNIQUE',
  });
  p = fresh();
  p.input.source_current_through = '2026-01-01';
  assert.throws(() => inspectEvidence(p.input, p.raw), {
    code: 'EDITION_MISMATCH',
  });
  p = fresh();
  p.input.edition = '2025';
  assert.throws(() => inspectEvidence(p.input, p.raw), {
    code: 'EDITION_MISMATCH',
  });
});

test('duplicate IDs and unsupported source paths are rejected', () => {
  let p = fresh();
  p.input.anchors.push(p.input.anchors[0]);
  assert.throws(() => inspectEvidence(p.input, p.raw), {
    code: 'DUPLICATE_ANCHOR',
  });
  for (const field of ['source_url', 'raw_file']) {
    p = fresh();
    p.input[field] = '../../escape';
    assert.throws(() => inspectEvidence(p.input, p.raw));
  }
});

test('an HTTP success containing an error page is not treated as a statute', () => {
  assert.throws(
    () =>
      normalizeOfficialHtml(
        Buffer.from('<html><body>Page not found</body></html>')
      ),
    { code: 'UNEXPECTED_SOURCE' }
  );
});

test('normalization rejects unsupported entities and bounded source sizes', () => {
  const { raw } = load();
  const entity = Buffer.from(
    raw.toString().replace('</body>', '&unexpected;</body>')
  );
  assert.throws(() => normalizeOfficialHtml(entity), {
    code: 'UNSUPPORTED_ENTITY',
  });
  assert.throws(() => normalizeOfficialHtml(Buffer.alloc(512 * 1024 + 1)), {
    code: 'SOURCE_TOO_LARGE',
  });
  assert.throws(() => normalizeOfficialHtml(Buffer.from([0xff])));
});

test('P3 cross-jurisdiction official-html-v1 packets resolve unique anchors and record human snapshot review', () => {
  for (const [dir, expectedLang] of [
    ['ca-ccus-itc-2026', 'en'],
    ['no-for-2014-1517', 'no'],
    ['dk-ens-ccs-funds', 'en'],
  ]) {
    const { input, raw } = loadEvidencePacket(
      new URL(`./data/evidence/${dir}/packet.json`, import.meta.url)
    );
    const report = inspectEvidence(input, raw);
    assert.equal(report.source_language, expectedLang);
    assert.equal(report.source_currentness_verified, false);
    assert.equal(report.requires_review, false);
    assert.equal(input.review.status, 'verified');
    assert.equal(input.review.reviewer, 'liuh886');
    assert.equal(input.review.reviewed_at, '2026-11-19');
    assert.equal(input.review.method, 'human');
    assert.equal(report.anchors.length, 1);
    for (const a of report.anchors) {
      assert.equal(
        report.normalized_text.slice(a.start_offset, a.end_offset),
        a.exact_quote
      );
      assert.equal(a.offset_unit, 'utf16_code_units');
      assert.equal(a.state, 'verified');
      assert.equal(a.usable_as_reviewed_reference, true);
    }
  }
});

test('official-html-v1 rejects WAF/soft-404 shells and unknown entities while normalizing Latin/Nordic text', () => {
  for (const badHtml of [
    '<html><title>404 Not Found</title><body>Page not found</body></html>',
    '<html><body><p>Generated by cloudfront</p><p>The request could not be satisfied.</p></body></html>',
    '<html><title>Just a moment...</title><body>Enable JavaScript and cookies to continue</body></html>',
    '<html><body>   </body></html>',
  ]) {
    assert.throws(
      () => normalizeOfficialHtml(Buffer.from(badHtml), 'official-html-v1'),
      { code: 'UNEXPECTED_SOURCE' }
    );
  }
  assert.throws(
    () =>
      normalizeOfficialHtml(
        Buffer.from('<html><body>Valid text &unknownentity;</body></html>'),
        'official-html-v1'
      ),
    { code: 'UNSUPPORTED_ENTITY' }
  );
  const normalized = normalizeOfficialHtml(
    Buffer.from(
      '<html><body><section><p>Fran&ccedil;ais\u200d 2&times;3 cafe\u0301\u2009line</p></section></body></html>'
    ),
    'official-html-v1'
  );
  assert.equal(normalized, 'Français 2×3 café line\n');
});

test('Git snapshot publication joins existing policies, is deterministic across all 8 packets and leaves SQLite unchanged', async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  try {
    db.run('CREATE TABLE policies(id TEXT PRIMARY KEY)');
    for (const id of [
      'us-45q-ira',
      'ca-ccus-itc',
      'no-storage-framework',
      'denmark-ccfd',
      'cn-ccer',
      'us-epa-class-vi-primacy',
      'uk-ccus-vision',
      'eu-innovation-fund',
    ])
      db.run('INSERT INTO policies VALUES (?)', [id]);
    const before = digest(db.export());
    const first = sourceEvidenceFiles(db),
      second = sourceEvidenceFiles(db);
    assert.deepEqual([...first.keys()], [...second.keys()]);
    for (const [name, bytes] of first)
      assert.equal(digest(bytes), digest(second.get(name)));
    assert.equal(first.size, 25);
    const index = JSON.parse(first.get('index.json'));
    assert.equal(index.count, 8);
    assert.deepEqual(
      index.records.map((r) => r.document_id),
      [
        'ca-ccus-itc-2026',
        'cn-ccer-2026',
        'dk-ens-ccs-funds',
        'eu-innovation-fund-ec',
        'no-for-2014-1517',
        'uk-ccus-vision',
        'us-45q-usc-2024',
        'us-epa-class-vi-primacy',
      ]
    );
    assert.equal(digest(db.export()), before);
    db.run('DELETE FROM policies');
    assert.throws(() => sourceEvidenceFiles(db), { code: 'POLICY_NOT_FOUND' });
  } finally {
    db.close();
  }
});

test('real policy database remains byte-identical during source projection', async () => {
  const dbPath = new URL(
    '../agent/ccus-ai-agent/db/ccus_master.sqlite',
    import.meta.url
  );
  const bytes = fs.readFileSync(dbPath);
  const SQL = await initSqlJs();
  const db = new SQL.Database(bytes);
  try {
    sourceEvidenceFiles(db);
    assert.equal(digest(fs.readFileSync(dbPath)), digest(bytes));
  } finally {
    db.close();
  }
});

test('CLI rejects migration, write, network and incomplete options', () => {
  for (const args of [
    ['--preview-migration'],
    ['--write'],
    ['--fetch'],
    ['--file'],
    ['--all', '--file', 'packet.json'],
    ['--all', '--observed-file', 'raw.html'],
    ['--evidence-root', 'scripts/data/evidence'],
    ['--observed-file', 'raw.html'],
    ['--all', '--all'],
    [],
  ])
    assert.throws(() => parseEvidenceArgs(args), { code: 'INVALID_ARGUMENT' });
  assert.deepEqual(parseEvidenceArgs(['--all']), { all: true });
});

test('inspectAllEvidence inspects all frozen packets deterministically and fails closed on regressions', () => {
  const summary = inspectAllEvidence(DEFAULT_EVIDENCE_ROOT);
  assert.equal(summary.count, 8);
  assert.equal(summary.requires_review_count, 4);
  assert.deepEqual(
    summary.packets.map((p) => p.document_id),
    [
      'ca-ccus-itc-2026',
      'cn-ccer-2026',
      'dk-ens-ccs-funds',
      'eu-innovation-fund-ec',
      'no-for-2014-1517',
      'uk-ccus-vision',
      'us-45q-usc-2024',
      'us-epa-class-vi-primacy',
    ]
  );
  assert.ok(summary.packets.every((p) => p.normalized_characters > 0));

  const emptyDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'ccus-evidence-empty-')
  );
  try {
    assert.throws(() => inspectAllEvidence(emptyDir), {
      code: 'EVIDENCE_NOT_FOUND',
    });
    assert.throws(
      () => inspectAllEvidence(path.join(emptyDir, 'missing-subdir')),
      { code: 'EVIDENCE_NOT_FOUND' }
    );

    const { input, raw } = load();
    const dupA = path.join(emptyDir, 'a');
    const dupB = path.join(emptyDir, 'b');
    fs.mkdirSync(dupA);
    fs.mkdirSync(dupB);
    fs.writeFileSync(path.join(dupA, 'packet.json'), JSON.stringify(input));
    fs.writeFileSync(path.join(dupA, 'source.html'), raw);
    fs.writeFileSync(path.join(dupB, 'packet.json'), JSON.stringify(input));
    fs.writeFileSync(path.join(dupB, 'source.html'), raw);
    assert.throws(() => inspectAllEvidence(emptyDir), {
      code: 'DUPLICATE_DOCUMENT',
    });

    fs.rmSync(dupB, { recursive: true, force: true });
    fs.writeFileSync(
      path.join(dupA, 'source.html'),
      Buffer.concat([raw, Buffer.from('tamper')])
    );
    assert.throws(() => inspectAllEvidence(emptyDir), {
      code: 'RAW_HASH_MISMATCH',
    });
  } finally {
    fs.rmSync(emptyDir, { recursive: true, force: true });
  }
});

test('external_archive seam validates without source.html, skips *.html.txt output, and rejects missing external_uri', async () => {
  const rawBytes = Buffer.from(
    '<html><body><p>External archive synthetic statute text.</p></body></html>'
  );
  const normalized = normalizeOfficialHtml(rawBytes, 'official-html-v1');
  const rawSha = digest(rawBytes);
  const normSha = digest(normalized);
  const draft = {
    status: 'draft',
    reviewer: null,
    reviewed_at: null,
    method: 'not_reviewed',
  };
  const externalPacket = {
    schema_version: '1.0.0',
    storage: 'external_archive',
    external_uri: 'https://archive.example.org/snapshots/fixture.html',
    bytes: rawBytes.length,
    document_id: 'ext-archive-fixture',
    policy_id: 'us-45q-ira',
    title: { en: 'External Archive Fixture', zh: '外部归档测试' },
    source_url: 'https://official.example.org/law',
    source_language: 'en',
    edition: '2026',
    fetched_at: '2026-11-19T00:00:00Z',
    published_at: null,
    source_current_through: null,
    raw_sha256: rawSha,
    normalized_sha256: normSha,
    extractor_version: 'official-html-v1',
    review: draft,
    anchors: [
      {
        id: 'clause-1',
        locator: 'Section 1',
        exact_quote: 'External archive synthetic statute text.',
        version_sha256: rawSha,
        review: draft,
      },
    ],
  };

  // Missing external_uri or http:// external_uri or missing bytes must fail packet schema
  const missingUri = structuredClone(externalPacket);
  delete missingUri.external_uri;
  assert.throws(() => inspectEvidence(missingUri, null));

  const httpUri = structuredClone(externalPacket);
  httpUri.external_uri = 'http://archive.example.org/insecure.html';
  assert.throws(() => inspectEvidence(httpUri, null));

  const missingBytes = structuredClone(externalPacket);
  delete missingBytes.bytes;
  assert.throws(() => inspectEvidence(missingBytes, null));

  // Valid external_archive without source.html on disk
  const inspected = inspectEvidence(externalPacket, null);
  assert.equal(inspected.storage, 'external_archive');
  assert.equal(inspected.normalized_text, null);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccus-ext-archive-'));
  const packetDir = path.join(tmpDir, 'ext-archive-fixture');
  fs.mkdirSync(packetDir);
  fs.writeFileSync(
    path.join(packetDir, 'packet.json'),
    JSON.stringify(externalPacket)
  );

  const SQL = await initSqlJs();
  const db = new SQL.Database();
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const schema = JSON.parse(
    fs.readFileSync(
      new URL(
        '../public/data/schemas/source-evidence.schema.json',
        import.meta.url
      ),
      'utf8'
    )
  );
  const validateSchema = ajv.compile(schema);
  try {
    db.run('CREATE TABLE policies(id TEXT PRIMARY KEY)');
    db.run('INSERT INTO policies VALUES (?)', ['us-45q-ira']);
    const files = sourceEvidenceFiles(db, { rootDir: tmpDir });
    assert.ok(!files.has(`ext-archive-fixture/${rawSha}.html.txt`));
    assert.ok(!files.has(`ext-archive-fixture/${rawSha}.normalized.txt`));
    const published = JSON.parse(files.get('ext-archive-fixture.json'));
    assert.equal(published.storage, 'external_archive');
    assert.equal(published.raw_file, null);
    assert.equal(published.normalized_file, null);
    assert.equal(
      validateSchema(published),
      true,
      ajv.errorsText(validateSchema.errors)
    );

    // Public schema rejects external_archive record missing external_uri or setting non-null raw_file
    const badSchemaRecord = structuredClone(published);
    delete badSchemaRecord.external_uri;
    assert.equal(validateSchema(badSchemaRecord), false);
    const badRawFileRecord = structuredClone(published);
    badRawFileRecord.raw_file = `ext-archive-fixture/${rawSha}.html.txt`;
    assert.equal(validateSchema(badRawFileRecord), false);
  } finally {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

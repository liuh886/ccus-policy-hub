import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import initSqlJs from 'sql.js';
import {
  digest,
  inspectEvidence,
  normalizeOfficialHtml,
} from './lib/source-evidence.mjs';
import {
  loadEvidencePacket,
  stageEvidenceCandidate,
  previewEvidenceMigration,
  parseEvidenceArgs,
} from './inspect-source-evidence.mjs';
import { queryRows } from './lib/sqlite-query.mjs';

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
  assert.equal(report.anchors.length, 2);
  for (const a of report.anchors) {
    assert.equal(
      report.normalized_text.slice(a.start_offset, a.end_offset),
      a.exact_quote
    );
    assert.equal(a.offset_unit, 'utf16_code_units');
    assert.equal(a.state, 'needs_review');
    assert.equal(a.publishable, false);
  }
  assert.ok(
    report.conditions.every((c) => c.state === 'unknown' && !c.publishable)
  );
});

test('changed source or extractor invalidates previously reviewed anchor usability', () => {
  const { input, raw } = fresh();
  input.review = {
    status: 'verified',
    reviewer: 'Fixture reviewer',
    reviewed_at: '2026-10-29',
  };
  input.anchors.forEach((a) => (a.review = input.review));
  assert.ok(inspectEvidence(input, raw).anchors.every((a) => a.publishable));
  const changed = inspectEvidence(input, raw, {
    observedRaw: Buffer.concat([raw, Buffer.from('changed')]),
  });
  assert.ok(
    changed.anchors.every((a) => a.state === 'source_changed' && !a.publishable)
  );
  const parsed = inspectEvidence(input, raw, {
    extractorVersion: 'another-profile',
  });
  assert.ok(
    parsed.anchors.every(
      (a) => a.state === 'extractor_changed' && !a.publishable
    )
  );
  assert.ok(parsed.conditions.every((c) => c.state === 'unknown'));
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

test('duplicate IDs, orphan conditions and unsupported source paths are rejected', () => {
  let p = fresh();
  p.input.anchors.push(p.input.anchors[0]);
  assert.throws(() => inspectEvidence(p.input, p.raw), {
    code: 'DUPLICATE_ANCHOR',
  });
  p = fresh();
  p.input.condition_drafts[0].anchor_id = 'missing';
  assert.throws(() => inspectEvidence(p.input, p.raw), {
    code: 'DANGLING_CONDITION',
  });
  p = fresh();
  p.input.condition_drafts.push(p.input.condition_drafts[0]);
  assert.throws(() => inspectEvidence(p.input, p.raw), {
    code: 'DUPLICATE_CONDITION',
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

test('draft staging is transactional, idempotent and retains all existing policy data', async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  try {
    db.run(
      "CREATE TABLE policies(id TEXT PRIMARY KEY, note TEXT); INSERT INTO policies VALUES ('us-45q-ira','unchanged')"
    );
    const { input, raw } = load();
    stageEvidenceCandidate(db, input, raw);
    stageEvidenceCandidate(db, input, raw);
    assert.equal(
      queryRows(db, 'SELECT COUNT(*) n FROM source_document_versions')[0].n,
      1
    );
    assert.equal(
      queryRows(db, 'SELECT COUNT(*) n FROM source_document_anchors')[0].n,
      2
    );
    assert.deepEqual(queryRows(db, 'SELECT * FROM policies'), [
      { id: 'us-45q-ira', note: 'unchanged' },
    ]);
    const version = queryRows(db, 'SELECT * FROM source_document_versions')[0];
    assert.equal(version.review_status, 'draft');
    assert.equal(digest(version.raw_content), input.raw_sha256);
    const conflict = structuredClone(input);
    conflict.title.en = 'Another title';
    assert.throws(() => stageEvidenceCandidate(db, conflict, raw), {
      code: 'DOCUMENT_ID_CONFLICT',
    });
    assert.equal(queryRows(db, 'PRAGMA foreign_key_check').length, 0);
    assert.throws(() =>
      db.run("UPDATE source_document_versions SET review_status='verified'")
    );
  } finally {
    db.close();
  }
});

test('unknown policy rolls back DDL and candidates cannot self-promote', async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  try {
    db.run('CREATE TABLE policies(id TEXT PRIMARY KEY)');
    const { input, raw } = fresh();
    assert.throws(() => stageEvidenceCandidate(db, input, raw));
    assert.equal(
      queryRows(db, "SELECT name FROM sqlite_master WHERE name LIKE 'source_%'")
        .length,
      0
    );
    input.review = {
      status: 'verified',
      reviewer: 'Fixture reviewer',
      reviewed_at: '2026-10-29',
    };
    assert.throws(() => stageEvidenceCandidate(db, input, raw), {
      code: 'REVIEW_PROMOTION_FORBIDDEN',
    });
  } finally {
    db.close();
  }
});

test('real SSOT preview creates only a disposable copy and leaves bytes unchanged', async () => {
  const dbPath = new URL(
    '../agent/ccus-ai-agent/db/ccus_master.sqlite',
    import.meta.url
  );
  const before = digest(fs.readFileSync(dbPath));
  const { input, raw } = load();
  const result = await previewEvidenceMigration(dbPath, input, raw);
  assert.equal(result.source_database_written, false);
  assert.equal(result.schema_approval_required, true);
  assert.equal(result.added_tables.length, 3);
  assert.deepEqual(Object.values(result.candidate_table_rows), [1, 1, 2]);
  assert.equal(digest(fs.readFileSync(dbPath)), before);
});

test('CLI rejects writes, network fetches and unsupported or incomplete options', () => {
  for (const args of [
    ['--write'],
    ['--fetch'],
    ['--file'],
    ['--file', 'x', '--observed-file', 'y', '--preview-migration'],
  ])
    assert.throws(() => parseEvidenceArgs(args), { code: 'INVALID_ARGUMENT' });
});

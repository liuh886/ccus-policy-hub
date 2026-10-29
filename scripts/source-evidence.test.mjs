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
  assert.equal(report.anchors.length, 1);
  for (const a of report.anchors) {
    assert.equal(
      report.normalized_text.slice(a.start_offset, a.end_offset),
      a.exact_quote
    );
    assert.equal(a.offset_unit, 'utf16_code_units');
    assert.equal(a.state, 'needs_review');
    assert.equal(a.usable_as_reviewed_reference, false);
  }
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

test('Git snapshot publication joins an existing policy, is deterministic and leaves SQLite unchanged', async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  try {
    db.run(
      "CREATE TABLE policies(id TEXT PRIMARY KEY); INSERT INTO policies VALUES ('us-45q-ira')"
    );
    const before = digest(db.export());
    const first = sourceEvidenceFiles(db),
      second = sourceEvidenceFiles(db);
    assert.deepEqual([...first.keys()], [...second.keys()]);
    for (const [name, bytes] of first)
      assert.equal(digest(bytes), digest(second.get(name)));
    assert.equal(first.size, 4);
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
  ])
    assert.throws(() => parseEvidenceArgs(args), { code: 'INVALID_ARGUMENT' });
});

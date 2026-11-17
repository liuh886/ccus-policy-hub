import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { consumeSourceEvidence } from './consume-source-evidence.mjs';

const root = fileURLToPath(new URL('../public/', import.meta.url));
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, 'data/manifest.json'))
);
const base = new URL(manifest.base_url + '/');
const manifestUrl = new URL('data/manifest.json', base);
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
function consumer() {
  const overrides = new Map();
  const url = (value) => new URL(value, base).href;
  const read = (value) =>
    overrides.get(String(value)) ||
    fs.readFileSync(
      path.join(root, new URL(value).pathname.slice(base.pathname.length))
    );
  const get = (value) => JSON.parse(read(url(value)));
  const set = (value, object) =>
    overrides.set(url(value), Buffer.from(JSON.stringify(object)));
  const changeRecord = (dataset, recordField, hashField, mutate) => {
    const indexUrl = manifest.datasets[dataset].file;
    const index = get(indexUrl);
    const entry = index.records[0];
    const recordUrl = new URL(entry[recordField], indexUrl).href;
    const record = get(recordUrl);
    mutate(record);
    set(recordUrl, record);
    entry[hashField] = hash(read(recordUrl));
    set(indexUrl, index);
  };
  return {
    run: () => consumeSourceEvidence(manifestUrl, read),
    overrides,
    url,
    get,
    set,
    changeRecord,
  };
}

test('independent public consumer validates all bundles, schemas and references and reports pending human review', async () => {
  const result = await consumer().run();
  assert.equal(result.context_bundles, 6);
  assert.equal(result.source_documents, 1);
  assert.ok(result.resolved_references > 0);
  assert.equal(result.reviewed_anchors, 0);
  assert.equal(result.human_review_pending, true);
  assert.equal(result.source_currentness_verified, false);
});

test('schema validation rejects forged capability and reviewed-state claims even when file hashes are recomputed', async () => {
  let c = consumer();
  c.changeRecord(
    'context',
    'json',
    'sha256_json',
    (record) => (record.capabilities.project_eligibility = true)
  );
  await assert.rejects(c.run(), /Public schema rejected/);
  c = consumer();
  c.changeRecord(
    'source_evidence',
    'file',
    'sha256',
    (record) => (record.anchors[0].usable_as_reviewed_reference = true)
  );
  await assert.rejects(c.run(), /Public schema rejected/);
  c = consumer();
  c.changeRecord(
    'source_evidence',
    'file',
    'sha256',
    (record) => (record.source_currentness_verified = true)
  );
  await assert.rejects(c.run(), /Public schema rejected/);
});

test('consumer rejects dangling record references and shifted text anchors', async () => {
  let c = consumer();
  c.changeRecord('context', 'json', 'sha256_json', (record) =>
    record.legal_context.records[0].source_refs.push('missing-source')
  );
  await assert.rejects(c.run(), /Unresolved source reference/);
  c = consumer();
  c.changeRecord(
    'source_evidence',
    'file',
    'sha256',
    (record) => record.anchors[0].start_offset++
  );
  await assert.rejects(c.run(), /Anchor quote mismatch/);
});

test('consumer detects original source tampering without importing the private extractor', async () => {
  const c = consumer();
  const indexUrl = manifest.datasets.source_evidence.file;
  const index = c.get(indexUrl);
  const record = c.get(new URL(index.records[0].file, indexUrl).href);
  c.overrides.set(
    new URL(record.raw_file, indexUrl).href,
    Buffer.from('changed official bytes')
  );
  await assert.rejects(c.run(), /Evidence source hash mismatch/);
});

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
  const changeRecord = (
    dataset,
    recordField,
    hashField,
    mutate,
    predicate = () => true
  ) => {
    const indexUrl = manifest.datasets[dataset].file;
    const index = get(indexUrl);
    const entry = index.records.find(predicate);
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

const contextTargets = JSON.parse(
  fs.readFileSync(
    new URL('./data/context-targets.json', import.meta.url),
    'utf8'
  )
).targets;
const expectedBundles = contextTargets.length * 2;
const liveEvidenceIndex = JSON.parse(
  fs.readFileSync(path.join(root, 'data/evidence/index.json'), 'utf8')
);
const liveEvidenceRecords = liveEvidenceIndex.records.map((entry) =>
  JSON.parse(
    fs.readFileSync(path.join(root, 'data/evidence', entry.file), 'utf8')
  )
);
const expectedDocs = liveEvidenceIndex.records.length;
const expectedReviewedAnchors = liveEvidenceRecords.reduce(
  (sum, rec) =>
    sum + rec.anchors.filter((a) => a.usable_as_reviewed_reference).length,
  0
);
const expectedUnreviewedAnchors = liveEvidenceRecords.reduce(
  (sum, rec) =>
    sum + rec.anchors.filter((a) => !a.usable_as_reviewed_reference).length,
  0
);
const expectedReviewedDocs = liveEvidenceRecords.filter(
  (rec) =>
    rec.review.status === 'verified' &&
    rec.anchors.some((a) => a.usable_as_reviewed_reference)
).length;
const expectedDraftDocs = expectedDocs - expectedReviewedDocs;
const liveBaseline = {
  context_bundles: expectedBundles,
  source_documents: expectedDocs,
  reviewed_documents: expectedReviewedDocs,
  draft_documents: expectedDraftDocs,
  reviewed_anchors: expectedReviewedAnchors,
  unreviewed_anchors: expectedUnreviewedAnchors,
  human_review_pending: expectedDraftDocs > 0 || expectedUnreviewedAnchors > 0,
};

test('independent public consumer validates all bundles, schemas, references and published evidence packets', async () => {
  const result = await consumer().run();
  assert.ok(expectedDocs >= 8);
  assert.equal(result.context_bundles, expectedBundles);
  assert.equal(result.source_documents, expectedDocs);
  assert.equal(result.reviewed_documents, expectedReviewedDocs);
  assert.equal(result.draft_documents, expectedDraftDocs);
  assert.equal(
    result.reviewed_documents + result.draft_documents,
    result.source_documents
  );
  assert.ok(result.resolved_references > 0);
  assert.equal(result.reviewed_anchors, expectedReviewedAnchors);
  assert.equal(result.unreviewed_anchors, expectedUnreviewedAnchors);
  assert.equal(result.human_review_pending, liveBaseline.human_review_pending);
  assert.equal(result.source_currentness_verified, false);
});

test('consumer separates valid draft packets from reviewed packets when a packet is unreviewed', async () => {
  const baseline = await consumer().run();
  const c = consumer();
  const indexUrl = manifest.datasets.source_evidence.file;
  const index = c.get(indexUrl);
  const entry =
    index.records.find(
      (r) =>
        r.document_id === 'ca-ccus-itc-2026' && r.review_status === 'verified'
    ) || index.records.find((r) => r.review_status === 'verified');
  assert.ok(entry, 'Expected at least one verified evidence record.');
  const recordUrl = new URL(entry.file, indexUrl).href;
  const record = c.get(recordUrl);
  const flippedAnchors = record.anchors.filter(
    (a) => a.usable_as_reviewed_reference
  ).length;
  const draft = {
    status: 'draft',
    reviewer: null,
    reviewed_at: null,
    method: 'not_reviewed',
  };
  record.review = draft;
  for (const anchor of record.anchors) {
    anchor.state = 'needs_review';
    anchor.review = { ...draft };
    anchor.usable_as_reviewed_reference = false;
  }
  record.gaps = [...new Set(['HUMAN_ANCHOR_REVIEW_PENDING', ...record.gaps])];
  c.set(recordUrl, record);
  entry.sha256 = hash(c.overrides.get(recordUrl));
  entry.review_status = 'draft';
  c.set(indexUrl, index);
  const result = await c.run();
  assert.equal(result.source_documents, baseline.source_documents);
  assert.equal(result.reviewed_documents, baseline.reviewed_documents - 1);
  assert.equal(result.draft_documents, baseline.draft_documents + 1);
  assert.equal(
    result.reviewed_anchors,
    baseline.reviewed_anchors - flippedAnchors
  );
  assert.equal(
    result.unreviewed_anchors,
    baseline.unreviewed_anchors + flippedAnchors
  );
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
    (record) => {
      record.review = {
        status: 'draft',
        reviewer: null,
        reviewed_at: null,
        method: 'not_reviewed',
      };
    },
    (entry) => entry.document_id === 'us-45q-usc-2024'
  );
  await assert.rejects(c.run(), /Public schema rejected/);
  c = consumer();
  c.changeRecord(
    'source_evidence',
    'file',
    'sha256',
    (record) => {
      record.review = {
        status: 'draft',
        reviewer: null,
        reviewed_at: null,
        method: 'not_reviewed',
      };
      record.anchors[0].state = 'needs_review';
      record.anchors[0].review = { ...record.review };
      record.anchors[0].usable_as_reviewed_reference = true;
    },
    (entry) => entry.document_id === 'ca-ccus-itc-2026'
  );
  await assert.rejects(c.run(), /Public schema rejected/);
  c = consumer();
  c.changeRecord(
    'source_evidence',
    'file',
    'sha256',
    (record) => {
      record.anchors[0].review = {
        status: 'draft',
        reviewer: null,
        reviewed_at: null,
        method: 'not_reviewed',
      };
    },
    (entry) => entry.document_id === 'us-45q-usc-2024'
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

test('consumer supports external_archive records without raw_file while rejecting missing external_uri', async () => {
  const baseline = await consumer().run();
  const c = consumer();
  const indexUrl = manifest.datasets.source_evidence.file;
  const index = c.get(indexUrl);
  const entry = index.records.find((r) => r.document_id === 'us-45q-usc-2024');
  const recordUrl = new URL(entry.file, indexUrl).href;
  const record = c.get(recordUrl);
  record.storage = 'external_archive';
  record.external_uri = 'https://archive.example.org/us-45q-usc-2024.html';
  record.bytes = 12345;
  record.raw_file = null;
  c.set(recordUrl, record);
  entry.sha256 = hash(c.overrides.get(recordUrl));
  c.set(indexUrl, index);

  const result = await c.run();
  assert.equal(result.source_documents, baseline.source_documents);
  assert.equal(result.reviewed_documents, baseline.reviewed_documents);

  // Missing external_uri fails schema validation even with recomputed hashes
  delete record.external_uri;
  c.set(recordUrl, record);
  entry.sha256 = hash(c.overrides.get(recordUrl));
  c.set(indexUrl, index);
  await assert.rejects(c.run(), /Public schema rejected/);
});

test('consumer validates evidence policy_id against the full policy corpus rather than context targets', async () => {
  const contextPolicyIds = new Set(contextTargets.flatMap((t) => t.policy_ids));
  const policies = JSON.parse(
    fs.readFileSync(path.join(root, 'data/policies.json'), 'utf8')
  );
  const nonContextPolicy = policies.records.find(
    (p) => !contextPolicyIds.has(p.id)
  );
  assert.ok(
    nonContextPolicy,
    'Expected at least one policy in public/data/policies.json outside context-targets.json'
  );

  const c = consumer();
  const indexUrl = manifest.datasets.source_evidence.file;
  const index = c.get(indexUrl);
  const entry = index.records[0];
  const recordUrl = new URL(entry.file, indexUrl).href;
  const record = c.get(recordUrl);

  record.policy_id = nonContextPolicy.id;
  entry.policy_id = nonContextPolicy.id;
  c.set(recordUrl, record);
  entry.sha256 = hash(c.overrides.get(recordUrl));
  c.set(indexUrl, index);

  const result = await c.run();
  assert.equal(result.source_documents, liveBaseline.source_documents);

  record.policy_id = 'nonexistent-policy-id';
  entry.policy_id = 'nonexistent-policy-id';
  c.set(recordUrl, record);
  entry.sha256 = hash(c.overrides.get(recordUrl));
  c.set(indexUrl, index);
  await assert.rejects(
    c.run(),
    /Evidence policy is absent from policy records/
  );
});

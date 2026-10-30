import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  captureManualObservations,
  reconcileManualObservations,
} from './lib/manual-source-observations.mjs';
import {
  buildReadiness,
  captureObservations,
  parseCsv,
  sha256,
} from './lib/source-readiness.mjs';
import {
  generateReadiness,
  loadPackets,
} from './audit-policy-source-readiness.mjs';

const inventory = 'a'.repeat(64);
const policies = [
  {
    id: 'one',
    country: 'Fixture',
    url: 'https://example.org/law',
    review_status: 'verified',
  },
  {
    id: 'two',
    country: 'Fixture',
    url: 'https://example.org/programme',
    review_status: 'draft',
  },
];
const report = (options = {}) =>
  buildReadiness({
    policies,
    inventorySha: inventory,
    asOf: '2026-10-30',
    ...options,
  });
const human = {
  status: 'verified',
  method: 'human',
  reviewer: 'Synthetic fixture reviewer',
  reviewed_at: '2026-10-30',
};
function packet(id = 'doc-one') {
  const raw = Buffer.from(
      '<html><body>Historical fixture source.</body></html>'
    ),
    normalized = Buffer.from('Historical fixture source.\n');
  return {
    raw,
    normalized,
    data: {
      document_id: id,
      policy_id: 'one',
      raw_sha256: sha256(raw),
      normalized_sha256: sha256(normalized),
      edition: '2024',
      source_current_through: '2025-01-06',
      coverage: 'historical_snapshot',
      extractor_version: 'fixture-v1',
      review: { status: 'draft' },
      anchors: [
        {
          exact_quote: 'Historical fixture source.',
          start_offset: 0,
          end_offset: 26,
          offset_unit: 'utf16_code_units',
          version_sha256: sha256(raw),
          review: { status: 'draft' },
        },
      ],
    },
  };
}

test('filled URLs and verified policy records are not source or clause verification', () => {
  const r = report();
  assert.equal(r.totals.url_present, 2);
  assert.equal(r.totals.git_document_identities_recorded, 0);
  assert.equal(r.totals.primary_instrument_identity_reviewed_policies, 0);
  assert.ok(
    r.policies.every(
      (p) =>
        p.evidence_level === 'record_summary' &&
        p.currentness === 'unknown' &&
        p.document_kind === 'unknown'
    )
  );
});

test('private transfer candidates and homepage files retain unknown identity and priorities', () => {
  const rows = [
    {
      policy_id: 'one',
      inventory_sha256: inventory,
      status: 'already_archived',
      archive_state: 'raw_candidate_archived',
      has_private_file: true,
    },
    {
      policy_id: 'two',
      inventory_sha256: inventory,
      status: 'source_too_broad',
      archive_state: 'raw_homepage_only',
      has_private_file: true,
    },
  ];
  let r = report({ observations: { rows } });
  assert.equal(r.totals.observed_private_raw_candidates, 1);
  assert.equal(r.totals.observed_private_homepage_only, 1);
  assert.equal(r.policies[1].priority, 'P0');
  assert.ok(r.policies[1].gaps.includes('SOURCE_TOO_BROAD'));
  assert.equal(r.policies[0].archive.local_original_integrity, 'not_checked');
  rows[0].inventory_sha256 = 'b'.repeat(64);
  r = report({ observations: { rows } });
  assert.equal(r.policies[0].archive.state, 'unknown');
  assert.ok(r.policies[0].gaps.includes('ARCHIVE_INVENTORY_MISMATCH'));
});

test('HTTP 200 error body and mismatched frozen hash never become usable source evidence', () => {
  const bad = packet();
  bad.raw = Buffer.from('<html><title>Page not found</title></html>');
  bad.data.raw_sha256 = sha256(bad.raw);
  let r = report({ packets: [bad] });
  assert.ok(r.policies[0].documents[0].gaps.includes('ERROR_OR_LOGIN_BODY'));
  const altered = packet();
  altered.raw = Buffer.from('altered');
  r = report({ packets: [altered] });
  assert.equal(r.policies[0].documents[0].raw_integrity, 'mismatch');
  assert.equal(r.totals.git_byte_versions_validated, 0);
});

test('document/version/anchor denominators deduplicate many-to-many links without guessing documentary structure', () => {
  const p = packet();
  p.data.policy_ids = ['one', 'two'];
  const r = report({ packets: [p] });
  assert.equal(r.totals.policy_records, 2);
  assert.equal(r.totals.git_document_identities_recorded, 1);
  assert.equal(r.totals.git_byte_versions_validated, 1);
  assert.equal(r.totals.validated_human_reviewed_anchors, 0);
  assert.equal(r.policies[1].documents.length, 1);
  const multi = report({ packets: [p, packet('second-document')] });
  assert.equal(multi.policies[0].documents.length, 2);
  assert.equal(multi.policies[0].document_kind, 'unknown');
});

test('historical human locator review does not establish current law; reviewed integrity regressions are blocking', () => {
  const p = packet();
  p.data.review = human;
  p.data.anchors[0].review = human;
  // Quote offsets are part of the fixture contract, not an approval of real law.
  p.data.anchors[0].end_offset = p.data.anchors[0].exact_quote.length;
  let r = report({ packets: [p] });
  assert.equal(r.totals.validated_human_reviewed_anchors, 1);
  assert.equal(r.policies[0].currentness, 'unknown');
  assert.equal(r.policies[0].documents[0].source_current_through, '2025-01-06');
  assert.equal(r.totals.primary_instrument_identity_reviewed_policies, 0);
  p.raw = Buffer.from('changed');
  r = report({ packets: [p] });
  assert.equal(r.regressions.length, 1);
  assert.equal(r.totals.validated_human_reviewed_anchors, 0);
  p.raw = null;
  r = report({ packets: [p] });
  assert.equal(r.regressions.length, 1);
});

test('orphan packets, duplicate observations and packet path escape are rejected', () => {
  const p = packet();
  p.data.policy_id = 'not-canonical';
  assert.throws(() => report({ packets: [p] }), /Orphan/);
  assert.throws(
    () =>
      report({
        observations: { rows: [{ policy_id: 'one' }, { policy_id: 'one' }] },
      }),
    /duplicate/
  );
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'readiness-packet-'));
  try {
    fs.writeFileSync(
      path.join(dir, 'packet.json'),
      JSON.stringify({ raw_file: '../outside.html' })
    );
    assert.throws(() => loadPackets(dir), /sibling/);
  } finally {
    fs.unlinkSync(path.join(dir, 'packet.json'));
    fs.rmdirSync(dir);
  }
});

test('observed CSV snapshot preserves input hashes while redacting private file IDs', () => {
  const audit = Buffer.from(
    `policy_id,inventory_sha256,status,drive_file_id,collected_at\r\none,${inventory},already_archived,PRIVATE_ID,2026-10-29T20:20:00Z\r\n`
  );
  const backlog = Buffer.from(
    `policy_id,inventory_sha256,archive_state,archived_source_file_id,source_candidate_count\none,${inventory},raw_candidate_archived,PRIVATE_ID,1\n`
  );
  const snapshot = captureObservations(audit, backlog);
  assert.equal(snapshot.provenance.audit_sha256, sha256(audit));
  assert.ok(!JSON.stringify(snapshot).includes('PRIVATE_ID'));
  assert.equal(snapshot.rows[0].observed_at, '2026-10-29T20:20:00Z');
  assert.deepEqual(parseCsv('a,b\n"comma,value","two\nlines"\n'), [
    { a: 'comma,value', b: 'two\nlines' },
  ]);
});

test('real inventory is reproducible, complete and byte-read-only', async () => {
  const file = new URL(
    '../agent/ccus-ai-agent/db/ccus_master.sqlite',
    import.meta.url
  );
  const before = sha256(fs.readFileSync(file));
  const a = await generateReadiness(),
    b = await generateReadiness();
  assert.deepEqual(a, b);
  assert.equal(a.policies.length, 130);
  assert.equal(new Set(a.policies.map((p) => p.policy_id)).size, 130);
  assert.equal(a.totals.observed_private_raw_candidates, 36);
  assert.equal(a.totals.observed_private_homepage_only, 8);
  assert.equal(a.totals.cumulative_private_raw_candidate_policies, 55);
  assert.equal(a.totals.policies_without_raw_candidate, 75);
  assert.equal(a.totals.manual_locally_hash_checked_unique_blobs, 28);
  assert.equal(sha256(fs.readFileSync(file)), before);
});

test('manual capture checks actual bytes and keeps supporting/rejected sources outside coverage', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'manual-bytes-'));
  const raw = Buffer.from('%PDF-fixture source bytes');
  const hash = sha256(raw);
  const file = path.join(dir, `one__${hash.slice(0, 14)}.pdf`);
  const headers =
    'batch,policy_id,canonical_db_sha256,download_status,archive_class,source_role,edition,sha256,file_size_bytes,drive_file_id';
  const csv = Buffer.from(
    `${headers}\n1,one,${inventory},saved_candidate,new_nonhomepage_source_candidate,partial_section,2024,${hash},${raw.length},PRIVATE_ID\n2,two,${inventory},saved_candidate,supporting_material_only,related,2023,${hash},${raw.length},PRIVATE_SUPPORT\n3,two,${inventory},saved_candidate,rejected_non_document,blocked,unknown,,,\n`
  );
  const support = path.join(dir, `two__${hash.slice(0, 14)}.pdf`);
  try {
    fs.writeFileSync(file, raw);
    fs.writeFileSync(support, raw);
    const captured = captureManualObservations(csv, dir, dir);
    assert.ok(!JSON.stringify(captured).includes('PRIVATE_'));
    const reconciled = reconcileManualObservations(
      captured,
      policies,
      inventory,
      []
    );
    assert.equal(reconciled.locally_hash_checked_unique_blobs, 1);
    assert.deepEqual(reconciled.cumulative_candidate_policy_ids, ['one']);
    assert.deepEqual(reconciled.policies_without_raw_candidate, ['two']);
    assert.equal(reconciled.legal_identity_review, 'not_reviewed');
    assert.deepEqual(
      reconcileManualObservations(captured, policies, inventory, [
        { policy_id: 'one', archive: { state: 'raw_candidate_archived' } },
      ]).added_candidate_policy_ids,
      []
    );
    assert.throws(
      () => reconcileManualObservations(captured, policies, 'b'.repeat(64), []),
      /inventory/
    );
    assert.throws(
      () =>
        reconcileManualObservations(captured, policies.slice(1), inventory, []),
      /Orphan/
    );
    const duplicate = {
      ...captured,
      rows: [...captured.rows, captured.rows[0]],
    };
    assert.throws(
      () => reconcileManualObservations(duplicate, policies, inventory, []),
      /Duplicate/
    );
    fs.writeFileSync(file, 'changed bytes');
    assert.throws(
      () => captureManualObservations(csv, dir, dir),
      /hash or byte length/
    );
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

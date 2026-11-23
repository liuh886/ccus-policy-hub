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
  parseVerifiedBaseline,
  sha256,
} from './lib/source-readiness.mjs';
import { isHumanReviewed } from './lib/source-evidence.mjs';
import {
  DEFAULT_EVIDENCE_ROOT,
  loadEvidencePackets,
} from './lib/source-evidence-files.mjs';
import {
  generateReadiness,
  loadPackets,
  loadVerifiedBaselines,
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
    const pilotDir = new URL('./data/evidence/us-45q-2024', import.meta.url);
    const packetJson = JSON.parse(
      fs.readFileSync(new URL('./packet.json', pilotDir + '/'), 'utf8')
    );
    packetJson.policy_id = 'one';
    fs.writeFileSync(path.join(dir, 'packet.json'), JSON.stringify(packetJson));
    fs.writeFileSync(path.join(dir, 'source.html'), Buffer.from('tampered'));
    const tampered = report({ packets: loadPackets(dir) });
    assert.equal(tampered.regressions.length, 1);
    assert.equal(tampered.totals.validated_human_reviewed_anchors, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
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

test('real inventory readiness is reproducible, complete, byte-read-only and reconciles URL changes truthfully', async () => {
  const file = new URL(
    '../agent/ccus-ai-agent/db/ccus_master.sqlite',
    import.meta.url
  );
  const before = sha256(fs.readFileSync(file));
  const loadedPackets = loadEvidencePackets(DEFAULT_EVIDENCE_ROOT);
  assert.ok(loadedPackets.length >= 8);
  const inlineCount = loadedPackets.filter((p) => p.raw !== null).length;
  const reviewedAnchorCount = loadedPackets.reduce(
    (sum, p) =>
      sum +
      (isHumanReviewed(p.input.review)
        ? (p.input.anchors || []).filter((anchor) =>
            isHumanReviewed(anchor.review)
          ).length
        : 0),
    0
  );
  const a = await generateReadiness(),
    b = await generateReadiness();
  assert.deepEqual(a, b);
  assert.equal(a.inventory_sha256, before);
  assert.ok(a.policies.length > 0);
  assert.equal(a.policies.length, a.totals.policy_records);
  assert.equal(
    new Set(a.policies.map((p) => p.policy_id)).size,
    a.policies.length
  );
  assert.equal(
    a.totals.cumulative_private_raw_candidate_policies +
      a.totals.policies_without_raw_candidate,
    a.totals.policy_records
  );
  assert.equal(
    a.totals.superseded_url_candidate_policies,
    a.superseded_url_candidates.policy_ids.length
  );
  assert.equal(a.totals.git_document_identities_recorded, loadedPackets.length);
  assert.equal(a.totals.git_byte_versions_validated, inlineCount);
  assert.equal(a.totals.human_locator_review_records, reviewedAnchorCount);
  assert.equal(a.totals.validated_human_reviewed_anchors, reviewedAnchorCount);
  assert.equal(a.regressions.length, 0);
  const quarantined = a.policies.find(
    (p) => p.policy_id === 'br-anp-ccs-resolution'
  );
  assert.equal(quarantined.archive.binding_mode, 'url_changed_since_capture');
  assert.equal(quarantined.archive.state, 'unknown');
  assert.ok(quarantined.gaps.includes('ARCHIVE_URL_CHANGED_SINCE_CAPTURE'));
  assert.ok(quarantined.gaps.includes('ARCHIVE_OBSERVATION_UNAVAILABLE'));
  const repaired = a.policies.find((p) => p.policy_id === 'uk-energy-act-2023');
  assert.equal(repaired.archive.binding_mode, 'url_changed_since_capture');
  assert.ok(repaired.gaps.includes('ARCHIVE_URL_CHANGED_SINCE_CAPTURE'));
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

test('unrelated DB mutations preserve (id, url) binding while URL edits quarantine prior candidates and unrecognized baselines fail', () => {
  const newInventory = 'c'.repeat(64);
  const baselineRows = policies.map((p) => ({ policy_id: p.id, url: p.url }));
  const baselines = new Map([
    [
      inventory,
      {
        inventory_sha256: inventory,
        rows_sha256: sha256(Buffer.from(JSON.stringify(baselineRows), 'utf8')),
        rows: baselineRows,
      },
    ],
  ]);
  const v4Rows = [
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
      status: 'needs_official_source_review',
      archive_state: 'no_raw_file',
      has_private_file: false,
    },
  ];
  const manual = {
    provenance: { manifest_sha256: 'd'.repeat(64) },
    rows: [
      {
        policy_id: 'two',
        inventory_sha256: inventory,
        download_status: 'saved_candidate',
        archive_class: 'new_nonhomepage_source_candidate',
        reported_sha256: 'e'.repeat(64),
        local_byte_integrity: 'pass',
      },
    ],
  };

  // Unrelated DB mutation (e.g., facility_news changed, policy URLs unchanged)
  const unchangedReport = buildReadiness({
    policies,
    inventorySha: newInventory,
    observations: { rows: v4Rows },
    asOf: '2026-10-30',
    baselines,
  });
  assert.equal(
    unchangedReport.totals.archive_rows_bound_to_current_inventory,
    2
  );
  assert.equal(unchangedReport.totals.archive_rows_quarantined_url_changed, 0);
  assert.equal(unchangedReport.totals.observed_private_raw_candidates, 1);
  assert.equal(
    unchangedReport.policies[0].archive.binding_mode,
    'policy_url_match'
  );
  const unchangedManual = reconcileManualObservations(
    manual,
    policies,
    newInventory,
    unchangedReport.policies,
    baselines
  );
  assert.deepEqual(unchangedManual.cumulative_candidate_policy_ids, [
    'one',
    'two',
  ]);
  assert.equal(unchangedManual.locally_hash_checked_unique_blobs, 1);

  // Changing policy URLs quarantines both v4 and manual candidates and adds new ID as unbound
  const mutatedPolicies = [
    { ...policies[0], url: 'https://example.org/new-law' },
    { ...policies[1], url: 'https://example.org/new-programme' },
    {
      id: 'three',
      country: 'Fixture',
      url: 'https://example.org/added',
      review_status: 'draft',
    },
  ];
  const changedReport = buildReadiness({
    policies: mutatedPolicies,
    inventorySha: newInventory,
    observations: { rows: v4Rows },
    asOf: '2026-10-30',
    baselines,
  });
  assert.equal(changedReport.totals.archive_rows_bound_to_current_inventory, 0);
  assert.equal(changedReport.totals.archive_rows_quarantined_url_changed, 2);
  assert.equal(changedReport.totals.observed_private_raw_candidates, 0);
  assert.deepEqual(changedReport.superseded_url_candidates.v4_policy_ids, [
    'one',
  ]);
  assert.ok(
    changedReport.policies[0].gaps.includes('ARCHIVE_URL_CHANGED_SINCE_CAPTURE')
  );
  assert.ok(
    changedReport.policies[0].gaps.includes('ARCHIVE_OBSERVATION_UNAVAILABLE')
  );
  const addedPolicy = changedReport.policies.find(
    (p) => p.policy_id === 'three'
  );
  assert.equal(addedPolicy.archive.binding_mode, 'unbound');
  assert.ok(addedPolicy.gaps.includes('ARCHIVE_OBSERVATION_UNAVAILABLE'));

  const changedManual = reconcileManualObservations(
    manual,
    mutatedPolicies,
    newInventory,
    changedReport.policies,
    baselines
  );
  assert.deepEqual(changedManual.cumulative_candidate_policy_ids, []);
  assert.equal(changedManual.locally_hash_checked_unique_blobs, 0);
  assert.equal(
    changedManual.superseded_url_locally_hash_checked_unique_blobs,
    1
  );
  assert.deepEqual(changedManual.superseded_url_manual_candidate_policy_ids, [
    'two',
  ]);
  assert.deepEqual(changedManual.policies_without_raw_candidate, [
    'one',
    'three',
    'two',
  ]);

  // Tampered/unrecognized inventory SHA without matching baseline still fails strictly
  assert.throws(
    () =>
      reconcileManualObservations(
        manual,
        mutatedPolicies,
        newInventory,
        changedReport.policies,
        new Map()
      ),
    /inventory/
  );
  const tamperedBaseline = {
    ...baselines.get(inventory),
    rows: [
      { policy_id: 'one', url: 'https://tampered.example/' },
      baselineRows[1],
    ],
  };
  assert.throws(
    () =>
      buildReadiness({
        policies,
        inventorySha: newInventory,
        observations: { rows: v4Rows },
        asOf: '2026-10-30',
        baselines: new Map([[inventory, tamperedBaseline]]),
      }),
    /SHA-256 mismatch/
  );
  assert.throws(
    () =>
      parseVerifiedBaseline('{"rows":[]}', {
        expectedInventorySha: inventory,
        expectedFileSha: 'f'.repeat(64),
      }),
    /SHA-256 mismatch/
  );
  assert.ok(
    loadVerifiedBaselines().has(
      '1aa9c830c7cd13dd026ebf6118bff9df590b05dc70bea1de0c8567aac15fa53d'
    )
  );

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'readiness-baselines-'));
  try {
    const shaA = '11111111' + 'a'.repeat(56);
    const shaB = '22222222' + 'b'.repeat(56);
    const rows = [{ policy_id: 'one', url: 'https://example.org/law' }];
    const rowsSha = sha256(Buffer.from(JSON.stringify(rows), 'utf8'));
    fs.writeFileSync(
      path.join(dir, 'inventory-url-baseline-11111111.json'),
      JSON.stringify({
        schema_version: '1.0.0',
        observation_type: 'policy_inventory_url_baseline',
        inventory_sha256: shaA,
        policy_count: 1,
        rows_sha256: rowsSha,
        rows,
      })
    );
    fs.writeFileSync(
      path.join(dir, 'inventory-url-baseline-22222222.json'),
      JSON.stringify({
        schema_version: '1.0.0',
        observation_type: 'policy_inventory_url_baseline',
        inventory_sha256: shaB,
        policy_count: 1,
        rows_sha256: rowsSha,
        rows,
      })
    );
    fs.writeFileSync(path.join(dir, 'unrelated.json'), '{}');
    const discovered = loadVerifiedBaselines(dir);
    assert.equal(discovered.size, 2);
    assert.ok(discovered.has(shaA) && discovered.has(shaB));

    // Filename prefix mismatch fails closed
    fs.writeFileSync(
      path.join(dir, 'inventory-url-baseline-deadbeef.json'),
      JSON.stringify({
        schema_version: '1.0.0',
        observation_type: 'policy_inventory_url_baseline',
        inventory_sha256: 'cafe0000' + 'c'.repeat(56),
        policy_count: 1,
        rows_sha256: rowsSha,
        rows,
      })
    );
    assert.throws(
      () => loadVerifiedBaselines(dir),
      /Invalid inventory baseline/
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function externalArchivePacket(id = 'ext-doc-one') {
  const raw = Buffer.from(
    '<html><body><p>External archive statute clause.</p></body></html>'
  );
  const normalized = Buffer.from('External archive statute clause.\n');
  const rawSha = sha256(raw);
  return {
    raw: null,
    normalized,
    data: {
      storage: 'external_archive',
      external_uri: 'https://archive.example.org/snapshots/ext-doc-one.html',
      bytes: raw.length,
      document_id: id,
      policy_id: 'one',
      raw_sha256: rawSha,
      normalized_sha256: sha256(normalized),
      edition: '2026',
      source_current_through: null,
      coverage: 'historical_snapshot',
      extractor_version: 'official-html-v1',
      review: human,
      anchors: [
        {
          id: 'clause-1',
          locator: 'Section 1',
          exact_quote: 'External archive statute clause.',
          start_offset: 0,
          end_offset: 'External archive statute clause.'.length,
          offset_unit: 'utf16_code_units',
          version_sha256: rawSha,
          review: human,
        },
      ],
    },
  };
}

test('verified external_archive packet validates without inline raw bytes and does not inflate git byte count', () => {
  const p = externalArchivePacket();
  const r = report({ packets: [p] });
  const doc = r.policies[0].documents[0];
  assert.equal(doc.raw_integrity, 'external_archive');
  assert.ok(doc.gaps.includes('EXTERNAL_ARCHIVE_ORIGINAL_BYTES_NOT_INLINE'));
  assert.equal(r.totals.validated_human_reviewed_anchors, 1);
  assert.equal(r.totals.git_byte_versions_validated, 0);
  assert.equal(r.regressions.length, 0);
});

test('verified external_archive packet fails closed on missing/tampered normalized text or non-HTTPS URI', () => {
  const missingNormalized = externalArchivePacket('ext-missing-norm');
  missingNormalized.normalized = null;
  let r = report({ packets: [missingNormalized] });
  assert.equal(r.regressions.length, 1);
  assert.equal(r.totals.validated_human_reviewed_anchors, 0);

  const tamperedNormalized = externalArchivePacket('ext-tampered-norm');
  tamperedNormalized.normalized = Buffer.from('Tampered archive text.\n');
  r = report({ packets: [tamperedNormalized] });
  assert.equal(r.regressions.length, 1);
  assert.equal(r.totals.validated_human_reviewed_anchors, 0);

  const insecureUri = externalArchivePacket('ext-insecure-uri');
  insecureUri.data.external_uri = 'http://archive.example.org/insecure.html';
  r = report({ packets: [insecureUri] });
  assert.equal(r.regressions.length, 1);
  assert.equal(r.policies[0].documents[0].raw_integrity, 'mismatch');
  assert.equal(r.totals.validated_human_reviewed_anchors, 0);
});

test('loadPackets loads disk external_archive packet with normalized.txt and resolves UTF-16 anchor offsets cleanly', () => {
  const tmpDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'readiness-ext-archive-')
  );
  try {
    const packetDir = path.join(tmpDir, 'ext-disk-fixture');
    fs.mkdirSync(packetDir);
    const quote = 'External archive statute clause.';
    const normalizedText = `条款 §1 — ${quote}\n`;
    const normalizedBuf = Buffer.from(normalizedText, 'utf8');
    const rawBytes = Buffer.from(
      `<html><body><p>${normalizedText.trim()}</p></body></html>`,
      'utf8'
    );
    const rawSha = sha256(rawBytes);
    const manifest = {
      schema_version: '1.0.0',
      storage: 'external_archive',
      external_uri: 'https://archive.example.org/snapshots/ext-disk.html',
      bytes: rawBytes.length,
      document_id: 'ext-disk-fixture',
      policy_id: 'one',
      title: {
        en: 'External Archive Disk Fixture',
        zh: '外部归档磁盘测试',
      },
      source_url: 'https://official.example.org/law',
      source_language: 'en',
      edition: '2026',
      fetched_at: '2026-11-19T00:00:00Z',
      published_at: null,
      source_current_through: null,
      raw_sha256: rawSha,
      normalized_sha256: sha256(normalizedBuf),
      extractor_version: 'official-html-v1',
      review: human,
      anchors: [
        {
          id: 'clause-1',
          locator: 'Section 1',
          exact_quote: quote,
          version_sha256: rawSha,
          review: human,
        },
      ],
    };
    fs.writeFileSync(
      path.join(packetDir, 'packet.json'),
      JSON.stringify(manifest, null, 2)
    );
    fs.writeFileSync(path.join(packetDir, 'normalized.txt'), normalizedBuf);

    const loaded = loadPackets(tmpDir);
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0].raw, null);
    const anchor = loaded[0].data.anchors[0];
    assert.equal(anchor.offset_unit, 'utf16_code_units');
    assert.equal(anchor.start_offset, normalizedText.indexOf(quote));
    assert.equal(
      anchor.end_offset,
      normalizedText.indexOf(quote) + quote.length
    );
    assert.equal(
      normalizedText.slice(anchor.start_offset, anchor.end_offset),
      quote
    );

    const r = report({ packets: loaded });
    assert.equal(r.regressions.length, 0);
    assert.equal(r.totals.validated_human_reviewed_anchors, 1);
    assert.equal(r.totals.git_byte_versions_validated, 0);
    assert.equal(r.policies[0].documents[0].raw_integrity, 'external_archive');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

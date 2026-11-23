import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';
import { hash, httpReader } from './consume-agent-data.mjs';
import { catalogFiles, publishCatalog } from './lib/source-catalog.mjs';
import { isHumanReviewed } from './lib/source-evidence.mjs';
import {
  DEFAULT_EVIDENCE_ROOT,
  loadEvidencePackets,
  sourceEvidenceFiles,
} from './lib/source-evidence-files.mjs';
import { consumeSourceCatalog } from './consume-source-catalog.mjs';

const capturedPdfs = JSON.parse(
  fs.readFileSync(
    new URL('./data/discovery/captured-pdfs.json', import.meta.url),
    'utf8'
  )
);
const expectedHtmlPackets = loadEvidencePackets(DEFAULT_EVIDENCE_ROOT);
const expectedReviewedHtmlCount = expectedHtmlPackets.reduce(
  (sum, p) =>
    sum +
    (isHumanReviewed(p.input.review)
      ? (p.input.anchors || []).filter((a) => isHumanReviewed(a.review)).length
      : 0),
  0
);
const expectedCatalogRecords =
  expectedHtmlPackets.length + capturedPdfs.records.length;

const root = fileURLToPath(new URL('../public/', import.meta.url));
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, 'data/manifest.json'))
);
const base = new URL(manifest.base_url + '/');
const manifestUrl = new URL('data/manifest.json', base);
function consumer() {
  const changes = new Map();
  const key = (value) => new URL(value, base).href;
  const read = (value) =>
    changes.get(key(value)) ||
    fs.readFileSync(
      path.join(root, new URL(value).pathname.slice(base.pathname.length))
    );
  const get = (value) => JSON.parse(read(key(value)));
  const set = (value, object) =>
    changes.set(key(value), Buffer.from(JSON.stringify(object)));
  const mutate = (change) => {
    const m = get(manifestUrl);
    const url = m.datasets.discovery_catalog.file;
    const catalog = get(url);
    change(catalog);
    set(url, catalog);
    m.datasets.discovery_catalog.sha256 = hash(read(url));
    m.datasets.discovery_catalog.count = catalog.count;
    set(manifestUrl, m);
  };
  return {
    read,
    get,
    set,
    mutate,
    changes,
    run: () => consumeSourceCatalog(manifestUrl, read),
  };
}

test('all catalog records resolve versions/locators and keep knowledge and citations pending', async () => {
  assert.ok(expectedHtmlPackets.length >= 8);
  assert.ok(capturedPdfs.records.length >= 2);
  const result = await consumer().run();
  assert.equal(result.catalog_records, expectedCatalogRecords);
  assert.equal(result.reviewed_catalog_references, expectedReviewedHtmlCount);
  assert.equal(result.semantic_knowledge_extraction, 'not_performed');
  assert.ok(
    result.receipts.every(
      (r) =>
        !r.currentness_verified && r.claim_support_review === 'not_performed'
    )
  );
  for (const packet of expectedHtmlPackets) {
    const docReviewed = isHumanReviewed(packet.input.review);
    const receipts = result.receipts.filter(
      (r) => r.document_id === packet.input.document_id
    );
    assert.equal(receipts.length, packet.input.anchors.length);
    for (const anchor of packet.input.anchors) {
      const receipt = receipts.find((r) => r.locator_id === anchor.id);
      assert.ok(receipt);
      assert.equal(receipt.source_bytes_and_anchor_checked, true);
      const reviewed = docReviewed && isHumanReviewed(anchor.review);
      assert.equal(
        receipt.reference_status,
        reviewed ? 'reviewed_historical_locator' : 'candidate_only'
      );
      assert.equal(
        receipt.reasons.includes('IDENTITY_AND_LOCATOR_REVIEW_PENDING'),
        !reviewed
      );
      if (packet.input.edition === null)
        assert.ok(receipt.reasons.includes('EDITION_UNKNOWN'));
    }
  }
  for (const pdf of capturedPdfs.records) {
    const receipt = result.receipts.find(
      (r) => r.document_id === pdf.document_id
    );
    assert.ok(receipt);
    assert.equal(receipt.source_bytes_and_anchor_checked, false);
    assert.equal(receipt.reference_status, 'candidate_only');
    assert.equal(receipt.reference.physical_page, pdf.locator.physical_page);
    assert.equal(receipt.reference.printed_page, pdf.locator.printed_page);
    if (pdf.edition === null)
      assert.ok(receipt.reasons.includes('EDITION_UNKNOWN'));
  }
  const dk = result.receipts.find((r) => r.document_id === 'dk-ens-ccs-funds');
  assert.ok(dk.reasons.includes('EDITION_UNKNOWN'));
  const uk = result.receipts.find(
    (r) => r.document_id === 'uk-energy-act-2023-enacted'
  );
  assert.equal(uk.source_bytes_and_anchor_checked, false);
  assert.equal(uk.reference_status, 'candidate_only');
  const report = result.receipts.find(
    (r) => r.source_kind === 'secondary_report'
  );
  assert.equal(report.source_bytes_and_anchor_checked, false);
  assert.equal(report.reference_status, 'candidate_only');
  assert.equal(report.reference.physical_page, 16);
  assert.equal(report.reference.printed_page, '6');
  assert.ok(report.reasons.includes('EDITION_UNKNOWN'));

  const catalog = consumer().get(manifest.datasets.discovery_catalog.file);
  const byId = Object.fromEntries(
    catalog.records.map((r) => [r.document_id, r])
  );
  assert.equal(
    byId['us-45q-usc-2024'].publisher,
    'United States Government Publishing Office / govinfo'
  );
  assert.equal(byId['ca-ccus-itc-2026'].publisher, 'laws-lois.justice.gc.ca');
  assert.equal(byId['no-for-2014-1517'].publisher, 'lovdata.no');
  assert.equal(byId['no-for-2014-1517'].language, 'no');
  assert.equal(byId['dk-ens-ccs-funds'].publisher, 'ens.dk');
});

test('catalog generation is deterministic and SQLite remains byte-identical', async () => {
  const file = new URL(
    '../agent/ccus-ai-agent/db/ccus_master.sqlite',
    import.meta.url
  );
  const bytes = fs.readFileSync(file),
    before = hash(bytes);
  const SQL = await initSqlJs();
  const db = new SQL.Database(bytes);
  try {
    const a = catalogFiles(db, sourceEvidenceFiles(db), before);
    const b = catalogFiles(db, sourceEvidenceFiles(db), before);
    assert.deepEqual(a, b);
    assert.ok(!a.get('catalog.json').includes('drive.google.com'));
    assert.ok(!a.get('catalog.json').includes('D:/Documents'));
  } finally {
    db.close();
  }
  assert.equal(hash(fs.readFileSync(file)), before);
});

test('wrong hashes, orphan joins and version/locator mismatches fail closed', async () => {
  for (const mutate of [
    (c) => {
      c.records[0].locators[0].version_sha256 = '0'.repeat(64);
    },
    (c) => {
      c.records[0].policy_links = [
        { policy_id: 'missing-policy', status: 'candidate' },
      ];
    },
    (c) => {
      c.source_db_sha256 = '0'.repeat(64);
    },
    (c) => {
      c.records.push(c.records[0]);
      c.count++;
    },
    (c) => {
      c.records.find(
        (r) => r.document_id === 'us-45q-usc-2024'
      ).locators[0].evidence.anchor_id = 'missing-anchor';
    },
    (c) => {
      c.records.find(
        (r) => r.document_id === 'us-45q-usc-2024'
      ).identity_review_status = 'draft';
    },
    (c) => {
      c.records.find(
        (r) => r.document_id === 'uk-energy-act-2023-enacted'
      ).identity_review_status = 'verified';
    },
    (c) => {
      c.records.find(
        (r) => r.document_id === 'uk-energy-act-2023-enacted'
      ).locators[0].review_status = 'verified';
    },
    (c) => {
      c.records[0].locators[0].physical_page = 0;
    },
  ]) {
    const client = consumer();
    client.mutate(mutate);
    await assert.rejects(client.run());
  }
  const client = consumer();
  client.set(manifest.datasets.discovery_catalog.file, { changed: true });
  await assert.rejects(client.run(), /fingerprint/);
});

test('public HTTP consumer follows only static resources; private originals are never requested', async () => {
  const client = consumer();
  const requested = [];
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, base);
    requested.push(url.pathname);
    try {
      response.setHeader(
        'Content-Type',
        url.pathname.endsWith('.json') ? 'application/json' : 'text/plain'
      );
      response.end(client.read(new URL(url.pathname, base)));
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = `http://127.0.0.1:${server.address().port}`;
    const localManifest = new URL(manifestUrl.pathname, address);
    const transport = httpReader(localManifest);
    // Public manifests use the canonical publication origin; map it to the test host.
    const read = (value) =>
      transport(new URL(new URL(value).pathname, address));
    const result = await consumeSourceCatalog(manifestUrl, read);
    assert.equal(result.catalog_records, expectedCatalogRecords);
    assert.equal(result.reviewed_catalog_references, expectedReviewedHtmlCount);
    assert.ok(
      requested.every((url) => url.startsWith('/ccus-policy-hub/data/'))
    );
    assert.ok(!requested.some((url) => url.endsWith('.pdf')));
    assert.ok(!requested.some((url) => url.includes('/context/')));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('selecting a metadata-only report does not load unrelated frozen HTML or text', async () => {
  const client = consumer();
  const requested = [];
  const result = await consumeSourceCatalog(
    manifestUrl,
    (url) => {
      requested.push(String(url));
      return client.read(url);
    },
    { documentIds: ['gccsi-ccus-progress-china-en'] }
  );
  assert.equal(result.receipts.length, 1);
  assert.ok(
    !requested.some((url) => url.endsWith('.txt') || url.includes('/context/'))
  );
  await assert.rejects(
    consumeSourceCatalog(manifestUrl, client.read, {
      documentIds: ['unknown-document'],
    }),
    { code: 'INVALID_ARGUMENT' }
  );
});

test('catalog consumer succeeds when policies.json exceeds 1 MiB while rejecting oversized catalog manifests', async () => {
  const client = consumer();
  const policies = client.get(manifest.datasets.policies.file);
  policies.records.push({
    id: 'synthetic-padding-policy',
    padding: 'p'.repeat(1100 * 1024),
  });
  policies.count = policies.records.length;
  client.set(manifest.datasets.policies.file, policies);

  const server = http.createServer((request, response) => {
    const url = new URL(request.url, base);
    try {
      response.setHeader(
        'Content-Type',
        url.pathname.endsWith('.json') ? 'application/json' : 'text/plain'
      );
      response.end(client.read(new URL(url.pathname, base)));
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = `http://127.0.0.1:${server.address().port}`;
    const localManifest = new URL(manifestUrl.pathname, address);
    const transport = httpReader(localManifest);
    const read = (value, opts) =>
      transport(new URL(new URL(value).pathname, address), opts);
    const result = await consumeSourceCatalog(manifestUrl, read);
    assert.equal(result.catalog_records, expectedCatalogRecords);

    // Oversized catalog.json still fails the default 1 MiB budget
    client.mutate((c) => {
      c.records[0].title.en += ' ' + 'x'.repeat(1100 * 1024);
    });
    await assert.rejects(consumeSourceCatalog(manifestUrl, read), {
      code: 'RESOURCE_TOO_LARGE',
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('publishCatalog validates all keys before writing and prunes stale files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccus-catalog-pub-'));
  try {
    const emptyDir = path.join(dir, 'empty');
    fs.mkdirSync(emptyDir);
    assert.throws(() =>
      publishCatalog(
        new Map([
          ['catalog.json', '{}'],
          ['../escape.json', 'bad'],
        ]),
        emptyDir
      )
    );
    assert.deepEqual(fs.readdirSync(emptyDir), []);

    const pubDir = path.join(dir, 'published');
    fs.mkdirSync(pubDir);
    const stale = path.join(pubDir, 'obsolete.json');
    fs.writeFileSync(stale, '{"stale":true}\n');
    const files = new Map([
      ['catalog.json', '{"count":0}\n'],
      ['catalog.schema.json', '{}\n'],
      ['README.md', '# Catalog\n'],
    ]);
    publishCatalog(files, pubDir);
    assert.equal(fs.existsSync(stale), false);
    for (const [name, content] of files) {
      assert.equal(fs.readFileSync(path.join(pubDir, name), 'utf8'), content);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

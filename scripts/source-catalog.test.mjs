import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';
import { hash, httpReader } from './consume-agent-data.mjs';
import { catalogFiles } from './lib/source-catalog.mjs';
import { sourceEvidenceFiles } from './lib/source-evidence-files.mjs';
import { consumeSourceCatalog } from './consume-source-catalog.mjs';

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

test('three real catalog records resolve versions/locators and keep knowledge and citations pending', async () => {
  const result = await consumer().run();
  assert.equal(result.catalog_records, 3);
  assert.equal(result.reviewed_catalog_references, 0);
  assert.equal(result.semantic_knowledge_extraction, 'not_performed');
  assert.ok(
    result.receipts.every(
      (r) => r.reference_status === 'candidate_only' && !r.currentness_verified
    )
  );
  const html = result.receipts.find((r) => r.document_id === 'us-45q-usc-2024');
  assert.equal(html.source_bytes_and_anchor_checked, true);
  const report = result.receipts.find(
    (r) => r.source_kind === 'secondary_report'
  );
  assert.equal(report.source_bytes_and_anchor_checked, false);
  assert.equal(report.reference.physical_page, 16);
  assert.equal(report.reference.printed_page, '6');
  assert.ok(report.reasons.includes('EDITION_UNKNOWN'));
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
      ).identity_review_status = 'verified';
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
    assert.equal(result.catalog_records, 3);
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

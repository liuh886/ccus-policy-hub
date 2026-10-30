import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import {
  consumeAgentData,
  httpReader,
  verifyRelease,
  parseConsumerArgs,
  hash,
} from './consume-agent-data.mjs';
import { releaseMetadata } from './generate-release-metadata.mjs';

const root = fileURLToPath(new URL('../public/', import.meta.url));
const diskManifest = fs.readFileSync(
  path.join(root, 'data/manifest.json'),
  'utf8'
);
const oldBase = JSON.parse(diskManifest).base_url;
const commit = 'a'.repeat(40);
async function withPublication(callback) {
  const changes = new Map();
  let base;
  const manifestBytes = () =>
    Buffer.from(diskManifest.replaceAll(oldBase, base));
  const server = http.createServer((req, res) => {
    if (!req.url.startsWith('/ccus-policy-hub/')) {
      res.writeHead(404).end();
      return;
    }
    const relative = new URL(req.url, 'http://localhost').pathname.slice(
      '/ccus-policy-hub/'.length
    );
    const altered = changes.get(relative);
    if (altered) {
      res
        .writeHead(altered.status || 200, {
          'content-type': altered.type || 'application/json',
        })
        .end(altered.bytes);
      return;
    }
    let bytes;
    try {
      if (relative === 'data/manifest.json') bytes = manifestBytes();
      else if (relative === 'data/release.json')
        bytes = Buffer.from(
          JSON.stringify(
            releaseMetadata(
              commit,
              manifestBytes(),
              Object.fromEntries(
                [
                  'context/index.json',
                  'schemas/context-bundle.schema.json',
                  'schemas/manifest.schema.json',
                  ...(JSON.parse(diskManifest).datasets.source_evidence
                    ? [
                        'evidence/index.json',
                        'schemas/source-evidence.schema.json',
                      ]
                    : []),
                  ...(JSON.parse(diskManifest).datasets.discovery_catalog
                    ? [
                        'discovery/catalog.json',
                        'discovery/catalog.schema.json',
                      ]
                    : []),
                ].map((relative) => [
                  relative,
                  hash(fs.readFileSync(path.join(root, 'data', relative))),
                ])
              )
            )
          )
        );
      else bytes = fs.readFileSync(path.join(root, relative));
    } catch {
      res.writeHead(404).end('Missing');
      return;
    }
    res
      .writeHead(200, {
        'content-type': relative.endsWith('.json')
          ? 'application/json'
          : 'text/plain',
      })
      .end(bytes);
  });
  // Keep test ports outside Fetch's forbidden-port range on Windows.
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      await new Promise((resolve, reject) => {
        const fail = (error) => reject(error);
        server.once('error', fail);
        server.listen(
          30000 + Math.floor(Math.random() * 20000),
          '127.0.0.1',
          () => {
            server.off('error', fail);
            resolve();
          }
        );
      });
      break;
    } catch (error) {
      if (error.code !== 'EADDRINUSE' || attempt === 9) throw error;
    }
  }
  base = `http://127.0.0.1:${server.address().port}/ccus-policy-hub`;
  const url = `${base}/data/manifest.json`;
  try {
    await callback({
      url,
      read: httpReader(url, { timeoutMs: 2000 }),
      changes,
      base,
    });
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}
test('HTTP consumer validates six public contexts under a Pages base path without evidence data', async () => {
  await withPublication(async ({ url, read }) => {
    const result = await consumeAgentData(url, read);
    assert.equal(result.context_bundles, 6);
    assert.equal(result.resolved_references, 48);
    assert.deepEqual(result.policy_ids, ['us-45q-ira', 'us-obbba-45q-2025']);
    assert.equal(result.source_documents, undefined);
    assert.deepEqual(await verifyRelease(url, read, commit), {
      verified: true,
      commit,
    });
  });
});
test('HTTP missing resources, wrong JSON types, redirects and cross-base resources fail explicitly', async () => {
  await withPublication(async ({ url, read, changes, base }) => {
    await assert.rejects(read(`${base}/missing.json`), { code: 'HTTP_STATUS' });
    changes.set('data/manifest.json', {
      type: 'text/html',
      bytes: Buffer.from('error'),
    });
    await assert.rejects(read(url), { code: 'CONTENT_TYPE' });
    changes.set('data/redirect.json', {
      status: 302,
      bytes: Buffer.from('redirect'),
    });
    await assert.rejects(read(`${base}/data/redirect.json`));
    await assert.rejects(read(new URL('/outside.json', base).href), {
      code: 'PUBLICATION_BOUNDARY',
    });
    await assert.rejects(
      httpReader(url, { maxBytes: 10 })(
        `${base}/data/schemas/context-bundle.schema.json`
      ),
      { code: 'RESOURCE_TOO_LARGE' }
    );
  });
});
test('release verification catches wrong commit and changed manifest bytes', async () => {
  await withPublication(async ({ url, read, changes }) => {
    await assert.rejects(verifyRelease(url, read, 'b'.repeat(40)), {
      code: 'RELEASE_MISMATCH',
    });
    changes.set('data/context/index.json', { bytes: Buffer.from('{}') });
    await assert.rejects(verifyRelease(url, read, commit), {
      code: 'RELEASE_MISMATCH',
    });
    changes.delete('data/context/index.json');
    changes.set('data/release.json', {
      bytes: Buffer.from(
        JSON.stringify({ commit, manifest_sha256: '0'.repeat(64) })
      ),
    });
    await assert.rejects(verifyRelease(url, read, commit), {
      code: 'RELEASE_MISMATCH',
    });
  });
});
test('schema and citation validation reject invalid context even with recomputed hashes', async () => {
  await withPublication(async ({ url, read, changes, base }) => {
    const index = JSON.parse(await read(`${base}/data/context/index.json`));
    const entry = index.records[0];
    const bundle = JSON.parse(
      await read(new URL(entry.json, `${base}/data/context/index.json`).href)
    );
    const update = () => {
      const bytes = Buffer.from(JSON.stringify(bundle));
      entry.sha256_json = hash(bytes);
      changes.set(`data/context/${entry.json}`, { bytes });
      changes.set('data/context/index.json', {
        bytes: Buffer.from(JSON.stringify(index)),
      });
    };
    bundle.capabilities.project_eligibility = true;
    update();
    await assert.rejects(consumeAgentData(url, read), /Public schema rejected/);
    bundle.capabilities.project_eligibility = false;
    bundle.legal_context.records[0].source_refs.push('missing-source');
    update();
    await assert.rejects(
      consumeAgentData(url, read),
      /Unresolved source reference/
    );
  });
});
test('transport selection is explicit and release fingerprints are deterministic', () => {
  for (const args of [
    [],
    ['--root', 'x', '--manifest-url', 'https://example.org/data/manifest.json'],
    ['--root', 'x', '--expect-commit', 'main'],
    ['--write'],
  ])
    assert.throws(() => parseConsumerArgs(args), { code: 'INVALID_ARGUMENT' });
  assert.deepEqual(
    releaseMetadata(commit, Buffer.from('same')),
    releaseMetadata(commit, Buffer.from('same'))
  );
  assert.notEqual(
    releaseMetadata(commit, Buffer.from('same')).manifest_sha256,
    releaseMetadata(commit, Buffer.from('different')).manifest_sha256
  );
});

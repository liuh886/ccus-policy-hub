#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';
import * as pagefind from 'pagefind';
import {
  prepareSearchRuntime,
  verifySearchRuntime,
} from './lib/search-runtime.mjs';

export async function exerciseSearchRuntime(htmlRoot = null) {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'ccus-search-verification-')
  );
  const indexRoot = path.join(directory, 'pagefind');
  fs.writeFileSync(path.join(directory, 'package.json'), '{"type":"module"}');
  let server;
  try {
    const { index, errors } = await pagefind.createIndex();
    assert.deepEqual(errors, []);
    let htmlPages = 0;
    if (htmlRoot) {
      const result = await index.addDirectory({ path: htmlRoot });
      assert.deepEqual(result.errors, []);
      htmlPages = result.page_count;
    }
    for (const record of [
      {
        url: '/fixtures/law/',
        language: 'en',
        content:
          'Synthetic statute 45Q qualified facility. Historical draft only.',
        meta: { title: 'Synthetic law', review: 'draft' },
        filters: { kind: ['fixture_law'], review: ['draft'] },
      },
      {
        url: '/fixtures/report/',
        language: 'zh',
        content: '合成报告 咸水层 二氧化碳封存 研究目录',
        meta: { title: '合成报告', review: 'draft' },
        filters: { kind: ['fixture_catalog'], review: ['draft'] },
      },
      {
        url: '/fixtures/restricted/',
        language: 'en',
        content: 'Synthetic restricted report metadata only.',
        meta: { title: 'Synthetic restricted report', review: 'draft' },
        filters: {
          kind: ['fixture_catalog'],
          access: ['restricted'],
          review: ['draft'],
        },
      },
    ])
      assert.deepEqual((await index.addCustomRecord(record)).errors, []);
    assert.deepEqual(
      (
        await index.addHTMLFile({
          url: '/fixtures/html-report/',
          content:
            '<html lang="zh"><body data-pagefind-body data-pagefind-filter="kind:fixture_html"><span data-pagefind-filter="review:draft"></span>二氧化碳 咸水层 封存</body></html>',
        })
      ).errors,
      []
    );
    assert.deepEqual(
      (await index.writeFiles({ outputPath: indexRoot })).errors,
      []
    );
    await index.deleteIndex();
    const terms = JSON.parse(
      fs.readFileSync(
        new URL('./data/search-terms.json', import.meta.url),
        'utf8'
      )
    );
    const profile = await prepareSearchRuntime(indexRoot, pagefind, terms);
    verifySearchRuntime(indexRoot);
    // Both shipped execution paths must remain valid JS.
    const runtime = await import(
      pathToFileURL(path.join(indexRoot, 'pagefind.js'))
    );
    server = http.createServer((request, response) => {
      const url = new URL(request.url, 'http://localhost');
      if (!url.pathname.startsWith('/ccus-policy-hub/')) {
        response.writeHead(404).end();
        return;
      }
      const relative = decodeURIComponent(
        url.pathname.slice('/ccus-policy-hub/'.length)
      );
      if (/^fixtures\/(law|report|restricted|html-report)\/$/.test(relative)) {
        response.setHeader('Content-Type', 'text/html');
        response.end('<html>Fixture target</html>');
        return;
      }
      const file = path.resolve(directory, relative);
      if (
        !file.startsWith(directory + path.sep) ||
        !fs.existsSync(file) ||
        !fs.statSync(file).isFile()
      ) {
        response.writeHead(404).end();
        return;
      }
      response.setHeader(
        'Content-Type',
        file.endsWith('.js') ? 'text/javascript' : 'application/octet-stream'
      );
      response.end(fs.readFileSync(file));
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}/ccus-policy-hub/`;
    const options = {
      basePath: baseUrl + 'pagefind/',
      baseUrl,
      noWorker: true,
    };
    let instance;
    try {
      for (const [language, query, kind] of [
        ['en', '45Q qualified facility', 'fixture_law'],
        ['zh', '咸水层 二氧化碳封存', 'fixture_catalog'],
        ['zh', '咸水层二氧化碳封存', 'fixture_catalog'],
        ['zh', '"二氧化碳封存"', 'fixture_catalog'],
        ['zh', '二氧化碳 咸水层', 'fixture_html'],
      ]) {
        // Each locale gets its own ESM/WASM state in Node; no DOM emulation.
        const localized = await import(
          pathToFileURL(path.join(indexRoot, 'pagefind.js')).href +
            `?locale=${language}`
        );
        instance = localized.createInstance({ ...options, language });
        await instance.init();
        const result = await instance.search(query, { filters: { kind } });
        assert.equal(result.results.length, 1, `${query}: ${kind}`);
        const document = await result.results[0].data();
        assert.deepEqual(document.filters.review, ['draft']);
        assert.ok(document.url.startsWith(baseUrl + 'fixtures/'));
        assert.ok(!document.url.includes('/ccus-policy-hub/ccus-policy-hub/'));
        assert.equal((await fetch(document.url)).status, 200);
        assert.equal(
          (await instance.search(query, { filters: { review: 'verified' } }))
            .results.length,
          0
        );
        if (language === 'en') {
          assert.equal(
            (
              await instance.search('Synthetic restricted', {
                filters: { access: 'restricted' },
              })
            ).results.length,
            1
          );
          assert.equal(
            (
              await instance.search('"WITHHELD_PRIVATE_TEST_TEXT"', {
                filters: { access: 'restricted' },
              })
            ).results.length,
            0
          );
        }
        await instance.destroy();
        instance = null;
      }
      await runtime.options({ ...options, language: 'zh' });
      assert.equal(
        (
          await runtime.search('二氧化碳封存', {
            filters: { kind: 'fixture_catalog' },
          })
        ).results.length,
        1
      );
      assert.equal(
        (await runtime.search('45Q', { filters: { kind: 'fixture_law' } }))
          .results.length,
        0
      );
      assert.equal(
        (
          await runtime.search('constructor', {
            filters: { kind: 'fixture_catalog' },
          })
        ).results.length,
        0
      );
    } finally {
      if (instance) await instance.destroy();
      await runtime.destroy();
    }
    const sdkPath = path.join(indexRoot, 'pagefind.js');
    fs.appendFileSync(sdkPath, '\n/* altered */');
    assert.throws(() => verifySearchRuntime(indexRoot), /integrity/);
    return {
      html_pages: htmlPages,
      profile: profile.profile,
      term_segments: profile.term_segments,
      synthetic_records_published: false,
    };
  } finally {
    await pagefind.close();
    if (server) await new Promise((resolve) => server.close(resolve));
    const resolved = fs.realpathSync(directory);
    if (
      path.dirname(resolved) !== fs.realpathSync(os.tmpdir()) ||
      !path.basename(resolved).startsWith('ccus-search-verification-')
    )
      throw new Error('Unexpected verification temporary directory.');
    fs.rmSync(resolved, { recursive: true });
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  verifySearchRuntime(path.join(root, 'dist/pagefind'));
  console.log(
    JSON.stringify(await exerciseSearchRuntime(path.join(root, 'dist')))
  );
}

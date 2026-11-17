import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  verifyDistLinks,
  verifyHtmlContent,
  verifyRssContent,
} from './verify-dist-links.mjs';

function withTempDist(files, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccus-dist-links-'));
  try {
    for (const [rel, content] of Object.entries(files)) {
      const full = path.join(dir, rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content, 'utf8');
    }
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('verifyHtmlContent catches missing base, missing trailing slash, broken target, and nested anchors', () => {
  withTempDist(
    {
      'index.html': '<html><body>Home</body></html>',
      'policy/index.html': '<html><body>Policies</body></html>',
      'reports/2601_ESG30/paper_draft.pdf': '%PDF-1.4',
    },
    (distRoot) => {
      const html = `
        <html>
          <body>
            <a href="/reports/2601_ESG30/paper_draft.pdf">missing base</a>
            <a href="/ccus-policy-hub/policy">missing slash</a>
            <a href="/ccus-policy-hub/nonexistent/">broken</a>
            <a href="/ccus-policy-hub/ccus-policy-hub/policy/">double base</a>
            <a href="/ccus-policy-hub/policy/">outer <a href="/ccus-policy-hub/">inner</a></a>
          </body>
        </html>
      `;
      const errors = verifyHtmlContent(html, 'docs/test/index.html', distRoot);
      const types = errors.map((e) => e.type).sort();
      assert.deepEqual(types, [
        'broken-link',
        'double-base',
        'missing-base',
        'missing-trailing-slash',
        'nested-anchor',
      ]);
    }
  );
});

test('verifyHtmlContent ignores script JSON payloads, comments, fragments, and external links', () => {
  withTempDist(
    {
      'index.html': '<html><body>Home</body></html>',
      'policy/index.html': '<html><body>Policies</body></html>',
      'reports/2601_ESG30/paper_draft.pdf': '%PDF-1.4',
    },
    (distRoot) => {
      const html = `
        <html>
          <head>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="canonical" href="https://liuh886.github.io/ccus-policy-hub/policy/" />
          </head>
          <body>
            <!-- <a href="/broken-in-comment">ignored</a> -->
            <script type="application/json">{"html":"<a href='/broken'><a>nested</a></a>"}</script>
            <a href="/ccus-policy-hub/">Home</a>
            <a href="/ccus-policy-hub/policy/#section">Policies</a>
            <a href="/ccus-policy-hub/reports/2601_ESG30/paper_draft.pdf">PDF</a>
            <a href="https://example.com/external">External</a>
            <a href="mailto:test@example.com">Mail</a>
          </body>
        </html>
      `;
      const errors = verifyHtmlContent(html, 'policy/index.html', distRoot);
      assert.deepEqual(errors, []);
    }
  );
});

test('verifyRssContent catches missing base and broken targets in RSS XML', () => {
  withTempDist(
    {
      'index.html': '<html></html>',
      'policy/us-45q/index.html': '<html></html>',
    },
    (distRoot) => {
      const badRss = `<?xml version="1.0"?><rss><channel>
        <link>https://liuh886.github.io/</link>
        <item>
          <link>https://liuh886.github.io/policy/us-45q/</link>
          <guid isPermaLink="true">https://liuh886.github.io/ccus-policy-hub/policy/missing/</guid>
        </item>
      </channel></rss>`;
      const errors = verifyRssContent(badRss, 'rss.xml', distRoot);
      assert.deepEqual(
        errors.map((e) => e.type),
        ['rss-missing-base', 'rss-missing-base', 'rss-broken-link']
      );

      const goodRss = `<?xml version="1.0"?><rss><channel>
        <link>https://liuh886.github.io/ccus-policy-hub/</link>
        <item>
          <link>https://liuh886.github.io/ccus-policy-hub/policy/us-45q/</link>
          <guid isPermaLink="true">https://liuh886.github.io/ccus-policy-hub/policy/us-45q/</guid>
        </item>
      </channel></rss>`;
      assert.deepEqual(verifyRssContent(goodRss, 'rss.xml', distRoot), []);
    }
  );
});

test('verifyDistLinks validates complete temp dist directory', () => {
  withTempDist(
    {
      'index.html':
        '<html><body><a href="/ccus-policy-hub/policy/">Policies</a></body></html>',
      '404.html':
        '<html><head><link rel="canonical" href="https://liuh886.github.io/ccus-policy-hub/404/" /></head><body>Not found</body></html>',
      'policy/index.html':
        '<html><body><a href="/ccus-policy-hub/">Home</a></body></html>',
      'rss.xml':
        '<rss><channel><link>https://liuh886.github.io/ccus-policy-hub/</link><item><link>https://liuh886.github.io/ccus-policy-hub/policy/</link></item></channel></rss>',
    },
    (distRoot) => {
      const result = verifyDistLinks({ distRoot });
      assert.equal(result.htmlFiles, 3);
      assert.equal(result.rssChecked, true);
      assert.deepEqual(result.errors, []);
    }
  );
});

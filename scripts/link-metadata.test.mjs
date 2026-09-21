import test from 'node:test';
import assert from 'node:assert/strict';

import {
  decodeEntities,
  extractItemLang,
  extractPublishedDate,
  extractTitle,
  fetchLinkMetadata,
  isGenericTitle,
  mapWithConcurrency,
} from './lib/link-metadata.mjs';

test('decodeEntities resolves named and numeric entities', () => {
  assert.equal(
    decodeEntities('Carbon &amp; Storage &#39;26&nbsp;co&#x2F;2'),
    "Carbon & Storage '26 co/2"
  );
});

test('extractTitle prefers og:title then falls back to <title>', () => {
  assert.equal(
    extractTitle(
      '<head><meta property="og:title" content="Reuters &amp; Co"><title>Page</title></head>'
    ),
    'Reuters & Co'
  );
  assert.equal(
    extractTitle('<head><title>  Hello   World </title></head>'),
    'Hello World'
  );
  assert.equal(extractTitle('<head></head>'), '');
});

test('extractPublishedDate reads meta tags and <time datetime>', () => {
  assert.equal(
    extractPublishedDate(
      '<meta property="article:published_time" content="2025-09-24T10:00:00Z">'
    ),
    '2025-09-24'
  );
  assert.equal(
    extractPublishedDate('<meta name="date" content="March 3, 2024">'),
    '2024-03-03'
  );
  assert.equal(
    extractPublishedDate('<time datetime="2023-07-11T00:00:00">x</time>'),
    '2023-07-11'
  );
  assert.equal(extractPublishedDate('<html></html>'), '');
});

test('extractItemLang normalizes html lang', () => {
  assert.equal(extractItemLang('<html lang="zh-CN">'), 'zh');
  assert.equal(extractItemLang('<html lang="en-US">'), 'en');
  assert.equal(extractItemLang('<html lang="fr">'), 'fr');
  assert.equal(extractItemLang('<html>'), '');
});

test('isGenericTitle rejects placeholders and accepts real headlines', () => {
  assert.equal(isGenericTitle('Client Challenge'), true);
  assert.equal(isGenericTitle('Just a moment...'), true);
  assert.equal(isGenericTitle('Attention Required! | Cloudflare'), true);
  assert.equal(isGenericTitle('Checking your browser before accessing'), true);
  assert.equal(isGenericTitle('reuters.com', 'reuters.com'), true);
  assert.equal(isGenericTitle('404 Error | ADM'), true);
  assert.equal(isGenericTitle('500 - Internal Server Error'), true);
  assert.equal(isGenericTitle('Seite nicht gefunden I thyssenkrupp'), true);
  assert.equal(isGenericTitle('Projects'), true);
  assert.equal(isGenericTitle('All Resources & News'), true);
  assert.equal(
    isGenericTitle('Launch Your Film Career with Film Production Courses'),
    true
  );
  assert.equal(isGenericTitle('abc'), true);
  assert.equal(isGenericTitle(''), true);
  assert.equal(
    isGenericTitle('Northern Lights begins CO2 storage operations'),
    false
  );
  assert.equal(
    isGenericTitle('Current Class VI Projects under Review at EPA | US EPA'),
    false
  );
});

test('fetchLinkMetadata treats anti-bot titles as failures', async () => {
  const result = await fetchLinkMetadata('https://example.com/x', {
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      headers: { get: () => 'text/html' },
      text: async () => '<title>Client Challenge</title>',
    }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'generic_title');
});

test('fetchLinkMetadata parses a fake HTML response', async () => {
  const fakeFetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: () => 'text/html; charset=utf-8' },
    text: async () =>
      '<html lang="en"><head><meta property="og:title" content="Big Project"><meta property="article:published_time" content="2025-01-02"></head></html>',
  });
  const result = await fetchLinkMetadata('https://example.com/x', {
    fetchImpl: fakeFetch,
  });
  assert.equal(result.ok, true);
  assert.equal(result.title, 'Big Project');
  assert.equal(result.publishedDate, '2025-01-02');
  assert.equal(result.itemLang, 'en');
});

test('fetchLinkMetadata reports non-html, http errors and timeouts', async () => {
  const pdf = await fetchLinkMetadata('https://example.com/f.pdf', {
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      headers: { get: () => 'application/pdf' },
      text: async () => '',
    }),
  });
  assert.equal(pdf.ok, false);
  assert.equal(pdf.reason, 'non_html');

  const notFound = await fetchLinkMetadata('https://example.com/404', {
    fetchImpl: async () => ({
      ok: false,
      status: 404,
      headers: { get: () => 'text/html' },
    }),
  });
  assert.equal(notFound.ok, false);
  assert.equal(notFound.reason, 'http_404');

  const boom = await fetchLinkMetadata('https://example.com/x', {
    fetchImpl: async () => {
      throw new Error('network down');
    },
  });
  assert.equal(boom.ok, false);
  assert.equal(boom.reason, 'fetch_error');
});

test('mapWithConcurrency preserves order and bounds workers', async () => {
  let active = 0;
  let peak = 0;
  const out = await mapWithConcurrency(
    [1, 2, 3, 4, 5, 6],
    async (n) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active -= 1;
      return n * 2;
    },
    2
  );
  assert.deepEqual(out, [2, 4, 6, 8, 10, 12]);
  assert.ok(peak <= 2, `peak concurrency ${peak} <= 2`);
});

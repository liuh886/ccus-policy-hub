import test from 'node:test';
import assert from 'node:assert/strict';

import {
  NEWS_TIERS,
  TIER_RANK,
  buildFacilityNewsRecords,
  classifyUrl,
  derivePublisher,
  extractHostname,
  normalizeUrl,
} from '../facility-news-classify.mjs';

test('normalizeUrl folds protocol, strips www, tracking params and trailing slash', () => {
  assert.equal(
    normalizeUrl(
      'http://www.Reuters.com/business/energy/story/?utm_source=x&utm_medium=y#top'
    ),
    'https://reuters.com/business/energy/story'
  );
  assert.equal(
    normalizeUrl('https://example.com/a/?b=2&a=1'),
    'https://example.com/a?a=1&b=2'
  );
});

test('normalizeUrl rejects non-http(s) and malformed input', () => {
  assert.equal(normalizeUrl('ftp://example.com/x'), null);
  assert.equal(normalizeUrl('not a url'), null);
  assert.equal(normalizeUrl(''), null);
  assert.equal(normalizeUrl(null), null);
  assert.equal(normalizeUrl(42), null);
});

test('extractHostname lowercases and strips www', () => {
  assert.equal(extractHostname('https://WWW.Energy.Gov/x'), 'energy.gov');
  assert.equal(extractHostname('nope'), '');
});

test('classifyUrl assigns official / press_release / media / reference', () => {
  assert.equal(classifyUrl('https://www.energy.gov/oced/foo'), 'official');
  assert.equal(classifyUrl('https://energy.ec.europa.eu/x'), 'official');
  assert.equal(classifyUrl('https://www.meti.go.jp/english/y'), 'official');
  assert.equal(classifyUrl('https://www.alberta.ca/z'), 'official');
  assert.equal(
    classifyUrl('https://www.prnewswire.com/news-releases/a'),
    'press_release'
  );
  assert.equal(classifyUrl('https://www.newswire.ca/news/x'), 'press_release');
  assert.equal(classifyUrl('https://www.reuters.com/business/y'), 'media');
  assert.equal(classifyUrl('https://www.offshore-energy.biz/z'), 'media');
  assert.equal(
    classifyUrl('https://example.com/newsroom/launch'),
    'press_release'
  );
  assert.equal(classifyUrl('https://example.com/about'), 'reference');
  assert.equal(classifyUrl('https://www.linkedin.com/posts/abc'), 'reference');
});

test('classifyUrl falls back to reference for unknown domains', () => {
  assert.equal(
    classifyUrl('https://some-random-blog.example/post/1'),
    'reference'
  );
});

test('derivePublisher prefers curated names then falls back to host', () => {
  assert.equal(derivePublisher('https://www.reuters.com/x'), 'Reuters');
  assert.equal(
    derivePublisher('https://www.energy.gov/x'),
    'U.S. Department of Energy'
  );
  assert.equal(derivePublisher('https://sub.example.com/x'), 'sub.example.com');
  assert.equal(derivePublisher('bad'), '');
});

test('buildFacilityNewsRecords dedupes, tiers first, and limits', () => {
  const records = buildFacilityNewsRecords([
    'https://example.com/about',
    'https://www.reuters.com/business/story?utm_source=x',
    'https://www.reuters.com/business/story',
    'https://www.energy.gov/oced/announcement',
    'https://www.prnewswire.com/news-releases/release',
  ]);

  assert.deepEqual(
    records.map((r) => r.tier),
    ['official', 'press_release', 'media', 'reference']
  );
  assert.deepEqual(
    records.map((r) => r.orderIndex),
    [0, 1, 2, 3]
  );
  assert.equal(records.length, 4, 'duplicate reuters URL collapsed');

  const limited = buildFacilityNewsRecords(
    ['https://sample.org/a', 'https://sample.org/b', 'https://sample.org/c'],
    { limit: 2 }
  );
  assert.equal(limited.length, 2);
  assert.deepEqual(
    limited.map((r) => r.orderIndex),
    [0, 1]
  );
});

test('tier vocabulary stays ordered and complete', () => {
  assert.deepEqual(
    [...NEWS_TIERS],
    ['official', 'press_release', 'media', 'reference']
  );
  for (const tier of NEWS_TIERS) {
    assert.equal(typeof TIER_RANK[tier], 'number');
  }
  assert.ok(TIER_RANK.official < TIER_RANK.press_release);
  assert.ok(TIER_RANK.press_release < TIER_RANK.media);
  assert.ok(TIER_RANK.media < TIER_RANK.reference);
});

/**
 * cached-json-fetch.test.mjs
 *
 * Unit tests for src/lib/cachedJsonFetch.ts: in-flight deduplication,
 * session-level caching, URL isolation, and error-driven cache eviction.
 */

import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fetchCachedJson } from '../src/lib/cachedJsonFetch.ts';

const originalFetch = globalThis.fetch;

beforeEach(() => {
  delete globalThis.__ccusJsonFetchCache;
  globalThis.fetch = originalFetch;
});

afterEach(() => {
  delete globalThis.__ccusJsonFetchCache;
  globalThis.fetch = originalFetch;
});

describe('fetchCachedJson', () => {
  it('rejects empty URLs with "Missing JSON asset URL." without invoking fetch', async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      throw new Error('fetch should not be called');
    };

    await assert.rejects(() => fetchCachedJson(''), {
      message: 'Missing JSON asset URL.',
    });
    assert.strictEqual(calls, 0);
  });

  it('deduplicates concurrent in-flight calls to the same URL and shares the identical promise', async () => {
    let calls = 0;
    let resolveFetch;
    const pendingFetch = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    globalThis.fetch = (url) => {
      calls += 1;
      assert.strictEqual(url, '/data/policies.json');
      return pendingFetch;
    };

    const first = fetchCachedJson('/data/policies.json');
    const second = fetchCachedJson('/data/policies.json');

    assert.strictEqual(first, second);
    assert.strictEqual(calls, 1);

    resolveFetch({
      ok: true,
      status: 200,
      json: async () => ({ items: [1, 2, 3] }),
    });

    const [a, b] = await Promise.all([first, second]);
    assert.deepStrictEqual(a, { items: [1, 2, 3] });
    assert.strictEqual(a, b);
    assert.strictEqual(calls, 1);
  });

  it('serves subsequent post-resolution calls from cache without re-fetching', async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return {
        ok: true,
        status: 200,
        json: async () => ({ version: calls }),
      };
    };

    const first = await fetchCachedJson('/data/metrics.json');
    const second = await fetchCachedJson('/data/metrics.json');

    assert.deepStrictEqual(first, { version: 1 });
    assert.strictEqual(second, first);
    assert.strictEqual(calls, 1);
  });

  it('caches distinct URLs independently', async () => {
    const requested = [];
    globalThis.fetch = async (url) => {
      requested.push(url);
      return {
        ok: true,
        status: 200,
        json: async () => ({ url }),
      };
    };

    const [a, b] = await Promise.all([
      fetchCachedJson('/data/a.json'),
      fetchCachedJson('/data/b.json'),
    ]);

    assert.deepStrictEqual(a, { url: '/data/a.json' });
    assert.deepStrictEqual(b, { url: '/data/b.json' });
    assert.deepStrictEqual(requested, ['/data/a.json', '/data/b.json']);

    const aAgain = await fetchCachedJson('/data/a.json');
    assert.strictEqual(aAgain, a);
    assert.strictEqual(requested.length, 2);
  });

  it('evicts the cache entry and allows retry after a network rejection', async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      if (calls === 1) {
        throw new TypeError('Network failure');
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ recovered: true }),
      };
    };

    await assert.rejects(() => fetchCachedJson('/data/flaky.json'), {
      name: 'TypeError',
      message: 'Network failure',
    });

    const retried = await fetchCachedJson('/data/flaky.json');
    assert.deepStrictEqual(retried, { recovered: true });
    assert.strictEqual(calls, 2);
  });

  it('evicts the cache entry and allows retry after a non-OK HTTP status', async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      if (calls === 1) {
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: 'internal' }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      };
    };

    await assert.rejects(
      () => fetchCachedJson('/data/server-error.json'),
      /HTTP 500/
    );

    const retried = await fetchCachedJson('/data/server-error.json');
    assert.deepStrictEqual(retried, { ok: true });
    assert.strictEqual(calls, 2);
  });

  it('evicts the cache entry and allows retry after a response.json() parse rejection', async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      if (calls === 1) {
        return {
          ok: true,
          status: 200,
          json: async () => {
            throw new SyntaxError('Unexpected token < in JSON');
          },
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ parsed: true }),
      };
    };

    await assert.rejects(() => fetchCachedJson('/data/bad-json.json'), {
      name: 'SyntaxError',
      message: 'Unexpected token < in JSON',
    });

    const retried = await fetchCachedJson('/data/bad-json.json');
    assert.deepStrictEqual(retried, { parsed: true });
    assert.strictEqual(calls, 2);
  });
});

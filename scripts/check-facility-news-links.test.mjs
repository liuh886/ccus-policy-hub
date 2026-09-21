import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyLinkResult,
  summarizeLinkHealth,
} from './check-facility-news-links.mjs';

test('classifyLinkResult buckets ok, dead, blocked, server and network errors', () => {
  assert.equal(classifyLinkResult({ ok: true, status: 200 }), 'ok');
  assert.equal(classifyLinkResult({ ok: false, status: 404 }), 'dead');
  assert.equal(classifyLinkResult({ ok: false, status: 410 }), 'dead');
  assert.equal(classifyLinkResult({ ok: false, status: 403 }), 'blocked');
  assert.equal(classifyLinkResult({ ok: false, status: 418 }), 'blocked');
  assert.equal(classifyLinkResult({ ok: false, status: 503 }), 'server_error');
  assert.equal(
    classifyLinkResult({ ok: false, status: 0, reason: 'timeout' }),
    'timeout'
  );
  assert.equal(
    classifyLinkResult({ ok: false, status: 200, reason: 'non_html' }),
    'non_html'
  );
  assert.equal(
    classifyLinkResult({ ok: false, status: 0, reason: 'fetch_error' }),
    'error'
  );
});

test('summarizeLinkHealth counts buckets and lists dead links', () => {
  const summary = summarizeLinkHealth([
    { ok: true, status: 200 },
    { ok: false, status: 404 },
    { ok: false, status: 410 },
    { ok: false, status: 403 },
    { ok: false, status: 0, reason: 'timeout' },
  ]);
  assert.equal(summary.total, 5);
  assert.equal(summary.buckets.ok, 1);
  assert.equal(summary.buckets.dead, 2);
  assert.equal(summary.buckets.blocked, 1);
  assert.equal(summary.buckets.timeout, 1);
  assert.equal(summary.dead_count, 2);
  assert.equal(summary.dead.length, 2);
});

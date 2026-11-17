import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import initSqlJs from 'sql.js';
import {
  buildReviewQueue,
  daysSince,
  probeSource,
} from './maintenance-review.mjs';

test('review intervals do not mutate or refresh factual provenance', async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database(
    fs.readFileSync('agent/ccus-ai-agent/db/ccus_master.sqlite')
  );
  const before = db.exec(
    'SELECT id, provenance_last_audit_date FROM policies ORDER BY id'
  );
  const a = buildReviewQueue(db, '2026-10-28');
  assert.deepEqual(a, buildReviewQueue(db, '2026-10-28'));
  assert.deepEqual(
    before,
    db.exec('SELECT id, provenance_last_audit_date FROM policies ORDER BY id')
  );
  assert.equal(a.policies.length, 130);
  assert.ok(
    a.facilities.every((f) =>
      ['Operational', 'Under construction'].includes(f.status)
    )
  );
  assert.equal(daysSince('2026-07-30', '2026-10-28'), 90);
  assert.equal(daysSince(null, '2026-10-28'), null);
  db.close();
});

test('source signals distinguish baseline, changed pages and unavailable sources', async () => {
  const fetcher = async () =>
    new Response('source v1', { headers: { 'content-type': 'text/html' } });
  const first = await probeSource('https://example.org', null, fetcher);
  assert.equal(first.signal, 'baseline_recorded');
  assert.equal(
    (await probeSource('https://example.org', first, fetcher)).signal,
    'unchanged'
  );
  assert.equal(
    (await probeSource('https://example.org', { hash: 'old' }, fetcher)).signal,
    'source_changed_review_needed'
  );
  assert.equal(
    (
      await probeSource(
        'https://example.org',
        first,
        async () => new Response('', { status: 403 })
      )
    ).signal,
    'unavailable'
  );
  assert.equal(
    (
      await probeSource(
        'https://example.org',
        first,
        async () => new Response('', { status: 404 })
      )
    ).signal,
    'dead'
  );
});

import test from 'node:test';
import assert from 'node:assert/strict';
import initSqlJs from 'sql.js';

import {
  deadUrlsFromReport,
  pruneDeadLinks,
} from './prune-facility-news-links.mjs';

function execute(db, sql, params = []) {
  const statement = db.prepare(sql);
  statement.run(params);
  statement.free();
}

function allRows(db, sql, params = []) {
  const statement = db.prepare(sql);
  statement.bind(params);
  const out = [];
  while (statement.step()) out.push(statement.getAsObject());
  statement.free();
  return out;
}

test('deadUrlsFromReport selects and normalizes only dead buckets', () => {
  const urls = deadUrlsFromReport({
    results: [
      { url: 'https://www.example.com/a/?utm_source=x', bucket: 'dead' },
      { url: 'https://example.com/b', bucket: 'ok' },
      { url: 'https://example.com/c', bucket: 'blocked' },
      { url: 'https://example.com/d', bucket: 'dead' },
    ],
  });
  assert.deepEqual(urls.sort(), [
    'https://example.com/a',
    'https://example.com/d',
  ]);
});

async function fixture() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run(`
    CREATE TABLE facility_news (
      facility_id TEXT, lang TEXT, order_index INTEGER,
      url TEXT, url_normalized TEXT, title TEXT, publisher TEXT,
      published_date TEXT, tier TEXT, item_lang TEXT, origin TEXT, verified_at TEXT,
      PRIMARY KEY(facility_id, lang, order_index)
    );
  `);
  const seed = [
    [
      '1',
      'en',
      0,
      'https://example.com/dead',
      'https://example.com/dead',
      'iea-ref',
    ],
    [
      '1',
      'zh',
      0,
      'https://example.com/dead',
      'https://example.com/dead',
      'iea-ref',
    ],
    [
      '1',
      'en',
      1,
      'https://example.com/live',
      'https://example.com/live',
      'iea-ref',
    ],
    [
      '2',
      'en',
      0,
      'https://example.com/dead',
      'https://example.com/dead',
      'iea-ref',
    ],
  ];
  seed.forEach(([f, l, i, u, n, o]) =>
    execute(
      db,
      `INSERT INTO facility_news (facility_id, lang, order_index, url, url_normalized, tier, origin)
       VALUES (?,?,?,?,?,'reference',?)`,
      [f, l, i, u, n, o]
    )
  );
  return db;
}

test('pruneDeadLinks removes all rows for a dead URL and is idempotent', async () => {
  const db = await fixture();
  const first = pruneDeadLinks(db, ['https://example.com/dead']);
  assert.equal(first.rowsDeleted, 3);
  const remaining = allRows(db, 'SELECT url_normalized FROM facility_news');
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].url_normalized, 'https://example.com/live');

  const second = pruneDeadLinks(db, ['https://example.com/dead']);
  assert.equal(second.rowsDeleted, 0, 'idempotent');
  db.close();
});

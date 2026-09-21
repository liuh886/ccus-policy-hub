import test from 'node:test';
import assert from 'node:assert/strict';
import initSqlJs from 'sql.js';

import {
  applyFacilityNewsResearch,
  validateResearchItem,
} from './ingest-facility-news-research.mjs';

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

async function createFixture() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run(`
    CREATE TABLE facilities (id TEXT PRIMARY KEY, country TEXT, status TEXT);
    CREATE TABLE facility_news (
      facility_id TEXT NOT NULL,
      lang TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      url TEXT NOT NULL,
      url_normalized TEXT NOT NULL DEFAULT '',
      title TEXT,
      publisher TEXT,
      published_date TEXT,
      tier TEXT NOT NULL DEFAULT 'reference',
      item_lang TEXT,
      origin TEXT NOT NULL DEFAULT 'iea-ref',
      verified_at TEXT,
      PRIMARY KEY(facility_id, lang, order_index)
    );
  `);
  execute(
    db,
    "INSERT INTO facilities (id, country, status) VALUES ('1','Norway','Operational')"
  );
  for (const lang of ['en', 'zh']) {
    execute(
      db,
      `INSERT INTO facility_news
         (facility_id, lang, order_index, url, url_normalized, publisher, tier, origin)
       VALUES ('1', ?, 0, 'https://example.com/portal', 'https://example.com/portal',
               'example.com', 'reference', 'iea-ref')`,
      [lang]
    );
  }
  return db;
}

test('validateResearchItem flags invalid url, title, tier and date', () => {
  assert.deepEqual(
    validateResearchItem({
      url: 'https://example.com/a',
      title: 'Real title',
      tier: 'media',
      date: '2025-01-02',
    }),
    []
  );
  assert.ok(
    validateResearchItem({ url: 'nope', title: 'x', tier: 'media' }).length
  );
  assert.ok(
    validateResearchItem({ url: 'https://e.com', title: '', tier: 'media' })
      .length
  );
  assert.ok(
    validateResearchItem({ url: 'https://e.com', title: 'x', tier: 'news' })
      .length
  );
  assert.ok(
    validateResearchItem({
      url: 'https://e.com',
      title: 'x',
      tier: 'media',
      date: 'Jan 2',
    }).length
  );
});

test('ingests curated items, mirrors locales, preserves seeded rows and orders by tier', async () => {
  const db = await createFixture();
  const summary = applyFacilityNewsResearch(db, {
    as_of: '2026-09-21',
    facilities: {
      1: [
        {
          url: 'https://www.reuters.com/business/energy/x',
          title: 'Media story',
          tier: 'media',
          date: '2025-06-01',
        },
        {
          url: 'https://www.energy.gov/oced/pr',
          title: 'Official announcement',
          tier: 'official',
          date: '2025-05-01',
        },
        {
          url: 'https://example.com/portal',
          title: 'Duplicate of seeded',
          tier: 'reference',
        },
        { url: 'not-a-url', title: 'bad', tier: 'media' },
      ],
      999: [
        {
          url: 'https://example.com/x',
          title: 'unknown facility',
          tier: 'media',
        },
      ],
    },
  });

  assert.equal(summary.itemsInserted, 2, 'two valid non-duplicate items');
  assert.equal(summary.itemsSkippedDuplicate, 1);
  assert.equal(summary.itemsSkippedInvalid, 1);
  assert.deepEqual(summary.unknownFacilities, ['999']);

  const en = allRows(
    db,
    `SELECT order_index, tier, origin, title, verified_at FROM facility_news
     WHERE facility_id='1' AND lang='en' ORDER BY order_index`
  );
  assert.deepEqual(
    en.map((r) => r.tier),
    ['official', 'media', 'reference'],
    'tier order with seeded reference last'
  );
  assert.equal(en[0].origin, 'agent-research');
  assert.equal(en[0].verified_at, '2026-09-21');
  assert.equal(en[2].origin, 'iea-ref', 'seeded row preserved');

  const zhCount = allRows(
    db,
    "SELECT COUNT(*) n FROM facility_news WHERE facility_id='1' AND lang='zh'"
  )[0].n;
  assert.equal(zhCount, 3, 'en/zh mirror parity');
  db.close();
});

test('ingest is idempotent', async () => {
  const db = await createFixture();
  const research = {
    as_of: '2026-09-21',
    facilities: {
      1: [{ url: 'https://example.com/a', title: 'A', tier: 'press_release' }],
    },
  };
  const first = applyFacilityNewsResearch(db, research);
  const countAfterFirst = allRows(db, 'SELECT COUNT(*) n FROM facility_news')[0]
    .n;
  const second = applyFacilityNewsResearch(db, research);
  const countAfterSecond = allRows(
    db,
    'SELECT COUNT(*) n FROM facility_news'
  )[0].n;
  assert.equal(first.itemsInserted, 1);
  assert.equal(second.itemsInserted, 1, 'rebuilds research rows from JSON');
  assert.equal(countAfterSecond, countAfterFirst, 'no row accumulation');
  db.close();
});

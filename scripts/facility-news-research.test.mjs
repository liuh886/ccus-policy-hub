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

test('ingests curated items, upgrades colliding seeded rows and preserves the rest', async () => {
  const db = await createFixture();
  // A seeded row that does NOT collide with any curated URL must be preserved.
  execute(
    db,
    `INSERT INTO facility_news
       (facility_id, lang, order_index, url, url_normalized, publisher, tier, origin)
     VALUES ('1','en',1,'https://example.com/keep','https://example.com/keep','example.com','reference','iea-ref'),
            ('1','zh',1,'https://example.com/keep','https://example.com/keep','example.com','reference','iea-ref')`
  );
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
          title: 'Upgraded seeded',
          tier: 'press_release',
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

  assert.equal(summary.itemsInserted, 2, 'two valid new items');
  assert.equal(summary.itemsUpgraded, 1, 'colliding seeded URL upgraded');
  assert.equal(summary.itemsTierChanged, 1);
  assert.equal(summary.itemsSkippedDuplicate, 0);
  assert.equal(summary.itemsSkippedInvalid, 1);
  assert.deepEqual(summary.unknownFacilities, ['999']);

  const en = allRows(
    db,
    `SELECT order_index, tier, origin, title FROM facility_news
     WHERE facility_id='1' AND lang='en' ORDER BY order_index`
  );
  assert.deepEqual(
    en.map((r) => r.tier),
    ['official', 'press_release', 'media', 'reference'],
    'tier order with the upgraded press_release second'
  );
  assert.equal(en[0].origin, 'agent-research');
  const upgraded = en.find((r) => r.title === 'Upgraded seeded');
  assert.equal(upgraded.tier, 'press_release', 'curated tier wins');
  assert.equal(upgraded.origin, 'agent-research');
  assert.equal(
    en.filter((r) => r.origin === 'iea-ref').length,
    1,
    'non-colliding seeded row preserved'
  );

  const zhCount = allRows(
    db,
    "SELECT COUNT(*) n FROM facility_news WHERE facility_id='1' AND lang='zh'"
  )[0].n;
  assert.equal(zhCount, 4, 'en/zh mirror parity');
  db.close();
});

test('upgrades a seeded row in place when a curated URL collides', async () => {
  const db = await createFixture();
  const summary = applyFacilityNewsResearch(db, {
    as_of: '2026-09-21',
    facilities: {
      // Same URL as the seeded 'reference' row, curated as press_release with
      // a date: the curated metadata must win, with no duplicate inserted.
      1: [
        {
          url: 'https://example.com/portal',
          title: 'Upgraded curated title',
          publisher: 'Example Newsroom',
          date: '2025-04-01',
          tier: 'press_release',
        },
      ],
    },
  });

  assert.equal(summary.itemsInserted, 0, 'no new row for a colliding URL');
  assert.equal(summary.itemsUpgraded, 1);
  assert.equal(summary.itemsTierChanged, 1);

  const en = allRows(
    db,
    `SELECT order_index, tier, origin, title, publisher, published_date, verified_at
     FROM facility_news WHERE facility_id='1' AND lang='en' ORDER BY order_index`
  );
  assert.equal(en.length, 1, 'still exactly one row for the URL');
  assert.equal(en[0].tier, 'press_release', 'curated tier wins');
  assert.equal(en[0].origin, 'agent-research');
  assert.equal(en[0].title, 'Upgraded curated title');
  assert.equal(en[0].publisher, 'Example Newsroom');
  assert.equal(en[0].published_date, '2025-04-01');
  assert.equal(en[0].verified_at, '2026-09-21');

  const zhCount = allRows(
    db,
    "SELECT COUNT(*) n FROM facility_news WHERE facility_id='1' AND lang='zh'"
  )[0].n;
  assert.equal(zhCount, 1, 'en/zh mirror parity');
  db.close();
});

test('keeps the preserved value when the curated item omits a field', async () => {
  const db = await createFixture();
  execute(
    db,
    "UPDATE facility_news SET published_date='2024-01-01' WHERE facility_id='1'"
  );
  applyFacilityNewsResearch(db, {
    as_of: '2026-09-21',
    facilities: {
      1: [
        {
          url: 'https://example.com/portal',
          title: 'Curated title',
          tier: 'media',
          // no date supplied
        },
      ],
    },
  });
  const en = allRows(
    db,
    "SELECT published_date, tier FROM facility_news WHERE facility_id='1' AND lang='en'"
  );
  assert.equal(en[0].published_date, '2024-01-01', 'preserved date kept');
  assert.equal(en[0].tier, 'media', 'curated tier wins');
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

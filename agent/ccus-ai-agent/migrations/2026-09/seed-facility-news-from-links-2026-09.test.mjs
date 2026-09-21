import assert from 'node:assert/strict';
import test from 'node:test';
import initSqlJs from 'sql.js';

import {
  MIGRATION_ID,
  applyFacilityNewsSeedMigration,
} from './seed-facility-news-from-links-2026-09.mjs';

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
    CREATE TABLE facilities (
      id TEXT PRIMARY KEY,
      country TEXT,
      status TEXT
    );
    CREATE TABLE facility_links (
      facility_id TEXT NOT NULL,
      lang TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      link TEXT NOT NULL,
      PRIMARY KEY(facility_id, lang, order_index)
    );
    CREATE TABLE db_meta (key TEXT PRIMARY KEY, value TEXT);
  `);
  execute(
    db,
    "INSERT INTO facilities (id, country, status) VALUES ('1','France','Operational')"
  );
  execute(
    db,
    "INSERT INTO facilities (id, country, status) VALUES ('2','Norway','Operational')"
  );

  const links = [
    'https://example.com/about',
    'https://www.reuters.com/business/energy/story?utm_source=x',
    'https://www.energy.gov/oced/announcement',
    'https://www.prnewswire.com/news-releases/demo',
    'https://www.reuters.com/business/energy/story',
  ];
  links.forEach((link, i) => {
    for (const lang of ['en', 'zh']) {
      execute(
        db,
        `INSERT INTO facility_links (facility_id, lang, order_index, link)
         VALUES ('1', ?, ?, ?)`,
        [lang, i, link]
      );
    }
  });
  return db;
}

test('seeds tier-ordered, deduplicated facility_news for both locales', async () => {
  const db = await createFixture();
  const summary = applyFacilityNewsSeedMigration(db);

  assert.equal(summary.migrationId, MIGRATION_ID);
  assert.equal(summary.facilitiesWithNews, 2);

  const rows = allRows(
    db,
    `SELECT lang, order_index, tier, url_normalized, publisher, origin
     FROM facility_news WHERE facility_id='1' AND lang='en'
     ORDER BY order_index`
  );
  assert.deepEqual(
    rows.map((r) => r.tier),
    ['official', 'press_release', 'media', 'reference']
  );
  assert.deepEqual(
    rows.map((r) => r.order_index),
    [0, 1, 2, 3]
  );
  assert.equal(rows[0].publisher, 'U.S. Department of Energy');
  assert.equal(rows[2].publisher, 'Reuters');
  assert.ok(rows.every((r) => r.origin === 'iea-ref'));
  // duplicate Reuters URL collapsed
  assert.equal(rows.filter((r) => r.tier === 'media').length, 1);

  const zhCount = allRows(
    db,
    `SELECT COUNT(*) AS n FROM facility_news WHERE facility_id='1' AND lang='zh'`
  )[0].n;
  assert.equal(zhCount, 4, 'en/zh mirror parity');

  const meta = allRows(db, 'SELECT value FROM db_meta WHERE key = ?', [
    `migration:${MIGRATION_ID}`,
  ]);
  assert.ok(meta[0]?.value);
  db.close();
});

test('migration is idempotent', async () => {
  const db = await createFixture();
  const first = applyFacilityNewsSeedMigration(db);
  const firstCount = allRows(db, 'SELECT COUNT(*) AS n FROM facility_news')[0]
    .n;
  const second = applyFacilityNewsSeedMigration(db);
  const secondCount = allRows(db, 'SELECT COUNT(*) AS n FROM facility_news')[0]
    .n;
  assert.equal(first.rowsUpserted, firstCount);
  assert.equal(secondCount, firstCount);
  assert.equal(second.rowsUpserted, first.rowsUpserted);
  db.close();
});

test('preserves curated rows and keeps global tier order', async () => {
  const db = await createFixture();
  applyFacilityNewsSeedMigration(db);

  execute(
    db,
    `INSERT INTO facility_news
       (facility_id, lang, order_index, url, url_normalized, title, publisher,
        published_date, tier, origin, verified_at)
     VALUES ('1','en', 99,
       'https://www.energy.gov/oced/fresh', 'https://energy.gov/oced/fresh',
       'Fresh official release', 'U.S. Department of Energy', '2026-01-02',
       'official', 'agent-research', '2026-09-21')`
  );

  applyFacilityNewsSeedMigration(db);

  const rows = allRows(
    db,
    `SELECT tier, origin, url_normalized FROM facility_news
     WHERE facility_id='1' AND lang='en' ORDER BY order_index`
  );
  const research = rows.find((r) => r.origin === 'agent-research');
  assert.ok(research, 'curated row survives reseed');
  assert.equal(rows[0].tier, 'official');
  assert.equal(
    rows.findIndex((r) => r.origin === 'agent-research'),
    0
  );
  assert.deepEqual(
    rows.map((r) => r.tier),
    ['official', 'official', 'press_release', 'media', 'reference']
  );
  db.close();
});

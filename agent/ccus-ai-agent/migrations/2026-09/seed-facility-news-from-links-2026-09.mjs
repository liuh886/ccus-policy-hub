#!/usr/bin/env node
/**
 * Seed `facility_news` from the existing `facility_links` (IEA `Ref 1..7`).
 *
 * Every facility already carries 0..7 externally sourced reference URLs. This
 * migration normalizes, deduplicates, and tier-classifies them into
 * `facility_news` so the profile "Reference Matrix" can render a formal,
 * tiered source list without inventing anything new.
 *
 * Idempotent per (facility_id, lang): rows with origin='iea-ref' are rebuilt
 * from `facility_links`, while research/manual rows are preserved and
 * re-interleaved by tier so first-party press releases and official
 * announcements always sort first.
 *
 * Schema change (new table + index) is applied here too, guarded by
 * CREATE ... IF NOT EXISTS, so a fresh checkout converges in one run.
 *
 * Generated Markdown/JSON must be rebuilt from SQLite after this runs.
 * See migrations/2026-09/manifest.md for the approval record.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';
import {
  acquireDbLock,
  atomicWriteDb,
  releaseDbLock,
} from '../../../../scripts/lib/db-write.mjs';
import {
  TIER_RANK,
  buildFacilityNewsRecords,
} from '../../logic/facility-news-classify.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../../..');
const DB_PATH = path.join(ROOT, 'agent/ccus-ai-agent/db/ccus_master.sqlite');

export const MIGRATION_ID = 'seed-facility-news-from-links-2026-09';
export const AUDIT_DATE = '2026-09-21';
const MAX_ITEMS_PER_FACILITY = 20;

const FACILITY_NEWS_DDL = `
CREATE TABLE IF NOT EXISTS facility_news (
  facility_id TEXT NOT NULL,
  lang TEXT NOT NULL CHECK(lang IN ('en','zh')),
  order_index INTEGER NOT NULL,
  url TEXT NOT NULL,
  url_normalized TEXT NOT NULL DEFAULT '',
  title TEXT,
  publisher TEXT,
  published_date TEXT,
  tier TEXT NOT NULL DEFAULT 'reference'
    CHECK(tier IN ('official','press_release','media','reference')),
  item_lang TEXT,
  origin TEXT NOT NULL DEFAULT 'iea-ref'
    CHECK(origin IN ('iea-ref','agent-research','manual')),
  verified_at TEXT,
  PRIMARY KEY(facility_id, lang, order_index),
  FOREIGN KEY(facility_id) REFERENCES facilities(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_facility_news_dedup
  ON facility_news(facility_id, lang, url_normalized);
`;

function execute(db, sql, params = []) {
  const statement = db.prepare(sql);
  statement.run(params);
  statement.free();
}

function rows(db, sql, params = []) {
  const statement = db.prepare(sql);
  statement.bind(params);
  const out = [];
  while (statement.step()) out.push(statement.getAsObject());
  statement.free();
  return out;
}

/** Resolve (facility_id, lang) pairs that own at least one source link. */
function facilityLangPairs(db) {
  return rows(
    db,
    `SELECT DISTINCT facility_id, lang FROM facility_links
     ORDER BY facility_id, lang`
  );
}

export function applyFacilityNewsSeedMigration(db) {
  db.run('PRAGMA foreign_keys = ON');
  db.exec(FACILITY_NEWS_DDL);

  const pairs = facilityLangPairs(db);
  const tierCounts = {
    official: 0,
    press_release: 0,
    media: 0,
    reference: 0,
  };
  let rowsUpserted = 0;
  let facilitiesWithNews = 0;

  db.run('BEGIN TRANSACTION');
  try {
    for (const { facility_id: facilityId, lang } of pairs) {
      const links = rows(
        db,
        `SELECT link FROM facility_links
         WHERE facility_id = ? AND lang = ? ORDER BY order_index`,
        [facilityId, lang]
      ).map((r) => r.link);

      const seeded = buildFacilityNewsRecords(links, {
        limit: MAX_ITEMS_PER_FACILITY,
      });
      if (seeded.length === 0) continue;

      // Preserve curated rows (research/manual); rebuild only iea-ref rows.
      const preserved = rows(
        db,
        `SELECT url, url_normalized, title, publisher, published_date, tier,
                item_lang, origin, verified_at
         FROM facility_news
         WHERE facility_id = ? AND lang = ? AND origin <> 'iea-ref'`,
        [facilityId, lang]
      );

      const preservedKeys = new Set(preserved.map((r) => r.url_normalized));
      const seededRows = seeded
        .filter((r) => !preservedKeys.has(r.urlNormalized))
        .map((r, index) => ({
          url: r.url,
          url_normalized: r.urlNormalized,
          title: r.title,
          publisher: r.publisher,
          published_date: r.publishedDate,
          tier: r.tier,
          item_lang: r.itemLang,
          origin: 'iea-ref',
          verified_at: null,
          sortIndex: preserved.length + index,
        }));
      const merged = [
        ...preserved.map((r, index) => ({ ...r, sortIndex: index })),
        ...seededRows,
      ];
      merged.sort((a, b) => {
        const rank = TIER_RANK[a.tier] - TIER_RANK[b.tier];
        return rank !== 0 ? rank : a.sortIndex - b.sortIndex;
      });

      execute(
        db,
        'DELETE FROM facility_news WHERE facility_id = ? AND lang = ?',
        [facilityId, lang]
      );
      merged.forEach((row, orderIndex) => {
        execute(
          db,
          `INSERT INTO facility_news
             (facility_id, lang, order_index, url, url_normalized, title,
              publisher, published_date, tier, item_lang, origin, verified_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            facilityId,
            lang,
            orderIndex,
            row.url,
            row.url_normalized,
            row.title ?? null,
            row.publisher ?? null,
            row.published_date ?? null,
            row.tier,
            row.item_lang ?? null,
            row.origin,
            row.verified_at ?? null,
          ]
        );
        tierCounts[row.tier] += 1;
        rowsUpserted += 1;
      });
      facilitiesWithNews += 1;
    }

    execute(db, 'INSERT OR REPLACE INTO db_meta (key, value) VALUES (?, ?)', [
      `migration:${MIGRATION_ID}`,
      AUDIT_DATE,
    ]);
    db.run('COMMIT');
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }

  const facilityTotal = rows(db, 'SELECT COUNT(*) AS n FROM facilities')[0]?.n;
  return {
    migrationId: MIGRATION_ID,
    auditDate: AUDIT_DATE,
    facilitiesTotal: facilityTotal,
    facilitiesWithNews,
    rowsUpserted,
    tierCounts,
  };
}

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database not found: ${DB_PATH}`);
  }
  acquireDbLock();
  try {
    const SQL = await initSqlJs();
    const db = new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)));
    const summary = applyFacilityNewsSeedMigration(db);
    const output = db.export();
    db.close();
    atomicWriteDb(DB_PATH, output);
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    releaseDbLock();
  }
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  main().catch((error) => {
    console.error(`Facility news seed migration failed: ${error.message}`);
    process.exit(1);
  });
}

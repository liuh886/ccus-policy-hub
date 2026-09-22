#!/usr/bin/env node
/**
 * Ingest curated, evidence-backed facility news from
 * `scripts/data/facility-news-research.json` into `facility_news`.
 *
 * Each curated item must carry a real, resolvable URL, a title, and an
 * evidence tier. Items are inserted as `origin='agent-research'` with a
 * `verified_at` date and mirrored across en/zh (original-language title, like
 * the seeded `iea-ref` rows). When a curated URL already exists as a seeded
 * row, the curated tier/title/date **upgrade that row in place** (curated
 * metadata wins); only genuinely new URLs are inserted. Rows are re-sorted by
 * tier so press releases and official announcements stay first.
 *
 * Idempotent: re-running rebuilds only the `agent-research` rows from the JSON
 * and leaves seeded/other rows untouched.
 *
 * Usage:
 *   node scripts/ingest-facility-news-research.mjs [--dry-run] [--file <path>]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';
import {
  acquireDbLock,
  atomicWriteDb,
  releaseDbLock,
} from './lib/db-write.mjs';
import {
  NEWS_TIERS,
  TIER_RANK,
  derivePublisher,
  normalizeUrl,
} from '../agent/ccus-ai-agent/logic/facility-news-classify.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'agent/ccus-ai-agent/db/ccus_master.sqlite');
const DEFAULT_RESEARCH_PATH = path.join(
  __dirname,
  'data/facility-news-research.json'
);

function parseArgs(argv) {
  const args = { dryRun: false, file: DEFAULT_RESEARCH_PATH };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--dry-run') args.dryRun = true;
    else if (token === '--file') args.file = path.resolve(argv[++i]);
    else throw new Error(`Unknown argument: ${token}`);
  }
  return args;
}

function rows(db, sql, params = []) {
  const statement = db.prepare(sql);
  statement.bind(params);
  const out = [];
  while (statement.step()) out.push(statement.getAsObject());
  statement.free();
  return out;
}

function execute(db, sql, params = []) {
  const statement = db.prepare(sql);
  statement.run(params);
  statement.free();
}

/** Validate one curated item; returns a list of problems (empty = valid). */
export function validateResearchItem(item) {
  const problems = [];
  if (!item || typeof item !== 'object') return ['not an object'];
  if (normalizeUrl(item.url) === null) problems.push('invalid or missing url');
  if (!item.title || typeof item.title !== 'string')
    problems.push('missing title');
  if (!NEWS_TIERS.includes(item.tier))
    problems.push(`invalid tier: ${item.tier}`);
  if (item.date && !/^\d{4}-\d{2}-\d{2}$/.test(item.date))
    problems.push(`invalid date: ${item.date}`);
  return problems;
}

export function applyFacilityNewsResearch(db, research) {
  db.run('PRAGMA foreign_keys = ON');
  const asOf = research.as_of || '';
  const facilityIds = Object.keys(research.facilities || {});
  const knownFacilities = new Set(
    rows(db, 'SELECT id FROM facilities').map((r) => String(r.id))
  );

  const summary = {
    asOf,
    facilitiesRequested: facilityIds.length,
    facilitiesUpdated: 0,
    itemsInserted: 0,
    itemsUpgraded: 0,
    itemsTierChanged: 0,
    itemsSkippedDuplicate: 0,
    itemsSkippedInvalid: 0,
    unknownFacilities: [],
    invalidItems: [],
  };

  db.run('BEGIN TRANSACTION');
  try {
    for (const facilityId of facilityIds) {
      if (!knownFacilities.has(String(facilityId))) {
        summary.unknownFacilities.push(facilityId);
        continue;
      }
      const curated = Array.isArray(research.facilities[facilityId])
        ? research.facilities[facilityId]
        : [];

      let updatedThisFacility = false;
      for (const lang of ['en', 'zh']) {
        const existing = rows(
          db,
          `SELECT url, url_normalized, title, publisher, published_date, tier,
                  item_lang, origin, verified_at
           FROM facility_news
           WHERE facility_id = ? AND lang = ? ORDER BY order_index`,
          [facilityId, lang]
        );
        const preserved = existing.filter((r) => r.origin !== 'agent-research');

        // Curated items keyed by normalized URL, validated first. When a
        // curated item shares a URL with a preserved (iea-ref) row the curated
        // metadata wins: tier/title/date are upgraded in place rather than the
        // item being dropped as a duplicate. Curated tier is authoritative;
        // other fields fall back to the preserved value when the curated item
        // omits them.
        const curatedByUrl = new Map();
        for (const item of curated) {
          const problems = validateResearchItem(item);
          if (problems.length > 0) {
            if (lang === 'en') {
              summary.itemsSkippedInvalid += 1;
              summary.invalidItems.push({
                facilityId,
                url: item?.url || null,
                problems,
              });
            }
            continue;
          }
          const normalized = normalizeUrl(item.url);
          if (!curatedByUrl.has(normalized)) {
            curatedByUrl.set(normalized, { item, normalized });
          }
        }

        const upgraded = [];
        const appliedKeys = new Set();
        for (const row of preserved) {
          const match = curatedByUrl.get(row.url_normalized);
          if (!match) {
            upgraded.push({ ...row });
            continue;
          }
          appliedKeys.add(row.url_normalized);
          const item = match.item;
          upgraded.push({
            url: row.url,
            url_normalized: row.url_normalized,
            title: item.title,
            publisher:
              item.publisher || row.publisher || derivePublisher(row.url),
            published_date: item.date || row.published_date || null,
            tier: item.tier,
            item_lang: item.itemLang || row.item_lang || null,
            origin: 'agent-research',
            verified_at: asOf || null,
          });
          if (lang === 'en') {
            summary.itemsUpgraded += 1;
            if (row.tier !== item.tier) summary.itemsTierChanged += 1;
          }
        }

        const additions = [];
        for (const [normalized, match] of curatedByUrl) {
          if (appliedKeys.has(normalized)) continue;
          const item = match.item;
          additions.push({
            url: item.url.trim(),
            url_normalized: normalized,
            title: item.title,
            publisher: item.publisher || derivePublisher(item.url),
            published_date: item.date || null,
            tier: item.tier,
            item_lang: item.itemLang || null,
            origin: 'agent-research',
            verified_at: asOf || null,
          });
        }

        const merged = [
          ...upgraded.map((r, index) => ({ ...r, sortIndex: index })),
          ...additions.map((r, index) => ({
            ...r,
            sortIndex: upgraded.length + index,
          })),
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
        });
        if (lang === 'en') {
          summary.itemsInserted += additions.length;
        }
        if (additions.length > 0 || upgraded.length > 0)
          updatedThisFacility = true;
      }
      if (updatedThisFacility) summary.facilitiesUpdated += 1;
    }
    db.run('COMMIT');
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }

  return summary;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(DB_PATH))
    throw new Error(`Database not found: ${DB_PATH}`);
  if (!fs.existsSync(args.file)) {
    throw new Error(`Research file not found: ${args.file}`);
  }
  const research = JSON.parse(fs.readFileSync(args.file, 'utf8'));

  acquireDbLock();
  try {
    const SQL = await initSqlJs();
    const db = new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)));
    const summary = applyFacilityNewsResearch(db, research);
    if (!args.dryRun) atomicWriteDb(DB_PATH, db.export());
    db.close();
    console.log(JSON.stringify({ dryRun: args.dryRun, ...summary }, null, 2));
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
    console.error(`Facility news research ingest failed: ${error.message}`);
    process.exit(1);
  });
}

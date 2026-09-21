#!/usr/bin/env node
/**
 * Enrich `facility_news` rows with real page metadata (title, publication
 * date, language).
 *
 * Data-preparation only; never part of the build. For every distinct URL that
 * still lacks a title it performs one capped GET (via `lib/link-metadata.mjs`)
 * and writes the parsed title/date/language back to every row sharing that
 * normalized URL, across facilities and locales. Re-running only processes
 * rows that are still missing a title, so it is resumable.
 *
 * Usage:
 *   node scripts/enrich-facility-news-metadata.mjs [--limit N]
 *        [--concurrency N] [--timeout MS] [--dry-run]
 *
 * A per-run report (counts + failures) is written to
 * agent/ccus-ai-agent/governance/reports/facility_news_enrichment_report.json.
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
  fetchLinkMetadata,
  isGenericTitle,
  mapWithConcurrency,
} from './lib/link-metadata.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'agent/ccus-ai-agent/db/ccus_master.sqlite');
const REPORT_PATH = path.join(
  ROOT,
  'agent/ccus-ai-agent/governance/reports/facility_news_enrichment_report.json'
);

function parseArgs(argv) {
  const args = {
    limit: Infinity,
    concurrency: 8,
    timeout: 15000,
    dryRun: false,
    sanitizeOnly: false,
    batch: 150,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--dry-run') args.dryRun = true;
    else if (token === '--sanitize-only') args.sanitizeOnly = true;
    else if (token === '--limit') args.limit = Number(argv[++i]);
    else if (token === '--concurrency') args.concurrency = Number(argv[++i]);
    else if (token === '--timeout') args.timeout = Number(argv[++i]);
    else if (token === '--batch') args.batch = Number(argv[++i]);
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

/**
 * Null out previously stored placeholder titles (anti-bot / paywall pages)
 * so they fall back to the publisher name and are retried on the next run.
 */
export function sanitizeExistingTitles(db) {
  const stored = rows(
    db,
    `SELECT title, url_normalized FROM facility_news
     WHERE title IS NOT NULL AND title <> ''
     GROUP BY url_normalized, title`
  );
  const genericUrls = new Set();
  for (const row of stored) {
    let hostname = '';
    try {
      hostname = new URL(row.url_normalized).hostname
        .toLowerCase()
        .replace(/^www\./, '');
    } catch {
      hostname = '';
    }
    if (isGenericTitle(row.title, hostname))
      genericUrls.add(row.url_normalized);
  }
  db.run('BEGIN TRANSACTION');
  try {
    for (const url of genericUrls) {
      execute(
        db,
        'UPDATE facility_news SET title = NULL WHERE url_normalized = ?',
        [url]
      );
    }
    db.run('COMMIT');
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
  return genericUrls.size;
}

export function pendingUrls(db, limit = Infinity) {
  const distinct = rows(
    db,
    `SELECT url, url_normalized, MIN(url) AS sample
     FROM facility_news
     WHERE origin <> 'manual' AND (title IS NULL OR title = '')
     GROUP BY url_normalized
     ORDER BY url_normalized`
  );
  return limit === Infinity ? distinct : distinct.slice(0, limit);
}

export async function enrichFacilityNews(
  db,
  {
    limit = Infinity,
    concurrency = 8,
    timeout = 15000,
    dryRun = false,
    batch = 150,
    onChunk = null,
  } = {}
) {
  const clearedGeneric = sanitizeExistingTitles(db);
  const targets = pendingUrls(db, limit);
  const startedAt = new Date().toISOString();

  const failures = [];
  let withTitle = 0;
  let withDate = 0;
  let processed = 0;

  for (let start = 0; start < targets.length; start += batch) {
    const chunk = targets.slice(start, start + batch);
    const results = await mapWithConcurrency(
      chunk,
      async (target) => ({
        ...(await fetchLinkMetadata(target.url, { timeoutMs: timeout })),
        urlNormalized: target.url_normalized,
      }),
      concurrency
    );

    for (const result of results) {
      if (result.title) withTitle += 1;
      if (result.publishedDate) withDate += 1;
      if (!result.ok || !result.title) {
        failures.push({
          url: result.url,
          reason: result.reason || (result.ok ? 'no_title' : 'error'),
          status: result.status || 0,
        });
        continue;
      }
      if (dryRun) continue;
      execute(
        db,
        `UPDATE facility_news
           SET title = ?,
               published_date = COALESCE(published_date, ?),
               item_lang = COALESCE(NULLIF(item_lang, ''), ?)
         WHERE url_normalized = ? AND (title IS NULL OR title = '')`,
        [
          result.title,
          result.publishedDate || null,
          result.itemLang || null,
          result.urlNormalized,
        ]
      );
    }

    processed += chunk.length;
    if (!dryRun && typeof onChunk === 'function') {
      onChunk(processed, withTitle, failures.length);
      writeReport({
        startedAt,
        dryRun,
        targets: targets.length,
        processed,
        withTitle,
        withDate,
        clearedGeneric,
        failures,
        done: processed >= targets.length,
      });
    }
  }

  const report = writeReport({
    startedAt,
    dryRun,
    targets: targets.length,
    processed,
    withTitle,
    withDate,
    clearedGeneric,
    failures,
    done: true,
  });

  return report;
}

function writeReport({
  startedAt,
  dryRun,
  targets,
  processed,
  withTitle,
  withDate,
  clearedGeneric,
  failures,
  done,
}) {
  const report = {
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    done,
    dry_run: dryRun,
    targets,
    processed,
    cleared_generic: clearedGeneric,
    with_title: withTitle,
    with_date: withDate,
    failures,
  };
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database not found: ${DB_PATH}`);
  }

  acquireDbLock();
  try {
    const SQL = await initSqlJs();
    const db = new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)));
    if (args.sanitizeOnly) {
      const cleared = sanitizeExistingTitles(db);
      atomicWriteDb(DB_PATH, db.export());
      db.close();
      console.log(JSON.stringify({ sanitizeOnly: true, cleared }, null, 2));
      return;
    }
    const report = await enrichFacilityNews(db, {
      ...args,
      onChunk: (processed, withTitle, failures) => {
        atomicWriteDb(DB_PATH, db.export());
        console.log(
          `  progress ${processed} fetched | titles ${withTitle} | failures ${failures}`
        );
      },
    });
    if (!args.dryRun) {
      atomicWriteDb(DB_PATH, db.export());
    }
    db.close();
    console.log(
      JSON.stringify(
        {
          targets: report.targets,
          clearedGeneric: report.cleared_generic,
          withTitle: report.with_title,
          withDate: report.with_date,
          failures: report.failures.length,
          dryRun: report.dry_run,
        },
        null,
        2
      )
    );
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
    console.error(`Facility news enrichment failed: ${error.message}`);
    process.exit(1);
  });
}

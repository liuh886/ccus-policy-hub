#!/usr/bin/env node
/**
 * Prune confirmed-dead links from `facility_news`.
 *
 * Reads a link-health report produced by `check-facility-news-links.mjs` and
 * deletes every `facility_news` row whose normalized URL is bucketed `dead`
 * (HTTP 404/410). `blocked`, `timeout`, `non_html`, `server_error` and `error`
 * are NOT pruned — they are environmental, not link rot.
 *
 * Idempotent: re-running after a prune deletes zero rows. `facility_links`
 * (raw IEA source) is left untouched; only the curated display layer changes.
 *
 * Usage:
 *   node scripts/prune-facility-news-links.mjs [--report <path>] [--dry-run]
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
import { normalizeUrl } from '../agent/ccus-ai-agent/logic/facility-news-classify.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'agent/ccus-ai-agent/db/ccus_master.sqlite');
const DEFAULT_REPORT = path.join(
  ROOT,
  'agent/ccus-ai-agent/governance/reports/facility_news_link_health.json'
);

function parseArgs(argv) {
  const args = { report: DEFAULT_REPORT, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--dry-run') args.dryRun = true;
    else if (token === '--report') args.report = path.resolve(argv[++i]);
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

/** Normalized URLs bucketed `dead` in a link-health report. */
export function deadUrlsFromReport(report) {
  const urls = new Set();
  for (const result of report.results || []) {
    if (result.bucket !== 'dead') continue;
    const normalized = normalizeUrl(result.url);
    if (normalized) urls.add(normalized);
  }
  return [...urls];
}

export function pruneDeadLinks(db, deadUrls) {
  const summary = { deadUrls: deadUrls.length, rowsDeleted: 0, byOrigin: {} };
  db.run('BEGIN TRANSACTION');
  try {
    for (const url of deadUrls) {
      const affected = rows(
        db,
        'SELECT DISTINCT origin FROM facility_news WHERE url_normalized = ?',
        [url]
      ).map((r) => r.origin);
      execute(db, 'DELETE FROM facility_news WHERE url_normalized = ?', [url]);
      const deleted = rows(db, 'SELECT changes() AS n')[0].n;
      summary.rowsDeleted += deleted;
      for (const origin of affected) {
        summary.byOrigin[origin] = (summary.byOrigin[origin] || 0) + 1;
      }
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
  if (!fs.existsSync(args.report)) {
    throw new Error(`Report not found: ${args.report}`);
  }
  const report = JSON.parse(fs.readFileSync(args.report, 'utf8'));
  const deadUrls = deadUrlsFromReport(report);
  if (deadUrls.length === 0) {
    console.log(
      JSON.stringify({ deadUrls: 0, note: 'nothing to prune' }, null, 2)
    );
    return;
  }

  acquireDbLock();
  try {
    const SQL = await initSqlJs();
    const db = new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)));
    const summary = pruneDeadLinks(db, deadUrls);
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
    console.error(`Facility news dead-link prune failed: ${error.message}`);
    process.exit(1);
  });
}

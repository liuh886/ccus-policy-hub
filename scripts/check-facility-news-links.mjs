#!/usr/bin/env node
/**
 * Read-only link-rot check for `facility_news`.
 *
 * Performs one capped GET per distinct source URL and classifies each as ok /
 * dead / blocked / timeout / server_error / non_html / error. Writes a JSON and
 * Markdown report under `agent/ccus-ai-agent/governance/reports/`. Never writes
 * to the database.
 *
 * `blocked` (401/403/406/418/429) is expected for anti-bot sites and is NOT
 * link rot; only `dead` (404/410) indicates a removed page. Reports are
 * advisory — a scheduled review input, not a build gate.
 *
 * Usage:
 *   node scripts/check-facility-news-links.mjs [--limit N] [--concurrency N]
 *        [--timeout MS] [--only-dead]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';
import { fetchLinkMetadata, mapWithConcurrency } from './lib/link-metadata.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'agent/ccus-ai-agent/db/ccus_master.sqlite');
const REPORT_JSON = path.join(
  ROOT,
  'agent/ccus-ai-agent/governance/reports/facility_news_link_health.json'
);
const REPORT_MD = path.join(
  ROOT,
  'agent/ccus-ai-agent/governance/reports/facility_news_link_health.md'
);

function parseArgs(argv) {
  const args = {
    limit: Infinity,
    concurrency: 8,
    timeout: 20000,
    onlyDead: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--limit') args.limit = Number(argv[++i]);
    else if (token === '--concurrency') args.concurrency = Number(argv[++i]);
    else if (token === '--timeout') args.timeout = Number(argv[++i]);
    else if (token === '--only-dead') args.onlyDead = true;
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

/** Classify a fetch result into a link-health bucket. */
export function classifyLinkResult(result) {
  if (result.ok) return 'ok';
  const status = result.status || 0;
  if (status === 404 || status === 410) return 'dead';
  if ([401, 403, 406, 418, 429].includes(status)) return 'blocked';
  if (status >= 500) return 'server_error';
  if (result.reason === 'timeout') return 'timeout';
  if (result.reason === 'non_html') return 'non_html';
  return 'error';
}

export function summarizeLinkHealth(results) {
  const buckets = {};
  const dead = [];
  for (const result of results) {
    const bucket = classifyLinkResult(result);
    buckets[bucket] = (buckets[bucket] || 0) + 1;
    if (bucket === 'dead') {
      dead.push({ url: result.url, status: result.status });
    }
  }
  return {
    total: results.length,
    buckets,
    dead,
    dead_count: dead.length,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(DB_PATH))
    throw new Error(`Database not found: ${DB_PATH}`);

  const SQL = await initSqlJs();
  const db = new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)));
  const distinct = rows(
    db,
    `SELECT url, url_normalized, MIN(tier) AS tier, COUNT(*) AS uses
     FROM facility_news WHERE url <> ''
     GROUP BY url_normalized ORDER BY uses DESC, url_normalized`
  );
  db.close();

  const targets =
    args.limit === Infinity ? distinct : distinct.slice(0, args.limit);
  const results = await mapWithConcurrency(
    targets,
    async (target) => {
      const meta = await fetchLinkMetadata(target.url, {
        timeoutMs: args.timeout,
      });
      return { url: target.url, ...meta, uses: target.uses, tier: target.tier };
    },
    args.concurrency
  );

  const summary = summarizeLinkHealth(results);
  const report = {
    checked_at: new Date().toISOString(),
    total_urls: summary.total,
    buckets: summary.buckets,
    dead_count: summary.dead_count,
    dead: summary.dead,
    results: results.map((r) => ({
      url: r.url,
      bucket: classifyLinkResult(r),
      status: r.status,
      reason: r.reason || '',
      uses: r.uses,
      tier: r.tier,
    })),
  };
  fs.mkdirSync(path.dirname(REPORT_JSON), { recursive: true });
  fs.writeFileSync(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);

  const md = [
    '# Facility news link health',
    '',
    `Checked ${summary.total} distinct URLs.`,
    '',
    '| bucket | count |',
    '| --- | --- |',
    ...Object.entries(summary.buckets)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `| ${k} | ${v} |`),
    '',
    '`dead` = 404/410 (page removed). `blocked` = anti-bot 401/403/406/418/429 (not link rot).',
    '',
  ];
  if (summary.dead.length > 0) {
    md.push('## Dead links', '');
    for (const d of summary.dead) md.push(`- ${d.url} (HTTP ${d.status})`);
    md.push('');
  }
  fs.writeFileSync(REPORT_MD, md.join('\n'));

  console.log(
    JSON.stringify(
      {
        totalUrls: summary.total,
        buckets: summary.buckets,
        deadCount: summary.dead_count,
        report: path.relative(ROOT, REPORT_JSON),
      },
      null,
      2
    )
  );

  if (args.onlyDead && summary.dead.length > 0) {
    process.exitCode = 0;
  }
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  main().catch((error) => {
    console.error(`Facility news link check failed: ${error.message}`);
    process.exit(1);
  });
}

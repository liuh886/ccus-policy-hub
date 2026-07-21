#!/usr/bin/env node
/**
 * Report policies with missing primary-source metadata from the SQLite SSOT.
 *
 * Outputs a deterministic Markdown report and JSON payload for review. The
 * report distinguishes missing source labels, missing URLs, and records where
 * both are absent so remediation can be prioritized without editing generated
 * Markdown or public JSON by hand.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'agent/ccus-ai-agent/db/ccus_master.sqlite');
const MARKDOWN_PATH = path.join(ROOT, 'docs/policy-source-url-gaps.md');
const JSON_PATH = path.join(ROOT, 'docs/policy-source-url-gaps.json');

function clean(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function rowsFromQuery(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  const columns = stmt.getColumnNames();

  while (stmt.step()) {
    const values = stmt.get();
    rows.push(Object.fromEntries(columns.map((column, index) => [column, values[index]])));
  }

  stmt.free();
  return rows;
}

export function classifyPolicySourceGap(row) {
  const source = clean(row.source);
  const url = clean(row.url);

  return {
    ...row,
    source,
    url,
    missing_source: source === '',
    missing_url: url === '',
    gap_type:
      source === '' && url === ''
        ? 'missing_source_and_url'
        : source === ''
          ? 'missing_source'
          : 'missing_url',
  };
}

export function summarizePolicySourceGaps(rows) {
  const records = rows.map(classifyPolicySourceGap);
  const count = (predicate) => records.filter(predicate).length;

  return {
    total_gap_records: records.length,
    missing_source: count((record) => record.missing_source),
    missing_url: count((record) => record.missing_url),
    missing_source_and_url: count(
      (record) => record.missing_source && record.missing_url
    ),
    verified_records_with_gaps: count(
      (record) => clean(record.review_status).toLowerCase() === 'verified'
    ),
    draft_records_with_gaps: count(
      (record) => clean(record.review_status).toLowerCase() === 'draft'
    ),
  };
}

function escapeCell(value) {
  return clean(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function renderTable(records) {
  if (records.length === 0) return '_None._';

  const header =
    '| ID | Country | Year | Review | Gap | English title | Current source |';
  const separator = '|---|---|---:|---|---|---|---|';
  const rows = records.map(
    (record) =>
      `| \`${escapeCell(record.id)}\` | ${escapeCell(record.country)} | ${escapeCell(
        record.year
      )} | ${escapeCell(record.review_status)} | ${escapeCell(
        record.gap_type
      )} | ${escapeCell(record.title_en)} | ${escapeCell(record.source) || '—'} |`
  );

  return [header, separator, ...rows].join('\n');
}

function renderMarkdown(payload) {
  const { generated_at: generatedAt, summary, records } = payload;
  const verified = records.filter(
    (record) => clean(record.review_status).toLowerCase() === 'verified'
  );
  const draft = records.filter(
    (record) => clean(record.review_status).toLowerCase() === 'draft'
  );
  const other = records.filter(
    (record) =>
      !['verified', 'draft'].includes(clean(record.review_status).toLowerCase())
  );

  return `# Policy source and URL gap audit

Generated from the SQLite single source of truth on ${generatedAt}.

## Summary

- Records with at least one gap: **${summary.total_gap_records}**
- Missing source labels: **${summary.missing_source}**
- Missing URLs: **${summary.missing_url}**
- Missing both source and URL: **${summary.missing_source_and_url}**
- Verified records with gaps: **${summary.verified_records_with_gaps}**
- Draft records with gaps: **${summary.draft_records_with_gaps}**

## Verified records

${renderTable(verified)}

## Draft records

${renderTable(draft)}

## Other review states

${renderTable(other)}

## Remediation rule

1. Prefer the official law, regulation, ministry, regulator, standards body, or programme page.
2. Use an official gazette or consolidated legal text when available.
3. Do not mark a record verified solely because a homepage URL exists.
4. Keep the field blank and document the gap when no authoritative source can be confirmed.
5. Update SQLite first, then regenerate bilingual Markdown, quality metrics, and public JSON.
`;
}

export async function generatePolicySourceGapReport({
  dbPath = DB_PATH,
  markdownPath = MARKDOWN_PATH,
  jsonPath = JSON_PATH,
} = {}) {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database file not found: ${dbPath}`);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(new Uint8Array(fs.readFileSync(dbPath)));
  const rows = rowsFromQuery(
    db,
    `SELECT
       p.id,
       p.country,
       p.year,
       p.status,
       p.category,
       p.review_status,
       p.legal_weight,
       p.source,
       p.url,
       p.pub_date,
       i.title AS title_en
     FROM policies p
     LEFT JOIN policy_i18n i
       ON i.policy_id = p.id AND i.lang = 'en'
     WHERE COALESCE(TRIM(p.source), '') = ''
        OR COALESCE(TRIM(p.url), '') = ''
     ORDER BY
       CASE LOWER(COALESCE(p.review_status, ''))
         WHEN 'verified' THEN 0
         WHEN 'draft' THEN 1
         ELSE 2
       END,
       p.country,
       p.year DESC,
       p.id`
  );
  db.close();

  const records = rows.map(classifyPolicySourceGap);
  const payload = {
    generated_at: new Date().toISOString(),
    source_db_path: path.relative(ROOT, dbPath).replaceAll('\\', '/'),
    summary: summarizePolicySourceGaps(rows),
    records,
  };

  fs.mkdirSync(path.dirname(markdownPath), { recursive: true });
  fs.writeFileSync(markdownPath, renderMarkdown(payload));
  fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);

  console.log(JSON.stringify(payload.summary, null, 2));
  return payload;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  generatePolicySourceGapReport().catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  });
}

#!/usr/bin/env node
// Read-only review queue. A source response is a signal for human review;
// fetching a URL never changes a record's audit date or verified status.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';
import { queryRows } from './lib/sqlite-query.mjs';
import { buildReport } from './audit-policy-content-depth.mjs';

export function daysSince(date, asOf) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null;
  const days = (Date.parse(asOf) - Date.parse(date)) / 86400000;
  return Number.isFinite(days) ? Math.floor(days) : null;
}

export function buildReviewQueue(db, asOf) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf) || !Number.isFinite(Date.parse(asOf)))
    throw new Error('Valid --as-of YYYY-MM-DD required');
  const depth = new Map(
    buildReport(db, asOf).assessments.map((p) => [p.id, p])
  );
  const hasTranslations = queryRows(
    db,
    "SELECT name FROM sqlite_master WHERE name='policy_analysis_i18n'"
  ).length;
  const translations = hasTranslations
    ? queryRows(
        db,
        `SELECT t.policy_id, COUNT(*) AS n
    FROM policy_analysis_i18n t JOIN policy_analysis a USING(policy_id, dimension)
    WHERE t.source_evidence = a.evidence AND t.lang='zh' GROUP BY t.policy_id`
      )
    : [];
  const translated = new Map(translations.map((r) => [r.policy_id, r.n]));
  const attempts = new Map(
    queryRows(
      db,
      "SELECT key,value FROM db_meta WHERE key LIKE 'policy_review_attempt:%'"
    ).map((r) => [
      r.key.slice('policy_review_attempt:'.length),
      JSON.parse(r.value),
    ])
  );
  const policies = queryRows(
    db,
    `SELECT id, url, review_status, provenance_last_audit_date AS last_reviewed
    FROM policies ORDER BY id`
  )
    .map((p) => {
      const age = daysSince(p.last_reviewed, asOf);
      const reasons = [];
      if (p.review_status !== 'verified') reasons.push('draft');
      if (age === null || age >= 90) reasons.push('review_due');
      if (!p.url || new URL(p.url).pathname === '/')
        reasons.push('specific_source_needed');
      if (depth.get(p.id)?.severity !== 'healthy')
        reasons.push('content_depth');
      const dimensions = depth.get(p.id)?.metrics.analysisDimensions || 0;
      if (dimensions !== 5) reasons.push('analysis_dimension_missing');
      if (depth.get(p.id)?.flags.length) reasons.push('editorial_followup');
      const missing = dimensions - (translated.get(p.id) || 0);
      if (missing > 0) reasons.push('zh_analysis_translation');
      return {
        ...p,
        review_age_days: age,
        review_interval_days: 90,
        next_review_due: p.last_reviewed
          ? new Date(Date.parse(p.last_reviewed) + 90 * 86400000)
              .toISOString()
              .slice(0, 10)
          : null,
        content_severity: depth.get(p.id)?.severity,
        content_flags: depth.get(p.id)?.flags || [],
        missing_zh_dimensions: missing,
        missing_analysis_dimensions: 5 - dimensions,
        latest_review_attempt: attempts.get(p.id) || null,
        reasons,
      };
    })
    .sort(
      (a, b) =>
        Number(b.reasons.includes('draft')) -
          Number(a.reasons.includes('draft')) ||
        Number(b.content_severity === 'high') -
          Number(a.content_severity === 'high') ||
        (b.review_age_days ?? 99999) - (a.review_age_days ?? 99999) ||
        a.id.localeCompare(b.id)
    );
  const facilities = queryRows(
    db,
    `SELECT f.id, i.name, f.country, f.status, f.estimated_capacity,
    f.provenance_last_audit_date AS last_reviewed,
    (SELECT MAX(verified_at) FROM facility_news n WHERE n.facility_id=f.id AND n.origin='agent-research') AS latest_source_review
    FROM facilities f JOIN facility_i18n i ON i.facility_id=f.id AND i.lang='en'
    WHERE f.status IN ('Operational','Under construction') ORDER BY COALESCE(f.estimated_capacity,0) DESC, f.id`
  ).map((f) => ({
    ...f,
    reasons: [
      ...(!f.latest_source_review ? ['curated_source_needed'] : []),
      ...((daysSince(f.last_reviewed, asOf) ?? 99999) >= 180
        ? ['record_review_due']
        : []),
    ],
  }));
  return {
    as_of: asOf,
    policy_review_interval_days: 90,
    facility_review_interval_days: 180,
    note: 'Review intervals are editorial reminders. Source checks and database audits are not factual re-verification.',
    summary: {
      policies: policies.length,
      policy_drafts: policies.filter((p) => p.review_status !== 'verified')
        .length,
      policies_due: policies.filter((p) => p.reasons.includes('review_due'))
        .length,
      policy_content_tail: policies.filter((p) =>
        p.reasons.includes('content_depth')
      ).length,
      missing_zh_dimensions: policies.reduce(
        (n, p) => n + p.missing_zh_dimensions,
        0
      ),
      active_facilities_without_curated_sources: facilities.filter(
        (f) => !f.latest_source_review
      ).length,
    },
    policies,
    facilities,
  };
}

export async function probeSource(url, previous, fetcher = fetch) {
  try {
    const response = await fetcher(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent':
          'CCUS-Policy-Hub source review (+https://github.com/liuh886/ccus-policy-hub)',
      },
    });
    if (!response.ok)
      return {
        url,
        status: response.status,
        signal: [404, 410].includes(response.status) ? 'dead' : 'unavailable',
      };
    const type = response.headers.get('content-type') || '';
    if (!/text\/html|text\/plain|application\/pdf/i.test(type))
      return { url, status: response.status, signal: 'unsupported_content' };
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > 20 * 1024 * 1024)
      return { url, status: response.status, signal: 'oversize' };
    const hash = crypto.createHash('sha256').update(bytes).digest('hex');
    return {
      url,
      status: response.status,
      hash,
      signal: previous?.hash
        ? previous.hash === hash
          ? 'unchanged'
          : 'source_changed_review_needed'
        : 'baseline_recorded',
    };
  } catch (error) {
    return { url, signal: 'unavailable', error: error.name };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const value = (key, fallback) =>
    args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
  const asOf = value('--as-of', new Date().toISOString().slice(0, 10));
  const output = value(
    '--output',
    'agent/ccus-ai-agent/governance/reports/maintenance-review.json'
  );
  const SQL = await initSqlJs();
  const db = new SQL.Database(
    fs.readFileSync('agent/ccus-ai-agent/db/ccus_master.sqlite')
  );
  const report = buildReviewQueue(db, asOf);
  db.close();
  if (args.includes('--check-sources')) {
    const baselinePath = value('--baseline', 'artifacts/source-baseline.json');
    const previous = fs.existsSync(baselinePath)
      ? JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
      : {};
    const urls = [
      ...new Set(report.policies.map((p) => p.url).filter(Boolean)),
    ].sort();
    const limit = Number(value('--limit', '25'));
    if (!Number.isInteger(limit) || limit < 1)
      throw new Error('Positive --limit required');
    const offset =
      (Math.floor(Date.parse(asOf) / (7 * 86400000)) * limit) % urls.length;
    report.source_checks = [];
    for (let i = 0; i < Math.min(limit, urls.length); i++) {
      const url = urls[(offset + i) % urls.length];
      const check = await probeSource(url, previous[url]);
      report.source_checks.push(check);
      // An unavailable source must not erase its last successful fingerprint.
      if (check.hash) previous[url] = { hash: check.hash, checked_at: asOf };
    }
    fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
    fs.writeFileSync(baselinePath, JSON.stringify(previous, null, 2) + '\n');
  }
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.summary, null, 2));
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

#!/usr/bin/env node
/**
 * generate-quality-metrics.mjs
 *
 * Generates quality metrics from the SQLite SSOT database.
 * Outputs to src/data/quality_metrics.generated.json
 *
 * Usage:
 *   node scripts/generate-quality-metrics.mjs
 *   pnpm manage:db:quality:export
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';
import { queryScalar, queryRows } from './lib/sqlite-query.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(
  __dirname,
  '../agent/ccus-ai-agent/db/ccus_master.sqlite'
);
const OUTPUT_PATH = path.join(
  __dirname,
  '../src/data/quality_metrics.generated.json'
);

/**
 * Helper: run a query that returns a single scalar value
 */

/**
 * Helper: run a query that returns rows as objects
 */

async function generateMetrics() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database not found at: ${DB_PATH}`);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)));

  // Deterministic timestamp derived from the database itself so that the
  // generated file only changes when governed data actually changes.
  const lastPolicyAudit = queryScalar(
    db,
    "SELECT MAX(COALESCE(provenance_last_audit_date, '')) FROM policies"
  );
  const lastFacilityAudit = queryScalar(
    db,
    "SELECT MAX(COALESCE(provenance_last_audit_date, '')) FROM facilities"
  );
  const lastAuditDate = [lastPolicyAudit, lastFacilityAudit]
    .filter(Boolean)
    .sort()
    .pop();

  const metrics = {
    data_as_of: lastAuditDate
      ? `${lastAuditDate}T00:00:00.000Z`
      : '1970-01-01T00:00:00.000Z',
    source_db_path: 'agent/ccus-ai-agent/db/ccus_master.sqlite',
    audit_status: {},
    counts: {},
    quality_gaps: {},
    bilingual_parity: {},
    coordinate_precision: {},
    facility_policy_links: {},
    facility_news: {},
  };

  // --- Total counts ---
  metrics.counts.policies = queryScalar(db, 'SELECT COUNT(*) FROM policies');
  metrics.counts.facilities = queryScalar(
    db,
    'SELECT COUNT(*) FROM facilities'
  );
  metrics.counts.country_profiles = queryScalar(
    db,
    'SELECT COUNT(*) FROM country_profiles'
  );

  // --- Review status ---
  metrics.counts.policies_reviewed = queryScalar(
    db,
    "SELECT COUNT(*) FROM policies WHERE review_status = 'verified'"
  );
  metrics.counts.policies_draft =
    metrics.counts.policies - metrics.counts.policies_reviewed;

  // --- Quality gaps: policies ---
  metrics.quality_gaps.policies_missing_source = queryScalar(
    db,
    "SELECT COUNT(*) FROM policies WHERE source IS NULL OR source = ''"
  );
  metrics.quality_gaps.policies_missing_url = queryScalar(
    db,
    "SELECT COUNT(*) FROM policies WHERE url IS NULL OR url = ''"
  );

  // --- Quality gaps: facilities ---
  metrics.quality_gaps.facilities_missing_estimated_capacity = queryScalar(
    db,
    'SELECT COUNT(*) FROM facilities WHERE estimated_capacity IS NULL OR estimated_capacity = 0'
  );

  // --- Coordinate precision distribution ---
  const precisionRows = queryRows(
    db,
    'SELECT precision, COUNT(*) as c FROM facilities GROUP BY precision'
  );
  for (const row of precisionRows) {
    const key = row.precision || 'missing';
    metrics.coordinate_precision[key] = row.c;
  }

  // --- Bilingual parity ---
  metrics.bilingual_parity = {
    policies_zh: queryScalar(
      db,
      "SELECT COUNT(*) FROM policy_i18n WHERE lang = 'zh'"
    ),
    policies_en: queryScalar(
      db,
      "SELECT COUNT(*) FROM policy_i18n WHERE lang = 'en'"
    ),
    facilities_zh: queryScalar(
      db,
      "SELECT COUNT(*) FROM facility_i18n WHERE lang = 'zh'"
    ),
    facilities_en: queryScalar(
      db,
      "SELECT COUNT(*) FROM facility_i18n WHERE lang = 'en'"
    ),
    countries_zh: queryScalar(
      db,
      "SELECT COUNT(*) FROM country_i18n WHERE lang = 'zh'"
    ),
    countries_en: queryScalar(
      db,
      "SELECT COUNT(*) FROM country_i18n WHERE lang = 'en'"
    ),
  };

  // --- Facility-policy links ---
  metrics.facility_policy_links.total = queryScalar(
    db,
    'SELECT COUNT(*) FROM policy_facility_links'
  );

  // Phase 2 (2026-09) added link_type; pre-migration DBs lack the column.
  const linkColumns = queryRows(
    db,
    'PRAGMA table_info(policy_facility_links)'
  ).map((row) => row.name);
  if (linkColumns.includes('link_type')) {
    const byType = Object.fromEntries(
      queryRows(
        db,
        'SELECT link_type, COUNT(*) AS n FROM policy_facility_links GROUP BY link_type'
      ).map((row) => [row.link_type, row.n])
    );
    metrics.facility_policy_links.country_level = byType.country || 0;
    metrics.facility_policy_links.sector_level = byType.sector || 0;
    metrics.facility_policy_links.evidence_level = byType.evidence || 0;
  } else {
    // Currently all links are country-level (no link_type column yet)
    metrics.facility_policy_links.country_level =
      metrics.facility_policy_links.total;
    metrics.facility_policy_links.sector_level = 0;
    metrics.facility_policy_links.evidence_level = 0;
  }

  // High-risk warning if most links are country-level
  if (metrics.facility_policy_links.total > 0) {
    const countryLevelPct =
      (metrics.facility_policy_links.country_level /
        metrics.facility_policy_links.total) *
      100;
    metrics.facility_policy_links.high_risk_warning = countryLevelPct > 80;
    metrics.facility_policy_links.country_level_pct =
      Math.round(countryLevelPct * 10) / 10;
  } else {
    metrics.facility_policy_links.high_risk_warning = false;
    metrics.facility_policy_links.country_level_pct = 0;
  }

  // --- Facility news / source coverage ---
  const hasNewsTable = queryRows(
    db,
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'facility_news'"
  ).length;
  if (hasNewsTable) {
    const news = metrics.facility_news;
    news.rows_total = queryScalar(db, 'SELECT COUNT(*) FROM facility_news');
    news.rows_with_title = queryScalar(
      db,
      "SELECT COUNT(*) FROM facility_news WHERE title IS NOT NULL AND title <> ''"
    );
    news.rows_with_date = queryScalar(
      db,
      "SELECT COUNT(*) FROM facility_news WHERE published_date IS NOT NULL AND published_date <> ''"
    );
    news.distinct_urls = queryScalar(
      db,
      'SELECT COUNT(DISTINCT url_normalized) FROM facility_news'
    );
    news.facilities_with_news = queryScalar(
      db,
      "SELECT COUNT(DISTINCT facility_id) FROM facility_news WHERE url <> ''"
    );
    news.facilities_with_titled_news = queryScalar(
      db,
      "SELECT COUNT(DISTINCT facility_id) FROM facility_news WHERE title IS NOT NULL AND title <> ''"
    );
    news.facilities_total = metrics.counts.facilities;
    news.by_tier = {};
    for (const row of queryRows(
      db,
      'SELECT tier, COUNT(*) AS n FROM facility_news GROUP BY tier'
    )) {
      news.by_tier[row.tier] = row.n;
    }
    news.by_origin = {};
    for (const row of queryRows(
      db,
      'SELECT origin, COUNT(*) AS n FROM facility_news GROUP BY origin'
    )) {
      news.by_origin[row.origin] = row.n;
    }
    if (news.rows_total > 0) {
      news.titled_pct =
        Math.round((news.rows_with_title / news.rows_total) * 1000) / 10;
    } else {
      news.titled_pct = 0;
    }
  }

  // --- Audit status from db_meta ---
  const metaRows = queryRows(db, 'SELECT key, value FROM db_meta');
  const metaMap = {};
  for (const row of metaRows) {
    metaMap[row.key] = row.value;
  }

  // audit_status deliberately exposes only the stable pass flag. The audit
  // date/summary are stamped with the wall clock (and CI revision) on every
  // governed run, so emitting them here would make this generated file
  // non-deterministic and break the CI projection diff gate. The authoritative
  // audit trail lives in db_meta and the governance reports.
  metrics.audit_status = {
    last_audit_pass: metaMap['last_audit_pass'] === 'true',
  };

  db.close();

  // Write output
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(metrics, null, 2) + '\n');
  console.log(`Quality metrics written to: ${OUTPUT_PATH}`);
  console.log(`  Policies: ${metrics.counts.policies}`);
  console.log(`  Facilities: ${metrics.counts.facilities}`);
  console.log(`  Country profiles: ${metrics.counts.country_profiles}`);
  console.log(
    `  Facility-policy links: ${metrics.facility_policy_links.total}`
  );
  console.log(`  Audit pass: ${metrics.audit_status.last_audit_pass}`);

  return metrics;
}

// Run if executed directly
if (process.argv[1] && process.argv[1].includes('generate-quality-metrics')) {
  generateMetrics().catch((err) => {
    console.error('Failed to generate quality metrics:', err.message);
    process.exit(1);
  });
}

export { generateMetrics };

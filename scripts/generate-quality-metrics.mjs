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
function queryScalar(db, sql) {
  const result = db.exec(sql);
  if (result.length === 0 || result[0].values.length === 0) return 0;
  return result[0].values[0][0];
}

/**
 * Helper: run a query that returns rows as objects
 */
function queryRows(db, sql) {
  const result = db.exec(sql);
  if (result.length === 0) return [];
  const columns = result[0].columns;
  return result[0].values.map((row) => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

async function generateMetrics() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database not found at: ${DB_PATH}`);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)));

  const metrics = {
    generated_at: new Date().toISOString(),
    source_db_path: 'agent/ccus-ai-agent/db/ccus_master.sqlite',
    audit_status: {},
    counts: {},
    quality_gaps: {},
    bilingual_parity: {},
    coordinate_precision: {},
    facility_policy_links: {},
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

  // Currently all links are country-level (no link_type column yet)
  metrics.facility_policy_links.country_level =
    metrics.facility_policy_links.total;
  metrics.facility_policy_links.sector_level = 0;
  metrics.facility_policy_links.evidence_level = 0;

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

  // --- Audit status from db_meta ---
  const metaRows = queryRows(db, 'SELECT key, value FROM db_meta');
  const metaMap = {};
  for (const row of metaRows) {
    metaMap[row.key] = row.value;
  }

  metrics.audit_status = {
    last_audit_pass: metaMap['last_audit_pass'] === 'true',
    last_audit_date: metaMap['last_audit_date'] || null,
    last_audit_summary: metaMap['last_audit_summary'] || null,
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

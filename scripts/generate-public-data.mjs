#!/usr/bin/env node
/**
 * generate-public-data.mjs
 *
 * Generates static JSON data endpoints for AI agents and external consumers.
 * Outputs to public/data/
 *
 * Usage:
 *   node scripts/generate-public-data.mjs
 *   pnpm manage:db:data:export
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';
import {
  contextFiles,
  publishContextFiles,
} from './generate-policy-context.mjs';
import { queryScalar, queryRows, parseJsonSafe } from './lib/sqlite-query.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(
  __dirname,
  '../agent/ccus-ai-agent/db/ccus_master.sqlite'
);
const PUBLIC_DATA_DIR = path.join(__dirname, '../public/data');
const SCHEMAS_DIR = path.join(PUBLIC_DATA_DIR, 'schemas');
const QUALITY_METRICS_PATH = path.join(
  __dirname,
  '../src/data/quality_metrics.generated.json'
);
const DATASET_VERSIONS_PATH = path.join(
  __dirname,
  '../src/data/dataset_versions.json'
);

/**
 * Helper: run a query that returns a single scalar value
 */

/**
 * Helper: run a query that returns rows as objects
 */

/**
 * Helper: parse JSON field safely
 */

async function generatePublicData() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database not found at: ${DB_PATH}`);
  }

  // Ensure output directories exist
  if (!fs.existsSync(PUBLIC_DATA_DIR)) {
    fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SCHEMAS_DIR)) {
    fs.mkdirSync(SCHEMAS_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)));

  // Deterministic timestamp derived from the database itself so that the
  // generated files only change when governed data actually changes.
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
  const dataAsOf = lastAuditDate
    ? `${lastAuditDate}T00:00:00.000Z`
    : '1970-01-01T00:00:00.000Z';

  // --- Generate policies.json ---
  console.log('Generating policies.json...');
  const policies = queryRows(
    db,
    `
    SELECT
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
      p.provenance_author,
      p.provenance_reviewer,
      p.provenance_last_audit_date
    FROM policies p
    ORDER BY p.country, p.year DESC
  `
  );

  // Add i18n data and analysis to each policy
  for (const policy of policies) {
    const i18nRows = queryRows(
      db,
      'SELECT lang, title, description, scope, tags_json FROM policy_i18n WHERE policy_id = ?',
      [policy.id]
    );
    policy.i18n = {};
    for (const row of i18nRows) {
      policy.i18n[row.lang] = {
        title: row.title,
        description: row.description,
        scope: row.scope,
        tags: parseJsonSafe(row.tags_json),
      };
    }

    const analysisRows = queryRows(
      db,
      'SELECT dimension, score, label, evidence, citation FROM policy_analysis WHERE policy_id = ?',
      [policy.id]
    );
    policy.analysis = {};
    for (const row of analysisRows) {
      policy.analysis[row.dimension] = {
        score: row.score,
        label: row.label,
        evidence: row.evidence,
        citation: row.citation,
      };
    }
  }

  fs.writeFileSync(
    path.join(PUBLIC_DATA_DIR, 'policies.json'),
    JSON.stringify(
      { data_as_of: dataAsOf, count: policies.length, records: policies },
      null,
      2
    ) + '\n'
  );
  console.log(`  policies.json: ${policies.length} records`);

  // --- Generate facilities.json ---
  console.log('Generating facilities.json...');
  const facilities = queryRows(
    db,
    `
    SELECT
      f.id,
      f.country,
      f.status,
      f.review_status,
      f.announced_capacity_min,
      f.announced_capacity_max,
      f.announced_capacity_raw,
      f.estimated_capacity,
      f.lat,
      f.lng,
      f.precision,
      f.investment_scale,
      f.provenance_author,
      f.provenance_reviewer,
      f.provenance_last_audit_date
    FROM facilities f
    ORDER BY f.country, f.id
  `
  );

  // Add i18n data to each facility
  for (const facility of facilities) {
    const i18nRows = queryRows(
      db,
      `SELECT lang, name, description, region, type, phase, sector,
              fate_of_carbon, hub, operator, capture_technology,
              storage_type, announcement, fid, operation
       FROM facility_i18n WHERE facility_id = ?`,
      [facility.id]
    );
    facility.i18n = {};
    for (const row of i18nRows) {
      facility.i18n[row.lang] = {
        name: row.name,
        description: row.description,
        region: row.region,
        type: row.type,
        phase: row.phase,
        sector: row.sector,
        fate_of_carbon: row.fate_of_carbon,
        hub: row.hub,
        operator: row.operator,
        capture_technology: row.capture_technology,
        storage_type: row.storage_type,
        announcement: row.announcement,
        fid: row.fid,
        operation: row.operation,
      };
    }

    // Add linked policies (ordered for deterministic output)
    const linkedPolicies = queryRows(
      db,
      'SELECT policy_id FROM policy_facility_links WHERE facility_id = ? ORDER BY policy_id',
      [facility.id]
    );
    facility.linked_policies = linkedPolicies.map((r) => r.policy_id);
  }

  fs.writeFileSync(
    path.join(PUBLIC_DATA_DIR, 'facilities.json'),
    JSON.stringify({
      data_as_of: dataAsOf,
      count: facilities.length,
      records: facilities,
    }) + '\n'
  );
  console.log(`  facilities.json: ${facilities.length} records`);

  // Preserve legacy linked_policies IDs; publish typed evidence separately.
  const relationships = queryRows(
    db,
    `SELECT policy_id, facility_id, link_type,
    confidence, evidence, source_url, review_status, created_at, updated_at
    FROM policy_facility_links ORDER BY policy_id, facility_id`
  );
  fs.writeFileSync(
    path.join(PUBLIC_DATA_DIR, 'relationships.json'),
    JSON.stringify({
      data_as_of: dataAsOf,
      count: relationships.length,
      records: relationships,
    }) + '\n'
  );

  const hasAnalysisLocales = queryRows(
    db,
    "SELECT name FROM sqlite_master WHERE name='policy_analysis_i18n'"
  ).length;
  const analysisLocales = hasAnalysisLocales
    ? queryRows(
        db,
        `SELECT t.* FROM policy_analysis_i18n t
    JOIN policy_analysis a USING(policy_id, dimension) WHERE t.source_evidence=a.evidence
    ORDER BY t.policy_id, t.dimension, t.lang`
      )
    : [];
  fs.writeFileSync(
    path.join(PUBLIC_DATA_DIR, 'policy-analysis-localizations.json'),
    JSON.stringify({
      data_as_of: dataAsOf,
      count: analysisLocales.length,
      records: analysisLocales,
    }) + '\n'
  );

  // --- Generate countries.json ---
  console.log('Generating countries.json...');
  const countries = queryRows(
    db,
    `
    SELECT
      c.id,
      c.region,
      c.net_zero_year,
      c.capture_2030,
      c.storage_2050,
      c.provenance_author,
      c.provenance_reviewer,
      c.provenance_last_audit_date
    FROM country_profiles c
    ORDER BY c.id
  `
  );

  // Add i18n data to each country
  for (const country of countries) {
    const i18nRows = queryRows(
      db,
      `SELECT lang, name, summary,
              pore_space_rights, liability_transfer, liability_period,
              financial_assurance, permitting_lead_time, co2_definition,
              cross_border_rules
       FROM country_i18n WHERE country_id = ?`,
      [country.id]
    );
    country.i18n = {};
    for (const row of i18nRows) {
      country.i18n[row.lang] = {
        name: row.name,
        summary: row.summary,
        regulatory_pillars: {
          pore_space_rights: row.pore_space_rights,
          liability_transfer: row.liability_transfer,
          liability_period: row.liability_period,
          financial_assurance: row.financial_assurance,
          permitting_lead_time: row.permitting_lead_time,
          co2_definition: row.co2_definition,
          cross_border_rules: row.cross_border_rules,
        },
      };
    }

    // Count linked policies and facilities
    country.policy_count = queryScalar(
      db,
      'SELECT COUNT(*) FROM policies WHERE country = ?',
      [country.id]
    );
    country.facility_count = queryScalar(
      db,
      'SELECT COUNT(*) FROM facilities WHERE country = ?',
      [country.id]
    );
  }

  fs.writeFileSync(
    path.join(PUBLIC_DATA_DIR, 'countries.json'),
    JSON.stringify(
      {
        data_as_of: dataAsOf,
        count: countries.length,
        records: countries,
      },
      null,
      2
    ) + '\n'
  );
  console.log(`  countries.json: ${countries.length} records`);

  // --- Copy quality metrics ---
  console.log('Copying quality.json...');
  if (fs.existsSync(QUALITY_METRICS_PATH)) {
    fs.copyFileSync(
      QUALITY_METRICS_PATH,
      path.join(PUBLIC_DATA_DIR, 'quality.json')
    );
    console.log('  quality.json: copied');
  } else {
    console.log(
      '  quality.json: skipped (run pnpm manage:db:quality:export first)'
    );
  }

  // --- Copy dataset versions ---
  console.log('Copying dataset-versions.json...');
  if (fs.existsSync(DATASET_VERSIONS_PATH)) {
    fs.copyFileSync(
      DATASET_VERSIONS_PATH,
      path.join(PUBLIC_DATA_DIR, 'dataset-versions.json')
    );
    console.log('  dataset-versions.json: copied');
  } else {
    console.log('  dataset-versions.json: skipped');
  }

  // Context bundles share the exact same in-memory SSOT snapshot as the APIs.
  const contextOutputs = contextFiles(db);
  publishContextFiles(contextOutputs, path.join(PUBLIC_DATA_DIR, 'context'));
  const contextIndex = JSON.parse(contextOutputs.get('index.json'));

  // --- Generate manifest.json ---
  console.log('Generating manifest.json...');
  const BASE_URL = 'https://liuh886.github.io/ccus-policy-hub';
  const manifest = {
    data_as_of: dataAsOf,
    project: 'CCUS Policy Hub',
    description: 'Global CCUS Policy Database & Analysis Platform',
    version: '1.0.0',
    base_url: BASE_URL,
    source_db: 'agent/ccus-ai-agent/db/ccus_master.sqlite',
    publication: {
      file: `${BASE_URL}/data/release.json`,
      description:
        'Build-only commit and manifest fingerprint; not a factual review date',
    },
    datasets: {
      context: {
        file: `${BASE_URL}/data/context/index.json`,
        count: contextIndex.count,
        description:
          'Bilingual policy-record context bundles; summary-level evidence only',
      },
      policies: {
        file: `${BASE_URL}/data/policies.json`,
        count: policies.length,
        description: 'Global CCUS policies with analysis scores',
      },
      facilities: {
        file: `${BASE_URL}/data/facilities.json`,
        count: facilities.length,
        description: 'Global CCUS facilities with capacity and location data',
      },
      'policy-analysis-localizations': {
        file: `${BASE_URL}/data/policy-analysis-localizations.json`,
        count: analysisLocales.length,
        description:
          'Reviewed translations tied to canonical source evidence; missing translations fall back explicitly',
      },
      relationships: {
        file: `${BASE_URL}/data/relationships.json`,
        count: relationships.length,
        description:
          'Typed facility-policy associations with evidence and review status',
      },
      countries: {
        file: `${BASE_URL}/data/countries.json`,
        count: countries.length,
        description: 'Country governance profiles with regulatory pillars',
      },
      quality: {
        file: `${BASE_URL}/data/quality.json`,
        description: 'Data quality metrics and audit status',
      },
      'dataset-versions': {
        file: `${BASE_URL}/data/dataset-versions.json`,
        description: 'Dataset version metadata',
      },
    },
    schemas: {
      context: `${BASE_URL}/data/schemas/context-bundle.schema.json`,
      'policy-analysis-localization': `${BASE_URL}/data/schemas/policy-analysis-localization.schema.json`,
      relationship: `${BASE_URL}/data/schemas/relationship.schema.json`,
      policy: `${BASE_URL}/data/schemas/policy.schema.json`,
      facility: `${BASE_URL}/data/schemas/facility.schema.json`,
      country: `${BASE_URL}/data/schemas/country.schema.json`,
      manifest: `${BASE_URL}/data/schemas/manifest.schema.json`,
    },
    documentation: {
      llms: `${BASE_URL}/llms.txt`,
      'llms-full': `${BASE_URL}/llms-full.txt`,
    },
    known_limitations: [
      'Context bundles contain maintained record summaries, not clause-verified current law or project tax-eligibility decisions',
      'Country and subnational matches provide geographic context, not verified project-specific legal applicability; inspect relationships.json',
      'Coordinate precision varies: exact, state, or country-level',
      'Some policies may be missing source or URL',
      'Chinese translations may not cover all fields',
    ],
  };

  fs.writeFileSync(
    path.join(PUBLIC_DATA_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n'
  );
  console.log('  manifest.json: generated');

  db.close();
  console.log('\nAll public data generated successfully!');
}

// Run if executed directly
if (process.argv[1] && process.argv[1].includes('generate-public-data')) {
  generatePublicData().catch((err) => {
    console.error('Failed to generate public data:', err.message);
    process.exit(1);
  });
}

export { generatePublicData };

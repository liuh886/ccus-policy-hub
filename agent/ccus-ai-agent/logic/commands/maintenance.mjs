/**
 * Maintenance commands: read-only stats, relationship repair, maturity
 * delegation, and the orchestrated pipeline.
 *
 * Moved verbatim from `logic/manage.mjs` (behavior-preserving split).
 * `dbPipeline` reuses the sibling command modules instead of local
 * functions, so orchestration can never drift from the real commands.
 */

import fs from 'fs';
import path from 'path';
import { LOGIC_DIR, loadDb } from '../db.mjs';
import { computeGovernanceDeployment } from '../governance-deployment-algo.mjs';
import { dbAuditDeep } from './audit.mjs';
import { dbExportMd } from './export.mjs';
import { dbGeocodeFacilities } from './geocode.mjs';
import { dbInit } from './import.mjs';
import { dbSyncCountryProfiles } from './seed.mjs';
import { dbStandardize } from './standardize.mjs';

export async function dbStats(SQL) {
  const db = loadDb(SQL);
  const pCount = db.get('SELECT COUNT(*) as c FROM policies').c;
  const fCount = db.get('SELECT COUNT(*) as c FROM facilities').c;
  const cCount = db.get('SELECT COUNT(*) as c FROM country_profiles').c;

  const regFields = [
    'pore_space_rights',
    'liability_transfer',
    'liability_period',
    'financial_assurance',
    'permitting_lead_time',
    'co2_definition',
    'cross_border_rules',
  ];
  const totalCells =
    db.get('SELECT COUNT(*) as c FROM country_i18n').c * regFields.length;
  let filledCells = 0;
  db.all('SELECT * FROM country_i18n').forEach((row) => {
    regFields.forEach((f) => {
      if (row[f] && !['Pending', '---', '待定', ''].includes(row[f]))
        filledCells++;
    });
  });
  const regFillRate = totalCells > 0 ? filledCells / totalCells : 0;

  console.log('=== CCUS Policy Hub Database Stats ===');
  console.log(`Policies:   ${pCount}`);
  console.log(`Facilities: ${fCount}`);
  console.log(`Countries:  ${cCount}`);
  console.log(
    `Regulatory Fill Rate: ${(regFillRate * 100).toFixed(1)}% (${filledCells}/${totalCells} cells)`
  );
  console.log('=======================================');
}

export const SUBNATIONAL_MATCHERS_PATH = path.join(
  LOGIC_DIR,
  '../../../scripts/data/subnational-matchers.json'
);

export function loadSubnationalMatchers(
  matchersPath = SUBNATIONAL_MATCHERS_PATH
) {
  const raw = JSON.parse(fs.readFileSync(matchersPath, 'utf8'));
  if (!raw || typeof raw.matchers !== 'object' || Array.isArray(raw.matchers)) {
    throw new Error(`Invalid subnational matchers file: ${matchersPath}`);
  }
  const compiled = {};
  for (const [policyId, spec] of Object.entries(raw.matchers)) {
    if (!spec || typeof spec.structured_pattern !== 'string') {
      throw new Error(
        `Subnational matcher ${policyId} missing structured_pattern`
      );
    }
    if (!spec.country || !spec.jurisdiction) {
      throw new Error(
        `Subnational matcher ${policyId} missing country or jurisdiction metadata`
      );
    }
    const flags = typeof spec.flags === 'string' ? spec.flags : 'i';
    compiled[policyId] = Object.freeze({
      policyId,
      country: spec.country,
      jurisdiction: spec.jurisdiction,
      level: spec.level || 'subnational',
      structuredRegex: new RegExp(spec.structured_pattern, flags),
      textRegex: spec.text_pattern
        ? new RegExp(spec.text_pattern, flags)
        : null,
    });
  }
  return Object.freeze(compiled);
}

export const SUBNATIONAL_POLICY_MATCHERS = loadSubnationalMatchers();

export function matchesSubnationalPolicy(matcher, facility) {
  const structuredText = [
    facility.address,
    facility.en_hub,
    facility.en_region,
    facility.zh_region,
  ]
    .filter(Boolean)
    .join(' ');
  if (matcher.structuredRegex.test(structuredText)) return true;
  if (!matcher.textRegex) return false;
  const fullText = [structuredText, facility.en_name, facility.zh_name]
    .filter(Boolean)
    .join(' ');
  return matcher.textRegex.test(fullText);
}

export async function dbFixRelationships(
  SQL,
  args = [],
  { db: injectedDb = null, matchersPath = SUBNATIONAL_MATCHERS_PATH } = {}
) {
  const db = injectedDb ?? loadDb(SQL);
  const matchers =
    matchersPath === SUBNATIONAL_MATCHERS_PATH
      ? SUBNATIONAL_POLICY_MATCHERS
      : loadSubnationalMatchers(matchersPath);
  const force = args.includes('--force');
  console.log(
    force
      ? 'REBUILDING RELATIONSHIPS: Policy <-> Facility (Country & Subnational, --force)...'
      : 'REPAIRING RELATIONSHIPS: Policy <-> Facility (Country & Subnational)...'
  );

  db.transaction(() => {
    if (force) {
      db.run(
        "DELETE FROM policy_facility_links WHERE link_type IN ('country', 'subnational_region')"
      );
    } else {
      // Remove over-broad country-level links for subnational policies before re-linking.
      for (const subId of Object.keys(matchers)) {
        db.run(
          "DELETE FROM policy_facility_links WHERE policy_id = ? AND link_type = 'country'",
          [subId]
        );
      }
    }

    const hasAddress = db
      .all('PRAGMA table_info(facilities)')
      .some((col) => col.name === 'address');
    const addrExpr = hasAddress ? "COALESCE(f.address, '')" : "''";

    const facilities = db.all(`
      SELECT
        f.id,
        f.country,
        ${addrExpr} AS address,
        COALESCE(en.name, '') AS en_name,
        COALESCE(zh.name, '') AS zh_name,
        COALESCE(en.hub, '') AS en_hub,
        COALESCE(en.region, '') AS en_region,
        COALESCE(zh.region, '') AS zh_region
      FROM facilities f
      LEFT JOIN facility_i18n en ON f.id = en.facility_id AND en.lang = 'en'
      LEFT JOIN facility_i18n zh ON f.id = zh.facility_id AND zh.lang = 'zh'
    `);

    const policiesByCountry = new Map();
    for (const p of db.all('SELECT id, country FROM policies')) {
      let list = policiesByCountry.get(p.country);
      if (!list) {
        list = [];
        policiesByCountry.set(p.country, list);
      }
      list.push(p);
    }

    let linkCount = 0;
    let subnationalCount = 0;
    for (const f of facilities) {
      const policies = policiesByCountry.get(f.country) || [];
      for (const p of policies) {
        const subMatcher = matchers[p.id];
        if (subMatcher) {
          if (!matchesSubnationalPolicy(subMatcher, f)) continue;
          db.run(
            `INSERT INTO policy_facility_links (
              policy_id, facility_id, link_type, confidence, evidence, review_status
            ) VALUES (?, ?, 'subnational_region', 0.75, 'Subnational jurisdiction match', 'verified')
            ON CONFLICT(policy_id, facility_id) DO UPDATE SET
              link_type = 'subnational_region',
              confidence = 0.75,
              evidence = 'Subnational jurisdiction match',
              review_status = 'verified'
            WHERE COALESCE(policy_facility_links.link_type, 'country') IN ('country', 'subnational_region')`,
            [p.id, f.id]
          );
          subnationalCount++;
          linkCount++;
        } else {
          db.run(
            'INSERT OR IGNORE INTO policy_facility_links (policy_id, facility_id) VALUES (?, ?)',
            [p.id, f.id]
          );
          linkCount++;
        }
      }
    }
    console.log(
      `Generated ${linkCount} links (${subnationalCount} subnational region matches).`
    );
  });

  if (injectedDb == null) db.save();
  console.log('FIX RELATIONSHIPS DONE.');
}

export async function dbComputeMaturity() {
  await computeGovernanceDeployment();
}

export async function dbPipeline(SQL, argv = []) {
  const run = async (_name, fn) => {
    await fn();
  };
  if (argv.includes('--init')) await run('db:init', () => dbInit(SQL));
  if (argv.includes('--with-imports')) {
    throw new Error(
      '--with-imports is retired. Legacy JSON facilities import was removed; run explicit SQLite-native ingest/bootstrap steps before db:pipeline.'
    );
  }
  await run('db:standardize', () => dbStandardize(SQL));
  await run('db:geocode:facilities', () => dbGeocodeFacilities(SQL));
  await run('db:sync:country-profiles', () => dbSyncCountryProfiles(SQL));
  await run('db:compute:maturity', () => dbComputeMaturity(SQL));
  await run('db:audit:deep', () => dbAuditDeep(SQL));
  await run('db:export:md', () => dbExportMd(SQL));
}

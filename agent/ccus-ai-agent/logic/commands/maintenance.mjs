/**
 * Maintenance commands: read-only stats, relationship repair, maturity
 * delegation, and the orchestrated pipeline.
 *
 * Moved verbatim from `logic/manage.mjs` (behavior-preserving split).
 * `dbPipeline` reuses the sibling command modules instead of local
 * functions, so orchestration can never drift from the real commands.
 */

import { loadDb } from '../db.mjs';
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

export async function dbFixRelationships(SQL, args = []) {
  const db = loadDb(SQL);
  const force = args.includes('--force');
  console.log(
    force
      ? 'REBUILDING RELATIONSHIPS: Policy <-> Facility (Country-based, --force)...'
      : 'REPAIRING RELATIONSHIPS: Policy <-> Facility (add-missing only)...'
  );

  db.transaction(() => {
    // A full rebuild deletes every link, including any human-curated
    // non-country links; it must be an explicit --force decision.
    if (force) {
      db.run('DELETE FROM policy_facility_links');
    }

    // Fetch all facilities
    const facilities = db.all('SELECT id, country FROM facilities');

    // Link facilities to policies based on country (INSERT OR IGNORE keeps
    // existing links intact in add-missing mode).
    let linkCount = 0;
    for (const f of facilities) {
      // Find all policies in the same country
      const policies = db.all('SELECT id FROM policies WHERE country = ?', [
        f.country,
      ]);
      for (const p of policies) {
        db.run(
          'INSERT OR IGNORE INTO policy_facility_links (policy_id, facility_id) VALUES (?, ?)',
          [p.id, f.id]
        );
        linkCount++;
      }
    }
    console.log(
      `Generated ${linkCount} bi-directional links between facilities and national policies.`
    );
  });

  db.save();
  console.log('FIX RELATIONSHIPS DONE.');
}

export async function dbComputeMaturity() {
  const { execSync } = await import('child_process');
  execSync('node agent/ccus-ai-agent/logic/maturity-algo.mjs', {
    stdio: 'inherit',
  });
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

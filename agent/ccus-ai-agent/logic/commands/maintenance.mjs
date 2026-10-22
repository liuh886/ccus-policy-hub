/**
 * Maintenance commands: read-only stats, relationship repair, maturity
 * delegation, and the orchestrated pipeline.
 *
 * Moved verbatim from `logic/manage.mjs` (behavior-preserving split).
 * `dbPipeline` reuses the sibling command modules instead of local
 * functions, so orchestration can never drift from the real commands.
 */

import { loadDb } from '../db.mjs';
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

export const SUBNATIONAL_POLICY_MATCHERS = Object.freeze({
  'au-wa-petroleum-amendment-2024': /\b(WA|Western Australia)\b/i,
  'alberta-tier': /\b(AB|ALB|Alberta)\b/i,
  'ca-ab-sequestration-tenure': /\b(AB|ALB|Alberta)\b/i,
  'ca-sk-ccs-directives': /\b(SK|Saskatchewan)\b/i,
  'ca-sk-spii': /\b(SK|Saskatchewan)\b/i,
  'cn-bj-ccus-measures-2026': /\bBeijing\b|北京/i,
  'cn-gd-carbon-inclusive': /\bGuangdong\b|广东|大亚湾|南海|惠州|深圳/i,
  'cn-hb-ets-offset': /\bHubei\b|湖北|武汉|枝江|应城/i,
  'cn-js-industrial-decarb-2022':
    /\bJiangsu\b|江苏|泰州|南京|连云港|常州|扬州/i,
  'cn-ordos-pilot-2024': /\b(Inner Mongolia|Ordos)\b|内蒙古|鄂尔多斯|包头/i,
  'cn-sd-eco-plan-14fym':
    /\bShandong\b|山东|胜利|齐鲁|东营|青岛|青州|淄博|烟台/i,
  'california-lcfs': /\b(CA|California)\b/i,
  'tx-hb-1284-ccus': /\b(TX|Texas)\b/i,
  'us-tx-natural-resources-121': /\b(TX|Texas)\b/i,
  'us-la-primacy-rules': /\b(LA|Louisiana)\b/i,
  'us-nd-century-code-38-22': /\b(ND|North Dakota)\b/i,
  'us-wy-hb-0200': /\b(WY|Wyoming)\b/i,
});

export async function dbFixRelationships(SQL, args = []) {
  const db = loadDb(SQL);
  const force = args.includes('--force');
  console.log(
    force
      ? 'REBUILDING RELATIONSHIPS: Policy <-> Facility (Country & Subnational, --force)...'
      : 'REPAIRING RELATIONSHIPS: Policy <-> Facility (Country & Subnational)...'
  );

  db.transaction(() => {
    if (force) {
      db.run('DELETE FROM policy_facility_links');
    } else {
      // Remove over-broad country-level links for subnational policies before re-linking.
      for (const subId of Object.keys(SUBNATIONAL_POLICY_MATCHERS)) {
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
        ${addrExpr} || ' ' ||
        COALESCE(en.name, '') || ' ' ||
        COALESCE(zh.name, '') || ' ' ||
        COALESCE(en.hub, '') || ' ' ||
        COALESCE(en.region, '') || ' ' ||
        COALESCE(zh.region, '') AS location_text
      FROM facilities f
      LEFT JOIN facility_i18n en ON f.id = en.facility_id AND en.lang = 'en'
      LEFT JOIN facility_i18n zh ON f.id = zh.facility_id AND zh.lang = 'zh'
    `);

    let linkCount = 0;
    let subnationalCount = 0;
    for (const f of facilities) {
      const policies = db.all('SELECT id FROM policies WHERE country = ?', [
        f.country,
      ]);
      for (const p of policies) {
        const subMatcher = SUBNATIONAL_POLICY_MATCHERS[p.id];
        if (subMatcher) {
          if (!subMatcher.test(f.location_text || '')) continue;
          db.run(
            `INSERT INTO policy_facility_links (
              policy_id, facility_id, link_type, confidence, evidence, review_status
            ) VALUES (?, ?, 'subnational_region', 0.75, 'Subnational jurisdiction match', 'verified')
            ON CONFLICT(policy_id, facility_id) DO UPDATE SET
              link_type = 'subnational_region',
              confidence = 0.75,
              evidence = 'Subnational jurisdiction match',
              review_status = 'verified'`,
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

  db.save();
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

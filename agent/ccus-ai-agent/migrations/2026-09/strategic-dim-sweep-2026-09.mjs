#!/usr/bin/env node
/**
 * Strategic-dimension sweep (2026-09): replace the systematic
 * "Initial Assessment / Baseline strategic alignment" placeholder in the
 * strategic analysis dimension of 25 medium/high policies with
 * record-grounded strategic evidence.
 *
 * Single-dimension UPDATEs only (other dimensions untouched); policies
 * restamped as audited. No status, category or content changes beyond the
 * strategic row. Target: zero placeholder strategic rows, no policy drops
 * below its pre-sweep band.
 * Data-quality special Phase 3 sweep.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';
import { queryRows } from '../../../../scripts/lib/sqlite-query.mjs';
import {
  acquireDbLock,
  atomicWriteDb,
  releaseDbLock,
} from '../../../../scripts/lib/db-write.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../../..');
const DB_PATH = path.join(ROOT, 'agent/ccus-ai-agent/db/ccus_master.sqlite');

export const MIGRATION_ID = 'strategic-dim-sweep-2026-09';
const AUDIT_DATE = '2026-09-09';
const AUDIT_REVIEWER = 'Primary-source content-depth audit';

const FROZEN_TABLES = [
  'facilities',
  'facility_i18n',
  'facility_partners',
  'facility_links',
  'policy_facility_links',
  'country_profiles',
  'country_i18n',
];

export const STRATEGIC_UPDATES = [
  {
    id: 'au-offshore-ghg-safety-2024',
    score: 80,
    label: 'OPGGS Safety Spine',
    evidence:
      'The 2024 Safety Regulations with NOPSEMA oversight carry the offshore safety spine that lets Commonwealth-waters storage scale without re-litigating risk controls per project.',
    citation: 'OPGGS Safety Regulations 2024',
  },
  {
    id: 'ca-sk-ccs-directives',
    score: 80,
    label: 'Saskatchewan Directives',
    evidence:
      'Provincial directives operationalise storage inside Saskatchewan oil and gas tenure, giving Prairie emitters a rules-based path beside the federal ITC.',
    citation: 'Saskatchewan directives record',
  },
  {
    id: 'ca-sk-spii',
    score: 80,
    label: 'Petroleum Innovation Lane',
    evidence:
      'The Saskatchewan Petroleum Innovation Incentive channels oil-sector innovation funding toward capture-adjacent technology inside producing operations.',
    citation: 'SPII programme record',
  },
  {
    id: 'cn-gd-carbon-inclusive',
    score: 80,
    label: 'Inclusive Mechanism Pilot',
    evidence:
      'Guangdong carbon-inclusive pilots extend carbon accounting to small sources and behaviours the ETS cannot reach, widening the mitigation tent.',
    citation: 'Guangdong inclusive mechanism record',
  },
  {
    id: 'cn-hb-ets-offset',
    score: 80,
    label: 'Hubei Offset Channel',
    evidence:
      'Hubei ETS offset provisions give central-China emitters a compliance flexibility channel that future CCUS credits could flow through.',
    citation: 'Hubei ETS record',
  },
  {
    id: 'cn-js-industrial-decarb-2022',
    score: 80,
    label: 'Jiangsu Industrial Plan',
    evidence:
      'Jiangsu industrial decarbonisation planning puts the coastal manufacturing belt on a sectoral pathway where capture retrofits are an explicit option.',
    citation: 'Jiangsu plan record (2022)',
  },
  {
    id: 'cn-mee-env-guidance-2024',
    score: 80,
    label: 'MEE Guidance Signal',
    evidence:
      'Ministry guidance signals environmental-regulatory direction for capture projects ahead of dedicated statutes, de-risking early movers on process.',
    citation: 'MEE guidance record (2024)',
  },
  {
    id: 'cn-miit-industrial-plan-2022',
    score: 80,
    label: 'MIIT Industrial Track',
    evidence:
      'MIIT industrial planning embeds capture in manufacturing upgrade pathways, tying technology support to plant-level deployment.',
    citation: 'MIIT plan record (2022)',
  },
  {
    id: 'cn-sd-eco-plan-14fym',
    score: 80,
    label: 'Shandong 14FYP Ecology',
    evidence:
      'Shandong 14th Five-Year ecology planning carries the province with the heaviest industrial base into structured decarbonisation with capture options.',
    citation: 'Shandong 14FYP record',
  },
  {
    id: 'eu-ccs-directive',
    score: 90,
    label: 'Directive Backbone',
    evidence:
      'The 2009 Directive remains the legal backbone every member-state regime (KSpTG, OPGGS-transpositions, ANP rules) implements — the root instrument of European storage law.',
    citation: 'Directive 2009/31/EC',
  },
  {
    id: 'eu-crcf-2024',
    score: 85,
    label: 'Removal Certification',
    evidence:
      'The Carbon Removal Certification Framework gives removals (including BECCS/DACCS with storage) an EU-wide integrity currency that national policies plug into.',
    citation: 'EU CRCF Regulation (2024)',
  },
  {
    id: 'hr-hydrocarbon-act-ccs',
    score: 80,
    label: 'Hydrocarbons Act Bridge',
    evidence:
      'Croatian hydrocarbons legislation bridges petroleum tenure into storage use, giving Adriatic geology a permitting path inside existing institutions.',
    citation: 'Croatia hydrocarbons record',
  },
  {
    id: 'icao-corsia-ccu-2024',
    score: 80,
    label: 'Aviation Offset Demand',
    evidence:
      'CORSIA-eligible CCU pathways turn aviation compliance demand into a revenue line for capture-to-fuel projects.',
    citation: 'ICAO CORSIA record (2024)',
  },
  {
    id: 'imo-marpol-occs-2024',
    score: 80,
    label: 'Maritime OCCS Track',
    evidence:
      'IMO MARPOL onboard-capture work opens the maritime compliance track for capture at sea with port-side offloading chains.',
    citation: 'IMO MARPOL record (2024)',
  },
  {
    id: 'intl-ccs-plus-framework',
    score: 80,
    label: 'CCS Plus Design',
    evidence:
      'The CCS-plus framework extends crediting design beyond storage to utilisation pathways, widening what counts as verified abatement.',
    citation: 'CCS-plus framework record',
  },
  {
    id: 'intl-gcca-net-zero-2050',
    score: 80,
    label: 'Cement Sector Pledge',
    evidence:
      'The cement-sector net-zero pledge binds the hardest industrial emitter group to capture timelines its own members must fund.',
    citation: 'GCCA net-zero record',
  },
  {
    id: 'intl-paris-art-6-4-ccs',
    score: 85,
    label: 'Article 6.4 Gateway',
    evidence:
      'Paris Article 6.4 mechanics offer CCS a UN-credited international compliance route, critical for cross-border chains and host-country value.',
    citation: 'Paris Agreement Art.6.4 record',
  },
  {
    id: 'jp-jogmec-advanced-ccs-2024',
    score: 80,
    label: 'JOGMEC Advanced Track',
    evidence:
      'JOGMEC advanced-CCS work with public-private survey funding de-risks Japanese storage characterisation ahead of commercial licensing.',
    citation: 'JOGMEC record (2024)',
  },
  {
    id: 'nl-porthos-sde-subsidy',
    score: 85,
    label: 'SDE++ Storage Backbone',
    evidence:
      'SDE++ operating support with T&S allowances underwrites Porthos and Aramis demand — the subsidy spine of Dutch storage scale-up.',
    citation: 'SDE++ record; Xodus tariff review (2024)',
  },
  {
    id: 'no-tax-deduction-ccs',
    score: 80,
    label: 'Fiscal Recognition',
    evidence:
      'Tax-deduction treatment recognises capture capex inside the petroleum fiscal frame that funds the Norwegian state — incentive through the tax code.',
    citation: 'Norway fiscal record',
  },
  {
    id: 'ro-law-114-2013-ccs',
    score: 80,
    label: 'Transposition Root',
    evidence:
      'The 2013 approval law rooting OUG 64/2011 transposition remains the statutory root the 2024 emergency ordinance grew from.',
    citation: 'Law 114/2013; OUG 139/2024',
  },
  {
    id: 'tx-hb-1284-ccus',
    score: 85,
    label: 'RRC Consolidation',
    evidence:
      'HB 1284 single-agency consolidation under the RRC with December 2025 primacy makes Texas permitting the fastest state track in the US.',
    citation: 'HB 1284 (2021); EPA Texas final rule (Nov 2025)',
  },
  {
    id: 'us-la-primacy-rules',
    score: 80,
    label: 'LDNR Administration',
    evidence:
      'Louisiana primacy administration (effective February 2024) with LDNR permitting localises Gulf Coast storage oversight where the geology is.',
    citation: 'EPA Louisiana final rule (Jan 2024)',
  },
  {
    id: 'us-nd-century-code-38-22',
    score: 80,
    label: 'First-Primacy Code',
    evidence:
      'North Dakota pioneering primacy code (2018, first state) wrote the template every later state application followed.',
    citation: 'ND primacy record (2018)',
  },
  {
    id: 'vn-decree-119-2025',
    score: 80,
    label: 'Decree Machinery',
    evidence:
      'Decree 119/2025 machinery with Decision 263 budgets operationalises the pilot ETS that future Vietnamese storage will monetise against.',
    citation: 'Decree 119/2025; Decision 263',
  },
];

function execute(db, sql, params = []) {
  const statement = db.prepare(sql);
  statement.run(params);
  statement.free();
}

function scalar(db, sql, params = []) {
  const statement = db.prepare(sql);
  statement.bind(params);
  const value = statement.step() ? statement.get()[0] : null;
  statement.free();
  return value;
}

function snapshotFrozenTables(db) {
  return Object.fromEntries(
    FROZEN_TABLES.map((table) => [
      table,
      JSON.stringify(queryRows(db, `SELECT * FROM ${table} ORDER BY rowid`)),
    ])
  );
}

function assertFrozenTablesUnchanged(before, after) {
  for (const table of FROZEN_TABLES) {
    if (before[table] !== after[table]) {
      throw new Error(`Frozen non-policy table changed: ${table}`);
    }
  }
}

export function applyStrategicSweep(db, { auditDate = AUDIT_DATE } = {}) {
  db.run('PRAGMA foreign_keys = ON');
  for (const entry of STRATEGIC_UPDATES) {
    const n = Number(
      scalar(
        db,
        'SELECT COUNT(*) FROM policy_analysis WHERE policy_id = ? AND dimension = ?',
        [entry.id, 'strategic']
      )
    );
    if (n !== 1) throw new Error(`Strategic row missing for ${entry.id}`);
  }

  const frozenBefore = snapshotFrozenTables(db);
  db.run('BEGIN TRANSACTION');
  try {
    for (const entry of STRATEGIC_UPDATES) {
      execute(
        db,
        `UPDATE policy_analysis SET score = ?, label = ?, evidence = ?,
           citation = ?, audit_note = ? WHERE policy_id = ? AND dimension = ?`,
        [
          entry.score,
          entry.label,
          entry.evidence,
          entry.citation,
          '',
          entry.id,
          'strategic',
        ]
      );
      execute(
        db,
        `UPDATE policies SET provenance_reviewer = ?,
           provenance_last_audit_date = ? WHERE id = ?`,
        [AUDIT_REVIEWER, auditDate, entry.id]
      );
    }
    execute(db, 'INSERT OR REPLACE INTO db_meta (key, value) VALUES (?, ?)', [
      `migration:${MIGRATION_ID}`,
      auditDate,
    ]);
    const frozenAfter = snapshotFrozenTables(db);
    assertFrozenTablesUnchanged(frozenBefore, frozenAfter);
    db.run('COMMIT');
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }

  return {
    migrationId: MIGRATION_ID,
    updatedPolicies: STRATEGIC_UPDATES.map((entry) => entry.id),
    frozenTablesVerified: FROZEN_TABLES,
  };
}

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database not found: ${DB_PATH}`);
  }

  acquireDbLock();
  try {
    const SQL = await initSqlJs();
    const db = new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)));
    const summary = applyStrategicSweep(db);
    const output = db.export();
    db.close();
    atomicWriteDb(DB_PATH, output);
    console.log(JSON.stringify(summary, null, 2));
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
    console.error(`Strategic sweep migration failed: ${error.message}`);
    process.exit(1);
  });
}

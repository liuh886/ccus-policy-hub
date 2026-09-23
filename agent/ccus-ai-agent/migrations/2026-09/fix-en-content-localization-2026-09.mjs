#!/usr/bin/env node
/**
 * fix-en-content-localization-2026-09.mjs
 *
 * Removes the remaining CJK fragments from the English policy layer. The
 * 2026-09 analysis-block localization backlog found 24 of 129 en policy files
 * still carrying CJK; 15 of those are the native-language provenance `source`
 * (kept by design), and 9 are genuine localization leaks in localizable
 * content. This migration translates those leaks — mixed-language fragments,
 * Chinese article citations, and one Japanese kanji gloss — into English.
 *
 * Scope: `policy_analysis` (the shared five-dimension block) and
 * `policy_i18n` en rows (description / impact / evolution / regulatory).
 * Content-only: no schema change, no status/capacity change, no deletions.
 *
 * Idempotency: each fix is a literal substring replacement whose `to` never
 * contains its `from`; re-running changes zero rows. Verified by
 * `fix-en-content-localization-2026-09.test.mjs`.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';
import {
  acquireDbLock,
  atomicWriteDb,
  releaseDbLock,
} from '../../../../scripts/lib/db-write.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../../..');
const DB_PATH = path.join(ROOT, 'agent/ccus-ai-agent/db/ccus_master.sqlite');

export const MIGRATION_ID = 'fix-en-content-localization-2026-09';
export const AUDIT_DATE = '2026-09-23';
export const REVIEWER = 'Content localization fix (2026-09)';

/**
 * table      — 'policy_analysis' | 'policy_i18n'
 * policyId   — policies.id
 * key        — dimension (policy_analysis) or lang (policy_i18n)
 * column     — the column holding the fragment
 * from / to  — literal substring replacement
 */
export const CONTENT_LOCALIZATION_FIXES = Object.freeze([
  // --- Shared five-dimension analysis block (policy_analysis) ---
  {
    table: 'policy_analysis',
    policyId: 'cn-ccer',
    key: 'mrv',
    column: 'evidence',
    from: '审定/核算/核查',
    to: 'validation/accounting/verification',
  },
  {
    table: 'policy_analysis',
    policyId: 'cn-gd-carbon-inclusive',
    key: 'incentive',
    column: 'citation',
    from: '第四章：核证减排量管理',
    to: 'Chapter 4: Certified Emission Reduction Management',
  },
  {
    table: 'policy_analysis',
    policyId: 'cn-gd-carbon-inclusive',
    key: 'market',
    column: 'citation',
    from: '第三十条',
    to: 'Article 30',
  },
  {
    table: 'policy_analysis',
    policyId: 'cn-gd-carbon-inclusive',
    key: 'mrv',
    column: 'citation',
    from: '第三章：方法学管理',
    to: 'Chapter 3: Methodology Management',
  },
  {
    table: 'policy_analysis',
    policyId: 'cn-gd-carbon-inclusive',
    key: 'statutory',
    column: 'citation',
    from: '第二条：适用范围',
    to: 'Article 2: Scope of Application',
  },
  {
    table: 'policy_analysis',
    policyId: 'cn-hb-ets-offset',
    key: 'incentive',
    column: 'citation',
    from: '管理办法第 22 条',
    to: 'Administrative Measures, Article 22',
  },
  {
    table: 'policy_analysis',
    policyId: 'cn-hb-ets-offset',
    key: 'statutory',
    column: 'citation',
    from: '湖北省政府令第 371 号',
    to: 'Hubei Provincial Government Order No. 371',
  },
  {
    table: 'policy_analysis',
    policyId: 'cn-js-industrial-decarb-2022',
    key: 'incentive',
    column: 'citation',
    from: '第四章：保障措施',
    to: 'Chapter 4: Safeguard Measures',
  },
  {
    table: 'policy_analysis',
    policyId: 'cn-js-industrial-decarb-2022',
    key: 'statutory',
    column: 'citation',
    from: '第二章：主要任务',
    to: 'Chapter 2: Key Tasks',
  },
  {
    table: 'policy_analysis',
    policyId: 'cn-sd-eco-plan-14fym',
    key: 'incentive',
    column: 'citation',
    from: '第三章：主要目标与任务',
    to: 'Chapter 3: Main Objectives and Tasks',
  },
  {
    table: 'policy_analysis',
    policyId: 'cn-sd-eco-plan-14fym',
    key: 'mrv',
    column: 'citation',
    from: '第四章：环境监测体系',
    to: 'Chapter 4: Environmental Monitoring System',
  },
  {
    table: 'policy_analysis',
    policyId: 'cn-sd-eco-plan-14fym',
    key: 'statutory',
    column: 'citation',
    from: '第五章：绿色低碳发展',
    to: 'Chapter 5: Green and Low-Carbon Development',
  },
  {
    table: 'policy_analysis',
    policyId: 'cn-zero-carbon-parks',
    key: 'statutory',
    column: 'evidence',
    from: 'from申报 to验收',
    to: 'from application to acceptance',
  },
  // --- English i18n rows (policy_i18n, lang = en) ---
  {
    table: 'policy_i18n',
    policyId: 'cn-ccer',
    key: 'en',
    column: 'evolution_json',
    from: 'agri waste,新能源, efficiency',
    to: 'agri waste, new energy, efficiency',
  },
  {
    table: 'policy_i18n',
    policyId: 'cn-co2-transport-status-2025',
    key: 'en',
    column: 'impact_analysis_json',
    from: '0.4万吨 transport-leg',
    to: '4,000 t transport-leg',
  },
  {
    table: 'policy_i18n',
    policyId: 'cn-ordos-pilot-2024',
    key: 'en',
    column: 'description',
    from: 'CCUS减碳示范 on coal units',
    to: 'CCUS decarbonisation demonstrations on coal units',
  },
  {
    table: 'policy_i18n',
    policyId: 'cn-sd-eco-plan-14fym',
    key: 'en',
    column: 'impact_analysis_json',
    from: "'协同 (Synergy)' effect",
    to: "'synergy' effect",
  },
  {
    table: 'policy_i18n',
    policyId: 'cn-zero-carbon-parks',
    key: 'en',
    column: 'description',
    from: '¥20.09 billion新能源 output',
    to: '¥20.09 billion new-energy output',
  },
  {
    table: 'policy_i18n',
    policyId: 'cn-zero-carbon-parks',
    key: 'en',
    column: 'impact_analysis_json',
    from: 'doubling新能源 output',
    to: 'doubling new-energy output',
  },
  {
    table: 'policy_i18n',
    policyId: 'cn-zero-carbon-parks',
    key: 'en',
    column: 'evolution_json',
    from: '2024新能源 output',
    to: '2024 new-energy output',
  },
  {
    table: 'policy_i18n',
    policyId: 'jp-ccs-business-act-2024',
    key: 'en',
    column: 'regulatory_json',
    from: '拟制物权 (Quasi-real Rights / Mina-shi Bukken).',
    to: 'Quasi-real Rights (Mina-shi Bukken).',
  },
]);

function keyColumn(table) {
  return table === 'policy_analysis' ? 'dimension' : 'lang';
}

/**
 * Apply the localization fixes to an open sql.js database. Returns the number
 * of rows actually updated. Idempotent: a row already fixed (or whose `from`
 * fragment is absent) is skipped.
 */
export function applyContentLocalizationFixes(db) {
  let updated = 0;
  const touchedPolicies = new Set();

  for (const fix of CONTENT_LOCALIZATION_FIXES) {
    const keyCol = keyColumn(fix.table);
    const read = db.prepare(
      `SELECT ${fix.column} AS value FROM ${fix.table} WHERE policy_id = ? AND ${keyCol} = ?`
    );
    read.bind([fix.policyId, fix.key]);
    const current = read.step() ? read.get()[0] : undefined;
    read.free();

    if (typeof current !== 'string' || !current.includes(fix.from)) continue;

    const next = current.split(fix.from).join(fix.to);
    const write = db.prepare(
      `UPDATE ${fix.table} SET ${fix.column} = ? WHERE policy_id = ? AND ${keyCol} = ?`
    );
    write.run([next, fix.policyId, fix.key]);
    write.free();
    updated += 1;
    touchedPolicies.add(fix.policyId);
  }

  for (const policyId of touchedPolicies) {
    db.run(
      'UPDATE policies SET provenance_reviewer = ?, provenance_last_audit_date = ? WHERE id = ?',
      [REVIEWER, AUDIT_DATE, policyId]
    );
  }

  return updated;
}

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database not found at: ${DB_PATH}`);
  }
  acquireDbLock();
  try {
    const SQL = await initSqlJs();
    const db = new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)));
    const updated = applyContentLocalizationFixes(db);
    const bytes = db.export();
    db.close();
    atomicWriteDb(DB_PATH, bytes);
    console.log(`${MIGRATION_ID}: updated ${updated} rows`);
    console.log(`Audit date stamped: ${AUDIT_DATE}`);
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
    console.error(`Failed to run ${MIGRATION_ID}: ${error.message}`);
    process.exit(1);
  });
}

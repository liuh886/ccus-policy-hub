#!/usr/bin/env node
/**
 * add-beijing-ccus-measures-2026.mjs
 *
 * Ingests the Beijing municipal CCUS industrial cultivation measures:
 * 《北京市关于推动碳捕集利用与封存产业培育壮大的若干措施》（京经信发〔2026〕15号）
 * Published online: 2026-03-24, Beijing Municipal Bureau of Economy and Information Technology et al.
 *
 * Scope: Policies table, policy_i18n (en, zh), policy_analysis (5 dimensions).
 * Preserves all non-policy frozen tables untouched.
 * Uses atomic DB write with process lock via scripts/lib/db-write.mjs.
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

export const MIGRATION_ID = 'add-beijing-ccus-measures-2026';
export const AUDIT_DATE = '2026-10-21';
export const AUDIT_AUTHOR = 'CCUS Policy Hub curation';
export const AUDIT_REVIEWER = 'Primary-source official gazette ingest';

const FROZEN_TABLES = [
  'facilities',
  'facility_i18n',
  'facility_partners',
  'facility_links',
  'country_profiles',
  'country_i18n',
];

export const NEW_POLICIES = [
  {
    core: {
      id: 'cn-bj-ccus-measures-2026',
      country: 'China',
      year: 2026,
      status: 'Active',
      category: 'Strategic',
      review_status: 'draft',
      legal_weight: 'Departmental Rules',
      source: '北京市经济和信息化局',
      url: 'https://www.beijing.gov.cn/zhengce/zhengcefagui/202603/t20260324_4564707.html',
      pub_date: '2026-03-24',
    },
    i18n: {
      en: {
        title:
          'Beijing Municipal Measures on Cultivating and Expanding the CCUS Industry (2026)',
        description:
          'Issued jointly on March 17, 2026 by four municipal authorities—the Beijing Municipal Bureau of Economy and Information Technology, Beijing Municipal Development and Reform Commission, Beijing Municipal Science and Technology Commission / Administrative Committee of Zhongguancun Science Park, and Beijing Municipal Ecology and Environment Bureau (Jing Jing Xin Fa [2026] No. 15, published online on March 24, 2026)—the "Measures of Beijing Municipality on Promoting the Cultivation and Expansion of the Carbon Capture, Utilisation and Storage (CCUS) Industry" establish an integrated strategic support architecture to nurture CCUS as a pillar future industry under the capital city\'s green economic transition framework. Drawing on Beijing\'s concentration of scientific research institutions and national headquarters, the policy directs municipal resources toward R&D breakthroughs in high-performance absorbents, adsorbents, membrane separation, bio-energy with CCS (BECCS), direct air capture (DAC), green fuels, and high-precision CO2 monitoring equipment. It accelerates industrial pilot-scale verification by subsidising pilot testing production lines and mandating municipal energy state-owned enterprises (SOEs) to open real-world application scenarios. The framework provides structured incubation and financing pipelines, establishing specialised incubators, fostering specialized and sophisticated "little giant" SMEs, and instituting an accelerated listing review mechanism on the Beijing Stock Exchange (BSE). To overcome the municipality\'s spatial and geological storage limitations, the policy explicitly orchestrates a regional division of labor across the Beijing-Tianjin-Hebei (Jing-Jin-Ji) mega-cluster, guiding advanced R&D and core equipment manufacturing to locate in Beijing while deploying full-chain demonstration projects in regional heavy industries such as steel, petrochemicals, power generation, and cement in Hebei and Tianjin. Furthermore, the measures mandate local greenhouse gas accounting guidelines aligned with the national CCER methodology framework, subsidise international and national standard formulation, and mobilise municipal government investment guidance funds and green financial facilities through December 31, 2028.',
        scope:
          'Beijing municipal CCUS strategic architecture: advanced R&D, pilot verification lines, energy SOE scenario opening, specialized SME cultivation, Beijing-Tianjin-Hebei cross-regional industrial chain integration, local MRV guidelines and CCER methodology alignment, BSE IPO fast-tracking, and municipal guidance fund support through 2028.',
        tags: [
          'Beijing',
          'industrial cultivation',
          'pilot verification',
          'Jing-Jin-Ji synergy',
          'CCER methodology',
          'BSE listing',
          'advanced manufacturing fund',
        ],
        impactAnalysis: {
          economic:
            'Leverages municipal high-tech industry development funds and specialized ecological R&D budgets to subsidise capital equipment and pilots, while opening accelerated Beijing Stock Exchange (BSE) access and municipal investment guidance funds to lower private risk.',
          technical:
            'Focuses public R&D grants on frontier bottlenecks including advanced chemical/physical sorbents, direct air capture (DAC), electrochemical CO2 conversion into green aviation/marine fuels, and high-precision field measurement instruments.',
          environmental:
            'Develops standardized local accounting methodologies that feed directly into national CCER trading, establishing verified compliance and voluntary offsetting credentials for industrial abatement across the capital economic circle.',
        },
        evolution: {
          clusters: [
            'Beijing Green Economy',
            'Jing-Jin-Ji Decarbonisation',
            'CCER Methodologies',
            'Industrial Innovation',
          ],
          milestones: [
            {
              date: '2023-09-08',
              event:
                'Beijing Municipal Government released the implementation opinions on accelerating the development of an International Green Economy Benchmark City.',
            },
            {
              date: '2026-03-17',
              event:
                'Four municipal authorities jointly enacted the Measures on Promoting the Cultivation and Expansion of the CCUS Industry (Jing Jing Xin Fa [2026] No. 15).',
            },
            {
              date: '2026-03-24',
              event:
                'The measures were officially gazetted online via the Capital Window municipal government portal.',
            },
            {
              date: '2028-12-31',
              event:
                'Scheduled expiration date of the first 3-year term of the municipal CCUS industrial measures.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        title: '北京市关于推动碳捕集利用与封存产业培育壮大的若干措施 (2026)',
        description:
          '2026年3月17日，北京市经济和信息化局、北京市发展和改革委员会、北京市科学技术委员会/中关村科技园区管委会、北京市生态环境局四部门联合印发《北京市关于推动碳捕集利用与封存产业培育壮大的若干措施》（京经信发〔2026〕15号，3月24日政务公开）。文件深入落实北京市加快建设国际绿色经济标杆城市实施意见，充分依托首都高水平研发集聚优势，提出统筹推进低能耗捕集材料（吸收剂、吸附剂、分离膜）、负碳技术（BECCS、DAC）、二氧化碳高值化转化制备绿色燃料及高精度监测设备等核心技术攻关。在工程化方面，支持在京落地CCUS新技术与新产品中试验证平台，推动能源央企与市属国企开放全场景验证；在产业生态上，支持建设专业孵化器，建立专精特新中小企业梯度培育机制，并对符合条件的中试与产业化项目给予高精尖产业发展资金奖励。针对首都地质埋存空间制约，措施明确推动京津冀产业链协同布局，引导关键核心材料与高端装备在京转化，鼓励企业在津冀火电、钢铁、石化、建材等重点工业场景布局大规模、全流程示范工程。制度保障层面，明确制定北京市CCUS碳减排核算指南并衔接国家自愿减排（CCER）方法学与国内外标准转化，强化市区两级政府引导基金与绿色金融支持，开通专精特新企业申报北交所快速通道。措施自印发之日起施行，有效期至2028年12月31日。',
        scope:
          '北京市CCUS产业培育战略架构：核心关键技术攻关、新技术中试验证平台、能源国企场景开放、专精特新梯度培育、京津冀跨区域全流程示范协同、地方减排核算指南与CCER衔接、北交所上市绿色通道及政府引导基金支持（有效期至2028年底）。',
        tags: [
          '北京',
          '产业培育',
          '中试验证',
          '京津冀协同',
          'CCER方法学',
          '北交所上市',
          '高精尖资金',
        ],
        impactAnalysis: {
          economic:
            '通过北京市高精尖产业发展资金与生态环境科技资金对中试、首台套和示范工程给予财政奖补，联动市区两级政府引导基金，开通北交所上市审核绿色通道，有效降低企业早期研发与中试融资门槛。',
          technical:
            '重点突破低能耗高性能吸收剂与膜材料、直接空气碳捕集（DAC）、二氧化碳催化制备绿色燃料等前沿技术，建设开放共享的公共中试验证平台，解决研发与产业化脱节的工程放大瓶颈。',
          environmental:
            '建立北京市CCUS碳减排核算指南并对标国家CCER自愿减排方法学，推动京津冀重化工业全流程捕集封存工程的碳减排量可测量、可报告、可核查并实现资产化流转。',
        },
        evolution: {
          clusters: [
            '北京绿色经济标杆',
            '京津冀产业协同',
            'CCER方法学衔接',
            '未来产业创新',
          ],
          milestones: [
            {
              date: '2023-09-08',
              event:
                '北京市印发加快建设国际绿色经济标杆城市的实施意见，确立绿色技术创新与未来产业战略布局。',
            },
            {
              date: '2026-03-17',
              event:
                '北京市经信局等四部门联合签署印发《北京市关于推动碳捕集利用与封存产业培育壮大的若干措施》（京经信发〔2026〕15号）。',
            },
            {
              date: '2026-03-24',
              event:
                '首都之窗北京市人民政府门户网站正式向社会公开发布措施全文。',
            },
            {
              date: '2028-12-31',
              event: '本轮若干措施首期三年实施期届满节点。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 80,
        label: 'Municipal Funds & Equity Stack',
        evidence:
          'Municipal high-tech industry development funds, ecological tech grants, and municipal guidance funds stack behind core technology R&D, pilot-scale facilities, first-of-a-kind equipment, and full-process industrial demonstrations.',
        citation: 'Sections 1, 2, 7, 8, 12; Jing Jing Xin Fa [2026] No. 15',
      },
      statutory: {
        score: 75,
        label: 'Quad-Department Joint Regulation',
        evidence:
          'Jointly enacted by Beijing’s economic, developmental, scientific, and environmental regulators, creating an enforceable municipal administrative regulatory framework governing pilot approvals, subsidies, and certifications through 2028.',
        citation: 'Jing Jing Xin Fa [2026] No. 15 enacting clauses',
      },
      market: {
        score: 75,
        label: 'Regional Value Chain & Capital Access',
        evidence:
          'The policy couples cross-regional Jing-Jin-Ji industrial deployment with national CCER market crediting and fast-tracks Beijing Stock Exchange (BSE) IPO filings for qualified CCUS specialized enterprises.',
        citation: 'Sections 5, 6, 9, 12; Jing Jing Xin Fa [2026] No. 15',
      },
      strategic: {
        score: 85,
        label: 'Green Benchmark City Catalyst',
        evidence:
          'Translates Beijing’s International Green Economy Benchmark City strategy into a clear functional division of labor, establishing Beijing as the scientific and pilot testing hub while driving large-scale storage projects in Tianjin and Hebei.',
        citation: 'Preamble, Sections 2, 6, 8; Jing Jing Xin Fa [2026] No. 15',
      },
      mrv: {
        score: 80,
        label: 'Municipal MRV & Standard Conversion',
        evidence:
          'Mandates the formulation of Beijing municipal CCUS project carbon accounting guidelines, advances high-precision monitoring devices, and supports elevating local and association standards into national and ISO standards.',
        citation: 'Sections 1, 9; Jing Jing Xin Fa [2026] No. 15',
      },
    },
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

function insertPolicy(db, entry, auditDate) {
  const c = entry.core;
  execute(
    db,
    `INSERT INTO policies (
      id, country, year, status, category, review_status,
      legal_weight, source, url, pub_date, provenance_author,
      provenance_reviewer, provenance_last_audit_date
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      c.id,
      c.country,
      c.year,
      c.status,
      c.category,
      c.review_status,
      c.legal_weight,
      c.source,
      c.url,
      c.pub_date,
      AUDIT_AUTHOR,
      AUDIT_REVIEWER,
      auditDate,
    ]
  );

  for (const lang of ['en', 'zh']) {
    const l = entry.i18n[lang];
    execute(
      db,
      `INSERT INTO policy_i18n (
        policy_id, lang, title, description, scope,
        tags_json, impact_analysis_json, interpretation, evolution_json,
        regulatory_json
      ) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        c.id,
        lang,
        l.title,
        l.description,
        l.scope,
        JSON.stringify(l.tags),
        JSON.stringify(l.impactAnalysis),
        null,
        JSON.stringify(l.evolution),
        JSON.stringify(l.regulatory),
      ]
    );
  }

  for (const [dimension, values] of Object.entries(entry.analysis)) {
    execute(
      db,
      `INSERT INTO policy_analysis (
        policy_id, dimension, score, label, evidence, citation, audit_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        c.id,
        dimension,
        values.score,
        values.label,
        values.evidence,
        values.citation,
        '',
      ]
    );
  }
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

export function applyAddBeijingMeasures(db, { auditDate = AUDIT_DATE } = {}) {
  db.run('PRAGMA foreign_keys = ON');
  const frozenBefore = snapshotFrozenTables(db);
  db.run('BEGIN TRANSACTION');
  const inserted = [];
  const skipped = [];

  try {
    for (const entry of NEW_POLICIES) {
      const exists =
        Number(
          scalar(db, 'SELECT COUNT(*) FROM policies WHERE id = ?', [
            entry.core.id,
          ])
        ) === 1;
      if (!exists) {
        insertPolicy(db, entry, auditDate);
        inserted.push(entry.core.id);
      } else {
        skipped.push(entry.core.id);
      }
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
    insertedPolicies: inserted,
    skippedPolicies: skipped,
  };
}

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database not found at: ${DB_PATH}`);
  }
  acquireDbLock();
  try {
    const SQL = await initSqlJs();
    const db = new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)));
    const summary = applyAddBeijingMeasures(db);
    const bytes = db.export();
    db.close();
    atomicWriteDb(DB_PATH, bytes);
    console.log(
      `${MIGRATION_ID}: inserted ${summary.insertedPolicies.length} policy records (${summary.insertedPolicies.join(', ')}), skipped ${summary.skippedPolicies.length}`
    );
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

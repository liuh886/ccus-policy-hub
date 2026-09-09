#!/usr/bin/env node
/**
 * Coverage phase 2A (2026-09): close the two high-priority missing China
 * cells (storage/permitting, transport/market) with two new primary-source
 * records plus curated framework updates.
 *
 * - cn-ccus-national-standards-2026 (NEW): 12 national CCUS standards
 *   approved January 8, 2026 (SAMR/SAC), effective July 1, 2026.
 * - cn-co2-transport-status-2025 (NEW): operating Qilu-Shengli pipeline,
 *   GB/T pipeline-quality standard, funded long-distance demonstration.
 *
 * Honesty record: verification confirmed there is still no dedicated
 * national CCS permitting/liability law and no dedicated CO2 transport,
 * access or tariff framework — the cells move to partial (components
 * documented), not covered. New records enter as draft; covered cells
 * would require verified evidence per the framework guardrails.
 * Approved 2026-09-09 (data-quality special, Phase 2A).
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

export const MIGRATION_ID = 'coverage-phase2a-2026-09';
const AUDIT_DATE = '2026-09-09';
const AUDIT_AUTHOR = 'CCUS Policy Hub curation';
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

export const NEW_POLICIES = [
  {
    core: {
      id: 'cn-ccus-national-standards-2026',
      country: 'China',
      year: 2026,
      status: 'Active',
      category: 'Technical Standard',
      review_status: 'draft',
      legal_weight: 'National Standard',
      source: 'Standardization Administration of China',
      url: 'https://www.ndls.org.cn/standard/detail/ae26325c989bc2b059b0178279e40c1b',
      pub_date: '2026-01-08',
    },
    i18n: {
      en: {
        title: 'China 12 National CCUS Standards Package (2026)',
        description:
          'On January 8, 2026 the State Administration for Market Regulation (SAMR) via its National Standardization Administration approved 12 national CCUS standards effective July 1, 2026, covering capture, transport, storage, terminology and emission-reduction accounting across the full chain. Storage is governed by GB/T 46878-2025 (geological storage, identical to ISO 27914:2017: site screening and selection, capacity evaluation, injection scheme design, risk management, project management); transport by GB/T 46875-2025 (quality of CO2 entering long-distance pipelines: indicators, sampling, testing, inspection); foundations by GB/T 46872-2025 (vocabulary, identical to ISO 27917:2017, fixing accounting boundaries and procedures) and GB/T 46879-2025 (project-level GHG reduction assessment). The package adds GB/T 46877 (post-combustion systems), 46871 (CO2-EOR storage, identical to ISO 27916:2019), 46870.1/.2 (capture performance evaluation), 46876 (capture facility operation), 46880 (storage test methods) and 46874/46873 (offshore saline-aquifer capacity and site assessment). Five of the twelve are identical adoptions of ISO standards, under SAC/TC207 with drafting by CAS institutes, China Geological Survey units, grid and energy groups. Foreign observers (SESEC) read the release as moving the Chinese CCUS market from rules-pending to rules-transparent.',
        scope:
          'China nationwide CCUS technical regulation: capture system requirements and performance evaluation, long-distance pipeline CO2 quality, geological storage lifecycle (screening to closure preparation), EOR storage, offshore assessment, terminology, and project-level emission-reduction accounting.',
        tags: [
          'national standards',
          'GB/T',
          'geological storage',
          'pipeline quality',
          'ISO adoption',
          'emission accounting',
        ],
        impactAnalysis: {
          economic:
            'Unified specifications cut compliance search costs for equipment vendors and project developers; ISO-identical adoptions give foreign technologies with full-chain expertise a transparent market-access path.',
          technical:
            'Codifies the storage lifecycle end to end (screening, characterisation, injection design, risk management, closure preparation) while explicitly excluding post-closure transfer, property rights and licensing process, which remain regulatory matters.',
          environmental:
            'Project-level reduction assessment (GB/T 46879) plus vocabulary accounting boundaries create the methodology base for future CCER inclusion of CCUS, linking technical rules to the carbon market.',
        },
        evolution: {
          clusters: [
            'China CCUS Standardisation',
            'ISO Alignment',
            'Carbon Market Methodology',
          ],
          milestones: [
            {
              date: '2024-12-13',
              event:
                'The new edition of the China CCUS technology development roadmap framed standardisation as the industrialisation prerequisite.',
            },
            {
              date: '2026-01-08',
              event:
                'SAMR/SAC approved the 12 national CCUS standards, five identical to ISO standards.',
            },
            {
              date: '2026-07-01',
              event:
                'The standards package takes effect, making full-chain technical rules enforceable references for projects and assessments.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        title: '中国CCUS十二项国家标准（2026）',
        description:
          '2026年1月8日国家市场监管总局（国家标准委）批准12项CCUS国家标准，2026年7月1日实施，覆盖捕集、运输、封存、术语与减排核算全链条。封存执行GB/T 46878-2025（地质封存，等同ISO 27914:2017：场址筛选评价、储量评估、注入方案设计、风险管理、项目管理）；运输执行GB/T 46875-2025（进入长输管道的二氧化碳品质：指标、取样、检测、检验）；基础执行GB/T 46872-2025（术语，等同ISO 27917:2017，明确核算边界程序方法）与GB/T 46879-2025（项目级温室气体减排评估）。另含GB/T 46877（燃烧后捕集）、46871（驱油封存，等同ISO 27916:2019）、46870.1/.2（捕集性能评价）、46876（捕集设施运行）、46880（封存测试方法）、46874/46873（海上咸水层储量与场址评价）。12项中5项等同采用ISO标准，归口全国环境管理标准化技术委员会，由中科院、地调、管网、能源集团等起草。欧盟SESEC评价称此举把中国CCUS市场从"规则待定"推向"规则透明"。',
        scope:
          '全国CCUS技术规范：捕集系统要求与性能评价、长输管道二氧化碳品质、地质封存全生命周期（筛选到关闭准备）、驱油封存、海上评价、术语、项目级减排核算。',
        tags: [
          '国家标准',
          'GB/T',
          '地质封存',
          '管道品质',
          'ISO采标',
          '减排核算',
        ],
        impactAnalysis: {
          economic:
            '统一规范降低设备商与开发商的合规搜寻成本；等同采用ISO给有全链条技术的外方透明的市场准入路径。',
          technical:
            '把封存全生命周期写成规范（筛选、表征、注入设计、风险管理、关闭准备），同时明确不管封场后移交、产权与许可程序——那些仍是监管事项。',
          environmental:
            '项目级减排评估（GB/T 46879）加术语核算边界，为CCUS未来纳入CCER搭好方法学底座，把技术规则连到碳市场。',
        },
        evolution: {
          clusters: ['中国CCUS标准化', 'ISO对接', '碳市场方法学'],
          milestones: [
            {
              date: '2024-12-13',
              event: '新版中国CCUS技术发展路线图把标准化列为产业化的前提。',
            },
            {
              date: '2026-01-08',
              event: '市场监管总局批准12项CCUS国标，5项等同采用ISO标准。',
            },
            {
              date: '2026-07-01',
              event: '标准包实施，全链条技术规则成为项目与评估的可引用依据。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 60,
        label: 'De-risking Rules',
        evidence:
          'Standards are not subsidies, but unified specifications and ISO-identical adoptions lower entry risk for vendors and unlock EU Innovation Fund-style co-financing routes that require codified technical baselines.',
        citation: 'SESEC standards note (Feb 2026)',
      },
      statutory: {
        score: 85,
        label: 'National Standards System',
        evidence:
          'Twelve SAMR/SAC national standards under SAC/TC207 give storage, transport and accounting binding technical references, while explicitly deferring licensing, property and post-closure transfer to regulators.',
        citation: 'SAMR/SAC approval (Jan 2026); GB/T 46878 scope clause',
      },
      market: {
        score: 75,
        label: 'Transparent Access',
        evidence:
          'Published quality indicators, testing methods and evaluation criteria let domestic and foreign suppliers compete on common specifications across capture, pipeline and storage equipment.',
        citation: 'GB/T 46875; GB/T 46870.1/.2',
      },
      strategic: {
        score: 85,
        label: 'Full-Chain Coverage',
        evidence:
          'Capture-to-accounting coverage in one package matches the 15th Five-Year Plan industrialisation window and the 2030 scale-up horizon flagged by the Global CCS Institute China review.',
        citation: 'GCCSI China review (2026)',
      },
      mrv: {
        score: 85,
        label: 'Assessment Methodology',
        evidence:
          'GB/T 46879 (project-level reduction assessment) with GB/T 46872 accounting boundaries and GB/T 46880 storage test methods supply the measurement spine for future carbon-market crediting.',
        citation: 'GB/T 46879-2025; GB/T 46872-2025',
      },
    },
  },
  {
    core: {
      id: 'cn-co2-transport-status-2025',
      country: 'China',
      year: 2025,
      status: 'Active',
      category: 'Strategic',
      review_status: 'draft',
      legal_weight: 'Guideline/Policy',
      source: 'Sinopec / MOST demonstration programme',
      url: 'http://chinacpc.com.cn/info/2023-07-11/news_7555.html',
      pub_date: '2023-07-11',
    },
    i18n: {
      en: {
        title:
          'China CO2 Transport: Operating Pipeline and Demonstration (2025)',
        description:
          'China CO2 transport runs on point-to-point demonstration infrastructure without a dedicated pipeline, access or tariff framework. The landmark is the Sinopec Qilu-Shengli line commissioned July 11, 2023: 109 km (108.7 km) of high-pressure ambient-temperature dense-phase service at 12 MPa design pressure — the first 100-km-class, Mt-class, 10-MPa-class CO2 pipeline in China — moving up to 1.7 Mt/yr of captured Qilu Petrochemical CO2 to Shengli oilfield wells for flooding and storage (70+ injection wells, 10 Mt+ over 15 years). Before the line, the project ran on road tankers from August 2022 (40,000 truck trips a year eliminated since). Research outlooks (BIT) put the carbon-neutrality pipeline need above 17,000 km against a present base of short, small, low-pressure lines with road tankers still dominant. GB/T 46875-2025 (effective July 2026) now fixes long-distance pipeline CO2 quality, and the April 2025 green-technology demonstration awards funded a long-distance CO2 pipeline project alongside six CCS projects — the first programme-level transport commitments.',
        scope:
          'China onshore CO2 transport: operating dense-phase pipeline demonstration, road-tanker baseline, long-distance pipeline quality standard, funded pipeline demonstration, and the documented absence of third-party access and tariff rules.',
        tags: [
          'CO2 pipeline',
          'Qilu-Shengli',
          'dense-phase transport',
          'pipeline quality',
          'demonstration programme',
          'no access framework',
        ],
        impactAnalysis: {
          economic:
            'The Qilu-Shengli line proves Mt-scale pipeline economics (tanker replacement, 0.4万吨 transport-leg CO2 avoided) while the missing tariff/access regime keeps every new line a negotiated bilateral build rather than common-carrier infrastructure.',
          technical:
            'Domestic firsts — dense-phase long-distance service, large-displacement booster pumps, centrifugal and reciprocating injection pumps — were all conquered on this line, and GB/T 46875 now standardises the inlet quality envelope.',
          environmental:
            'Pipeline substitution cut road risk, fuel use and corridor congestion at the demonstration site, but without network planning the system cannot yet aggregate dispersed capture into hub-scale flows.',
        },
        evolution: {
          clusters: [
            'China CO2 Transport',
            'Qilu-Shengli Demonstration',
            'Pipeline Standardisation',
          ],
          milestones: [
            {
              date: '2022-08-01',
              event:
                'The Qilu-Shengli Mt-class CCUS project started operation on road-tanker transport.',
            },
            {
              date: '2023-07-11',
              event:
                'The 109 km dense-phase CO2 pipeline commissioned: first 100-km/Mt/10-MPa-class line in China, up to 1.7 Mt/yr.',
            },
            {
              date: '2025-04-01',
              event:
                'Green-technology demonstration awards funded a long-distance CO2 pipeline project with six CCS projects — first programme-level transport commitments.',
            },
            {
              date: '2026-07-01',
              event:
                'GB/T 46875 pipeline CO2 quality standard takes effect, fixing the inlet envelope for future long-distance lines.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        title: '中国二氧化碳运输：运营管线与示范计划（2025）',
        description:
          '中国二氧化碳运输靠点对点示范设施运行，没有专门的管输、接入与管输费制度。标志是中石化齐鲁石化—胜利油田管线2023年7月11日投运：109公里（108.7公里）高压常温密相输送，设计压力12兆帕——首条百万吨规模、百公里距离、百公斤压力的二氧化碳管道——每年把齐鲁石化捕集的170万吨二氧化碳送往胜利油田驱油封存（70余口注入井，15年注入1000余万吨）。通管线前项目自2022年8月靠槽车公路运输（此后年减4万辆次）。研究展望（北理工）称碳中和需17000公里以上管网，现状是少量短距离小规模低压管线加槽车为主。GB/T 46875-2025（2026年7月实施）首次定下长输管道二氧化碳品质；2025年4月绿色低碳先进技术示范资助了一个长输管道项目加六个CCS项目——首批计划级管输投入。',
        scope:
          '中国陆上二氧化碳运输：运营中的密相示范管线、槽车基准、长输管道品质标准、已资助的管线示范，以及第三方接入与管输费规则的明确缺席。',
        tags: [
          '二氧化碳管道',
          '齐鲁胜利',
          '密相输送',
          '管道品质',
          '示范计划',
          '无接入制度',
        ],
        impactAnalysis: {
          economic:
            '齐鲁胜利线证明了百万吨级管输经济性（替代槽车、运输环节减碳0.4万吨），但缺失的管输费/接入制度使每条新线都是一单一议，而非公共承运设施。',
          technical:
            '长距离密相输送、大排量增压泵、离心与往复注入泵等国产首台套都在这条线上攻克，GB/T 46875此后统一了入管品质包络。',
          environmental:
            '管输替代在示范点削减了道路风险、燃料与廊道占用，但没有管网规划，系统尚不能把分散捕集聚成枢纽级流量。',
        },
        evolution: {
          clusters: ['中国二氧化碳运输', '齐鲁胜利示范', '管道标准化'],
          milestones: [
            {
              date: '2022-08-01',
              event: '齐鲁石化—胜利油田百万吨级CCUS项目投产，靠槽车公路运输。',
            },
            {
              date: '2023-07-11',
              event:
                '109公里密相二氧化碳管道投运：首条百万吨/百公里/百公斤级，年输170万吨。',
            },
            {
              date: '2025-04-01',
              event:
                '绿色低碳示范资助长输二氧化碳管道项目及六个CCS项目——首批计划级管输投入。',
            },
            {
              date: '2026-07-01',
              event:
                'GB/T 46875管道二氧化碳品质标准实施，锁定未来长输管线入管包络。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 65,
        label: 'Demo Funding Only',
        evidence:
          'Support runs through demonstration awards (April 2025: one long-distance pipeline plus six CCS projects) with no transport tariff, access revenue or operating subsidy instrument in existence.',
        citation: 'MOST green-technology demonstration awards (Apr 2025)',
      },
      statutory: {
        score: 60,
        label: 'No Transport Law',
        evidence:
          'No dedicated CO2 pipeline, shipping, third-party access or tariff statute exists; the line operates under project approvals while GB/T 46875 supplies only the technical quality envelope.',
        citation: 'GB/T 46875-2025 scope; project approvals record',
      },
      market: {
        score: 70,
        label: 'Bilateral Builds',
        evidence:
          'Each line is a negotiated bilateral asset (Sinopec source-to-sink integration); the BIT 17,000 km outlook and shared-corridor economics remain unrealised without common-carrier rules.',
        citation: 'BIT transport network outlook; Qilu-Shengli record',
      },
      strategic: {
        score: 80,
        label: 'First Trunk Proven',
        evidence:
          'The 109 km dense-phase trunk proves Mt-scale onshore transport technology domestically and anchors the 15th Five-Year Plan scale-up window flagged for around 2030.',
        citation:
          'Sinopec commissioning record (Jul 2023); GCCSI China review (2026)',
      },
      mrv: {
        score: 70,
        label: 'Metered Point Flow',
        evidence:
          'Metering exists at project custody points (1.7 Mt/yr design flow, injection-well accounting) with GB/T 46875 sampling and testing rules; network-level measurement standards await a trunk system.',
        citation: 'GB/T 46875-2025; Qilu-Shengli operating data',
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
    `INSERT INTO policies (id, country, year, status, category, review_status,
      legal_weight, source, url, pub_date, provenance_author,
      provenance_reviewer, provenance_last_audit_date)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
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
      `INSERT INTO policy_i18n (policy_id, lang, title, description, scope,
        tags_json, impact_analysis_json, interpretation, evolution_json,
        regulatory_json)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
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

export function applyCoveragePhase2A(db, { auditDate = AUDIT_DATE } = {}) {
  db.run('PRAGMA foreign_keys = ON');
  const frozenBefore = snapshotFrozenTables(db);
  db.run('BEGIN TRANSACTION');
  const inserted = [];
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

  for (const entry of NEW_POLICIES) {
    const localeCount = Number(
      scalar(db, 'SELECT COUNT(*) FROM policy_i18n WHERE policy_id = ?', [
        entry.core.id,
      ])
    );
    const analysisCount = Number(
      scalar(db, 'SELECT COUNT(*) FROM policy_analysis WHERE policy_id = ?', [
        entry.core.id,
      ])
    );
    if (localeCount !== 2)
      throw new Error(`Policy ${entry.core.id} lacks bilingual parity`);
    if (analysisCount !== 5)
      throw new Error(`Policy ${entry.core.id} lacks five analysis dimensions`);
  }

  return {
    migrationId: MIGRATION_ID,
    insertedPolicies: inserted,
    skippedPolicies: NEW_POLICIES.map((e) => e.core.id).filter(
      (id) => !inserted.includes(id)
    ),
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
    const summary = applyCoveragePhase2A(db);
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
    console.error(`Coverage phase 2A migration failed: ${error.message}`);
    process.exit(1);
  });
}

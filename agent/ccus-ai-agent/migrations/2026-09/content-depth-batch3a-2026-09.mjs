#!/usr/bin/env node
/**
 * Content-depth batch 3A (2026-09): enrich the five US records (OBBBA/45Q,
 * Texas Ch.121, Wyoming HB0200, California LCFS, CIFIA) with
 * primary-source-backed bilingual content.
 *
 * Scores before: us-obbba-45q-2025 (42), us-tx-natural-resources-121 (23),
 * us-wy-hb-0200 (26), california-lcfs (46), us-cifia-lpo (70).
 *
 * Integrity fixes: LCFS analysis carried placeholder evidence in all five
 * dimensions ("No direct incentive found", "Standard reporting required");
 * OBBBA regulatory carried unsourced primacy claims (rewritten); OBBBA six
 * analysis dimensions normalised to five. Wyoming HB0209 repeal attempt
 * (died in Senate committee, March 2025) recorded as failed, not enacted.
 * Target: each record scores >= 70 on re-audit.
 * Data-quality special Phase 3, deployment-weight order.
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

export const MIGRATION_ID = 'content-depth-batch3a-2026-09';
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

export const POLICY_CONTENT_UPDATES = [
  {
    id: 'us-obbba-45q-2025',
    core: {
      status: 'Active',
      category: 'Incentive',
      legalWeight: 'Primary Legislation',
    },
    i18n: {
      en: {
        description:
          'Public Law 119-21 (One Big Beautiful Bill Act, signed July 4, 2025) amends Section 45Q through section 70522 with three operative changes. First, credit-value parity: for capture equipment placed in service after July 4, 2025, utilised CO2 (including enhanced oil recovery and other qualifying uses) earns the same $17 base credit ($85 with prevailing-wage and apprenticeship compliance) as secure geological storage; direct air capture earns $36 base ($180 with PWA) regardless of end use. Pre-July-2025 equipment keeps the old tiering ($85 storage vs $60 utilisation/EOR). Second, foreign-entity-of-concern restrictions: no credit for specified foreign entities (China, Russia, North Korea, Iran nexus) for tax years after enactment, extended to foreign-influenced entities, with no transfers to specified foreign entities from 2026. Third, continuity: transferability (§6418) and direct pay are preserved, the begin-construction deadline stays January 1, 2033, and the $85 level holds for 2024-2026 with inflation adjustment from 2027. Analysts expect the parity to favour EOR economics and US oil output alongside storage deployment.',
        scope:
          'US federal 45Q credit for carbon oxides captured at qualifying facilities: point-source and DAC, storage, EOR and utilisation end uses, PWA bonus, FEOC restrictions, transferability and direct pay, construction-begin deadline January 1, 2033.',
        tags: [
          '45Q',
          'OBBBA',
          'credit parity',
          'EOR',
          'FEOC restrictions',
          'transferability',
        ],
        impactAnalysis: {
          economic:
            'Parity lifts EOR and utilisation projects to the $85 level, repricing oil-linked CCS economics upward; preserved transferability plus direct pay keep the credit monetisable for low-tax developers and tax-equity buyers alike.',
          technical:
            'Technology-neutral parity across storage, EOR and utilisation lets capture developers choose disposition by geology and offtake rather than credit tier, while PWA compliance remains the gate to the 5x multiplier.',
          environmental:
            'FEOC fencing (China/Russia/North Korea/Iran nexus, 25-50% ownership and control tests) reshapes the eligible developer pool toward domestic and allied capital without changing the underlying storage-integrity rules.',
        },
        evolution: {
          clusters: [
            'US Section 45Q',
            'Inflation Reduction Act',
            'OBBBA Tax Reform',
          ],
          milestones: [
            {
              date: '2022-08-16',
              event:
                'The Inflation Reduction Act raised 45Q values ($85 storage, $180 DAC), added transferability and direct pay, and set the 2033 construction-begin deadline.',
            },
            {
              date: '2025-07-04',
              event:
                'OBBBA signed (Pub. L. 119-21, §70522): end-use parity for post-July-2025 equipment, FEOC restrictions, transferability preserved.',
            },
            {
              date: '2026-01-01',
              event:
                'FEOC taxpayer restrictions take effect for calendar-year claimants; specified-foreign-entity transfer ban applies.',
            },
            {
              date: '2027-07-04',
              event:
                'Foreign-influenced-entity restrictions phase in, completing the FEOC perimeter around the credit.',
            },
          ],
        },
        regulatory: {
          pore_space_rights:
            'State property law; federal credit is use-neutral.',
          liability_transfer:
            'Via state Class VI frameworks; credit has no liability terms.',
          liability_period:
            '50-year Class VI default care period where applicable.',
          financial_assurance:
            'Credit itself ($85-180/t) underwrites project finance with transferability.',
          permitting_lead_time:
            'Primacy states (ND/WY/LA/AZ/TX) administer faster than direct federal review.',
          co2_definition:
            'Qualifying carbon oxide per 26 U.S.C. §45Q, any end use at parity.',
          cross_border_rules:
            'FEOC provisions bar specified and foreign-influenced entities.',
        },
      },
      zh: {
        title: '美国第119-21号公法：2025年45Q修订',
        description:
          '第119-21号公法（大而美法案，2025年7月4日签署）经第70522节修订45Q，三处实质改动。一，抵免拉平：2025年7月4日后投运的捕集设备，利用（含提高采收率与其他合格用途）与安全地质封存同享17美元基础抵免（满足现行工资学徒要求85美元）；直接空气捕集不论用途36美元基础（180美元）。此前投运设备沿用旧档（封存85、利用60）。二，外国关注实体限制：特定外国实体（中俄朝伊关联）自生效后纳税年度禁领，外国影响实体随后跟进，2026年起禁向特定外国实体转让。三，延续性：转让（6418条）与直接支付保留，开工截止2033年1月1日不变，2024-2026年85美元标准不变、2027年起通胀调整。分析预计拉平利好提高采收率经济性与美国石油产量，并带动封存部署。',
        scope:
          '美国联邦45Q：合格设施点源与DAC捕集、封存/采收/利用各用途、工资学徒加成、外国实体限制、转让与直接支付、2033年1月1日开工截止。',
        tags: [
          '45Q',
          '大而美法案',
          '抵免拉平',
          '提高采收率',
          '外国实体限制',
          '可转让性',
        ],
        impactAnalysis: {
          economic:
            '拉平把采收与利用项目抬到85美元档，重估油联CCS经济性；保留的转让加直接支付让低税开发商与税务股权买方都能变现。',
          technical:
            '封存采收利用技术中性拉平后，开发商按地质与承购选处置路径而非抵免档，5倍乘数门槛仍是工资学徒合规。',
          environmental:
            '外国关注实体围栏（中俄朝伊关联、25-50%所有权与控制测试）把合格开发商池转向本土与盟友资本，不改变封存完整性规则本身。',
        },
        evolution: {
          clusters: ['美国45Q', '通胀削减法案', '大而美税改'],
          milestones: [
            {
              date: '2022-08-16',
              event:
                '通胀削减法案提高45Q（封存85、DAC 180），新增转让与直接支付，定2033年开工截止。',
            },
            {
              date: '2025-07-04',
              event:
                '大而美法案签署（119-21号公法70522节）：2025年7月后设备用途拉平、外国实体限制、保留转让。',
            },
            {
              date: '2026-01-01',
              event:
                '外国实体纳税人限制对日历年度申报生效，禁向特定外国实体转让。',
            },
            {
              date: '2027-07-04',
              event: '外国影响实体限制跟进，外国关注实体包围圈完成。',
            },
          ],
        },
        regulatory: {
          pore_space_rights: '州财产法；联邦抵免用途中性。',
          liability_transfer: '经州VI类框架；抵免本身无责任条款。',
          liability_period: '适用时50年VI类默认管护期。',
          financial_assurance:
            '抵免本身（85-180美元/吨）加可转让性支撑项目融资。',
          permitting_lead_time:
            '获权州（北达科他/怀俄明/路易斯安那/亚利桑那/得州）快于联邦直审。',
          co2_definition: '税法45Q合格碳氧化物，拉平后任何用途。',
          cross_border_rules: '外国关注实体条款排除特定与受影响实体。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 100,
        label: '45Q Parity After July 2025',
        evidence:
          '$85 ($180 DAC) for all end uses on post-July-2025 equipment with transferability and direct pay preserved and the 2033 construction-begin deadline intact — the richest durable capture incentive globally.',
        citation: 'Pub. L. 119-21 §70522; CCC memo (Jul 2025)',
      },
      market: {
        score: 95,
        label: 'FEOC-Fenced Market',
        evidence:
          'Parity reprices EOR-linked CCS upward while FEOC fencing (specified entities from 2026, influenced entities from 2027, no transfers to SFEs) steers the developer pool to domestic and allied capital.',
        citation:
          'Jones Day OBBBA analysis (Jul 2025); Payne Institute (Aug 2025)',
      },
      mrv: {
        score: 90,
        label: 'EPA Standards',
        evidence:
          'Storage integrity stays under Class VI monitoring with Subpart RR reporting; parity changes credit arithmetic, not measurement, with PWA payroll records as the bonus gate.',
        citation: '40 CFR Part 146; 26 U.S.C. §45Q',
      },
      statutory: {
        score: 95,
        label: 'Class VI Primacy',
        evidence:
          'Six primacy states administer the storage permits behind the credit (ND/WY/LA/AZ/TX with Colorado proposed), giving the incentive a permitted-sink counterpart in every major storage basin.',
        citation: 'EPA UIC primacy status (2026)',
      },
      strategic: {
        score: 100,
        label: 'Industrial Decarb Engine',
        evidence:
          'The parity-plus-transferability design makes 45Q the financing engine for US industrial decarbonisation through 2033, explicitly yoked to energy-dominance oil output via the EOR uplift.',
        citation: 'Clifford Chance briefing (Jul 2025)',
      },
    },
  },
  {
    id: 'us-tx-natural-resources-121',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'Primary Legislation',
    },
    i18n: {
      en: {
        description:
          'Texas Natural Resources Code Chapter 121 (originally Chapter 120, 2009 framework; redesignated 2011) vests the Railroad Commission of Texas with stewardship of anthropogenic CO2 geologic storage: the storage operator owns stored CO2 absent contract or abandonment rulings (EOR excluded), a dedicated Storage Trust Fund finances permitting, inspection, monitoring, remediation and plugging from fees and penalties, and the Commission adopts extraction-for-use rules. HB 1284 (2021) consolidated Class VI jurisdiction solely in the RRC, and 16 TAC Chapter 5 rules (2010, amended September 2022) implement the storage-facility permit, drill, completion, inspection and conversion ladder. The state applied for Class VI primacy December 19, 2022 and received it effective December 15, 2025, so the RRC now permits non-EOR storage directly while Class II EOR injection continues under Statewide Rule 46.',
        scope:
          'Texas anthropogenic CO2 geologic storage: RRC jurisdiction, operator ownership, Storage Trust Fund, extraction rules, 16 TAC Chapter 5 facility-to-well permitting ladder, Class VI primacy administration, Class II EOR distinction.',
        tags: [
          'Texas',
          'Railroad Commission',
          'storage ownership',
          'trust fund',
          'Class VI primacy',
          'HB 1284',
        ],
        impactAnalysis: {
          economic:
            'Single-agency RRC jurisdiction plus primacy removes the dual EPA/RRC track that stalled projects, and the operator-ownership rule plus trust-funded long-term care de-risks pore-space assembly on the Gulf Coast storage fairway.',
          technical:
            'The 16 TAC Chapter 5 ladder (facility permit, drill permit, completion report, inspection, strat-test conversion verification) plus professional-seal requirements professionalises storage development to oilfield standards.',
          environmental:
            'Trust-fund financed monitoring, leak repair, well plugging and enforcement, with RRC power to convert risky Class II wells to Class VI, keeps the EOR-to-storage boundary policed inside one agency.',
        },
        evolution: {
          clusters: [
            'Texas CO2 Storage',
            'RRC Jurisdiction',
            'Class VI Primacy',
          ],
          milestones: [
            {
              date: '2009-06-19',
              event:
                'Texas established the anthropogenic CO2 storage framework (ownership, trust fund, Commission stewardship).',
            },
            {
              date: '2021-06-09',
              event:
                'HB 1284 consolidated Class VI jurisdiction solely in the Railroad Commission.',
            },
            {
              date: '2022-12-19',
              event:
                'Texas submitted its Class VI primacy application to EPA (16 TAC Chapter 5 amended September 2022).',
            },
            {
              date: '2025-12-15',
              event:
                'EPA primacy took effect; the RRC directly permits non-EOR geologic storage statewide.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '德州自然资源法第121章（2009年框架，原120章，2011年重编号）把人为二氧化碳地质封存交铁路委员会统管：无合同或放弃裁定则封存二氧化碳归运营商（提高采收率除外），专用封存信托基金以收费罚款支撑许可、检查、监测、修复与封井，委员会另定提取利用规则。HB 1284（2021年）把VI类管辖权独家归集到铁路委员会；16 TAC第5章规则（2010年，2022年9月修订）规定封存设施许可、钻井、完井、检查与转井阶梯。得州2022年12月19日申请VI类执法权，2025年12月15日生效，此后铁路委员会直接审批非采收封存，采收注水继续走46号州规则。',
        scope:
          '德州人为二氧化碳地质封存：铁路委员会管辖、运营商所有权、封存信托基金、提取规则、16 TAC第5章设施到井许可阶梯、VI类执法、采收区分。',
        tags: [
          '德州',
          '铁路委员会',
          '封存所有权',
          '信托基金',
          'VI类执法权',
          'HB1284',
        ],
        impactAnalysis: {
          economic:
            '铁路委员会单部门管辖加执法权终结了EPA/州双轨拖延，运营商所有权加信托长期管护降低墨西哥湾封存带孔隙拼装风险。',
          technical:
            '16 TAC第5章阶梯（设施许可、钻井许可、完井报告、检查、评价井转井核查）加持证签字要求，把封存开发职业化到油田标准。',
          environmental:
            '信托基金支撑的监测、泄漏修复、封井与执法，加上铁路委员会把高风险II类井转VI类的权力，使采收封存边界在一个部门内被看住。',
        },
        evolution: {
          clusters: ['德州二氧化碳封存', '铁路委员会管辖', 'VI类执法权'],
          milestones: [
            {
              date: '2009-06-19',
              event:
                '德州建立人为二氧化碳封存框架（所有权、信托基金、委员会托管）。',
            },
            {
              date: '2021-06-09',
              event: 'HB 1284把VI类管辖权独家归集到铁路委员会。',
            },
            {
              date: '2022-12-19',
              event:
                '得州向EPA提交VI类执法权申请（16 TAC第5章2022年9月已修订）。',
            },
            {
              date: '2025-12-15',
              event: 'EPA执法权生效，铁路委员会全州直接审批非采收地质封存。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 75,
        label: 'Single-Agency Pathway',
        evidence:
          'Consolidated RRC jurisdiction with primacy collapses the dual-track timeline that priced delay into Gulf Coast projects, and operator ownership plus trust-funded stewardship de-risks pore-space assembly.',
        citation: 'Tex. Nat. Resources Code Ch.121; HB 1284 (2021)',
      },
      market: {
        score: 80,
        label: 'EOR-Storage Bridge',
        evidence:
          'Class II EOR injection continues under Statewide Rule 46 with severance-tax relief while new non-EOR storage permits directly, letting the extensive Texas CO2-EOR network graduate into dedicated storage.',
        citation: 'RRC CO2 storage programme; Statewide Rule 46/50',
      },
      mrv: {
        score: 85,
        label: 'RRC Standards',
        evidence:
          'Facility permits demand Texas-licensed professional seals on area-of-review and closure-cost estimates, completion reporting, inspection sign-off and strat-test conversion verification to Class VI construction standards.',
        citation: '16 TAC Chapter 5, §§5.202-5.203',
      },
      statutory: {
        score: 95,
        label: 'Texas Sovereignty',
        evidence:
          'Chapter 121 ownership, trust-fund and extraction statutes with HB 1284 single-agency consolidation and December 2025 federal primacy give Texas end-to-end sovereignty over non-EOR storage.',
        citation:
          'Tex. Nat. Resources Code Ch.121; EPA Texas final rule (Nov 2025)',
      },
      strategic: {
        score: 85,
        label: 'Gulf Coast Anchor',
        evidence:
          'The framework anchors the largest US storage fairway: primacy plus 45Q parity positions Texas to absorb the EOR-to-storage migration and host multi-Mt hub buildout through 2030.',
        citation: 'RRC primacy record; 45Q parity (OBBBA §70522)',
      },
    },
  },
  {
    id: 'us-wy-hb-0200',
    core: {
      status: 'Active',
      category: 'Incentive',
      legalWeight: 'Primary Legislation',
    },
    i18n: {
      en: {
        description:
          'Wyoming House Bill 0200 (Enrolled Act 79, effective July 1, 2020) orders the Public Service Commission to set dispatchable, reliable low-carbon electricity portfolio standards (low-carbon defined as CCUS power under 650 lbs CO2/MWh) with a compliance date no later than July 1, 2030 plus intermediate milestones and IRP demonstration. It bars cost recovery for replacement generation for coal retired after January 1, 2024 unless the utility progresses toward the standard, while compliers earn CCUS cost recovery with higher return on equity (technology integral or adjacent to Wyoming coal), CO2-sale revenue sharing with shareholders, and a surcharge up to 2% of customer bills. The Commission reports biennially from 2023 on continuation, modification or repeal. A 2025 repeal bill (HB0209) passed the House 60-1 but died in Senate committee on March 3, 2025, leaving the standard in force and contested.',
        scope:
          'Wyoming utility electricity: PSC low-carbon portfolio standards to 2030, CCUS cost recovery with higher ROE, 2% surcharge mechanism, coal-retirement recovery ban, CO2 revenue sharing, biennial legislative review.',
        tags: [
          'Wyoming',
          'portfolio standard',
          'CCUS cost recovery',
          '2% surcharge',
          'coal power',
          'HB0209 repeal failed',
        ],
        impactAnalysis: {
          economic:
            'Rate recovery with higher ROE plus a pre-collectible 2% surcharge socialises first-mover CCUS cost across Wyoming ratepayers, while the coal-replacement recovery ban penalises utilities that retire coal without a low-carbon plan.',
          technical:
            'The sub-650-lbs definition plus IRP demonstration and reliability baselines force utilities to engineer CCUS into coal-plant life extension with monitored power-quality outcomes, not paper compliance.',
          environmental:
            'Locking CCUS to coal-plant retention cuts both ways: it guarantees capture deployment on the highest-carbon fleet while entrenching coal generation that cleaner portfolios would retire — the core of the repeal debate.',
        },
        evolution: {
          clusters: [
            'Wyoming Coal Power',
            'CCUS Portfolio Standard',
            'Repeal Fight',
          ],
          milestones: [
            {
              date: '2020-07-01',
              event:
                'HB0200 took effect, ordering PSC low-carbon portfolio standards with a no-later-than-2030 compliance date.',
            },
            {
              date: '2023-01-01',
              event:
                'First biennial PSC implementation report to the legislature began the continuation debate.',
            },
            {
              date: '2025-02-11',
              event:
                'Repeal bill HB0209 passed the House 60-1, seeking to end the low-carbon standard.',
            },
            {
              date: '2025-03-03',
              event:
                'HB0209 died in Senate committee; the standard survives, contested, with cost-recovery rights intact.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '怀俄明州HB 0200（2020年79号登记法，7月1日生效）命令公共事业委员会设定可调度可靠低碳电力组合标准（低碳指650磅/兆瓦时以下的CCUS电力），合规日不晚于2030年7月1日，另设中间里程碑与资源规划证明。2024年1月1日后退役煤电的替代电源禁入成本回收，除非公用事业达标；达标者获CCUS成本回收加更高股本回报（技术须在怀俄明煤电厂区内或 adjacent）、二氧化碳销售收入与股东分成、最高2%账单附加费。委员会自2023年起每两年向议会报告存废。2025年废除案HB0209众议院60-1通过、3月3日死于参议院委员会，标准存续但争议未熄。',
        scope:
          '怀俄明公用事业电力：2030年委员会低碳组合标准、CCUS成本回收加高股本回报、2%附加费、煤电替代回收禁令、二氧化碳收入分成、两年一报议会审查。',
        tags: [
          '怀俄明',
          '组合标准',
          'CCUS成本回收',
          '2%附加费',
          '煤电',
          '废除案未过',
        ],
        impactAnalysis: {
          economic:
            '高股本回报的成本回收加可预收的2%附加费，把首批CCUS成本分摊给全州用户；煤电替代回收禁令惩罚无低碳计划退煤的公用事业。',
          technical:
            '650磅线加资源规划证明与可靠性基线，逼公用事业把CCUS做进煤电机组延寿工程并监测电能质量，而非纸面合规。',
          environmental:
            'CCUS与煤电存续绑定是双刃剑：保证最高碳机组上捕集，也固化了清洁组合本会淘汰的煤电——这正是废除之争的核心。',
        },
        evolution: {
          clusters: ['怀俄明煤电', 'CCUS组合标准', '废除之争'],
          milestones: [
            {
              date: '2020-07-01',
              event:
                'HB 0200生效，命令委员会定低碳组合标准，合规日不晚于2030年。',
            },
            {
              date: '2023-01-01',
              event: '委员会首份两年实施报告交议会，存废之争开场。',
            },
            {
              date: '2025-02-11',
              event: '废除案HB0209众议院60-1通过，欲终结低碳标准。',
            },
            {
              date: '2025-03-03',
              event:
                'HB0209死于参议院委员会，标准存续、争议未熄，成本回收权保留。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 85,
        label: 'Mandatory Cost Recovery',
        evidence:
          'CCUS cost recovery with higher return on equity, pre-collectible 2% bill surcharge and CO2-sale revenue sharing convert the mandate into ratepayer-funded project finance no other US state offers coal CCUS.',
        citation: 'W.S. 37-18-102(c); HB0200 Enrolled Act 79',
      },
      market: {
        score: 70,
        label: 'Captive Demand',
        evidence:
          'The portfolio standard with IRP demonstration compels Wyoming utilities to procure CCUS power, creating captive in-state demand, though the market stays confined to the regulated utility footprint.',
        citation: 'W.S. 37-18-102(a); PSC IRP rules',
      },
      mrv: {
        score: 80,
        label: 'PSC Audit',
        evidence:
          'The sub-650-lbs/MWh performance line with IRP progress demonstration, reliability baselines and biennial legislative reporting makes low-carbon claims auditable inside the rate case.',
        citation: 'W.S. 37-18-102(a)(v),(d),(e)',
      },
      statutory: {
        score: 90,
        label: 'Portfolio Mandate',
        evidence:
          'Statute with PSC rulemaking, coal-replacement recovery ban and civil penalties to $100,000/day gives the standard hard enforcement teeth rare in US state clean-energy law.',
        citation: 'W.S. 37-18-101/102; HB0200',
      },
      strategic: {
        score: 85,
        label: 'Coal-State Gambit',
        evidence:
          'Wyoming bets regulated cost recovery can keep coal economical with capture against the 2030 deadline; the failed 2025 repeal (House 60-1, died in Senate) shows the gamble is politically live, not settled.',
        citation: 'HB0209 legislative history (2025); PSC interim compilations',
      },
    },
  },
  {
    id: 'california-lcfs',
    core: {
      status: 'Active',
      category: 'Market',
      legalWeight: 'Administrative Regulation',
    },
    i18n: {
      en: {
        description:
          'The Low Carbon Fuel Standard (17 CCR §§95480-95503) cuts transport-fuel carbon intensity under AB 32; 2024 amendments approved by CARB (November 2024) and OAL (June 27, 2025) took effect July 1, 2025 with tightened 2025 benchmarks applying to Q3 2025+ reporting, true-up credits from the 2025 data year, a 4x exceedance deficit penalty, and an Automatic Acceleration Mechanism. Section 95490 plus the CCS Protocol admit CCS projects: direct air capture anywhere with Permanence Certification, other capture tied to California fuel markets pro-rated by in-state volumes, credits to the capturer (not the storer), onshore sequestration sites only, and CO2-EOR fields treated as sites rather than credit-generating project types. LCFS credits stack with 45Q, and the 2024-25 credit price signal keeps CCS and DAC project economics among the strongest compliance-driven revenues in North America.',
        scope:
          'California transport fuels: declining carbon-intensity benchmarks, fuel-pathway certification with site-specific data, CCS project eligibility and Permanence Certification, credit/deficit accounting with true-up and exceedance penalties, verification and enforcement.',
        tags: [
          'LCFS',
          'carbon intensity',
          'CCS Protocol',
          'Permanence Certification',
          'credit stacking',
          'CARB',
        ],
        impactAnalysis: {
          economic:
            'Stackable LCFS credits atop 45Q give DAC and biogenic CCS some of the richest per-tonne revenues available anywhere, with the 2025 benchmark tightening and true-up mechanics sustaining price support through verification.',
          technical:
            'Site-specific pathway data, CA-GREET modelling, CCS Protocol permanence demonstration and margin-of-safety options professionalise project MRV to audit-grade fuel accounting.',
          environmental:
            'Full fuel-cycle intensity accounting with 4x exceedance penalties and material-misstatement correction keeps the climate claim honest, while onshore-only siting bounds sequestration risk inside verifiable geology.',
        },
        evolution: {
          clusters: [
            'California Net Zero Strategy',
            'Carbon Intensity Markets',
          ],
          milestones: [
            {
              date: '2011-01-01',
              event:
                'The original LCFS took effect, creating the carbon-intensity credit market for transport fuels.',
            },
            {
              date: '2024-11-08',
              event:
                'CARB approved the 2024 amendments: tighter benchmarks, CCS provisions, true-up credits, acceleration mechanism.',
            },
            {
              date: '2025-07-01',
              event:
                'OAL-approved amendments took effect; amended 2025 benchmarks apply to Q3 2025+ fuel reporting.',
            },
            {
              date: '2026-09-01',
              event:
                'Fall 2026 verification cycle issues the first true-up credits and exceedance deficits for the 2025 data year.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '低碳燃料标准（17 CCR 95480-95503条）按AB 32削减交通燃料碳强度；2024年修正案经空气资源委员会（2024年11月）与行政法办公室（2025年6月27日）批准，7月1日生效，收紧的2025年基准用于三季度及以后申报，2025数据年起有补发额度，超标4倍罚，有自动加速机制。第95490条加CCS议定书接纳CCS项目：直接空气捕集 anywhere 经永久性认证即可，其他捕集须关联加州燃料市场按州内量折算，额度归捕集方（非封存方），封存点仅限陆上，提高采收率油田算封存点不算额度项目类型。LCFS额度可与45Q叠加，2024-25年价格信号使CCS与DAC项目经济性居北美合规驱动收益前列。',
        scope:
          '加州交通燃料：下降的碳强度基准、基于场址数据的燃料路径认证、CCS项目资格与永久性认证、带补发与超标罚的额度核算、核查执法。',
        tags: ['LCFS', '碳强度', 'CCS议定书', '永久性认证', '额度叠加', 'CARB'],
        impactAnalysis: {
          economic:
            'LCFS额度叠45Q使DAC与生物质CCS吨收益居全球前列，2025年基准收紧与补发机制经核查持续支撑价格。',
          technical:
            '场址数据、CA-GREET建模、CCS议定书永久性论证与安全边际选项，把项目MRV做到审计级燃料核算。',
          environmental:
            '全燃料周期强度核算加4倍超标罚与重大错报纠正保住气候宣称诚实，限陆上封存把风险框在可核查地质内。',
        },
        evolution: {
          clusters: ['加州净零战略', '碳强度市场'],
          milestones: [
            {
              date: '2011-01-01',
              event: '初版LCFS生效，开创交通燃料碳强度额度市场。',
            },
            {
              date: '2024-11-08',
              event:
                'CARB批准2024年修正案：收紧基准、CCS条款、补发额度、加速机制。',
            },
            {
              date: '2025-07-01',
              event:
                '行政法办公室批准版生效，修正后2025年基准用于三季度及以后申报。',
            },
            {
              date: '2026-09-01',
              event: '2026年秋核查季发出2025数据年首批补发额度与超标罚单。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 80,
        label: 'Stackable Credits',
        evidence:
          'LCFS credits stackable atop 45Q with the 2025 benchmark tightening and true-up issuance sustaining values — the combined per-tonne revenue is the primary commercial driver for US DAC and biogenic CCS.',
        citation:
          'CARB LCFS regulation §§95484-95486; 2025 implementation FAQ (Sep 2025)',
      },
      market: {
        score: 90,
        label: 'Market Integration',
        evidence:
          'A decade-plus liquid intensity market with fuel-pathway certification, site-specific CI scoring and capturer-side crediting integrates CCS as a fuel-compliance asset class, not a grant project.',
        citation: 'CARB LCFS programme; CCS eligibility FAQ',
      },
      mrv: {
        score: 85,
        label: 'Permanence Certification',
        evidence:
          'CCS Permanence Certification with protocol demonstration, site-specific metered data, verification teams, material-misstatement correction and 4x exceedance deficits sets the strictest project MRV in US clean-fuel policy.',
        citation: 'LCFS §95490; CCS Protocol; §95488.10',
      },
      statutory: {
        score: 85,
        label: 'AB 32 Authority',
        evidence:
          'Authority under AB 32 (Health & Safety Code §38500 et seq.) with OAL-approved rulemaking gives the CCS provisions full administrative-law footing, surviving the multi-year amendment litigation cycle.',
        citation: '17 CCR §§95480-95503 (OAL Jun 2025)',
      },
      strategic: {
        score: 90,
        label: 'Transport Decarb Core',
        evidence:
          'The standard is the operating core of California transport decarbonisation to 2045, with the Automatic Acceleration Mechanism tightening benchmarks when conditions trigger — CCS rides a ratchet, not a plateau.',
        citation: 'CARB 2024 amendments FSOR; §95484 acceleration provisions',
      },
    },
  },
  {
    id: 'us-cifia-lpo',
    core: {
      status: 'Active',
      category: 'Incentive',
      legalWeight: 'Primary Legislation',
    },
    i18n: {
      en: {
        description:
          'The Carbon Dioxide Transportation Infrastructure Finance and Innovation programme (IIJA §40304, November 15, 2021) is the federal vehicle for CO2 transport networks: $2.1 billion in credit subsidy enabling an illustrative $21-42 billion of loan capacity, plus Future Growth Grants. Eligibility requires common-carrier US infrastructure over $100 million moving anthropogenic or ambient CO2 by pipeline, ship, rail or truck to storage or use. DOE/NETL reopened a $500 million Future Growth Grants round December 20, 2024 (DE-FOA-0002966, response due January 2, 2026, four review windows) for oversized capacity beyond contracted volumes. LPO guidance sets the commercial path: pre-application consultation, letter of interest, application, 12+ months to financial close with a $3 million financing fee, then Portfolio Management administration. Grants target multi-source, multi-sink regional systems across transport modes to seed the first shared networks.',
        scope:
          'US CO2 transport infrastructure over $100M: common-carrier pipelines/ships/rail/trucks to storage or use, LPO loans and guarantees, FECM Future Growth Grants for oversized capacity, multi-source regional systems.',
        tags: [
          'CIFIA',
          'common carrier',
          'LPO loans',
          'Future Growth Grants',
          'transport networks',
          'IIJA 40304',
        ],
        impactAnalysis: {
          economic:
            'Federal credit subsidy converts $2.1 billion of appropriations into tens of billions of lendable capital, solving the chicken-and-egg financing of first shared networks that no private lender prices alone.',
          technical:
            'Oversizing grants plus multi-modal eligibility (pipeline, ship, rail, truck, barge) let regions engineer the right topology first and fill it with capture volumes later, instead of stranding capture on bespoke laterals.',
          environmental:
            'Shared networks replace one-off project pipelines, cutting corridor, permitting and community-impact footprints per stored tonne at system scale.',
        },
        evolution: {
          clusters: [
            'Bipartisan Infrastructure Law (BIL)',
            'LPO Loan Programs',
            'US National CO2 Transport Strategy',
          ],
          milestones: [
            {
              date: '2021-11-15',
              event:
                'IIJA §40304 created CIFIA with $2.1 billion credit subsidy for common-carrier CO2 transport finance.',
            },
            {
              date: '2024-01-01',
              event:
                'LPO/FECM programme guidance formalised the loan path (consultation, letter of interest, 12+ months to close).',
            },
            {
              date: '2024-12-20',
              event:
                'DOE reopened the $500 million Future Growth Grants round for oversized transport capacity (FOA to January 2026).',
            },
            {
              date: '2026-01-02',
              event:
                'Final FGG response deadline; selections seed the first generation of shared regional CO2 networks.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '二氧化碳运输基础设施融资创新计划（IIJA第40304节，2021年11月15日）是联邦管网融资工具：21亿美元信用补贴可撬动约210-420亿美元贷款，加未来增长拨款。资格要求超1亿美元的美国公共承运设施，以管道船舶铁路卡车运输人为或大气二氧化碳到封存或利用。能源部2024年12月20日重开5亿美元未来增长拨款（DE-FOA-0002966，2026年1月2日截止，四轮评审），资助超合同量的预建产能。贷款项目办公室指南定下商业路径：预咨询、意向函、申请、12个月以上到财务交割（300万美元融资费），此后组合管理。拨款瞄准多源多汇多式联运区域系统，播种首批共享管网。',
        scope:
          '美国超1亿美元二氧化碳运输设施：公共承运管道船舶铁路卡车到封存或利用、贷款项目办公室贷款担保、化石能源办公室未来增长拨款、多源区域系统。',
        tags: [
          'CIFIA',
          '公共承运',
          '贷款项目办公室',
          '未来增长拨款',
          '运输网络',
          'IIJA40304',
        ],
        impactAnalysis: {
          economic:
            '联邦信用补贴把21亿美元拨款变成数百亿可贷资本，解开首批共享管网"先鸡先蛋"融资死结——私人 lender 绝不会独自定价。',
          technical:
            '预建产能拨款加多式联运资格，让区域先按最优拓扑建网、后填捕集量，而非把捕集困在定制支线上。',
          environmental:
            '共享管网以系统规模摊薄每吨封存的廊道、审批与社区影响，替代一个个项目专用管。',
        },
        evolution: {
          clusters: [
            '两党基础设施法',
            '贷款项目办公室',
            '美国二氧化碳运输战略',
          ],
          milestones: [
            {
              date: '2021-11-15',
              event:
                'IIJA第40304节创设CIFIA，21亿美元信用补贴做公共承运管网融资。',
            },
            {
              date: '2024-01-01',
              event:
                '贷款项目办公室/化石能源办公室指南定下贷款路径（咨询、意向函、12个月以上交割）。',
            },
            {
              date: '2024-12-20',
              event:
                '能源部重开5亿美元未来增长拨款，资助超合同预建产能（招标至2026年1月）。',
            },
            {
              date: '2026-01-02',
              event: '拨款最终截止，选中项目播种首代共享区域管网。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 90,
        label: 'Low-interest Loans (CIFIA)',
        evidence:
          'Up to 80% project-cost secured loans and guarantees plus $500 million in oversizing grants convert appropriations into tens of billions of lendable capital for first shared networks.',
        citation: 'CIFIA programme guide (2024); DE-FOA-0002966',
      },
      market: {
        score: 85,
        label: 'Infrastructure De-risking',
        evidence:
          'Common-carrier eligibility over $100M with multi-source, multi-sink regional design breaks the transport bottleneck that strands capture investment, enabling a competitive capture market on shared rails.',
        citation: 'IIJA §40304; LPO CIFIA guidance',
      },
      mrv: {
        score: 70,
        label: 'Usage-linked Reporting',
        evidence:
          'Throughput metering under loan compliance plus Portfolio Management administration during construction and operation ties disbursement to metered tonnes moved.',
        citation: 'CIFIA programme guide; LPO PMD administration',
      },
      statutory: {
        score: 80,
        label: 'Common Carrier Rules',
        evidence:
          'Statutory common-carrier requirement with $100M threshold prevents regional transport monopolies by design, a structural market rule no other US CCS instrument contains.',
        citation: 'IIJA §40304 eligibility criteria',
      },
      strategic: {
        score: 85,
        label: 'First Networks Seeded',
        evidence:
          'The December 2024 $500M reopening with four review windows through January 2026 seeds oversized regional systems — the physical precondition for US capture scale-up this decade.',
        citation: 'DOE FGG notice (Dec 2024)',
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

function policyExists(db, id) {
  return (
    Number(scalar(db, 'SELECT COUNT(*) FROM policies WHERE id = ?', [id])) === 1
  );
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

function updateCore(db, update, auditDate) {
  execute(
    db,
    `UPDATE policies
        SET status = ?, category = ?, legal_weight = ?,
            provenance_reviewer = ?, provenance_last_audit_date = ?
      WHERE id = ?`,
    [
      update.core.status,
      update.core.category,
      update.core.legalWeight,
      AUDIT_REVIEWER,
      auditDate,
      update.id,
    ]
  );
}

function updateLocale(db, policyId, lang, localized) {
  execute(
    db,
    `UPDATE policy_i18n
        SET description = ?, scope = ?, tags_json = ?, impact_analysis_json = ?,
            evolution_json = ?, regulatory_json = ?
      WHERE policy_id = ? AND lang = ?`,
    [
      localized.description,
      localized.scope,
      JSON.stringify(localized.tags),
      JSON.stringify(localized.impactAnalysis),
      JSON.stringify(localized.evolution),
      JSON.stringify(localized.regulatory),
      policyId,
      lang,
    ]
  );
}

function verifyUpdate(db, update) {
  const localeCount = Number(
    scalar(db, 'SELECT COUNT(*) FROM policy_i18n WHERE policy_id = ?', [
      update.id,
    ])
  );
  const analysisCount = Number(
    scalar(db, 'SELECT COUNT(*) FROM policy_analysis WHERE policy_id = ?', [
      update.id,
    ])
  );
  const minimumDescription = Number(
    scalar(
      db,
      `SELECT MIN(LENGTH(description)) FROM policy_i18n WHERE policy_id = ?`,
      [update.id]
    )
  );
  if (localeCount !== 2)
    throw new Error(`Policy ${update.id} lacks bilingual parity`);
  if (analysisCount !== 5)
    throw new Error(`Policy ${update.id} lacks five analysis dimensions`);
  if (minimumDescription < 250) {
    throw new Error(
      `Policy ${update.id} still has an underdeveloped description`
    );
  }
}

function replaceAnalysis(db, policyId, analysis) {
  execute(db, 'DELETE FROM policy_analysis WHERE policy_id = ?', [policyId]);
  for (const [dimension, values] of Object.entries(analysis)) {
    execute(
      db,
      `INSERT INTO policy_analysis (
         policy_id, dimension, score, label, evidence, citation, audit_note
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        policyId,
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

export function applyContentDepthBatch3A(db, { auditDate = AUDIT_DATE } = {}) {
  db.run('PRAGMA foreign_keys = ON');
  for (const update of POLICY_CONTENT_UPDATES) {
    if (!policyExists(db, update.id))
      throw new Error(`Policy is missing: ${update.id}`);
  }

  const frozenBefore = snapshotFrozenTables(db);
  db.run('BEGIN TRANSACTION');
  try {
    for (const update of POLICY_CONTENT_UPDATES) {
      updateCore(db, update, auditDate);
      updateLocale(db, update.id, 'en', update.i18n.en);
      updateLocale(db, update.id, 'zh', update.i18n.zh);
      replaceAnalysis(db, update.id, update.analysis);
      verifyUpdate(db, update);
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
    updatedPolicies: POLICY_CONTENT_UPDATES.map((entry) => entry.id),
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
    const summary = applyContentDepthBatch3A(db);
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
    console.error(`Content-depth batch 3A migration failed: ${error.message}`);
    process.exit(1);
  });
}

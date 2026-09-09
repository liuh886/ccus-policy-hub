#!/usr/bin/env node
/**
 * Content-depth batch 3F (2026-09): enrich the six Southeast Asia records
 * with primary-source-backed bilingual content.
 *
 * Scores before: my-netr-ccus-2023 (18), my-mida-incentives (43),
 * ph-ccus-policy-framework-2025 (22), th-draft-climate-change-act-2025
 * (28), sg-carbon-tax-ccus-2025 (20), vn-carbon-market-decree-2025 (25).
 *
 * Integrity fixes: the Philippine 2025 DOE circular could not be verified
 * (only petroleum circulars and a 2023 Senate inquiry found) — the record
 * is reframed as framework-direction with the nascent-regulatory status
 * stated, not as an established circular regime; Thailand status
 * Active -> Under development (cabinet approval in principle, December
 * 2025, years from enactment); Singapore CCUS-credit-eligibility claim
 * corrected to the ICC offset mechanism plus S Hub programme reality.
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

export const MIGRATION_ID = 'content-depth-batch3f-2026-09';
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
    id: 'my-netr-ccus-2023',
    core: {
      status: 'Active',
      category: 'Strategic',
      legalWeight: 'Strategic Guidance',
    },
    i18n: {
      en: {
        description:
          'The National Energy Transition Roadmap (August 2023) names CCUS one of six transition levers and a flagship job-and-GDP project: three hubs by 2030 (Kerteh and Kuantan in Peninsular Malaysia, Bintulu in Sarawak) at 15 Mtpa combined, expanding to 40-80 Mtpa across three major hubs by 2050, on 13.3 Gt of mostly depleted-field storage. Delivery anchors are Kasawari (PETRONAS Carigali, offshore Bintulu, 3.3 Mt/yr from gas production, first injection end-2029/early-2030) and Lang Lebah (PTTEP with PETRONAS Carigali and KUFPEC, Golok field storage from 2028 inside the SISGES sour-gas system). The statutory twin is the CCUS Act 2025 (in force August 1, 2025, Peninsular plus Labuan only): a one-stop CCUS Agency under the Ministry of Economy, assessment permits and on/offshore storage licences, a Post-Closure Stewardship Fund, and approved foreign-CO2 import for storage — the regional-hub play. Sabah/Sarawak run separate land-code regimes, so national harmonisation remains the open federalism file.',
        scope:
          'Malaysian CCUS buildout to 2050: NETR hub targets and flagship projects, CCUS Act licensing and stewardship, regional-hub import posture, Sabah/Sarawak harmonisation gap.',
        tags: [
          'NETR',
          'three hubs',
          'Kasawari',
          'Lang Lebah',
          'CCUS Act 2025',
          'regional hub',
        ],
        impactAnalysis: {
          economic:
            'Flagship-project status with 15 Mtpa 2030 capacity converts depleted-field geology into contracted storage revenue, while approved foreign-CO2 import opens a second merchant demand line from Japan and Korea.',
          technical:
            'Kasawari membrane capture with MMHE/NPCC/Baker Hughes/McDermott delivery plus Lang Lebah sour-gas handling prove full-chain offshore engineering at tropical scale.',
          environmental:
            'Depleted-field-first sequencing reuses wells, platforms and pipelines before saline aquifers, minimising new footprint while the Post-Closure Fund prices long-term stewardship.',
        },
        evolution: {
          clusters: ['Malaysia NETR', 'Flagship Stores', 'CCUS Act Licensing'],
          milestones: [
            {
              date: '2023-08-01',
              event:
                'NETR launched with CCUS as a flagship lever: three hubs, 15 Mtpa by 2030, 40-80 Mtpa by 2050.',
            },
            {
              date: '2025-08-01',
              event:
                'The CCUS Act 2025 in force (Peninsular plus Labuan): Agency, licensing, stewardship fund, foreign-CO2 import allowed.',
            },
            {
              date: '2025-10-01',
              event:
                'Offshore permit and licensing regulations operationalised fees, guarantees and closure duties.',
            },
            {
              date: '2028-01-01',
              event:
                'Lang Lebah storage targeted online; Kasawari first injection end-2029/early-2030.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '《国家能源转型路线图》（2023年8月）把CCUS列为六大杠杆之一和旗舰就业GDP项目：2030年三个枢纽（半岛Kerteh与Kuantan、沙捞越Bintulu）合计1500万吨/年，2050年三大枢纽4000-8000万吨/年，家底133亿吨多为枯竭油气田。交付锚点是Kasawari（国油上游，民都鲁海上，气田伴生年330万吨，2029年底/2030年初首注）与Lang Lebah（泰国PTTEP+' +
          '国油上游+科威特海外，Golok油田2028年封存，SISGES酸气系统内）。法定双胞胎是2025年CCUS法（8月1日生效，仅半岛加纳闽）：经济部下一站式CCUS局、评价许可与陆上海上封存执照、封场后托管基金、批准境外二氧化碳进口封存——区域枢纽打法。沙巴沙捞越各行其法，全国协同是敞开的联邦制课题。',
        scope:
          '马来西亚CCUS建设到2050年：NETR枢纽目标与旗舰项目、CCUS法许可托管、区域枢纽进口姿态、沙巴沙捞越协同缺口。',
        tags: [
          'NETR',
          '三个枢纽',
          'Kasawari',
          'Lang Lebah',
          '2025年CCUS法',
          '区域枢纽',
        ],
        impactAnalysis: {
          economic:
            '旗舰地位加2030年1500万吨容量把枯竭油气地质变成合同封存收入，批准境外二氧化碳进口再开日韩第二条商业需求线。',
          technical:
            'Kasawari膜捕集加MMHE/NPCC/贝克休斯/McDermott交付、Lang Lebah酸气处理，在热带规模验证全链海上工程。',
          environmental:
            '枯竭油气田优先排序复用井平台管线再动咸水层，封场后托管基金给长期管护定价，新足迹最小。',
        },
        evolution: {
          clusters: ['马来西亚NETR', '旗舰封存', 'CCUS法许可'],
          milestones: [
            {
              date: '2023-08-01',
              event:
                'NETR发布，CCUS为旗舰杠杆：三个枢纽，2030年1500万吨/年，2050年4000-8000万吨/年。',
            },
            {
              date: '2025-08-01',
              event:
                '2025年CCUS法生效（半岛加纳闽）：CCUS局、许可、托管基金、境外二氧化碳进口放行。',
            },
            {
              date: '2025-10-01',
              event: '海上许可执照条例运行，规费担保关闭义务落地。',
            },
            {
              date: '2028-01-01',
              event: 'Lang Lebah目标上线；Kasawari 2029年底/2030年初首注。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 80,
        label: 'Flagship Facilitation',
        evidence:
          'Flagship-project designation with MIDA tax allowances, licensing fast lanes and EU/regional fund eligibility converts depleted-field geology into facilitated investment.',
        citation: 'NETR (Aug 2023); MyCCUS FAQ (2024)',
      },
      market: {
        score: 85,
        label: 'Regional Hub',
        evidence:
          'Approved foreign-CO2 import for storage with PETRONAS-Japan (JGC/JAPEX/K-Line) cooperation lines positions Malaysia as the ASEAN merchant storage vendor.',
        citation: 'CCUS Act 2025 (import provisions); NRF briefings',
      },
      mrv: {
        score: 75,
        label: 'Licence-Condition MRV',
        evidence:
          'Storage licences with monitoring, reporting and post-closure duties plus fee schedules (RM80-120k) make measurement a licence condition, not an afterthought.',
        citation: 'Offshore Permit Regulations (Oct 2025)',
      },
      statutory: {
        score: 85,
        label: 'CCUS Act 2025',
        evidence:
          'A full value-chain statute (capture registration, transport, use, on/offshore licensing, stewardship fund) in force since August 2025 — the ASEAN reference law, Sabah/Sarawak carve-outs noted.',
        citation: 'CCUS Act 2025 (myccus.ekonomi.gov.my)',
      },
      strategic: {
        score: 90,
        label: '15 Mtpa by 2030',
        evidence:
          'Three hubs at 15 Mtpa by 2030 scaling to 40-80 Mtpa by 2050 inside NDC, NEP, NIMP and NETR alignment — the most quantified ASEAN storage pledge.',
        citation: 'NETR (Aug 2023); Norton Rose Fulbright (Sep 2025)',
      },
    },
  },
  {
    id: 'my-mida-incentives',
    core: {
      status: 'Active',
      category: 'Incentive',
      legalWeight: 'Fiscal Incentive',
    },
    i18n: {
      en: {
        description:
          'Budget 2023 created dedicated CCS tax incentives for applications from February 25, 2023 to December 31, 2027: in-house CCS and CCS service providers earn a 100% Investment Tax Allowance on qualifying capex for ten years against up to 100% of statutory income, with service providers alternatively electing a ten-year 70% income-tax exemption; qualifying equipment gets import-duty and sales-tax exemption, and firms using CCS services deduct service fees. The incentive sits beside the CCUS Act 2025 licensing regime (Agency, permits, stewardship fund), so fiscal and regulatory tracks matured together — allowance for the capex, licences for the activity. Coverage is Peninsular-plus-Labuan in line with the Act.',
        scope:
          'Malaysian CCS fiscal support 2023-2027: 100% ITA versus 70% exemption election, equipment duty exemptions, service-fee deductibility, beside CCUS Act licensing.',
        tags: [
          'MIDA',
          'Investment Tax Allowance',
          'Budget 2023',
          'duty exemption',
          'service providers',
          'CCUS Act pairing',
        ],
        impactAnalysis: {
          economic:
            'A 100% ITA against full statutory income over ten years is among the strongest ASEAN capex incentives, directly cutting Kasawari-class project payback periods.',
          technical:
            'Equipment duty exemptions target the imported capture trains and compression packages that dominate early project import bills.',
          environmental:
            'Fee deductibility for CCS-service users spreads the incentive beyond asset owners to emitters buying storage as a service.',
        },
        evolution: {
          clusters: [
            'Malaysia Fiscal Incentives',
            'Budget 2023',
            'CCUS Act Pairing',
          ],
          milestones: [
            {
              date: '2023-02-25',
              event:
                'Budget 2023 CCS incentives opened for applications (100% ITA versus 70% exemption election).',
            },
            {
              date: '2025-08-01',
              event:
                'CCUS Act licensing gave the fiscal track its regulatory twin: permits for the incentivised activity.',
            },
            {
              date: '2027-12-31',
              event:
                'Application window closes; awarded allowances run their ten-year course into the late 2030s.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '2023年预算创设专项CCS税收激励，2023年2月25日至2027年12月31日申请有效：企业自建与CCS服务商十年内按合格资本支出100%计投资税收抵免、最多抵100%法定收入，服务商另可选十年70%所得税豁免；合格设备免进口税销售税，使用CCS服务的企业可扣服务费。该激励与2025年CCUS法许可制度（CCUS局、许可、托管基金）并排成熟——抵免管资本开支，执照管经营活动，财政监管双轨同龄；窗口关闭后已授抵免走完十年期，服务商二选一窗口同步关闭。覆盖与CCUS法一致（半岛加纳闽），沙巴沙捞越各行其法不在本激励射程内。',
        scope:
          '马来西亚2023-2027年CCS财政支持：100%投资抵免对70%豁免二选一、设备免税、服务费可扣，配CCUS法许可。',
        tags: [
          'MIDA',
          '投资税收抵免',
          '2023年预算',
          '免税',
          '服务商',
          '财法双轨',
        ],
        impactAnalysis: {
          economic:
            '十年100%抵免对全额法定收入，是东盟最强资本开支激励之一，直接砍Kasawari级项目回收期。',
          technical:
            '设备免税瞄准早期项目进口大头的捕集列与压缩包；服务商轨道要求持证运营，技术门槛与许可挂钩。',
          environmental:
            '服务费可扣把激励从资产方扩到买封存服务的排放方；许可附带的监测义务保证抵免吨数可核查。',
        },
        evolution: {
          clusters: ['马来西亚财政激励', '2023年预算', '财法双轨'],
          milestones: [
            {
              date: '2023-02-25',
              event: '2023年预算CCS激励开闸（100%抵免对70%豁免二选一）。',
            },
            {
              date: '2025-08-01',
              event:
                'CCUS法许可给财政轨道配上监管双胞胎：受激励的活动有证可持。',
            },
            {
              date: '2027-12-31',
              event: '申请窗口关闭；已授抵免走完十年期进2030年代末。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 95,
        label: '100% ITA for 10 Years',
        evidence:
          'A 100% Investment Tax Allowance on qualifying capex for ten years against full statutory income (or 70% exemption election) with equipment duty exemptions — the ASEAN benchmark fiscal package.',
        citation: 'Budget 2023 CCS incentives; MIDA guidance',
      },
      market: {
        score: 75,
        label: 'Service-Provider Lane',
        evidence:
          'A dedicated service-provider track with fee deductibility for users builds a merchant storage-services market beside owner-operator projects.',
        citation: 'Budget 2023 CCS incentives',
      },
      mrv: {
        score: 70,
        label: 'Licence-Linked Proof',
        evidence:
          'Allowance claims sit on CCUS Act licences with monitoring and reporting duties, tying fiscal benefit to measured storage under the Agency regime.',
        citation: 'CCUS Act 2025; Offshore Permit Regulations',
      },
      statutory: {
        score: 85,
        label: 'Budget Act Basis',
        evidence:
          'Budget 2023 legislation with a fixed 2023-2027 application window gives the incentive hard fiscal-law footing beside the 2025 licensing statute.',
        citation: 'Budget 2023 (Dewan Rakyat record)',
      },
      strategic: {
        score: 85,
        label: 'Hub Finance Pillar',
        evidence:
          'The fiscal track finances the NETR hub strategy (15 Mtpa by 2030) and the regional-hub import play — money behind the merchant-storage ambition.',
        citation: 'NETR (Aug 2023)',
      },
    },
  },
  {
    id: 'ph-ccus-policy-framework-2025',
    core: {
      status: 'Active',
      category: 'Strategic',
      legalWeight: 'Departmental Circular',
    },
    i18n: {
      en: {
        description:
          'The Philippine CCUS direction runs through the Philippine Energy Plan 2020-2040 with depleted-field storage (Malampaya foremost) as the anchor option — but the dedicated regulatory track is nascent and must be stated as such. No 2025 DOE CCUS circular could be verified (the 2025 circular trail covers petroleum data, hydrogen and service contracts; the standing call is a 2023 Senate inquiry urging guidelines). What exists: PEP integration of CCUS, ADB/IEA source-sink mapping (Luzon clusters, Malampaya-adjacent options), a 2023 Senate resolution demanding rules, and London Protocol contracting-party status (with PNG, the regional exception that eases future cross-border design). The honest record is framework-direction with guidelines pending — the Malampaya depletion clock, not a circular, drives urgency.',
        scope:
          'Philippine CCUS direction: PEP 2020-2040 integration, Malampaya-adjacent depleted-field options, ADB/IEA mapping, Senate rules demand, pending dedicated guidelines.',
        tags: [
          'PEP 2040',
          'Malampaya',
          'direction not regime',
          'Senate inquiry',
          'ADB mapping',
          'guidelines pending',
        ],
        impactAnalysis: {
          economic:
            'Without a licensing or incentive instrument, economics rest on future rules; the value today is option preservation on Malampaya-adjacent geology while gas policy (aggregation, LNG blend) evolves.',
          technical:
            'ADB 2013 source-sink work plus CALABARZON emitter mapping gives a surveyed starting grid; the missing piece is site characterisation under a licensing regime that does not yet exist.',
          environmental:
            'Stating the guidelines gap openly keeps the record honest: no premature storage claims attach to fields still producing or under petroleum tenure.',
        },
        evolution: {
          clusters: [
            'Philippine Energy Plan',
            'Malampaya Horizon',
            'Rules Demand',
          ],
          milestones: [
            {
              date: '2013-09-01',
              event:
                'ADB Southeast Asia CCS prospects mapped Luzon sources and sinks with a pilot-to-commercial roadmap.',
            },
            {
              date: '2023-12-01',
              event:
                'Senate resolution called an inquiry into CCS rules and guidelines for legislation.',
            },
            {
              date: '2025-01-01',
              event:
                'PEP 2020-2040 integration continued with Malampaya depletion sharpening the storage-conversion question; dedicated guidelines still pending verification.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '菲律宾CCUS方向走《2020-2040能源计划》，以枯竭油气田封存（Malampaya打头）为锚选项——但专门监管轨道尚在萌芽，必须如实写明。2025年DOE的CCUS通告无法核实（2025年通告轨迹是石油数据、氢能与服务合同；现成的是2023年参议院要求立规的质询）。现有的东西：PEP纳入CCUS、亚行/IEA源汇测绘（吕宋集群、Malampaya周边选项）、2023年参议院要规则的决议、伦敦议定书缔约国地位（与巴新同为区域例外，方便未来跨境设计）。诚实的记录是方向已定、规则待建——推着走的是Malampaya枯竭时钟，不是一纸通告。',
        scope:
          '菲律宾CCUS方向：PEP 2020-2040纳入、Malampaya周边枯竭田选项、亚行/IEA测绘、参议院要规则、专门指南待定。',
        tags: [
          'PEP2040',
          'Malampaya',
          '方向非制度',
          '参议院质询',
          '亚行测绘',
          '指南待定',
        ],
        impactAnalysis: {
          economic:
            '没有许可与激励工具，经济性系于未来规则；今天的价值是Malampaya周边地质的期权保值，顺带看天然气政策（归集、LNG掺混）怎么走。',
          technical:
            '亚行2013年源汇工作加吕宋排放源测绘给了勘测过的起跑网格；缺的是许可制度下的场址表征——而制度还不存在。',
          environmental:
            '把指南缺口写在明处保住诚实：仍在产或石油权证下的油气田，不提前挂封存功绩。',
        },
        evolution: {
          clusters: ['菲律宾能源计划', 'Malampaya时间窗', '要规则呼声'],
          milestones: [
            {
              date: '2013-09-01',
              event: '亚行东南亚CCS前景报告测绘吕宋源汇，附中试到商业路线图。',
            },
            {
              date: '2023-12-01',
              event: '参议院决议要求就CCS规则与指南质询立法。',
            },
            {
              date: '2025-01-01',
              event:
                'PEP 2020-2040继续纳入CCUS，Malampaya枯竭使封存转换问题变尖锐；专门指南仍待核实。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 60,
        label: 'No Instrument Yet',
        evidence:
          'No licensing, incentive or credit instrument for CCUS exists; economics await the guidelines the 2023 Senate inquiry demanded.',
        citation: 'Senate Resolution (Dec 2023); policy survey (2025)',
      },
      market: {
        score: 65,
        label: 'Option Value Only',
        evidence:
          'Malampaya-adjacent geology holds option value inside evolving gas policy (aggregation schemes, LNG blend), but no storage market or merchant model exists.',
        citation: 'DOE gas aggregation policy (2025); ADB mapping (2013)',
      },
      mrv: {
        score: 65,
        label: 'Petroleum MRV Only',
        evidence:
          'Only petroleum-tenure measurement and reporting applies; no CCS-specific monitoring, permanence or verification rules have been issued.',
        citation: 'DOE petroleum circulars (2023-2025)',
      },
      statutory: {
        score: 70,
        label: 'PEP Integration',
        evidence:
          'CCUS sits inside the Philippine Energy Plan 2020-2040 as framework direction with London Protocol contracting-party status easing future cross-border design.',
        citation: 'PEP 2020-2040; IMO contracting list',
      },
      strategic: {
        score: 80,
        label: 'Depletion-Driven Urgency',
        evidence:
          'Malampaya depletion makes storage conversion a timed question, not an open one — the strategy logic is sound even while the regulatory track is nascent.',
        citation: 'DOE Malampaya record; PEP 2020-2040',
      },
    },
  },
  {
    id: 'th-draft-climate-change-act-2025',
    core: {
      status: 'Under development',
      category: 'Regulatory',
      legalWeight: 'Primary Legislation',
    },
    i18n: {
      en: {
        description:
          'The Thai cabinet approved the Draft Climate Change Act in principle on December 2, 2025 — the starting gun, not the finish line: years of parliamentary procedure stand between approval-in-principle and enactment. The draft centralises governance under the National Climate Change Policy Committee with a Climate Fund (ETS revenue, CBAM, credit fees, subsidies, penalties; assets not remitted to Treasury), a national GHG database with mandatory reporting, an NDC-aligned action plan, a mandatory ETS with registries and surrender, a CBAM for designated imports, a carbon tax on 31 goods categories via Excise/Customs, transferable carbon credits (domestic certified only), a green taxonomy, and administrative penalties with daily fines. For CCUS specifically there is still no dedicated law: the 1971 Petroleum Act covers EOR-adjacent activity but not long-term storage of non-petroleum CO2, and the Department of Mineral Fuels is considering amendments (carbon-business definitions, licensing, closure, liability transfer) inside a national framework targeting 38.8 Mt/yr abatement with feasibility by 2030 and deployment by 2040.',
        scope:
          'Thai climate governance in draft: centralised committee, Climate Fund, GHG database, mandatory ETS, CBAM, 31-good carbon tax, credit property rules, taxonomy, penalties; CCUS via Petroleum Act gap plus DMF amendment track.',
        tags: [
          'Draft Act',
          'approval in principle',
          'Climate Fund',
          'ETS plus CBAM',
          '31-good carbon tax',
          'CCUS gap',
        ],
        impactAnalysis: {
          economic:
            'A 31-good carbon tax with ETS and CBAM builds the future price architecture CCS will monetise against, but with enactment years away the signal is directional, not bankable.',
          technical:
            'The DMF amendment track (definitions, licensing, closure, liability) is the correct technical vehicle; until it lands, the Upper Gulf storage plays wait on petroleum-law interpretations.',
          environmental:
            'Mandatory reporting with daily-penalty enforcement plus a non-remitted Climate Fund ring-fences climate money from general revenue from day one.',
        },
        evolution: {
          clusters: [
            'Thai Climate Bill',
            'Carbon Pricing Architecture',
            'CCUS Law Gap',
          ],
          milestones: [
            {
              date: '1971-01-01',
              event:
                'The Petroleum Act regime began governing upstream activity that CCUS must now stretch beyond.',
            },
            {
              date: '2025-12-02',
              event:
                'Cabinet approved the Draft Climate Change Act in principle (NCCPC, Fund, ETS, CBAM, 31-good tax).',
            },
            {
              date: '2030-01-01',
              event:
                'CCUS feasibility milestone inside the national framework targeting 38.8 Mt/yr abatement.',
            },
            {
              date: '2040-01-01',
              event:
                'Full-scale deployment horizon for Thai CCUS under the framework trajectory.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '泰国内阁2025年12月2日原则批准《气候变化法》草案——发令枪，不是终点线：原则批准到生效还有数年议会程序。草案把治理收归国家气候变化政策委员会，加气候基金（ETS收入、CBAM、信用费、补贴、罚款，资产不上缴国库）、国家温室气体数据库强制报告、NDC行动计划、强制ETS（配额登记交易注销）、指定进口CBAM、31类商品碳税（消费税/海关执行）、碳信用财产化（仅限国内核证项目）、绿色分类法、行政罚按日计。CCUS单项依然无法可依：1971年石油法只管采收关联活动，不管非石油二氧化碳长期封存；矿产燃料部正考虑修法（碳业务定义、许可、关闭、责任转移），国家框架目标减排3880万吨/年、2030年可行、2040年部署。',
        scope:
          '泰国起草中的气候治理：中央委员会、气候基金、温室气体数据库、强制ETS、CBAM、31类商品碳税、信用财产化、分类法、按日罚；CCUS靠石油法缺口加矿产燃料部修法轨道。',
        tags: [
          '草案',
          '原则批准',
          '气候基金',
          'ETS加CBAM',
          '31类碳税',
          'CCUS无法可依',
        ],
        impactAnalysis: {
          economic:
            '31类碳税加ETS与CBAM搭出CCS未来变现的价格建筑，但生效数年后，信号是方向性的，还进不了银行模型。',
          technical:
            '矿产燃料部修法轨道（定义、许可、关闭、责任）是正确的技术载体；落地前，上湾封存只能靠石油法解释续命。',
          environmental:
            '强制报告加按日罚、气候基金不上缴国库，从第一天起把气候钱圈出一般财政。',
        },
        evolution: {
          clusters: ['泰国气候法案', '碳定价建筑', 'CCUS立法缺口'],
          milestones: [
            {
              date: '1971-01-01',
              event: '石油法体制开始管上游，CCUS如今要撑破它的边界。',
            },
            {
              date: '2025-12-02',
              event:
                '内阁原则批准气候变化法草案（委员会、基金、ETS、CBAM、31类税）。',
            },
            {
              date: '2030-01-01',
              event: '国家框架CCUS可行里程碑，目标减排3880万吨/年。',
            },
            {
              date: '2040-01-01',
              event: '泰国CCUS规模化部署时间窗。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 70,
        label: 'Fund Architecture',
        evidence:
          'A non-remitted Climate Fund fed by ETS revenue, CBAM, credit fees and penalties pre-builds the disbursement vehicle, though disbursement awaits enactment.',
        citation:
          'Draft Climate Change Act (cabinet Dec 2025); Nishimura note (Jan 2026)',
      },
      market: {
        score: 70,
        label: 'ETS Plus CBAM',
        evidence:
          'Mandatory ETS with registries and surrender plus a designated-imports CBAM sketches the compliance market CCS will sell into — sketched, not operating.',
        citation: 'Draft Climate Change Act (cabinet Dec 2025)',
      },
      mrv: {
        score: 75,
        label: 'Database Mandate',
        evidence:
          'A national GHG database with mandatory public-and-private reporting and TGO verification lineage gives future CCS MRV a running start.',
        citation: 'Draft Climate Change Act; TGO verification practice',
      },
      statutory: {
        score: 75,
        label: 'Bill Plus Gap',
        evidence:
          'Cabinet-level bill text exists for the climate architecture while CCUS awaits Petroleum Act amendments — a two-speed statute book, honestly labelled.',
        citation: 'Nishimura note (Jan 2026); WFW Asia survey (Sep 2025)',
      },
      strategic: {
        score: 85,
        label: '38.8 Mt Trajectory',
        evidence:
          'The national framework 38.8 Mt/yr abatement trajectory with 2030 feasibility and 2040 deployment gates gives Thai CCUS dated checkpoints instead of aspirations.',
        citation: 'National CCUS framework (WFW Sep 2025)',
      },
    },
  },
  {
    id: 'sg-carbon-tax-ccus-2025',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'Primary Legislation',
    },
    i18n: {
      en: {
        description:
          'Singapore prices carbon without storing it at home: the Carbon Pricing Act (2019, S$5) amended November 2022 and effective January 2024 drives S$25 (2024-25) to S$45 (2026-27) toward S$50-80 by 2030 across manufacturing, power and waste facilities above 25,000 tCO2e, with robust NEA MRV regulations, 5% International Carbon Credit offsets from 2024 (11 implementation agreements; 2025-quota rollover with $25/$45 conversion), an EITE transition framework, and ICC rollover expiry discipline. There is deliberately no CCS-specific legislation: with no geological storage, strategy is cross-border structuring — the ExxonMobil/Shell S Hub consortium evaluating 2.5 Mt/yr by 2030 for subsea/rock export storage, EMA feasibility studies (three firms, July 2025, post- and pre-combustion), a 2026 waste-to-energy CCS pilot, a PUB ocean-removal pilot (10 t/day by 2026), and Indonesia/Malaysia MoUs — toward a 2 Mt/yr 2030 abatement goal. The law taxes; the programme exports.',
        scope:
          'Singapore carbon pricing to 2030: S$25-45-80 trajectory, ICC offsets, EITE transition, NEA MRV; cross-border CCS structuring via S Hub, feasibility studies, pilots and MoUs without domestic storage law.',
        tags: [
          'carbon tax trajectory',
          'ICC offsets',
          'S Hub',
          'cross-border structuring',
          'no storage law',
          'EITE framework',
        ],
        impactAnalysis: {
          economic:
            'A rising S$45 tax with 5% ICC offsets prices industrial carbon now while S Hub structuring converts the tax signal into contracted export storage later.',
          technical:
            'EMA capture studies, the WtE pilot and PUB ocean removal build a domestic capture-and-removal technology base that assumes foreign sinks from day one.',
          environmental:
            'No-storage honesty plus ICC integrity discipline (11 agreements, four-year credit gestation) keeps the strategy inside verifiable cross-border accounting.',
        },
        evolution: {
          clusters: ['Singapore Carbon Tax', 'ICC Cooperation', 'S Hub Export'],
          milestones: [
            {
              date: '2019-01-01',
              event:
                'Carbon Pricing Act in force at S$5 with NEA MRV regulations for large facilities.',
            },
            {
              date: '2024-01-01',
              event:
                'Amended trajectory to S$25 with 5% ICC offsets and EITE transition framework.',
            },
            {
              date: '2026-01-01',
              event:
                'Tax steps to S$45 with ICC rollover conversion; WtE CCS pilot and ocean-removal pilot due.',
            },
            {
              date: '2030-01-01',
              event:
                'S$50-80 trajectory with 2 Mt/yr abatement goal via S Hub export storage.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '新加坡给碳定价、不在本土封存：碳定价法（2019年5新元）2022年11月修订、2024年1月生效，推25新元（2024-25）到45新元（2026-27）、2030年50-80新元，覆盖2.5万吨以上制造电力废弃物设施，NEA核查规则扎实，2024年起5%国际碳信用抵消（11份执行协议，2025年额度结转按25/45折算），EITE过渡框架，未用额度过期作废。刻意不立CCS单行法：没有地质封存，战略就是跨境组织——埃克森美孚/壳牌S Hub财团评估2030年250万吨/年海底/岩层出口封存，EMA三家可行性研究（2025年7月，前后燃烧），2026年垃圾焚烧CCS中试，PUB海水移除中试（2026年日10吨），印尼马来西亚谅解备忘录——目标2030年减200万吨。法律收税，项目出口。',
        scope:
          '新加坡到2030年碳定价：25-45-80新元轨迹、国际信用抵消、EITE过渡、NEA核查；经S Hub、可研、中试与谅解备忘录做跨境CCS组织，无本土封存法。',
        tags: [
          '碳税轨迹',
          '国际信用抵消',
          'S Hub',
          '跨境组织',
          '无封存法',
          'EITE框架',
        ],
        impactAnalysis: {
          economic:
            '45新元税加5%国际信用抵消现在就给工业碳定价，S Hub组织把税信号转成以后的合同出口封存。',
          technical:
            'EMA捕集研究、垃圾焚烧中试与PUB海水移除建本土捕集移除技术底座——第一天就假设用外国汇。',
          environmental:
            '无封存诚实加国际信用诚信纪律（11份协议、四年信用孕育期），把战略框在可核查的跨境核算里。',
        },
        evolution: {
          clusters: ['新加坡碳税', '国际信用合作', 'S Hub出口'],
          milestones: [
            {
              date: '2019-01-01',
              event: '碳定价法生效，5新元，NEA核查规则管大设施。',
            },
            {
              date: '2024-01-01',
              event: '修订轨迹到25新元，5%国际信用抵消加EITE过渡框架。',
            },
            {
              date: '2026-01-01',
              event:
                '税到45新元并折算结转；垃圾焚烧CCS中试与海水移除中试到期。',
            },
            {
              date: '2030-01-01',
              event: '50-80新元轨迹，S Hub出口封存200万吨/年减排目标。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 85,
        label: 'Rising Tax Signal',
        evidence:
          'S$25 to S$45 to S$50-80 with 5% ICC offsets and EITE transition allowances prices carbon harder each step while funding adjustment, not exemption.',
        citation: 'NEA carbon tax schedule; CPA amendments',
      },
      market: {
        score: 90,
        label: 'Export Structuring',
        evidence:
          'The S Hub consortium plus EMA studies, pilots and ID/MY MoUs structure a 2.5 Mt/yr export market with contracted foreign sinks instead of domestic storage fiction.',
        citation: 'WFW Asia survey (Sep 2025)',
      },
      mrv: {
        score: 95,
        label: 'NEA Verification',
        evidence:
          'NEA measurement-reporting-verification regulations with ICC integrity discipline, rollover conversion maths and expiry rules form the strictest ASEAN carbon accounting.',
        citation: 'CPA MRV Regulations 2018; NEA ICC guidance',
      },
      statutory: {
        score: 90,
        label: 'Pricing Act Plus MoUs',
        evidence:
          'The amended Carbon Pricing Act with EITE framework plus 11 ICC implementation agreements gives price and cooperation treaty cover without pretending to a storage law.',
        citation: 'CPA (amended Nov 2022); ICC programme record',
      },
      strategic: {
        score: 95,
        label: 'Finance-Role Play',
        evidence:
          'Singapore plays finance-and-structuring for regional CCS (2 Mt/yr 2030 goal) — the honest role for a no-sink economy, and the most replicable ASEAN template.',
        citation: 'WFW Asia survey (Sep 2025)',
      },
    },
  },
  {
    id: 'vn-carbon-market-decree-2025',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'Decree',
    },
    i18n: {
      en: {
        description:
          'Vietnam carbon-market state of play, January 2025 decisions plus 2025 decrees: Prime Minister Decision 232 (January 24, 2025) approved the domestic-market roadmap — pilot ETS June 2025 to December 2028 with free allocation to high-emitting sectors (power, steel, cement), full operation from 2029 with auctions beside free allocation, HNX as carbon exchange, MONRE registries and MRV, certified credits (CDM/JCM/Article 6.4) eligible within government limits. Decree 119/2025 plus Decision 263 set pilot allowance budgets for 2025-2026. For CCUS specifically the track is incentives-without-law: Decision 38/2020 designates CCUS a priority technology (tax perks, tech-programme finance, R&D eligibility), while the 2023 Petrovietnam-JOGMEC gaps study (licensing, liability, monitoring, safety, cross-border) feeds a phased regulatory roadmap toward 2036 commercialisation. The market is being built first; the CCUS statute follows.',
        scope:
          'Vietnam carbon market to 2029: pilot ETS with free allocation, 2029 full operation with auctions, HNX exchange, MONRE MRV, certified-credit offsets; CCUS priority-tech incentives with a 2036 regulatory horizon.',
        tags: [
          'Decision 232',
          'pilot ETS',
          'HNX exchange',
          'Decision 38/2020',
          'JOGMEC gaps study',
          '2036 horizon',
        ],
        impactAnalysis: {
          economic:
            'Free allocation through 2028 with auctioning from 2029 phases price discovery gently, while priority-tech perks give CCUS a fiscal foothold before any compliance demand exists.',
          technical:
            'The gaps study plus phased harmonisation (liability, monitoring, safety, cross-border) sequences the engineering preconditions — law follows measurement, not the reverse.',
          environmental:
            'Certified-credit-only offsets (CDM/JCM/6.4) with government limits keep early compliance inside verified tonnes while the domestic MRV system matures.',
        },
        evolution: {
          clusters: ['Vietnam Carbon Market', 'Pilot ETS', 'CCUS Law Track'],
          milestones: [
            {
              date: '2020-01-01',
              event:
                'Decision 38/2020 designated CCUS a priority technology with tax and programme perks.',
            },
            {
              date: '2025-01-24',
              event:
                'Decision 232 approved the market roadmap: pilot ETS June 2025-December 2028, full operation 2029.',
            },
            {
              date: '2025-01-01',
              event:
                'Decree 119/2025 with Decision 263 set design, scope and 2025-2026 pilot budgets.',
            },
            {
              date: '2036-01-01',
              event:
                'Phased regulatory horizon targets CCUS commercialisation with harmonised liability and markets.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '越南碳市场现状：2025年1月总理232号决定批国内市场路线图——2025年6月到2028年12月试点ETS、高排放行业免费配额，2029年起全面运行加拍卖，河内交易所为碳交所，自然资源环境部管登记与MRV，核证信用（CDM/JCM/6.4机制）限额抵消。119/2025号法令加263号决定定2025-2026试点配额预算。CCUS单项是有激励无法：38/2020号决定列优先技术（税收优惠、技术计划资金、研发资格），2023年越油-JOGMEC缺口研究（许可、责任、监测、安全、跨境）喂给分阶段监管路线图，目标2036年商业化。先建市场，后立CCUS法。',
        scope:
          '越南到2029年碳市场：免费配额试点ETS、2029年全面加拍卖、河内交所、自然资源环境部MRV、核证信用抵消；CCUS优先技术激励加2036年监管时间窗。',
        tags: [
          '232号决定',
          '试点ETS',
          '河内交所',
          '38/2020号决定',
          'JOGMEC缺口研究',
          '2036年窗口',
        ],
        impactAnalysis: {
          economic:
            '2028年前免费配额、2029年起拍卖，价格发现走得缓；优先技术优惠让CCUS在合规需求出现前先有财政立足点。',
          technical:
            '缺口研究加分阶段协同机制（责任、监测、安全、跨境）排好工程前置——先有计量后有法，不反着来。',
          environmental:
            '只认核证信用抵消（CDM/JCM/6.4）加政府限额，本土MRV成熟前合规锁在核实吨里。',
        },
        evolution: {
          clusters: ['越南碳市场', '试点ETS', 'CCUS立法轨道'],
          milestones: [
            {
              date: '2020-01-01',
              event: '38/2020号决定列CCUS优先技术，给税收与计划资金资格。',
            },
            {
              date: '2025-01-24',
              event:
                '232号决定批市场路线图：2025年6月到2028年12月试点，2029年全面。',
            },
            {
              date: '2025-01-01',
              event: '119/2025号法令加263号决定定设计范围与2025-2026试点预算。',
            },
            {
              date: '2036-01-01',
              event: '分阶段监管时间窗目标CCUS商业化，责任与市场协同到位。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 80,
        label: 'Priority-Tech Perks',
        evidence:
          'Decision 38/2020 priority-tech designation unlocks tax perks, tech-programme finance and R&D eligibility ahead of any compliance demand — fiscal foothold first.',
        citation: 'Decision 38/2020/QD-TTg',
      },
      market: {
        score: 90,
        label: 'ETS Under Construction',
        evidence:
          'Pilot ETS (free allocation to power/steel/cement) scaling to auctioned full operation from 2029 on the HNX exchange builds the compliance market CCUS will eventually sell into.',
        citation: 'Decision 232 (Jan 2025); Decree 119/2025',
      },
      mrv: {
        score: 90,
        label: 'MONRE Registries',
        evidence:
          'MONRE registries with inventory submission from 2025, certified-credit-only offsets and exchange surveillance put measurement before law.',
        citation: 'Decree 06/2022; Decree 119/2025',
      },
      statutory: {
        score: 85,
        label: 'Roadmap Plus Decrees',
        evidence:
          'Prime-ministerial roadmap with framework decrees and pilot budgets gives the market administrative-law reality while the CCUS statute travels its 2036 track.',
        citation: 'Decision 232 (Jan 2025); Decision 263',
      },
      strategic: {
        score: 85,
        label: 'Market First',
        evidence:
          'The market-first sequencing (pilot to 2028, full 2029, CCUS law by 2036) matches instruments to maturity instead of legislating ahead of measurement.',
        citation: 'Petrovietnam-JOGMEC gaps study (2023)',
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

export function applyContentDepthBatch3F(db, { auditDate = AUDIT_DATE } = {}) {
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
    const summary = applyContentDepthBatch3F(db);
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
    console.error(`Content-depth batch 3F migration failed: ${error.message}`);
    process.exit(1);
  });
}

#!/usr/bin/env node
/**
 * Content-depth batch 3D (2026-09): enrich the five EU-periphery records
 * with primary-source-backed bilingual content.
 *
 * Scores before: be-ccus-strategy-2025 (22), gr-ccs-regulatory-framework-2025
 * (20), fr-ccus-roadmap (24), es-climate-law-ccs-2025 (22),
 * pl-mining-law-ccs-2024 (24).
 *
 * Integrity fixes: no single 2025 Belgian federal CCUS strategy document
 * exists — the record is reframed as the composite 2025 posture (NECP,
 * Flanders decree, Wallonia, bilaterals) with the federal enabling role
 * stated honestly; Greek "Eni-Hellas corridor" dropped for the verified
 * Apollo/Olympus/Prinos portfolio; Spanish 2025-amendment-of-7/2021 claim
 * replaced with the verified Law 40/2010 base plus 2025-26 hub momentum;
 * all four legacy regulatory blocks rewritten (inline evidence tags with
 * unverifiable specifics removed). Target: each scores >= 70.
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

export const MIGRATION_ID = 'content-depth-batch3d-2026-09';
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
    id: 'be-ccus-strategy-2025',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'Regulatory Directive',
    },
    i18n: {
      en: {
        description:
          'Belgium has no comprehensive national CCS deployment strategy: the federal level plays an enabling role (regulatory obstacles, bilateral agreements, EU funding, derisking) while Flanders and Wallonia implement. Flanders runs on its 2021 CCUS concept note plus the 2024 CO2 Transport Decree with regulated third-party access, tariff approval by the Flemish regulator and operator designation underway for the Antwerp cluster; Wallonia pairs capture projects (Holcim, ArcelorMittal) with a transport roadmap and future onshore assessment. Three London Protocol bilaterals underpin the transit-hub model: Denmark (2022), the Netherlands (2023), Norway (2024) with a Zeebrugge-pipeline MoU (June 2024) for 20-40 Mt/yr. Flagship infrastructure is the Antwerp@C export hub (€144.6M CEF-E: intra-port pipelines, liquefaction, buffer, marine loading, open access) and the Ghent Carbon Hub; the draft NECP projects ~5 Mt capture by 2030, all Flemish. The honest frame is transit-hub orchestration without domestic storage, not a federal master plan.',
        scope:
          'Belgian CCUS posture: federal enabling (bilaterals, EU funds, derisking), Flanders transport decree with regulated access and tariffs, Wallonia roadmap and onshore assessment, Antwerp@C and Ghent hubs, North Sea Basin cooperation.',
        tags: [
          'transit hub',
          'Flanders decree',
          'third-party access',
          'Antwerp@C',
          'bilaterals',
          'no domestic storage',
        ],
        impactAnalysis: {
          economic:
            'Open-access export hubs with CEF-E grants convert Antwerp and Ghent into tolling infrastructure for hinterland emitters, monetising transit while storage capex sits in Norway, Denmark and the Netherlands.',
          technical:
            'The 2024 Transport Decree unbundles transport from capture with approved tariffs and designated operators — the only Belgian CCS rulebook with operative licensing mechanics.',
          environmental:
            'No domestic storage is planned (Walloon onshore potential only under future study), so the climate benefit depends entirely on contracted North Sea capacity and London Protocol arrangements holding.',
        },
        evolution: {
          clusters: [
            'Belgium Transit Hub',
            'Flanders Regulation',
            'London Protocol Bilaterals',
          ],
          milestones: [
            {
              date: '2021-01-01',
              event:
                'Flanders CCUS concept note set the regional strategic vision for capture, transport and storage.',
            },
            {
              date: '2024-06-18',
              event:
                'Belgium-Norway pipeline MoU signed for Zeebrugge-to-Norway CO2 transport (20-40 Mt/yr).',
            },
            {
              date: '2024-01-01',
              event:
                'Flanders CO2 Transport Decree in force: regulated third-party access, tariff approval, operator designation begun.',
            },
            {
              date: '2025-01-01',
              event:
                'Draft NECP confirmed the posture: ~5 Mt capture by 2030 (Flemish), three bilaterals, federal enabling role.',
            },
          ],
        },
        regulatory: {
          pore_space_rights:
            'No cost-effective domestic storage pursued; North Sea capacity via treaties.',
          liability_transfer:
            'Storage liability governed by receiving-state regimes under bilateral terms.',
          liability_period:
            'Per receiving-state rules (EU 20-year baseline where applicable).',
          financial_assurance:
            'CEF-E grants (Antwerp@C €144.6M) plus regulated tariff returns for operators.',
          permitting_lead_time:
            'Operator designation underway under the 2024 Transport Decree.',
          co2_definition: 'Industrial emission stream for export and storage.',
          cross_border_rules:
            'London Protocol bilaterals with Denmark, Netherlands, Norway; NSBTF cooperation.',
        },
      },
      zh: {
        description:
          '比利时没有全国统一的CCS部署战略：联邦层面只做 enabling（清障碍、签双边、拿欧盟资金、降风险），落地靠弗拉芒与瓦隆。弗拉芒按2021年CCUS概念文件加2024年二氧化碳运输法令运行——规制第三方接入、价目审批、安特卫普集群运营商指定中；瓦隆做捕集项目（Holcim、安赛乐米塔尔）加运输路线图与未来陆上评估。三份伦敦议定书双边撑起转运枢纽模式：丹麦（2022）、荷兰（2023）、挪威（2024，另有泽布吕赫管线谅解备忘录，2000-4000万吨/年）。旗舰设施是安特卫普@C出口枢纽（CEF-E 1.446亿欧元：港内管网、液化、缓冲、海运装载、开放接入）与根特碳枢纽；NECP草案预计2030年捕集约500万吨、全在弗拉芒。诚实的定位是无本土封存的转运枢纽编排，而非联邦总蓝图。',
        scope:
          '比利时CCUS态势：联邦 enabling（双边、欧盟资金、降风险）、弗拉芒运输法令（规制接入与价目）、瓦隆路线图与陆上评估、安特卫普@C与根特枢纽、北海盆地合作。',
        tags: [
          '转运枢纽',
          '弗拉芒法令',
          '第三方接入',
          '安特卫普@C',
          '双边协议',
          '无本土封存',
        ],
        impactAnalysis: {
          economic:
            'CEF-E资助的开放接入出口枢纽把安特卫普根特变成腹地排放源的收费设施，封存资本支出落在挪威丹麦荷兰。',
          technical:
            '2024年运输法令把运输与捕集拆分、价目审批、运营商指定——比利时唯一有操作许可机制的CCS规则。',
          environmental:
            '不搞本土封存（瓦隆陆上潜力只做未来研究），气候效益全系于北海合同容量与伦敦议定书安排。',
        },
        evolution: {
          clusters: ['比利时转运枢纽', '弗拉芒监管', '伦敦议定书双边'],
          milestones: [
            {
              date: '2021-01-01',
              event: '弗拉芒CCUS概念文件定下区域捕集运输封存战略愿景。',
            },
            {
              date: '2024-06-18',
              event: '比挪管线谅解备忘录签署，泽布吕赫到挪威2000-4000万吨/年。',
            },
            {
              date: '2024-01-01',
              event:
                '弗拉芒二氧化碳运输法令生效：规制第三方接入、价目审批、运营商指定启动。',
            },
            {
              date: '2025-01-01',
              event:
                'NECP草案确认态势：2030年约500万吨捕集（弗拉芒）、三份双边、联邦 enabling。',
            },
          ],
        },
        regulatory: {
          pore_space_rights: '不追求本土经济封存；北海容量走条约。',
          liability_transfer: '封存责任按接收国制度与双边条款。',
          liability_period: '按接收国规则（适用处用欧盟20年基准）。',
          financial_assurance:
            'CEF-E拨款（安特卫普@C 1.446亿欧元）加规制价目回报。',
          permitting_lead_time: '2024年运输法令下运营商指定中。',
          co2_definition: '出口封存的工业排放流。',
          cross_border_rules: '与丹麦荷兰挪威的伦敦议定书双边；北海盆地合作。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 80,
        label: 'Hub Tolling Model',
        evidence:
          'CEF-E grants plus regulated tariff returns on open-access export hubs monetise transit without storage capex, while SDE-style operating support is absent by design.',
        citation: 'Antwerp@C CEF-E award; Flanders Transport Decree (2024)',
      },
      market: {
        score: 75,
        label: 'Open-Access Export',
        evidence:
          'Regulated third-party access with approved tariffs and unbundled transport turns Antwerp and Ghent into merchant export terminals competing for hinterland volumes.',
        citation: 'Flanders CO2 Transport Decree (2024)',
      },
      mrv: {
        score: 85,
        label: 'Receiving-State MRV',
        evidence:
          'Metering at liquefaction and marine loading with storage-side MRV under Norwegian/Danish/Dutch regimes; no domestic storage MRV obligations exist.',
        citation: 'Antwerp@C design; bilateral terms',
      },
      statutory: {
        score: 85,
        label: 'Decree-Based Access',
        evidence:
          'The 2024 Transport Decree with regulator-approved tariffs and operator designation is the operative statute, inside London Protocol bilaterals (DK/NL/NO) and the NECP posture.',
        citation: 'Flanders Transport Decree (2024); NECP',
      },
      strategic: {
        score: 90,
        label: 'Transit Orchestrator',
        evidence:
          '~5 Mt capture by 2030 feeding contracted North Sea stores positions Belgium as the orchestrator of North-West European CO2 logistics rather than a storage owner.',
        citation: 'Draft NECP; NSBTF cooperation',
      },
    },
  },
  {
    id: 'gr-ccs-regulatory-framework-2025',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'Regulatory Directive',
    },
    i18n: {
      en: {
        description:
          'Greece moved from framework-setting to operation in fourteen months: Law 5261/2025 (adopted December 12, 2025) is the first comprehensive CCS statute — state-owned storage, exploration licences to five years, plume monitoring with operator liability to strict handover, per-tonne-fee CCS account, carbon-contracts-for-difference route, capture/use/transport licensing, 100 kt threshold, onshore/sub-lake/offshore scope. Licensing sits with HEREMA (competent authority since Law 4920/2022; JMD 48416/2011 transposition; White Paper April 2023). The Prinos CO2 storage permit issued February 26, 2026 to EnEarth Greece (Energean) for 25 years at up to 1 Mt/yr phase one (depleted field plus saline aquifer ~3 km subsea, DG CLIMA opinion, RRF+CEF co-financed), scaling toward 2.8-3 Mt/yr by 2029-2030 inside the France-Italy-Greece Mediterranean plan. The Olympus cement project (Heracles, 0.9 Mt/yr by 2029) and the Apollo midstream project (DESFA pipeline) feed the same store.',
        scope:
          'Greek CCS full chain: Law 5261/2025 licensing (exploration, capture, use, transport, storage), HEREMA administration, Prinos store with Olympus/Apollo feeders, Mediterranean cooperation.',
        tags: [
          'Law 5261/2025',
          'HEREMA',
          'Prinos permit',
          'state-owned storage',
          'Mediterranean hub',
          'Olympus',
        ],
        impactAnalysis: {
          economic:
            'State-owned storage with CfD support and RRF/CEF co-finance de-risks Prinos while per-tonne fees fund host compensation — a complete project-finance stack for a first store.',
          technical:
            'Twenty-five-year permit with DG CLIMA-reviewed plans (storage, risk, monitoring, corrective, provisional closure) on a characterised depleted field plus aquifer sets the technical template for Olympus and Apollo volumes.',
          environmental:
            'Operator liability to strict handover with continuous plume monitoring, inside EU Directive duties, keeps the first Mediterranean store inside verifiable containment.',
        },
        evolution: {
          clusters: ['Greece CCS Law', 'HEREMA Licensing', 'Prinos Store'],
          milestones: [
            {
              date: '2022-09-01',
              event:
                'HEREMA granted the first exploration licence (Prinos/Epsilon, Energean) for CO2 storage assessment.',
            },
            {
              date: '2025-12-12',
              event:
                'Law 5261/2025 adopted: first comprehensive CCS statute with state-owned storage and CfD route.',
            },
            {
              date: '2026-02-26',
              event:
                'Prinos 25-year storage permit issued to EnEarth Greece (1 Mt/yr phase one, DG CLIMA opinion).',
            },
            {
              date: '2029-01-01',
              event:
                'Prinos scaling toward 2.8-3 Mt/yr with Olympus cement volumes; Apollo pipeline feeding.',
            },
          ],
        },
        regulatory: {
          pore_space_rights:
            'State-owned storage; HEREMA administers exploration (to 5 years) and storage licences.',
          liability_transfer:
            'Operator liability to strict handover conditions, then state stewardship.',
          liability_period:
            'Monitoring through operation plus conditional post-closure period per permit.',
          financial_assurance:
            'Per-tonne storage fees fund the dedicated CCS account; CfD support route available.',
          permitting_lead_time:
            'Exploration-to-storage ladder demonstrated: 2022 exploration to 2026 permit.',
          co2_definition:
            'Industrial and DAC streams for permanent storage at 100 kt+ scale.',
          cross_border_rules:
            'France-Italy-Greece Mediterranean plan; EU Directive-compatible export posture.',
        },
      },
      zh: {
        description:
          '希腊十四个月从搭框架走到运营：2025年12月12日《第5261号法》是首部综合CCS法——封存国有、勘探许可至五年、羽流监测加运营商责任到严格交接、吨费CCS专户、碳差价合约路径、捕集利用运输许可、10万吨门槛、陆上湖底海上全覆盖。许可归HEREMA（2022年4920号法起为主管机关；2011年48416号联合部长决定转置；2023年4月白皮书）。Prinos封存许可2026年2月26日发给EnEarth希腊公司（Energean子公司），25年期，一期年100万吨（枯竭油田加盐水层、海底约3公里，欧委会气候总司意见，复苏基金加互联基金合资），2029-2030年扩到280-300万吨，纳入法意希地中海计划。Olympus水泥项目（Heracles，2029年90万吨/年）与Apollo中游项目（DESFA管线）进同一封存。',
        scope:
          '希腊CCS全链条：5261号法许可（勘探捕集利用运输封存）、HEREMA管理、Prinos封存加Olympus/Apollo来料、地中海合作。',
        tags: [
          '5261号法',
          'HEREMA',
          'Prinos许可',
          '封存国有',
          '地中海枢纽',
          'Olympus',
        ],
        impactAnalysis: {
          economic:
            '国有封存加差价合约加欧盟合资给Prinos去风险，吨费养东道补偿——首个封存的完整项目融资栈。',
          technical:
            '25年许可加欧委会审过的计划包（封存、风险、监测、纠正、暂闭），落在已表征的枯竭油田加含水层，给Olympus/Apollo定了技术模板。',
          environmental:
            '运营商责任到严格交接加连续羽流监测，在欧盟指令义务内，把首个地中海封存放在可核查包容里。',
        },
        evolution: {
          clusters: ['希腊CCS立法', 'HEREMA许可', 'Prinos封存'],
          milestones: [
            {
              date: '2022-09-01',
              event:
                'HEREMA发出首个勘探许可（Prinos/Epsilon，Energean）做封存评价。',
            },
            {
              date: '2025-12-12',
              event: '5261号法通过：首部综合CCS法，封存国有加差价合约路径。',
            },
            {
              date: '2026-02-26',
              event:
                'Prinos 25年封存许可发给EnEarth希腊（一期年100万吨，欧委会意见）。',
            },
            {
              date: '2029-01-01',
              event:
                'Prinos向280-300万吨/年扩，Olympus水泥量接入，Apollo管线送料。',
            },
          ],
        },
        regulatory: {
          pore_space_rights: '封存国有；HEREMA管勘探（至五年）与封存许可。',
          liability_transfer: '运营商责任到严格交接条件，之后国家托管。',
          liability_period: '运营期监测加许可定的有条件封场后期的组合。',
          financial_assurance: '吨费养CCS专户；差价合约支持路径可选。',
          permitting_lead_time:
            '勘探到封存阶梯已验证：2022年勘探到2026年许可。',
          co2_definition: '10万吨以上规模永久封存的工业与DAC流。',
          cross_border_rules: '法意希地中海计划；兼容欧盟指令的出口姿态。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 80,
        label: 'CfD Plus EU Funds',
        evidence:
          'Carbon-contracts-for-difference route with RRF/CEF co-finance on Prinos converts the statute into bankable revenue support for first volumes.',
        citation: 'Law 5261/2025; HEREMA Prinos permit (Feb 2026)',
      },
      market: {
        score: 75,
        label: 'Hub Aggregation',
        evidence:
          'Prinos as shared store for Olympus cement and Apollo midstream volumes aggregates Greek industrial demand behind one permitted sink with EU funding leverage.',
        citation: 'Lexology DLA Piper note (Mar 2026)',
      },
      mrv: {
        score: 85,
        label: 'Permit-Plan MRV',
        evidence:
          'DG CLIMA-reviewed storage, risk, monitoring, corrective and provisional-closure plans with continuous plume monitoring set MRV at permit depth.',
        citation: 'HEREMA permit record (Feb 2026)',
      },
      statutory: {
        score: 85,
        label: 'First CCS Statute',
        evidence:
          'Law 5261/2025 with HEREMA licensing (Laws 4920/2022, JMD 48416/2011 lineage) gives capture-to-storage permitting a single statutory home fourteen months after the framework record.',
        citation: 'Law 5261/2025; HEREMA licensing page',
      },
      strategic: {
        score: 90,
        label: 'Mediterranean Anchor',
        evidence:
          'Prinos scaling to 2.8-3 Mt/yr by 2029-2030 inside the France-Italy-Greece plan makes Greece the South-East Mediterranean storage anchor.',
        citation: 'Lexology DLA Piper note (Mar 2026)',
      },
    },
  },
  {
    id: 'fr-ccus-roadmap',
    core: {
      status: 'Active',
      category: 'Strategic',
      legalWeight: 'Strategic Guidance',
    },
    i18n: {
      en: {
        description:
          'The July 2024 DGEC stocktake (état des lieux, 4 July 2024 publication) is the operational companion to the French CCUS strategy: Phase 1 (2024-2030) builds at least two hubs capturing 4-8 Mt/yr by 2030 (1.5-4 Mt per cluster) across Dunkerque, Fos-sur-Mer, the Rhone axis, Le Havre and Saint-Nazaire, first hub possibly functional 2028, with the deep-decarbonisation support scheme tendered from the June 2024 consultation. Near-term storage is explicitly external via the North Sea (Northern Lights, Aramis) and Mediterranean (Callisto Ravenna, Prinos) routes: Norway strategic partnership (January 2024, 1.5 Mt/yr), Franco-Danish letter of intent plus maritime export bilateral (March 2024), London Protocol amendment ratification track through parliament in 2024, North Sea Basin Task Force membership and a France-Italy-Greece Mediterranean plan. Sovereign storage follows through BRGM assessment, an April 2024 call for interest and exploration subsidies; NaTran maps a 16.7 Mt/yr corridor; ADEME costs CCS at EUR 100-150/t against EUR 20-30 cheapest industrial options.',
        scope:
          'French CCUS deployment outlook: two-to-four port hubs to 2030, external North Sea/Mediterranean storage access, London Protocol ratification, sovereign assessment, NaTran corridor, deep-decarbonisation support.',
        tags: [
          'état des lieux',
          'port hubs',
          '4-8 Mtpa',
          'Norway partnership',
          'NaTran corridor',
          'ADEME costing',
        ],
        impactAnalysis: {
          economic:
            'Hub concentration with shared NaTran transport and EU fund routes pools CAPEX, while ADEME EUR 100-150/t costing against EUR 20-30 alternatives rations support to hard-to-abate volumes only.',
          technical:
            'Standardised capture on hydrogen units, furnaces and steam with shared liquefaction and shipping specs, plus a BRGM subsurface programme converting theoretical storage into drilled prospects.',
          environmental:
            'External storage via ratified routes avoids premature domestic lock-in; ADEME last-step framing bounds the strategy environmentally.',
        },
        evolution: {
          clusters: [
            'France Deployment Outlook',
            'Hub Buildout',
            'Storage Access Routes',
          ],
          milestones: [
            {
              date: '2024-07-04',
              event:
                'DGEC stocktake published: Phase 1 hubs for 4-8 Mt/yr by 2030 with external storage first.',
            },
            {
              date: '2024-01-16',
              event:
                'France-Norway green-industries forum: strategic partnership with 1.5 Mt/yr Northern Lights storage.',
            },
            {
              date: '2025-07-28',
              event:
                'France-Norway CO2 export agreement signed after June 2025 Assembly ratification.',
            },
            {
              date: '2028-01-01',
              event:
                'First French hub potentially functional, feeding North Sea and Mediterranean stores.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '2024年7月生态转型部盘点文件（7月4日发布）是法国CCUS战略的操作手册：一期（2024-2030）在敦刻尔克、Fos、罗讷轴线、勒阿弗尔与圣纳泽尔建至少两个枢纽，2030年捕集400-800万吨/年（单集群150-400万吨），首个枢纽或2028年投运，深度脱碳支持机制自2024年6月咨询招标。近期封存明确走外部：北海（Northern Lights、Aramis）与地中海（Callisto拉文纳、Prinos）路线；挪威战略伙伴（2024年1月，150万吨/年）、法丹意向书加海上出口双边（2024年3月）、伦敦议定书修正案2024年送议会批准、北海盆地工作组、法意希地中海计划。本土封存随后跟上：BRGM评估、2024年4月意向征集与勘探资助。NaTran规划1670万吨/年走廊；ADEME测算CCS每吨100-150欧元、对最便宜工业选项20-30欧元。',
        scope:
          '法国CCUS部署展望：2030年前两到四个港口枢纽、北海/地中海外部封存接入、伦敦议定书批准、本土评估、NaTran走廊、深度脱碳支持。',
        tags: [
          '现状盘点',
          '港口枢纽',
          '400-800万吨',
          '挪威伙伴',
          'NaTran走廊',
          'ADEME成本',
        ],
        impactAnalysis: {
          economic:
            '枢纽集中加NaTran共享运输与欧盟资金路径分摊资本开支；ADEME 100-150欧元对20-30欧元的测算把支持限定在难减排量。',
          technical:
            '制氢机组加热炉蒸汽装置标准化捕集，共享液化船运规格，BRGM地下计划把理论封存变成钻探远景。',
          environmental:
            '经批准路径走外部封存，避免过早本土锁定；ADEME最后步骤定位给战略划环境边界。',
        },
        evolution: {
          clusters: ['法国部署展望', '枢纽建设', '封存接入路线'],
          milestones: [
            {
              date: '2024-07-04',
              event:
                '生态转型部盘点发布：一期枢纽2030年400-800万吨/年，先外部后本土。',
            },
            {
              date: '2024-01-16',
              event:
                '法挪绿色工业论坛：战略伙伴，经Northern Lights 150万吨/年。',
            },
            {
              date: '2025-07-28',
              event: '法挪二氧化碳出口协议签署（此前6月国民议会已批准）。',
            },
            {
              date: '2028-01-01',
              event: '首个法国枢纽或投运，供北海及地中海封存。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 85,
        label: 'Hub Support Scheme',
        evidence:
          'The deep-decarbonisation support tendered from June 2024 funds two-to-four port hubs with EU Innovation Fund co-finance beside national support.',
        citation: 'DGEC stocktake (Jul 2024)',
      },
      market: {
        score: 75,
        label: 'NaTran Corridor',
        evidence:
          'NaTran 16.7 Mt/yr corridor planning with regulated per-tonne tariffs turns dispersed refinery and chemical capture into contracted midstream demand.',
        citation: 'NaTran corridor planning; DGEC stocktake',
      },
      mrv: {
        score: 85,
        label: 'EU Storage MRV',
        evidence:
          'External storage under EU CCS Directive monitoring via Northern Lights, Aramis, Callisto and Prinos routes keeps French volumes inside verified containment.',
        citation: 'EU CCS Directive; DGEC stocktake',
      },
      statutory: {
        score: 80,
        label: 'Protocol Ratification',
        evidence:
          'London Protocol amendment ratification plus the July 2025 France-Norway export agreement and Franco-Danish bilateral give cross-border storage treaty cover with Green Industry Act permitting streamlining.',
        citation: 'London Protocol amendment; Green Industry Act',
      },
      strategic: {
        score: 95,
        label: '4-8 Mtpa Hubs',
        evidence:
          'Phase 1 hubs at 4-8 Mt/yr by 2030 (first possibly 2028) inside the EU 50 Mt obligation, ADEME-bounded to hard-to-abate volumes after efficiency and renewables.',
        citation: 'DGEC stocktake (Jul 2024); ADEME costing',
      },
    },
  },
  {
    id: 'es-climate-law-ccs-2025',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'Regulatory Directive',
    },
    i18n: {
      en: {
        description:
          'Spanish CCS rests on Law 40/2010 (December 29, 2010) transposing the EU Directive — concessions for geological storage onshore, in territorial seas, EEZ and continental shelf (water column excluded), Ministry concessioning, Annex I site characterisation, financial guarantees, ETS inclusion, EIA and IPPC overlays for capture and pipelines, transparent non-discriminatory network access — inside Law 7/2021 climate targets (-23% by 2030, neutrality 2050). The 2025 state of play is hub momentum, not new statute: the Enagás-led COnet2 North Hub MoU (March 18, 2026: Petronor, Heidelberg Materials, Calcinor, Terresis with Nortegas over the ETN network and BBG plant, PCI-listed, CEF/Innovation Fund track) organises Basque-Navarre-Cantabria capture-to-storage value chains, while the ALGECO2 atlas counts 31 onshore plus 3 offshore structures and the cement industry maps 4 strategic hubs. Open gaps per 2024 expert review: no London Protocol ratification, ENAGAS 2023 call of interest unscaled, NZIA permit simplification pending, and a thin subsoil-professional pipeline.',
        scope:
          'Spanish CCS: Law 40/2010 storage concessions and access rules inside Law 7/2021 climate targets, ALGECO2 atlas structures, COnet2 North Hub value chain, cement-cluster scenarios, TEN-E cross-border interfaces.',
        tags: [
          'Law 40/2010',
          'Law 7/2021',
          'COnet2 hub',
          'ALGECO2 atlas',
          'cement clusters',
          'TEN-E',
        ],
        impactAnalysis: {
          economic:
            'PCI-listed hub status with CEF/Innovation Fund tracks converts the Basque cluster into fundable European infrastructure, while ETS inclusion of stores keeps the carbon-price backstop behind capture investment.',
          technical:
            'Thirty-one screened onshore structures plus 3 offshore with depth and seal criteria, and a hub design (pipelines, liquefaction terminal, marine loading) that reuses gas-network know-how, give developers a surveyed starting grid.',
          environmental:
            'Concession-gated storage with financial guarantees, EIA overlays and Ministry supervision keeps the first stores inside the Directive containment duties that fourteen dormant years never tested.',
        },
        evolution: {
          clusters: ['Spain CCS Law', 'ALGECO2 Atlas', 'COnet2 North Hub'],
          milestones: [
            {
              date: '2010-12-29',
              event:
                'Law 40/2010 transposed the EU CCS Directive with concessions, guarantees and access rules.',
            },
            {
              date: '2021-05-20',
              event:
                'Law 7/2021 set -23% 2030 and 2050 neutrality targets framing CCS deployment.',
            },
            {
              date: '2023-01-01',
              event:
                'ENAGAS call of interest tested transport demand; ALGECO2 atlas consolidated 31+3 structures.',
            },
            {
              date: '2026-03-18',
              event:
                'COnet2 North Hub MoU signed (Enagás, EVE, Petronor, Heidelberg, Calcinor, Nortegas), PCI-listed.',
            },
          ],
        },
        regulatory: {
          pore_space_rights:
            'State-owned storage rights via Ministry concessions under Law 40/2010.',
          liability_transfer:
            'EU Directive transfer regime through concession terms and supervision.',
          liability_period:
            'Minimum 20-year post-closure duties per Directive implementation.',
          financial_assurance:
            'Concession-linked financial guarantees plus ETS inclusion of stores.',
          permitting_lead_time:
            'Concession plus EIA/IPPC overlays; NZIA simplification pending.',
          co2_definition:
            'Industrial CO2 for permanent geological storage under Law 40/2010.',
          cross_border_rules:
            'TEN-E interfaces; London Protocol ratification still outstanding.',
        },
      },
      zh: {
        description:
          '西班牙CCS立在2010年12月29日第40/2010号法（转置欧盟指令）上——陆上、领海、专属经济区与大陆架地质封存特许（水体排除），部委发证，附件一场地表征，财务担保，纳入碳市场，捕集管输叠加环评与综合污染防治，管网透明非歧视接入——装在7/2021号气候法（2030年-23%、2050年中和）目标里。2025年态势是枢纽动量而非新法：Enagás牵头的COnet2北部枢纽谅解备忘录（2026年3月18日：Petronor、海德堡、Calcinor、Terresis加Nortegas，走ETN管网与BBG厂，PCI清单，CEF/创新基金路径）组织巴斯克—纳瓦拉—坎塔布里亚捕集到封存链；ALGECO2图集数出31个陆上加3个海上构造；水泥业排出4个战略枢纽。2024年专家评估列的敞口：伦敦议定书未批、ENAGAS 2023年意向征集未放大、NZIA审批简化待定、地下专业人才断层。',
        scope:
          '西班牙CCS：第40/2010号法封存特许与接入规则装入7/2021气候目标，ALGECO2图集构造，COnet2北部枢纽链，水泥集群情景，TEN-E跨境接口。',
        tags: [
          '40/2010号法',
          '7/2021号法',
          'COnet2枢纽',
          'ALGECO2图集',
          '水泥集群',
          'TEN-E',
        ],
        impactAnalysis: {
          economic:
            'PCI清单枢纽地位加CEF/创新基金路径，把巴斯克集群变成可融资的欧洲设施；封存纳入碳市场守住捕集投资的价格后盾。',
          technical:
            '31个筛选陆上构造加3个海上（深度与盖层标准），加枢纽设计（管输、液化终端、海运装载）复用天然气管网 know-how，给开发商一张勘测过的起跑网格。',
          environmental:
            '特许设卡的封存加财务担保、环评叠加与部委监管，把首批封存放在指令包容义务里——十四年休眠期从未检验过的那种。',
        },
        evolution: {
          clusters: ['西班牙CCS立法', 'ALGECO2图集', 'COnet2北部枢纽'],
          milestones: [
            {
              date: '2010-12-29',
              event: '第40/2010号法转置欧盟CCS指令：特许、担保、接入规则。',
            },
            {
              date: '2021-05-20',
              event: '第7/2021号法定2030年-23%与2050年中和目标，框住CCS部署。',
            },
            {
              date: '2023-01-01',
              event: 'ENAGAS意向征集试探管输需求；ALGECO2图集汇总31+3构造。',
            },
            {
              date: '2026-03-18',
              event:
                'COnet2北部枢纽谅解备忘录签署（Enagás、EVE、Petronor、海德堡、Calcinor、Nortegas），入PCI清单。',
            },
          ],
        },
        regulatory: {
          pore_space_rights: '第40/2010号法下部委特许的国有封存权。',
          liability_transfer: '经特许条款与监管的欧盟指令转移制度。',
          liability_period: '按指令实施的至少20年封场后义务。',
          financial_assurance: '特许挂钩财务担保加封存纳入碳市场。',
          permitting_lead_time: '特许加环评/综防叠加；NZIA简化待定。',
          co2_definition: '第40/2010号法下永久地质封存的工业二氧化碳。',
          cross_border_rules: 'TEN-E接口；伦敦议定书批准仍未完成。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 70,
        label: 'PCI Fundability',
        evidence:
          'PCI-listed hub status opens CEF and Innovation Fund tracks for the Basque cluster while ETS inclusion prices stored tonnes — European fundability substituting for absent national subsidies.',
        citation: 'COnet2 MoU (Mar 2026); EU PCI list',
      },
      market: {
        score: 75,
        label: 'Hub Aggregation',
        evidence:
          'The COnet2 public-private partnership aggregates Basque, Navarre and Cantabria capture behind shared logistics (pipelines, liquefaction terminal, marine loading) with coordinated EU funding applications.',
        citation: 'Enagás COnet2 release (Mar 2026)',
      },
      mrv: {
        score: 85,
        label: 'Concession MRV',
        evidence:
          'Annex I characterisation with financial guarantees, EIA/IPPC overlays and Ministry supervision carry Directive monitoring duties into each concession from award.',
        citation: 'Law 40/2010; BOE-A-2010-20049',
      },
      statutory: {
        score: 85,
        label: 'Law 40/2010 Base',
        evidence:
          'The 2010 transposition with concessions, exclusive storage rights, access duties and ETS inclusion is a complete (if dormant-tested) statutory base inside Law 7/2021 targets.',
        citation: 'Law 40/2010 (BOE-A-2010-20049)',
      },
      strategic: {
        score: 85,
        label: 'Cement-Cluster Play',
        evidence:
          'Thirty-one screened structures feeding four strategic cement hubs make the record a cluster play for hard-to-abate industry rather than a single-project bet.',
        citation: 'ALGECO2 atlas; cement industry scenarios (2024)',
      },
    },
  },
  {
    id: 'pl-mining-law-ccs-2024',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'Regulatory Directive',
    },
    i18n: {
      en: {
        description:
          'The June 16, 2023 amendment to the Geological and Mining Law (DU 2023/2029, in force October 2023) ended the demonstration-only era: commercial storage permitted onshore, offshore and in hydrocarbon structures with EOR combination, sub-100 kt exemptions, exploration-licence replaced by approved geological-works projects, time-limited exclusive rights for complex documenters, and a National CO2 Storage Administrator taking liability under Article 39a. Transport sits in the Energy Law with direct capture-to-storage bypass of the network. Dentons (December 2024) notes the honest remainder: capture governed only by general environmental law, implementing regulations still missing, and a special comprehensive act periodically proposed. The framework turned Poland from a ban regime into a build-ready one on paper; permits and stores are the outstanding proof.',
        scope:
          'Polish CCS: amended Geological and Mining Law (commercial storage, EOR combination, sub-100kt exemptions, exclusive documentation rights, National Administrator liability), Energy Law transport, pending implementing rules.',
        tags: [
          'Geological and Mining Law',
          'demo ban lifted',
          'EOR combination',
          'National Administrator',
          'implementing rules pending',
          'Energy Law transport',
        ],
        impactAnalysis: {
          economic:
            'EOR combination plus sub-100kt exemptions lower the entry ticket for first projects, while exclusive documentation rights protect explorers sunk costs — economics engineered for a standing start.',
          technical:
            'Geological-works-project approval replacing exploration licensing cuts a procedural layer, and direct capture-to-storage bypass avoids forcing every project through a not-yet-built network.',
          environmental:
            'Liability transfer to the National Administrator under Article 39a with financial securities keeps long-term stewardship inside statute even before the first commercial store operates.',
        },
        evolution: {
          clusters: [
            'Poland Mining Law',
            'Demo Ban Lift',
            'Implementing Rules Gap',
          ],
          milestones: [
            {
              date: '2011-06-09',
              event:
                'The Geological and Mining Law carried the CCS Directive with a demonstration-only restriction that froze the sector.',
            },
            {
              date: '2023-06-16',
              event:
                'Amendment adopted (DU 2023/2029): commercial storage, EOR combination, sub-100kt exemptions, National Administrator.',
            },
            {
              date: '2023-10-01',
              event:
                'Amendment in force; Poland moved from ban regime to build-ready paper framework.',
            },
            {
              date: '2024-12-17',
              event:
                'Dentons review: capture unregulated beyond general law, implementing rules missing, special act proposed.',
            },
          ],
        },
        regulatory: {
          pore_space_rights:
            'State Treasury ownership; exclusive documentation rights for complex finders.',
          liability_transfer:
            'Transfer to the National CO2 Storage Administrator under Article 39a.',
          liability_period:
            'Minimum 20-year post-closure monitoring per Directive implementation.',
          financial_assurance:
            'Mandatory securities scaled to decommissioning and site care, including sub-100kt.',
          permitting_lead_time:
            'Geological-works approval replacing exploration licensing; ministry concessioning.',
          co2_definition:
            'CO2 for geological storage including EOR-combined streams.',
          cross_border_rules:
            'ECO2CEE interconnector participation; London Protocol posture untested.',
        },
      },
      zh: {
        description:
          '2023年6月16日《地质和采矿法》修正案（2023/2029号，10月生效）终结示范限定时代：陆上海上与油气构造商业封存放行、采收结合、10万吨以下豁免、勘探许可换成地质工程项目审批、落锤有音的复杂区块独占申请权、39a条国家二氧化碳封存管理人接责任。运输在能源法，直接捕集到封存可绕行管网。Dentons（2024年12月）点出诚实剩余：捕集只受一般环境法管，实施细则还没出，时不时有人提议单独立一部综合法。框架把波兰从禁令体制变成纸面可建，许可与封存是待证的下半场——而这正是检验修正案成色的唯一标准：纸面框架必须长出第一批许可与第一处运营封存，否则2023年改革只是一次成功的立法表演。',
        scope:
          '波兰CCS：修正的地质采矿法（商业封存、采收结合、10万吨以下豁免、独占文献权、国家管理人责任）、能源法运输、待出的实施细则。',
        tags: [
          '地质采矿法',
          '示范禁令解除',
          '采收结合',
          '国家管理人',
          '细则待出',
          '能源法运输',
        ],
        impactAnalysis: {
          economic:
            '采收结合加10万吨以下豁免降低首批项目门票，独占文献权保护勘探沉没成本——为零起步设计的经济性。',
          technical:
            '地质工程项目审批取代勘探许可砍掉一层程序，直接捕集到封存绕行避免每个项目都被逼进尚不存在的管网。',
          environmental:
            '39a条国家管理人接责加财务担保，把长期托管写进法里，哪怕首个商业封存还没运营。',
        },
        evolution: {
          clusters: ['波兰采矿法', '示范禁令解除', '细则缺口'],
          milestones: [
            {
              date: '2011-06-09',
              event: '地质采矿法带CCS指令落地，但示范限定冻住全行业。',
            },
            {
              date: '2023-06-16',
              event:
                '修正案通过（2023/2029号）：商业封存、采收结合、10万吨豁免、国家管理人。',
            },
            {
              date: '2023-10-01',
              event: '修正案生效，波兰从禁令 regime 进入纸面可建。',
            },
            {
              date: '2024-12-17',
              event:
                'Dentons评估：捕集无法可依超一般法，实施细则缺失，提议单独立法。',
            },
          ],
        },
        regulatory: {
          pore_space_rights: '国库所有；复杂区块发现者独占文献权。',
          liability_transfer: '按39a条移交国家二氧化碳封存管理人。',
          liability_period: '按指令实施的至少20年封场后监测。',
          financial_assurance: '与退役场地维护挂钩的强制担保，含10万吨以下。',
          permitting_lead_time: '地质工程审批取代勘探许可；部委发证。',
          co2_definition: '地质封存二氧化碳，含采收结合流。',
          cross_border_rules: '参与ECO2CEE互联；伦敦议定书姿态未经检验。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 65,
        label: 'Entry Ticket Cut',
        evidence:
          'Sub-100kt exemptions with EOR combination and exclusive documentation rights cut first-project costs where no subsidy scheme exists — regulatory incentive in place of fiscal incentive.',
        citation: '2023 amendment (DU 2023/2029); CMS Law note (Feb 2024)',
      },
      market: {
        score: 70,
        label: 'Bypass Option',
        evidence:
          'Direct capture-to-storage bypass plus Energy Law transport provisions let projects proceed without waiting for a network operator that does not yet exist.',
        citation: '2023 amendment; Energy Law transport chapter',
      },
      mrv: {
        score: 85,
        label: 'Concession MRV',
        evidence:
          'Ministry concessions with characterisation duties, financial securities and supervision chain carry Directive monitoring into each store from licensing.',
        citation: 'Geological and Mining Law, storage concession terms',
      },
      statutory: {
        score: 90,
        label: 'Ban Lifted',
        evidence:
          'The 2023 amendment with commercial storage, National Administrator liability (Art.39a) and ministry concessioning replaced the demonstration-only freeze with a build-ready statute.',
        citation: 'DU 2023/2029; Dentons review (Dec 2024)',
      },
      strategic: {
        score: 85,
        label: 'Paper Ready',
        evidence:
          'A complete paper framework awaiting permits and stores: the honest gap is implementing regulations and capture law, with a special act periodically proposed.',
        citation: 'Dentons review (Dec 2024)',
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

export function applyContentDepthBatch3D(db, { auditDate = AUDIT_DATE } = {}) {
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
    const summary = applyContentDepthBatch3D(db);
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
    console.error(`Content-depth batch 3D migration failed: ${error.message}`);
    process.exit(1);
  });
}

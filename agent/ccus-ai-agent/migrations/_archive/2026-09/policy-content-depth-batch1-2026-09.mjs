#!/usr/bin/env node
/**
 * Policy content-depth batch 1 (2026-09): enrich the three lowest-scoring
 * critical records from docs/policy-content-depth-report.md with
 * primary-source-backed bilingual content.
 *
 * - gr-climate-law-2022-update (score 8)
 * - ph-doe-ccus-roadmap-2024 (score 9)
 * - ro-emergency-ordinance-2024 (score 9)
 *
 * Every claim below traces to the cited primary or authoritative secondary
 * source (AGENTS.md authority rules — no invented clauses, dates or
 * citations). Target: each record scores >= 70 on re-audit.
 * Approved 2026-09-08 (T4/Q4, critical-first).
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

export const MIGRATION_ID = 'policy-content-depth-batch1-2026-09';
const AUDIT_DATE = '2026-09-08';
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
    id: 'gr-climate-law-2022-update',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'Primary Legislation',
    },
    i18n: {
      en: {
        description:
          "Greece's National Climate Law 4936/2022 (45 articles) sets the country's climate-neutrality-by-2050 framework: five-year sectoral carbon budgets, emission cuts across power, buildings, transport and industry, and monitoring indicators tied to the National Energy and Climate Plan under EU Governance Regulation 2018/1999. For CCS specifically, the operating regime is layered: Joint Ministerial Decision 48416/2011 transposed the EU CCS Directive 2009/31/EC (site selection and characterisation, exploration and storage permitting, monitoring and reporting, closure and post-closure duties, financial guarantees, transfer of responsibility), with HEREMA designated licensing authority for CO2 geological storage (Law 4920/2022). Law 4964/2022 Article 173 added a fast track letting hydrocarbon concession holders convert existing exploration data directly into storage exploration and then storage permits (notably the Prinos Complex off Kavala), though its 12-month application window has lapsed. In December 2025 Greece adopted Law 5261/2025, its first comprehensive CCS statute: state ownership of storage sites, exploration licences up to five years, mandatory plume monitoring with operator liability until strict handover conditions are met, a dedicated CCS account funded by per-tonne storage fees, and a carbon-contracts-for-difference support route. The 2022 record therefore reads as the framework-setting step in an active legislative sequence, not a finished regime.",
        scope:
          'Greece-wide climate governance (carbon budgets, sectoral mitigation, adaptation) plus the national CO2 geological-storage regime: onshore, sub-lake and offshore formations under Greek sovereignty, capture (including DAC), use, transport and storage for projects of 100 kt CO2 or more.',
        tags: [
          'national climate law',
          'carbon budgets',
          'CCS Directive transposition',
          'storage licensing',
        ],
        impactAnalysis: {
          economic:
            'Creates no direct capture subsidy itself, but the 2025 CCS law unlocks EU funding routes and a carbon-contracts-for-difference mechanism shielding operators from ETS price volatility, plus a per-tonne storage fee feeding a dedicated CCS account that compensates host municipalities.',
          technical:
            'Codifies the full CCS chain technically: Annex-grade site characterisation criteria, exploration-then-storage permitting, continuous plume and leakage monitoring with corrective-action duties, and EIA-backed storage permits with defined reservoir and injection parameters.',
          environmental:
            'Anchors CCS inside binding five-year carbon budgets and the 2050 neutrality target, while imposing operator liability through operation and a conditional post-closure period before any transfer of responsibility to the state.',
        },
        evolution: {
          clusters: [
            'Greece Climate Governance',
            'EU CCS Directive Transposition',
            'Greece Storage Licensing',
          ],
          milestones: [
            {
              date: '2011-11-07',
              event:
                'Joint Ministerial Decision 48416/2011 transposed the EU CCS Directive, the first binding storage regime.',
            },
            {
              date: '2022-05-27',
              event:
                'Law 4936/2022 enacted the national climate law with 2050 neutrality and sectoral carbon budgets; Law 4964/2022 Article 173 opened the hydrocarbon-area storage fast track.',
            },
            {
              date: '2025-12-12',
              event:
                'Law 5261/2025 adopted as the first comprehensive Greek CCS statute with state-owned storage and CfD support.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '希腊《国家气候法》（第4936/2022号法律，共45条）确立了该国2050年气候中和框架：五年期部门碳预算，覆盖电力、建筑、交通和工业的减排安排，以及与国家能源与气候计划挂钩的监测指标。CCS方面的现行制度是分层构成的：2011年第48416号联合部长决定转化了欧盟CCS指令（2009/31/EC），规定选址与 characterization、勘探与封存许可、监测报告、关闭与关闭后义务、财务担保和责任转移，HEREMA被指定为二氧化碳地质封存许可机关（第4920/2022号法律）。第4964/2022号法律第173条曾为油气特许权持有人开辟快速通道，可凭现有勘探资料直接申请封存勘探直至封存许可（代表性案例为卡瓦拉近海Prinos综合体），但其12个月申请窗口已经届满。2025年12月希腊通过第5261/2025号法律，即首部综合性CCS专门法：封存场地国有、勘探许可最长五年、全程羽流监测且经营者在严格移交条件满足前承担责任、按吨征收封存费注入CCS专户、并开辟碳差价合约支持路径。因此2022年记录应理解为仍在演进中的立法序列的框架性一步，而非终局制度。',
        scope:
          '覆盖希腊全国的气候治理（碳预算、部门减排、适应）及本国二氧化碳地质封存制度：希腊主权范围内的陆上、湖下和海上地层，适用于10万吨及以上的捕集（含直接空气捕集）、利用、运输与封存项目。',
        tags: ['国家气候法', '碳预算', 'CCS指令转化', '封存许可'],
        impactAnalysis: {
          economic:
            '法律本身不设直接捕集补贴，但2025年CCS法打通了欧盟资金通道与碳差价合约机制，对冲ETS价格波动风险；按吨征收的封存费进入CCS专户，用于补偿封存地所在市镇。',
          technical:
            '以法典形式固定CCS全链条技术要求：附录级场地评价标准、勘探—封存两段许可、连续羽流与泄漏监测及纠正义务，以及附带环评的封存许可与储层注入参数。',
          environmental:
            '将CCS纳入有约束力的五年碳预算与2050中和目标，同时要求经营者承担运营期及有条件关闭后期的责任，之后方可向国家移交。',
        },
        evolution: {
          clusters: ['希腊气候治理', '欧盟CCS指令转化', '希腊封存许可'],
          milestones: [
            {
              date: '2011-11-07',
              event:
                '第48416/2011号联合部长决定转化欧盟CCS指令，建立首个有约束力的封存制度。',
            },
            {
              date: '2022-05-27',
              event:
                '第4936/2022号国家气候法生效，确立2050中和与部门碳预算；第4964/2022号第173条开放油气区封存快速通道。',
            },
            {
              date: '2025-12-12',
              event:
                '第5261/2025号法律通过，成为首部综合性CCS专门法，确立封存场地国有与差价合约支持。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 45,
        label: 'Emerging CfD route, no direct grant',
        evidence:
          'Law 5261/2025 enables carbon contracts for difference covering part of the gap between capture costs and ETS allowance prices, plus a dedicated CCS account; no per-tonne capture grant or tax credit exists in the 2022 framework itself.',
        citation:
          'Hellenic Parliament bill summary for Law 5261/2025; DLA Piper analysis of the Greek CCS Law (Lexology, 2026).',
      },
      statutory: {
        score: 70,
        label: 'Layered primary + secondary regime',
        evidence:
          'Law 4936/2022 (45 articles) plus JMD 48416/2011 transposing Directive 2009/31/EC and Law 4964/2022 Article 173 form a binding multi-layer regime, superseded in part by the comprehensive Law 5261/2025.',
        citation:
          'Law 4936/2022 (ECOLEX/UNEP LEAP); JMD 48416/2037/2011; Law 4964/2022 Article 173.',
      },
      market: {
        score: 50,
        label: 'ETS-linked, cross-border enabled',
        evidence:
          'The framework operates inside the EU ETS price signal, foresees third-party access to transport and storage networks with regulated dispute settlement, and explicitly enables participation in cross-border CO2 transport and storage networks.',
        citation:
          'DLA Piper analysis of the Greek CCS Law (Lexology, 2026); Law 5261/2025 licensing provisions.',
      },
      strategic: {
        score: 75,
        label: 'Neutrality-anchored strategy',
        evidence:
          'CCS is embedded in the statutory 2050 climate-neutrality objective, five-year sectoral carbon budgets and the National Energy and Climate Plan, with a central digital CO2-certificate registry and public environmental-information duties.',
        citation: 'Law 4936/2022 (ECOLEX/UNEP LEAP summary).',
      },
      mrv: {
        score: 65,
        label: 'Directive-grade monitoring',
        evidence:
          'Continuous CO2-plume behaviour and leakage monitoring, immediate corrective measures on any irregularity, EIA-backed storage permits with defined injection parameters, and a central digital registry of capture, use, transport and storage certificates.',
        citation:
          'JMD 48416/2011 monitoring annexes; Hellenic Parliament bill summary for Law 5261/2025.',
      },
    },
  },
  {
    id: 'ph-doe-ccus-roadmap-2024',
    core: {
      status: 'Planned',
      category: 'Strategic',
      legalWeight: 'Strategic Guidance',
    },
    i18n: {
      en: {
        description:
          'The Philippines has no standalone CCUS statute; carbon capture sits inside energy-planning documents as a "potential technology" whose applicability is still being determined. The anchor is the Philippine Energy Plan 2020-2040 ("Towards a Sustainable and Clean Energy Future") under AmBisyon Natin 2040, with a Clean Energy Scenario targeting 35-50% renewable power share, LNG imports, EV penetration and energy savings. The analytical base is the ADB 2013 "Prospects for Carbon Capture and Storage in Southeast Asia" study, which screened power plants south of Metro Manila, reviewed storage in oil and gas fields, and drew an actionable pilot roadmap with a government CCS working group. Project delivery would run through generic fast-track channels: the Certificate of Energy Project of National Significance under Executive Order 30 and the Energy Virtual One Stop Shop Act (RA 11234). Climate linkage comes from the 2021 NDC (75% emission reduction/avoidance by 2030, only 2.71% unconditional) and its Implementation Plan (~$72 billion need, energy sector ~$36.5 billion). Independent technology ranking (Lau 2022) rates industrial and gas-plant CCS high on security and affordability for the country, with coal-to-gas switching as the nearer-term priority. Pending dedicated environmental guidelines on CCUS are the recognised next step before any pilot can proceed.',
        scope:
          'Philippines-wide pre-deployment scoping: coal and gas power-plant capture potential, depleted oil and gas fields and saline formations as candidate stores, NDC-linked energy-sector decarbonisation, and the permitting channels (CEPNS/EVOSS) any future pilot would use.',
        tags: [
          'strategic roadmap',
          'pre-deployment scoping',
          'energy plan',
          'NDC linkage',
        ],
        impactAnalysis: {
          economic:
            'No dedicated CCUS subsidy or revenue instrument exists; the economic case rests on future access to generic energy-project facilitation plus international climate finance toward the $72 billion NDC implementation need, of which roughly half sits in energy.',
          technical:
            'Technical content is assessment-level: ADB-screened plant clusters and storage geology, plus independent rankings favouring gas-plant and industrial CCS over coal-CCS on security and affordability; no capture performance standard or storage permitting code has been issued.',
          environmental:
            'Environmental value is prospective and NDC-anchored: CCUS would serve the conditional 72.29% of the 2030 pledge, but pending CCUS-specific environmental guidelines mean lifecycle and leakage safeguards are not yet codified.',
        },
        evolution: {
          clusters: [
            'Philippines Energy Planning',
            'ASEAN CCS Cooperation',
            'NDC Implementation',
          ],
          milestones: [
            {
              date: '2013-01-01',
              event:
                'ADB published the Southeast Asia CCS prospects study with a Philippines pilot roadmap and a government working group.',
            },
            {
              date: '2020-01-01',
              event:
                'Philippine Energy Plan 2020-2040 listed CCUS among potential technologies pending applicability review.',
            },
            {
              date: '2024-07-01',
              event:
                'NDC Implementation Plan 2020-2030 quantified a ~$72 billion delivery need with energy as the largest share.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '菲律宾尚无独立的CCUS专门立法，碳捕集目前落在能源规划文件中，被列为适用性“有待确定”的“潜在技术”。 anchor是《2020—2040菲律宾能源计划》（“迈向可持续清洁能源未来”，对接2040宏愿），其清洁能源情景要求可再生能源发电占比35%—50%、进口LNG、推广电动车并节能。分析基础是亚行2013年《东南亚碳捕集与封存前景》研究：筛查了马尼拉南部电厂、评估油气田封存条件，并给出试点路线图与政府工作组。项目落地将走通用 fast-track 通道：依据第30号行政令的“国家重大能源项目证书”（CEPNS）和《能源一站式虚拟商店法》（RA 11234）。气候挂钩来自2021年国家自主贡献（2030年减排/避免75%，其中无条件仅2.71%）及其实施计划（约720亿美元需求，能源占约365亿）。独立技术评估（Lau 2022）认为燃气电厂与工业CCS在安全与可负担性上评分较高，煤改气是更近期的优先项。公认的下一步是出台CCUS专门环境指南，之后方可推进试点。',
        scope:
          '覆盖菲律宾全国的部署前 scoping：燃煤与燃气电厂捕集潜力、枯竭油气田与咸水层候选封存场地、与NDC挂钩的能源部门脱碳，以及未来试点可用的审批通道（CEPNS/EVOSS）。',
        tags: ['战略路线图', '部署前评估', '能源计划', 'NDC挂钩'],
        impactAnalysis: {
          economic:
            '尚无CCUS专门补贴或收益工具；经济性依赖通用能源项目便利化，以及面向720亿美元NDC实施需求的国际气候资金，其中约一半在能源部门。',
          technical:
            '技术内容停留在评估层面：亚行筛查的电厂集群与封存地质，以及倾向燃气电厂与工业CCS的独立排序；尚未发布捕集性能标准或封存许可规范。',
          environmental:
            '环境价值是预期性且与NDC挂钩的：CCUS将服务2030承诺中有条件的72.29%部分，但CCUS专门环境指南尚未出台，全生命周期与泄漏保障尚未成文。',
        },
        evolution: {
          clusters: ['菲律宾能源规划', '东盟CCS合作', 'NDC实施'],
          milestones: [
            {
              date: '2013-01-01',
              event:
                '亚行发布东南亚CCS前景研究，给出菲律宾试点路线图并组建政府工作组。',
            },
            {
              date: '2020-01-01',
              event:
                '《2020—2040菲律宾能源计划》将CCUS列为有待适用性评估的潜在技术。',
            },
            {
              date: '2024-07-01',
              event:
                'NDC实施计划（2020—2030）量化约720亿美元交付需求，能源占比最大。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 35,
        label: 'Facilitation only, no CCUS subsidy',
        evidence:
          'No dedicated capture grant, tax credit or CfD exists; the only tangible support is procedural fast-tracking via CEPNS (EO 30) and EVOSS (RA 11234), plus prospective access to international climate finance.',
        citation:
          'ASEAN Blue Wealth CCUS sectoral snapshot (2026); Philippine NDC Implementation Plan 2020-2030.',
      },
      statutory: {
        score: 25,
        label: 'No standalone CCUS law',
        evidence:
          'CCUS is recognised only inside the Philippine Energy Plan as a potential technology; dedicated environmental guidelines on CCUS are still pending and no storage licensing code has been enacted.',
        citation:
          'Philippine Energy Plan 2020-2040; 6Wresearch Philippines CO2 EOR Market note on pending CCUS guidelines.',
      },
      market: {
        score: 40,
        label: 'NDC-linked market potential',
        evidence:
          'Value would flow through future carbon-market and Article 6 channels tied to the conditional 72.29% of the NDC, but no domestic CCS crediting rule or ETS inclusion exists yet.',
        citation:
          'Philippine NDC Implementation Plan 2020-2030; DOE Clean Energy Scenario.',
      },
      strategic: {
        score: 60,
        label: 'Anchored in energy planning',
        evidence:
          'CCUS is formally scoped in PEP 2020-2040 under AmBisyon Natin 2040 with ADB-backed pilot identification, sectoral roadmaps and a standing government working-group lineage.',
        citation:
          'DOE Philippine Energy Plan 2020-2040; ADB Prospects for CCS in Southeast Asia (2013).',
      },
      mrv: {
        score: 30,
        label: 'Data gaps acknowledged',
        evidence:
          'ADB and ACE assessments flag geological-data access and MRV design as the binding constraints; storage suitability work covers early identification only, with no national monitoring standard issued.',
        citation:
          'ADB Prospects for CCS in Southeast Asia (2013); ASEAN Blue Wealth snapshot on geological-data access (ACE, 2024).',
      },
    },
  },
  {
    id: 'ro-emergency-ordinance-2024',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'Administrative Regulation',
    },
    i18n: {
      en: {
        description:
          "Government Emergency Ordinance 139/2024 (adopted 4 December 2024, published in Monitorul Oficial 1225/2024) rewrote the operative core of Romania's CO2 storage regime: Emergency Ordinance 64/2011, which transposed EU Directive 2009/31/EC and was approved by Law 114/2013. The 2024 ordinance was driven explicitly by the EU Net-Zero Industry Act (Regulation 2024/1735) and its 50 Mt union-wide 2030 injection objective with proportional oil-and-gas-producer contributions. Its centrepiece is speed: the regulator ANRMPSG may now issue a storage permit directly to the holder of a valid petroleum agreement covering the site, with no prior exploration phase, provided existing data already characterises the formation and the holder proves technical and financial capacity (new Articles 7(8^1)-(8^4)), including conversion or abandonment terms for legacy oil infrastructure. Complementing this, ANRE licenses the CO2 transport network layer (design/construction/operation authorisations plus an operating licence), the National Geological Fund is opened for storage-site studies, and every operator must also hold a greenhouse-gas emissions permit. Operating a storage site without a permit is now a criminal offence under Penal Code Article 348. ANRMPSG and ANRE must issue all implementing procedures within 18 months. National analysis behind the ordinance puts full-chain CCS delivery at 6-7 years, annual capture needs around 62 MtCO2, pipeline transport near 16 Mtpa and geological storage potential of at least 9 Mtpa, with Romania allowing both onshore and offshore storage nationwide.",
        scope:
          'Romania-wide CO2 transport and geological storage: permitting of exploration and storage by ANRMPSG, CO2 transport-network licensing by ANRE, storage inside active petroleum perimeters via the direct-permit route, GHG-permit linkage, and monitoring/closure duties under the transposed CCS Directive.',
        tags: [
          'storage permitting',
          'emergency ordinance',
          'NZIA alignment',
          'transport licensing',
        ],
        impactAnalysis: {
          economic:
            'No direct capture subsidy is created, but the direct-permit route for petroleum holders cuts years and appraisal cost off project timelines, and designation of CCS infrastructure as strategic unlocks EU funding channels tied to the NZIA 50 Mt objective.',
          technical:
            'Codifies Annex-1 site characterisation, EIA-backed storage permits with defined injection parameters, conversion/abandonment rules for reused oil assets, ANRE technical norms for pipeline design and operation, and third-party access with priority rights for anchor users.',
          environmental:
            'Keeps the full Directive-grade safeguard stack — monitoring plans, corrective measures, GHG-permit linkage and criminal liability for unlicensed operation — while the national long-term strategy counts on CCUS for at least 50% captured emissions in non-metallic minerals by 2050.',
        },
        evolution: {
          clusters: [
            'Romania CCS Legislation',
            'EU NZIA Implementation',
            'Romania Energy-Climate Planning',
          ],
          milestones: [
            {
              date: '2011-06-29',
              event:
                'Emergency Ordinance 64/2011 transposed the EU CCS Directive; ANRMPSG designated competent authority.',
            },
            {
              date: '2024-06-29',
              event:
                'EU Net-Zero Industry Act entered into force with the 50 Mt 2030 injection objective.',
            },
            {
              date: '2024-12-05',
              event:
                'Emergency Ordinance 139/2024 published, opening the direct-permit route and ANRE transport licensing.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '2024年第139号政府紧急法令（2024年12月4日通过，刊于第1225/2024号官方公报）重写了罗马尼亚二氧化碳封存制度的操作核心：该制度源于转化欧盟指令（2009/31/EC）的2011年第64号紧急法令（经第114/2013号法律批准）。2024年修订的直接动因是欧盟《净零工业法案》（2024/1735号条例）及其2030年全联盟5000万吨注入目标与油气生产商按比例贡献义务。核心是提速：监管机关ANRMPSG可直接向覆盖场址的有效石油协议持有人签发封存许可，无需前置勘探，前提是已有资料已按附录1完成场地评价且持有人证明技术与资金能力（新增第7条第8^1—8^4款），并明确原石油资产转为封存用途或废弃的规则。配套制度包括：ANRE负责二氧化碳运输管网的设计/建设/运营授权与运营许可；国家地质基金开放用于封存选址研究；经营者须同时持有温室气体排放许可；无证运营封存场构成刑事犯罪（刑法第348条）。ANRMPSG与ANRE须在18个月内出台全部实施细则。法令背后的国家分析估计全链条CCS交付需6—7年、年捕集需求约6200万吨、管道运输约1600万吨/年、地质封存潜力至少900万吨/年，且罗马尼亚全国陆上与海上均允许地质封存。',
        scope:
          '覆盖罗马尼亚全国的二氧化碳运输与地质封存：ANRMPSG负责勘探与封存许可、ANRE负责运输管网许可、现役石油区块内经直接许可路径建封存场、温室气体许可挂钩，以及转化指令下的监测与关闭义务。',
        tags: ['封存许可', '紧急法令', 'NZIA对接', '运输许可'],
        impactAnalysis: {
          economic:
            '未创设直接捕集补贴，但石油协议持有人的直接许可路径可省去数年评价时间与成本；CCS基础设施的战略地位打通了与NZIA 5000万吨目标挂钩的欧盟资金通道。',
          technical:
            '法典化附录1场地评价、附带环评且含注入参数的封存许可、油气旧资产转用或废弃规则、ANRE管道设计运营技术规范，以及锚定用户的第三方准入优先权。',
          environmental:
            '保留指令级完整保障：监测计划、纠正措施、温室气体许可挂钩、无证运营刑事责任；国家长期战略指望CCUS实现2050年非金属矿物行业至少50%排放捕集。',
        },
        evolution: {
          clusters: ['罗马尼亚CCS立法', '欧盟NZIA实施', '罗马尼亚能源气候规划'],
          milestones: [
            {
              date: '2011-06-29',
              event:
                '第64/2011号紧急法令转化欧盟CCS指令，ANRMPSG被指定为主管机关。',
            },
            {
              date: '2024-06-29',
              event: '欧盟《净零工业法案》生效，确立2030年5000万吨注入目标。',
            },
            {
              date: '2024-12-05',
              event:
                '第139/2024号紧急法令公布，开放直接许可路径与ANRE运输许可。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 45,
        label: 'Strategic status, no direct grant',
        evidence:
          'The ordinance creates no capture payment or tax credit; value comes from strategic-project treatment, shortened timelines worth years of appraisal cost, and eligibility for EU channels tied to the NZIA storage objective.',
        citation:
          'OUG 139/2024 preamble (Monitorul Oficial 1225/2024); ANRMPSG general description of geological storage (namr.ro).',
      },
      statutory: {
        score: 80,
        label: 'Binding ordinance-level regime',
        evidence:
          'OUG 139/2024 directly amends OUG 64/2011 (Law 114/2013) with operative permitting articles, ANRMPSG/ANRE competence split, criminal liability under Penal Code Article 348, and an 18-month deadline for implementing procedures.',
        citation:
          'OUG 139/2024 amending OUG 64/2011 (legislatie.just.ro; Monitorul Oficial 1225/2024).',
      },
      market: {
        score: 55,
        label: 'NZIA-linked obligations',
        evidence:
          'The preamble ties the reform to proportional EU oil-and-gas storage obligations and third-party network access with anchor-user priority rights, embedding Romanian storage in the emerging EU-wide capacity market.',
        citation:
          'OUG 139/2024 preamble on Regulation (EU) 2024/1735; new Article 22^1 access rules.',
      },
      strategic: {
        score: 75,
        label: 'PNIESC and LTS anchored',
        evidence:
          'The reform implements PNIESC 2021-2030 emission targets (87% energy, 77% industry cuts) and the long-term strategy counting on CCUS for non-metallic minerals, with a national estimate of 62 Mt annual capture need and 9+ Mtpa storage potential.',
        citation:
          'ANRMPSG general description (namr.ro); Romania Long-Term Strategy for GHG reduction.',
      },
      mrv: {
        score: 65,
        label: 'Permit-embedded monitoring',
        evidence:
          'Storage permits carry EIA-backed monitoring plans with defined injection parameters, GHG-permit linkage, measurement of plume behaviour and leakage risk, and corrective-action duties enforceable through permit withdrawal.',
        citation:
          'OUG 64/2011 as amended (Articles 7-8, 10); OUG 139/2024 Article 7 amendments.',
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

export function applyContentDepthBatch1(db, { auditDate = AUDIT_DATE } = {}) {
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
    const summary = applyContentDepthBatch1(db);
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
    console.error(`Content-depth batch 1 migration failed: ${error.message}`);
    process.exit(1);
  });
}

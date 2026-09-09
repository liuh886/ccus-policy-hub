#!/usr/bin/env node
/**
 * Policy content-depth batch 2B (2026-09): enrich the Australia/Canada
 * flagship records from docs/policy-content-depth-report.md with
 * primary-source-backed bilingual content.
 *
 * - au-safeguard-mechanism (score 29)
 * - au-offshore-ghg-act (score 27)
 * - alberta-tier (score 23)
 * - ca-ccus-itc (score 58)
 *
 * Every claim below traces to the cited primary source (AGENTS.md authority
 * rules — no invented clauses, dates or citations). Target: each record
 * scores >= 70 on re-audit. Known integrity fixes in this batch:
 * - au-safeguard-mechanism and ca-ccus-itc analysis evidence carried
 *   [AI-Generated] markers; all ten dimensions are re-evidenced.
 * - alberta-tier core claim corrected: the $170/t-by-2030 trajectory was
 *   frozen at C$95/t on May 12, 2025 (previously stated as current plan);
 *   December 2025 amendments added. Six analysis dimensions normalised to
 *   five (technical folded into strategic).
 * - au-offshore-ghg-act gains its first five analysis dimensions; the vague
 *   "2023 regulations" claim is replaced with the exact instruments
 *   (Environment 2023, Safety 2024, Resource Management 2025).
 * - ca-ccus-itc EOR exclusion verified against Income Tax Act s.127.44
 *   (dedicated storage only) and kept.
 * Approved 2026-09-09 (data-quality special, Phase 1B flagship-first).
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

export const MIGRATION_ID = 'policy-content-depth-batch2-1b-2026-09';
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
    id: 'au-safeguard-mechanism',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'Guideline/Policy',
    },
    i18n: {
      en: {
        description:
          'The Safeguard Mechanism caps net emissions of about 208 large industrial facilities (over 100,000 tCO2-e per year across coal, metals, oil and gas, manufacturing and transport) on a trajectory to 43% below 2005 levels by 2030 and net zero by 2050: no more than 100 Mt in 2029-30, zero per year from 2049-50, inside a 1,233 Mt decade budget. Reformed in 2023, production-adjusted baselines decline 4.9% each year to 2030 (then 3.285%), with trade-exposed facilities eligible for discounted decline rates. Facilities beating their baseline earn Safeguard Mechanism Credits (SMCs); those above must surrender ACCUs or SMCs or use flexibility measures (trade-exposed adjustments, multi-year monitoring periods, borrowing). Reported 2024-25 outcomes (Clean Energy Regulator, April 2026): covered emissions 132.7 Mt (down 2.4%), baselines 126.1 Mt (down 7.3%), 13.4 million units surrendered (up 49%), 6.7 million SMCs issued, 205 of 208 facilities compliant. For CCUS the mechanism matters twice: as a demand engine for ACCUs (including CCS methods) and because beating baselines through onsite capture is directly rewarded with SMCs.',
        scope:
          'Australian industrial facilities above 100,000 tCO2-e per year: declining production-adjusted emissions baselines, SMC issuance for sub-baseline performance, ACCU/SMC surrender for excess, flexibility measures, cost-containment ACCU supply, and NGER-based measurement, reporting and verification.',
        tags: [
          'Safeguard Mechanism',
          'emissions baselines',
          'SMCs',
          'ACCUs',
          'NGER',
          'industrial decarbonisation',
        ],
        impactAnalysis: {
          economic:
            'Puts a rising compliance price on industrial carbon: SMC spot traded near $38 in late 2025 with a $82.68 cost-containment backstop, so capture projects that push facilities under baseline earn tradeable credits while laggards buy ACCUs in a tightening market.',
          technical:
            'Production-adjusted baselines with facility-specific emissions-intensity values reward onsite abatement including carbon capture; flexibility measures (multi-year monitoring, borrowing, trade-exposed adjustments) give engineering projects time to deliver before surrender bites.',
          environmental:
            'Delivered a 5.8 Mt covered-emissions reduction across the first two reformed years with net emissions down 17.5 Mt (12.7%), tracking below the trajectory to the 100 Mt 2029-30 objective; aggregate headroom was fully removed in 2024-25.',
        },
        evolution: {
          clusters: [
            'Australia Climate Targets',
            'Safeguard Mechanism Reform',
            'ACCU and SMC Markets',
          ],
          milestones: [
            {
              date: '2023-07-01',
              event:
                'The reformed Safeguard Mechanism commenced with recalculated baselines declining 4.9% per year and SMC issuance for sub-baseline performance.',
            },
            {
              date: '2024-04-01',
              event:
                'First reformed compliance deadline passed with high compliance; aggregate headroom was almost completely removed in 2023-24.',
            },
            {
              date: '2026-04-01',
              event:
                'The Clean Energy Regulator reported 2024-25 outcomes: 132.7 Mt covered emissions, 13.4 million units surrendered, 6.7 million SMCs issued, 205 of 208 facilities compliant.',
            },
            {
              date: '2030-06-30',
              event:
                'Baselines reach 65.7% of starting levels; the decline rate steps to 3.285% thereafter toward zero net emissions per year from 2049-50.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '保障机制覆盖约208家大型工业设施（年排放超10万吨二氧化碳当量，含煤炭、金属、油气、制造与交通），基线轨迹对应2030年减排43%、2050年净零：2029-30年净排放不超1亿吨、2049-50年起每年归零、十年预算12.33亿吨。2023年改革后，按产量调整的基线每年下降4.9%至2030年（之后3.285%），贸易暴露设施可适用优惠降幅。低于基线的设施获得保障机制额度（SMC），超排须上缴ACCU或SMC或使用灵活措施（贸易暴露调整、多年监测期、借贷）。2024-25年执行结果（清洁能源监管局，2026年4月）：覆盖排放1.327亿吨（降2.4%）、基线1.261亿吨（降7.3%）、上缴1340万个单位（增49%）、发放SMC 670万个、208家合规205家。对CCUS的意义有二：创造ACCU（含CCS方法学）需求，且现场捕集降排直接赚取SMC。',
        scope:
          '澳大利亚年排放超10万吨的工业设施：逐年下降的产量调整基线、低于基线发放SMC、超排上缴ACCU/SMC、灵活措施、成本控制ACCU供应、基于NGER的监测报告核查。',
        tags: ['保障机制', '排放基线', 'SMC', 'ACCU', 'NGER', '工业脱碳'],
        impactAnalysis: {
          economic:
            '给工业碳定出上涨的合规价格：2025年底SMC现货约38澳元，成本控制后备价82.68澳元；捕集项目把设施推到基线之下即赚取可交易额度，落后者须在收紧的市场购买ACCU。',
          technical:
            '按产量调整、分设施定排放强度的基线奖励现场减排（含碳捕集）；多年监测、借贷、贸易暴露调整等灵活措施给工程项目留出交付时间。',
          environmental:
            '改革后头两年覆盖排放累计降580万吨、净排放降1750万吨（12.7%），低于通往2029-30年1亿吨目标的轨迹；2024-25年总量余量彻底清零。',
        },
        evolution: {
          clusters: ['澳大利亚气候目标', '保障机制改革', 'ACCU与SMC市场'],
          milestones: [
            {
              date: '2023-07-01',
              event:
                '改革后保障机制启动，基线重算并每年下降4.9%，低于基线即发放SMC。',
            },
            {
              date: '2024-04-01',
              event:
                '改革后首个履约截止日高合规通过，2023-24年总量余量基本清零。',
            },
            {
              date: '2026-04-01',
              event:
                '清洁能源监管局公布2024-25年结果：覆盖排放1.327亿吨、上缴1340万单位、发放SMC 670万个、208家合规205家。',
            },
            {
              date: '2030-06-30',
              event:
                '基线降至起始水平的65.7%，之后降幅调为3.285%，迈向2049-50年起每年净零。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 85,
        label: 'SMC Reward Curve',
        evidence:
          'Sub-baseline facilities earn SMCs per tonne beaten while baselines fall 4.9% yearly, so every tonne captured onsite converts mechanically into a tradeable credit appreciating against a tightening cap.',
        citation: 'Clean Energy Regulator safeguard data (Apr 2026)',
      },
      market: {
        score: 95,
        label: 'SMC and ACCU Trading',
        evidence:
          '13.4 million ACCUs and SMCs surrendered in 2024-25 (up 49%), SMC spot near $38 with an $82.68 cost-containment backstop, and a single Unit and Certificate Registry since November 2025 underpin deepening carbon-market liquidity.',
        citation: 'CER quarterly carbon market report (Q3 2025)',
      },
      mrv: {
        score: 85,
        label: 'NGER Reporting',
        evidence:
          'Covered emissions are calculated from National Greenhouse and Energy Reporting Scheme data with independent audit reports, facility-level public baselines-and-emissions tables, and CER assurance resubmissions.',
        citation: 'NGER Act 2007; CER baselines and emissions data',
      },
      statutory: {
        score: 90,
        label: 'NGER Act Basis',
        evidence:
          'Authority flows from the National Greenhouse and Energy Reporting Act 2007 and the NGER (Safeguard Mechanism) Rule 2015, with civil penalties per excess tonne plus daily penalties after the 1 April compliance deadline.',
        citation: 'NGER Act 2007; Safeguard Rule 2015',
      },
      strategic: {
        score: 90,
        label: '43% Reduction Core',
        evidence:
          'The mechanism is the delivery engine for the 43%-by-2030 and net-zero-by-2050 targets: ≤100 Mt net in 2029-30 and zero per year from 2049-50 inside a legislated 1,233 Mt decade trajectory.',
        citation: 'CER 2024-25 safeguard data insights',
      },
    },
  },
  {
    id: 'au-offshore-ghg-act',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'Primary Legislation',
    },
    i18n: {
      en: {
        description:
          'The Offshore Petroleum and Greenhouse Gas Storage Act 2006 is the Commonwealth statute for offshore petroleum and CO2 storage from 3 nautical miles to the exclusive economic zone boundary; carbon dioxide is the only greenhouse-gas substance prescribed under it. It runs a full title chain — assessment permit (competitive work-bid, roughly 6-12 months to award), holding lease, injection licence with approved site plans, then site-closing certificate and surrender — with Key GHG Operation approvals for each on-water activity. The 2024 Safety Amendment (No. 43, assent June 11, 2024) implemented the offshore safety review and clarified eligible storage formations; 2025 amendments (No. 73, in force December 2025) added cross-boundary titles. Activity regulation sits in three instruments: Environment Regulations 2023 (activity-based Environment Plans to ALARP), Safety Regulations 2024, and Resource Management and Administration Regulations 2025 (well operations). Titles advice comes from NOPTA, health/safety/environment from NOPSEMA, decisions from the Responsible Commonwealth Minister (pipeline and infrastructure licences jointly with states), and any appraisal injection additionally needs a Sea Dumping Permit under the London Protocol.',
        scope:
          'Commonwealth offshore waters: GHG assessment, holding and injection titles, site plans and closing certificates, Key GHG Operation approvals, environment plans, well operations and safety cases, pipeline and infrastructure licensing, and Sea Dumping permits for appraisal injection.',
        tags: [
          'offshore storage',
          'OPGGS Act',
          'injection licence',
          'NOPTA',
          'NOPSEMA',
          'site closing',
        ],
        impactAnalysis: {
          economic:
            'Competitive work-bid assessment permits plus a staged title chain let developers prove storage before committing injection capital, while holding leases warehouse appraised formations without forcing premature development spend.',
          technical:
            'Site plans lock reservoir, injection-period and monitoring parameters per licence; Well Operations Management Plans enforce well-integrity performance standards and residual-risk acceptability across drilling, injection and abandonment.',
          environmental:
            'Activity-based Environment Plans must reduce impacts to ALARP with NOPSEMA acceptance, appraisal injection needs a London-Protocol Sea Dumping Permit, and only carbon dioxide is a prescribed substance, bounding the regime to genuine CCS.',
        },
        evolution: {
          clusters: [
            'Australia Offshore Storage',
            'OPGGS Title System',
            'Offshore Safety Reform',
          ],
          milestones: [
            {
              date: '2006-01-01',
              event:
                'The OPGGS Act established the Commonwealth offshore petroleum and greenhouse-gas storage title regime.',
            },
            {
              date: '2023-01-01',
              event:
                'Activity-based Environment Regulations commenced, requiring accepted Environment Plans for GHG activities.',
            },
            {
              date: '2024-06-11',
              event:
                'The Safety Amendment (No. 43) received assent, implementing the offshore safety review and clarifying eligible storage formations.',
            },
            {
              date: '2025-12-05',
              event:
                'The December 2025 compilation brought cross-boundary GHG titles into force (amendments No. 73).',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '《2006年海上石油和温室气体封存法》是澳大利亚联邦管理3海里至专属经济区边界海域石油与二氧化碳封存的法律，目前唯一指定的温室气体物质就是二氧化碳。制度为完整权证链：勘探许可（竞争性工作计划招标，约6-12个月授出）、持有租约、附批准场地计划的注入许可，再到封场证书与交还；每次海上作业另需关键温室气体作业批准。2024年安全修正案（43号，2024年6月11日御准）落实海上安全审查并澄清合格封存地层；2025年修正案（73号，2025年12月生效）新增跨界权证。作业监管分三套规则：2023年环境条例（基于作业的环境计划，降至合理可行最低）、2024年安全条例、2025年资源管理条例（油井作业）。NOPTA负责权证技术建议、NOPSEMA负责健康安全环境、联邦资源部长（管线与基础设施许可与州联合）决策；评价性注入另需符合伦敦议定书的海上倾倒许可。',
        scope:
          '联邦 offshore 海域：温室气体勘探、持有与注入权证、场地计划与封场证书、关键作业批准、环境计划、油井作业与安全论证、管线与基础设施许可、评价性注入的海上倾倒许可。',
        tags: ['海上封存', 'OPGGS法', '注入许可', 'NOPTA', 'NOPSEMA', '封场'],
        impactAnalysis: {
          economic:
            '竞争性工作计划招标加分阶段权证链，让开发商先证实封存潜力再投入注入资本；持有租约可暂存已评价地层而不被迫过早开发支出。',
          technical:
            '场地计划按许可锁定储层、注入期与监测参数；油井作业管理计划对钻井、注入与弃置执行井完整性绩效标准与剩余风险可接受水平。',
          environmental:
            '基于作业的环境计划须经NOPSEMA接受并把影响降至合理可行最低；评价性注入须持伦敦议定书海上倾倒许可；指定物质仅限二氧化碳，把制度限定在真正的CCS。',
        },
        evolution: {
          clusters: ['澳大利亚海上封存', 'OPGGS权证体系', '海上安全改革'],
          milestones: [
            {
              date: '2006-01-01',
              event: 'OPGGS法建立联邦海上石油与温室气体封存权证制度。',
            },
            {
              date: '2023-01-01',
              event:
                '基于作业的环境条例实施，温室气体作业须持被接受的环境计划。',
            },
            {
              date: '2024-06-11',
              event:
                '安全修正案（43号）御准，落实海上安全审查并澄清合格封存地层。',
            },
            {
              date: '2025-12-05',
              event: '2025年12月汇编使跨界温室气体权证生效（73号修正案）。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 70,
        label: 'Title Certainty',
        evidence:
          'Competitive assessment permits with defined 6-12 month award timelines and holding leases give explorers bankable tenure progression from assessment to injection without re-bidding, lowering early-stage holding risk.',
        citation: 'NOPTA offshore CCS approvals fact sheet (2026)',
      },
      statutory: {
        score: 95,
        label: 'OPGGS Act 2006',
        evidence:
          'Primary Commonwealth legislation with three generations of subordinate regulation (Environment 2023, Safety 2024, Resource Management 2025) plus 2024 safety and 2025 cross-boundary amendments, administered through NOPTA advice and ministerial decision.',
        citation: 'OPGGS Act compilation (Dec 2025)',
      },
      market: {
        score: 75,
        label: 'Transferable Titles',
        evidence:
          'Assessment permits, holding leases and injection licences form a tradeable tenure ladder with Joint Authority decisions on pipelines and infrastructure, supporting multi-user storage plays in Commonwealth waters.',
        citation: 'NOPTA offshore CCS approvals fact sheet (2026)',
      },
      strategic: {
        score: 85,
        label: 'Offshore Portfolio Base',
        evidence:
          'The regime underpins the Commonwealth-waters share of the national offshore storage portfolio (44 facility records), the only Australian jurisdiction with a complete assessment-to-closure statute for dedicated CO2 storage.',
        citation: 'OPGGS Act 2006; project-record dataset',
      },
      mrv: {
        score: 85,
        label: 'Site Plan Monitoring',
        evidence:
          'Injection licences embed approved site plans with injection-period, monitoring and reporting duties; well operations and environment plans add integrity performance standards and ALARP impact control with NOPSEMA acceptance.',
        citation: 'OPGGS Act Ch.3; RMA Regulations 2025',
      },
    },
  },
  {
    id: 'alberta-tier',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'Guideline/Policy',
    },
    i18n: {
      en: {
        description:
          'The Technology Innovation and Emissions Reduction (TIER) Regulation is Alberta industrial carbon pricing for large emitters (100,000 tCO2e or hydrogen-import thresholds, plus opt-ins): facilities meet intensity benchmarks by cutting emissions onsite, retiring Emission Performance Credits, Alberta offsets or sequestration credits, or paying into the TIER Fund. The previously scheduled rise to C$170/t by 2030 was halted on May 12, 2025, when the province froze the Fund price at C$95/t, citing trade uncertainty and competitiveness; secondary EPCs and offsets trade near C$28-30 at a discount. CCS matters inside TIER through the CO2 Capture and Permanent Geologic Sequestration protocol: offsets convert to tradeable, bankable sequestration credits (six-year expiry, stackable with the federal Clean Fuels Regulation), convertible further into non-tradeable capture recognition tonnes, with December 2024 updates adding DAC/BECCS removal classifications. December 2025 amendments (O.C. 369/2025) added investment credits and credit reactivation, a direct-investment compliance pathway, small-facility opt-out for 2025, and review by end-2030 — while the freeze raises federal-equivalency questions against the national benchmark.',
        scope:
          'Alberta large industrial emitters: intensity benchmarks, EPC/offset/sequestration-credit retirement (80% of obligation in 2025, 90% from 2026), TIER Fund payments, capture recognition tonnes, direct-investment pathway, and CCS quantification protocols including DAC and BECCS.',
        tags: [
          'TIER',
          'industrial carbon price',
          'sequestration credits',
          'EPCs',
          'fund price freeze',
          'CCUS protocol',
        ],
        impactAnalysis: {
          economic:
            'The C$95 freeze gives short-term cost predictability but weakens the forward price signal for capture investment; secondary-market discounts near C$28-30 keep compliance cheap today while federal-equivalency risk overhangs the 2030 trajectory.',
          technical:
            'Sequestration credits with six-year banking plus capture recognition tonnes reward measured tonnes stored, and the December 2024 protocol update extended removal-credit classification to DAC and BECCS with reversal-discount safeguards.',
          environmental:
            'Intensity benchmarks with tightening credit-use limits (80% in 2025, 90% from 2026) force a rising onsite share, while direct-investment credits (non-transferable, five-year use) tie the newest flexibility to audited low-carbon spend.',
        },
        evolution: {
          clusters: [
            'Alberta Industrial Pricing',
            'TIER CCS Protocols',
            '2025 Price Reset',
          ],
          milestones: [
            {
              date: '2019-01-01',
              event:
                'TIER replaced the Specified Gas Emitters Regulation as Alberta industrial carbon pricing with intensity benchmarks and fund/credit compliance.',
            },
            {
              date: '2024-12-01',
              event:
                'The CO2 Capture and Permanent Geologic Sequestration protocol update added DAC/BECCS removal classifications and post-closure reversal safeguards.',
            },
            {
              date: '2025-05-12',
              event:
                'Alberta froze the TIER Fund price at C$95/t, halting the scheduled rise to C$170/t by 2030 on competitiveness grounds.',
            },
            {
              date: '2025-12-03',
              event:
                'O.C. 369/2025 added investment credits, credit reactivation, a direct-investment pathway and small-facility opt-out, with review due by end-2030.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '技术创新与减排（TIER）条例是阿尔伯塔省工业碳定价，覆盖大排放源（10万吨二氧化碳当量或氢气进口门槛，另加自愿加入）：设施通过现场减排、注销排放绩效额度（EPC）、阿省 offset 或封存额度，或向TIER基金缴费来满足强度基准。原定涨至2030年170加元/吨的计划于2025年5月12日中止，基金价冻结在95加元/吨，理由是贸易不确定性与竞争力；二级市场EPC与offset约28-30加元大幅折价。CCS在TIER内的通道是二氧化碳捕集与永久地质封存核算方法：offset可转为可交易可银行化的封存额度（六年有效，可与联邦清洁燃料条例叠加），再转为不可交易的捕集确认吨；2024年12月更新把直接空气捕集与生物质CCS纳入移除额度分类。2025年12月修正案（369/2025号令）新增投资额度与额度重启、直接投资履约路径、2025年小设施退出，2030年底前复审——但冻结引发与联邦基准的等效性质疑。',
        scope:
          '阿尔伯塔省大型工业排放源：强度基准、EPC/offset/封存额度注销（2025年最高占义务80%、2026年起90%）、TIER基金缴费、捕集确认吨、直接投资路径、含DAC与BECCS的CCS核算方法。',
        tags: [
          'TIER',
          '工业碳价',
          '封存额度',
          'EPC',
          '基金价冻结',
          'CCUS核算方法',
        ],
        impactAnalysis: {
          economic:
            '95加元冻结给出短期成本可预期性，但削弱捕集投资的远期价格信号；二级市场28-30加元折价使当下合规便宜，而联邦等效性风险悬在2030年轨迹之上。',
          technical:
            '六年银行化的封存额度加捕集确认吨奖励实测封存吨数；2024年12月方法更新把DAC与BECCS纳入移除额度分类并设逆转折扣保障。',
          environmental:
            '强度基准配合收紧的额度使用上限（2025年80%、2026年起90%）倒逼现场减排占比上升；新增直接投资额度（不可转让、五年使用）把最新灵活性与经审计的低碳支出挂钩。',
        },
        evolution: {
          clusters: ['阿尔伯塔工业定价', 'TIER CCS方法', '2025年价格重置'],
          milestones: [
            {
              date: '2019-01-01',
              event:
                'TIER取代特定气体排放者条例，成为阿省强度基准加基金/额度履约的工业碳定价。',
            },
            {
              date: '2024-12-01',
              event:
                '二氧化碳捕集与永久地质封存方法更新，把DAC与BECCS纳入移除额度分类并设封场后逆转保障。',
            },
            {
              date: '2025-05-12',
              event:
                '阿省把TIER基金价冻结在95加元/吨，中止原定2030年170加元/吨的上涨路径，理由是竞争力。',
            },
            {
              date: '2025-12-03',
              event:
                '369/2025号令新增投资额度、额度重启、直接投资路径与小设施退出，2030年底前复审。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 85,
        label: 'Fund Price Signal',
        evidence:
          'The C$95/t Fund price sets the compliance ceiling while sequestration credits and EPCs trade at discounts, and the December 2025 investment-credit pathway rewards audited onsite low-carbon spend directly.',
        citation: 'Alberta.ca TIER Regulation; O.C. 369/2025',
      },
      market: {
        score: 80,
        label: 'EPC and Offset Trade',
        evidence:
          'EPCs trade on the Alberta registry with OTC bilateral liquidity plus ICE NGX listing since 2024; sequestration credits bank six years and stack with the federal Clean Fuels Regulation, deepening the compliance-credit market.',
        citation: 'ICAP Alberta TIER factsheet; IETA business brief (Sep 2025)',
      },
      mrv: {
        score: 75,
        label: 'Protocol Verification',
        evidence:
          'The CO2 Capture and Permanent Geologic Sequestration protocol with December 2024 reversal-discount safeguards, registry-tracked EPCs/offsets/sequestration credits and audited investment statements underpin quantified compliance tonnes.',
        citation: 'Alberta CCS quantification protocol (Dec 2024)',
      },
      statutory: {
        score: 90,
        label: 'Crown Pore Space',
        evidence:
          'Provincial Crown ownership of pore space with tenure-based sequestration rights, exercised through the TIER Regulation (A.R. 133/2019) as amended to December 2025, inside federal equivalency under the national benchmark.',
        citation: 'TIER Regulation A.R. 133/2019; O.C. 369/2025',
      },
      strategic: {
        score: 85,
        label: '2030 Emissions Plan',
        evidence:
          'TIER anchors Alberta industrial decarbonisation beside operating capture at Quest and the Pathways Alliance hub scale-up, with the December 2025 review clause (by end-2030) and the Canada-Alberta energy MOU framing the next settlement including a CA$130 minimum effective price question.',
        citation:
          'Alberta Emissions Reduction and Energy Development Plan; Dentons (Dec 2025)',
      },
    },
  },
  {
    id: 'ca-ccus-itc',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'Guideline/Policy',
    },
    i18n: {
      en: {
        description:
          'The Carbon Capture, Utilization and Storage Investment Tax Credit is a refundable federal credit for eligible CCUS capital expenditure from January 1, 2022 to December 31, 2040, enacted through Bill C-59 (royal assent June 20, 2024) and administered by Natural Resources Canada (project-plan evaluation) with the Canada Revenue Agency (claims). Rates for 2022-2030 are 60% for direct-air-capture equipment, 50% for other capture, and 37.5% for transport, storage and use, halving for 2031-2040; 10 percentage points are lost without meeting prevailing-wage and apprenticeship requirements for property prepared or installed after November 28, 2023. Support of about $11.4 billion is expected through 2027-28. Eligibility hinges on a qualified project with a ~20-year review period and at least 10% eligible use each period (with clawback on shortfall): eligible use is solely dedicated geological storage with no enhanced oil recovery, or qualified concrete storage in Canada or the United States. The design answers the U.S. 45Q with a Canadian instrument favouring permanent storage.',
        scope:
          'Canadian CCUS capital expenditure 2022-2040: capture (including DAC), transport, dedicated geological storage and qualified concrete use; NRCan project-plan verification, CRA claims, labour requirements, eligible-use tracking with recovery rules.',
        tags: [
          'CCUS ITC',
          'refundable tax credit',
          'Bill C-59',
          '45Q response',
          'dedicated storage',
          'labour requirements',
        ],
        impactAnalysis: {
          economic:
            'Up to 60% refundable credits on capture equipment transform project finance for oil-sands, fertilizer and cement capture, stackable with provincial support such as Alberta ACCIP, with $11.4 billion expected through 2027-28.',
          technical:
            'NRCan technical guidance plus mandatory project-plan evaluation with verified property lists filter for engineering-ready storage and transport, while dual-use equipment is pro-rated so only the CCUS share qualifies.',
          environmental:
            'The eligible-use gate (dedicated storage or qualified concrete, EOR expressly ineligible, 10% minimum with clawback) hard-wires permanence into the subsidy, excluding atmospheric release and oil-recovery uses by statute.',
        },
        evolution: {
          clusters: [
            'Canada 2030 Emissions Reduction Plan',
            'Clean Economy ITCs',
            'Alberta TIER Alignment',
          ],
          milestones: [
            {
              date: '2023-03-28',
              event:
                'Budget 2023 detailed the CCUS ITC design with tiered rates and labour requirements.',
            },
            {
              date: '2024-06-20',
              event:
                'Bill C-59 received royal assent, enacting the CCUS ITC with NRCan evaluation and CRA administration.',
            },
            {
              date: '2024-01-01',
              event:
                'NRCan technical guidance and the CCUS project-plan submission portal operationalised claims for 2022-onward expenditure.',
            },
            {
              date: '2026-04-21',
              event:
                'CRA guidance restated the 2022-2040 window with halved rates from 2031 and the 10% eligible-use recovery machinery.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '碳捕集利用与封存投资税收抵免是联邦可退还抵免，覆盖2022年1月1日至2040年12月31日的合格CCUS资本支出，经C-59法案（2024年6月20日御准）立法，由自然资源部（项目计划评估）与税务局（抵免申报）分工执行。2022-2030年税率：直接空气捕集设备60%、其他捕集50%、运输封存利用37.5%，2031-2040年减半；2023年11月28日后备妥或安装的资产若不满足现行工资与学徒要求扣减10个百分点。预计到2027-28年支持114亿加元。资格取决于约20年审查期的合格项目且每期合格用途不低于10%（不足 clawback 追回）：合格用途仅限专用地质封存（禁用提高采收率）或加美两国的合格混凝土封存。该设计以偏好永久封存的加拿大工具回应美国45Q竞争。',
        scope:
          '加拿大2022-2040年CCUS资本支出：捕集（含直接空气捕集）、运输、专用地质封存与合格混凝土利用；自然资源部项目计划核查、税务局申报、劳工要求、合格用途追踪与追回规则。',
        tags: [
          'CCUS ITC',
          '可退还抵免',
          'C-59法案',
          '回应45Q',
          '专用封存',
          '劳工要求',
        ],
        impactAnalysis: {
          economic:
            '捕集设备最高60%可退还抵免重塑油砂、化肥、水泥捕集项目的融资，可与阿省ACCIP等省级支持叠加，预计到2027-28年支持114亿加元。',
          technical:
            '自然资源部技术指南加强制项目计划评估（附核实资产清单）筛选工程就绪的封存与运输，双用途设备按CCUS占比折算，仅CCUS部分合格。',
          environmental:
            '合格用途门槛（专用封存或合格混凝土、提高采收率明确排除、10%下限加追回）把永久性写进补贴，以法律排除大气排放与采油用途。',
        },
        evolution: {
          clusters: ['加拿大2030减排计划', '清洁经济ITC', '阿尔伯塔TIER衔接'],
          milestones: [
            {
              date: '2023-03-28',
              event: '2023年预算细化CCUS ITC分档税率与劳工要求设计。',
            },
            {
              date: '2024-06-20',
              event:
                'C-59法案御准，CCUS ITC立法生效，自然资源部评估、税务局执行。',
            },
            {
              date: '2024-01-01',
              event:
                '自然资源部技术指南与项目计划提交通道运行，2022年起支出可申报。',
            },
            {
              date: '2026-04-21',
              event:
                '税务局指南重申2022-2040窗口、2031年起税率减半与10%合格用途追回机制。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 90,
        label: '50-60% Capex Credit',
        evidence:
          'Refundable credits of 60% (DAC), 50% (capture) and 37.5% (transport, storage, use) for 2022-2030 expenditure directly cut capture CAPEX, stackable with provincial programmes such as Alberta ACCIP.',
        citation: 'Income Tax Act s.127.44; NRCan CCUS ITC guidance',
      },
      market: {
        score: 80,
        label: 'TIER Integration',
        evidence:
          'Federal credits combine with Alberta TIER sequestration credits and Clean Fuels Regulation stacking so the same stored tonne can monetise several instruments, deepening the cross-jurisdiction CCUS revenue stack.',
        citation: 'NRCan CCUS ITC guidance; Alberta TIER protocols',
      },
      mrv: {
        score: 85,
        label: 'NRCan Verification',
        evidence:
          'NRCan issues initial and revised project-plan evaluations with verified property lists, CRA audits claims, and the eligible-use percentage (tracked per period with recovery rules) enforces measured storage outcomes.',
        citation: 'CRA CCUS ITC administration (2026); Income Tax Act s.211.92',
      },
      statutory: {
        score: 90,
        label: 'Income Tax Act Basis',
        evidence:
          'Enacted as sections 127.44 and 211.92 of the Income Tax Act via Bill C-59 (assent June 20, 2024), with detailed expenditure, dual-use and labour-requirement machinery in statute rather than policy guidance.',
        citation: 'Bill C-59, Statutes of Canada 2024 c.15',
      },
      strategic: {
        score: 85,
        label: '2030 Mitigation Core',
        evidence:
          'Positioned as the economic engine of the 2030 Emissions Reduction Plan for heavy industry, with about $11.4 billion through 2027-28 and a 2022-2040 window covering oil-sands, fertilizer and cement capture at scale.',
        citation: 'NRCan ITC launch (Jun 2024); Budget 2023',
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

export function applyContentDepthBatch2B(db, { auditDate = AUDIT_DATE } = {}) {
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
    const summary = applyContentDepthBatch2B(db);
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
    console.error(`Content-depth batch 2B migration failed: ${error.message}`);
    process.exit(1);
  });
}

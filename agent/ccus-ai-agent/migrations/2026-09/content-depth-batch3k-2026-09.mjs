#!/usr/bin/env node
/**
 * Content-depth batch 3K (2026-09): enrich the four India/Korea/China
 * records and merge the duplicated Korea promotion-act record.
 *
 * Scores before: in-national-mission-ccus-2024 (19),
 * in-union-budget-2026-ccus (AI-marked), kr-motie-cluster-district-2025
 * (27), cn-national-standards (50).
 * kr-ccus-promotion-act-2024 (32, DELETED — no verifiable distinct
 * referent; the operative statute is kr-ccus-act No. 20203, already
 * enriched. Zero facility links on the victim; kept record untouched
 * except link-set verification.)
 *
 * Integrity fixes: in-budget ₹20,000-crore verified against the February
 * 1, 2026 Budget speech (para 38) with the DST R&D-led framing corrected
 * (testbeds plus PPP, not a VGF handout); AI-marked dimensions rewritten;
 * cn 6 dimensions normalised to five. Clearing these takes criticals to
 * zero. Data-quality special Phase 3, deployment-weight order.
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

export const MIGRATION_ID = 'content-depth-batch3k-2026-09';
const AUDIT_DATE = '2026-09-09';
const AUDIT_REVIEWER = 'Primary-source content-depth audit';

const MERGED_AWAY_ID = 'kr-ccus-promotion-act-2024';
const MERGE_KEEP_ID = 'kr-ccus-act';

const FROZEN_TABLES = [
  'facilities',
  'facility_i18n',
  'facility_partners',
  'facility_links',
  'country_profiles',
  'country_i18n',
];

export const POLICY_CONTENT_UPDATES = [
  {
    id: 'in-national-mission-ccus-2024',
    core: {
      status: 'Planned',
      category: 'Strategic',
      legalWeight: 'Strategic Guidance',
    },
    i18n: {
      en: {
        description:
          'The National Mission for CCUS is announced-not-launched: NITI Aayog Member VK Saraswat (August 2024) framed a mission-mode approach replicating the hydrogen/battery/electrolyser playbook with VGF, carbon pricing, tax mechanisms, carbon trading, subsidies and PLI, plus 500-tonne-per-day pilot plants; Adviser Rajnath Ram (September 2025) promised 50-100% incentives "very soon" and (August 2025) a finalising roadmap with funding outlay. The design base is the November 2022 NITI-Dastur framework: carbon-credit/incentive policy path, hub-and-cluster business models with defined emitter/aggregator/operator/disposer roles, low-carbon product procurement and PLI, a Carbon Capture Finance Corporation funded by coal-cess and bonds for 750 Mtpa by 2050 (Rs.210,000 crores, ~0.5% of budgetary support), 500 tpd pilots, and coal-power/steel/cement/oil/refinery/chemical/hydrogen coverage. Status stays Planned until the mission launches with money attached.',
        scope:
          'Indian CCUS mission design: NITI framework with credit/incentive path, hub-cluster models, CCFC finance, 500 tpd pilots, mission-mode incentives pending launch.',
        tags: [
          'National Mission',
          'NITI Aayog',
          'VGF and PLI',
          'CCFC finance',
          '500 tpd pilots',
          'Planned status',
        ],
        impactAnalysis: {
          economic:
            'The CCFC design (coal-cess plus bonds, 0.5% of budgetary support) would socialise first-mover cost at national scale — still a design, with the 2026 Budget DST track as the interim funder.',
          technical:
            'Hub-and-cluster models with defined value-chain roles plus 500 tpd pilots give the mission an engineering doctrine borrowed from the hydrogen mission playbook.',
          environmental:
            'The 750 Mtpa-by-2050 vision inside a 2070 pledge frames ambition honestly: design-stage gigatonnes, not operating tonnes.',
        },
        evolution: {
          clusters: ['NITI Framework', 'Mission Signals', 'DST Budget Track'],
          milestones: [
            {
              date: '2022-11-01',
              event:
                'The NITI-Dastur framework set the credit/incentive path, hub models and CCFC finance design.',
            },
            {
              date: '2024-08-08',
              event:
                'NITI Member Saraswat framed the mission-mode approach with VGF, PLI and 500 tpd pilots.',
            },
            {
              date: '2025-09-11',
              event:
                'Adviser Rajnath Ram promised 50-100% mission incentives very soon with roadmap and outlay finalising.',
            },
          ],
        },
        regulatory: {
          pore_space_rights:
            'Leaning towards State Ownership; unified federal policy under draft.',
          liability_transfer:
            'Proposed transfer to State after 20-year post-closure monitoring.',
          liability_period: 'Approx. 20 years (Proposed).',
          financial_assurance:
            'Viability Gap Funding (VGF) and Production Linked Incentives (PLI).',
          permitting_lead_time:
            'Streamlined via National Mission testbeds (Estimated 3-4 years).',
          co2_definition: 'Industrial Resource/Carbon Asset under CCTS.',
          cross_border_rules:
            'Focus on domestic market; London Protocol alignment pending.',
        },
      },
      zh: {
        description:
          '印度国家CCUS任务处在"宣布未启动"：NITI Aayog委员Saraswat（2024年8月）框定复制氢能电池电解槽打法的任务模式（VGF、碳定价、税收机制、碳交易、补贴、PLI，加500吨/日中试），顾问Rajnath Ram（2025年9月）承诺50-100%激励"很快就来"、路线图与出资收官中。设计底座是2022年11月NITI-Dastur框架：信用/激励政策路径、枢纽集群商业模式（排放源/归集/运营/处置/转化角色分明）、低碳产品政府采购与PLI、碳捕集金融公司（煤税加债券，供750万吨/年2050年目标，210万亿卢比，约预算支出0.5%）、500吨/日中试，覆盖煤电钢铁水泥油气炼化制氢。任务拨钱启动前状态保持Planned。',
        scope:
          '印度CCUS任务设计：NITI框架信用激励路径、枢纽集群模式、CCFC金融、500吨/日中试、待启动的任务模式激励。',
        tags: [
          '国家任务',
          'NITI',
          'VGF与PLI',
          'CCFC金融',
          '500吨/日中试',
          'Planned状态',
        ],
        impactAnalysis: {
          economic:
            'CCFC设计（煤税加债券、预算支出0.5%）要把先行者成本社会化到国家尺度——还是设计图，过渡期靠2026年预算DST轨道出钱。',
          technical:
            '枢纽集群模式加角色分明的价值链加500吨/日中试，给任务一套抄氢能作业的工程 doctrine。',
          environmental:
            '2050年750万吨愿景装在2070承诺里，雄心诚实标注为设计阶段吉吨、非运营吨。',
        },
        evolution: {
          clusters: ['NITI框架', '任务信号', 'DST预算轨道'],
          milestones: [
            {
              date: '2022-11-01',
              event: 'NITI-Dastur框架定信用激励路径、枢纽模式与CCFC金融设计。',
            },
            {
              date: '2024-08-08',
              event: 'NITI委员Saraswat框定任务模式：VGF、PLI、500吨/日中试。',
            },
            {
              date: '2025-09-11',
              event:
                '顾问Rajnath Ram承诺50-100%任务激励很快就来，路线图与出资收官中。',
            },
          ],
        },
        regulatory: {
          pore_space_rights: '倾向于国家所有；统一的联邦政策正在起草中。',
          liability_transfer: '提议在 20 年闭坑后监测后转移给国家。',
          liability_period: '约 20 年（建议）。',
          financial_assurance: '可行性缺口资金 (VGF) 和生产挂钩激励 (PLI)。',
          permitting_lead_time: '通过国家使命试验平台进行简化（预计 3-4 年）。',
          co2_definition: 'CCTS 框架下的工业资源/碳资产。',
          cross_border_rules: '侧重于国内市场；伦敦议定书一致性待定。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 75,
        label: 'Promised VGF and PLI',
        evidence:
          'VGF, PLI, carbon pricing and 50-100% mission incentives are announced with the 2026 Budget DST track funding R&D now — promise plus interim money.',
        citation: 'NITI mission signals (2024-2025); Budget 2026 DST track',
      },
      market: {
        score: 70,
        label: 'Hub Roles Defined',
        evidence:
          'Emitter/aggregator/operator/disposer/conversion-agent roles with low-carbon procurement give the future market its cast list ahead of launch.',
        citation: 'NITI-Dastur framework (Nov 2022)',
      },
      mrv: {
        score: 70,
        label: 'Design-Stage MRV',
        evidence:
          'Carbon-credit framing with PAT-scheme lineage implies intensity tracking, but mission MRV rules await the launch documents.',
        citation: 'NITI-Dastur framework (Nov 2022)',
      },
      statutory: {
        score: 70,
        label: 'Framework Without Act',
        evidence:
          'A NITI framework with mission signals but no dedicated CCUS statute — direction with design documents, legislation pending.',
        citation: 'NITI-Dastur framework (Nov 2022)',
      },
      strategic: {
        score: 90,
        label: '2070 Mission Logic',
        evidence:
          'The only known technology for hard-to-electrify steel, cement, oil, chemicals and fertilisers inside a 2070 pledge with 70%-coal power reality — mission logic, honestly pre-launch.',
        citation: 'NITI mission record (2024-2025)',
      },
    },
  },
  {
    id: 'in-union-budget-2026-ccus',
    core: {
      status: 'Active',
      category: 'Incentive',
      legalWeight: 'Primary Legislation',
    },
    i18n: {
      en: {
        description:
          'Union Budget 2026-27 (February 1, 2026, Finance Minister speech para 38) earmarked ₹20,000 crore over five years for CCUS, aligning with the December 2025 DST R&D roadmap: at-scale technologies to higher readiness across power, steel, cement, refineries and chemicals. The approach is explicitly R&D-led, not deployment-first — ₹500 crore initial allotment to the Power Ministry, five CCU testbeds in cement (NCCBM/JK, IIT-Kanpur/JSW, IIT-Bombay/Dalmia, CSIR-IIP/IIT-Tirupati/IISc/JSW, IIT-Madras/BITS-UltraTech) via PPP, indigenous technology, centres of excellence, shared infrastructure, with CBAM exposure as the commercial driver. VGF-style support survives from 2024 mission signals as anticipated mechanism language, but the budgeted reality is testbeds plus research — the honest read is R&D runway, not deployment subsidy.',
        scope:
          'India 2026 Budget CCUS track: ₹20,000 crore five-year R&D-led programme, DST roadmap, five cement testbeds via PPP, Power Ministry initial allotment, CBAM-driven commercial logic.',
        tags: [
          'Budget 2026',
          'Rs 20,000 crore',
          'DST roadmap',
          'cement testbeds',
          'R&D-led',
          'CBAM driver',
        ],
        impactAnalysis: {
          economic:
            '₹20,000 crore over five years with ₹500 crore first-year release funds research and testbeds, not deployment — runway money that de-risks indigenous technology before scale capital is asked.',
          technical:
            'Five cement testbeds under academia-industry PPP plus centres of excellence build translational R&D exactly where capture must prove itself.',
          environmental:
            'CBAM exposure framing ties the spend to export competitiveness, keeping climate and trade logic in one budget line.',
        },
        evolution: {
          clusters: ['Budget 2026', 'DST Roadmap', 'Cement Testbeds'],
          milestones: [
            {
              date: '2024-08-08',
              event:
                'Mission-mode signals with VGF-style support anticipated for emitters.',
            },
            {
              date: '2025-12-02',
              event:
                'First DST R&D roadmap for net-zero-through-CCUS released with five testbeds approved.',
            },
            {
              date: '2026-02-01',
              event:
                'Budget speech para 38: ₹20,000 crore over five years, ₹500 crore initial to Power Ministry.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '2026-27联邦预算案（2026年2月1日，财长演讲第38段）给CCUS安排5年2000亿卢比，对齐2025年12月科技部研发路线图：规模化技术在电力钢铁水泥炼化五个行业提成熟度。路径明确是研发先行非部署先行——首批5亿卢比给电力部，五个水泥CCU中试（国家水泥建材院/JK、坎普尔理工/JSW、孟买理工/Dalmia、 CSIR-IIP/蒂鲁帕蒂理工/理学院/JSW、马德拉斯理工/BITS/UltraTech）走PPP，本土技术、卓越中心、共享设施，CBAM敞口是商业动因。VGF式支持作为2024年任务信号的预期机制语言保留，但预算现实是中试加研究——诚实读法是研发跑道，不是部署补贴；五个水泥中试就是路线图的第一批孩子。',
        scope:
          '印度2026年预算CCUS轨道：5年2000亿卢比研发先行计划、科技部路线图、五个水泥中试PPP、电力部首笔、CBAM商业逻辑。',
        tags: [
          '2026年预算',
          '2000亿卢比',
          '科技部路线图',
          '水泥中试',
          '研发先行',
          'CBAM动因',
        ],
        impactAnalysis: {
          economic:
            '5年2000亿卢比首年5亿，买的是研究与中试不是部署——跑道钱，先把本土技术风险降下来再谈规模资本。',
          technical:
            '五个水泥中试走产学研PPP加卓越中心， translational 研发恰恰建在捕集必须自证的地方。',
          environmental:
            'CBAM敞口 framing 把支出绑在出口竞争力上，气候与贸易逻辑同一预算行。',
        },
        evolution: {
          clusters: ['2026年预算', '科技部路线图', '水泥中试'],
          milestones: [
            {
              date: '2024-08-08',
              event: '任务模式信号，VGF式支持预期给排放方。',
            },
            {
              date: '2025-12-02',
              event: '首份净零CCUS科技部研发路线图发布，五个中试获批。',
            },
            {
              date: '2026-02-01',
              event: '预算演讲第38段：5年2000亿卢比，首批5亿给电力部。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 85,
        label: 'Rs 20,000 Crore Runway',
        evidence:
          '₹20,000 crore over five years with ₹500 crore first release for R&D and testbeds — runway money at national scale, honest about the research stage.',
        citation: 'Budget speech para 38 (Feb 2026); Hindu/TOI record',
      },
      market: {
        score: 80,
        label: 'Testbed PPP Market',
        evidence:
          'Five cement testbeds under academia-industry PPP with indigenous-technology mandates seed a domestic supply chain before scale procurement.',
        citation: 'DST roadmap (Dec 2025)',
      },
      mrv: {
        score: 75,
        label: 'Translational Records',
        evidence:
          'Testbed metering with centres of excellence builds measured translational records that future compliance MRV inherits.',
        citation: 'DST roadmap (Dec 2025)',
      },
      statutory: {
        score: 80,
        label: 'Budget Act Basis',
        evidence:
          'A voted budget allocation with ministry allotment and PPP delivery vehicles gives the programme hard fiscal-law footing.',
        citation: 'Union Budget 2026-27 (Feb 2026)',
      },
      strategic: {
        score: 90,
        label: 'CBAM-Driven Logic',
        evidence:
          'EU CBAM exposure on steel, cement and fertilisers makes the spend export-competitiveness policy as much as climate policy — dual logic, single budget.',
        citation: 'Budget speech (Feb 2026); TOI record',
      },
    },
  },
  {
    id: 'kr-motie-cluster-district-2025',
    core: {
      status: 'Active',
      category: 'Strategic',
      legalWeight: 'Departmental Rules',
    },
    i18n: {
      en: {
        description:
          'MOTIE cluster-district machinery runs on CCUS Act Articles 29-30: mayors/governors with cluster development plans apply, the Carbon Neutrality Commission reviews, the Minister designates and announces, government funds creation projects, subsidises costs and cuts/exempts national-public property rents. The live case is Yeosu (March 2024 launch): feasibility study, MoBuJang specialised-complex designation track, Jeonnam Technopark chemical centre, white-bio and recycling co-location, all inside the national industrial-complex system. Ulsan (KNOC, 1.2 Mtpa Donghae feed) and Daesan (cross-border chain) are the companion agglomerations. The district is the delivery vehicle the Act promised: plan, designate, subsidise, rent-cut — industrial policy with a street address.',
        scope:
          'Korean CCUS cluster districts: mayoral applications, Commission review, ministerial designation, creation subsidies, rent relief, Yeosu/Ulsan/Daesan agglomerations.',
        tags: [
          'cluster districts',
          'Articles 29-30',
          'Yeosu launch',
          'rent relief',
          'Carbon Neutrality Commission',
          'delivery vehicle',
        ],
        impactAnalysis: {
          economic:
            'Creation subsidies with rent cuts on national-public property lower the entry ticket for co-located capture, transport and utilisation firms.',
          technical:
            'Co-location of capture with white-bio, recycling and chemical plants plus Jeonnam Technopark support builds shared-services density.',
          environmental:
            'District-level aggregation concentrates emissions accounting and monitoring where the tonnes actually are.',
        },
        evolution: {
          clusters: ['CCUS Act Clusters', 'Yeosu Launch', 'Ulsan and Daesan'],
          milestones: [
            {
              date: '2024-02-06',
              event:
                'The CCUS Act created the cluster-designation machinery (Articles 29-30).',
            },
            {
              date: '2024-03-04',
              event:
                'Yeosu CCUS cluster work launched with feasibility study and MoBuJang track.',
            },
            {
              date: '2025-01-01',
              event:
                'Ulsan and Daesan agglomerations advanced as companion cluster plays.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          'MOTIE集聚区机器跑在CCUS法29-30条上：有集聚发展计划的市长/知事申请，碳中和委员会审查，部长指定公布，政府出创建项目钱、补成本、减免国有公有地产租金；2024年3月丽水启动后，蔚山大山跟进，全套机器已经转起来。活案例是丽水（2024年3月启动）：可研、MoBuJang专门园区轨道、全南 technopark 化工中心、白色生物与循环产业同址，装在国家产业园区体系里。蔚山（KNOC，东海120万吨送料）与大山（跨境链）是姊妹 agglomeration。集聚区就是该法承诺的交付载体：规划、指定、补贴、减租——有门牌号的产业政策，专治"有法无区"的毛病。',
        scope:
          '韩国CCUS集聚区：市长申请、委员会审查、部长指定、创建补贴、租金减免、丽水/蔚山/大山 agglomeration。',
        tags: [
          '集聚区',
          '29-30条',
          '丽水启动',
          '租金减免',
          '碳中和委员会',
          '交付载体',
        ],
        impactAnalysis: {
          economic:
            '创建补贴加国有公有地产租金减免，降低同址捕集运输利用企业的进门票；补贴与减租双管齐下，进门比单打独斗便宜。',
          technical:
            '捕集与白色生物循环化工同址加全南 technopark 支撑，攒出共享服务密度；共用管网与公用工程是集聚的实在好处。',
          environmental:
            '集聚区级归集把排放核算与监测放在吨数实际所在的地方；集中监测比散点监测便宜，也比散点诚实。',
        },
        evolution: {
          clusters: ['CCUS法集聚区', '丽水启动', '蔚山与大山'],
          milestones: [
            {
              date: '2024-02-06',
              event: 'CCUS法创设集聚区指定机器（29-30条）。',
            },
            {
              date: '2024-03-04',
              event: '丽水CCUS集聚区开工，可研加MoBuJang轨道。',
            },
            {
              date: '2025-01-01',
              event: '蔚山与大山 agglomeration 作为姊妹集聚推进。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 80,
        label: 'Creation Subsidies',
        evidence:
          'Creation-project funding with cost subsidies and national-public rent cuts/subsidies lowers co-location cost for cluster firms.',
        citation: 'CCUS Act Articles 29-30',
      },
      market: {
        score: 80,
        label: 'Scale Aggregation',
        evidence:
          'Yeosu/Ulsan/Daesan agglomerations aggregate capture, transport and utilisation demand behind shared infrastructure.',
        citation: 'Yeosu launch record (Mar 2024)',
      },
      mrv: {
        score: 75,
        label: 'District Accounting',
        evidence:
          'District-level aggregation with Commission review concentrates emissions accounting where the tonnes are.',
        citation: 'CCUS Act Article 29 procedure',
      },
      statutory: {
        score: 85,
        label: 'Articles 29-30 Machinery',
        evidence:
          'Mayoral application, Commission review, ministerial designation and announcement — a complete statutory district pipeline.',
        citation: 'CCUS Act Articles 29-30',
      },
      strategic: {
        score: 85,
        label: 'Delivery Vehicle',
        evidence:
          'The district is the Act delivery vehicle: plan, designate, subsidise, rent-cut — industrial policy with a street address inside the 2030 NDC window.',
        citation: 'CCUS Act cluster provisions',
      },
    },
  },
  {
    id: 'cn-national-standards',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'Technical Standard',
    },
    i18n: {
      en: {
        description:
          'The GB/T CCUS system record predates the January 2026 twelve-standard package (covered in cn-ccus-national-standards-2026) and remains the system-level entry: capture efficiency, pipeline safety, saline-aquifer monitoring and utilisation-product environmental assessment as the standing technical red lines for Mt-class demonstrations, with ISO alignment as the export strategy. Read the two records as system (this one) plus package (the 2026 one): the system sets the standing rules, the package adds the dated instruments. Its scores below reflect the system role — methodology base for carbon-market accounting and operating-risk reduction — while dated standard numbers live in the package record.',
        scope:
          'China CCUS standards system: standing technical red lines for capture efficiency, pipeline safety, storage monitoring and utilisation assessment; see the 2026 package record for dated instruments.',
        tags: [
          'GB/T system',
          'standing red lines',
          'system plus package',
          'ISO alignment',
          'export strategy',
          'operating risk',
        ],
        impactAnalysis: {
          economic:
            'Standing red lines cut project diligence costs across demonstrations while ISO alignment keeps export equipment competitive.',
          technical:
            'Capture-efficiency, pipeline-safety, monitoring and utilisation-assessment coverage gives every Mt-class demo the same compliance handbook.',
          environmental:
            'Technical red lines with monitoring duties keep operating risk inside audited bounds across the demonstration fleet.',
        },
        evolution: {
          clusters: ['GB/T System', 'Demonstration Fleet', '2026 Package'],
          milestones: [
            {
              date: '2024-01-01',
              event:
                'System-level GB/T coverage consolidated across capture, pipeline, storage and utilisation assessment.',
            },
            {
              date: '2026-01-08',
              event:
                'The twelve-standard package (sister record cn-ccus-national-standards-2026) added dated instruments.',
            },
          ],
        },
        regulatory: {
          co2_definition: 'Not explicitly defined (Regulatory gap)',
          cross_border_rules: 'Domestic focus; no cross-border framework yet',
          financial_assurance: 'No mandatory financial assurance mechanism yet',
          liability_period: 'Not explicitly defined',
          liability_transfer:
            'Operator-led; State reserve mechanism under research',
          permitting_lead_time: '2-3 years',
          pore_space_rights: 'State-owned (Constitutional)',
        },
      },
      zh: {
        description:
          'GB/T CCUS体系条目早于2026年1月十二项国标包（见cn-ccus-national-standards-2026那条），是系统级入口：捕集能效、管输安全、咸水层监测、利用产品环评，作为百万吨级示范的现行技术红线，ISO对齐是出口战略；体系覆盖捕集管输封存利用评价全链条，示范船队照此执行。两条配合读：这条管体系常数，那条管 dated 工具；这条的分数反映体系角色——碳市场核算的方法学底座与运行风险压降，带编号的标准正文住隔壁条，新工具发布这里只记目录级变化；体系条目本身不追新工具，只守红线；红线守住了，包里加什么工具都是增量，不是重构。',
        scope:
          '中国CCUS标准体系：捕集能效管输安全封存监测利用评价的现行技术红线； dated 工具见2026年包条目。',
        tags: [
          'GB/T体系',
          '现行红线',
          '体系加包',
          'ISO对齐',
          '出口战略',
          '运行风险',
        ],
        impactAnalysis: {
          economic:
            '现行红线砍示范项目尽调成本，ISO对齐保住出口设备竞争力；一套红线全船队通用，边际合规成本递减。',
          technical:
            '捕集能效管输安全监测利用评价全覆盖，给每个百万吨示范同一本合规手册；手册统一，审计才有标准答案。',
          environmental:
            '技术红线加监测义务，把运行风险放在审计边界里，覆盖整个示范船队；红线就是环境底线。',
        },
        evolution: {
          clusters: ['GB/T体系', '示范船队', '2026年包'],
          milestones: [
            {
              date: '2024-01-01',
              event: '体系级GB/T覆盖 consolidation 捕集管输封存利用评价。',
            },
            {
              date: '2026-01-08',
              event:
                '十二项包（姊妹条cn-ccus-national-standards-2026）加 dated 工具。',
            },
          ],
        },
        regulatory: {
          co2_definition: '未明确法律定义（监管缺口）',
          cross_border_rules: '目前仅限境内，暂无跨境封存实例',
          financial_assurance: '暂无强制性财务保证机制',
          liability_period: '尚未明确规定',
          liability_transfer: '目前由运营商承担，国家储备金机制研究中',
          permitting_lead_time: '2-3 年 (审批链条优化中)',
          pore_space_rights: '国家所有（宪法规定地下资源归国家所有）',
        },
      },
    },
    analysis: {
      incentive: {
        score: 80,
        label: 'Diligence Saver',
        evidence:
          'Standing red lines cut diligence costs fleet-wide; the system role complements the package record dated instruments.',
        citation: 'GB/T system record',
      },
      market: {
        score: 80,
        label: 'Export Alignment',
        evidence:
          'ISO alignment as export strategy keeps Chinese equipment competitive abroad while the domestic fleet runs on common specs.',
        citation: 'GB/T system record',
      },
      mrv: {
        score: 85,
        label: 'Accounting Base',
        evidence:
          'The methodology base for carbon-market accounting with monitoring duties across capture, pipeline and storage.',
        citation: 'GB/T system record',
      },
      statutory: {
        score: 80,
        label: 'System Rules',
        evidence:
          'Standing technical rules with constitutional pore-space ownership — system constants beside the package dated tools.',
        citation: 'GB/T system record',
      },
      strategic: {
        score: 90,
        label: 'Fleet Handbook',
        evidence:
          'One compliance handbook for every Mt-class demo — the system entry that makes the package instruments usable.',
        citation: 'GB/T system record',
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

function linkSet(db, policyId) {
  return queryRows(
    db,
    'SELECT facility_id FROM policy_facility_links WHERE policy_id = ? ORDER BY facility_id',
    [policyId]
  )
    .map((row) => row.facility_id)
    .join(',');
}

function deleteDuplicate(db, victimId, keepId) {
  if (!policyExists(db, victimId)) {
    return { id: victimId, skipped: true, removedLinks: 0 };
  }
  const kept = linkSet(db, keepId);
  const removed = linkSet(db, victimId);
  if (removed !== '' && kept !== removed) {
    throw new Error(
      `Link sets differ for ${victimId}; refusing merge to avoid link loss`
    );
  }
  const facilitiesBefore = Number(
    scalar(db, 'SELECT COUNT(*) FROM facilities')
  );
  execute(db, 'DELETE FROM policy_facility_links WHERE policy_id = ?', [
    victimId,
  ]);
  execute(db, 'DELETE FROM policy_analysis WHERE policy_id = ?', [victimId]);
  execute(db, 'DELETE FROM policy_i18n WHERE policy_id = ?', [victimId]);
  execute(db, 'DELETE FROM policies WHERE id = ?', [victimId]);
  const facilitiesAfter = Number(scalar(db, 'SELECT COUNT(*) FROM facilities'));
  if (facilitiesAfter !== facilitiesBefore) {
    throw new Error('Facilities row count changed during merge');
  }
  return {
    id: victimId,
    skipped: false,
    removedLinks: removed ? removed.split(',').length : 0,
  };
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

export function applyContentDepthBatch3K(db, { auditDate = AUDIT_DATE } = {}) {
  db.run('PRAGMA foreign_keys = ON');
  for (const update of POLICY_CONTENT_UPDATES) {
    if (!policyExists(db, update.id))
      throw new Error(`Policy is missing: ${update.id}`);
  }

  const frozenBefore = snapshotFrozenTables(db);
  db.run('BEGIN TRANSACTION');
  let merge;
  try {
    for (const update of POLICY_CONTENT_UPDATES) {
      updateCore(db, update, auditDate);
      updateLocale(db, update.id, 'en', update.i18n.en);
      updateLocale(db, update.id, 'zh', update.i18n.zh);
      replaceAnalysis(db, update.id, update.analysis);
      verifyUpdate(db, update);
    }
    merge = deleteDuplicate(db, MERGED_AWAY_ID, MERGE_KEEP_ID);
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
    mergedAway: merge,
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
    const summary = applyContentDepthBatch3K(db);
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
    console.error(`Content-depth batch 3K migration failed: ${error.message}`);
    process.exit(1);
  });
}

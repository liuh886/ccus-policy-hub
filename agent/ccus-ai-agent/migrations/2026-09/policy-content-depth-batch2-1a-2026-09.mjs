#!/usr/bin/env node
/**
 * Policy content-depth batch 2A (2026-09): enrich the US/UK flagship records
 * from docs/policy-content-depth-report.md with primary-source-backed
 * bilingual content.
 *
 * - us-doe-carbon-management-strategy (score 25)
 * - uk-ccus-vision (score 27)
 * - uk-ccs-network-code (score 43)
 * - us-epa-class-vi-primacy (score 70, pushed toward healthy)
 *
 * Every claim below traces to the cited primary source (AGENTS.md authority
 * rules — no invented clauses, dates or citations). Target: each record
 * scores >= 70 on re-audit. Known integrity fixes in this batch:
 * - uk-ccs-network-code status Planned -> Active (CCS Network Code of
 *   January 2025 is operative and governs FID'd Track-1 networks).
 * - uk-ccus-vision analysis evidence carried [AI-Generated] markers; all
 *   five dimensions are re-evidenced from DESNZ publications.
 * - us-epa-class-vi-primacy unsourced claims (permit counts, moratorium)
 *   are removed; Arizona (2025) and Texas (2025) milestones added.
 * Approved 2026-09-09 (data-quality special, Phase 1A flagship-first).
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

export const MIGRATION_ID = 'policy-content-depth-batch2-1a-2026-09';
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
    id: 'us-doe-carbon-management-strategy',
    core: {
      status: 'Under development',
      category: 'Strategic',
      legalWeight: 'Draft Strategy',
    },
    i18n: {
      en: {
        description:
          'The U.S. Department of Energy posted its Carbon Management Strategy as a draft for public comment on October 10, 2024 (Office of Fossil Energy and Carbon Management with the Office of Clean Energy Demonstrations; comment period extended to December 31, 2024). The DOE page, last updated December 9, 2024, still identifies the document as a draft rather than a final binding strategy. The strategy sets near-term programme priorities through 2030 under five objectives: funding priority use cases with the fewest decarbonisation alternatives, building regional CO2 transport and storage clusters, supporting interagency policy and regulatory implementation, engaging communities and workers, and international cooperation. Its resource base is the Bipartisan Infrastructure Law (about $12 billion for carbon management over 2022-2026, on top of $500M+ annual appropriations in FY2023) together with the Inflation Reduction Act reform of the 45Q credit, with a near-term aim of 25-30 million tonnes per year of technological carbon removal by 2030. A March 2025 FECM fact sheet reframes the programme around energy dominance and cost reduction, signalling continuity of deployment funding under changed political framing.',
        scope:
          'U.S. federal DOE carbon-management programme priorities through 2030: research, demonstration and deployment funding, CO2 transport and storage infrastructure (including CIFIA finance and CarbonSAFE storage hubs), interagency policy coordination, community and workforce engagement, and international cooperation.',
        tags: [
          'carbon management strategy',
          'FECM',
          'OCED',
          'Bipartisan Infrastructure Law',
          '45Q',
          'carbon removal',
          'CO2 transport and storage',
        ],
        impactAnalysis: {
          economic:
            'Directs about $12 billion of Bipartisan Infrastructure Law funding plus reformed 45Q credits toward commercial-scale demonstrations, regional storage hubs and shared transport infrastructure, de-risking first-mover CCS and carbon-removal investments.',
          technical:
            'Organises delivery through CarbonSAFE storage hubs, the CarbonSTORE field-laboratory initiative, CarbonBASE basin assessment and the point-source capture programme (100+ bench-scale technologies, 46 validated at TRL 6), with FEED studies for multi-source CO2 networks.',
          environmental:
            'Frames deployment inside community-benefit plans and environmental protections, targeting net-zero power by 2035 and economy-wide by 2050, with 25-30 Mt/yr of technological carbon removal by 2030 as the measurable near-term outcome.',
        },
        evolution: {
          clusters: [
            'DOE Carbon Management',
            'Bipartisan Infrastructure Law',
            'FECM Demonstration Programmes',
          ],
          milestones: [
            {
              date: '2021-11-15',
              event:
                'The Bipartisan Infrastructure Law appropriated about $12 billion for carbon management over 2022-2026, shifting DOE from research toward large-scale pilots and deployment.',
            },
            {
              date: '2022-08-16',
              event:
                'The Inflation Reduction Act reformed the 45Q credit, raising values and widening eligibility for capture, storage, utilisation and removal.',
            },
            {
              date: '2024-10-10',
              event:
                'DOE posted the Carbon Management Strategy as a draft for public comment (FECM with OCED); the comment period closed December 31, 2024 and the document remains a draft.',
            },
            {
              date: '2025-03-01',
              event:
                'A FECM fact sheet restated the programme around energy dominance, cost reduction and the Validation-Activation-Expansion phases for transport and storage.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '美国能源部于2024年10月10日发布《碳管理战略》草案并公开征求意见（化石能源与碳管理办公室FECM联同清洁能源示范办公室OCED起草，征求意见延至2024年12月31日）。能源部页面（2024年12月9日最后更新）仍将其标识为草案，而非最终具有约束力的战略。该战略提出至2030年的五大近期目标：资助缺乏替代减排手段的优先应用场景、建设区域二氧化碳运输与封存集群、支持跨部门政策法规落实、社区与劳动力参与、国际合作。资金基础是《两党基础设施法》约120亿美元碳管理拨款（2022-2026，另加2023财年5亿多美元年度拨款）以及《通胀削减法案》改革后的45Q税收抵免，近期目标是2030年技术碳移除达到每年2500-3000万吨。2025年3月FECM情况说明将该计划重新表述为服务能源主导与降本，显示政治表述变化下部署资金的延续性。',
        scope:
          '美国联邦能源部至2030年碳管理计划重点：研发示范与部署资金、二氧化碳运输与封存基础设施（含CIFIA融资与CarbonSAFE封存枢纽）、跨部门政策协调、社区与劳动力参与、国际合作。',
        tags: [
          '碳管理战略',
          'FECM',
          '两党基础设施法',
          '45Q',
          '碳移除',
          '二氧化碳运输与封存',
        ],
        impactAnalysis: {
          economic:
            '将约120亿美元两党基础设施法资金与改革后的45Q抵免导向商业规模示范、区域封存枢纽与共享运输基础设施，降低首批CCS与碳移除投资风险。',
          technical:
            '通过CarbonSAFE封存枢纽、CarbonSTORE野外实验室、CarbonBASE盆地评估与点源捕集计划组织实施（100多项台架技术、46项达TRL 6验证），并开展多源二氧化碳管网前端工程设计研究。',
          environmental:
            '将部署置于社区受益计划与环境保护框架内，目标是2035年电力净零、2050年全经济净零，2030年技术碳移除2500-3000万吨/年为可衡量的近期成果。',
        },
        evolution: {
          clusters: ['美国能源部碳管理', '两党基础设施法', 'FECM示范计划'],
          milestones: [
            {
              date: '2021-11-15',
              event:
                '两党基础设施法拨款约120亿美元用于2022-2026年碳管理，能源部由研发转向大规模中试与部署。',
            },
            {
              date: '2022-08-16',
              event:
                '通胀削减法案改革45Q抵免，提高额度并扩大捕集、封存、利用与移除的适用范围。',
            },
            {
              date: '2024-10-10',
              event:
                '能源部发布碳管理战略草案征求意见，截止2024年12月31日，文件至今仍为草案。',
            },
            {
              date: '2025-03-01',
              event:
                'FECM情况说明重申运输与封存的验证—激活—扩展三阶段路线，强调能源主导与降本。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 85,
        label: 'BIL Plus 45Q Stack',
        evidence:
          'About $12 billion of Bipartisan Infrastructure Law funding over 2022-2026 plus the IRA-reformed 45Q credit jointly underwrite demonstrations, storage hubs and transport networks; CIFIA adds $2.1 billion in loan guarantees and grants for oversized CO2 transport infrastructure.',
        citation: 'DOE Carbon Management Strategy (Oct 2024 draft)',
      },
      statutory: {
        score: 80,
        label: 'BIL and IRA Authority',
        evidence:
          'Funding authority flows from the Bipartisan Infrastructure Law and the Inflation Reduction Act; permitting interfaces run through the Safe Drinking Water Act Class VI programme and coordinated task forces on CCUS permitting reform.',
        citation: 'DOE Carbon Management Strategy (Oct 2024 draft)',
      },
      market: {
        score: 80,
        label: 'Regional Cluster Buildout',
        evidence:
          'The strategy funds regional transport and storage clusters anchored by capture projects, with FEED studies for multi-source networks and CIFIA support for shared infrastructure sized for future capacity additions.',
        citation: 'DOE Carbon Management Strategy (Oct 2024 draft)',
      },
      strategic: {
        score: 90,
        label: 'Five Objectives to 2030',
        evidence:
          'Five intertwined objectives to 2030: priority use cases, regional infrastructure clusters, effective policy frameworks, community and workforce engagement, and global cooperation, targeting 25-30 Mt/yr of technological carbon removal.',
        citation: 'DOE Carbon Management Strategy (Oct 2024 draft)',
      },
      mrv: {
        score: 70,
        label: 'Lifecycle Accounting Base',
        evidence:
          'Strategy-wide analysis activities cover techno-economics, life-cycle accounting and energy-systems modelling; storage-side MRV builds on the Class VI monitoring regime and CarbonSTORE field validation of pressure and plume behaviour.',
        citation: 'DOE Carbon Management Strategy (Oct 2024 draft)',
      },
    },
  },
  {
    id: 'uk-ccus-vision',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'Guideline/Policy',
    },
    i18n: {
      en: {
        description:
          'The December 2023 CCUS Vision sets the UK pathway to four clusters by 2030 storing 20-30 Mtpa of CO2, moving from market creation (Track-1/Track-2 sequencing with bilateral funding) toward a self-sustaining market largely free of government support in the 2030s. Funding stepped from up to £20 billion (March 2023) to £21.7 billion over 25 years (October 2024). Track-1 full business cases for HyNet and the East Coast Cluster were approved in July-August 2024; the East Coast Cluster transport and storage network reached financial close on December 10, 2024 (the UK first), HyNet followed on April 24, 2025, with construction from mid-2025 and operation from 2028. Track-1 expansion (HyNet) took six further projects into negotiations (Project Negotiation List, July 2025); Track-2 covers Acorn and Viking CCS. DESNZ analysis attributes £4-5 billion of annual GVA and 50,000 jobs potential in the 2030s, and the March 2026 CCUS Council is preparing deployment pathways for Spending Review 2027.',
        scope:
          'UK-wide CCUS market creation to 2030 and transition to a self-sustaining market in the 2030s: Track-1/Track-2 cluster sequencing, capture business models (ICC, DPA, hydrogen, waste, GGR), CO2 transport and storage economic licensing, and supply-chain and skills growth.',
        tags: [
          'CCUS Vision',
          'cluster sequencing',
          'Track-1',
          '20-30 Mtpa',
          'self-sustaining market',
          'business models',
        ],
        impactAnalysis: {
          economic:
            '£21.7 billion committed over 25 years anchors the first two clusters and is designed to crowd in private capital; financial closes in December 2024 and April 2025 converted negotiated support into investible transport and storage networks.',
          technical:
            'Cluster sequencing shares transport and storage infrastructure across power, industry, hydrogen, waste and removals emitters, with 8.5 Mtpa combined peak storage targeted across Track-1 and expansion headroom via the HyNet top-up process.',
          environmental:
            'Positions CCUS as the decarbonisation route for heavy industry, flexible power and engineered removals inside Carbon Budgets, with storage regulation and monitoring duties carried through the Energy Act 2023 licensing regime.',
        },
        evolution: {
          clusters: [
            'UK CCUS Market Creation',
            'Track-1 Clusters',
            'Self-Sustaining Market Transition',
          ],
          milestones: [
            {
              date: '2023-12-20',
              event:
                'The CCUS Vision was published: four clusters by 2030, 20-30 Mtpa, market creation phasing into a self-sustaining market in the 2030s.',
            },
            {
              date: '2024-10-04',
              event:
                'Government committed £21.7 billion over 25 years for the first CCUS clusters in the North West and North East of England.',
            },
            {
              date: '2024-12-10',
              event:
                'The East Coast Cluster transport and storage network reached financial close, the first such milestone in the UK.',
            },
            {
              date: '2025-04-24',
              event:
                'The HyNet transport and storage network reached financial close; Track-1 expansion took six further projects into negotiations in July 2025.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '2023年12月发布的CCUS愿景规划了英国到2030年建成四个集群、年封存2000-3000万吨二氧化碳的路径：先以Track-1/Track-2集群排序加双边谈判资金创建市场，2030年代转向基本摆脱政府补贴的自持市场。资金由2023年3月的200亿英镑加码至2024年10月的217亿英镑（25年期）。HyNet与东海岸集群的一期完整商业论证于2024年7-8月获批；东海岸集群运输与封存网络于2024年12月10日实现财务交割（英国首次），HyNet于2025年4月24日跟进，2025年中开工、2028年投运。一期扩容（HyNet）另有六个项目进入谈判（2025年7月谈判名单）；二期为Acorn与Viking CCS。能源安全与净零部分析认为2030年代该产业年均可贡献40-50亿英镑增加值并支撑5万个岗位；2026年3月CCUS委员会正为2027年支出审查准备部署路径。',
        scope:
          '英国2030年前CCUS市场创建及2030年代转向自持市场：Track-1/Track-2集群排序、捕集商业模式（工业、电力、氢能、废弃物、温室气体移除）、二氧化碳运输与封存经济许可、供应链与技能增长。',
        tags: [
          'CCUS愿景',
          '集群排序',
          'Track-1',
          '年封存2000-3000万吨',
          '自持市场',
          '商业模式',
        ],
        impactAnalysis: {
          economic:
            '217亿英镑25年期承诺锚定前两个集群并撬动私人资本；2024年12月与2025年4月两次财务交割把谈判支持转化为可投资的运输与封存网络。',
          technical:
            '集群排序让电力、工业、氢能、废弃物与移除类排放源共享运输封存设施，一期目标两集群合计峰值封存850万吨/年，并经HyNet补足机制预留扩容空间。',
          environmental:
            '把CCUS定位为重工业、灵活电力与工程移除在碳预算内的脱碳路径，封存监管与监测义务经2023年能源法许可制度落实。',
        },
        evolution: {
          clusters: ['英国CCUS市场创建', 'Track-1集群', '自持市场转型'],
          milestones: [
            {
              date: '2023-12-20',
              event:
                'CCUS愿景发布：2030年四个集群、年封存2000-3000万吨，市场创建阶段之后转向2030年代自持市场。',
            },
            {
              date: '2024-10-04',
              event:
                '政府承诺217亿英镑25年期资金支持英格兰西北与东北首批CCUS集群。',
            },
            {
              date: '2024-12-10',
              event: '东海岸集群运输与封存网络实现财务交割，为英国首次。',
            },
            {
              date: '2025-04-24',
              event:
                'HyNet运输与封存网络实现财务交割；一期扩容六个项目于2025年7月进入谈判。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 95,
        label: 'GBP 21.7B Fund',
        evidence:
          '£21.7 billion committed over 25 years (October 2024) for the first clusters, following the March 2023 envelope of up to £20 billion; capture revenue support runs through ICC, Dispatchable Power Agreement, hydrogen and waste business models.',
        citation: 'GOV.UK UK CCUS collection (Apr 2025)',
      },
      market: {
        score: 75,
        label: 'Competitive Allocation',
        evidence:
          'Track-1/Track-2 cluster sequencing with bilateral negotiation moves toward competitive allocation and a Transition Access Agreement for limited-support users; Track-1 expansion opened to unsupported users signalling the self-sustaining market direction.',
        citation: 'CCUS Vision (Dec 2023); TAA position statement (Jul 2026)',
      },
      mrv: {
        score: 80,
        label: 'T&S Codes',
        evidence:
          'Measurement, impurity monitoring and compliance demonstration sit in the CCS Network Code Measurement Requirements Annexure per acceding network, under Ofgem economic-licence oversight.',
        citation: 'CCS Network Code (Jan 2025)',
      },
      statutory: {
        score: 90,
        label: 'Energy Act 2023',
        evidence:
          'The Energy Act 2023 created the economic licensing regime for CO2 transport and storage with Ofgem as regulator, underpinning Track-1 licences, financial assistance powers and the counterparty framework.',
        citation:
          'Energy Act 2023; Track-1 accounting officer assessment (Mar 2025)',
      },
      strategic: {
        score: 100,
        label: '20-30 Mtpa (2030)',
        evidence:
          'Four clusters by 2030 storing 20-30 Mtpa with at least 50 Mtpa by the mid-2030s; both Track-1 networks reached financial close (December 2024, April 2025) and six expansion projects entered negotiations in July 2025.',
        citation:
          'CCUS Vision (Dec 2023); GOV.UK UK CCUS collection (Apr 2025)',
      },
    },
  },
  {
    id: 'uk-ccs-network-code',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'Market Rule',
    },
    i18n: {
      en: {
        description:
          'The CCS Network Code gives effect to the CO2 Transport and Storage Licence conditions: it sets the commercial, operational and technical arrangements between Users and transport and storage companies, plus governance, replacing ad-hoc negotiation with a code comparable to gas and electricity network codes. DESNZ consulted on updated Heads of Terms from December 2023 to February 2024 (28 responses) and published a government response; the full-form CCS Network Code followed in January 2025. An Initial Code covers the Track-1 networks, with accession through the Code Agreement at Final Investment Decision and later changes via the Section B modification procedure (Third Party Participants and Ofgem-designated non-code parties included). Section C governs connection applications through a government-led selection process for supported users. The July 2026 Transition Access Agreement position statement treats the Code as operative (e.g. Registered Capacity Financial Security at £0 for initial users), and a 2026 consultation on fair access to CO2 infrastructure reviews the overlap between the Code and the 2011 Access to Infrastructure Regulations.',
        scope:
          'All licensed UK CO2 transport and storage networks (onshore and offshore): User connection and delivery, network operation and maintenance, metering and CO2 quality, charging and financial security, governance and modifications, dispute resolution, and third-party access interfaces.',
        tags: [
          'network code',
          'third-party access',
          'economic licence',
          'Ofgem',
          'Track-1',
          'connection agreements',
        ],
        impactAnalysis: {
          economic:
            'Standardised connection, charging and financial-security terms cut transaction costs for multi-user networks; the Initial Code deliberately targets simplicity so Track-1 projects could reach financial close without bespoke commercial frameworks.',
          technical:
            'Common Interface Procedures (emergency, start-up/shut-down, isolation, CO2 quality monitoring) plus per-network Measurement Requirements Annexures define impurity testing, sampling and re-connection compliance across licensed networks.',
          environmental:
            'Regulated third-party access with transparent non-discrimination duties maximises utilisation of permitted storage capacity, avoiding stranded assets and duplicate pipelines while keeping safety and metering obligations enforceable.',
        },
        evolution: {
          clusters: [
            'UK T&S Economic Regulation',
            'CCS Network Code',
            'Third-Party Access Reform',
          ],
          milestones: [
            {
              date: '2022-06-01',
              event:
                'Draft Heads of Terms for the Code were first published for industry engagement.',
            },
            {
              date: '2023-12-01',
              event:
                'DESNZ consulted on updated Heads of Terms (closed February 2024, 28 responses) to inform full-form drafting.',
            },
            {
              date: '2025-01-01',
              event:
                'The full-form CCS Network Code took shape as the operative commercial interface for licensed networks.',
            },
            {
              date: '2026-01-01',
              event:
                'A fair-access consultation opened on reconciling the Code with the 2011 Access to Infrastructure Regulations for the self-sustaining-market phase.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          'CCS网络代码落实二氧化碳运输与封存许可证条件：规定用户与运输封存公司之间的商业、运行与技术安排及治理机制，以统一规则取代一事一议，其作用类似天然气与电力网络代码。能源安全与净零部于2023年12月至2024年2月就更新版关键条款征求意见（28份反馈）并发布政府回应；完整版CCS网络代码于2025年1月形成。首版代码覆盖Track-1网络，用户在最终投资决定时签署代码协议加入，后续变更走B节修订程序（含第三方参与方与Ofgem指定的非代码方）；C节规定经政府主导遴选程序的接入申请。2026年7月过渡接入协议立场文件把该代码视为现行规则（如首批用户注册容量财务担保为零）；2026年公平接入咨询则在审查该代码与2011年基础设施接入规章的重叠。',
        scope:
          '英国全部持证二氧化碳运输与封存网络（含陆上与海上）：用户接入与交付、网络运行维护、计量与二氧化碳品质、收费与财务担保、治理与修订、争议解决、第三方接入接口。',
        tags: [
          '网络代码',
          '第三方接入',
          '经济许可',
          'Ofgem',
          'Track-1',
          '连接协议',
        ],
        impactAnalysis: {
          economic:
            '统一的接入、收费与财务担保条款降低多用户网络的交易成本；首版代码刻意求简，使Track-1项目无需定制商业框架即可达成财务交割。',
          technical:
            '通用接口程序（应急、启停、隔离、二氧化碳品质监测）加各网络计量要求附件，统一杂质检测、取样与恢复连接的合规标准。',
          environmental:
            '受监管的第三方接入与透明非歧视义务最大化已许可封存容量的利用率，避免资产搁浅与管道重复建设，同时保持安全与计量义务可执行。',
        },
        evolution: {
          clusters: ['英国运输封存经济监管', 'CCS网络代码', '第三方接入改革'],
          milestones: [
            {
              date: '2022-06-01',
              event: '关键条款草案首次发布征求行业意见。',
            },
            {
              date: '2023-12-01',
              event:
                '能源部就更新版关键条款公开咨询（2024年2月截止，共28份反馈），为完整版起草提供依据。',
            },
            {
              date: '2025-01-01',
              event: '完整版CCS网络代码形成，成为持证网络现行的商业接口规则。',
            },
            {
              date: '2026-01-01',
              event:
                '公平接入咨询启动，协调该代码与2011年基础设施接入规章，服务自持市场阶段。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 95,
        label: 'Cluster Sequencing',
        evidence:
          'Revenue certainty runs through ICC, Dispatchable Power Agreement and hydrogen business models inside Track-1/Track-2 sequencing; the Code itself lowers entry cost by standardising connection and charging instead of bespoke deals.',
        citation: 'DESNZ CCUS business models; CCS Network Code (Jan 2025)',
      },
      market: {
        score: 85,
        label: 'Network Code',
        evidence:
          'The January 2025 Code establishes multi-user market rules (connection, delivery, operation, governance, disputes) with a modification procedure open to Third Party Participants, mirroring gas and electricity code practice.',
        citation: 'CCS Network Code (Jan 2025)',
      },
      statutory: {
        score: 95,
        label: 'Storage Licensing',
        evidence:
          'The Energy Act 2023 licensing regime prohibits unlicensed CO2 transport and storage and obliges licensees to maintain the Code; storage licensing itself sits with the North Sea Transition Authority alongside economic regulation by Ofgem.',
        citation: 'Energy Act 2023; NSTA storage licensing guidance',
      },
      strategic: {
        score: 100,
        label: 'Net Zero 2050',
        evidence:
          'The Code is the commercial backbone of the 20-30 Mtpa 2030 vision: both Track-1 networks acceded at financial close (December 2024, April 2025) and expansion plus non-pipeline transport users connect through its procedures.',
        citation:
          'CCUS Vision (Dec 2023); GOV.UK UK CCUS collection (Apr 2025)',
      },
      technical: {
        score: 90,
        label: 'Track-1/2 Clusters',
        evidence:
          'Common Interface Procedures and per-network Measurement Annexures standardise CO2 quality, metering and commissioning across capture from power, cement, hydrogen and waste sources feeding the first licensed networks.',
        citation: 'CCS Network Code (Jan 2025)',
      },
    },
  },
  {
    id: 'us-epa-class-vi-primacy',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'Administrative Regulation',
    },
    i18n: {
      en: {
        description:
          'Class VI primacy is the delegation mechanism by which qualified states assume primary enforcement authority for CO2 geological-storage wells under the Safe Drinking Water Act, replacing direct EPA permitting with state programmes that must meet 40 CFR Parts 144, 145 and 146. North Dakota (2018) and Wyoming (2020) were first; Louisiana followed with a final rule effective February 5, 2024 (Louisiana Department of Natural Resources, after Act 378 of 2023 and 45,000+ public comments); Arizona was approved September 10, 2025; Texas was approved November 7, 2025 with effectiveness December 15, 2025, the Railroad Commission of Texas taking over as the sixth primacy state; Colorado entered proposed-rule stage on March 16, 2026. EPA retains authority on Indian lands everywhere and oversees state programmes through quarterly non-compliance and annual performance reporting. The practical effect is permitting administered closer to the geology and the applicant, inside a federal stringency floor.',
        scope:
          'U.S. Class VI wells for geologic carbon sequestration: state assumption of permitting, compliance and enforcement under SDWA section 1422, subject to federal technical and legal review, public participation, tribal consultation, and continuing EPA oversight.',
        tags: [
          'Class VI',
          'primacy',
          'Safe Drinking Water Act',
          'UIC',
          'state permitting',
          'geologic storage',
        ],
        impactAnalysis: {
          economic:
            'State-administered permitting compresses review timelines for storage developers, protecting 45Q-eligible investments whose construction must begin before the statutory window closes, and lets commissions such as the Texas RRC clear inherited federal backlogs.',
          technical:
            'States must demonstrate programmes meeting 40 CFR Parts 144, 145 and 146, building dedicated geological, modelling and monitoring capacity (site characterisation, plume tracking, well integrity) equivalent to the federal baseline.',
          environmental:
            'Delegation does not lower the bar: drinking-water protection is fixed by federal standards, EPA keeps Indian-lands authority, and oversight runs on quarterly non-compliance plus annual performance reports under 40 CFR 144.8.',
        },
        evolution: {
          clusters: [
            'US Safe Drinking Water Act (SDWA)',
            '45Q Compliance Infrastructure',
            'State-led Carbon Management',
          ],
          milestones: [
            {
              date: '2010-12-10',
              event:
                'EPA promulgated the Class VI rule for CO2 geologic sequestration wells under the Safe Drinking Water Act.',
            },
            {
              date: '2018-04-24',
              event:
                'North Dakota became the first primacy state; Wyoming followed in 2020.',
            },
            {
              date: '2024-02-05',
              event:
                'Louisiana primacy took effect (LDNR authority; final rule of January 5, 2024 after Act 378 and extensive public comment).',
            },
            {
              date: '2025-09-10',
              event:
                'Arizona primacy approved; Texas approved November 7, 2025 (effective December 15, 2025, RRC authority, sixth state); Colorado proposed March 16, 2026.',
            },
          ],
        },
        regulatory: {
          pore_space_rights: 'Private Ownership (Surface Owner rules)',
          liability_transfer: 'No Federal Transfer (Site Care: 50 years)',
          liability_period: '50 years (Default Class VI)',
          financial_assurance: 'Mandatory (Trust/Bond/Insurance)',
          permitting_lead_time: '2-6 years (State Primacy accelerates)',
          co2_definition: 'Solid waste or commodity (State dependent)',
          cross_border_rules: 'Not applicable (Domestic)',
        },
      },
      zh: {
        description:
          'VI类井执法权委派是合格州依据《安全饮用水法》接管二氧化碳地质封存井主要执法权的机制，以达到联邦40 CFR第144、145、146编标准的州计划取代EPA直接审批。北达科他州（2018年）与怀俄明州（2020年）率先获批；路易斯安那州最终规则2024年2月5日生效（自然资源部管辖，此前经2023年378号法案补正并收到4.5万多条公众意见）；亚利桑那州2025年9月10日获批；得克萨斯州2025年11月7日获批、12月15日生效，由铁路委员会接管，成为第六个获权州；科罗拉多州2026年3月16日进入拟议规则阶段。EPA在所有印第安保留地保留管辖权，并通过季度违规与年度绩效报告持续监督各州计划。其实质是把审批放到离地质与申请人更近的地方，同时守住联邦标准底线。',
        scope:
          '美国地质碳封存VI类井：各州依据安全饮用水法1422条接管许可、合规与执法，须经联邦技术法律审查、公众参与、部落协商，并接受EPA持续监督。',
        tags: [
          'VI类井',
          '执法权委派',
          '安全饮用水法',
          'UIC',
          '州级审批',
          '地质封存',
        ],
        impactAnalysis: {
          economic:
            '州级审批压缩封存开发商审查周期，保护须在法定期限前开工的45Q合格投资，并让得州铁路委员会等机构清理联邦积压申请。',
          technical:
            '各州须证明其计划达到联邦40 CFR第144、145、146编要求，建设相应的地质、模拟与监测能力（场址表征、羽流追踪、井完整性），与联邦基线等效。',
          environmental:
            '下放不降低标准：饮用水保护由联邦标准锁定，EPA保留印第安保留地管辖，并按40 CFR 144.8实行季度违规加年度绩效报告监督。',
        },
        evolution: {
          clusters: ['美国安全饮用水法', '45Q合规基础设施', '州主导碳管理'],
          milestones: [
            {
              date: '2010-12-10',
              event: 'EPA依据安全饮用水法颁布二氧化碳地质封存VI类井规则。',
            },
            {
              date: '2018-04-24',
              event: '北达科他州成为首个获权州，怀俄明州2020年跟进。',
            },
            {
              date: '2024-02-05',
              event:
                '路易斯安那州执法权生效（自然资源部管辖；2024年1月5日最终规则，此前经378号法案与广泛公众评议）。',
            },
            {
              date: '2025-09-10',
              event:
                '亚利桑那州获批；得州2025年11月7日获批、12月15日生效（铁路委员会管辖，第六州）；科罗拉多州2026年3月进入拟议阶段。',
            },
          ],
        },
        regulatory: {
          pore_space_rights: '私人所有（地表所有者规则）',
          liability_transfer: '无联邦转移（场址维护：50 年）',
          liability_period: '50 年（默认 Class VI）',
          financial_assurance: '强制性（信托/债券/保险）',
          permitting_lead_time: '2-6 年（州级管辖加速）',
          co2_definition: '固体废物或商品（取决于各州）',
          cross_border_rules: '不适用（国内）',
        },
      },
    },
    analysis: {
      incentive: {
        score: 75,
        label: 'Regulatory Streamlining',
        evidence:
          'State-administered Class VI permitting shortens review timelines versus direct federal permitting, protecting 45Q-eligible storage investments and lowering pre-FID carrying costs for hub developers.',
        citation: 'EPA UIC primacy programme; 40 CFR Part 145',
      },
      market: {
        score: 75,
        label: 'Permit Certainty',
        evidence:
          'Primacy localises the approval process in commissions with dedicated carbon-storage staff (ND, WY, LDNR, RRC), giving developers a predictable counterparty; six states held primacy by end-2025 with Colorado in rulemaking.',
        citation: 'EPA UIC primacy status (2026); Texas final rule (Nov 2025)',
      },
      mrv: {
        score: 75,
        label: 'Stringency Parity',
        evidence:
          'State programmes must meet or exceed federal Class VI and Subpart RR monitoring, reporting and verification standards as a condition of approval under SDWA section 1422.',
        citation: '40 CFR Parts 144, 145, 146',
      },
      statutory: {
        score: 95,
        label: 'EPA Primacy',
        evidence:
          'Federal delegation of enforcement authority to qualified states under SDWA section 1422, granted by EPA final rulemaking after technical and legal review, public participation and tribal consultation.',
        citation: '40 CFR Part 145; Louisiana final rule (Jan 2024)',
      },
      strategic: {
        score: 85,
        label: 'Permitting Backbone',
        evidence:
          'The 2024-2026 primacy wave (Louisiana, Arizona, Texas, with Colorado proposed) puts the permitting backbone for the largest national storage fleet under state administration, matching deployment scale with regulatory capacity.',
        citation: 'EPA UIC primacy status (2026)',
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

export function applyContentDepthBatch2A(db, { auditDate = AUDIT_DATE } = {}) {
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
    const summary = applyContentDepthBatch2A(db);
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
    console.error(`Content-depth batch 2A migration failed: ${error.message}`);
    process.exit(1);
  });
}

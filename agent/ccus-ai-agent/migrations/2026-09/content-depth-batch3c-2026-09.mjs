#!/usr/bin/env node
/**
 * Content-depth batch 3C (2026-09): enrich the four China records with
 * primary-source-backed bilingual content.
 *
 * Scores before: cn-ccer (45), cn-ordos-pilot-2024 (26),
 * cn-zero-carbon-parks (33), cn-demo-tech-2024 (26).
 *
 * Integrity fixes: cn-ccer core claim corrected — no CCUS methodology has
 * been published (first batch 2024: offshore wind, CSP, afforestation,
 * mangrove; 2025 adds 12 more, none CCUS; CCUS sits in the 600+ suggestion
 * pool). The "948万吨" figure is replaced with MEE-verified numbers (33
 * projects / 1776.37万吨 registered, 921.4万吨 traded at ~¥70/t). AI-marked
 * dimensions in cn-ccer rewritten. Target: each record scores >= 70.
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

export const MIGRATION_ID = 'content-depth-batch3c-2026-09';
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
    id: 'cn-ccer',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'Administrative Regulation',
    },
    i18n: {
      en: {
        description:
          'The national voluntary emission-reduction (CCER) market restarted in January 2024 under the Trial Administrative Measures, with methodology-gated eligibility: the first batch covered offshore wind, concentrating solar, afforestation and mangrove creation. Through 2025 the Ministry of Ecology and Environment added 12 more methodologies (oil-gas recovery, dams, salt marsh, agri waste, new-energy use, efficiency, SF6 and others), bringing 140+ projects to public notice, 33 projects with 17.7637 Mt registered, and 9.214 Mt traded at about ¥70/t (¥650 million). No CCUS methodology has been published: CCUS sits in the 600+ suggestion pool under routine intake, with GB/T 46879-2025 (project-level CCUS reduction assessment) as the natural future methodology base. For CCUS the honest position is pipeline, not eligibility — the market mechanism exists and grows, the CCUS gate is not yet open.',
        scope:
          'China national voluntary carbon market: methodology-gated project eligibility, registration and verification, CCER trading on the Beijing Green Exchange, and the pending CCUS methodology track.',
        tags: [
          'CCER',
          'voluntary carbon market',
          'methodologies',
          'MEE',
          'GB/T 46879',
          'pending CCUS gate',
        ],
        impactAnalysis: {
          economic:
            'A ¥70/t transacted price on 9.2 Mt demonstrates willingness to pay for verified reductions; once a CCUS methodology publishes, capture projects gain a domestic revenue line beside any future ETS inclusion.',
          technical:
            'Methodology discipline (applicability, baselines, monitoring, verification with data-networking to the national platform) sets the bar any future CCUS methodology must clear — GB/T 46879 already pre-builds its assessment grammar.',
          environmental:
            'Conservative additionality review with public data disclosure and provincial supervision keeps credit integrity while the suggestion pool (600+ proposals including CCUS) signals where demand concentrates.',
        },
        evolution: {
          clusters: [
            'China Carbon Markets',
            'CCER Methodology System',
            'CCUS Revenue Outlook',
          ],
          milestones: [
            {
              date: '2024-01-01',
              event:
                'The national CCER market restarted with four first-batch methodologies (offshore wind, CSP, afforestation, mangrove).',
            },
            {
              date: '2025-12-23',
              event:
                'Twelve more methodologies published through 2025 (oil-gas recovery, dams, salt marsh, agri waste,新能源, efficiency, SF6); none for CCUS.',
            },
            {
              date: '2026-01-08',
              event:
                'MEE reported 140+ noticed projects, 33 registered (17.76 Mt), 9.21 Mt traded; CCUS remains in the suggestion pool with GB/T 46879 as methodology base.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '全国温室气体自愿减排（CCER）市场2024年1月按《管理办法（试行）》重启，资格按方法学放行：首批为海上风电、光热发电、造林碳汇、红树林营造。2025年生态环境部又发布12项方法学（油气回收、淤地坝、盐沼、农业废弃物、新能源利用、能效、六氟化硫等），公示项目140余个，33个项目1776.37万吨登记，成交921.4万吨、均价约70元/吨（6.5亿元）。CCUS方法学尚未发布：CCUS在600余项常态化征集建议池中，GB/T 46879-2025（项目级减排评估）是天然的未来方法学底座。对CCUS的诚实定位是"在路上"而非"已入场"——市场机制存在且在长大，CCUS的门还没开。',
        scope:
          '全国自愿碳市场：按方法学放行的项目资格、登记核查、北绿所交易，以及待定的CCUS方法学轨道。',
        tags: [
          'CCER',
          '自愿碳市场',
          '方法学',
          '生态环境部',
          'GB/T46879',
          'CCUS待定',
        ],
        impactAnalysis: {
          economic:
            '70元/吨920万吨成交证明核证减排有人买单；CCUS方法学一旦发布，捕集项目除未来ETS纳入外多一条国内收入线。',
          technical:
            '方法学纪律（适用条件、基线、监测、数据联网核查）就是未来CCUS方法学要过的门槛——GB/T 46879已把评估语法预建好。',
          environmental:
            '保守额外性审查加数据公开与省级监督保住信用诚信；600余项建议池（含CCUS）标出需求集中在哪。',
        },
        evolution: {
          clusters: ['中国碳市场', 'CCER方法学体系', 'CCUS收益展望'],
          milestones: [
            {
              date: '2024-01-01',
              event:
                '全国CCER市场重启，首批四项方法学（海上风电、光热、造林、红树林）。',
            },
            {
              date: '2025-12-23',
              event:
                '2025年累计发布12项新方法学（油气回收、淤地坝、盐沼、农业废弃物、新能源、能效、六氟化硫），无CCUS。',
            },
            {
              date: '2026-01-08',
              event:
                '生态环境部通报140余个公示项目、33个登记（1776万吨）、成交921万吨；CCUS仍在建议池，GB/T 46879为方法学底座。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 75,
        label: 'Pending Revenue Line',
        evidence:
          'A traded ¥70/t CCER price exists, but no CCUS methodology means capture projects cannot yet monetise it; the incentive is prospective, gated on methodology publication.',
        citation: 'MEE methodology interview (Jan 2026)',
      },
      market: {
        score: 85,
        label: 'Unified National VCM',
        evidence:
          'One national market with 5,700 accounts, Beijing Green Exchange trading and methodology-gated supply concentrates voluntary demand instead of fragmenting it across pilots.',
        citation: 'MEE methodology interview (Jan 2026)',
      },
      mrv: {
        score: 80,
        label: 'Methodology Discipline',
        evidence:
          'Validation/verification/filing review of审定/核算/核查 reports with monitoring-data networking to the national platform, plus GB/T 46879 pre-building the CCUS assessment grammar.',
        citation: 'CCER Trial Measures; GB/T 46879-2025',
      },
      statutory: {
        score: 85,
        label: 'National Trial Status',
        evidence:
          'The Trial Administrative Measures with MEE-led multi-ministry methodology issuance give the market direct administrative-law footing and recurring expansion rounds.',
        citation: 'CCER Trial Measures; MEE notices 2024-2025',
      },
      strategic: {
        score: 85,
        label: '2027 Full Coverage',
        evidence:
          'The 2025 central directive targets full key-sector coverage of the voluntary market by 2027; CCUS sits in the suggestion pool as the highest-profile pending methodology for heavy industry.',
        citation: 'Central green-transition carbon-market opinion (2025)',
      },
    },
  },
  {
    id: 'cn-ordos-pilot-2024',
    core: {
      status: 'Active',
      category: 'Strategic',
      legalWeight: 'Administrative Regulation',
    },
    i18n: {
      en: {
        description:
          'The National Carbon Peaking Pilot (Ordos) Implementation Plan (municipal executive sign-off 2024, published July 2024) makes the coal city a full-system peaking laboratory: 5.64 GW of new self-use coal power by 2025 with 13 GW peak-shaving capacity and sub-300g/kWh coal consumption for 600 MW+ units, CCUS减碳示范 on coal units "according to local conditions", a Mengsu model zero-carbon industrial park, carbon-budget management with carbon review inside energy-saving and EIA approvals, and full-process scaled CCUS plus advanced capture and utilisation demonstrations under the October 2024 pollution-carbon synergy pilot (with a dedicated incentive scheme, 10+ benchmark enterprises by 2025, 30 GW renewables). Finance runs through special funds, green credit, a low-carbon fund and emissions/green-electricity trading. Ordos is where coal-chemical CCUS meets city-level carbon accounting first.',
        scope:
          'Ordos municipal peaking system: coal-power transition with CCUS demos, zero-carbon parks, carbon-budget and review institutions, renewables integration, and pollution-carbon synergy demonstrations.',
        tags: [
          'Ordos',
          'peaking pilot',
          'coal CCUS demo',
          'zero-carbon park',
          'carbon budget',
          'synergy pilot',
        ],
        impactAnalysis: {
          economic:
            'Special funds plus green credit and a municipal low-carbon fund de-risk first demonstrations, while carbon, green-electricity and forthcoming sink trading give pilots multiple monetisation rails.',
          technical:
            'Coal-unit CCUS demos alongside ultra-supercritical, CFB and IGCC-fuel-cell demonstrations plus coal-chemical near-zero projects concentrate the full capture palette in one basin.',
          environmental:
            'Carbon review inside project approvals with dual-control impact assessment, 3%+ environmental-facility efficiency gains and NOx/VOC absolute cuts bind the pilot to measurable outcomes.',
        },
        evolution: {
          clusters: [
            'Ordos Peaking Pilot',
            'Coal CCUS Demos',
            'Zero-Carbon Parks',
          ],
          milestones: [
            {
              date: '2024-07-22',
              event:
                'The Ordos peaking implementation plan issued: coal transition, CCUS demos, model zero-carbon park, carbon-budget institutions.',
            },
            {
              date: '2024-10-11',
              event:
                'The pollution-carbon synergy pilot added full-process scaled CCUS demonstrations with its own incentive scheme.',
            },
            {
              date: '2025-04-07',
              event:
                'Mengsu zero-carbon park reported 3.85 GW wind-solar-storage integration with ~70% green power for park firms.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '《国家碳达峰试点（鄂尔多斯）实施方案》（2024年市政府常务会审议，7月印发）把这座煤炭城市做成全系统达峰实验室：2025年新增自用煤电564万千瓦、调峰能力1300万千瓦、60万千瓦机组供电煤耗300克以下，"因地制宜探索"煤电机组CCUS减碳示范，蒙苏样板零碳产业园，碳预算管理加节能审查环评中的碳评价，2024年10月减污降碳协同试点再加全流程规模化CCUS与先进捕集利用示范（含专项激励办法、2025年10个以上标杆、可再生能源3000万千瓦）。资金走专项资金、绿色信贷、低碳基金与碳汇绿电交易。鄂尔多斯是煤化工CCUS最先碰上市级碳核算的地方。',
        scope:
          '鄂尔多斯市级达峰体系：煤电转型带CCUS示范、零碳园区、碳预算与审查制度、可再生能源融合、减污降碳协同示范。',
        tags: [
          '鄂尔多斯',
          '达峰试点',
          '煤电CCUS示范',
          '零碳园区',
          '碳预算',
          '协同试点',
        ],
        impactAnalysis: {
          economic:
            '专项资金加绿色信贷与市级低碳基金给首批示范垫资，碳交易绿电交易与待出的碳汇交易给试点多条变现轨道。',
          technical:
            '煤电机组CCUS示范叠加超超临界、循环流化床、燃料电池复合发电示范与煤化工近零碳项目，把捕集全光谱压进一个盆地。',
          environmental:
            '项目审批中的碳评价加双控影响分析、环保设施效率提升3%以上、氮氧化物VOC绝对量下降，把试点绑在可测结果上。',
        },
        evolution: {
          clusters: ['鄂尔多斯达峰试点', '煤电CCUS示范', '零碳园区'],
          milestones: [
            {
              date: '2024-07-22',
              event:
                '鄂尔多斯达峰实施方案印发：煤电转型、CCUS示范、样板零碳园、碳预算制度。',
            },
            {
              date: '2024-10-11',
              event: '减污降碳协同试点加全流程规模化CCUS示范，配专项激励办法。',
            },
            {
              date: '2025-04-07',
              event: '蒙苏零碳园通报38.5万千瓦风光储一体、园内企业绿电近70%。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 80,
        label: 'Pilot Funds Stack',
        evidence:
          'National and autonomous-region special funds, green credit, a municipal low-carbon fund and a dedicated synergy-pilot incentive scheme stack behind first demonstrations.',
        citation: 'Ordos peaking plan (Jul 2024); synergy pilot (Oct 2024)',
      },
      market: {
        score: 80,
        label: 'Super-Basin Market',
        evidence:
          'The Ordos basin concentrates coal, coal-chemical and power emitters with sinks in one jurisdiction, and carbon/green-electricity trading pilots give abatement a local price.',
        citation: 'Ordos peaking plan (Jul 2024)',
      },
      mrv: {
        score: 85,
        label: 'City Carbon Accounts',
        evidence:
          'Local emission factors for raw, fuel and power coal, enterprise carbon accounts with dual-standard intensity evaluation, and a 52-firm energy-carbon platform build city-level MRV ahead of national systems.',
        citation: 'Ordos peaking plan; Mengsu park reporting (Apr 2025)',
      },
      statutory: {
        score: 80,
        label: 'Pilot Mandate',
        evidence:
          'NDRC-batch national pilot status with municipal executive adoption gives the plan binding local force, reinforced by the 2024 synergy-pilot designation.',
        citation: 'NDRC peaking pilot batch; Ordos executive record (2024)',
      },
      strategic: {
        score: 90,
        label: 'Coal-Chemistry Lab',
        evidence:
          'The first city-scale attempt to peak a coal-chemical economy with CCUS demos, zero-carbon parks and carbon budgets together — the template other coal cities will copy or avoid.',
        citation: 'Ordos peaking plan (Jul 2024)',
      },
    },
  },
  {
    id: 'cn-zero-carbon-parks',
    core: {
      status: 'Active',
      category: 'Strategic',
      legalWeight: 'National Guidance',
    },
    i18n: {
      en: {
        description:
          'The June 2025 NDRC/MIIT/NEA national zero-carbon park construction notice sets application, construction, indicator evaluation and acceptance arrangements for national demonstration parks, prioritising energy-structure transformation, industrial decarbonisation, carbon accounting, product footprint management and financial support — while explicitly not requiring CCS as a uniform core pathway. Practice runs ahead of the notice: Ordos Mengsu park (approved 2022, Envision phase one April 2022) integrates 385 MW of wind-solar-storage with ~70% green power for tenant firms, reported ¥20.09 billion新能源 output in 2024, runs a 52-firm energy-carbon platform, and co-drafted the national Zero-Carbon Industrial Park Construction Guidelines with the China National Institute of Standardization. The honest frame is standard-led industrial greening with CCUS as an optional module, not a CCS delivery programme.',
        scope:
          'National zero-carbon parks: application and evaluation rules, energy-structure and industrial-decarbonisation priorities, carbon accounting and footprint systems, green finance, with CCUS as an optional park-level module.',
        tags: [
          'zero-carbon parks',
          '2025 notice',
          'Mengsu practice',
          'green power',
          'carbon accounting',
          'optional CCUS',
        ],
        impactAnalysis: {
          economic:
            'National demonstration status plus green finance channels de-risks park-level energy switching, with Mengsu doubling新能源 output to ¥20 billion showing the industrial payoff.',
          technical:
            'Wind-solar-storage integration, industrial green microgrids and energy-carbon platforms are the replicable technical core; CCUS enters only where park emissions profiles justify it.',
          environmental:
            'Park-level carbon accounting with 52 metered firms and green-product certification keeps zero-carbon claims auditable instead of declarative.',
        },
        evolution: {
          clusters: ['Zero-Carbon Parks', 'Mengsu Practice', 'Green Standards'],
          milestones: [
            {
              date: '2022-03-01',
              event:
                'Ordos Mengsu zero-carbon park approved; Envision phase one commissioned April 2022.',
            },
            {
              date: '2025-04-07',
              event:
                'Mengsu reported 385 MW integration, ~70% green power, ¥20.09 billion 2024新能源 output.',
            },
            {
              date: '2025-06-01',
              event:
                'The national zero-carbon park construction notice issued application, evaluation and acceptance rules.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '2025年6月发改委工信部能源局零碳园区建设通知定下国家级示范园区的申报、建设、指标评价与验收安排，重点是用能转型、产业降碳、碳核算、产品碳足迹与金融支持——同时明确不要求所有园区把CCS作为统一核心路径。实践走在通知前面：鄂尔多斯蒙苏园（2022年获批，远景一期同年4月投产）配套38.5万千瓦风光储，园内企业绿电近70%，2024年新能源产值200.9亿元翻番，52家规上企业接入能碳平台，并与中国标准化研究院联合制定国家标准《零碳产业园建设导则》。诚实的定位是标准引领的工业绿色化、CCUS为可选模块，而非CCS交付计划。',
        scope:
          '国家级零碳园区：申报评价规则、用能与产业降碳重点、碳核算与足迹体系、绿色金融，CCUS为园区级可选模块。',
        tags: [
          '零碳园区',
          '2025年通知',
          '蒙苏实践',
          '绿电',
          '碳核算',
          'CCUS可选',
        ],
        impactAnalysis: {
          economic:
            '国家级示范地位加绿色金融通道给园区级能源切换垫资，蒙苏新能源产值翻番到200亿证明产业回报。',
          technical:
            '风光储一体、工业绿色微电网与能碳平台是可复制的技术内核；CCUS只在园区排放画像合适时进入。',
          environmental:
            '52家计量企业的园区级碳核算加绿色产品认证，让零碳宣称可审计而非口号。',
        },
        evolution: {
          clusters: ['零碳园区', '蒙苏实践', '绿色标准'],
          milestones: [
            {
              date: '2022-03-01',
              event: '鄂尔多斯蒙苏零碳园获批，远景一期4月投产。',
            },
            {
              date: '2025-04-07',
              event:
                '蒙苏通报38.5万千瓦一体、绿电近70%、2024年新能源产值200.9亿。',
            },
            {
              date: '2025-06-01',
              event: '国家级零碳园区建设通知发布申报建设评价验收规则。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 70,
        label: 'Demo Finance Channels',
        evidence:
          'National demonstration status unlocks special funds and green finance, with Mengsu output doubling to ¥20 billion as the commercial proof point — park-level, not CCUS-specific.',
        citation: '2025 zero-carbon park notice; Mengsu reporting (Apr 2025)',
      },
      market: {
        score: 70,
        label: 'Green Product Premium',
        evidence:
          'Product footprint management with green-product certification lets park firms monetise low-carbon production in export markets sensitive to embedded carbon.',
        citation: 'Mengsu certification practice (2024-2025)',
      },
      mrv: {
        score: 80,
        label: 'Metered Park Accounts',
        evidence:
          'Fifty-two metered firms on the energy-carbon platform with local emission factors give park claims a measured base most industrial zones lack.',
        citation: 'Mengsu platform reporting (Apr 2025)',
      },
      statutory: {
        score: 80,
        label: 'Tri-Ministry Notice',
        evidence:
          'The June 2025 NDRC/MIIT/NEA notice with application, indicator evaluation and acceptance rules gives parks an administrative-law track from申报 to验收.',
        citation: 'Zero-carbon park notice (Jun 2025)',
      },
      strategic: {
        score: 85,
        label: 'Greening Template',
        evidence:
          'The programme templates industrial greening for coal regions with CCUS honestly optional — the right scope, since forcing CCS into every park would discredit both.',
        citation: '2025 zero-carbon park notice',
      },
    },
  },
  {
    id: 'cn-demo-tech-2024',
    core: {
      status: 'Active',
      category: 'Strategic',
      legalWeight: 'Guideline',
    },
    i18n: {
      en: {
        description:
          'The August 2023 NDRC-led ten-department Implementation Plan for Green and Low-Carbon Advanced Technology Demonstration Projects put CCUS on the eligible advanced-technology list and opened the first application round, with the first project list following in 2024. The April 2025 award round funded seven CCS projects: three integrated CCS projects, a cement-sector capture project, a long-distance CO2 pipeline project, plus capture at a fertiliser plant and a lithium-battery facility — the first programme-level spread of CCUS demos across power, cement, chemicals and transport infrastructure. The plan is the funding pipeline behind several operating Chinese demos and the mechanism most likely to seed the next wave before any dedicated CCUS law exists.',
        scope:
          'National green-technology demonstration system: CCUS eligibility, application rounds, project-list publication, and award funding across capture, integrated projects and CO2 transport.',
        tags: [
          'demonstration plan',
          'ten departments',
          'seven CCS awards',
          'pipeline demo',
          'project list',
          'pre-law pipeline',
        ],
        impactAnalysis: {
          economic:
            'Award funding de-risks first-of-kind demos across sectors, with the long-distance pipeline award specifically underwriting the transport learning curve.',
          technical:
            'Sectoral spread (power, cement, fertiliser, batteries, pipeline) forces capture technology to prove itself on diverse gas streams instead of one friendly flue.',
          environmental:
            'Demonstration-scale tonnes with programme-level selection discipline build the operating record a future CCUS law and CCER methodology will reference.',
        },
        evolution: {
          clusters: ['Green Tech Demos', 'CCUS Awards', 'Pre-Law Pipeline'],
          milestones: [
            {
              date: '2023-08-01',
              event:
                'The ten-department demonstration plan issued with CCUS eligible and the first round opened.',
            },
            {
              date: '2024-01-01',
              event: 'The first demonstration project list published.',
            },
            {
              date: '2025-04-01',
              event:
                'Seven CCS projects awarded, including three integrated projects and a long-distance CO2 pipeline.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '2023年8月发改委等十部门《绿色低碳先进技术示范工程实施方案》把CCUS列入可示范的先进技术范围并启动首批申报，首批项目清单随后于2024年公布。2025年4月授牌轮资助七个CCS项目：三个集成项目、水泥行业捕集、长输二氧化碳管道，外加化肥厂与锂电池厂捕集——首次把CCUS示范铺到电力、水泥、化工与运输基础设施。首批清单的落地与2025年授牌轮的跟进，使该计划成为多个在运中国示范背后的资金管线：从申报、清单到授牌的三级漏斗保证只有工程就绪度最高的项目拿到钱，也是专门CCUS法出台前最可能播种下一波的机制。长输管道授牌尤其关键，它第一次把"管输学习曲线"本身作为资助对象，而不再只补捕集端。',
        scope:
          '国家级绿色技术示范体系：CCUS资格、申报轮次、项目清单发布、覆盖捕集集成项目与二氧化碳运输的授牌资助。',
        tags: [
          '示范工程',
          '十部门',
          '七个CCS授牌',
          '管道示范',
          '项目清单',
          '立法前管线',
        ],
        impactAnalysis: {
          economic:
            '授牌资金给各行业首创示范垫资，长输管道授牌专门补贴运输学习曲线，首批清单到授牌轮的三级漏斗保证资金流向工程就绪度最高的项目。',
          technical:
            '行业铺开（电力、水泥、化肥、电池、管道）逼捕集技术在多种烟气上自证，而非只吃一口好饭。',
          environmental:
            '示范级吨数加计划级遴选纪律，攒出未来CCUS法与CCER方法学要引用的运行记录。',
        },
        evolution: {
          clusters: ['绿色技术示范', 'CCUS授牌', '立法前管线'],
          milestones: [
            {
              date: '2023-08-01',
              event: '十部门示范工程方案发布，CCUS可申报，首批开闸。',
            },
            {
              date: '2024-01-01',
              event: '首批示范项目清单公布。',
            },
            {
              date: '2025-04-01',
              event: '七个CCS项目授牌，含三个集成项目与长输二氧化碳管道。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 80,
        label: 'Award Funding',
        evidence:
          'Direct award funding for seven CCS projects plus the demonstration-plan pipeline converts policy eligibility into disbursed first-of-kind capital.',
        citation: 'MOST award round (Apr 2025)',
      },
      market: {
        score: 70,
        label: 'Sector Spread',
        evidence:
          'Power, cement, fertiliser, battery and pipeline awards spread demand signals across industries instead of concentrating on one state-owned champion.',
        citation: 'MOST award round (Apr 2025)',
      },
      mrv: {
        score: 70,
        label: 'Demo-Scale Records',
        evidence:
          'Funded demonstrations generate the metered operating records (capture rates, transport integrity, storage behaviour) that standards GB/T 46876-46880 then codify.',
        citation: 'Demonstration plan; GB/T package (Jan 2026)',
      },
      statutory: {
        score: 75,
        label: 'Ten-Department Plan',
        evidence:
          'A ten-department implementation plan with published project lists gives demo funding administrative regularity one notch below legislation.',
        citation: 'NDRC ten-department plan (Aug 2023)',
      },
      strategic: {
        score: 85,
        label: 'Pre-Law Seeder',
        evidence:
          'With no dedicated CCUS law, this award pipeline is the de-facto deployment strategy to 2030, seeding the integrated projects the 15th Five-Year Plan will scale.',
        citation: 'GCCSI China review (2026)',
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

export function applyContentDepthBatch3C(db, { auditDate = AUDIT_DATE } = {}) {
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
    const summary = applyContentDepthBatch3C(db);
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
    console.error(`Content-depth batch 3C migration failed: ${error.message}`);
    process.exit(1);
  });
}

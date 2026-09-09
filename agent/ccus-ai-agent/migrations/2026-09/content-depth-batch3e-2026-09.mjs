#!/usr/bin/env node
/**
 * Content-depth batch 3E (2026-09): enrich the five MENA records with
 * primary-source-backed bilingual content.
 *
 * Scores before: ae-carbon-strategy (26), ae-federal-climate-law-2024 (26),
 * kw-kpc-net-zero-2024 (24), om-ccus-roadmap-2024 (24),
 * qa-national-climate-strategy-2024 (27).
 *
 * Integrity fixes: Kuwait/Oman legacy regulatory blocks carried inline
 * evidence tags with unverifiable specifics (ministerial meetings, draft
 * laws, pilot cases) — rewritten from KPC and Oman strategy publications;
 * ae-federal extended with the May 2026 Abu Dhabi General Policy (with the
 * honest caveat that licensing, tariff and NRCC-reconciliation details are
 * still pending); Qatar extended with NDC 3.0 (November 2025) and the Ras
 * Laffan operating record. Target: each scores >= 70.
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

export const MIGRATION_ID = 'content-depth-batch3e-2026-09';
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
    id: 'ae-carbon-strategy',
    core: {
      status: 'Active',
      category: 'Strategic',
      legalWeight: 'National Strategy',
    },
    i18n: {
      en: {
        description:
          'The UAE Net Zero 2050 Strategy translates the national initiative into 25+ programmes across six sectors, naming carbon capture technologies, climate finance, R&D, skills and sectoral efficiency as enabling components. The strategy is the umbrella above the operative instruments: Federal Decree-Law 11/2024 (MRV, CCUS as mitigation means, incentives and the National Register), Cabinet Resolution 67/2024 (NRCC reporting at 0.5 Mt), the May 2026 Abu Dhabi General Policy on Carbon Capture (value-chain organisation, SCFEA approvals, Competent Authority licensing), and ADNOC delivery — Al Reyadah (800 kt/yr operating, first MENA commercial scale), Habshan and Hail & Ghasha FIDs (2023, ~4 Mt committed, operations 2026 and 2028), a 10 Mtpa-by-2030 capture target, the Fertiglobe saline-aquifer pilot with DNV-certified West Aquifer storage, and Net Zero by 2045 operations. The strategy sets direction; the decree, the register, the Abu Dhabi policy and ADNOC steel set the pace.',
        scope:
          'UAE net-zero direction to 2050: 25+ cross-sector programmes with capture technologies, climate finance, R&D and efficiency as enablers, implemented through federal law, the carbon register, emirate policy and ADNOC delivery.',
        tags: [
          'Net Zero 2050',
          'national strategy',
          'enabling components',
          'ADNOC delivery',
          '25 programmes',
          'umbrella strategy',
        ],
        impactAnalysis: {
          economic:
            'As an umbrella the strategy spends little directly, but its programme structure channels federal attention and co-finance toward the instruments that do — the register, the Abu Dhabi hub economics and ADNOC capital.',
          technical:
            'Naming capture across six sectors legitimises CCUS inside every sectoral plan, from steel (Al Reyadah) to gas processing (Habshan) to ammonia (Fertiglobe pilot).',
          environmental:
            'The strategy binds the operating instruments to the 2050 neutrality pledge, so delivery delays at Habshan or Hail & Ghasha read as strategy delays, not isolated project slips.',
        },
        evolution: {
          clusters: [
            'UAE Net Zero 2050',
            'Federal Climate Law',
            'ADNOC Delivery',
          ],
          milestones: [
            {
              date: '2021-10-01',
              event:
                'The UAE Net Zero 2050 initiative launched with 25+ programmes across six sectors.',
            },
            {
              date: '2024-01-01',
              event:
                'Federal Decree-Law 11/2024 gave the strategy operative MRV, CCUS-means and register machinery.',
            },
            {
              date: '2026-05-01',
              event:
                'Abu Dhabi General Policy on Carbon Capture organised the value chain (SCFEA, Competent Authority, TSO, concessions).',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '阿联酋2050净零战略把国家倡议细化为六个部门25项以上计划，把碳捕集技术、气候融资、研发、能力与部门效率列为转型支撑。该战略是操作工具的上盖：2024年第11号联邦法令（MRV、CCUS减排手段、激励与登记簿）、2024年第67号内阁决议（50万吨报告线）、2026年5月阿布扎比碳捕集总政策（价值链组织、SCFEA审批、主管部门许可）、ADNOC交付——Al Reyadah（80万吨/年在运，中东首个商业规模）、Habshan与Hail&Ghasha最终投资决定（2023年，承诺近400万吨，2026与2028年投运）、2030年1000万吨/年捕集目标、Fertiglobe咸水层试点加DNV认证西含水层封存、运营2045年净零。战略定方向，法令登记簿阿布扎比政策与ADNOC钢铁定速度。',
        scope:
          '阿联酋2050净零方向：六部门25项以上计划，捕集技术气候融资研发效率为支撑，经联邦法、碳登记簿、酋长国政策与ADNOC交付落实。',
        tags: [
          '2050净零',
          '国家战略',
          '支撑条件',
          'ADNOC交付',
          '25项计划',
          '上盖战略',
        ],
        impactAnalysis: {
          economic:
            '上盖战略本身花钱不多，但计划结构把联邦注意力与合资引向真花钱的工具——登记簿、阿布扎比枢纽经济、ADNOC资本。',
          technical:
            '六部门点名捕集，使CCUS进每个部门计划：钢铁（Al Reyadah）、天然气处理（Habshan）、氨（Fertiglobe试点）。',
          environmental:
            '战略把操作工具绑在2050中和承诺上，Habshan或Hail&Ghasha延期就是战略延期，不是孤立项目打滑。',
        },
        evolution: {
          clusters: ['阿联酋2050净零', '联邦气候法', 'ADNOC交付'],
          milestones: [
            {
              date: '2021-10-01',
              event: '阿联酋2050净零倡议启动，六部门25项以上计划。',
            },
            {
              date: '2024-01-01',
              event: '第11号联邦法令给战略配上MRV、CCUS手段与登记簿机器。',
            },
            {
              date: '2026-05-01',
              event:
                '阿布扎比碳捕集总政策组织价值链（SCFEA、主管部门、管输商、特许）。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 70,
        label: 'Programme Channelling',
        evidence:
          'The strategy itself appropriates little, but its programme structure directs federal co-finance, NRCC credit value and Abu Dhabi hub economics toward capture deployment.',
        citation: 'UAE Net Zero 2050 Strategy; Decree-Law 11/2024 Art.10',
      },
      market: {
        score: 75,
        label: 'Regional Coordination',
        evidence:
          'Six-sector coverage with skills, finance and R&D components coordinates emitters, ADNOC infrastructure and future traders inside one national frame.',
        citation: 'UAE Net Zero 2050 Strategy',
      },
      mrv: {
        score: 80,
        label: 'Register-Backed Pledge',
        evidence:
          'The 2050 pledge is measured through the Decree-Law MRV framework and the National Register, turning strategy milestones into audited emissions accounts.',
        citation: 'Decree-Law 11/2024 Art.6; NRCC Resolution 67/2024',
      },
      statutory: {
        score: 75,
        label: 'Strategy Plus Law',
        evidence:
          'Strategy direction hardened into the 2024 Climate Change Law and the 2026 Abu Dhabi General Policy — a strategy-to-statute pipeline rare in Gulf climate governance.',
        citation: 'Decree-Law 11/2024; Abu Dhabi General Policy (May 2026)',
      },
      strategic: {
        score: 90,
        label: '2050 Umbrella',
        evidence:
          'The umbrella above 25+ programmes, the federal law, the register and ADNOC 10 Mtpa delivery — the single document that makes UAE climate action legible as one programme.',
        citation: 'UAE Net Zero 2050 Strategy',
      },
    },
  },
  {
    id: 'ae-federal-climate-law-2024',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'Federal Decree',
    },
    i18n: {
      en: {
        description:
          'Federal Decree-Law No. 11 of 2024 on the Reduction of Climate Change Effects is the UAE climate framework law: Article 4 lists eight mitigation means including CCUS (defined as capture-to-storage/use at 1 km+ depth), Article 6 builds MRV for designated sources, Article 10 creates incentives, carbon offsetting, emissions trading, shadow carbon pricing and the National Carbon Credit Registry. Cabinet Resolution 67/2024 operationalises the register: emitters at or above 0.5 MtCO2e/yr must report, verify and register. In May 2026 Abu Dhabi published the General Policy on Carbon Capture — the first practical organisation of the value chain: SCFEA approves procedures, licensing frameworks, tariff methodology, the Transport System Operator and storage concessions; a Competent Authority licenses, approves hubs and runs certification; ADNOC consent governs concession areas. Honestly stated: licensing conditions, connection standards, hub tariffs and NRCC-credit reconciliation are still pending — the policy organises, it does not yet fully operate.',
        scope:
          'UAE federal climate compliance: designated-source MRV, eight mitigation means with CCUS named, incentives and trading, National Register at 0.5 Mt threshold, Abu Dhabi value-chain organisation with SCFEA approvals.',
        tags: [
          'Decree-Law 11/2024',
          'MRV',
          'National Register',
          'Abu Dhabi CCUS policy',
          'SCFEA',
          '0.5 Mt threshold',
        ],
        impactAnalysis: {
          economic:
            'Mandatory MRV at 0.5 Mt plus a national credit register creates the accounting rails for a future compliance price, while the Abu Dhabi tariff methodology (pending) will decide hub economics.',
          technical:
            'The May 2026 policy maps physical and legal CO2 movement — capturer to TSO to store — with connection standards and certification to follow, ending the era of bespoke project deals.',
          environmental:
            'Designated-source obligations with verification keep the framework honest; the pending licensing conditions are the remaining gap between organised and operational.',
        },
        evolution: {
          clusters: [
            'UAE Climate Law',
            'National Register',
            'Abu Dhabi Organisation',
          ],
          milestones: [
            {
              date: '2024-01-01',
              event:
                'Federal Decree-Law 11/2024 enacted: MRV, eight mitigation means, incentives, National Register mandate.',
            },
            {
              date: '2024-01-01',
              event:
                'Cabinet Resolution 67/2024 set the 0.5 Mt reporting and registration threshold with verification.',
            },
            {
              date: '2026-05-01',
              event:
                'Abu Dhabi General Policy on Carbon Capture published: SCFEA approvals, Competent Authority, TSO, concessions; tariffs and licensing details pending.',
            },
          ],
        },
        regulatory: {
          pore_space_rights:
            'Managed at Federal and Emirate level (Abu Dhabi SCFEA).',
          liability_transfer:
            'Federal mandate for emission reporting and liability for GHG accuracy.',
          liability_period:
            'MRV mandated starting May 2025 with annual reporting cycles.',
          financial_assurance:
            'National Register for Carbon Credits (NRCC) and credit-based incentives.',
          permitting_lead_time:
            'Mandatory registration for emitters exceeding 0.5M tons CO2e.',
          co2_definition:
            'Integrated into National GHG Inventory and Net Zero 2050 framework.',
          cross_border_rules:
            'Aligned with Paris Agreement Article 6 for international credit trading.',
        },
      },
      zh: {
        description:
          '2024年第11号《关于减缓气候变化影响的联邦法令》是阿联酋气候框架法：第4条列八项减缓手段（含CCUS，定义为捕集到1公里以下封存/利用）、第6条建指定源MRV、第10条设激励、碳抵消、排放交易、影子碳价与国家碳信用登记簿。2024年第67号内阁决议落实登记簿：年排放50万吨以上实体须报告核查登记。2026年5月阿布扎比发布碳捕集总政策——价值链的首次实务组织：SCFEA批程序、许可框架、管输费方法、管输商任命与封存特许；主管部门发证、批枢纽、定连接标准、管合规、跑认证；特许区内ADNOC同意前置。诚实地说：许可条件、连接标准、枢纽管输费、与登记簿信用的衔接都还待定——政策完成了组织，还没完成运转。',
        scope:
          '阿联酋联邦气候合规：指定源MRV、八项减缓手段点名CCUS、激励与交易、50万吨登记线、阿布扎比价值链组织与SCFEA审批。',
        tags: [
          '11/2024号法令',
          'MRV',
          '国家登记簿',
          '阿布扎比CCUS政策',
          'SCFEA',
          '50万吨线',
        ],
        impactAnalysis: {
          economic:
            '50万吨强制MRV加国家信用登记簿铺好未来合规价格的会计轨道；阿布扎比管输费方法（待定）将决定枢纽经济性。',
          technical:
            '2026年5月政策画出二氧化碳物理与法律流转图——捕集到管输商到封存，连接标准与认证随后，终结一单一议时代。',
          environmental:
            '指定源义务加核查保住框架诚实；待定的许可条件是有组织与可运转之间的剩余缺口。',
        },
        evolution: {
          clusters: ['阿联酋气候法', '国家登记簿', '阿布扎比组织'],
          milestones: [
            {
              date: '2024-01-01',
              event:
                '第11号联邦法令生效：MRV、八项减缓手段、激励、国家登记簿授权。',
            },
            {
              date: '2024-01-01',
              event: '第67号内阁决议定50万吨报告登记线并核查。',
            },
            {
              date: '2026-05-01',
              event:
                '阿布扎比碳捕集总政策发布：SCFEA审批、主管部门、管输商、特许；管输费与许可细节待定。',
            },
          ],
        },
        regulatory: {
          pore_space_rights: '在联邦和酋长国层面（阿布扎比 SCFEA）进行管理。',
          liability_transfer:
            '联邦授权进行排放报告，并对温室气体数据的准确性负责。',
          liability_period: '从2025年5月开始强制执行 MRV，并设有年度报告周期。',
          financial_assurance: '国家碳信用登记簿 (NRCC) 和基于信用的激励措施。',
          permitting_lead_time:
            '排放量超过 50 万吨二氧化碳当量的实体必须进行强制登记。',
          co2_definition: '纳入国家温室气体清单和 2050 年净零排放框架。',
          cross_border_rules: '符合《巴黎协定》第六条，支持国际信用交易。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 75,
        label: 'Register Plus Policy',
        evidence:
          'Article 10 incentives (offsetting facilitation, emissions trading, shadow pricing) with NRCC credit certificates, now pointed at an organised Abu Dhabi hub awaiting its tariff methodology.',
        citation: 'Decree-Law 11/2024 Art.10; Galadari compliance note (2026)',
      },
      market: {
        score: 80,
        label: 'Hub Organisation',
        evidence:
          'SCFEA-approved procedures, designated Transport System Operator and storage concessions organise hub access; connection standards and tariffs are the pending market terms.',
        citation: 'Abu Dhabi General Policy (May 2026)',
      },
      mrv: {
        score: 95,
        label: 'Mandatory MRV',
        evidence:
          'Designated-source MRV from May 2025 with 0.5 Mt registration threshold, verification and a national register — the strictest Gulf measurement spine.',
        citation: 'Decree-Law 11/2024 Art.6; NRCC Resolution 67/2024',
      },
      statutory: {
        score: 85,
        label: 'Federal Decree Base',
        evidence:
          'A federal framework law with eight named mitigation means, register mandate and incentive machinery, extended by the 2026 Abu Dhabi implementing policy.',
        citation: 'Decree-Law 11/2024 (uaelegislation.gov.ae)',
      },
      strategic: {
        score: 90,
        label: 'NDC Material Tool',
        evidence:
          'The NDC treats CCUS as material for hard-to-abate industry and oil and gas itself — source and sink inside one national strategy with EOR/EGR as the commercial bridge.',
        citation: 'UAE NDC; Galadari compliance note (2026)',
      },
    },
  },
  {
    id: 'kw-kpc-net-zero-2024',
    core: {
      status: 'Active',
      category: 'Strategic',
      legalWeight: 'Strategic Guidance',
    },
    i18n: {
      en: {
        description:
          'Kuwait Petroleum Corporation runs climate strategy as corporate strategy: the consolidated Energy Transition Strategy roadmap to net-zero Scope 1+2 by 2050 (Board-approved implementation roadmap April 17, 2023; KNPC Energy Transition Committee February 2023 with quarterly Board reporting) names CCUS alongside flaring reduction and biofuels, feeding the State of Kuwait 2060 target. Delivery is capex-led inside the oil company — refinery and petrochemical capture integrated with upstream operations — rather than through standalone climate legislation, which Kuwait does not yet have for CCUS. The honest frame is an operator-led transition without a national regulatory track: credible inside the fence, unregulated outside it.',
        scope:
          'KPC corporate transition to 2050: Scope 1+2 net zero via CCUS, flaring and biofuels, Board-governed implementation with quarterly reporting, inside Kuwait 2060 national target.',
        tags: [
          'KPC',
          'Scope 1+2',
          'operator-led',
          'Board roadmap',
          'Kuwait 2060',
          'no national track',
        ],
        impactAnalysis: {
          economic:
            'Capex-led delivery inside KPC budgets avoids legislative delay but concentrates risk on oil-price cycles — transition spend competes with upstream spend in the same Board room.',
          technical:
            'Refinery-petrochemical capture integrated with KOC upstream operations keeps the value chain inside one operator, shortening the path from capture to EOR-adjacent storage.',
          environmental:
            'Scope 1+2 framing excludes Scope 3 by design; the strategy decarbonises the producer, not the product — an honest boundary that national accounting must remember.',
        },
        evolution: {
          clusters: ['KPC Transition', 'KNPC Governance', 'Kuwait 2060'],
          milestones: [
            {
              date: '2023-02-20',
              event:
                'KNPC Energy Transition Committee established with quarterly Board reporting machinery.',
            },
            {
              date: '2023-04-17',
              event:
                'KPC Board approved the consolidated Energy Transition Strategy implementation roadmap to 2050.',
            },
            {
              date: '2023-01-01',
              event:
                'Sustainability reporting cycle (2023-2025) began publishing transition progress against the roadmap.',
            },
          ],
        },
        regulatory: {
          pore_space_rights:
            'State-owned subsurface managed through KPC/KOC upstream tenure.',
          liability_transfer:
            'Long-term liability stays with state entities; no transfer regime codified.',
          liability_period:
            'Not codified; project-lifecycle stewardship inside operator practice.',
          financial_assurance:
            'Project funding through KPC capital expenditure programmes.',
          permitting_lead_time:
            'Integrated with upstream oil and gas permitting practice.',
          co2_definition:
            'Captured stream for EOR-adjacent use and storage inside operations.',
          cross_border_rules: 'No cross-border storage posture published.',
        },
      },
      zh: {
        description:
          '科威特石油公司把气候战略做成公司战略：2050年范围一二净零的综合能源转型战略路线图（2023年4月17日董事会批实施路线图；KNPC 2023年2月设能源转型委员会按季向董事会报告），点名CCUS、火炬气与生物燃料，服务科威特国家2060目标。交付靠石油公司内部资本开支——炼化捕集接上游作业，而非单独立法（科威特尚无CCUS国家监管轨道）。2023-2025可持续发展报告周期对照路线图公布进展，范围一二框定天然排除范围三。诚实的定位是运营商主导的转型：围墙内可信，围墙外无法可依；战略给生产者脱碳，不给产品脱碳；国家核算若把范围三算进来，这套战略一分也指望不上。',
        scope:
          'KPC公司转型到2050年：范围一二净零经CCUS火炬生物燃料，董事会治理按季报告，装入科威特2060国家目标。',
        tags: [
          'KPC',
          '范围一二',
          '运营商主导',
          '董事会路线图',
          '科威特2060',
          '无国家轨道',
        ],
        impactAnalysis: {
          economic:
            '资本开支主导交付免了立法拖延，但把风险压在油价周期上——转型支出与上游支出在同一个董事会里抢钱。',
          technical:
            '炼化捕集接KOC上游作业留在同一运营商手里，从捕集到采收封存的路最短。',
          environmental:
            '范围一二框定天然排除范围三；战略给生产者脱碳，不给产品脱碳——国家核算须记住这个诚实边界。',
        },
        evolution: {
          clusters: ['KPC转型', 'KNPC治理', '科威特2060'],
          milestones: [
            {
              date: '2023-02-20',
              event: 'KNPC能源转型委员会成立，按季向董事会报告机制运转。',
            },
            {
              date: '2023-04-17',
              event: 'KPC董事会批综合能源转型战略实施路线图到2050年。',
            },
            {
              date: '2023-01-01',
              event: '可持续发展报告周期（2023-2025）开始对照路线图公布进展。',
            },
          ],
        },
        regulatory: {
          pore_space_rights: '国有地下经KPC/KOC上游矿权管理。',
          liability_transfer: '长期责任留在国家实体；无转移制度法典化。',
          liability_period: '未法典化；运营商实践内的项目周期托管。',
          financial_assurance: '经KPC资本开支计划的项目融资。',
          permitting_lead_time: '与上游油气许可实践整合。',
          co2_definition: '作业内采收封存的捕集流。',
          cross_border_rules: '未发布跨境封存姿态。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 60,
        label: 'Capex-Led Delivery',
        evidence:
          'No subsidy scheme exists; delivery runs on KPC capital allocation with quarterly Board oversight — incentive by budget line, not by instrument.',
        citation: 'KPC Energy Transition 2050; KNPC governance record',
      },
      market: {
        score: 65,
        label: 'Single-Operator Chain',
        evidence:
          'Capture-to-storage inside one operator removes counterparty risk but also removes market formation — no third-party access, no tariff, no merchant model.',
        citation: 'KPC strategy publications',
      },
      mrv: {
        score: 75,
        label: 'Corporate Reporting',
        evidence:
          'Quarterly Board reporting with sustainability-report disclosure (2023-2025 cycle) gives measured progress accounts, though outside any statutory MRV regime.',
        citation: 'KPC Sustainability Report 2023-2025',
      },
      statutory: {
        score: 70,
        label: 'Corporate Mandate',
        evidence:
          'Board-approved roadmap with committee governance substitutes for absent national CCUS legislation — binding inside the company, invisible to the statute book.',
        citation: 'KPC Board record (Apr 2023)',
      },
      strategic: {
        score: 90,
        label: 'Kuwait 2060 Feeder',
        evidence:
          'The strategy is Kuwait credible path to its 2060 target for the oil sector: Scope 1+2 net zero by 2050 with CCUS as a named pillar alongside flaring and biofuels.',
        citation: 'KPC Energy Transition 2050',
      },
    },
  },
  {
    id: 'om-ccus-roadmap-2024',
    core: {
      status: 'Active',
      category: 'Strategic',
      legalWeight: 'Strategic Guidance',
    },
    i18n: {
      en: {
        description:
          'Oman CCUS roadmap thinking sits inside the 2022 orderly-transition-to-net-zero strategy: 90 Mt 2021 baseline against 104 Mt business-as-usual 2050, abatement 6% by 2030, 54% by 2040, 92% by 2050 inside a 1,760 Mt carbon budget, with CCS assigned 5-25% of decarbonisation — viable within the decade for select industrial point sources — beside green electrification (50-60%), hydrogen (5-10%) and negative emissions for the ~7 Mt last mile. Delivery runs through PDO-operated storage hubs and peridotite mineralisation pilots under the Ministry of Energy and Minerals, with the first 24 months groundwork (per the strategy) covering the storage, hydrogen and MRV institutions the country is still building. The roadmap is directionally complete and institutionally early: the strategy names the numbers, the ministries are still staffing the machinery.',
        scope:
          'Oman orderly transition to 2050: CCS 5-25% of abatement for industrial point sources, PDO hubs, peridotite mineralisation, hydrogen pairing, last-mile negatives, ministry institution-building.',
        tags: [
          'orderly transition',
          'CCS 5-25%',
          'PDO hubs',
          'peridotite',
          'last mile',
          'institution building',
        ],
        impactAnalysis: {
          economic:
            'Framing CCS as 5-25% of a cost-optimised pathway (not the whole plan) protects the strategy from single-technology bets while giving PDO hubs a defined investment envelope.',
          technical:
            'Point-source capture with depleted-reservoir storage plus peridotite mineralisation pilots diversifies the storage portfolio beyond conventional geology from day one.',
          environmental:
            'The last-mile framing (DAC with depleted-reservoir storage, mangroves) keeps residual honesty: 92% abated still leaves ~7 Mt requiring negatives, stated upfront.',
        },
        evolution: {
          clusters: ['Oman Net Zero 2050', 'PDO Hubs', 'Hydrogen Pairing'],
          milestones: [
            {
              date: '2022-01-01',
              event:
                'The orderly-transition-to-net-zero strategy published: 90 Mt baseline, 6/54/92% abatement path, CCS 5-25%.',
            },
            {
              date: '2024-01-01',
              event:
                'CCUS roadmap work consolidated PDO hub concepts with peridotite mineralisation pilots inside MEM planning.',
            },
            {
              date: '2026-01-01',
              event:
                'Institution-building window: storage, hydrogen and MRV machinery due from the strategy groundwork phase.',
            },
          ],
        },
        regulatory: {
          pore_space_rights:
            'State-owned subsurface; PDO-operated hubs under ministry concession practice.',
          liability_transfer:
            'Long-term stewardship assigned to state via PDO under MEM supervision.',
          liability_period:
            'Not codified; project-lifecycle stewardship pending formal rules.',
          financial_assurance:
            'Hydrogen-paired project finance; dedicated CCS funding lines not published.',
          permitting_lead_time:
            'Integrated with upstream oil and gas permitting practice.',
          co2_definition:
            'Industrial stream for storage, EOR-adjacent use and hydrogen pairing.',
          cross_border_rules:
            'Blue-ammonia export posture implies future cross-border accounting needs.',
        },
      },
      zh: {
        description:
          '阿曼CCUS路线图思想装在2022年有序转向净零战略里：2021年9000万吨基线对2050年1.04亿吨一切照旧，减排2030年6%、2040年54%、2050年92%，碳预算17.6亿吨，CCS占脱碳5-25%——十年内对特定工业点源可行，旁边是绿色电气化（50-60%）、氢（5-10%）与覆盖约700万吨最后一公里的负排放。交付靠PDO运营的封存枢纽与橄榄岩矿化试点，归能源矿产部；头24个月打地基（战略原话）要建起封存氢能MRV制度——国家还在配机器。路线图方向完整、制度早产：战略给了数字（9000万吨基线、6/54/92%路径、17.6亿吨预算），部委还在招人；枢纽概念先行，许可与监测细则随后。',
        scope:
          '阿曼有序转向2050年：CCS占减排5-25%供工业点源、PDO枢纽、橄榄岩矿化、氢搭配、最后一公里负排放、部委制度建设。',
        tags: [
          '有序转向',
          'CCS5-25%',
          'PDO枢纽',
          '橄榄岩',
          '最后一公里',
          '制度建设',
        ],
        impactAnalysis: {
          economic:
            '把CCS框在成本最优路径的5-25%，保护战略不押单边技术，同时给PDO枢纽划定投资包络。',
          technical:
            '点源捕集加枯竭油藏封存叠加橄榄岩矿化试点，第一天起封存组合就不止常规地质一种。',
          environmental:
            '最后一公里提法（枯竭油藏DAC、红树林）保住残余诚实：减92%还剩约700万吨要负排放，开篇就写明。',
        },
        evolution: {
          clusters: ['阿曼2050净零', 'PDO枢纽', '氢搭配'],
          milestones: [
            {
              date: '2022-01-01',
              event:
                '有序转向净零战略发布：9000万吨基线、6/54/92%路径、CCS占5-25%。',
            },
            {
              date: '2024-01-01',
              event:
                'CCUS路线图工作把PDO枢纽概念与橄榄岩矿化试点并入能源部规划。',
            },
            {
              date: '2026-01-01',
              event: '制度建设窗口：战略打地基阶段要交出封存氢能MRV机器。',
            },
          ],
        },
        regulatory: {
          pore_space_rights: '国有地下；PDO运营枢纽走部委特许惯例。',
          liability_transfer: '长期托管归国家经PDO在能源部监督下承担。',
          liability_period: '未法典化；项目周期托管待正式规则。',
          financial_assurance: '氢搭配的项目融资；专用CCS资金线未公布。',
          permitting_lead_time: '与上游油气许可实践整合。',
          co2_definition: '封存、采收利用与氢搭配的工业流。',
          cross_border_rules: '蓝氨出口姿态隐含未来跨境核算需求。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 80,
        label: 'Pathway Envelope',
        evidence:
          'A cost-optimised 5-25% CCS share inside a budgeted 1,760 Mt pathway gives PDO hubs an investible envelope without a dedicated subsidy scheme.',
        citation: 'Oman orderly-transition strategy (2022)',
      },
      market: {
        score: 75,
        label: 'Hub Concentration',
        evidence:
          'PDO-operated hubs concentrate industrial point sources behind shared storage, with hydrogen pairing opening export-linked revenue beside storage service.',
        citation: 'Oman strategy industry pathway',
      },
      mrv: {
        score: 85,
        label: 'Budget Discipline',
        evidence:
          'A revalidated 90 Mt baseline with Carbon Management Lab verification and 6/54/92% checkpoints makes abatement claims checkable against a published budget.',
        citation: 'Oman strategy baseline work (2022)',
      },
      statutory: {
        score: 75,
        label: 'Strategy-Led Direction',
        evidence:
          'Sultan-commissioned strategy with ministry implementation gives direction without dedicated CCS legislation — the acknowledged institutional gap of the first-24-months groundwork.',
        citation: 'Oman orderly-transition strategy (2022)',
      },
      strategic: {
        score: 95,
        label: 'Orderly 6/54/92',
        evidence:
          'The clearest Gulf transition arithmetic: 6% by 2030, 54% by 2040, 92% by 2050 with CCS at 5-25% and a stated ~7 Mt negative-emissions last mile.',
        citation: 'Oman orderly-transition strategy (2022)',
      },
    },
  },
  {
    id: 'qa-national-climate-strategy-2024',
    core: {
      status: 'Active',
      category: 'Strategic',
      legalWeight: 'National Strategy',
    },
    i18n: {
      en: {
        description:
          'Qatar refreshed climate strategy around LNG-integrated CCS: Ras Laffan sequestration operating since 2019 at 2.2 Mt design capacity (then the largest MENA capture-storage facility), with greenfield and brownfield expansions targeting a fivefold capacity increase. NDC 3.0 (November 2025) moved the pledge off business-as-usual baselines to 42 MtCO2e of reductions by 2040 (up from ~37 Mt), across oil and gas (with CCS as a named leading lever), power and water, industry and construction, transport and waste, under the National Development Strategy 2024-2030 and Qatar National Vision 2030. The 25%-by-2030 and 11-Mt-by-2035 capture figures in earlier strategy documents now read as stepping stones to the 2040 pledge. Delivery is QatarEnergy-capital-led inside North Field expansion economics.',
        scope:
          'Qatar climate strategy to 2040: LNG-integrated CCS at Ras Laffan and expansions, five-sector abatement under NDS-3, NDC 3.0 42 Mt pledge, QatarEnergy-led delivery.',
        tags: [
          'Ras Laffan',
          'NDC 3.0',
          'LNG-integrated CCS',
          'fivefold expansion',
          'QatarEnergy',
          '42 Mt pledge',
        ],
        impactAnalysis: {
          economic:
            'CCS capex rides inside North Field expansion economics — the storage business case never stands alone, which is both its strength (funded) and its exposure (gas-price-linked).',
          technical:
            'Operating capture since 2019 with greenfield/brownfield replication gives Qatar the longest MENA operating record to scale from, targeting fivefold growth.',
          environmental:
            'Moving the NDC off BAU baselines to absolute 42 Mt by 2040 tightens the accounting honesty of the pledge itself.',
        },
        evolution: {
          clusters: ['Qatar Climate Strategy', 'Ras Laffan CCS', 'NDC 3.0'],
          milestones: [
            {
              date: '2019-01-01',
              event:
                'Ras Laffan 2.2 Mt sequestration started — then the largest MENA capture-storage facility.',
            },
            {
              date: '2024-01-01',
              event:
                'Refreshed national environment and climate strategy centred LNG-integrated CCS with 2030/2035 capture markers.',
            },
            {
              date: '2025-11-01',
              event:
                'NDC 3.0 pledged 42 MtCO2e by 2040 off BAU baselines with CCS a named leading lever in oil and gas.',
            },
          ],
        },
        regulatory: {
          pore_space_rights:
            'Managed by the State via QatarEnergy and the Ministry of Environment.',
          liability_transfer:
            'Long-term liability for permanent storage overseen by state-led QatarEnergy framework.',
          liability_period:
            'Aligned with project lifecycle (typically 25+ years) with state oversight.',
          financial_assurance:
            'Investment largely driven by state-owned QatarEnergy North Field expansion.',
          permitting_lead_time:
            'Streamlined integration with large-scale LNG infrastructure permits.',
          co2_definition:
            'Strategic industrial emission for sequestration and enhanced oil recovery (EOR).',
          cross_border_rules:
            'Focus on Article 6 international credit trading for national decarbonization.',
        },
      },
      zh: {
        description:
          '卡塔尔围绕LNG一体化CCS刷新气候战略：Ras Laffan封存2019年投运、设计220万吨（当时中东最大），新建扩建目标五倍扩容。NDC 3.0（2025年11月）把承诺从一切照旧基线改成2040年减排4200万吨二氧化碳当量（原约3700万），覆盖油气（含CCS点名领衔）、电力水务、工业建筑、交通、废弃物，装入2024-2030国家发展战略与2030国家愿景。早先战略文件的2030年25%与2035年1100万吨捕集数字，现在读作通往2040年承诺的垫脚石。交付靠卡塔尔能源资本，装在北方气田扩建经济里，五倍扩容是承诺落地的刻度。',
        scope:
          '卡塔尔到2040年气候战略：Ras Laffan及扩建的LNG一体化CCS、NDS-3下五部门减排、NDC 3.0 4200万吨承诺、卡塔尔能源主导交付。',
        tags: [
          'Ras Laffan',
          'NDC3.0',
          'LNG一体化CCS',
          '五倍扩容',
          '卡塔尔能源',
          '4200万吨承诺',
        ],
        impactAnalysis: {
          economic:
            'CCS资本支出搭北方气田扩建的车——封存生意从不单立，这是它的强（有钱）也是它的险（跟气价走）。',
          technical:
            '2019年起运营捕集加新建扩建复制，给卡塔尔中东最长的运营记录去放大，目标五倍。',
          environmental:
            'NDC脱离一切照旧基线改绝对值2040年4200万吨，收紧了承诺本身的核算诚实。',
        },
        evolution: {
          clusters: ['卡塔尔气候战略', 'Ras Laffan CCS', 'NDC3.0'],
          milestones: [
            {
              date: '2019-01-01',
              event: 'Ras Laffan 220万吨封存投运——当时中东最大捕集封存设施。',
            },
            {
              date: '2024-01-01',
              event:
                '更新的国家环境气候战略以LNG一体化CCS为中心，带2030/2035捕集标记。',
            },
            {
              date: '2025-11-01',
              event: 'NDC 3.0承诺2040年4200万吨，CCS在油气部门点名领衔。',
            },
          ],
        },
        regulatory: {
          pore_space_rights:
            '由国家通过卡塔尔能源公司 (QatarEnergy) 和环境部进行管理。',
          liability_transfer:
            '永久封存的长期责任由国家主导的卡塔尔能源框架监督。',
          liability_period:
            '与项目生命周期（通常为 25 年以上）保持一致，受国家监督。',
          financial_assurance:
            '投资主要由国有的卡塔尔能源公司北场 (North Field) 扩建项目推动。',
          permitting_lead_time: '与大型 LNG 基础设施许可流程简化整合。',
          co2_definition: '用于封存和提高石油采收率 (EOR) 的战略工业排放。',
          cross_border_rules: '侧重于利用第 6 条国际信用交易来实现国家脱碳。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 80,
        label: 'Expansion Economics',
        evidence:
          'CCS investment rides North Field expansion capex with fivefold capacity growth targeted — funded by gas economics rather than climate subsidies.',
        citation: 'QatarEnergy expansion programme; NDC 3.0 (Nov 2025)',
      },
      market: {
        score: 70,
        label: 'Single-Operator Chain',
        evidence:
          'Capture-to-storage inside QatarEnergy removes counterparty risk while concentrating the entire national CCS market in one balance sheet.',
        citation: 'NDC 3.0 sectoral coverage (Nov 2025)',
      },
      mrv: {
        score: 85,
        label: 'Operating Record',
        evidence:
          'Metered sequestration since 2019 at Ras Laffan with expansion metering to follow gives the longest MENA measurement record behind the pledge.',
        citation: 'NDC 3.0 (Nov 2025)',
      },
      statutory: {
        score: 75,
        label: 'Strategy-Led Direction',
        evidence:
          'NDS-3 and QNV 2030 framing with sectoral measures, but no dedicated CCS statute — direction without codified licensing.',
        citation: 'NDS-3 (2024-2030); QNV 2030',
      },
      strategic: {
        score: 95,
        label: '42 Mt Pledge',
        evidence:
          'NDC 3.0 absolute 42 MtCO2e by 2040 with CCS a named leading lever in oil and gas — the pledge that turns Ras Laffan from a project into a programme.',
        citation: 'Qatar NDC 3.0 (Nov 2025)',
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

export function applyContentDepthBatch3E(db, { auditDate = AUDIT_DATE } = {}) {
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
    const summary = applyContentDepthBatch3E(db);
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
    console.error(`Content-depth batch 3E migration failed: ${error.message}`);
    process.exit(1);
  });
}

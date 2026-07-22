#!/usr/bin/env node
/**
 * Correct high-confidence policy coverage and lifecycle gaps identified in the
 * July 2026 primary-source audit.
 *
 * SQLite remains the source of truth. Facility facts, capacities, coordinates,
 * country profiles and facility source material are frozen. The only permitted
 * relationship change is consolidation of the legacy Korea cluster alias into
 * the canonical Korean CCUS Act.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'agent/ccus-ai-agent/db/ccus_master.sqlite');

export const MIGRATION_ID = 'policy-coverage-corrections-2026-07';
const AUDIT_REVIEWER = 'Primary-source policy coverage audit';

const FROZEN_TABLES = [
  'facilities',
  'facility_i18n',
  'facility_partners',
  'facility_links',
  'country_profiles',
  'country_i18n',
];

const POLICY_DIMENSIONS = [
  'incentive',
  'market',
  'mrv',
  'statutory',
  'strategic',
];

export const ADDED_POLICIES = [
  {
    core: {
      id: 'de-ksptg-amendment-2025',
      country: 'Germany',
      year: 2025,
      status: 'Active',
      category: 'Regulatory',
      reviewStatus: 'verified',
      legalWeight: 'Primary Legislation',
      source: 'German Federal Ministry of Justice',
      url: 'https://www.gesetze-im-internet.de/kspg/BJNR172610012.html',
      pubDate: '2025-11-25',
      provenanceAuthor: 'CCUS AI Agent',
    },
    i18n: {
      en: {
        title:
          'Germany Carbon Dioxide Storage and Transport Act (KSpTG, 2025 Amendment)',
        description:
          'Germany amended and renamed its federal carbon-dioxide storage law in November 2025. The Carbon Dioxide Storage and Transport Act (KSpTG) creates a broader legal basis for commercial CO2 transport and permanent geological storage, including offshore storage, while excluding protected marine areas. It treats specified CO2 transport and storage infrastructure as being in the overriding public interest and allows German states to enable onshore storage through an opt-in mechanism. The Act implements the EU CCS Directive and supplies the binding legal layer that follows Germany’s 2024 Carbon Management Strategy principles.',
        scope:
          'Federal permitting, planning, transport access and geological storage of carbon dioxide in Germany.',
        tags: ['CCS', 'CO2 transport', 'offshore storage', 'permitting'],
        impactAnalysis: {
          economic:
            'Provides a statutory route for commercial CO2 networks and storage projects, reducing the legal uncertainty that remained under the earlier demonstration-limited regime.',
          technical:
            'Establishes planning and approval requirements for CO2 pipelines and storage sites and enables offshore storage subject to environmental and site-suitability controls.',
          environmental:
            'Expands permanent storage while excluding protected marine areas and retaining environmental assessment, monitoring and liability safeguards under German and EU law.',
        },
        evolution: {
          clusters: [
            'Germany Carbon Management Strategy',
            'EU CCS Directive Implementation',
            'German CO2 Infrastructure',
          ],
          milestones: [
            {
              date: '2024-05-29',
              event:
                'The federal cabinet adopted the Carbon Management Strategy key principles and an initial draft storage-law amendment.',
            },
            {
              date: '2025-11-25',
              event:
                'The binding amendment broadened and renamed the federal law as the Carbon Dioxide Storage and Transport Act.',
            },
          ],
        },
        regulatory: {
          cross_border_rules:
            'CO2 transport and storage remain subject to applicable EU and international cross-border rules.',
          pore_space_rights:
            'Storage requires federal-law approval; German states may enable onshore storage through the statutory opt-in mechanism.',
          permitting_lead_time:
            'Project-specific planning and approval procedures apply; no universal statutory duration is stated.',
        },
      },
      zh: {
        title: '德国《二氧化碳封存与运输法》（KSpTG，2025年修订）',
        description:
          '德国于2025年11月修订并更名联邦二氧化碳封存法律。《二氧化碳封存与运输法》（KSpTG）为商业化二氧化碳运输和永久地质封存建立了更广泛的法律基础，包括海上封存，同时排除海洋保护区。法律将特定二氧化碳运输与封存基础设施认定为具有优先公共利益，并允许各州通过选择加入机制开放陆上封存。该法落实欧盟《二氧化碳地质封存指令》，构成德国2024年碳管理战略原则之后的约束性法律层。',
        scope: '德国联邦层面的二氧化碳运输、规划许可和永久地质封存。',
        tags: ['CCS', '二氧化碳运输', '海上封存', '许可'],
        impactAnalysis: {
          economic:
            '为商业化二氧化碳网络和封存项目提供法定路径，降低此前以示范项目为主的制度所留下的法律不确定性。',
          technical:
            '建立二氧化碳管道和封存场地的规划审批要求，并在环境和场地适宜性约束下允许海上封存。',
          environmental:
            '扩大永久封存适用范围，同时排除海洋保护区，并保留德国法和欧盟法下的环境评估、监测与责任保障。',
        },
        evolution: {
          clusters: ['德国碳管理战略', '欧盟CCS指令实施', '德国二氧化碳基础设施'],
          milestones: [
            {
              date: '2024-05-29',
              event: '德国联邦内阁通过碳管理战略原则及封存法初步修订草案。',
            },
            {
              date: '2025-11-25',
              event: '约束性修法扩大适用范围，并将法律更名为《二氧化碳封存与运输法》。',
            },
          ],
        },
        regulatory: {
          cross_border_rules: '二氧化碳跨境运输和封存仍须遵守适用的欧盟及国际规则。',
          pore_space_rights:
            '封存须依据联邦法律获得批准；各州可通过法定选择加入机制开放陆上封存。',
          permitting_lead_time: '适用项目级规划和审批程序，法律未规定统一审批时长。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 65,
        label: 'Infrastructure-enabling legislation',
        evidence:
          'The Act lowers legal and planning barriers for CO2 transport and storage but does not itself create a dedicated project subsidy.',
        citation: 'KSpTG as amended by the Act of 25 November 2025.',
      },
      market: {
        score: 80,
        label: 'Commercial network framework',
        evidence:
          'The amended law supports commercial CO2 transport and storage infrastructure and includes access and planning provisions needed for shared networks.',
        citation: 'KSpTG, current consolidated text.',
      },
      mrv: {
        score: 85,
        label: 'EU-aligned storage oversight',
        evidence:
          'Storage approvals remain subject to monitoring, environmental protection, closure and responsibility requirements implementing Directive 2009/31/EC.',
        citation: 'KSpTG and Directive 2009/31/EC.',
      },
      statutory: {
        score: 95,
        label: 'Binding federal CCS law',
        evidence:
          'The 2025 amendment creates the binding federal basis for broader CO2 transport and permanent geological storage.',
        citation: 'Federal Law of 25 November 2025 amending the KSpG/KSpTG.',
      },
      strategic: {
        score: 90,
        label: 'Commercial CCS legal transition',
        evidence:
          'The amendment converts Germany’s 2024 carbon-management principles into an operational statutory framework for infrastructure and storage.',
        citation: 'KSpTG and Germany Carbon Management Strategy key principles.',
      },
    },
  },
];

export const POLICY_UPDATES = [
  {
    id: 'th-draft-climate-change-act-2025',
    core: {
      year: 2025,
      status: 'Draft / under legal review',
      category: 'Regulatory',
      reviewStatus: 'verified',
      legalWeight: 'Draft Legislation',
      source:
        'Thailand Department of Climate Change and Environment (DCCE)',
      url: 'https://www.dcce.go.th/datacenter/3345/',
      pubDate: '2025-12-02',
    },
    i18n: {
      en: {
        title: 'Thailand Draft Climate Change Act',
        description:
          'Thailand’s Climate Change Act remains draft legislation. The Cabinet approved the principle of the draft on 2 December 2025, after which the text proceeded through legal review rather than entering into force as an enacted Act. The draft proposes national climate governance, greenhouse-gas data and planning mechanisms, carbon-pricing tools and climate-finance arrangements. It should not be used as evidence that Thailand already has a binding CCS permitting, pore-space, post-closure liability or state-transfer regime.',
        scope:
          'Proposed national climate governance, greenhouse-gas data, carbon pricing and climate-finance architecture.',
        tags: ['draft law', 'climate governance', 'carbon pricing', 'MRV'],
        impactAnalysis: {
          economic:
            'Signals future carbon-pricing and climate-finance architecture, but creates no enforceable project revenue or CCS incentive before enactment and implementing rules.',
          technical:
            'Proposes stronger national greenhouse-gas information and reporting systems; it does not establish detailed CCS engineering or storage standards.',
          environmental:
            'Would provide an economy-wide climate governance framework if enacted, but its current legal effect is limited to the legislative process.',
        },
        evolution: {
          clusters: ['Thailand Climate Law', 'Thailand Carbon Market'],
          milestones: [
            {
              date: '2025-12-02',
              event:
                'The Cabinet approved the principle of the draft Climate Change Act and sent it for legal review.',
            },
            {
              date: '2026-07-22',
              event:
                'Primary-source audit continued to classify the instrument as a draft rather than enacted legislation.',
            },
          ],
        },
        regulatory: {
          co2_definition:
            'The draft addresses greenhouse gases and carbon-market architecture; it is not an enacted CCS-specific CO2 classification rule.',
          cross_border_rules:
            'No binding CCS cross-border transport rule is established by the draft.',
          financial_assurance:
            'No binding CCS financial-assurance requirement is established by the draft.',
          liability_period:
            'No binding CCS post-closure liability period is established by the draft.',
          liability_transfer:
            'No binding transfer-to-state mechanism is established by the draft.',
          permitting_lead_time:
            'No CCS-specific permitting duration is established by the draft.',
          pore_space_rights:
            'No CCS-specific pore-space regime is established by the draft.',
        },
      },
      zh: {
        title: '泰国《气候变化法》草案',
        description:
          '泰国《气候变化法》目前仍属于法律草案。内阁于2025年12月2日原则同意草案，随后文本进入法律审查程序，并未作为已生效法律实施。草案拟建立国家气候治理、温室气体数据与规划、碳定价工具和气候融资安排，但不能据此认定泰国已经形成具有约束力的CCS许可、孔隙空间、封场后责任或责任移交制度。',
        scope: '拟议中的国家气候治理、温室气体数据、碳定价与气候融资架构。',
        tags: ['法律草案', '气候治理', '碳定价', 'MRV'],
        impactAnalysis: {
          economic:
            '释放未来碳定价和气候融资制度信号，但在正式立法和配套规则出台前，不形成可执行的项目收益或CCS激励。',
          technical:
            '拟加强国家温室气体信息和报告体系，但并未建立具体CCS工程或封存技术标准。',
          environmental:
            '若正式通过，可形成全经济气候治理框架；目前法律效力仍限于立法程序。',
        },
        evolution: {
          clusters: ['泰国气候立法', '泰国碳市场'],
          milestones: [
            {
              date: '2025-12-02',
              event: '泰国内阁原则同意《气候变化法》草案，并将其送交法律审查。',
            },
            {
              date: '2026-07-22',
              event: '一手来源复核仍将其认定为草案，而非已生效法律。',
            },
          ],
        },
        regulatory: {
          co2_definition: '草案涉及温室气体和碳市场架构，但不是已生效的CCS专项二氧化碳分类规则。',
          cross_border_rules: '草案未建立具有约束力的CCS跨境运输规则。',
          financial_assurance: '草案未建立具有约束力的CCS财务担保要求。',
          liability_period: '草案未建立具有约束力的封场后责任期限。',
          liability_transfer: '草案未建立具有约束力的责任移交国家机制。',
          permitting_lead_time: '草案未规定CCS专项许可时长。',
          pore_space_rights: '草案未建立CCS专项孔隙空间制度。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 35,
        label: 'Proposed carbon-pricing tools',
        evidence:
          'The draft signals future carbon-pricing and climate-finance tools but is not yet an enforceable incentive instrument.',
        citation: 'DCCE official draft Climate Change Act page.',
      },
      market: {
        score: 40,
        label: 'Draft market architecture',
        evidence:
          'The draft proposes carbon-market governance but does not create an operational compliance market by itself.',
        citation: 'DCCE official draft Climate Change Act.',
      },
      mrv: {
        score: 55,
        label: 'Proposed national GHG data system',
        evidence:
          'The draft proposes greenhouse-gas information and reporting architecture, subject to enactment and implementing rules.',
        citation: 'DCCE official draft Climate Change Act.',
      },
      statutory: {
        score: 35,
        label: 'Cabinet-approved draft principle',
        evidence:
          'Cabinet approval of the principle advanced the legislative process but did not enact the Act.',
        citation: 'DCCE, Cabinet principle approval on 2 December 2025.',
      },
      strategic: {
        score: 75,
        label: 'Economy-wide climate-law proposal',
        evidence:
          'The draft is strategically significant as Thailand’s proposed comprehensive climate law, while legal effect remains prospective.',
        citation: 'DCCE official draft materials.',
      },
    },
  },
  {
    id: 'br-anp-ccs-resolution',
    core: {
      year: 2024,
      status: 'Active — interim',
      category: 'Regulatory',
      reviewStatus: 'verified',
      legalWeight: 'Interim Administrative Resolution',
      source: 'Brazil National Agency of Petroleum, Natural Gas and Biofuels (ANP)',
      url: 'https://www.gov.br/anp/pt-br/assuntos/ccs/ccs',
      pubDate: '2024-12-19',
    },
    i18n: {
      en: {
        title: 'Brazil ANP Resolution 859/2024 — Interim CCS Arrangements',
        description:
          'On 19 December 2024, ANP approved Resolution 859/2024 and internal administrative arrangements to enable evaluation of CCS pilot projects while Brazil’s detailed sector regulation was still being developed. The measure is an interim bridge under Law No. 14,993/2024, not a completed comprehensive licensing code. It should therefore be distinguished from the primary legislation and from later draft implementing decrees or public consultations that have not yet become final regulation.',
        scope:
          'Interim ANP procedures for evaluating pilot CCS projects during development of the detailed regulatory framework.',
        tags: ['interim regulation', 'pilot projects', 'ANP', 'CCS authorisation'],
        impactAnalysis: {
          economic:
            'Allows pilot proposals to enter an administrative evaluation pathway before completion of the permanent detailed regulatory framework.',
          technical:
            'Provides an interim route for project review but does not replace the future detailed technical, monitoring and licensing regulations.',
          environmental:
            'Keeps pilot evaluation within ANP oversight while the permanent environmental and operational rule set remains under development.',
        },
        evolution: {
          clusters: ['Brazil CCS Regulatory Framework', 'ANP CCS Regulation'],
          milestones: [
            {
              date: '2024-10-08',
              event:
                'Law No. 14,993/2024 assigned ANP responsibility for regulating and authorising CCS activities.',
            },
            {
              date: '2024-12-19',
              event:
                'ANP approved Resolution 859/2024 and interim administrative arrangements for pilot-project evaluation.',
            },
            {
              date: '2025-11-17',
              event:
                'A draft implementing decree entered public consultation; consultation did not constitute final regulation.',
            },
          ],
        },
        regulatory: {
          permitting_lead_time:
            'Interim pilot evaluation applies; a universal final licensing duration is not established by Resolution 859/2024.',
          liability_period:
            'Detailed permanent liability rules remain subject to the primary law and future implementing regulation.',
          financial_assurance:
            'A complete permanent financial-assurance code is not established by the interim resolution.',
        },
      },
      zh: {
        title: '巴西ANP第859/2024号决议——CCS临时安排',
        description:
          '2024年12月19日，巴西国家石油、天然气和生物燃料局（ANP）通过第859/2024号决议及内部行政安排，在详细行业监管制度仍在制定期间，为CCS试点项目评估提供临时路径。该措施是第14,993/2024号法律下的过渡性安排，并非已经完成的综合许可法规，也应与尚未正式生效的后续实施法令草案和公众咨询区分。',
        scope: '在详细监管框架制定期间，ANP评估CCS试点项目的临时程序。',
        tags: ['临时监管', '试点项目', 'ANP', 'CCS授权'],
        impactAnalysis: {
          economic:
            '在永久性详细监管完成前，使试点项目可以进入行政评估路径。',
          technical:
            '提供临时项目审查程序，但不能替代未来详细技术、监测和许可法规。',
          environmental:
            '在永久环境和运营规则仍在制定期间，将试点评估纳入ANP监管。',
        },
        evolution: {
          clusters: ['巴西CCS监管框架', 'ANP CCS监管'],
          milestones: [
            {
              date: '2024-10-08',
              event: '第14,993/2024号法律授权ANP监管并批准CCS活动。',
            },
            {
              date: '2024-12-19',
              event: 'ANP通过第859/2024号决议及试点项目评估临时行政安排。',
            },
            {
              date: '2025-11-17',
              event: '实施法令草案进入公众咨询，但咨询本身不构成最终法规。',
            },
          ],
        },
        regulatory: {
          permitting_lead_time:
            '适用临时试点评估程序，第859/2024号决议未规定统一的最终许可时长。',
          liability_period: '永久性详细责任规则仍取决于主体法和未来配套法规。',
          financial_assurance: '临时决议未建立完整的永久性财务担保制度。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 45,
        label: 'Pilot-enabling bridge',
        evidence:
          'The interim arrangements enable administrative evaluation of pilot projects but provide no dedicated fiscal support.',
        citation: 'ANP official CCUS page; Resolution 859/2024.',
      },
      market: {
        score: 50,
        label: 'Interim project pathway',
        evidence:
          'Pilot projects can be evaluated while the permanent commercial regulatory framework remains under development.',
        citation: 'ANP official CCUS implementation summary.',
      },
      mrv: {
        score: 55,
        label: 'Interim oversight',
        evidence:
          'ANP oversight applies to pilot evaluation, but detailed permanent monitoring and reporting rules are not completed by this resolution.',
        citation: 'ANP Resolution 859/2024 and official implementation summary.',
      },
      statutory: {
        score: 65,
        label: 'Interim ANP resolution',
        evidence:
          'Resolution 859/2024 is a valid interim administrative instrument under Law No. 14,993/2024, not the final comprehensive CCS code.',
        citation: 'ANP official CCUS page.',
      },
      strategic: {
        score: 70,
        label: 'Regulatory bridge to implementation',
        evidence:
          'The measure prevents a complete administrative standstill while Brazil develops detailed CCS regulation.',
        citation: 'ANP official CCUS page.',
      },
    },
  },
  {
    id: 'kr-ccus-act',
    core: {
      year: 2024,
      status: 'Active',
      category: 'Regulatory',
      reviewStatus: 'verified',
      legalWeight: 'Primary Legislation',
      source: 'Korean National Law Information Center',
      url: 'https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=280027',
      pubDate: '2024-02-06',
    },
    i18n: {
      en: {
        title:
          'South Korea Act on Carbon Dioxide Capture, Transport, Storage and Utilisation',
        description:
          'South Korea enacted Act No. 20203 on 6 February 2024, and the Act entered into force on 7 February 2025 together with Presidential Decree No. 35243 and implementing rules. The framework covers capture-facility plans, transport-business approvals, storage-business permits, storage-site requirements, CO2 stream quality, safety, monitoring, closure and support for technology development and industrialisation. An amendment effective on 2 December 2025 authorised government or local-government support for purchasers of products made using captured CO2. The implementing decree was subsequently updated, with the current consolidated version effective from 31 March 2026.',
        scope:
          'National full-chain governance for carbon dioxide capture, transport, geological storage and utilisation.',
        tags: ['CCUS law', 'transport approval', 'storage permit', 'CO2 utilisation'],
        impactAnalysis: {
          economic:
            'Creates national approval and support mechanisms across the CCUS chain and, from December 2025, permits support for purchasers of captured-CO2 utilisation products.',
          technical:
            'The Act, decree and rules specify capture notifications, transport approvals, storage criteria, CO2 stream conditions, safety and monitoring requirements.',
          environmental:
            'Provides the statutory basis for safe geological storage, monitoring and closure while linking CCUS industrialisation to greenhouse-gas mitigation.',
        },
        evolution: {
          consolidatedFrom: ['kr-motie-cluster-district-2025'],
          clusters: ['Korea CCUS Act', 'K-CCUS Industrialisation'],
          milestones: [
            {
              date: '2024-02-06',
              event: 'Act No. 20203 was enacted.',
            },
            {
              date: '2025-02-07',
              event:
                'The Act entered into force together with Presidential Decree No. 35243 and implementing rules.',
            },
            {
              date: '2025-12-02',
              event:
                'Act No. 21150 added authority to support purchasers of products made using captured CO2.',
            },
            {
              date: '2026-03-31',
              event: 'The current consolidated implementing decree became effective.',
            },
          ],
        },
        regulatory: {
          co2_definition:
            'The Act defines captured carbon dioxide and covers gaseous, liquid, solid and supercritical forms through the implementing decree.',
          permitting_lead_time:
            'Capture plans, transport businesses and storage businesses follow separate statutory notification, approval and permit procedures.',
          liability_period:
            'Obligations are defined through the Act, decree, permit conditions and closure requirements rather than a single universal monitoring-year claim.',
          financial_assurance:
            'Project-specific safety and compliance obligations apply; no unsupported universal financial-assurance amount is stated here.',
          cross_border_rules:
            'The Act covers capture for domestic or overseas storage or utilisation, subject to other applicable transport and marine rules.',
        },
      },
      zh: {
        title: '韩国《二氧化碳捕集、运输、封存及利用法》',
        description:
          '韩国于2024年2月6日制定第20203号法律，并于2025年2月7日与第35243号总统令及实施规则同步生效。该制度覆盖捕集设施计划、运输业务批准、封存业务许可、封存场地标准、二氧化碳流质量、安全、监测、关闭以及技术研发和产业化支持。2025年12月2日生效的修法进一步授权中央或地方政府支持使用捕集二氧化碳生产产品的购买者。实施令随后更新，现行合并版本自2026年3月31日起施行。',
        scope: '韩国二氧化碳捕集、运输、地质封存和利用的全链条国家治理。',
        tags: ['CCUS法律', '运输批准', '封存许可', '二氧化碳利用'],
        impactAnalysis: {
          economic:
            '建立覆盖CCUS全链条的国家批准与支持机制，并自2025年12月起允许支持捕集二氧化碳利用产品的购买者。',
          technical:
            '法律、实施令和实施规则规定捕集申报、运输批准、封存标准、二氧化碳流状态、安全和监测要求。',
          environmental:
            '为安全地质封存、监测和关闭提供法律基础，并将CCUS产业化与温室气体减排相衔接。',
        },
        evolution: {
          consolidatedFrom: ['kr-motie-cluster-district-2025'],
          clusters: ['韩国CCUS法', 'K-CCUS产业化'],
          milestones: [
            { date: '2024-02-06', event: '第20203号法律制定。' },
            {
              date: '2025-02-07',
              event: '法律与第35243号总统令及实施规则同步生效。',
            },
            {
              date: '2025-12-02',
              event: '第21150号修法增加对捕集二氧化碳利用产品购买者的支持权限。',
            },
            {
              date: '2026-03-31',
              event: '现行合并版实施令生效。',
            },
          ],
        },
        regulatory: {
          co2_definition: '法律定义捕集二氧化碳，实施令覆盖气态、液态、固态及超临界状态。',
          permitting_lead_time:
            '捕集计划、运输业务和封存业务分别适用法定申报、批准和许可程序。',
          liability_period:
            '责任通过法律、实施令、许可条件和关闭要求确定，不采用缺乏依据的统一监测年限。',
          financial_assurance: '适用项目级安全和合规义务，本记录不主张缺乏依据的统一担保金额。',
          cross_border_rules:
            '法律覆盖面向境内外封存或利用的捕集活动，同时须遵守其它适用运输和海洋规则。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 80,
        label: 'Statutory industrial support',
        evidence:
          'The Act authorises support for CCUS technology and industrialisation, and the December 2025 amendment permits support for purchasers of captured-CO2 utilisation products.',
        citation: 'Act Nos. 20203 and 21150.',
      },
      market: {
        score: 80,
        label: 'Full-chain approval framework',
        evidence:
          'Separate statutory pathways govern capture plans, transport-business approvals, storage permits and utilisation support.',
        citation: 'Act No. 20203 and Presidential Decree No. 35243.',
      },
      mrv: {
        score: 85,
        label: 'Storage and safety controls',
        evidence:
          'The implementing framework addresses storage-site standards, CO2 stream conditions, monitoring, safety and closure without relying on an unsupported universal 15-year claim.',
        citation: 'Current Act, implementing decree and implementing rules.',
      },
      statutory: {
        score: 95,
        label: 'Binding national CCUS law',
        evidence:
          'The Act and implementing instruments form a binding national framework effective from 7 February 2025.',
        citation: 'Act No. 20203; Presidential Decree No. 35243.',
      },
      strategic: {
        score: 90,
        label: 'National CCUS industrialisation framework',
        evidence:
          'The law integrates technology development, infrastructure, storage governance and utilisation-market support.',
        citation: 'Act No. 20203 as amended by Act No. 21150.',
      },
    },
  },
  {
    id: 'uk-ccs-network-code',
    core: {
      year: 2025,
      status: 'Active',
      category: 'Regulatory',
      reviewStatus: 'verified',
      legalWeight: 'Industry Network Code / Contractual Market Rule',
      source: 'UK Department for Energy Security and Net Zero',
      url: 'https://www.gov.uk/government/publications/carbon-capture-usage-and-storage-ccus-business-models',
      pubDate: '2025-01-17',
    },
    i18n: {
      en: {
        title: 'UK Carbon Capture and Storage Network Code',
        description:
          'The UK published the initial full-form Carbon Capture and Storage Network Code in January 2025. The Code Implementation Date is 10 December 2024, and the live version is maintained by the carbon-dioxide transport and storage operators that accede to it. The Code governs commercial, operational and technical arrangements for access to and use of regulated CO2 transport and storage networks. It is therefore no longer merely a proposed heads-of-terms framework, although it operates alongside statutory economic licences, project contracts and the Energy Act 2023 rather than replacing them.',
        scope:
          'Commercial, operational and technical rules for access to UK CO2 transport and storage networks.',
        tags: ['network code', 'third-party access', 'CO2 transport', 'storage network'],
        impactAnalysis: {
          economic:
            'Standardises network-user arrangements and reduces cross-chain contracting uncertainty for shared transport and storage infrastructure.',
          technical:
            'Defines operational interfaces, connection and use arrangements and network-management processes maintained by participating operators.',
          environmental:
            'Supports controlled delivery of captured CO2 to regulated storage networks while environmental integrity remains governed by permits and storage law.',
        },
        evolution: {
          clusters: ['UK CCUS Business Models', 'UK CO2 Network Regulation'],
          milestones: [
            {
              date: '2023-12-20',
              event: 'The government published Network Code heads of terms.',
            },
            {
              date: '2024-12-10',
              event: 'The Code Implementation Date occurred.',
            },
            {
              date: '2025-01-17',
              event: 'The initial full-form CCS Network Code was published.',
            },
            {
              date: '2026-02-11',
              event:
                'The government business-model page confirmed the live code is maintained by acceding transport and storage operators.',
            },
          ],
        },
        regulatory: {
          cross_border_rules:
            'The Code governs participating UK network arrangements; international transport remains subject to separate domestic and international approvals.',
          permitting_lead_time:
            'Network accession and connection processes are governed by the Code and project-specific agreements rather than one universal duration.',
        },
      },
      zh: {
        title: '英国碳捕集与封存网络规则',
        description:
          '英国于2025年1月发布首个完整版本的《碳捕集与封存网络规则》，规则实施日为2024年12月10日，现行版本由加入该规则的二氧化碳运输与封存运营商维护。该规则规范使用受监管二氧化碳运输和封存网络的商业、运营与技术安排，因此已不再只是拟议的条款框架；但它与法定经济许可、项目合同及《2023年能源法》共同运行，并不替代这些制度。',
        scope: '英国二氧化碳运输和封存网络接入与使用的商业、运营和技术规则。',
        tags: ['网络规则', '第三方接入', '二氧化碳运输', '封存网络'],
        impactAnalysis: {
          economic:
            '统一网络用户安排，降低共享运输和封存基础设施的跨链条合同不确定性。',
          technical:
            '规定运营接口、连接和使用安排以及由参与运营商维护的网络管理流程。',
          environmental:
            '支持捕集二氧化碳受控进入受监管封存网络，环境完整性仍由许可和封存法律保障。',
        },
        evolution: {
          clusters: ['英国CCUS商业模式', '英国二氧化碳网络监管'],
          milestones: [
            { date: '2023-12-20', event: '政府发布网络规则条款框架。' },
            { date: '2024-12-10', event: '网络规则实施日。' },
            { date: '2025-01-17', event: '首个完整版本CCS网络规则发布。' },
            {
              date: '2026-02-11',
              event: '政府商业模式页面确认，现行规则由加入规则的运输与封存运营商维护。',
            },
          ],
        },
        regulatory: {
          cross_border_rules:
            '规则规范参与英国网络的安排，国际运输仍须取得其它国内及国际批准。',
          permitting_lead_time:
            '网络加入和连接程序由规则及项目合同确定，不存在统一审批时长。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 75,
        label: 'Contracting-risk reduction',
        evidence:
          'The Code standardises network relationships and supports bankability but is not itself a subsidy instrument.',
        citation: 'DESNZ CCUS Business Models, January 2025 update.',
      },
      market: {
        score: 90,
        label: 'Operational network market rule',
        evidence:
          'The full-form Code governs commercial and operational participation in shared CO2 transport and storage networks.',
        citation: 'UK CCS Network Code, January 2025.',
      },
      mrv: {
        score: 75,
        label: 'Network-interface controls',
        evidence:
          'The Code establishes operational and information interfaces, while emissions accounting and storage MRV remain in separate permits and legal instruments.',
        citation: 'UK CCS Network Code and Energy Act framework.',
      },
      statutory: {
        score: 80,
        label: 'Active contractual market rule',
        evidence:
          'The Code is active and maintained by acceding operators, operating alongside statutory economic licences and the Energy Act 2023.',
        citation: 'DESNZ CCUS Business Models page, updated 11 February 2026.',
      },
      strategic: {
        score: 85,
        label: 'Shared-network implementation',
        evidence:
          'The Code translates the UK cluster model into repeatable rules for multi-user transport and storage networks.',
        citation: 'UK CCS Network Code, January 2025.',
      },
    },
  },
  {
    id: 'eu-nzia',
    core: {
      year: 2024,
      status: 'Active',
      category: 'Regulatory',
      reviewStatus: 'verified',
      legalWeight: 'Primary Legislation',
      source: 'European Union (EUR-Lex)',
      url: 'https://eur-lex.europa.eu/eli/reg/2024/1735/oj',
      pubDate: '2024-06-28',
    },
    i18n: {
      en: {
        title: 'EU Net-Zero Industry Act (NZIA)',
        description:
          'Regulation (EU) 2024/1735 establishes a Union objective of at least 50 million tonnes per year of available operational CO2 injection capacity by 2030 and requires authorised oil and gas producers to contribute pro rata. Commission Delegated Regulation (EU) 2025/1477, published on 25 July 2025 and in force, specifies identification, contribution-calculation and reporting rules. Commission Decision (EU) 2025/1479, published the same day and in force, identifies obligated entities and assigns their individual contribution obligations. These measures move the NZIA storage obligation from a legislative target into an entity-level implementation mechanism.',
        scope:
          'EU 2030 CO2 injection-capacity objective and producer contribution obligations.',
        tags: ['NZIA', 'CO2 injection capacity', 'producer obligation', 'reporting'],
        impactAnalysis: {
          economic:
            'Allocates part of the storage-capacity development burden to authorised oil and gas producers and creates identifiable obligations that support storage-market investment.',
          technical:
            'Requires project and capacity reporting, storage-site information, transport planning and progress evidence for capacity expected by 2030.',
          environmental:
            'Creates an implementation mechanism for at least 50 Mtpa of available injection capacity while storage integrity remains governed by the CCS Directive and permits.',
        },
        evolution: {
          clusters: [
            'European Green Deal',
            'EU Industrial Carbon Management',
            'EU CO2 Storage Market',
          ],
          milestones: [
            {
              date: '2024-06-28',
              event: 'Regulation (EU) 2024/1735 entered into force.',
            },
            {
              date: '2025-07-25',
              event:
                'Delegated Regulation (EU) 2025/1477 specified identification, calculation and reporting rules.',
            },
            {
              date: '2025-07-25',
              event:
                'Commission Decision (EU) 2025/1479 listed obligated entities and their individual pro-rata contributions.',
            },
          ],
        },
        regulatory: {
          cross_border_rules:
            'The contribution mechanism applies at Union level; project transport and storage remain subject to EU and Member-State permits and cross-border rules.',
          financial_assurance:
            'NZIA contribution obligations do not replace storage-site financial security under the CCS Directive.',
        },
      },
      zh: {
        title: '欧盟《净零工业法》（NZIA）',
        description:
          '欧盟第2024/1735号条例设定到2030年至少形成每年5000万吨可用运营二氧化碳注入能力的欧盟目标，并要求获授权的油气生产商按比例承担贡献义务。2025年7月25日公布并生效的欧盟委员会第2025/1477号授权条例明确了义务主体识别、贡献计算和报告规则；同日公布并生效的第2025/1479号决定列明义务实体及其各自贡献量。这些措施使NZIA封存义务从立法目标进入企业级实施阶段。',
        scope: '欧盟2030年二氧化碳注入能力目标及油气生产商贡献义务。',
        tags: ['NZIA', '二氧化碳注入能力', '生产商义务', '报告'],
        impactAnalysis: {
          economic:
            '将部分封存能力建设责任分配给获授权油气生产商，并通过明确企业义务支持封存市场投资。',
          technical:
            '要求报告项目与能力、封存场地信息、运输规划和2030年前能力投运进展证据。',
          environmental:
            '为至少5000万吨/年可用注入能力建立实施机制，封存完整性仍由CCS指令及许可制度保障。',
        },
        evolution: {
          clusters: ['欧洲绿色协议', '欧盟工业碳管理', '欧盟二氧化碳封存市场'],
          milestones: [
            { date: '2024-06-28', event: '欧盟第2024/1735号条例生效。' },
            {
              date: '2025-07-25',
              event: '第2025/1477号授权条例明确主体识别、贡献计算和报告规则。',
            },
            {
              date: '2025-07-25',
              event: '第2025/1479号决定列明义务实体及其各自按比例贡献量。',
            },
          ],
        },
        regulatory: {
          cross_border_rules:
            '贡献机制在欧盟层面适用，具体运输和封存项目仍须遵守欧盟及成员国许可和跨境规则。',
          financial_assurance: 'NZIA贡献义务不替代CCS指令下封存场地的财务担保。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 80,
        label: 'Producer-funded capacity obligation',
        evidence:
          'The framework assigns identifiable contribution obligations to authorised oil and gas producers, supporting investment in available injection capacity.',
        citation:
          'Regulation (EU) 2024/1735, Article 23; Delegated Regulation 2025/1477; Decision 2025/1479.',
      },
      market: {
        score: 90,
        label: 'Entity-level storage obligations',
        evidence:
          'Decision 2025/1479 identifies obligated entities and individual contribution amounts, strengthening the investment signal for storage services.',
        citation: 'Commission Decision (EU) 2025/1479.',
      },
      mrv: {
        score: 95,
        label: 'Detailed capacity reporting',
        evidence:
          'Delegated Regulation 2025/1477 specifies producer identification, project information and reporting obligations for 2030 capacity delivery.',
        citation: 'Commission Delegated Regulation (EU) 2025/1477.',
      },
      statutory: {
        score: 100,
        label: 'Binding Union implementation mechanism',
        evidence:
          'The NZIA target is supplemented by an in-force delegated regulation and an in-force decision assigning individual obligations.',
        citation:
          'Regulation (EU) 2024/1735; Delegated Regulation 2025/1477; Decision 2025/1479.',
      },
      strategic: {
        score: 100,
        label: '50 Mtpa by 2030',
        evidence:
          'The EU maintains a legally defined objective of at least 50 Mtpa of available operational injection capacity by 2030.',
        citation: 'Regulation (EU) 2024/1735, Article 20.',
      },
    },
  },
];

export const CONSOLIDATIONS = [
  {
    aliasId: 'kr-motie-cluster-district-2025',
    canonicalId: 'kr-ccus-act',
  },
];

export const REMOVED_POLICIES = [
  {
    id: 'ph-ccus-policy-framework-2025',
    reason:
      'No matching official 2025 Philippine DOE CCUS departmental circular was identified; the record asserted unsupported permit, bond, monitoring and liability rules.',
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

function queryRows(db, sql, params = []) {
  const statement = db.prepare(sql);
  statement.bind(params);
  const columns = statement.getColumnNames();
  const rows = [];
  while (statement.step()) {
    const values = statement.get();
    rows.push(
      Object.fromEntries(
        columns.map((column, index) => [column, values[index]])
      )
    );
  }
  statement.free();
  return rows;
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

function policyExists(db, id) {
  return Number(scalar(db, 'SELECT COUNT(*) FROM policies WHERE id = ?', [id])) > 0;
}

function upsertPolicyCore(db, core, auditDate) {
  execute(
    db,
    `INSERT INTO policies (
       id, country, year, status, category, review_status, legal_weight,
       source, url, pub_date, provenance_author, provenance_reviewer,
       provenance_last_audit_date
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       country = excluded.country,
       year = excluded.year,
       status = excluded.status,
       category = excluded.category,
       review_status = excluded.review_status,
       legal_weight = excluded.legal_weight,
       source = excluded.source,
       url = excluded.url,
       pub_date = excluded.pub_date,
       provenance_author = excluded.provenance_author,
       provenance_reviewer = excluded.provenance_reviewer,
       provenance_last_audit_date = excluded.provenance_last_audit_date`,
    [
      core.id,
      core.country,
      core.year,
      core.status,
      core.category,
      core.reviewStatus,
      core.legalWeight,
      core.source,
      core.url,
      core.pubDate,
      core.provenanceAuthor,
      AUDIT_REVIEWER,
      auditDate,
    ]
  );
}

function upsertPolicyI18n(db, policyId, lang, localized) {
  execute(
    db,
    `INSERT INTO policy_i18n (
       policy_id, lang, title, description, scope, tags_json,
       impact_analysis_json, interpretation, evolution_json, regulatory_json
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(policy_id, lang) DO UPDATE SET
       title = excluded.title,
       description = excluded.description,
       scope = excluded.scope,
       tags_json = excluded.tags_json,
       impact_analysis_json = excluded.impact_analysis_json,
       interpretation = excluded.interpretation,
       evolution_json = excluded.evolution_json,
       regulatory_json = excluded.regulatory_json`,
    [
      policyId,
      lang,
      localized.title,
      localized.description,
      localized.scope ?? null,
      localized.tags ? JSON.stringify(localized.tags) : null,
      localized.impactAnalysis
        ? JSON.stringify(localized.impactAnalysis)
        : null,
      localized.interpretation ?? null,
      localized.evolution ? JSON.stringify(localized.evolution) : null,
      localized.regulatory ? JSON.stringify(localized.regulatory) : null,
    ]
  );
}

function upsertPolicyAnalysis(db, policyId, dimension, values) {
  execute(
    db,
    `INSERT INTO policy_analysis (
       policy_id, dimension, score, label, evidence, citation, audit_note
     ) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(policy_id, dimension) DO UPDATE SET
       score = excluded.score,
       label = excluded.label,
       evidence = excluded.evidence,
       citation = excluded.citation,
       audit_note = excluded.audit_note`,
    [
      policyId,
      dimension,
      values.score,
      values.label,
      values.evidence,
      values.citation,
      values.auditNote ?? '',
    ]
  );
}

function addPolicy(db, policy, auditDate) {
  upsertPolicyCore(db, policy.core, auditDate);
  for (const lang of ['en', 'zh']) {
    upsertPolicyI18n(db, policy.core.id, lang, policy.i18n[lang]);
  }
  for (const [dimension, values] of Object.entries(policy.analysis)) {
    upsertPolicyAnalysis(db, policy.core.id, dimension, values);
  }
}

function updatePolicy(db, update, auditDate) {
  if (!policyExists(db, update.id)) {
    throw new Error(`Policy is missing: ${update.id}`);
  }

  const core = { ...update.core, id: update.id };
  execute(
    db,
    `UPDATE policies SET
       year = ?, status = ?, category = ?, review_status = ?, legal_weight = ?,
       source = ?, url = ?, pub_date = ?, provenance_reviewer = ?,
       provenance_last_audit_date = ?
     WHERE id = ?`,
    [
      core.year,
      core.status,
      core.category,
      core.reviewStatus,
      core.legalWeight,
      core.source,
      core.url,
      core.pubDate,
      AUDIT_REVIEWER,
      auditDate,
      update.id,
    ]
  );

  for (const lang of ['en', 'zh']) {
    upsertPolicyI18n(db, update.id, lang, update.i18n[lang]);
  }
  for (const [dimension, values] of Object.entries(update.analysis)) {
    upsertPolicyAnalysis(db, update.id, dimension, values);
  }
}

function consolidatePolicy(db, aliasId, canonicalId) {
  if (!policyExists(db, aliasId)) return 0;
  if (!policyExists(db, canonicalId)) {
    throw new Error(`Canonical policy is missing: ${canonicalId}`);
  }

  const linksBefore = Number(
    scalar(
      db,
      'SELECT COUNT(*) FROM policy_facility_links WHERE policy_id = ?',
      [aliasId]
    ) || 0
  );
  execute(
    db,
    `INSERT OR IGNORE INTO policy_facility_links (policy_id, facility_id)
     SELECT ?, facility_id FROM policy_facility_links WHERE policy_id = ?`,
    [canonicalId, aliasId]
  );
  execute(db, 'DELETE FROM policies WHERE id = ?', [aliasId]);
  return linksBefore;
}

function removeUnsupportedPolicy(db, id) {
  if (!policyExists(db, id)) return false;
  const linkCount = Number(
    scalar(
      db,
      'SELECT COUNT(*) FROM policy_facility_links WHERE policy_id = ?',
      [id]
    ) || 0
  );
  if (linkCount !== 0) {
    throw new Error(`Unsupported policy ${id} still has ${linkCount} facility links`);
  }
  execute(db, 'DELETE FROM policies WHERE id = ?', [id]);
  return true;
}

function verifyPolicyCompleteness(db, id) {
  const i18nCount = Number(
    scalar(db, 'SELECT COUNT(*) FROM policy_i18n WHERE policy_id = ?', [id])
  );
  const analysisRows = queryRows(
    db,
    'SELECT dimension FROM policy_analysis WHERE policy_id = ? ORDER BY dimension',
    [id]
  ).map((row) => row.dimension);
  if (i18nCount !== 2) {
    throw new Error(`Policy ${id} does not have exact bilingual parity`);
  }
  for (const dimension of POLICY_DIMENSIONS) {
    if (!analysisRows.includes(dimension)) {
      throw new Error(`Policy ${id} is missing analysis dimension ${dimension}`);
    }
  }
}

export function applyPolicyCoverageCorrectionMigration(
  db,
  { auditDate = '2026-07-22', expectedPolicyCount = 127 } = {}
) {
  db.run('PRAGMA foreign_keys = ON');

  const beforePolicyCount = Number(scalar(db, 'SELECT COUNT(*) FROM policies'));
  const alreadyApplied = Boolean(
    scalar(db, 'SELECT value FROM db_meta WHERE key = ?', [
      `migration:${MIGRATION_ID}`,
    ])
  );
  if (!alreadyApplied && beforePolicyCount !== expectedPolicyCount) {
    throw new Error(
      `Unexpected policy baseline: expected ${expectedPolicyCount}, found ${beforePolicyCount}`
    );
  }

  const frozenBefore = snapshotFrozenTables(db);
  const additionsBefore = ADDED_POLICIES.filter(
    (policy) => !policyExists(db, policy.core.id)
  ).length;
  const removalsBefore = REMOVED_POLICIES.filter((policy) =>
    policyExists(db, policy.id)
  ).length;
  const aliasesBefore = CONSOLIDATIONS.filter((item) =>
    policyExists(db, item.aliasId)
  ).length;
  const relationshipCountBefore = Number(
    scalar(db, 'SELECT COUNT(*) FROM policy_facility_links')
  );

  let consolidatedLinks = 0;
  let removedPolicies = 0;

  db.run('BEGIN TRANSACTION');
  try {
    for (const policy of ADDED_POLICIES) addPolicy(db, policy, auditDate);
    for (const update of POLICY_UPDATES) updatePolicy(db, update, auditDate);
    for (const item of CONSOLIDATIONS) {
      consolidatedLinks += consolidatePolicy(
        db,
        item.aliasId,
        item.canonicalId
      );
    }
    for (const policy of REMOVED_POLICIES) {
      if (removeUnsupportedPolicy(db, policy.id)) removedPolicies += 1;
    }

    for (const policy of ADDED_POLICIES) {
      verifyPolicyCompleteness(db, policy.core.id);
    }
    for (const update of POLICY_UPDATES) {
      verifyPolicyCompleteness(db, update.id);
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

  const afterPolicyCount = Number(scalar(db, 'SELECT COUNT(*) FROM policies'));
  const expectedAfter =
    beforePolicyCount + additionsBefore - removalsBefore - aliasesBefore;
  if (afterPolicyCount !== expectedAfter) {
    throw new Error(
      `Unexpected policy count after migration: expected ${expectedAfter}, found ${afterPolicyCount}`
    );
  }

  const orphanLinks = Number(
    scalar(
      db,
      `SELECT COUNT(*) FROM policy_facility_links pfl
       LEFT JOIN policies p ON p.id = pfl.policy_id
       LEFT JOIN facilities f ON f.id = pfl.facility_id
       WHERE p.id IS NULL OR f.id IS NULL`
    ) || 0
  );
  if (orphanLinks !== 0) {
    throw new Error(`Policy relationship migration created ${orphanLinks} orphan links`);
  }

  return {
    migrationId: MIGRATION_ID,
    alreadyApplied,
    beforePolicyCount,
    addedPolicies: additionsBefore,
    correctedPolicies: POLICY_UPDATES.length,
    consolidatedPolicies: aliasesBefore,
    consolidatedLinks,
    removedPolicies,
    afterPolicyCount,
    relationshipCountBefore,
    relationshipCountAfter: Number(
      scalar(db, 'SELECT COUNT(*) FROM policy_facility_links')
    ),
    frozenTablesVerified: FROZEN_TABLES,
  };
}

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database not found: ${DB_PATH}`);
  }
  const SQL = await initSqlJs();
  const db = new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)));
  const summary = applyPolicyCoverageCorrectionMigration(db);
  const output = db.export();
  db.close();
  fs.writeFileSync(DB_PATH, new Uint8Array(output));
  console.log(JSON.stringify(summary, null, 2));
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  main().catch((error) => {
    console.error(`Policy coverage correction migration failed: ${error.message}`);
    process.exit(1);
  });
}

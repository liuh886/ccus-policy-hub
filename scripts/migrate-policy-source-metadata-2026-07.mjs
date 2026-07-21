#!/usr/bin/env node
/**
 * Repair missing policy source labels and URLs in the SQLite SSOT.
 *
 * The migration also corrects policy identity, year, legal status or scope
 * where an official primary source shows that the existing record is
 * materially inaccurate. Generated Markdown and public JSON must be rebuilt
 * from SQLite after this migration runs.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'agent/ccus-ai-agent/db/ccus_master.sqlite');

export const MIGRATION_ID = 'policy-source-metadata-2026-07';

export const POLICY_UPDATES = [
  {
    id: 'au-offshore-ghg-act',
    core: {
      year: 2006,
      status: 'Active',
      category: 'Regulatory',
      reviewStatus: 'verified',
      legalWeight: 'Primary Legislation',
      source: 'Australian Federal Register of Legislation',
      url: 'https://www.legislation.gov.au/C2006A00014/latest',
      pubDate: '2006-03-29',
    },
    i18n: {
      en: {
        title: 'Australia Offshore Petroleum and Greenhouse Gas Storage Act 2006',
        description:
          'The Offshore Petroleum and Greenhouse Gas Storage Act 2006 is the principal Commonwealth legislation governing offshore petroleum and greenhouse-gas storage activities. As amended, it provides the title, declaration, licensing, site-plan, monitoring, closure and regulatory architecture for geological storage in Commonwealth offshore areas. Dedicated injection-and-storage regulations made in 2023 prescribe site-plan, containment-risk, monitoring and closure requirements under the Act.',
      },
      zh: {
        title: '澳大利亚《2006年海上石油和温室气体封存法》',
        description:
          '《2006年海上石油和温室气体封存法》是澳大利亚联邦管理海上石油和温室气体地质封存活动的核心法律。经后续修订，该法建立了联邦海域封存地层认定、权利与许可、场地计划、监测、关闭及监管框架。2023年配套的温室气体注入与封存条例进一步规定了场地计划、封存风险、监测和关闭要求。',
      },
    },
    analysis: {
      statutory: {
        label: 'Primary offshore CCS law',
        evidence:
          'The Act creates the Commonwealth offshore title and licensing framework for greenhouse-gas exploration, injection and storage, supplemented by the 2023 injection-and-storage regulations.',
        citation:
          'Offshore Petroleum and Greenhouse Gas Storage Act 2006; Offshore Petroleum and Greenhouse Gas Storage (Greenhouse Gas Injection and Storage) Regulations 2023.',
      },
    },
  },
  {
    id: 'au-safeguard-mechanism',
    core: {
      source: 'Australian Department of Climate Change, Energy, the Environment and Water (DCCEEW)',
      url: 'https://www.dcceew.gov.au/climate-change/emissions-reporting/national-greenhouse-energy-reporting-scheme/safeguard-mechanism',
      pubDate: '2023-07-01',
    },
  },
  {
    id: 'br-bill-1425-2022',
    core: {
      year: 2022,
      status: 'Proposed',
      category: 'Regulatory',
      reviewStatus: 'verified',
      legalWeight: 'Proposed Legislation',
      source: 'Brazilian Federal Senate',
      url: 'https://www25.senado.leg.br/web/atividade/materias/-/materia/153342',
      pubDate: '2022-05-31',
    },
    i18n: {
      en: {
        title: 'Brazil Bill PL 1425/2022 on CO2 Storage',
        description:
          'PL 1425/2022 proposes rules for permanent or temporary storage of carbon dioxide and its subsequent use. The Federal Senate approved the proposal in committee and sent it to the Chamber of Deputies in September 2023. It is a legislative proposal, not an enacted or currently operative CCS framework.',
      },
      zh: {
        title: '巴西二氧化碳封存法案 PL 1425/2022',
        description:
          'PL 1425/2022 拟规范二氧化碳永久或临时封存及其后续利用。巴西联邦参议院委员会通过该提案，并于2023年9月送交众议院。该文件仍属于立法提案，不能表述为已经生效的巴西CCS法律框架。',
      },
    },
    analysis: {
      statutory: {
        score: 20,
        label: 'Bill under consideration',
        evidence:
          'PL 1425/2022 was approved in the Federal Senate committee process and transmitted to the Chamber of Deputies; it is not enacted law.',
        citation: 'Brazilian Federal Senate legislative record for PL 1425/2022.',
      },
    },
  },
  {
    id: 'alberta-tier',
    core: {
      source: 'Government of Alberta',
      url: 'https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation',
    },
  },
  {
    id: 'cn-ccus-roadmap-2025',
    core: {
      source: 'Administrative Centre for China’s Agenda 21 (ACCA21)',
      url: 'https://www.acca21.org.cn/trs/00010004/17430.html',
      pubDate: '2025-10-23',
    },
  },
  {
    id: 'cn-demo-tech-2024',
    core: {
      year: 2023,
      source: 'National Development and Reform Commission and nine other departments',
      url: 'https://zfxxgk.ndrc.gov.cn/web/iteminfo.jsp?id=20266',
      pubDate: '2023-08-04',
    },
    i18n: {
      en: {
        title: 'Implementation Plan for Green and Low-Carbon Advanced Technology Demonstration Projects (2023)',
        description:
          'NDRC and nine other departments issued the Implementation Plan for Green and Low-Carbon Advanced Technology Demonstration Projects in August 2023. The plan launched the first application round and includes carbon capture, utilisation and storage among the advanced technologies eligible for demonstration support. The first project list was subsequently published in 2024.',
      },
      zh: {
        title: '《绿色低碳先进技术示范工程实施方案》（2023）',
        description:
          '国家发展改革委等十部门于2023年8月印发《绿色低碳先进技术示范工程实施方案》，并同步启动首批项目申报。方案将碳捕集利用与封存纳入可开展工程示范的先进绿色低碳技术范围，首批项目清单随后于2024年公布。',
      },
    },
  },
  {
    id: 'cn-standards-2024',
    core: {
      year: 2025,
      status: 'Active',
      category: 'Regulatory',
      reviewStatus: 'verified',
      legalWeight: 'National Standards',
      source: 'State Administration for Market Regulation / Standardization Administration of China',
      url: 'https://www.samr.gov.cn/xw/sj/art/2026/art_c4ebd8a52d154378b28595b96823b843.html',
      pubDate: '2025-12-31',
    },
    i18n: {
      en: {
        title: 'China Batch of 12 CCUS National Standards (2025)',
        description:
          'China approved and published 12 national CCUS standards on 31 December 2025, covering common terminology, capture systems, CO2 stream quality and transport, geological storage, CO2-EOR storage and greenhouse-gas reduction accounting. The standards took effect on 1 July 2026. This corrects the earlier database description that placed the 12-standard batch in 2024.',
      },
      zh: {
        title: '中国12项CCUS国家标准（2025）',
        description:
          '市场监管总局、国家标准委于2025年12月31日批准发布12项CCUS国家标准，覆盖共性术语、捕集系统、二氧化碳介质质量与输送、地质封存、驱油封存以及温室气体减排量核算等环节，并于2026年7月1日起实施。此前数据库将该批标准记为2024年发布，现予纠正。',
      },
    },
  },
  {
    id: 'cn-zero-carbon-parks',
    core: {
      year: 2025,
      status: 'Active',
      category: 'Strategic',
      reviewStatus: 'verified',
      legalWeight: 'National Guidance',
      source: 'National Development and Reform Commission / MIIT / National Energy Administration',
      url: 'https://zfxxgk.ndrc.gov.cn/web/iteminfo.jsp?id=20523',
      pubDate: '2025-06-30',
    },
    i18n: {
      en: {
        title: 'China National Zero-Carbon Park Construction Notice (2025)',
        description:
          'NDRC, MIIT and the National Energy Administration issued the national zero-carbon park construction notice in June 2025. It establishes application, construction and evaluation arrangements for national demonstration parks, with priorities including energy-system transformation, industrial decarbonisation, carbon accounting, product carbon-footprint management and financial support. The notice does not mandate CCS as a universal or core pathway for every park.',
      },
      zh: {
        title: '《关于开展零碳园区建设的通知》（2025）',
        description:
          '国家发展改革委、工业和信息化部、国家能源局于2025年6月印发国家级零碳园区建设通知，建立园区申报、建设、指标评价和验收安排，重点包括用能结构转型、产业降碳、碳排放核算、产品碳足迹管理及金融支持。该通知并未要求所有园区将CCS作为统一的核心路径。',
      },
    },
  },
  {
    id: 'cn-pboc-cerf',
    core: {
      source: 'People’s Bank of China',
      url: 'https://www.pbc.gov.cn/zhengcehuobisi/125207/125227/125963/dd1c12d33cab49bd8895c7a5d100aa4f/index.html',
      pubDate: '2021-11-12',
    },
  },
  {
    id: 'eu-innovation-fund',
    core: {
      source: 'European Commission, DG Climate Action',
      url: 'https://climate.ec.europa.eu/eu-action/eu-funding-climate-action/innovation-fund_en',
    },
  },
  {
    id: 'eu-cbam',
    core: {
      source: 'European Union (EUR-Lex)',
      url: 'https://eur-lex.europa.eu/eli/reg/2023/956/oj',
      pubDate: '2023-05-16',
    },
  },
  {
    id: 'fr-ccus-roadmap',
    core: {
      year: 2024,
      status: 'Active',
      category: 'Strategic',
      reviewStatus: 'verified',
      legalWeight: 'Strategic Guidance',
      source: 'French Directorate General for Enterprise (DGE)',
      url: 'https://www.entreprises.gouv.fr/la-dge/actualites/deploiement-de-la-capture-du-stockage-et-de-la-valorisation-du-carbone-ccus-en',
      pubDate: '2024-07-04',
    },
    i18n: {
      en: {
        title: 'France CCUS Deployment Outlook (2024)',
        description:
          'France published its state-of-play and deployment outlook for carbon capture, utilisation and storage on 4 July 2024. It prioritises CCUS for major industrial sites and sectors with limited alternative abatement options, building on the strategic orientations consulted on in 2023.',
      },
      zh: {
        title: '法国CCUS部署现状与展望（2024）',
        description:
          '法国于2024年7月4日发布碳捕集、利用与封存的部署现状与前景文件，在2023年战略方向及公众咨询基础上，优先面向缺少替代减排路径的大型工业排放源和重点行业推进CCUS。',
      },
    },
  },
  {
    id: 'de-icm-strategy',
    core: {
      year: 2024,
      status: 'Policy principles adopted',
      category: 'Strategic',
      reviewStatus: 'verified',
      legalWeight: 'Strategic Guidance',
      source: 'German Federal Ministry for Economic Affairs and Climate Action',
      url: 'https://www.bmwk.de/Redaktion/EN/Downloads/E/240226-eckpunkte-cms-en.html',
      pubDate: '2024-02-26',
    },
    i18n: {
      en: {
        title: 'Germany Carbon Management Strategy Key Principles (2024)',
        description:
          'Germany published key principles for a Carbon Management Strategy and a draft amendment to the Carbon Dioxide Storage Act in February 2024. The federal cabinet adopted the key principles in May 2024. They prioritise CCS and CCU for hard-to-abate emissions and propose enabling CO2 transport and offshore storage while excluding marine protected areas.',
      },
      zh: {
        title: '德国碳管理战略要点（2024）',
        description:
          '德国于2024年2月发布碳管理战略要点及《二氧化碳封存法》修订草案，联邦内阁于同年5月通过战略要点。其重点是为难以避免的排放应用CCS和CCU，并拟开放二氧化碳运输和海上封存，同时排除海洋保护区。',
      },
    },
  },
  {
    id: 'is-cdr-framework',
    core: {
      year: 2022,
      status: 'Active',
      category: 'Regulatory',
      reviewStatus: 'verified',
      legalWeight: 'Primary Legislation',
      source: 'Althingi, Parliament of Iceland',
      url: 'https://www.althingi.is/altext/stjt/2022.067.html',
      pubDate: '2022-06-27',
    },
    i18n: {
      en: {
        title: 'Iceland CO2 Storage and Mineralisation Legal Framework (Law No. 67/2022)',
        description:
          'Iceland’s Law No. 67/2022 amended environmental-health, environmental-assessment and climate legislation to implement the EU geological-storage framework and expressly regulate underground CO2 storage, including mineralisation. It provides the legal basis used for permitting storage projects such as Carbfix. This replaces the unsupported database description of a separate 2024 “CDR framework”.',
      },
      zh: {
        title: '冰岛二氧化碳封存与矿化法律框架（第67/2022号法律）',
        description:
          '冰岛第67/2022号法律修订环境卫生、环境影响评价和气候相关法律，落实欧盟二氧化碳地质封存制度，并明确规范地下二氧化碳封存及矿化，为Carbfix等项目的许可提供法律基础。此前数据库所称独立的“2024年CDR框架”缺乏依据，现予替换。',
      },
    },
  },
  {
    id: 'verra-vm0049',
    core: {
      source: 'Verra',
      url: 'https://verra.org/methodologies/vm0049-carbon-capture-and-storage/',
      pubDate: '2024-06-27',
    },
  },
  {
    id: 'gold-standard',
    core: {
      year: 2025,
      status: 'Active',
      category: 'Methodology',
      reviewStatus: 'verified',
      legalWeight: 'Voluntary Standard',
      source: 'Gold Standard',
      url: 'https://www.goldstandard.org/news/gold-standard-publishes-engineered-removals-activity-requirements',
      pubDate: '2025-07-22',
    },
    i18n: {
      en: {
        title: 'Gold Standard Engineered Removals Activity Requirements (2025)',
        description:
          'Gold Standard published its Engineered Removals Activity Requirements on 22 July 2025. The framework sets high-level requirements for engineered carbon dioxide removal activities seeking Gold Standard certification and provides the basis for subsequent methodology and project development. The prior 2023 date in the database was not supported by the official publication record.',
      },
      zh: {
        title: '黄金标准工程化碳移除活动要求（2025）',
        description:
          '黄金标准于2025年7月22日发布《工程化碳移除活动要求》，为寻求黄金标准认证的工程化二氧化碳移除活动规定高层级完整性要求，并作为后续方法学和项目开发的基础。数据库原记录的2023年发布日期缺乏官方依据，现予纠正。',
      },
    },
  },
  {
    id: 'ipcc-guidelines',
    core: {
      source: 'IPCC Task Force on National Greenhouse Gas Inventories',
      url: 'https://www.ipcc-nggip.iges.or.jp/public/2019rf/',
      pubDate: '2019-05-12',
    },
  },
  {
    id: 'iso-standards',
    core: {
      source: 'International Organization for Standardization, ISO/TC 265',
      url: 'https://www.iso.org/committee/648607.html',
    },
  },
  {
    id: 'puro-earth',
    core: {
      source: 'Puro.earth',
      url: 'https://puro.earth/cdr-infrastructure/methodologies/puro-standard/',
    },
  },
  {
    id: 'norway-longship',
    core: {
      year: 2020,
      source: 'Norwegian Ministry of Energy',
      url: 'https://www.regjeringen.no/en/topics/energy/landingssider/ny-side/sporsmal-og-svar-om-langskip-prosjektet/id2863902/',
      pubDate: '2020-09-21',
    },
    i18n: {
      en: {
        title: 'Norway Longship Full-Scale CCS Project',
        description:
          'Norway launched Longship on 21 September 2020 as a state-supported full-scale CCS demonstration covering industrial capture, ship transport, intermediate storage and permanent offshore geological storage through Northern Lights. Government project information was updated in 2024, but the underlying policy decision and launch date are from 2020.',
      },
      zh: {
        title: '挪威“长船”全规模CCS项目',
        description:
          '挪威于2020年9月21日启动“长船”国家支持型全规模CCS示范，覆盖工业捕集、船舶运输、中转储存以及通过Northern Lights开展海上永久地质封存。政府项目说明于2024年更新，但政策决策和项目启动时间应记为2020年。',
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
      url: 'https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=259701',
      pubDate: '2024-02-06',
    },
    i18n: {
      en: {
        title: 'South Korea Act on Carbon Dioxide Capture, Transport, Storage and Utilisation',
        description:
          'South Korea enacted Act No. 20203 on 6 February 2024. The law took effect on 7 February 2025 and establishes the national framework for technology development and industrialisation of carbon dioxide capture, transport, storage and utilisation, including storage-business and marine-storage provisions.',
      },
      zh: {
        title: '韩国《二氧化碳捕集、运输、封存及利用法》',
        description:
          '韩国于2024年2月6日公布第20203号法律，并于2025年2月7日施行。该法建立二氧化碳捕集、运输、封存与利用技术开发和产业化的国家框架，并涵盖封存业务及海洋地质封存等制度。',
      },
    },
  },
  {
    id: 'ae-carbon-strategy',
    core: {
      year: 2023,
      status: 'Active',
      category: 'Strategic',
      reviewStatus: 'verified',
      legalWeight: 'National Strategy',
      source: 'Official Portal of the UAE Government / Ministry of Climate Change and Environment',
      url: 'https://u.ae/en/about-the-uae/strategies-initiatives-and-awards/strategies-plans-and-visions/environment-and-energy/the-uae-net-zero-2050-strategy',
      pubDate: '2023-11-01',
    },
    i18n: {
      en: {
        title: 'UAE Net Zero 2050 Strategy',
        description:
          'The UAE Net Zero 2050 Strategy translates the country’s net-zero initiative and national pathway into more than 25 programmes across six sectors. The official strategy identifies carbon capture technologies, climate finance, research and development, skills and sectoral efficiency measures as enabling components of the transition.',
      },
      zh: {
        title: '阿联酋2050净零战略',
        description:
          '《阿联酋2050净零战略》将国家净零倡议和实施路径细化为覆盖六个部门的25项以上计划，并将碳捕集技术、气候融资、研发、能力建设和部门效率提升列为转型的重要支撑条件。',
      },
    },
  },
  {
    id: 'uk-ccs-network-code',
    core: {
      year: 2023,
      status: 'Planned',
      category: 'Regulatory',
      reviewStatus: 'verified',
      legalWeight: 'Proposed Market Rule',
      source: 'UK Department for Energy Security and Net Zero',
      url: 'https://www.gov.uk/government/publications/carbon-capture-usage-and-storage-a-vision-to-establish-a-competitive-market/carbon-capture-usage-and-storage-a-vision-to-establish-a-competitive-market',
      pubDate: '2023-12-20',
    },
    i18n: {
      en: {
        title: 'UK CCS Network Code Framework (Planned)',
        description:
          'The UK’s December 2023 CCUS market vision proposes a single CCS Network Code to govern commercial, operational and technical arrangements for use and growth of CO2 transport and storage systems. The code is a planned market-governance component linked to economic licences and third-party access; the government publication should not be represented as a final standalone code already in force.',
      },
      zh: {
        title: '英国CCS网络代码框架（规划中）',
        description:
          '英国2023年12月发布的CCUS市场愿景提出建立统一的CCS Network Code，用于规范二氧化碳运输与封存系统的商业、运行和技术安排，并与经济许可证和第三方接入制度衔接。该代码仍是规划中的市场治理组件，不应表述为已经生效的独立规则文本。',
      },
    },
  },
  {
    id: 'uk-ccus-vision',
    core: {
      source: 'UK Department for Energy Security and Net Zero',
      url: 'https://www.gov.uk/government/publications/carbon-capture-usage-and-storage-a-vision-to-establish-a-competitive-market',
      pubDate: '2023-12-20',
    },
  },
  {
    id: 'us-obbba-45q-2025',
    core: {
      year: 2025,
      status: 'Active',
      category: 'Tax Incentives',
      reviewStatus: 'verified',
      legalWeight: 'Primary Legislation',
      source: 'U.S. Government Publishing Office / Internal Revenue Service',
      url: 'https://www.govinfo.gov/app/details/PLAW-119publ21',
      pubDate: '2025-07-04',
    },
    i18n: {
      en: {
        title: 'U.S. Public Law 119-21: 2025 Amendments to Section 45Q',
        description:
          'Public Law 119-21, enacted on 4 July 2025, amended Section 45Q through section 70522. For qualifying facilities or equipment placed in service after 4 July 2025, it establishes parity between credit amounts for utilisation or enhanced recovery and those for secure geological storage. It also adds restrictions for specified foreign entities and foreign-influenced entities. The law preserved the higher IRA credit architecture; it did not newly create the existing $180-per-tonne DAC storage and $85-per-tonne point-source storage levels.',
      },
      zh: {
        title: '美国第119-21号公法：2025年45Q修订',
        description:
          '美国第119-21号公法于2025年7月4日生效，其中第70522节修订45Q。对于2025年7月4日后投入使用的合格设施或设备，法律将利用或强化采收情形的抵免水平与安全地质封存情形对齐，并新增针对特定外国实体和受外国影响实体的限制。该法延续并调整IRA形成的较高抵免框架，而不是新设原有的DAC封存180美元/吨和点源封存85美元/吨标准。',
      },
    },
    analysis: {
      incentive: {
        label: '45Q parity after 4 July 2025',
        evidence:
          'Section 70522 establishes parity between qualified utilisation or enhanced-recovery credit amounts and secure-geological-storage amounts for qualifying facilities or equipment placed in service after 4 July 2025.',
        citation:
          'Public Law 119-21, section 70522; IRS Notice 2026-1 discussion of the 2025 Section 45Q amendments.',
      },
      market: {
        label: 'PFE restrictions',
        evidence:
          'The 2025 amendments restrict Section 45Q eligibility for specified foreign entities and foreign-influenced entities for applicable tax years.',
        citation: 'Public Law 119-21, section 70522; IRS Notice 2026-1.',
      },
    },
  },
  {
    id: 'us-doe-carbon-management-strategy',
    core: {
      year: 2024,
      status: 'Draft for public comment',
      category: 'Strategic',
      reviewStatus: 'verified',
      legalWeight: 'Draft Strategy',
      source: 'U.S. Department of Energy',
      url: 'https://www.energy.gov/hgeo/does-carbon-management-strategy',
      pubDate: '2024-10-10',
    },
    i18n: {
      en: {
        title: 'Draft U.S. DOE Carbon Management Strategy (2024)',
        description:
          'The U.S. Department of Energy published its Carbon Management Strategy as a draft for public comment in October 2024. It outlines DOE’s near-term programme priorities through 2030 across research, demonstration and deployment, CO2 transport and storage infrastructure, policy coordination, community and workforce engagement, and international cooperation. The official DOE page continues to identify the document as a draft rather than a final binding strategy.',
      },
      zh: {
        title: '美国能源部碳管理战略草案（2024）',
        description:
          '美国能源部于2024年10月发布碳管理战略草案并公开征求意见，提出至2030年的近期工作重点，包括研发示范与部署、二氧化碳运输和封存基础设施、跨部门政策协调、社区与劳动力参与以及国际合作。能源部官方页面仍将其标识为草案，而非最终具有约束力的战略。',
      },
    },
  },
  {
    id: 'us-45q-ira',
    core: {
      source: 'U.S. Department of the Treasury / Internal Revenue Service',
      url: 'https://www.irs.gov/irb/2022-47_IRB',
      pubDate: '2022-08-16',
    },
  },
  {
    id: 'us-iija-hubs',
    core: {
      source: 'U.S. Department of Energy',
      url: 'https://www.energy.gov/edf/carbon-dioxide-transportation-infrastructure-finance-and-innovation-program',
      pubDate: '2021-11-15',
    },
  },
  {
    id: 'no-14th-licensing-round-2025',
    core: {
      year: 2025,
      status: 'Awarded',
      category: 'Regulatory',
      reviewStatus: 'verified',
      legalWeight: 'Licensing Round',
      source: 'Norwegian Offshore Directorate',
      url: 'https://www.sodir.no/en/facts/carbon-storage/co2-storage-licences/announcement-2025-round-1/',
      pubDate: '2025-03-05',
    },
    i18n: {
      en: {
        title: 'Norway 2025 CO2 Storage Licensing Round 1',
        description:
          'Norway announced one North Sea area for CO2 storage licensing on 5 March 2025 under the CO2 Storage Regulations. Following evaluation, Equinor Low Carbon Solution was offered exploration licence EXL014, valid from 24 June 2025. The official source describes this as “Announcement 2025, round 1” and the eighth award process, not a fourteenth licensing round; the legacy database ID is retained only for compatibility.',
      },
      zh: {
        title: '挪威2025年二氧化碳封存许可第1轮',
        description:
          '挪威于2025年3月5日依据《二氧化碳封存条例》公布一个北海封存许可区块。经评估，Equinor Low Carbon Solution获得EXL014勘探许可，许可自2025年6月24日起生效。官方将其称为“2025年第1轮”，并说明这是第八次封存区块授予流程，而非第十四轮；旧数据库ID仅为兼容性保留。',
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
  return Number(scalar(db, 'SELECT COUNT(*) FROM policies WHERE id = ?', [id])) > 0;
}

function updatePolicy(db, update, auditDate) {
  if (!policyExists(db, update.id)) {
    throw new Error(`Policy is missing: ${update.id}`);
  }

  const columnMap = {
    country: 'country',
    year: 'year',
    status: 'status',
    category: 'category',
    reviewStatus: 'review_status',
    legalWeight: 'legal_weight',
    source: 'source',
    url: 'url',
    pubDate: 'pub_date',
  };
  const assignments = [];
  const params = [];

  for (const [field, column] of Object.entries(columnMap)) {
    if (update.core?.[field] === undefined) continue;
    assignments.push(`${column} = ?`);
    params.push(update.core[field]);
  }

  assignments.push('provenance_reviewer = ?', 'provenance_last_audit_date = ?');
  params.push('Primary-source metadata audit', auditDate, update.id);
  execute(
    db,
    `UPDATE policies SET ${assignments.join(', ')} WHERE id = ?`,
    params
  );

  if (update.i18n) {
    for (const lang of ['en', 'zh']) {
      const localized = update.i18n[lang];
      if (!localized) continue;
      const localizedAssignments = [];
      const localizedParams = [];
      for (const field of ['title', 'description']) {
        if (localized[field] === undefined) continue;
        localizedAssignments.push(`${field} = ?`);
        localizedParams.push(localized[field]);
      }
      if (localizedAssignments.length === 0) continue;
      localizedParams.push(update.id, lang);
      execute(
        db,
        `UPDATE policy_i18n SET ${localizedAssignments.join(', ')}
         WHERE policy_id = ? AND lang = ?`,
        localizedParams
      );
    }
  }

  if (update.analysis) {
    for (const [dimension, values] of Object.entries(update.analysis)) {
      const analysisAssignments = [];
      const analysisParams = [];
      for (const field of ['score', 'label', 'evidence', 'citation']) {
        if (values[field] === undefined) continue;
        analysisAssignments.push(`${field} = ?`);
        analysisParams.push(values[field]);
      }
      if (analysisAssignments.length === 0) continue;
      analysisParams.push(update.id, dimension);
      execute(
        db,
        `UPDATE policy_analysis SET ${analysisAssignments.join(', ')}
         WHERE policy_id = ? AND dimension = ?`,
        analysisParams
      );
    }
  }
}

export function applyPolicySourceMetadataMigration(
  db,
  { auditDate = '2026-07-21' } = {}
) {
  db.run('PRAGMA foreign_keys = ON');
  const beforeMissingSource = Number(
    scalar(
      db,
      "SELECT COUNT(*) FROM policies WHERE COALESCE(TRIM(source), '') = ''"
    ) || 0
  );
  const beforeMissingUrl = Number(
    scalar(
      db,
      "SELECT COUNT(*) FROM policies WHERE COALESCE(TRIM(url), '') = ''"
    ) || 0
  );

  db.run('BEGIN TRANSACTION');
  try {
    for (const update of POLICY_UPDATES) {
      updatePolicy(db, update, auditDate);
    }
    execute(db, 'INSERT OR REPLACE INTO db_meta (key, value) VALUES (?, ?)', [
      `migration:${MIGRATION_ID}`,
      auditDate,
    ]);
    db.run('COMMIT');
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }

  const afterMissingSource = Number(
    scalar(
      db,
      "SELECT COUNT(*) FROM policies WHERE COALESCE(TRIM(source), '') = ''"
    ) || 0
  );
  const afterMissingUrl = Number(
    scalar(
      db,
      "SELECT COUNT(*) FROM policies WHERE COALESCE(TRIM(url), '') = ''"
    ) || 0
  );

  return {
    migrationId: MIGRATION_ID,
    updatedPolicies: POLICY_UPDATES.length,
    missingSource: { before: beforeMissingSource, after: afterMissingSource },
    missingUrl: { before: beforeMissingUrl, after: afterMissingUrl },
  };
}

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database not found: ${DB_PATH}`);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)));
  const summary = applyPolicySourceMetadataMigration(db);
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
    console.error(`Policy source metadata migration failed: ${error.message}`);
    process.exit(1);
  });
}

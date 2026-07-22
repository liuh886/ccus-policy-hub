#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'agent/ccus-ai-agent/db/ccus_master.sqlite');

export const MIGRATION_ID = 'policy-content-depth-batch1-2026-07';
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
    id: 'cn-ccus-roadmap-2025',
    core: {
      status: 'Active',
      category: 'Strategic',
      legalWeight: 'Strategic Technology Roadmap',
    },
    i18n: {
      en: {
        description:
          'The China CCUS Technology Development Roadmap (2025) is the third national technology roadmap prepared under the coordination of the Administrative Centre for China’s Agenda 21, following the 2011 and 2019 editions. It reassesses the role of carbon capture, utilisation and storage under China’s carbon-peaking and carbon-neutrality goals, reviews technology maturity, cost, mitigation potential, sustainability benefits and demonstration progress across the value chain, and shifts the development focus from individual technical demonstrations toward larger-scale, commercial and hub-based deployment. The roadmap sets staged technology objectives, refines assessment indicators and recommends coordinated action on research, engineering demonstration, standards, infrastructure, business models and policy support. It is an expert-led strategic and technical blueprint: it does not itself create a storage permit, project subsidy, carbon-credit entitlement or mandatory liability regime.',
        scope:
          'China-wide CCUS technology research, demonstration, industrialisation and long-term deployment planning across capture, transport, utilisation, geological storage and carbon-removal pathways.',
        tags: [
          'technology roadmap',
          'industrial decarbonisation',
          'CCUS hubs',
          'carbon neutrality',
        ],
        impactAnalysis: {
          economic:
            'Frames cost reduction, scale economies, shared infrastructure and business-model development as prerequisites for moving from demonstrations to commercial deployment, but provides no direct revenue support.',
          technical:
            'Assesses maturity and performance across the CCUS chain, identifies research and demonstration priorities and proposes staged technical targets and improved evaluation indicators.',
          environmental:
            'Positions CCUS as a supporting option for energy-system transition, hard-to-abate industrial emissions and negative-emission pathways while calling for lifecycle and sustainability assessment.',
        },
        evolution: {
          clusters: [
            'China CCUS Technology Roadmaps',
            'China Carbon Neutrality Technology Planning',
            'China CCUS Demonstration and Hubs',
          ],
          milestones: [
            {
              date: '2011-01-01',
              event: 'China issued its first national CCUS technology development roadmap.',
            },
            {
              date: '2019-01-01',
              event: 'The second roadmap updated technology pathways and deployment prospects.',
            },
            {
              date: '2025-10-23',
              event: 'The 2025 roadmap and annual CCUS report were formally released at the International Energy Transformation Forum in Suzhou.',
            },
            {
              date: '2026-01-08',
              event: 'ACCA21 announced formal publication of the third-edition roadmap.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '《中国碳捕集利用与封存技术发展路线图（2025）》由中国21世纪议程管理中心组织编制，是继2011年版和2019年版之后的第三版国家级CCUS技术路线图。路线图在“双碳”目标约束下重新评估CCUS的战略定位，系统分析捕集、运输、利用、地质封存及碳移除等环节的技术成熟度、成本、减排潜力、可持续效益和示范进展，并将发展重点由单项技术验证进一步转向规模化、商业化和集群化应用。文件提出分阶段技术目标，细化评价指标，并从科研攻关、工程示范、标准体系、共享基础设施、商业模式和政策协同等方面提出发展路径与建议。该路线图属于专家主导的战略与技术蓝图，本身不构成地质封存许可、项目补贴、碳信用签发依据或强制性长期责任制度。',
        scope:
          '覆盖中国CCUS捕集、运输、利用、地质封存和碳移除技术的研发、示范、产业化与长期部署规划。',
        tags: ['技术路线图', '工业脱碳', 'CCUS集群', '碳中和'],
        impactAnalysis: {
          economic:
            '将降本、规模经济、共享基础设施和商业模式建设视为由示范走向商业化的前提，但不直接提供项目收入或财政补贴。',
          technical:
            '系统评估CCUS全链条技术成熟度与性能，明确科研和工程示范重点，并提出分阶段技术目标和评价指标。',
          environmental:
            '将CCUS定位为能源系统转型、难减排工业深度减排和负排放的重要支撑，同时强调生命周期和可持续性评价。',
        },
        evolution: {
          clusters: ['中国CCUS技术路线图', '中国碳中和技术规划', '中国CCUS示范与集群'],
          milestones: [
            { date: '2011-01-01', event: '中国发布首版国家CCUS技术发展路线图。' },
            { date: '2019-01-01', event: '第二版路线图更新技术路径与部署前景。' },
            {
              date: '2025-10-23',
              event: '2025版路线图及年度报告在苏州国际能源变革论坛正式发布。',
            },
            { date: '2026-01-08', event: '21世纪中心宣布第三版路线图正式出版。' },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 45,
        label: 'Policy-support recommendations',
        evidence:
          'The roadmap recommends financing, demonstration support and business-model development, but it does not allocate funds or create an automatic project entitlement.',
        citation: 'ACCA21, China CCUS Technology Development Roadmap (2025).',
      },
      statutory: {
        score: 35,
        label: 'Non-binding strategic roadmap',
        evidence:
          'The document is an expert-led technology roadmap and does not establish capture, transport or storage permitting, pore-space rights or long-term liability.',
        citation: 'ACCA21 publication notice, 8 January 2026.',
      },
      market: {
        score: 65,
        label: 'Commercialisation and hub agenda',
        evidence:
          'The roadmap explicitly shifts attention toward commercial-scale deployment, shared hubs, infrastructure coordination and viable business models.',
        citation: 'ACCA21 release notice, 24 October 2025.',
      },
      strategic: {
        score: 95,
        label: 'Third national CCUS technology roadmap',
        evidence:
          'It provides China’s updated long-term technology positioning, staged objectives and policy recommendations for CCUS under the dual-carbon goals.',
        citation: 'ACCA21, China CCUS Technology Development Roadmap (2025).',
      },
      mrv: {
        score: 65,
        label: 'Evaluation and standards agenda',
        evidence:
          'The roadmap calls for refined technical evaluation, lifecycle assessment, standards and data support, but it is not itself a mandatory cross-chain MRV method.',
        citation: 'ACCA21 formal publication summary, 8 January 2026.',
      },
    },
  },
  {
    id: 'cn-pboc-cerf',
    core: {
      status: 'Active',
      category: 'Incentive',
      legalWeight: 'Structural Monetary Policy Instrument',
    },
    i18n: {
      en: {
        description:
          'The People’s Bank of China created the Carbon Emission Reduction Facility in November 2021 as a structural monetary-policy instrument that encourages participating financial institutions to provide preferential loans to projects with measurable carbon-reduction effects. The facility supports three broad fields—clean energy, energy conservation and environmental protection, and carbon-reduction technologies. Under the original operating design, the central bank provides funding equal to 60% of qualifying loan principal to participating institutions at a 1.75% funding cost, while banks make lending decisions on market-based terms and pass preferential pricing to eligible borrowers. CCUS projects may qualify where they fit the approved carbon-reduction technology scope and satisfy bank, catalogue, disclosure and emissions-estimation requirements. The facility is wholesale funding to financial institutions rather than a direct government grant, and inclusion of CCUS in an eligible technology field does not guarantee approval for an individual project.',
        scope:
          'Preferential bank lending for eligible Chinese projects in clean energy, energy conservation and environmental protection, and carbon-reduction technologies, including qualifying CCUS applications.',
        tags: [
          'green finance',
          're-lending',
          'preferential loans',
          'carbon-reduction technology',
        ],
        impactAnalysis: {
          economic:
            'Reduces participating banks’ funding cost and is intended to transmit lower-cost credit to eligible projects, improving debt affordability without replacing commercial credit assessment.',
          technical:
            'Requires projects to fall within recognised carbon-reduction fields and to provide information enabling banks to estimate and disclose expected emissions reductions.',
          environmental:
            'Uses measurable carbon-reduction effects and public disclosure to direct credit toward projects expected to deliver real emissions reductions.',
        },
        evolution: {
          clusters: [
            'PBOC Structural Monetary Policy Tools',
            'China Green Finance',
            'China Carbon-Reduction Lending',
          ],
          milestones: [
            {
              date: '2021-11-12',
              event: 'PBOC issued the notice establishing the Carbon Emission Reduction Facility.',
            },
            {
              date: '2024-06-30',
              event: 'PBOC’s official tool description reported broader participation by national, foreign-funded and local incorporated financial institutions.',
            },
            {
              date: '2024-10-12',
              event: 'The green-finance opinion for the Beautiful China initiative called for continued improvement of carbon-reduction support tools and stronger project carbon-accounting standards.',
            },
          ],
        },
        regulatory: {
          financing_mechanism:
            'Central-bank funding is provided to participating financial institutions against qualifying preferential loans; project approval remains with the lender.',
          disclosure_requirement:
            'Participating institutions are expected to disclose supported projects and estimated carbon-reduction effects under the instrument’s operating rules.',
        },
      },
      zh: {
        description:
          '中国人民银行于2021年11月创设碳减排支持工具，通过结构性货币政策引导参与金融机构向具有显著碳减排效应的项目提供优惠贷款。工具重点支持清洁能源、节能环保和碳减排技术三大领域。按照初始操作机制，人民银行按符合条件贷款本金的60%向金融机构提供资金支持，资金成本为1.75%，金融机构仍需按照市场化原则独立审贷，并将优惠资金价格传导至符合条件的借款人。CCUS项目只有在符合碳减排技术支持范围、项目目录、银行审查、信息披露和减排量测算要求时，才可能纳入支持。该工具本质上是向金融机构提供的低成本批发资金，并非直接向项目发放财政补贴；CCUS属于潜在支持技术，也不等于单个项目自动获得贷款。',
        scope:
          '面向中国清洁能源、节能环保和碳减排技术领域符合条件项目的优惠信贷支持，包括满足目录和减排核算要求的CCUS应用。',
        tags: ['绿色金融', '再贷款', '优惠贷款', '碳减排技术'],
        impactAnalysis: {
          economic:
            '降低参与金融机构的资金成本，并通过优惠贷款改善符合条件项目的债务融资可得性，但不替代银行的商业审贷和风险定价。',
          technical:
            '要求项目属于认可的碳减排领域，并提供足以支持银行测算和披露预期减排效果的信息。',
          environmental:
            '通过减排效果测算和信息披露，将信贷资源引导至预期具有真实碳减排贡献的项目。',
        },
        evolution: {
          clusters: ['人民银行结构性货币政策工具', '中国绿色金融', '碳减排信贷'],
          milestones: [
            { date: '2021-11-12', event: '人民银行印发通知，正式设立碳减排支持工具。' },
            {
              date: '2024-06-30',
              event: '人民银行工具介绍显示，参与机构已覆盖全国性银行、部分外资银行和地方法人金融机构。',
            },
            {
              date: '2024-10-12',
              event: '服务美丽中国建设的绿色金融意见提出继续完善碳减排支持工具，并强化项目减排核算基础。',
            },
          ],
        },
        regulatory: {
          financing_mechanism:
            '人民银行依据符合条件的优惠贷款向参与金融机构提供资金，具体项目仍由金融机构独立审批。',
          disclosure_requirement:
            '参与金融机构应按照工具要求披露支持项目及其预计碳减排效果。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 90,
        label: 'Low-cost central-bank re-lending',
        evidence:
          'PBOC funding covers 60% of qualifying preferential loan principal at a 1.75% funding cost, creating a material financing incentive transmitted through participating banks.',
        citation: 'PBOC official structural monetary-policy tool description; PBOC Notice Yinfa [2021] No. 278.',
      },
      statutory: {
        score: 65,
        label: 'Central-bank policy instrument',
        evidence:
          'The facility is established and administered through PBOC policy notices and operating requirements rather than primary CCS legislation.',
        citation: 'PBOC Notice on Establishing the Carbon Emission Reduction Facility, 12 November 2021.',
      },
      market: {
        score: 75,
        label: 'Bank-mediated green credit channel',
        evidence:
          'The instrument leverages commercial bank origination and risk assessment to mobilise additional lending into approved carbon-reduction fields.',
        citation: 'PBOC official tool description as of 30 June 2024.',
      },
      strategic: {
        score: 85,
        label: 'Core structural green-finance tool',
        evidence:
          'The facility is a central component of China’s structural monetary-policy support for green and low-carbon transition projects.',
        citation: 'PBOC green-finance policy materials, 2021-2024.',
      },
      mrv: {
        score: 80,
        label: 'Project reduction estimation and disclosure',
        evidence:
          'Supported lending is linked to project eligibility, estimated carbon-reduction effects and disclosure by participating financial institutions, although it is not a full CCUS chain-of-custody method.',
        citation: 'PBOC Carbon Emission Reduction Facility operating requirements.',
      },
    },
  },
  {
    id: 'cn-standards-2024',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'National Recommended Standards',
    },
    i18n: {
      en: {
        description:
          'China published a coordinated batch of 12 national CCUS standards on 31 December 2025, with implementation from 1 July 2026. The batch establishes a common technical vocabulary and covers major interfaces across the CCUS chain, including post-combustion capture-system requirements and performance evaluation, CO2 stream quality and transport, geological storage, storage associated with CO2-enhanced oil recovery, and greenhouse-gas reduction accounting. Representative standards include GB/T 46877-2025 on general requirements for post-combustion capture systems, GB/T 46870.2-2025 on performance evaluation for capture plants integrated with power stations, and GB/T 46871-2025 on CO2 storage using enhanced oil recovery. Most instruments in the batch are GB/T recommended national standards: they improve technical consistency, procurement specifications, data comparability and project interfaces, but do not replace environmental approvals, injection licences, land or pore-space rights, or operator liability rules.',
        scope:
          'National technical standardisation for terminology, capture, CO2 quality and transport, geological storage, CO2-EOR storage and greenhouse-gas reduction accounting across Chinese CCUS projects.',
        tags: [
          'national standards',
          'capture systems',
          'CO2 transport',
          'geological storage',
          'GHG accounting',
        ],
        impactAnalysis: {
          economic:
            'Reduces transaction and engineering-interface costs by standardising terminology, technical specifications, performance evaluation and data expectations across suppliers and project participants.',
          technical:
            'Creates common requirements for capture systems, CO2 streams, transport, geological storage, CO2-EOR storage and performance evaluation.',
          environmental:
            'Strengthens the basis for consistent reduction accounting, storage performance and monitoring expectations, while project-specific environmental and safety approvals remain separate.',
        },
        evolution: {
          clusters: [
            'China CCUS Standardisation',
            'National Carbon-Neutrality Standards',
            'CCUS Engineering Interfaces',
          ],
          milestones: [
            {
              date: '2025-12-31',
              event: 'SAMR and SAC approved and published the coordinated batch of 12 national CCUS standards.',
            },
            {
              date: '2026-07-01',
              event: 'The principal standards in the batch entered into implementation.',
            },
          ],
        },
        regulatory: {
          legal_character:
            'The batch primarily consists of GB/T recommended national standards rather than a standalone mandatory CCS permitting code.',
          permitting_boundary:
            'Compliance with technical standards does not substitute for environmental, safety, injection, land-use or storage approvals.',
          accounting_scope:
            'The batch includes greenhouse-gas reduction accounting and technical monitoring interfaces relevant to CCUS performance claims.',
        },
      },
      zh: {
        description:
          '中国于2025年12月31日集中发布12项CCUS国家标准，主要标准自2026年7月1日起实施。该批标准建立统一术语体系，并覆盖CCUS全链条的重要技术接口，包括燃烧后二氧化碳捕集系统通用要求与性能评价、二氧化碳气流质量和运输、地质封存、二氧化碳驱油过程中的封存以及温室气体减排量核算等内容。代表性标准包括《二氧化碳捕集 燃烧后二氧化碳捕集系统通用要求》（GB/T 46877-2025）、电厂燃烧后捕集稳定性能评价程序（GB/T 46870.2-2025）以及《二氧化碳捕集、运输和地质封存 提高原油采收率的二氧化碳封存》（GB/T 46871-2025）。该批标准以GB/T推荐性国家标准为主，有助于统一工程规范、采购要求、数据口径和跨主体接口，但不能替代环境审批、注入许可、土地或孔隙空间权利以及运营者长期责任制度。',
        scope:
          '覆盖中国CCUS术语、捕集、二氧化碳质量与运输、地质封存、驱油封存及温室气体减排核算的国家技术标准体系。',
        tags: ['国家标准', '捕集系统', '二氧化碳运输', '地质封存', '减排核算'],
        impactAnalysis: {
          economic:
            '通过统一术语、技术规格、性能评价和数据要求，降低设备供应、工程设计和跨主体协作中的交易与接口成本。',
          technical:
            '为捕集系统、二氧化碳气流、运输、地质封存、驱油封存和性能评价建立共同技术要求。',
          environmental:
            '强化减排量核算、封存性能和监测要求的一致性基础，但项目环境与安全审批仍需另行完成。',
        },
        evolution: {
          clusters: ['中国CCUS标准化', '碳中和国家标准', 'CCUS工程接口'],
          milestones: [
            { date: '2025-12-31', event: '市场监管总局和国家标准委发布12项CCUS国家标准。' },
            { date: '2026-07-01', event: '该批主要标准正式实施。' },
          ],
        },
        regulatory: {
          legal_character: '该批标准以GB/T推荐性国家标准为主，并非独立的强制性CCS许可法典。',
          permitting_boundary:
            '满足技术标准不等同于取得环境、安全、注入、土地利用或地质封存许可。',
          accounting_scope: '标准体系包含与CCUS绩效认定相关的温室气体减排核算和技术监测接口。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 35,
        label: 'Indirect cost-reduction effect',
        evidence:
          'The standards reduce engineering and contracting friction but do not provide grants, tax credits or regulated project revenue.',
        citation: 'SAMR/SAC national standard records published 31 December 2025.',
      },
      statutory: {
        score: 75,
        label: 'National recommended technical standards',
        evidence:
          'The GB/T standards establish nationally recognised technical requirements and methods, but they do not replace project permitting or primary liability law.',
        citation: 'SAMR/SAC GB/T 46877-2025, GB/T 46870.2-2025 and related standards.',
      },
      market: {
        score: 70,
        label: 'Common engineering and data interfaces',
        evidence:
          'Standardised specifications and performance methods improve interoperability among equipment suppliers, emitters, transport operators and storage providers.',
        citation: 'China batch of 12 CCUS national standards, 2025.',
      },
      strategic: {
        score: 90,
        label: 'National CCUS standardisation milestone',
        evidence:
          'The coordinated batch fills major technical-standard gaps across the capture, transport, storage and accounting chain.',
        citation: 'SAMR/SAC publication and implementation records, 2025-2026.',
      },
      mrv: {
        score: 85,
        label: 'Technical performance and reduction accounting',
        evidence:
          'The batch includes performance evaluation, storage-related requirements and greenhouse-gas reduction accounting that support more consistent project evidence.',
        citation: 'SAMR/SAC CCUS standards batch, effective 1 July 2026.',
      },
    },
  },
  {
    id: 'eu-cbam',
    core: {
      status: 'Active',
      category: 'Market',
      legalWeight: 'EU Regulation',
    },
    i18n: {
      en: {
        description:
          'Regulation (EU) 2023/956 establishes the European Union Carbon Border Adjustment Mechanism to apply an EU-ETS-linked carbon cost to the embedded emissions of covered imports and reduce carbon-leakage risk. The initial product scope includes cement, iron and steel, aluminium, fertilisers, electricity and hydrogen. A reporting-only transitional phase ran from October 2023 through December 2025; the definitive regime began on 1 January 2026, requiring authorised CBAM declarants to report verified embedded emissions and ultimately surrender CBAM certificates priced by reference to EU ETS allowance auctions, with adjustments for qualifying carbon prices paid in the country of origin. CBAM calculation rules are directly relevant to CCUS: monitored CO2 transferred through a documented chain for long-term geological storage, or permanently chemically bound in qualifying products, may be accounted for as not emitted when the required monitoring and chain-of-custody evidence is available. CBAM does not finance capture projects or approve storage sites, but it can reward lower verified product emissions and increases the value of credible cross-border carbon accounting.',
        scope:
          'Imports into the EU customs territory of covered carbon-intensive goods, including their direct and, where applicable, indirect embedded emissions, verification, carbon-price adjustments and certificate obligations.',
        tags: [
          'carbon border adjustment',
          'embedded emissions',
          'EU ETS',
          'trade',
          'CCUS accounting',
        ],
        impactAnalysis: {
          economic:
            'Extends an EU-ETS-linked carbon cost to covered imports, changing relative production costs and creating a commercial reward for demonstrably lower embedded emissions.',
          technical:
            'Requires installation-level production-route data, emissions calculations, verification and chain-of-custody evidence for CO2 deducted through geological storage or permanent chemical binding.',
          environmental:
            'Aims to reduce carbon leakage and encourage cleaner production outside the EU while preserving the environmental integrity of embedded-emissions calculations.',
        },
        evolution: {
          clusters: ['EU CBAM', 'EU ETS Reform', 'Industrial Trade Decarbonisation'],
          milestones: [
            { date: '2023-05-16', event: 'Regulation (EU) 2023/956 was published in the Official Journal.' },
            { date: '2023-10-01', event: 'The reporting-only transitional phase began.' },
            { date: '2026-01-01', event: 'The definitive CBAM regime began for covered imports.' },
            {
              date: '2026-04-07',
              event: 'The Commission published the first quarterly 2026 CBAM certificate price reference.',
            },
          ],
        },
        regulatory: {
          cross_border_rules:
            'Authorised declarants report embedded emissions for covered imports and surrender certificates, with deductions for qualifying carbon prices paid abroad.',
          ccus_accounting:
            'CO2 transferred for monitored long-term geological storage may be treated as not emitted only with evidence across the capture, transport and storage chain.',
          verification:
            'Actual embedded emissions are subject to verification and record-retention requirements under the Regulation and implementing acts.',
        },
      },
      zh: {
        description:
          '欧盟《第2023/956号条例》设立碳边境调节机制（CBAM），对特定进口产品的隐含排放施加与欧盟碳排放交易体系价格相衔接的碳成本，以降低碳泄漏风险。初始覆盖水泥、钢铁、铝、化肥、电力和氢等产品。2023年10月至2025年12月为仅报告的过渡期，正式机制自2026年1月1日起实施；授权申报人需报告经核证的产品隐含排放，并按与欧盟碳配额拍卖价格挂钩的方式承担CBAM证书义务，同时可按规则扣除原产国已实际支付的合格碳价。CBAM核算规则与CCUS直接相关：如果二氧化碳在受监测的全链条中被转移并实现长期地质封存，或永久化学结合于符合条件的产品中，并具备完整监测和交接证据，相关二氧化碳可按规则不计为排放。CBAM本身不为捕集项目提供融资，也不批准封存场地，但会提高低隐含排放产品和可信跨境碳核算的商业价值。',
        scope:
          '适用于进入欧盟关税区的特定高碳产品，涵盖直接及适用情况下的间接隐含排放、核证、境外碳价调整和证书义务。',
        tags: ['碳边境调节机制', '隐含排放', '欧盟碳市场', '贸易', 'CCUS核算'],
        impactAnalysis: {
          economic:
            '将与欧盟碳市场相衔接的碳成本延伸至进口产品，改变相对生产成本，并奖励能够证明较低隐含排放的生产者。',
          technical:
            '要求提供装置和生产路线数据、排放计算、第三方核证，以及对地质封存或永久化学固碳扣减的全链条证据。',
          environmental:
            '旨在降低碳泄漏并推动欧盟以外生产过程减排，同时维护隐含排放核算的环境完整性。',
        },
        evolution: {
          clusters: ['欧盟CBAM', '欧盟碳市场改革', '工业贸易脱碳'],
          milestones: [
            { date: '2023-05-16', event: '欧盟第2023/956号条例在《欧盟官方公报》发布。' },
            { date: '2023-10-01', event: 'CBAM仅报告过渡期开始。' },
            { date: '2026-01-01', event: 'CBAM正式机制开始适用于覆盖产品。' },
            { date: '2026-04-07', event: '欧盟委员会发布首个2026年季度CBAM证书价格。' },
          ],
        },
        regulatory: {
          cross_border_rules:
            '授权申报人需申报覆盖产品隐含排放并承担证书义务，符合条件的境外已付碳价可按规则扣除。',
          ccus_accounting:
            '只有具备捕集、运输和封存全链条监测证据的长期地质封存二氧化碳，才能按规则视为未排放。',
          verification: '实际隐含排放须按照条例及实施规则接受核证并保存详细记录。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 75,
        label: 'Indirect low-carbon production incentive',
        evidence:
          'CBAM does not subsidise CCUS, but lower verified embedded emissions reduce certificate exposure and can improve the competitiveness of cleaner production routes.',
        citation: 'Regulation (EU) 2023/956, Articles 1, 7 and 21.',
      },
      statutory: {
        score: 95,
        label: 'Binding EU trade and climate regulation',
        evidence:
          'The Regulation creates authorisation, reporting, verification and certificate obligations for importers of covered goods in the EU customs territory.',
        citation: 'Regulation (EU) 2023/956.',
      },
      market: {
        score: 95,
        label: 'EU-ETS-linked border carbon price',
        evidence:
          'CBAM certificate prices are linked to EU ETS auctions, while qualifying carbon prices paid in the country of origin may be credited against the obligation.',
        citation: 'Regulation (EU) 2023/956, Articles 9, 20 and 21.',
      },
      strategic: {
        score: 90,
        label: 'Carbon-leakage and industrial-policy instrument',
        evidence:
          'CBAM aligns the treatment of covered imports with the phase-out of free EU ETS allocation and encourages cleaner industrial production outside the EU.',
        citation: 'European Commission CBAM overview; Regulation (EU) 2023/956.',
      },
      mrv: {
        score: 95,
        label: 'Verified embedded-emissions accounting',
        evidence:
          'The framework requires detailed installation data and verification; CO2 sent to long-term geological storage is deductible only with monitored chain-of-custody evidence.',
        citation: 'Commission Implementing Regulation (EU) 2023/1773, Annex III, Sections B.8.2-B.8.3.',
      },
    },
  },
  {
    id: 'eu-innovation-fund',
    core: {
      status: 'Active',
      category: 'Incentive',
      legalWeight: 'EU Funding Programme',
    },
    i18n: {
      en: {
        description:
          'The EU Innovation Fund is one of the world’s largest public funding programmes for demonstrating and deploying innovative net-zero and low-carbon technologies. Established under Article 10a(8) of the EU ETS Directive, it recycles revenues from the auctioning of EU ETS allowances into competitive grants, auctions and project-development assistance across EU Member States and associated eligible territories. Carbon capture, utilisation and storage projects are eligible where they demonstrate substantial greenhouse-gas avoidance, sufficient technological and financial maturity, innovation beyond prevailing practice, scalability and cost efficiency. Funding may support capture facilities, transport and storage infrastructure or integrated industrial decarbonisation projects, but awards are made through specific calls and grant agreements rather than as an automatic entitlement. The Fund should therefore be distinguished from member-state operating support such as carbon contracts for difference and from the EU ETS compliance value of avoided emissions.',
        scope:
          'Competitive EU-level funding for innovative net-zero technologies and industrial decarbonisation, including eligible CCS, CCU, CO2 transport, storage and carbon-removal projects.',
        tags: [
          'EU funding',
          'demonstration projects',
          'CCS grants',
          'EU ETS revenues',
          'competitive bidding',
        ],
        impactAnalysis: {
          economic:
            'Provides capital and, through selected competitive instruments, performance-linked support that can bridge financing gaps for first-of-a-kind projects, subject to competitive selection and grant conditions.',
          technical:
            'Prioritises innovative technologies with credible engineering maturity, implementation plans, scalability and measurable greenhouse-gas avoidance.',
          environmental:
            'Directs EU ETS revenues toward projects expected to deliver large and verifiable emissions avoidance or removals while retaining project-specific monitoring obligations.',
        },
        evolution: {
          clusters: ['EU Innovation Fund', 'EU ETS Revenue Recycling', 'EU Net-Zero Technology Deployment'],
          milestones: [
            {
              date: '2019-01-01',
              event: 'The revised EU ETS framework established the legal basis for the Innovation Fund.',
            },
            { date: '2020-07-03', event: 'The Commission launched the first large-scale project call.' },
            {
              date: '2024-11-25',
              event: 'The Commission adopted the financing decision launching the 2024 calls and auctions.',
            },
            {
              date: '2025-01-01',
              event: 'The programme continued with large net-zero technology calls and competitive auctions under the updated funding framework.',
            },
          ],
        },
        regulatory: {
          award_mechanism:
            'Support is allocated through competitive calls, auctions or project-development assistance and becomes binding only through project-specific grant or support agreements.',
          selection_boundary:
            'Eligibility does not guarantee funding; projects are ranked against innovation, emissions avoidance, maturity, scalability and cost-efficiency criteria.',
        },
      },
      zh: {
        description:
          '欧盟创新基金是全球规模最大的创新型净零和低碳技术示范部署公共融资计划之一。基金依据欧盟碳排放交易体系指令第10a(8)条设立，将欧盟碳配额拍卖收入通过竞争性赠款、拍卖和项目开发援助重新投入成员国及符合条件地区的低碳项目。碳捕集利用与封存项目只有在能够证明显著温室气体减排、技术和财务成熟度、相对于现行实践的创新性、可复制扩展能力及成本效率时，才可能获得支持。资金可用于捕集设施、运输与封存基础设施或一体化工业脱碳项目，但须通过具体申报和项目协议竞争获得，并非自动补贴资格。创新基金也不应与成员国碳差价合约等运营支持机制混同，亦不等同于欧盟碳市场中避免购买配额所产生的合规价值。',
        scope:
          '面向欧盟创新净零技术和工业脱碳项目的竞争性资金支持，包括符合条件的CCS、CCU、二氧化碳运输、封存和碳移除项目。',
        tags: ['欧盟资金', '示范项目', 'CCS赠款', '碳市场收入', '竞争性拍卖'],
        impactAnalysis: {
          economic:
            '通过资本支持及部分绩效挂钩机制弥补首台套和首次商业化项目的融资缺口，但资金取决于竞争遴选和项目协议。',
          technical:
            '重点支持具备创新性、工程成熟度、可信实施计划、可扩展性和可量化减排效果的技术项目。',
          environmental:
            '将欧盟碳市场收入投入预期能够实现大规模、可核证减排或移除的项目，并要求项目履行相应监测义务。',
        },
        evolution: {
          clusters: ['欧盟创新基金', '欧盟碳市场收入再投入', '净零技术部署'],
          milestones: [
            { date: '2019-01-01', event: '修订后的欧盟碳市场框架确立创新基金法律基础。' },
            { date: '2020-07-03', event: '欧盟委员会启动首轮大型项目申报。' },
            { date: '2024-11-25', event: '欧盟委员会通过启动2024年申报和拍卖的融资决定。' },
            { date: '2025-01-01', event: '更新后的计划继续开展净零技术申报和竞争性拍卖。' },
          ],
        },
        regulatory: {
          award_mechanism:
            '支持通过竞争性申报、拍卖或项目开发援助分配，只有在签署具体项目协议后才形成约束性资金安排。',
          selection_boundary:
            '满足资格条件并不保证获得资金，项目还需按创新性、减排效果、成熟度、可扩展性和成本效率竞争排序。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 95,
        label: 'Large-scale competitive EU funding',
        evidence:
          'The Fund recycles EU ETS auction revenues into grants, auctions and development assistance for selected innovative net-zero projects, including eligible CCUS projects.',
        citation: 'EU ETS Directive Article 10a(8); European Commission Innovation Fund overview.',
      },
      statutory: {
        score: 80,
        label: 'EU-ETS-based funding framework',
        evidence:
          'The programme has a binding legal and implementing framework, while individual support is created through call decisions and project-specific grant agreements.',
        citation: 'Directive 2003/87/EC Article 10a(8); Innovation Fund legal framework.',
      },
      market: {
        score: 75,
        label: 'ETS revenue recycling and competitive allocation',
        evidence:
          'Auction revenues from the EU carbon market are competitively recycled into technology deployment, but the Fund is not itself an operating carbon price or universal CCfD.',
        citation: 'European Commission Innovation Fund overview and calls for proposals.',
      },
      strategic: {
        score: 90,
        label: 'EU net-zero technology deployment instrument',
        evidence:
          'The Fund is a central EU mechanism for moving innovative industrial decarbonisation technologies from demonstration toward commercial deployment.',
        citation: 'European Commission, Innovation Fund.',
      },
      mrv: {
        score: 80,
        label: 'Project-level avoided-emissions monitoring',
        evidence:
          'Applicants quantify expected greenhouse-gas avoidance and funded projects report performance under grant conditions, although this is not a universal CCUS crediting methodology.',
        citation: 'Innovation Fund call and grant requirements.',
      },
    },
  },
  {
    id: 'us-45q-ira',
    core: {
      status: 'Active',
      category: 'Incentive',
      legalWeight: 'Federal Tax Legislation',
    },
    i18n: {
      en: {
        description:
          'Section 45Q of the U.S. Internal Revenue Code provides a federal tax credit for qualified carbon oxide captured at eligible industrial, power or direct-air-capture facilities and then securely stored, used as a tertiary injectant with secure storage, or utilised in an approved manner. The Inflation Reduction Act of 2022 substantially expanded the mechanism by increasing the full-value credit to $85 per metric ton for secure geological storage from industrial and power facilities and $180 per metric ton for direct air capture with secure storage; lower full-value rates apply to utilisation and enhanced recovery under the 2022 structure. It also reduced annual capture thresholds, extended the construction-start deadline to before 2033, and made 45Q eligible for elective payment and transferability, subject to registration and tax rules. Credits generally run for 12 years after qualifying capture equipment is placed in service. Eligibility depends on detailed capture, storage, utilisation, monitoring and filing requirements, including Form 8933 and applicable EPA or ISO-based storage documentation. Later 2025 amendments are recorded separately in the database and should not be conflated with the IRA changes described here.',
        scope:
          'Federal U.S. tax credit for qualified carbon oxide captured and securely stored, used in qualifying enhanced recovery with storage, or utilised under approved lifecycle-accounting rules.',
        tags: [
          '45Q',
          'tax credit',
          'geological storage',
          'direct air capture',
          'elective pay',
          'transferability',
        ],
        impactAnalysis: {
          economic:
            'Creates a per-tonne revenue stream for up to 12 years and broadens monetisation through elective pay and credit transfer, materially improving project bankability where compliance conditions are met.',
          technical:
            'Requires eligible capture equipment and facilities, minimum capture thresholds, secure-storage or approved-utilisation pathways, measurement and tax documentation.',
          environmental:
            'Links the credit to captured quantities that are securely stored or otherwise meet approved utilisation and lifecycle requirements, with recapture rules for leakage from storage.',
        },
        evolution: {
          clusters: ['US Section 45Q', 'Inflation Reduction Act', 'US Carbon Management Finance'],
          milestones: [
            { date: '2008-10-03', event: 'Congress first enacted the Section 45Q carbon oxide sequestration credit.' },
            { date: '2018-02-09', event: 'The Bipartisan Budget Act expanded and restructured the credit.' },
            {
              date: '2021-01-13',
              event: 'Treasury and IRS final regulations for capture, secure storage, utilisation and recapture took effect.',
            },
            {
              date: '2022-08-16',
              event: 'The Inflation Reduction Act increased credit values, lowered thresholds, extended eligibility and added monetisation options.',
            },
          ],
        },
        regulatory: {
          credit_period: 'Generally 12 years from the date qualifying capture equipment is placed in service.',
          storage_evidence:
            'Secure geological storage and related quantities must be documented under applicable Treasury, IRS, EPA or recognised ISO requirements.',
          monetisation:
            'Section 45Q is eligible for elective payment and transferability subject to pre-filing registration and tax rules.',
        },
      },
      zh: {
        description:
          '美国《国内税收法典》第45Q条对在符合条件的工业设施、发电设施或直接空气捕集设施中捕集的合格碳氧化物提供联邦税收抵免，前提是相关碳氧化物被安全地质封存、作为提高油气采收率的注入剂并实现安全封存，或按照获认可方式加以利用。2022年《通胀削减法案》显著强化45Q：工业和发电设施捕集并安全地质封存的足额抵免提高至每吨85美元，直接空气捕集并安全封存提高至每吨180美元；按照2022年制度，利用和提高采收率路径适用较低足额标准。法案同时降低年度捕集门槛，将开工期限延长至2033年以前，并允许45Q在满足注册和税务规则时采用选择性支付或信用转让。抵免通常自合格捕集设备投入使用起持续12年。项目还必须满足捕集、封存、利用、监测和报税要求，包括提交Form 8933以及适用的EPA或ISO封存证明。2025年的后续修法已在数据库中单独建档，不应与本条目的IRA改革内容混同。',
        scope:
          '面向美国境内合格碳氧化物捕集、安全地质封存、符合条件的驱油封存或经认可利用活动的联邦税收抵免。',
        tags: ['45Q', '税收抵免', '地质封存', '直接空气捕集', '选择性支付', '信用转让'],
        impactAnalysis: {
          economic:
            '形成最长通常为12年的按吨收入，并通过选择性支付和信用转让扩大变现能力，在满足合规条件时显著改善项目融资可行性。',
          technical:
            '要求设施和捕集设备符合资格、达到最低捕集门槛，并满足安全封存或获认可利用路径的计量和税务证明要求。',
          environmental:
            '将抵免与安全封存量或符合利用和生命周期要求的数量挂钩，并通过泄漏追缴规则维护封存环境完整性。',
        },
        evolution: {
          clusters: ['美国45Q', '通胀削减法案', '美国碳管理融资'],
          milestones: [
            { date: '2008-10-03', event: '美国首次设立第45Q条碳氧化物封存税收抵免。' },
            { date: '2018-02-09', event: '《两党预算法案》扩大并重构45Q机制。' },
            { date: '2021-01-13', event: '财政部和国税局关于捕集、安全封存、利用和追缴的最终规则生效。' },
            { date: '2022-08-16', event: '《通胀削减法案》提高抵免、降低门槛、延长期限并增加变现方式。' },
          ],
        },
        regulatory: {
          credit_period: '抵免通常自合格捕集设备投入使用起计算12年。',
          storage_evidence:
            '安全地质封存及相关数量须按照适用的财政部、国税局、环保署或认可ISO要求提供证明。',
          monetisation: '45Q可在完成预先注册并满足税务规则时采用选择性支付或信用转让。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 95,
        label: 'Per-tonne federal tax credit',
        evidence:
          'IRA-enhanced 45Q provides full-value credits of $85/t for industrial or power-sector secure storage and $180/t for DAC secure storage, subject to labour and eligibility rules.',
        citation: 'Internal Revenue Code Section 45Q; IRS Credit for Carbon Oxide Sequestration guidance.',
      },
      statutory: {
        score: 90,
        label: 'Federal tax statute and regulations',
        evidence:
          'The credit is established in federal tax law and implemented through Treasury regulations defining qualified capture, storage, utilisation and recapture.',
        citation: '26 U.S.C. Section 45Q; Treasury Decision 9944.',
      },
      market: {
        score: 90,
        label: 'Elective pay and transferable credit',
        evidence:
          'The IRA allows eligible taxpayers to monetise 45Q through elective payment or transfer to third-party buyers, subject to registration and tax requirements.',
        citation: 'Internal Revenue Code Sections 6417 and 6418; IRS elective pay and transferability guidance.',
      },
      strategic: {
        score: 95,
        label: 'Central U.S. carbon-management incentive',
        evidence:
          '45Q is the principal federal operating incentive supporting capture, transport and storage project economics across industrial, power and DAC applications.',
        citation: 'IRS Section 45Q guidance; Inflation Reduction Act of 2022.',
      },
      mrv: {
        score: 95,
        label: 'Tax-grade capture and storage substantiation',
        evidence:
          'Claims require measured qualified carbon oxide, Form 8933 and secure-storage or utilisation evidence, with recapture provisions if stored carbon later leaks.',
        citation: 'Treasury Regulations Sections 1.45Q-1 through 1.45Q-5; IRS Form 8933 instructions.',
      },
    },
  },
  {
    id: 'ipcc-guidelines',
    core: {
      status: 'Active',
      category: 'Methodology',
      legalWeight: 'International Inventory Guideline',
    },
    i18n: {
      en: {
        description:
          'The IPCC Guidelines for National Greenhouse Gas Inventories provide the principal international accounting framework for reflecting carbon capture and geological storage in national emissions inventories. The operative CCS methodology is contained in Volume 2, Chapter 5 of the 2006 Guidelines, covering CO2 transport, injection and geological storage under inventory category 1C. Capture-related emissions and reductions are reported in the sector where capture occurs, while emissions from transport, injection, storage and any leakage are estimated separately. Site-specific Tier 3 methods are used for geological storage, supported by monitoring, mass-balance, quality-assurance and uncertainty procedures. The 2019 Refinement updates and supplements the 2006 Guidelines but does not replace them; Volume 2 Chapter 5 is explicitly listed as having no refinement, so the 2006 CCS chapter remains the methodological basis. The Guidelines support national inventory reporting, not project permitting or voluntary carbon-credit issuance.',
        scope:
          'National greenhouse-gas inventory accounting for CO2 capture, transport, injection, geological storage, leakage and associated emissions or removals, including fossil and biogenic CO2.',
        tags: [
          'IPCC inventories',
          'national accounting',
          'geological storage',
          'Tier 3',
          'MRV',
        ],
        impactAnalysis: {
          economic:
            'Provides a consistent accounting basis that governments and markets can reference, but creates no direct financial incentive or project revenue.',
          technical:
            'Defines inventory boundaries, source categories, site-specific estimation methods, monitoring, quality control and uncertainty treatment for CCS.',
          environmental:
            'Requires storage leakage and associated transport and injection emissions to be reflected rather than assuming all captured CO2 is permanently retained.',
        },
        evolution: {
          clusters: ['IPCC National Inventory Guidelines', 'CCS Inventory Accounting', 'International Climate Reporting'],
          milestones: [
            {
              date: '2006-01-01',
              event: 'The 2006 IPCC Guidelines introduced the dedicated chapter on CO2 transport, injection and geological storage.',
            },
            {
              date: '2019-05-12',
              event: 'The IPCC adopted the 2019 Refinement to update and supplement the 2006 inventory framework.',
            },
            {
              date: '2023-07-01',
              event: 'The IPCC published further corrigenda to the inventory guidelines while the CCS chapter remained based on the 2006 methodology.',
            },
          ],
        },
        regulatory: {
          inventory_category:
            'Transport, injection and geological-storage emissions are reported under category 1C; capture effects are reported in the sector where capture occurs.',
          storage_method:
            'Geological storage is incorporated using site-specific Tier 3 methods with monitoring and leakage accounting.',
          legal_boundary:
            'The Guidelines are inventory methods and do not create storage permits, liability transfer or carbon-credit eligibility.',
        },
      },
      zh: {
        description:
          'IPCC《国家温室气体清单指南》是各国在国家排放清单中反映碳捕集与地质封存的主要国际核算框架。CCS的具体方法位于2006年指南第2卷第5章，针对二氧化碳运输、注入和地质封存设立清单类别1C。捕集过程产生的排放与减排应计入捕集发生的相应部门，运输、注入、封存以及可能泄漏产生的排放则单独估算。地质封存采用场址特定的Tier 3方法，并结合监测、质量平衡、质量保证和不确定性分析。2019年精细化指南用于更新、补充和细化2006年指南，并不取代后者；2019年精细化文件明确显示第2卷第5章“无修订”，因此CCS核算仍以2006年章节为基础。该指南服务于国家温室气体清单编制，并不是项目封存许可或自愿碳信用签发方法学。',
        scope:
          '覆盖化石和生物源二氧化碳捕集、运输、注入、地质封存、泄漏及相关排放或移除的国家温室气体清单核算。',
        tags: ['IPCC清单', '国家核算', '地质封存', 'Tier 3', 'MRV'],
        impactAnalysis: {
          economic:
            '为政府和市场引用提供可比核算基础，但不直接形成项目补贴、税收抵免或碳信用收入。',
          technical:
            '规定CCS清单边界、排放类别、场址特定估算方法、监测、质量控制和不确定性处理。',
          environmental:
            '要求核算封存泄漏以及运输和注入相关排放，而不能简单假定全部捕集二氧化碳永久留存。',
        },
        evolution: {
          clusters: ['IPCC国家清单指南', 'CCS清单核算', '国际气候报告'],
          milestones: [
            { date: '2006-01-01', event: '2006年IPCC指南设立二氧化碳运输、注入与地质封存专章。' },
            { date: '2019-05-12', event: 'IPCC通过2019年精细化指南，对2006年清单框架进行更新和补充。' },
            { date: '2023-07-01', event: 'IPCC发布进一步勘误，CCS专章仍以2006年方法为基础。' },
          ],
        },
        regulatory: {
          inventory_category:
            '运输、注入和地质封存排放计入1C类别，捕集影响计入捕集发生的相应部门。',
          storage_method: '地质封存采用场址特定Tier 3方法，并要求监测和泄漏核算。',
          legal_boundary: '该指南属于国家清单方法，不设立封存许可、责任转移或碳信用资格。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 20,
        label: 'No direct financial mechanism',
        evidence:
          'The Guidelines standardise national accounting but do not create subsidies, tax credits, regulated revenue or voluntary credits.',
        citation: '2006 IPCC Guidelines, Volume 2, Chapter 5.',
      },
      statutory: {
        score: 60,
        label: 'International methodological benchmark',
        evidence:
          'The Guidelines become operational through national inventory systems and reporting obligations, but they are not a storage-permitting statute.',
        citation: 'IPCC 2006 Guidelines and 2019 Refinement.',
      },
      market: {
        score: 50,
        label: 'Comparable national accounting foundation',
        evidence:
          'Consistent inventory treatment supports policy and market comparison, while project crediting requires separate standards or legislation.',
        citation: 'IPCC Task Force on National Greenhouse Gas Inventories.',
      },
      strategic: {
        score: 85,
        label: 'Global inventory accounting foundation',
        evidence:
          'The framework determines how countries report capture effects, transport and injection emissions, geological storage and leakage in national inventories.',
        citation: '2006 IPCC Guidelines, Volume 2, Chapter 5.',
      },
      mrv: {
        score: 100,
        label: 'Tier 3 site-specific storage accounting',
        evidence:
          'The CCS chapter defines inventory boundaries, site-specific Tier 3 methods, monitoring, mass balance, leakage treatment, QA/QC and uncertainty procedures.',
        citation: '2006 IPCC Guidelines, Volume 2, Chapter 5; IPCC CCS FAQ.',
      },
    },
  },
  {
    id: 'verra-vm0049',
    core: {
      status: 'Active',
      category: 'Methodology',
      legalWeight: 'Voluntary Carbon Crediting Methodology',
    },
    i18n: {
      en: {
        description:
          'VM0049 Carbon Capture and Storage is Verra’s globally applicable Verified Carbon Standard methodology for quantifying greenhouse-gas emission reductions and carbon dioxide removals from eligible CCS activities. Approved on 27 June 2024, it uses a modular architecture: projects combine the overarching VM0049 requirements with activity-specific capture, transport and storage modules that match their design. Active modules include direct air capture, CO2 transport, storage in saline aquifers and depleted hydrocarbon reservoirs, bioenergy capture and, from December 2025, capture from natural-gas processing. The structure can accommodate shared transport and storage hubs and can account for projects that control only part of a wider CCS chain, provided boundaries, ownership, monitoring, leakage and double-counting risks are addressed. Use of VM0049 does not automatically generate Verified Carbon Units: projects must meet the applicable modules and tools, demonstrate additionality and baseline eligibility, complete validation and verification, and satisfy VCS registration and issuance requirements. The methodology also does not replace national capture, transport or storage permits.',
        scope:
          'Globally applicable voluntary carbon-credit accounting for eligible CCS emission-reduction and removal projects using modular capture, transport and geological-storage requirements.',
        tags: [
          'Verra',
          'VM0049',
          'voluntary carbon market',
          'DACCS',
          'BECCS',
          'CCS hubs',
        ],
        impactAnalysis: {
          economic:
            'Creates a possible route to voluntary carbon-credit revenue for eligible projects, but credits depend on registration, validation, verification and issuance rather than methodology publication alone.',
          technical:
            'Uses modular project boundaries and quantification procedures for capture, transport, storage, leakage and project emissions across different CCS configurations.',
          environmental:
            'Requires additionality, monitoring, leakage treatment, permanence safeguards and double-counting controls intended to protect the integrity of credited reductions or removals.',
        },
        evolution: {
          clusters: ['Verra VM0049', 'CCS+ Initiative', 'Voluntary Carbon Market CCS'],
          milestones: [
            { date: '2024-06-27', event: 'Verra approved and released VM0049, version 1.0.' },
            {
              date: '2024-10-24',
              event: 'Verra activated the first DAC, CO2 transport and geological-storage modules.',
            },
            { date: '2025-04-22', event: 'The bioenergy carbon-capture module became active.' },
            {
              date: '2025-12-22',
              event: 'The natural-gas-processing capture module became active.',
            },
          ],
        },
        regulatory: {
          crediting_boundary:
            'VM0049 is a voluntary crediting methodology; VCU issuance requires project registration, validation, verification and conformity with active modules and tools.',
          permitting_boundary:
            'Use of the methodology does not replace national permits for capture facilities, CO2 transport, injection or geological storage.',
          hub_accounting:
            'The modular structure can support shared CCS hubs when project boundaries, chain-of-custody, ownership and double-counting controls are demonstrated.',
        },
      },
      zh: {
        description:
          'VM0049《碳捕集与封存》是Verra核证碳标准体系下适用于全球的CCS温室气体减排和二氧化碳移除核算方法学，于2024年6月27日批准发布。方法学采用模块化结构，项目须将VM0049总体要求与符合自身设计的捕集、运输和封存模块组合使用。现行模块包括直接空气捕集、二氧化碳运输、咸水层及枯竭油气藏封存、生物能源捕集，以及自2025年12月起生效的天然气处理过程捕集。该结构能够适应共享运输与封存枢纽，也可以处理项目仅控制CCS链条一部分的情形，但必须明确项目边界、权属、监测、泄漏和重复计算风险。采用VM0049并不自动产生核证碳单位；项目还需满足适用模块与工具、证明额外性和基准线资格、完成审定与核查，并符合VCS注册和签发程序。该方法学也不能替代所在国对捕集设施、二氧化碳运输和地质封存的行政许可。',
        scope:
          '适用于全球符合条件的CCS减排和移除项目，通过模块化捕集、运输和地质封存要求开展自愿碳信用核算。',
        tags: ['Verra', 'VM0049', '自愿碳市场', 'DACCS', 'BECCS', 'CCS枢纽'],
        impactAnalysis: {
          economic:
            '为符合条件的项目提供潜在自愿碳信用收入路径，但能否签发取决于注册、审定、核查和签发程序，而非方法学发布本身。',
          technical:
            '通过模块化项目边界和量化程序处理不同CCS配置下的捕集、运输、封存、泄漏和项目排放。',
          environmental:
            '要求额外性、监测、泄漏处理、永久性保障和避免重复计算，以维护获签发减排或移除信用的完整性。',
        },
        evolution: {
          clusters: ['Verra VM0049', 'CCS+倡议', '自愿碳市场CCS'],
          milestones: [
            { date: '2024-06-27', event: 'Verra批准并发布VM0049第1.0版。' },
            { date: '2024-10-24', event: '直接空气捕集、二氧化碳运输和地质封存首批模块生效。' },
            { date: '2025-04-22', event: '生物能源碳捕集模块生效。' },
            { date: '2025-12-22', event: '天然气处理过程二氧化碳捕集模块生效。' },
          ],
        },
        regulatory: {
          crediting_boundary:
            'VM0049属于自愿碳信用方法学，VCU签发仍需完成项目注册、审定、核查，并符合现行模块和工具要求。',
          permitting_boundary:
            '采用该方法学不能替代所在国的捕集设施、二氧化碳运输、注入和地质封存许可。',
          hub_accounting:
            '当项目能够证明边界、交接链、权属及避免重复计算时，模块化结构可支持共享CCS枢纽核算。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 80,
        label: 'Potential voluntary carbon-credit revenue',
        evidence:
          'VM0049 can enable eligible CCS reductions or removals to generate VCUs, but only after validation, verification, registration and issuance.',
        citation: 'Verra VM0049, v1.0 and VCS registration and issuance requirements.',
      },
      statutory: {
        score: 35,
        label: 'Non-government voluntary methodology',
        evidence:
          'VM0049 is a private voluntary standard and does not create legal authority to capture, transport, inject or store CO2.',
        citation: 'Verra VM0049 methodology page.',
      },
      market: {
        score: 85,
        label: 'Modular VCS crediting framework',
        evidence:
          'The methodology links eligible modular CCS activities to the VCS crediting system and supports shared infrastructure and hub configurations.',
        citation: 'Verra VM0049 and first CCS modules release, 24 October 2024.',
      },
      strategic: {
        score: 80,
        label: 'Scalable voluntary-market CCS architecture',
        evidence:
          'The modular design allows new capture technologies and shared transport or storage infrastructure to be added without rewriting the entire methodology.',
        citation: 'Verra VM0049 release, 27 June 2024.',
      },
      mrv: {
        score: 95,
        label: 'Modular project quantification and verification',
        evidence:
          'Active modules define project boundaries, baseline and project emissions, leakage and monitoring for DAC, transport, storage, BECCS and natural-gas-processing capture.',
        citation: 'VM0049 and active VMD0056, VMD0057, VMD0058, VMD0059 and VMD0062 modules.',
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

function queryRows(db, sql) {
  const statement = db.prepare(sql);
  const columns = statement.getColumnNames();
  const rows = [];
  while (statement.step()) {
    const values = statement.get();
    rows.push(Object.fromEntries(columns.map((column, index) => [column, values[index]])));
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
  return Number(scalar(db, 'SELECT COUNT(*) FROM policies WHERE id = ?', [id])) === 1;
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
    scalar(db, 'SELECT COUNT(*) FROM policy_i18n WHERE policy_id = ?', [update.id])
  );
  const analysisCount = Number(
    scalar(db, 'SELECT COUNT(*) FROM policy_analysis WHERE policy_id = ?', [update.id])
  );
  const minimumDescription = Number(
    scalar(
      db,
      `SELECT MIN(LENGTH(description)) FROM policy_i18n WHERE policy_id = ?`,
      [update.id]
    )
  );
  if (localeCount !== 2) throw new Error(`Policy ${update.id} lacks bilingual parity`);
  if (analysisCount !== 5) throw new Error(`Policy ${update.id} lacks five analysis dimensions`);
  if (minimumDescription < 250) {
    throw new Error(`Policy ${update.id} still has an underdeveloped description`);
  }
}

export function applyPolicyContentDepthMigration(
  db,
  { auditDate = '2026-07-22', expectedPolicyCount = 130 } = {}
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

  for (const update of POLICY_CONTENT_UPDATES) {
    if (!policyExists(db, update.id)) throw new Error(`Policy is missing: ${update.id}`);
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

  const afterPolicyCount = Number(scalar(db, 'SELECT COUNT(*) FROM policies'));
  if (afterPolicyCount !== beforePolicyCount) {
    throw new Error(
      `Policy count changed unexpectedly: before ${beforePolicyCount}, after ${afterPolicyCount}`
    );
  }

  return {
    migrationId: MIGRATION_ID,
    alreadyApplied,
    policyCount: afterPolicyCount,
    updatedPolicies: POLICY_CONTENT_UPDATES.map((entry) => entry.id),
    frozenTablesVerified: FROZEN_TABLES,
  };
}

async function main() {
  if (!fs.existsSync(DB_PATH)) throw new Error(`Database not found: ${DB_PATH}`);
  const SQL = await initSqlJs();
  const db = new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)));
  const summary = applyPolicyContentDepthMigration(db);
  const output = db.export();
  db.close();
  fs.writeFileSync(DB_PATH, new Uint8Array(output));
  console.log(JSON.stringify(summary, null, 2));
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  main().catch((error) => {
    console.error(`Policy content-depth migration failed: ${error.message}`);
    process.exit(1);
  });
}

#!/usr/bin/env node
/**
 * Add or refresh a conservative group of official-source policies selected by
 * the policy coverage matrix.
 *
 * SQLite is the single source of truth. This migration may modify only policy
 * tables and db_meta. Facilities, facility-policy relationships, country
 * profiles, capacity and coordinates are frozen and verified before commit.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'agent/ccus-ai-agent/db/ccus_master.sqlite');

export const MIGRATION_ID = 'high-priority-policy-gaps-2026-07';
const AUDIT_REVIEWER = 'Primary-source coverage gap audit';
const ANALYSIS_DIMENSIONS = [
  'incentive',
  'statutory',
  'market',
  'strategic',
  'mrv',
];
const FROZEN_TABLES = [
  'facilities',
  'facility_i18n',
  'facility_partners',
  'facility_links',
  'policy_facility_links',
  'country_profiles',
  'country_i18n',
];

export const POLICIES = [
  {
    core: {
      id: 'uk-industrial-carbon-capture-business-model-2025',
      country: 'United Kingdom',
      year: 2025,
      status: 'Active',
      category: 'Incentive',
      reviewStatus: 'verified',
      legalWeight: 'Government Contractual Support Framework',
      source: 'UK Department for Energy Security and Net Zero',
      url: 'https://www.gov.uk/government/publications/carbon-capture-usage-and-storage-ccus-business-models',
      pubDate: '2025-11-21',
      provenanceAuthor: 'CCUS AI Agent',
    },
    i18n: {
      en: {
        title: 'UK Industrial Carbon Capture Business Model (2025)',
        description:
          'The UK Industrial Carbon Capture (ICC) Business Model is the government contractual support framework for industrial and waste-sector carbon capture projects. The November 2025 package includes updated business-model terms, Front End Agreements and standard terms and conditions. The model combines an up-to-15-year payment per tonne of captured and permanently stored CO2 with capital grant co-funding for eligible initial projects. Revenue support is intended to cover efficient operating costs, CO2 transport and storage charges, repayment of capital investment and an allowed return. Support is allocated through government project-selection and contracting processes; publication of the model does not create an automatic subsidy entitlement.',
        scope:
          'Contractual capital and revenue support for eligible UK industrial and waste carbon capture projects.',
        tags: ['industrial CCS', 'contract', 'revenue support', 'capital grant'],
        impactAnalysis: {
          economic:
            'Provides long-term revenue certainty and initial capital co-funding intended to bridge the cost gap for first-of-a-kind industrial capture projects.',
          technical:
            'Links payments to captured and permanently stored CO2 and requires projects to meet contractual metering, availability, performance and transport-and-storage interface requirements.',
          environmental:
            'Targets hard-to-abate industrial and residual-waste emissions where deep decarbonisation alternatives are limited, subject to verified capture and permanent storage.',
        },
        evolution: {
          clusters: [
            'UK CCUS Business Models',
            'UK Industrial Decarbonisation',
            'UK Cluster Sequencing',
          ],
          milestones: [
            {
              date: '2022-12-01',
              event:
                'The government published the first full ICC business-model summary and contractual package.',
            },
            {
              date: '2023-10-17',
              event:
                'Updated ICC and Waste ICC contracts and revenue-support regulations were published.',
            },
            {
              date: '2025-11-21',
              event:
                'The government published the November 2025 ICC business-model update and refreshed contract templates.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        title: '英国工业碳捕集商业模式（2025）',
        description:
          '英国工业碳捕集（ICC）商业模式是政府面向工业及废弃物处理行业碳捕集项目建立的合同支持框架。2025年11月发布的文件包包括更新后的商业模式、前端协议以及标准条款。该模式通过最长15年的按捕集并永久封存二氧化碳吨数支付机制，并对符合条件的早期项目提供部分资本金补助，用于覆盖合理运营成本、二氧化碳运输与封存费用、捕集设备资本投入回收及允许收益。支持须通过政府项目遴选和签约程序获得，商业模式文件的发布并不产生自动补贴权利。',
        scope: '英国符合条件的工业及废弃物碳捕集项目的资本与长期收入支持。',
        tags: ['工业CCS', '合同机制', '收入支持', '资本补助'],
        impactAnalysis: {
          economic:
            '通过长期收入确定性和早期资本共担，弥补首批工业捕集项目的成本缺口并提高可融资性。',
          technical:
            '支付与实际捕集并永久封存的二氧化碳量挂钩，并通过合同规定计量、可用率、性能及运输封存接口要求。',
          environmental:
            '面向替代深度减排路径有限的难减排工业和残余废弃物排放，但须满足经核证捕集与永久封存条件。',
        },
        evolution: {
          clusters: ['英国CCUS商业模式', '英国工业脱碳', '英国集群遴选'],
          milestones: [
            {
              date: '2022-12-01',
              event: '英国发布首套完整的ICC商业模式摘要和合同文件。',
            },
            {
              date: '2023-10-17',
              event: '更新ICC、废弃物ICC合同及收入支持配套法规。',
            },
            {
              date: '2025-11-21',
              event: '政府发布2025年11月ICC商业模式更新及新版合同模板。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 95,
        label: 'Long-term capture contract',
        evidence:
          'The model combines an up-to-15-year per-tonne revenue contract with capital grant co-funding for eligible initial projects.',
        citation:
          'DESNZ, Industrial Carbon Capture business models update and contract package, November 2025.',
      },
      statutory: {
        score: 80,
        label: 'Statutory contracting powers implemented',
        evidence:
          'Energy Act powers and revenue-support regulations enable the Secretary of State to direct a counterparty to offer contracts to eligible carbon-capture entities.',
        citation:
          'Energy Act 2023; Hydrogen Production and Industrial Carbon Capture Revenue Support Regulations.',
      },
      market: {
        score: 85,
        label: 'Bankable cluster-anchor support',
        evidence:
          'The contract is designed to make selected industrial capture projects financeable while connecting them to regulated transport and storage networks.',
        citation: 'DESNZ ICC Business Model Update, November 2025.',
      },
      strategic: {
        score: 90,
        label: 'Core UK industrial CCS deployment mechanism',
        evidence:
          'The ICC model is the principal government mechanism for deploying capture at hard-to-abate industrial and waste facilities in CCUS clusters.',
        citation:
          'UK Carbon Budget and Growth Delivery Plan; DESNZ CCUS business-model publications.',
      },
      mrv: {
        score: 80,
        label: 'Contractual metering and storage verification',
        evidence:
          'Payments depend on measured captured CO2 delivered to transport and storage and permanently stored under the contractual and regulatory chain.',
        citation: 'DESNZ ICC Standard Terms and Conditions, November 2025.',
      },
    },
  },
  {
    core: {
      id: 'nl-mining-act-co2-storage-2011',
      country: 'Netherlands',
      year: 2011,
      status: 'Active',
      category: 'Regulatory',
      reviewStatus: 'verified',
      legalWeight: 'Primary Legislation',
      source: 'Government of the Netherlands, Laws and Regulations Database',
      url: 'https://wetten.overheid.nl/BWBR0014168/',
      pubDate: '2011-06-06',
      provenanceAuthor: 'CCUS AI Agent',
    },
    i18n: {
      en: {
        title: 'Netherlands Mining Act CO2 Storage Framework (2011)',
        description:
          'The Netherlands implemented the EU CCS Directive through amendments to the Mining Act and related legislation in 2011. The current Mining Act defines CO2 storage complexes and permanent geological storage, establishes exploration and storage permits, and provides the national legal basis for authorising and supervising offshore CO2 storage. It operates together with the Mining Decree, Mining Regulation, environmental permitting and EU emissions-accounting rules. This record represents the Dutch implementation layer and should not be confused with the separate SDE++ operating subsidy.',
        scope:
          'Dutch national exploration, permitting and supervision framework for permanent geological CO2 storage.',
        tags: ['Mining Act', 'storage permit', 'offshore storage', 'EU CCS Directive'],
        impactAnalysis: {
          economic:
            'Creates the legal certainty required for Dutch offshore storage licences and shared storage projects, while project revenue support is provided through separate mechanisms.',
          technical:
            'Requires characterisation and permitting of storage complexes and applies mining-law supervision to permanent injection and storage operations.',
          environmental:
            'Transposes the EU geological-storage safeguards into Dutch law and establishes a national permitting basis for containment and supervision.',
        },
        evolution: {
          clusters: [
            'Netherlands CO2 Storage Regulation',
            'EU CCS Directive Implementation',
            'North Sea Storage',
          ],
          milestones: [
            {
              date: '2011-06-06',
              event:
                'The Netherlands adopted the implementing act for Directive 2009/31/EC, amending the Mining Act and related legislation.',
            },
            {
              date: '2012-02-08',
              event:
                'The implementing framework entered into force through the associated commencement arrangements.',
            },
          ],
          currentConsolidatedVersion:
            'Current consolidated Mining Act text maintained by wetten.overheid.nl.',
        },
        regulatory: {
          pore_space_rights:
            'CO2 exploration and storage require licences under the Dutch Mining Act.',
          permitting_lead_time: 'Project-specific statutory permitting process.',
        },
      },
      zh: {
        title: '荷兰《矿业法》二氧化碳封存框架（2011）',
        description:
          '荷兰于2011年通过修订《矿业法》及相关法律落实欧盟CCS指令。现行《矿业法》定义二氧化碳封存复合体和永久地质封存，建立封存复合体勘探许可和封存许可制度，并为荷兰海上二氧化碳封存的批准与监管提供国家法律基础。该法与《矿业法令》《矿业条例》、环境许可及欧盟排放核算规则共同适用。本记录代表荷兰国内监管实施层，不应与SDE++运营补贴混为一项政策。',
        scope: '荷兰永久地质封存的勘探、许可和监管框架。',
        tags: ['矿业法', '封存许可', '海上封存', '欧盟CCS指令'],
        impactAnalysis: {
          economic:
            '为荷兰海上封存许可和共享封存项目提供法律确定性，项目收入支持则由其它机制另行提供。',
          technical:
            '要求对封存复合体进行表征和许可，并将永久注入与封存活动纳入矿业监管。',
          environmental:
            '将欧盟地质封存安全要求转化为荷兰国内法律，并建立封存完整性监管与许可基础。',
        },
        evolution: {
          clusters: ['荷兰二氧化碳封存监管', '欧盟CCS指令实施', '北海封存'],
          milestones: [
            {
              date: '2011-06-06',
              event: '荷兰通过实施欧盟2009/31/EC指令的法律，修订《矿业法》等法规。',
            },
            {
              date: '2012-02-08',
              event: '配套生效安排实施后，国内封存监管框架正式生效。',
            },
          ],
          currentConsolidatedVersion: '现行合并文本由荷兰政府法规数据库持续维护。',
        },
        regulatory: {
          pore_space_rights: '二氧化碳封存复合体勘探和封存须取得荷兰《矿业法》许可。',
          permitting_lead_time: '适用项目级法定许可程序。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 45,
        label: 'Legal enabler, not subsidy',
        evidence:
          'The Mining Act enables licensed storage but does not provide the operating subsidy available under SDE++.',
        citation: 'Dutch Mining Act; SDE++ is recorded separately.',
      },
      statutory: {
        score: 95,
        label: 'Primary Dutch storage law',
        evidence:
          'The Mining Act defines permanent CO2 storage and establishes exploration and storage permitting under Dutch law.',
        citation:
          'Mijnbouwwet, including provisions implementing Directive 2009/31/EC.',
      },
      market: {
        score: 70,
        label: 'Storage-market legal foundation',
        evidence:
          'The licensing framework enables commercial offshore storage services but does not by itself establish transport tariffs or third-party network rules.',
        citation: 'Dutch Mining Act and implementing legislation.',
      },
      strategic: {
        score: 85,
        label: 'National implementation of EU CCS law',
        evidence:
          'The framework provides the domestic legal foundation used by Dutch North Sea CO2 storage projects.',
        citation: 'Dutch implementation of Directive 2009/31/EC.',
      },
      mrv: {
        score: 85,
        label: 'Storage monitoring under national and EU rules',
        evidence:
          'Dutch storage permits operate within the Mining Act and EU monitoring, reporting and emissions-accounting framework.',
        citation: 'Dutch Mining Act; Directive 2009/31/EC; EU ETS rules.',
      },
    },
  },
  {
    core: {
      id: 'kr-ccus-act-enforcement-decree-2025',
      country: 'South Korea',
      year: 2025,
      status: 'Active',
      category: 'Regulatory',
      reviewStatus: 'verified',
      legalWeight: 'Presidential Decree',
      source: 'Korean National Law Information Center',
      url: 'https://www.law.go.kr/LSW/lsInfoP.do?ancYnChk=0&lsId=014834',
      pubDate: '2025-02-07',
      provenanceAuthor: 'CCUS AI Agent',
    },
    i18n: {
      en: {
        title: 'South Korea CCUS Act Enforcement Decree (2025)',
        description:
          'The Enforcement Decree implements South Korea’s Act on Carbon Dioxide Capture, Transport, Storage and Utilisation from 7 February 2025. It specifies procedures and criteria for capture-facility plans, transport-business approvals, pipeline safety management and inspection, storage-site exploration approvals, storage-business approvals, safety management, monitoring and performance evaluation. It also details certification and support arrangements for CO2 utilisation technologies, products and specialised enterprises. The decree operationalises the framework Act; it does not create a general regulated tariff or automatic project-revenue guarantee.',
        scope:
          'Detailed national implementation rules for CO2 capture facilities, transport, storage approvals, safety, monitoring and utilisation support.',
        tags: ['enforcement decree', 'storage permit', 'transport safety', 'monitoring'],
        impactAnalysis: {
          economic:
            'Reduces implementation uncertainty by specifying approval and support procedures, while project revenue support remains programme-specific rather than automatic.',
          technical:
            'Defines operational approval, safety-management, inspection, exploration, storage and monitoring procedures across the CCUS chain.',
          environmental:
            'Operationalises storage-site selection, safety and monitoring controls intended to prevent leakage and manage permanent geological storage.',
        },
        evolution: {
          clusters: [
            'South Korea CCUS Act',
            'South Korea Storage Regulation',
            'South Korea CCUS Industry Support',
          ],
          milestones: [
            {
              date: '2025-01-31',
              event:
                'The Cabinet approved the enforcement decree implementing the CCUS Act.',
            },
            {
              date: '2025-02-07',
              event:
                'The Act and enforcement decree entered into force, consolidating rules previously distributed across multiple laws.',
            },
            {
              date: '2026-03-31',
              event:
                'The consolidated decree was updated through government-organisation and climate-governance amendments without changing its core CCUS approval structure.',
            },
          ],
          currentConsolidatedVersion: 'Presidential Decree No. 36231, effective 31 March 2026.',
        },
        regulatory: {
          liability_transfer:
            'Detailed operator duties and approval procedures apply; long-term liability remains governed by the Act and implementing decisions.',
          permitting_lead_time: 'Project-specific statutory approval process.',
        },
      },
      zh: {
        title: '韩国《二氧化碳捕集、运输、封存及利用法》实施令（2025）',
        description:
          '韩国《二氧化碳捕集、运输、封存及利用法》实施令自2025年2月7日起实施，细化捕集设施安装计划、运输业务批准、管道安全管理与检查、封存候选地勘探批准、封存业务批准、安全管理、监测和绩效评价程序，并规定二氧化碳利用技术、产品及专业企业的认证与支持安排。该实施令将框架法转化为可操作制度，但并未建立统一受监管运输费率或自动项目收入保障。',
        scope: '韩国捕集设施、运输、封存许可、安全、监测及利用支持的国家实施规则。',
        tags: ['实施令', '封存许可', '运输安全', '监测'],
        impactAnalysis: {
          economic:
            '通过明确批准和支持程序降低项目实施不确定性，但收入支持仍取决于具体项目和计划。',
          technical:
            '建立覆盖捕集设施、运输、安全检查、封存勘探、封存业务和监测的操作性程序。',
          environmental:
            '通过场地选择、安全和监测制度控制泄漏风险并管理永久地质封存。',
        },
        evolution: {
          clusters: ['韩国CCUS法', '韩国封存监管', '韩国CCUS产业支持'],
          milestones: [
            {
              date: '2025-01-31',
              event: '韩国内阁通过CCUS法实施令。',
            },
            {
              date: '2025-02-07',
              event: '框架法和实施令生效，将分散于多项法律的CCUS规定进行整合。',
            },
            {
              date: '2026-03-31',
              event: '因政府组织及气候治理调整形成现行合并版本，核心CCUS批准制度未改变。',
            },
          ],
          currentConsolidatedVersion: '总统令第36231号，2026年3月31日起施行。',
        },
        regulatory: {
          liability_transfer: '运营方义务和审批程序由实施令细化，长期责任仍由法律及具体决定共同规范。',
          permitting_lead_time: '适用项目级法定审批程序。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 65,
        label: 'Implementation and enterprise support',
        evidence:
          'The decree details support, certification and specialised-enterprise arrangements but does not establish a universal project revenue mechanism.',
        citation: 'CCUS Act Enforcement Decree, Chapters VII-VIII.',
      },
      statutory: {
        score: 95,
        label: 'Operational presidential decree',
        evidence:
          'The decree supplies detailed procedures and criteria required to implement the national CCUS framework Act.',
        citation: 'CCUS Act Enforcement Decree, effective 7 February 2025.',
      },
      market: {
        score: 75,
        label: 'Approved transport and storage operations',
        evidence:
          'The decree operationalises transport and storage business approvals and safety requirements, but not a general network tariff or third-party-access regime.',
        citation: 'CCUS Act Enforcement Decree, transport and storage chapters.',
      },
      strategic: {
        score: 90,
        label: 'Full-chain implementation framework',
        evidence:
          'The decree converts the 2024 framework Act into operational rules across capture, transport, storage and utilisation.',
        citation:
          'Korean government implementation announcement, 6 February 2025.',
      },
      mrv: {
        score: 90,
        label: 'Operational monitoring and evaluation rules',
        evidence:
          'The decree specifies storage monitoring, safety management, inspection, evaluation and reporting procedures.',
        citation: 'CCUS Act Enforcement Decree, storage and monitoring provisions.',
      },
    },
  },
  {
    core: {
      id: 'us-iija-hubs',
      country: 'United States',
      year: 2021,
      status: 'Active',
      category: 'Incentive',
      reviewStatus: 'verified',
      legalWeight: 'Federal Statutory Finance Program',
      source: 'U.S. Department of Energy',
      url: 'https://www.energy.gov/edf/carbon-dioxide-transportation-infrastructure-finance-and-innovation-program',
      pubDate: '2021-11-15',
      provenanceAuthor: 'CCUS AI Agent',
    },
    i18n: {
      en: {
        title: 'U.S. CIFIA CO2 Transportation Infrastructure Finance Program',
        description:
          'The Infrastructure Investment and Jobs Act established the Carbon Dioxide Transportation Infrastructure Finance and Innovation Act (CIFIA) programme with $2.1 billion available for loans and grants supporting large-capacity, common-carrier CO2 transportation infrastructure. Eligible projects must demonstrate demand from associated anthropogenic or direct-air-capture projects, support geographic diversity and minimise siting impacts, including through existing infrastructure corridors. The existing database record previously combined the broader $12 billion federal carbon-management package, regional direct-air-capture hubs and transport infrastructure under one title. This corrected record follows its official DOE URL and represents CIFIA specifically; other IIJA programmes should be recorded separately when needed.',
        scope: 'Federal loans and grants for large-capacity common-carrier CO2 transportation infrastructure.',
        tags: ['CIFIA', 'CO2 transport', 'common carrier', 'infrastructure finance'],
        impactAnalysis: {
          economic:
            'Provides access to $2.1 billion in federal loans and grants intended to reduce financing barriers for shared CO2 transport infrastructure.',
          technical:
            'Supports large-capacity pipelines, shipping, rail and other common-carrier transport projects connected to multiple capture sources.',
          environmental:
            'Requires project demand, geographic diversity and siting considerations intended to minimise environmental disturbance.',
        },
        evolution: {
          clusters: [
            'US Bipartisan Infrastructure Law',
            'US CO2 Transport Infrastructure',
            'US Carbon Management Finance',
          ],
          milestones: [
            {
              date: '2021-11-15',
              event:
                'The Infrastructure Investment and Jobs Act authorised the CIFIA programme.',
            },
            {
              date: '2022-10-05',
              event:
                'DOE issued programme guidance and began implementing the federal transport-finance authority.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        title: '美国CIFIA二氧化碳运输基础设施融资计划',
        description:
          '美国《基础设施投资与就业法》设立二氧化碳运输基础设施融资与创新法（CIFIA）计划，安排21亿美元贷款和补助资金，用于支持大容量、公共承运性质的二氧化碳运输基础设施。合格项目须证明相关人为源或直接空气捕集项目的运输需求，促进地区多样性，并通过利用既有基础设施走廊等方式降低选址影响。数据库原记录将更广泛的120亿美元联邦碳管理投资、区域直接空气捕集中心和运输基础设施混为同一标题；现根据其DOE官方URL将记录校正为CIFIA专项，其它IIJA项目应在确有需要时分别建档。',
        scope: '面向大容量公共承运二氧化碳运输基础设施的联邦贷款和补助。',
        tags: ['CIFIA', '二氧化碳运输', '公共承运', '基础设施融资'],
        impactAnalysis: {
          economic:
            '通过21亿美元联邦贷款和补助降低共享二氧化碳运输基础设施的融资障碍。',
          technical:
            '支持连接多个捕集源的大容量管道、船舶、铁路及其它公共承运运输方式。',
          environmental:
            '要求证明项目需求、地区多样性并考虑选址影响，以降低环境扰动。',
        },
        evolution: {
          clusters: ['美国两党基础设施法', '美国二氧化碳运输基础设施', '美国碳管理融资'],
          milestones: [
            {
              date: '2021-11-15',
              event: '《基础设施投资与就业法》授权设立CIFIA计划。',
            },
            {
              date: '2022-10-05',
              event: '美国能源部发布计划指南并开始实施联邦运输融资权限。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 95,
        label: '$2.1 billion transport-finance programme',
        evidence:
          'CIFIA provides federal loans and grants for eligible large-capacity common-carrier CO2 transportation projects.',
        citation:
          'Infrastructure Investment and Jobs Act; DOE CIFIA programme page.',
      },
      statutory: {
        score: 85,
        label: 'Federal statutory finance authority',
        evidence:
          'The programme was authorised by the Infrastructure Investment and Jobs Act and implemented by DOE.',
        citation: 'Infrastructure Investment and Jobs Act, CIFIA provisions.',
      },
      market: {
        score: 85,
        label: 'Shared common-carrier infrastructure',
        evidence:
          'Eligibility prioritises large-capacity common-carrier infrastructure with demonstrated demand from associated capture projects.',
        citation: 'DOE CIFIA eligible-use criteria.',
      },
      strategic: {
        score: 90,
        label: 'National CO2 transport build-out',
        evidence:
          'CIFIA is the dedicated federal financing mechanism for expanding shared CO2 transportation infrastructure across emitting regions.',
        citation: 'DOE CIFIA programme overview.',
      },
      mrv: {
        score: 60,
        label: 'Project finance and reporting controls',
        evidence:
          'Projects must document eligibility, demand and use of federal funds, while emissions-accounting and storage MRV are governed by separate regimes.',
        citation: 'DOE CIFIA programme requirements.',
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

function upsertPolicy(db, policy, auditDate) {
  const core = policy.core;
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

  for (const lang of ['en', 'zh']) {
    const localized = policy.i18n[lang];
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
        core.id,
        lang,
        localized.title,
        localized.description,
        localized.scope ?? null,
        JSON.stringify(localized.tags ?? []),
        JSON.stringify(localized.impactAnalysis ?? {}),
        localized.interpretation ?? null,
        JSON.stringify(localized.evolution ?? {}),
        JSON.stringify(localized.regulatory ?? {}),
      ]
    );
  }

  for (const dimension of ANALYSIS_DIMENSIONS) {
    const values = policy.analysis[dimension];
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
        core.id,
        dimension,
        values.score,
        values.label,
        values.evidence,
        values.citation,
        values.auditNote ?? '',
      ]
    );
  }
}

function verifyPolicy(db, policyId) {
  const i18nCount = Number(
    scalar(db, 'SELECT COUNT(*) FROM policy_i18n WHERE policy_id = ?', [policyId])
  );
  const analysisCount = Number(
    scalar(db, 'SELECT COUNT(*) FROM policy_analysis WHERE policy_id = ?', [
      policyId,
    ])
  );
  if (i18nCount !== 2) {
    throw new Error(`Policy ${policyId} does not have exact bilingual parity`);
  }
  if (analysisCount !== ANALYSIS_DIMENSIONS.length) {
    throw new Error(`Policy ${policyId} does not have five analysis dimensions`);
  }
}

export function applyHighPriorityPolicyGapMigration(
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
  const missingBefore = POLICIES.filter(
    (policy) => !policyExists(db, policy.core.id)
  ).length;

  db.run('BEGIN TRANSACTION');
  try {
    for (const policy of POLICIES) {
      upsertPolicy(db, policy, auditDate);
      verifyPolicy(db, policy.core.id);
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
  if (afterPolicyCount !== beforePolicyCount + missingBefore) {
    throw new Error(
      `Unexpected policy count after migration: expected ${beforePolicyCount + missingBefore}, found ${afterPolicyCount}`
    );
  }

  return {
    migrationId: MIGRATION_ID,
    alreadyApplied,
    beforePolicyCount,
    addedPolicies: missingBefore,
    refreshedPolicies: POLICIES.length,
    afterPolicyCount,
    frozenTablesVerified: FROZEN_TABLES,
  };
}

async function main() {
  if (!fs.existsSync(DB_PATH)) throw new Error(`Database not found: ${DB_PATH}`);
  const SQL = await initSqlJs();
  const db = new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)));
  const summary = applyHighPriorityPolicyGapMigration(db);
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
    console.error(`High-priority policy migration failed: ${error.message}`);
    process.exit(1);
  });
}

#!/usr/bin/env node
/**
 * Add a conservative set of policy records verified against official sources.
 *
 * SQLite is the single source of truth. This migration may modify only policy
 * tables and db_meta. Facility, relationship, country, capacity and coordinate
 * tables are snapshotted before the transaction and must remain byte-for-byte
 * equivalent at the SQL-row level after the transaction.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'agent/ccus-ai-agent/db/ccus_master.sqlite');

export const MIGRATION_ID = 'official-policy-gaps-2026-07';

const AUDIT_REVIEWER = 'Primary-source policy gap audit';

const FROZEN_TABLES = [
  'facilities',
  'facility_i18n',
  'facility_partners',
  'facility_links',
  'policy_facility_links',
  'country_profiles',
  'country_i18n',
];

export const NEW_POLICIES = [
  {
    core: {
      id: 'br-sbce-law-15042-2024',
      country: 'Brazil',
      year: 2024,
      status: 'Active',
      category: 'Market',
      reviewStatus: 'verified',
      legalWeight: 'Primary Legislation',
      source: 'Presidency of the Republic of Brazil / Ministry of Finance',
      url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l15042.htm',
      pubDate: '2024-12-11',
      provenanceAuthor: 'CCUS AI Agent',
    },
    i18n: {
      en: {
        title:
          'Brazilian Emissions Trading System (SBCE) — Law No. 15,042/2024',
        description:
          'Law No. 15,042/2024 establishes the Brazilian Emissions Trading System (SBCE) as a regulated environment for limiting greenhouse-gas emissions and trading assets representing emissions, verified reductions or verified removals. The law expressly includes direct air capture and storage among possible removal technologies and establishes phased implementation, registry, reporting, verification and compliance architecture. It does not authorise geological CO2 storage projects; the CCS operating and authorisation framework remains governed separately by Law No. 14,993/2024 and ANP regulation.',
        scope:
          'Brazilian national regulated carbon market and its phased implementation.',
        tags: ['ETS', 'carbon pricing', 'MRV', 'carbon removals'],
        impactAnalysis: {
          economic:
            'Creates a regulated market for emission allowances and verified reduction or removal certificates, while implementation remains phased and depends on secondary regulation and allocation plans.',
          technical:
            'Requires monitoring, reporting, verification, a central registry and approved methodologies; direct-air-capture-and-storage technologies are recognised within the statutory removal definition.',
          environmental:
            'Establishes a national compliance framework for emissions and removals, with safeguards against reversal and double counting built into the statutory architecture.',
        },
        evolution: {
          clusters: [
            'Brazil Carbon Market',
            'Brazil Climate Policy',
            'Industrial Decarbonisation',
          ],
          milestones: [
            {
              date: '2024-12-11',
              event: 'Law No. 15,042/2024 instituted the SBCE.',
            },
            {
              date: '2025-10-15',
              event:
                'Decree No. 12,677 created the Extraordinary Secretariat for the Carbon Market to coordinate initial implementation.',
            },
            {
              date: '2026-06-19',
              event:
                'The Ministry of Finance published an updated informational implementation roadmap for the statutory phases.',
            },
          ],
        },
        regulatory: {
          co2_definition:
            'Emissions and removals are measured in tCO2e; the removal definition expressly includes direct air capture and storage technologies.',
          cross_border_rules:
            'Internationally transferred mitigation outcomes require formal authorisation and corresponding adjustments.',
        },
      },
      zh: {
        title: '巴西排放交易体系（SBCE）——第15,042/2024号法律',
        description:
          '巴西第15,042/2024号法律设立巴西温室气体排放交易体系（SBCE），通过排放约束以及排放、经核证减排和经核证移除资产交易构建全国受监管碳市场。该法将直接空气捕集与封存明确列入可能的温室气体移除技术，并规定分阶段实施、中央登记、监测、报告、核证和履约制度。该法不负责批准地质封存项目；二氧化碳地质封存的运营与授权框架仍由第14,993/2024号法律及ANP配套监管另行规范。',
        scope: '巴西全国受监管碳市场及其分阶段实施安排。',
        tags: ['排放交易体系', '碳定价', 'MRV', '碳移除'],
        impactAnalysis: {
          economic:
            '建立排放配额及经核证减排、移除证书的受监管市场，但具体运行仍取决于分阶段实施、配套法规和国家配额分配方案。',
          technical:
            '要求建立监测、报告、核证、中央登记和方法学体系，并在法定移除定义中纳入直接空气捕集与封存技术。',
          environmental:
            '建立覆盖排放与移除的全国履约框架，并在法律架构中处理移除逆转与重复计算风险。',
        },
        evolution: {
          clusters: ['巴西碳市场', '巴西气候政策', '工业脱碳'],
          milestones: [
            {
              date: '2024-12-11',
              event: '第15,042/2024号法律正式设立SBCE。',
            },
            {
              date: '2025-10-15',
              event:
                '第12,677号法令设立碳市场特别秘书处，负责协调SBCE初期实施。',
            },
            {
              date: '2026-06-19',
              event: '巴西财政部更新发布SBCE法定阶段实施路线图。',
            },
          ],
        },
        regulatory: {
          co2_definition:
            '排放与移除统一以吨二氧化碳当量计量，移除定义明确包括直接空气捕集与封存技术。',
          cross_border_rules: '国际转移减缓成果须取得正式授权并进行相应调整。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 65,
        label: 'Phased carbon-asset incentive',
        evidence:
          'The law creates tradable compliance and verified reduction or removal assets, but economic incentives depend on phased implementation and later allocation and methodology rules.',
        citation: 'Law No. 15,042/2024, Articles 3, 10-15 and 50.',
      },
      statutory: {
        score: 90,
        label: 'Primary national ETS law',
        evidence:
          'Law No. 15,042/2024 establishes the SBCE, its governance, regulated entities, assets, compliance duties and implementation phases.',
        citation: 'Law No. 15,042/2024.',
      },
      market: {
        score: 95,
        label: 'National regulated carbon market',
        evidence:
          'The SBCE is a regulated cap-and-trade environment for allowances and verified reduction or removal assets.',
        citation: 'Law No. 15,042/2024, Articles 3 and 10-15.',
      },
      strategic: {
        score: 85,
        label: 'Economy-wide carbon-pricing framework',
        evidence:
          'The law creates the national architecture intended to translate Brazilian climate commitments into regulated carbon-market obligations.',
        citation: 'Law No. 15,042/2024, Articles 3-5 and 50.',
      },
      mrv: {
        score: 90,
        label: 'Statutory MRV and registry',
        evidence:
          'Operators are subject to monitoring plans, emissions and removals reporting, verification, registry and compliance procedures developed through the statutory implementation phases.',
        citation: 'Law No. 15,042/2024, Chapters II-IV and Article 50.',
      },
    },
  },
  {
    core: {
      id: 'eu-industrial-carbon-management-strategy-2024',
      country: 'European Union',
      year: 2024,
      status: 'Active',
      category: 'Strategic',
      reviewStatus: 'verified',
      legalWeight: 'European Commission Communication',
      source: 'European Union (EUR-Lex)',
      url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52024DC0062',
      pubDate: '2024-02-06',
      provenanceAuthor: 'CCUS AI Agent',
    },
    i18n: {
      en: {
        title: 'EU Industrial Carbon Management Strategy (COM(2024) 62)',
        description:
          'The European Commission communication COM(2024) 62 is the EU’s dedicated roadmap for industrial carbon management. It organises the policy around three pathways—CCS, permanent industrial carbon removals and CCU—and calls for integrated CO2 capture, transport, utilisation and storage value chains. It supports the strategic objective of at least 50 Mt per year of operational CO2 injection capacity by 2030, coordinated transport infrastructure, cross-border interoperability and the development of an EU market for CO2 transport and storage services. The communication is strategic guidance rather than directly binding legislation.',
        scope:
          'EU-wide industrial carbon management, including CCS, CCU, removals, transport and storage markets.',
        tags: ['CCS', 'CCU', 'carbon removals', 'CO2 infrastructure'],
        impactAnalysis: {
          economic:
            'Frames the business and investment conditions for shared CO2 infrastructure and competitive transport and storage services, while recognising the need for public bridging support during market formation.',
          technical:
            'Calls for interoperable pipelines, ships, trains and trucks, common CO2 specifications, storage characterisation and coordinated infrastructure planning.',
          environmental:
            'Positions CCS and permanent removals as complements to direct emission reductions for hard-to-abate process emissions and residual emissions on the path to climate neutrality.',
        },
        evolution: {
          clusters: [
            'EU Industrial Carbon Management',
            'EU CO2 Transport and Storage Market',
            'European Green Deal',
          ],
          milestones: [
            {
              date: '2024-02-06',
              event:
                'The European Commission adopted COM(2024) 62 as the dedicated industrial carbon management strategy.',
            },
            {
              date: '2024-06-28',
              event:
                'The Net-Zero Industry Act entered into force and placed the 50 Mtpa 2030 injection-capacity objective on a legislative basis.',
            },
            {
              date: '2025-02-26',
              event:
                'The Clean Industrial Deal reinforced industrial decarbonisation and CCUS as part of the EU competitiveness agenda.',
            },
          ],
        },
        regulatory: {
          cross_border_rules:
            'Calls for EU-wide transport infrastructure, interoperability and market rules; the communication is not itself a binding cross-border transport law.',
        },
      },
      zh: {
        title: '欧盟工业碳管理战略（COM(2024) 62）',
        description:
          '欧盟委员会COM(2024) 62号文件是欧盟面向工业碳管理的专项路线图，围绕碳捕集与封存、永久性工业碳移除和碳捕集利用三条路径，推动捕集、运输、利用和封存一体化价值链。战略支持到2030年至少形成每年5000万吨可运行二氧化碳注入能力，并推动运输基础设施协同规划、跨境互操作以及欧盟二氧化碳运输和封存服务市场建设。该文件属于战略性委员会通告，本身并非直接具有约束力的立法。',
        scope: '欧盟范围内的CCS、CCU、工业碳移除、运输和封存市场。',
        tags: ['CCS', 'CCU', '碳移除', '二氧化碳基础设施'],
        impactAnalysis: {
          economic:
            '为共享二氧化碳基础设施和竞争性运输、封存服务提出商业与投资框架，并承认市场形成初期需要公共资金提供过渡支持。',
          technical:
            '推动管道、船舶、铁路和公路运输互操作，统一二氧化碳规格，开展封存场地表征和跨区域基础设施规划。',
          environmental:
            '将CCS和永久性碳移除定位为直接减排的补充，用于处理难减排工业过程排放和净零路径中的剩余排放。',
        },
        evolution: {
          clusters: [
            '欧盟工业碳管理',
            '欧盟二氧化碳运输与封存市场',
            '欧洲绿色协议',
          ],
          milestones: [
            {
              date: '2024-02-06',
              event: '欧盟委员会发布COM(2024) 62号工业碳管理专项战略。',
            },
            {
              date: '2024-06-28',
              event:
                '《净零工业法》生效，将2030年5000万吨/年注入能力目标纳入立法框架。',
            },
            {
              date: '2025-02-26',
              event:
                '《清洁工业协议》进一步将工业脱碳和CCUS纳入欧盟竞争力议程。',
            },
          ],
        },
        regulatory: {
          cross_border_rules:
            '战略要求建设欧盟统一运输基础设施、互操作和市场规则，但该通告本身不是具有约束力的跨境运输法律。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 70,
        label: 'Investment-framework roadmap',
        evidence:
          'The strategy coordinates EU and national funding, risk reduction and market-building measures but does not itself appropriate a new dedicated subsidy.',
        citation: 'COM(2024) 62, Sections 4 and 5.',
      },
      statutory: {
        score: 45,
        label: 'Non-binding Commission communication',
        evidence:
          'COM(2024) 62 is a strategic Commission communication; binding obligations arise from separate instruments such as the EU ETS, CCS Directive and Net-Zero Industry Act.',
        citation: 'COM(2024) 62 final.',
      },
      market: {
        score: 85,
        label: 'EU CO2-services market roadmap',
        evidence:
          'The strategy seeks a single market for industrial carbon management and competitive CO2 transport and storage services, including demand-supply coordination.',
        citation: 'COM(2024) 62, Sections 3 and 4.',
      },
      strategic: {
        score: 100,
        label: 'Dedicated EU carbon-management strategy',
        evidence:
          'The communication establishes the EU-wide roadmap for CCS, CCU and permanent removals and links it to the 2030 storage-capacity objective and climate neutrality.',
        citation: 'COM(2024) 62, Sections 1-3.',
      },
      mrv: {
        score: 70,
        label: 'Coordinated accounting agenda',
        evidence:
          'The strategy calls for robust accounting and certification across CCS, CCU and removals, while detailed MRV obligations remain in separate legal instruments and methodologies.',
        citation: 'COM(2024) 62, Sections 4.3 and 5.',
      },
    },
  },
  {
    core: {
      id: 'cn-national-ets-expansion-2025',
      country: 'China',
      year: 2025,
      status: 'Active',
      category: 'Market',
      reviewStatus: 'verified',
      legalWeight: 'Ministerial Work Plan approved by the State Council',
      source: 'Ministry of Ecology and Environment of China',
      url: 'https://www.mee.gov.cn/xxgk2018/xxgk/xxgk03/202503/t20250326_1104736.html',
      pubDate: '2025-03-20',
      provenanceAuthor: 'CCUS AI Agent',
    },
    i18n: {
      en: {
        title:
          'China National ETS Expansion to Steel, Cement and Aluminium (2025)',
        description:
          'The Ministry of Ecology and Environment work plan, approved by the State Council and issued in March 2025, brought steel, cement and aluminium smelting into China’s national emissions trading system. It is the first operational expansion beyond the power sector and introduces sector-specific greenhouse-gas accounting, reporting, verification, allocation and compliance arrangements. The start-up phase covers 2024-2026, followed by a deepening phase from 2027. The policy creates an indirect carbon-price and MRV driver for industrial decarbonisation, including potential CCUS investment, but it does not establish a CCUS offset methodology or guarantee that captured and stored CO2 generates tradable credits.',
        scope:
          'National ETS coverage and MRV for steel, cement and aluminium smelting.',
        tags: ['ETS', 'steel', 'cement', 'aluminium', 'MRV'],
        impactAnalysis: {
          economic:
            'Extends a national carbon-price benchmark and allowance market to three emissions-intensive industrial sectors while using a gradual, initially limited compliance-cost approach.',
          technical:
            'Creates sector-specific accounting and verification rules and upgrades the national management, registry and trading systems for industrial emissions data.',
          environmental:
            'Expands national ETS coverage from power into energy and process emissions in steel, cement and aluminium, increasing the share of national CO2 emissions under market management to more than 60% according to MEE.',
        },
        evolution: {
          clusters: [
            'China National ETS',
            'Industrial Decarbonisation',
            'Carbon Data Governance',
          ],
          milestones: [
            {
              date: '2025-03-20',
              event:
                'MEE issued the State-Council-approved work plan for the first national ETS expansion.',
            },
            {
              date: '2025-04-15',
              event:
                'MEE issued the annual market-management notice covering entity lists, data quality, allocation and compliance for 2025.',
            },
          ],
          effectiveApplicationWindow:
            'Start-up: 2024-2026; deepening: 2027 onward.',
        },
        regulatory: {},
      },
      zh: {
        title: '全国碳市场纳入钢铁、水泥、铝冶炼行业工作方案（2025）',
        description:
          '经国务院批准，生态环境部于2025年3月印发工作方案，将钢铁、水泥和铝冶炼行业纳入全国碳排放权交易市场。这是全国碳市场在发电行业之外首次进入操作实施阶段的扩围，并建立分行业的温室气体核算、报告、核查、配额分配和履约安排。启动实施阶段为2024—2026年度，2027年度起进入深化完善阶段。该政策通过碳价和MRV要求间接推动工业深度减排及潜在CCUS投资，但并未建立CCUS抵销方法学，也不能据此认定捕集封存量可以直接生成可交易信用。',
        scope: '钢铁、水泥、铝冶炼行业的全国碳市场覆盖及MRV制度。',
        tags: ['碳市场', '钢铁', '水泥', '铝冶炼', 'MRV'],
        impactAnalysis: {
          economic:
            '将全国碳价基准和配额交易扩展至三个高排放工业行业，同时在初期采取渐进、较低履约压力的实施方式。',
          technical:
            '建立分行业核算与核查规则，并升级全国碳市场管理平台、注册登记系统和交易系统。',
          environmental:
            '将管控范围从发电扩展至钢铁、水泥和铝冶炼的能源活动及工业过程排放；生态环境部称扩围后全国60%以上二氧化碳排放纳入碳市场管理。',
        },
        evolution: {
          clusters: ['全国碳市场', '工业脱碳', '碳数据治理'],
          milestones: [
            {
              date: '2025-03-20',
              event: '生态环境部印发经国务院批准的首次全国碳市场扩围工作方案。',
            },
            {
              date: '2025-04-15',
              event:
                '生态环境部印发2025年度碳市场工作通知，部署名录、数据质量、配额和履约管理。',
            },
          ],
          effectiveApplicationWindow:
            '启动实施：2024—2026年度；深化完善：2027年度起。',
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 60,
        label: 'Gradual carbon-price incentive',
        evidence:
          'Allowance allocation and trading introduce a carbon-price signal, but the 2024-2026 start-up phase deliberately limits overall allowance deficits and compliance pressure.',
        citation:
          'MEE 2025 work plan and official Q&A on the steel, cement and aluminium expansion.',
      },
      statutory: {
        score: 80,
        label: 'State-Council-approved implementation plan',
        evidence:
          'The MEE work plan was approved by the State Council and implements the Interim Regulations on Carbon Emissions Trading.',
        citation: 'MEE Circular Huan Qihou [2025] No. 23.',
      },
      market: {
        score: 95,
        label: 'First national ETS expansion',
        evidence:
          'Steel, cement and aluminium smelting became covered sectors in the national compliance market, adding around 1,500 entities according to MEE.',
        citation: 'MEE official Q&A, 26 March 2025.',
      },
      strategic: {
        score: 85,
        label: 'Industrial carbon-pricing expansion',
        evidence:
          'The expansion moves the national ETS beyond power into major hard-to-abate industrial sectors and both energy and process emissions.',
        citation: 'MEE 2025 work plan and official Q&A.',
      },
      mrv: {
        score: 95,
        label: 'Sector-specific accounting and verification',
        evidence:
          'MEE issued six sector accounting/reporting and verification technical documents and deployed dedicated data-management modules for the three sectors.',
        citation: 'MEE official Q&A, 26 March 2025.',
      },
    },
  },
];

export const POLICY_UPDATES = [
  {
    id: 'br-law-14993-2024',
    core: {
      year: 2024,
      status: 'Active',
      category: 'Regulatory',
      reviewStatus: 'verified',
      legalWeight: 'Primary Legislation',
      source: 'Presidency of the Republic of Brazil / ANP',
      url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14993.htm',
      pubDate: '2024-10-08',
    },
    i18n: {
      en: {
        title: "Brazil 'Fuels of the Future' Act (Law No. 14,993/2024)",
        description:
          'Law No. 14,993/2024 establishes Brazil’s federal legal basis for the capture, transport and permanent geological storage of CO2 outside contracted oil-and-gas enhanced-recovery operations. It assigns ANP responsibility for regulating and authorising the CCS industry, provides for authorisations of 30 years renewable for a further 30 years, and requires storage plans, monitoring, validated data, storage and leakage inventories, contingency action and regulatory audits. The law does not establish the Brazilian Emissions Trading System; the SBCE was created separately by Law No. 15,042/2024.',
        impactAnalysis: {
          economic:
            'Creates long-duration federal authorisations and a regulated basis for commercial CCS services; it is an enabling legal framework rather than a direct CCS subsidy or carbon-crediting rule.',
          technical:
            'Requires safe and effective storage, monitoring and contingency plans, calibrated equipment, validated storage data, inventories of stored CO2 and leakage, and access for inspection and audit.',
          environmental:
            'Establishes a permanent geological-storage framework and operator duties intended to maintain containment and respond to undesirable events; EOR within existing hydrocarbon contracts is outside this CCS authorisation regime.',
        },
        evolution: {
          clusters: [
            'Brazil CCS Regulatory Framework',
            'Fuels of the Future',
            'ANP CCS Regulation',
          ],
          milestones: [
            {
              date: '2024-10-08',
              event:
                'Law No. 14,993/2024 established the federal CCS authorisation framework and assigned regulatory authority to ANP.',
            },
            {
              date: '2024-12-19',
              event:
                'ANP approved interim administrative arrangements for evaluating CCS projects while detailed regulation was under development.',
            },
            {
              date: '2025-11-17',
              event:
                'A draft implementing decree entered public consultation; the consultation did not itself constitute final regulation.',
            },
          ],
        },
      },
      zh: {
        title: '巴西《未来燃料法》（第14,993/2024号法律）',
        description:
          '巴西第14,993/2024号法律建立联邦层面的二氧化碳捕集、运输和永久地质封存法律基础，但不适用于已签油气合同区内为提高采收率实施的二氧化碳注入。该法授权ANP监管和批准CCS行业活动，授权期为30年并可再延长30年，同时要求运营方制定封存、监测和应急方案，校准设备，记录并验证封存数据，编制封存量和泄漏清单，并接受检查与审计。该法并未设立巴西排放交易体系；SBCE由第15,042/2024号法律另行建立。',
        impactAnalysis: {
          economic:
            '通过长期联邦授权和明确监管权限，为商业化CCS服务提供法律基础；该法本身不是直接补贴或碳信用签发规则。',
          technical:
            '要求安全有效封存、监测和应急方案、设备校准、封存数据验证、封存量与泄漏清单以及监管检查审计。',
          environmental:
            '建立永久地质封存及运营方封存完整性责任框架，并要求处置异常事件；现有油气合同区内的提高采收率活动不适用该CCS授权制度。',
        },
        evolution: {
          clusters: ['巴西CCS监管框架', '未来燃料法', 'ANP CCS监管'],
          milestones: [
            {
              date: '2024-10-08',
              event:
                '第14,993/2024号法律建立联邦CCS授权框架，并将监管职权赋予ANP。',
            },
            {
              date: '2024-12-19',
              event: 'ANP批准在专项法规制定期间评估CCS项目的临时行政安排。',
            },
            {
              date: '2025-11-17',
              event:
                '实施法令草案进入公开咨询；公开咨询本身不等同于最终法规生效。',
            },
          ],
        },
      },
    },
    analysis: {
      incentive: {
        score: 55,
        label: 'Legal-certainty enabler',
        evidence:
          'The law enables long-duration CCS authorisations and related services but does not itself provide a dedicated CCS subsidy or SBCE crediting entitlement.',
        citation: 'Law No. 14,993/2024, Articles 26-30.',
      },
      statutory: {
        score: 95,
        label: 'Federal CCS authorisation law',
        evidence:
          'The law assigns ANP authority to regulate and authorise capture for geological storage and the geological storage industry.',
        citation: 'Law No. 14,993/2024, Articles 26-30.',
      },
      market: {
        score: 75,
        label: 'Basis for commercial CCS services',
        evidence:
          'The authorisation regime creates a legal basis for commercial capture, transport and storage services, but carbon-market asset treatment is governed separately.',
        citation: 'Law No. 14,993/2024; Law No. 15,042/2024.',
      },
      strategic: {
        score: 85,
        label: 'National CCS legal foundation',
        evidence:
          'The Act establishes the national statutory foundation required for non-EOR geological storage projects and subsequent ANP regulation.',
        citation: 'Law No. 14,993/2024, Articles 26-30; ANP CCS overview.',
      },
      mrv: {
        score: 90,
        label: 'Storage monitoring and audit duties',
        evidence:
          'Operators must maintain monitoring and contingency plans, validate storage data, compile storage and leakage inventories, respond to undesirable events and permit audits and inspections.',
        citation: 'Law No. 14,993/2024, Article 29.',
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
  return (
    Number(scalar(db, 'SELECT COUNT(*) FROM policies WHERE id = ?', [id])) > 0
  );
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

function addOrRefreshPolicy(db, policy, auditDate) {
  upsertPolicyCore(db, policy.core, auditDate);
  for (const lang of ['en', 'zh']) {
    upsertPolicyI18n(db, policy.core.id, lang, policy.i18n[lang]);
  }
  for (const [dimension, values] of Object.entries(policy.analysis)) {
    upsertPolicyAnalysis(db, policy.core.id, dimension, values);
  }
}

function updateExistingPolicy(db, update, auditDate) {
  if (!policyExists(db, update.id)) {
    throw new Error(`Policy is missing: ${update.id}`);
  }

  const fields = {
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
  for (const [field, column] of Object.entries(fields)) {
    if (update.core[field] === undefined) continue;
    assignments.push(`${column} = ?`);
    params.push(update.core[field]);
  }
  assignments.push('provenance_reviewer = ?', 'provenance_last_audit_date = ?');
  params.push(AUDIT_REVIEWER, auditDate, update.id);
  execute(
    db,
    `UPDATE policies SET ${assignments.join(', ')} WHERE id = ?`,
    params
  );

  for (const lang of ['en', 'zh']) {
    const localized = update.i18n[lang];
    execute(
      db,
      `UPDATE policy_i18n SET
         title = ?, description = ?, impact_analysis_json = ?, evolution_json = ?
       WHERE policy_id = ? AND lang = ?`,
      [
        localized.title,
        localized.description,
        JSON.stringify(localized.impactAnalysis),
        JSON.stringify(localized.evolution),
        update.id,
        lang,
      ]
    );
  }

  for (const [dimension, values] of Object.entries(update.analysis)) {
    upsertPolicyAnalysis(db, update.id, dimension, values);
  }
}

function verifyPolicyCompleteness(db, id) {
  const i18nCount = Number(
    scalar(db, 'SELECT COUNT(*) FROM policy_i18n WHERE policy_id = ?', [id])
  );
  const analysisCount = Number(
    scalar(db, 'SELECT COUNT(*) FROM policy_analysis WHERE policy_id = ?', [id])
  );
  if (i18nCount !== 2) {
    throw new Error(`Policy ${id} does not have exact bilingual parity`);
  }
  if (analysisCount !== 5) {
    throw new Error(`Policy ${id} does not have five analysis dimensions`);
  }
}

export function applyOfficialPolicyGapMigration(
  db,
  { auditDate = '2026-07-21', expectedPolicyCount = 124 } = {}
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
  const missingBefore = NEW_POLICIES.filter(
    (policy) => !policyExists(db, policy.core.id)
  ).length;

  db.run('BEGIN TRANSACTION');
  try {
    for (const policy of NEW_POLICIES) {
      addOrRefreshPolicy(db, policy, auditDate);
    }
    for (const update of POLICY_UPDATES) {
      updateExistingPolicy(db, update, auditDate);
    }

    for (const policy of NEW_POLICIES) {
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
  const expectedAfter = beforePolicyCount + missingBefore;
  if (afterPolicyCount !== expectedAfter) {
    throw new Error(
      `Unexpected policy count after migration: expected ${expectedAfter}, found ${afterPolicyCount}`
    );
  }

  return {
    migrationId: MIGRATION_ID,
    alreadyApplied,
    beforePolicyCount,
    addedPolicies: missingBefore,
    correctedPolicies: POLICY_UPDATES.length,
    afterPolicyCount,
    frozenTablesVerified: FROZEN_TABLES,
  };
}

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database not found: ${DB_PATH}`);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)));
  const summary = applyOfficialPolicyGapMigration(db);
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
    console.error(`Official policy gap migration failed: ${error.message}`);
    process.exit(1);
  });
}

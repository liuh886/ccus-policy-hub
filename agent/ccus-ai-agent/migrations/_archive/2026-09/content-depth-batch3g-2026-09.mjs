#!/usr/bin/env node
/**
 * Content-depth batch 3G (2026-09): enrich the six Latin America records
 * with primary-source-backed bilingual content.
 *
 * Scores before: br-anp-ccs-resolution (22), br-bill-1425-2022 (28),
 * co-ccus-regulatory-decree-2025 (21), co-law-2099-energy-transition (23),
 * cl-green-hydrogen-ccs-2025 (22), mx-sener-ccus-2025 (44).
 *
 * Integrity fixes: co-decree reframed as draft-under-consultation (Title
 * VIII of Decree 1073/2015) with status Active -> Under development;
 * br-bill evolution records supersession-by-substance via Law 14.993
 * (status kept Upcoming — formal archival unverified); co-law2099 50%/15yr
 * framing replaced with the actual articles (ET 255/424, Ley 1715, UPME,
 * FENOGE); unverifiable regulatory specifics in co-decree/cl/mx blocks
 * rewritten from ministry sources. Target: each scores >= 70.
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

export const MIGRATION_ID = 'content-depth-batch3g-2026-09';
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
    id: 'br-anp-ccs-resolution',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'Departmental Rules',
    },
    i18n: {
      en: {
        description:
          'ANP regulates Brazilian CCS under Law 14.993/2024 (Fuel of the Future, October 8, 2024): capture, pipeline transport and geological storage by ANP authorisation (arts.26-28) — Brazilian companies/consortia, 30-year terms extendable, EOR injection excluded from the CCS track, operator duties (monitoring and contingency plans, calibrated tools, storage and leakage inventories, audits), public basin data access, and ANP as synthetic-fuels/CCS regulator. Resolution 859/2024 (December 19, 2024) opened experimental pilot-project regulation with an internal CCS standard while definitive rules are prepared. Decree 13.095 (August 13, 2026) then regulated arts.26-29 with six technology routes (BECCS, BECCUS, CCS, CCUS, DACCS, DACCUS), SBCE linkage (Art.5: storage counts as regulated-market mitigation), ANP authorisation with financial guarantees (Art.7), and multi-user shared-infrastructure business models (Art.10). CNPE Resolution 07/2025 prioritised CCS in oil R&D themes.',
        scope:
          'Brazilian CCS regulation: ANP authorisation and supervision, 30-year terms, pilot experimental track, six technology routes, SBCE linkage, multi-user infrastructure, R&D prioritisation.',
        tags: [
          'Law 14.993',
          'ANP',
          'Resolution 859',
          'Decree 13095',
          'SBCE linkage',
          '30-year authorisation',
        ],
        impactAnalysis: {
          economic:
            'Thirty-year extendable authorisations with multi-user infrastructure models and SBCE credit linkage convert authorisations into bankable storage assets — the first Brazilian CCS revenue architecture.',
          technical:
            'Six defined technology routes (BECCS through DACCUS) with ANP-set qualification, transfer and stream-acceptance conditions standardise project design across biogenic, fossil and atmospheric carbon.',
          environmental:
            'Operator duties (monitoring/contingency plans, leakage inventories, audits) with environmental licensing retained plus SBCE-grade measurement keep the 2026 decree inside verifiable containment.',
        },
        evolution: {
          clusters: ['Brazil CCS Law', 'ANP Regulation', 'SBCE Linkage'],
          milestones: [
            {
              date: '2024-10-08',
              event:
                'Law 14.993/2024 enacted: ANP authority, 30-year authorisations, EOR excluded from the CCS track.',
            },
            {
              date: '2024-12-19',
              event:
                'ANP Resolution 859/2024 opened pilot-project experimental regulation with an internal CCS standard.',
            },
            {
              date: '2024-12-11',
              event:
                'SBCE Law 15.042/2024 created the regulated carbon market the storage track would later link into.',
            },
            {
              date: '2026-08-13',
              event:
                'Decree 13.095 regulated arts.26-29: six routes, SBCE linkage, guarantees, multi-user models.',
            },
          ],
        },
        regulatory: {
          pore_space_rights:
            'Authorisation-based access; ANP consults contracted exploration holders first.',
          liability_transfer:
            'Operator duties with audits and inspections; transfer terms per authorisation.',
          liability_period:
            'Monitoring, contingency and decommissioning duties for the authorisation life.',
          financial_assurance:
            'ANP-set financial guarantees covering capture, transport, storage, closure, monitoring.',
          permitting_lead_time:
            'Pilot experimental track for speed; definitive authorisation procedures with ANP.',
          co2_definition:
            'Captured CO2 for geological storage across six defined technology routes.',
          cross_border_rules:
            'Basin data public for area identification; cross-border posture undeveloped.',
        },
      },
      zh: {
        description:
          '巴西CCS由2024年10月8日第14.993号法（未来燃料法）管辖，ANP（国家石油天然气生物燃料局）发证监管（26-29条）：巴西公司/联合体、30年期可续、采收注入排除在CCS轨道外、运营商义务（监测应急计划、仪器校准、封存泄漏台账、审计检查）、盆地公共数据开放、ANP兼合成燃料与CCS监管。2024年12月19日859号决议开中试实验监管通道并设内部CCS标准。2026年8月13日13095号法令细化26-29条：六条技术路线（BECCS、BECCUS、CCS、CCUS、DACCS、DACCUS）、SBCE挂钩（第5条：封存算管制市场减排）、ANP发证加财务担保（第7条）、多用户共享设施商业模式（第10条）。2025年CNPE第07号决议把CCS列入石油研发优先主题。',
        scope:
          '巴西CCS监管：ANP发证监管、30年期、中试实验通道、六条技术路线、SBCE挂钩、多用户设施、研发优先。',
        tags: [
          '14.993号法',
          'ANP',
          '859号决议',
          '13095号法令',
          'SBCE挂钩',
          '30年许可',
        ],
        impactAnalysis: {
          economic:
            '30年可续许可加多用户设施模式加SBCE信用挂钩，把许可变成可融资的封存资产——巴西首个CCS收入架构。',
          technical:
            '六条技术路线（BECCS到DACCUS）加ANP定的资质转让流 acceptance 条件，统一生物化石大气碳的项目设计。',
          environmental:
            '运营商义务（监测应急、台账、审计）加环评许可保留加SBCE级计量，把2026年法令放在可核查包容里。',
        },
        evolution: {
          clusters: ['巴西CCS立法', 'ANP监管', 'SBCE挂钩'],
          milestones: [
            {
              date: '2024-10-08',
              event: '第14.993号法生效：ANP管辖、30年许可、采收排除出CCS轨道。',
            },
            {
              date: '2024-12-19',
              event: 'ANP 859号决议开中试实验监管通道并设内部CCS标准。',
            },
            {
              date: '2024-12-11',
              event: '第15.042号法创设SBCE管制碳市场，封存轨道日后挂入。',
            },
            {
              date: '2026-08-13',
              event:
                '13095号法令细化26-29条：六条路线、SBCE挂钩、担保、多用户模式。',
            },
          ],
        },
        regulatory: {
          pore_space_rights: '许可制准入；ANP先征询合同区块勘探权人。',
          liability_transfer: '运营商义务加审计检查；移交按许可条款。',
          liability_period: '许可期内的监测应急退役义务。',
          financial_assurance: 'ANP定的财务担保覆盖捕集运输封存关闭监测。',
          permitting_lead_time: '中试实验通道求快；正式发证程序走ANP。',
          co2_definition: '六条技术路线下地质封存的捕集二氧化碳。',
          cross_border_rules: '盆地数据公开供选区；跨境姿态未发展。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 80,
        label: 'Permit Security',
        evidence:
          'Thirty-year extendable authorisations with SBCE linkage and multi-user models give storage developers bankable tenure plus a credit revenue line.',
        citation: 'Law 14.993/2024 arts.26-29; Decree 13.095 (Aug 2026)',
      },
      market: {
        score: 80,
        label: 'Credit Readiness',
        evidence:
          'Article 5 SBCE linkage makes geological storage a regulated-market mitigation activity, connecting ANP authorisations to carbon-credit issuance criteria.',
        citation: 'Decree 13.095 Art.5; SBCE Law 15.042/2024',
      },
      mrv: {
        score: 85,
        label: 'Leakage Inventory',
        evidence:
          'Mandatory storage and leakage inventories with calibrated tools, monitoring plans and ANP audits anchor measurement in the authorisation itself.',
        citation: 'Law 14.993/2024 art.29',
      },
      statutory: {
        score: 95,
        label: 'Agency Oversight',
        evidence:
          'Single-regulator ANP authority (arts.26-28) with qualification, transfer and guarantee rulemaking plus Resolution 859 pilot track — the complete licensing ladder.',
        citation: 'Law 14.993/2024; ANP Resolution 859/2024',
      },
      strategic: {
        score: 90,
        label: 'Fuel-of-Future Pillar',
        evidence:
          'CCS inside the Fuel of the Future Act beside SAF, green diesel and biomethane programmes makes storage part of Brazil fuel decarbonisation, not an orphan technology.',
        citation: 'Law 14.993/2024',
      },
    },
  },
  {
    id: 'br-bill-1425-2022',
    core: {
      status: 'Upcoming',
      category: 'Regulatory',
      legalWeight: 'Proposed Legislation',
    },
    i18n: {
      en: {
        description:
          'PL 1425/2022 (Senator Jean-Paul Prates) proposed permanent-or-temporary CO2 storage rules and passed Senate committee to the Chamber of Deputies in September 2023 — but legislative history overtook it: the ANP April 2024/February 2025 implementation report analysed three competing bills (PL 1425/2022, PL 4196/2023, PL 4516/2023 Fuel of the Future), and the executive bill won through as Law 14.993/2024 (October 2024) with Decree 13.095 (August 2026) regulating the substance PL 1425 sought to cover. The bill remains a proposal (formal archival unverified, hence Upcoming retained), but its operative content now lives in the enacted Fuel of the Future track. Read this record as legislative archaeology: the road not taken, with the destination reached by another vehicle.',
        scope:
          'Brazilian legislative history: PL 1425/2022 storage proposal, Senate committee passage 2023, three-bill competition, supersession-by-substance via Law 14.993/2024.',
        tags: [
          'PL 1425/2022',
          'legislative history',
          'superseded substance',
          'Law 14.993',
          'Senate committee',
          'archaeology record',
        ],
        impactAnalysis: {
          economic:
            'As a proposal the bill moves no money, but its committee passage signalled legislative demand that the enacted law converted into 30-year authorisations and SBCE linkage.',
          technical:
            'The bill permanent-or-temporary storage framing survives inside Decree 13.095 six technology routes — the technical substance outlived its vehicle.',
          environmental:
            'No independent environmental effect; the containment duties the bill imagined now bind through Law 14.993 operator obligations and ANP audits.',
        },
        evolution: {
          clusters: [
            'Brazil Bills Competition',
            'ANP Implementation Report',
            'Law 14.993 Enactment',
          ],
          milestones: [
            {
              date: '2022-01-01',
              event:
                'PL 1425/2022 tabled for permanent-or-temporary CO2 storage rules.',
            },
            {
              date: '2023-09-01',
              event:
                'Senate committee approved the bill to the Chamber of Deputies.',
            },
            {
              date: '2024-04-25',
              event:
                'The ANP implementation report compared three competing bills and recommended the pilot-regulation path.',
            },
            {
              date: '2024-10-08',
              event:
                'Law 14.993/2024 enacted the substance via the executive bill; PL 1425 operative content absorbed.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          'PL 1425/2022（Jean-Paul Prates参议员）拟规范二氧化碳永久或临时封存，2023年9月过参议院委员会送众议院——但立法史超了车：ANP 2024年4月/2025年2月实施报告比较了三个竞争法案（1425、4196/2023、4516/2023未来燃料），行政法案胜出成2024年10月第14.993号法，2026年8月13095号法令细化了1425想管的实质。该法案仍是提案（正式归档未核实，故保留Upcoming），但操作内容已活在未来燃料轨道里。这条记录读作立法考古：没走的那条路，终点被另一辆车开到了；后来者读巴西CCS监管，必须同时读这条和14.993号那条。',
        scope:
          '巴西立法史：PL 1425/2022封存提案、2023年参议院委员会通过、三法案竞争、实质被14.993号法吸收。',
        tags: [
          'PL1425',
          '立法史',
          '实质被吸收',
          '14.993号法',
          '参议院委员会',
          '考古记录',
        ],
        impactAnalysis: {
          economic:
            '提案本身不花钱，但委员会通过释放的立法需求被成法转成30年许可与SBCE挂钩；没有这次施压，行政法案未必跑这么快。',
          technical:
            '法案永久或临时封存框架活在13095号法令六条技术路线里——技术实质比载体长寿，路线定义几乎原样迁移。',
          environmental:
            '无独立环境效力；法案设想的包容义务经14.993号运营商义务与ANP审计生效，环境约束换了个法号活下来。',
        },
        evolution: {
          clusters: ['巴西法案竞争', 'ANP实施报告', '14.993号立法'],
          milestones: [
            {
              date: '2022-01-01',
              event: 'PL 1425/2022提交，拟规范永久或临时封存。',
            },
            {
              date: '2023-09-01',
              event: '参议院委员会通过送众议院。',
            },
            {
              date: '2024-04-25',
              event: 'ANP实施报告比较三法案并推荐中试监管路径。',
            },
            {
              date: '2024-10-08',
              event: '第14.993号法经行政法案生效，1425操作内容被吸收。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 60,
        label: 'Demand Signal Only',
        evidence:
          'Committee passage signalled demand that Law 14.993 converted into authorisations; the bill itself moves no money.',
        citation: 'Senate committee record (Sep 2023); Law 14.993/2024',
      },
      market: {
        score: 60,
        label: 'Absorbed Design',
        evidence:
          'Multi-user and authorisation design elements reappear in Decree 13.095 Article 10 — the market architecture migrated vehicles.',
        citation: 'Decree 13.095 Art.10 (Aug 2026)',
      },
      mrv: {
        score: 65,
        label: 'Inherited Duties',
        evidence:
          'Inventory and audit concepts from the bill debate now bind through Law 14.993 Article 29 operator duties.',
        citation: 'Law 14.993/2024 art.29',
      },
      statutory: {
        score: 70,
        label: 'Bill Under Consideration',
        evidence:
          'A proposal with committee passage and three-bill competition history, honestly labelled Upcoming with substance enacted elsewhere.',
        citation: 'ANP implementation report (Apr 2024/Feb 2025)',
      },
      strategic: {
        score: 75,
        label: 'Archaeology Value',
        evidence:
          'Documents the legislative road not taken — essential context for why Brazil regulates through ANP authorisation rather than a standalone storage act.',
        citation: 'Legislative record PL 1425/2022',
      },
    },
  },
  {
    id: 'co-ccus-regulatory-decree-2025',
    core: {
      status: 'Under development',
      category: 'Regulatory',
      legalWeight: 'Decree',
    },
    i18n: {
      en: {
        description:
          'The MinEnergía draft decree (citizen-participation text) would partially regulate Law 2099 articles 22/57 plus PND Law 2294/2023 article 264, adding Title VIII to Decree 1073/2015 for viable, environmentally safe CCUS: MME plus Environment Ministry technical regulations for injection and permanent storage (with Colombian Geological Service, ANH, ANM and ANLA inputs), CCUS as a Res.1447/2018 mitigation initiative, a CICUAC research centre via SGC/ANH/ANM, pilot-enabling technical characteristics, a sandbox for innovative business models, and MRV alignment. Until gazetted, this remains a draft: the honest status is Under development, with Law 2099 plus the PND mandate as the binding base and Llanos/Caribbean basin potential (EOR plus offshore) as the geological prize. Promulgation would convert the title into operative permitting; today it is the most detailed available statement of intent.',
        scope:
          'Colombian CCUS regulation in draft: Title VIII storage rules, technical injection regulations, CICUAC research centre, pilot characteristics, regulatory sandbox, Res.1447 MRV alignment.',
        tags: [
          'draft decree',
          'Title VIII',
          'Law 2099',
          'CICUAC',
          'sandbox',
          'Res.1447 MRV',
        ],
        impactAnalysis: {
          economic:
            'Gazetted, the title would unlock FENOGE/FNCE-adjacent finance channels for pilots; as a draft it prices regulatory risk into every Colombian storage conversation.',
          technical:
            'Named technical regulations (injection, permanent storage) with SGC/ANH/ANM/ANLA inputs plus a research centre give the engineering preconditions a drafted — not yet binding — home.',
          environmental:
            'Res.1447 mitigation-initiative status with MRV alignment pre-commits future storage to the environment ministry measurement spine.',
        },
        evolution: {
          clusters: ['Law 2099 Mandate', 'PND 2022-2026', 'Title VIII Draft'],
          milestones: [
            {
              date: '2021-07-10',
              event:
                'Law 2099 mandated CCUS regulation (arts.22/57) with tax benefits and net-zero MRV.',
            },
            {
              date: '2023-01-01',
              event:
                'PND Law 2294/2023 article 264 amended the CCUS definition and mandate scope.',
            },
            {
              date: '2025-01-01',
              event:
                'MinEnergía published the draft Title VIII decree for citizen participation (technical rules, CICUAC, sandbox, pilots).',
            },
          ],
        },
        regulatory: {
          pore_space_rights:
            'State-owned subsoil (Constitution); draft Title VIII storage rules pending gazette.',
          liability_transfer:
            'To be set in technical regulations with ANH/ANM/ANLA inputs; not yet codified.',
          liability_period:
            'Monitoring duties reference Res.1447; durations await the technical rules.',
          financial_assurance:
            'FENOGE-adjacent channels plus Law 2099 tax benefits once pilots qualify.',
          permitting_lead_time:
            'Pilot characteristics and sandbox defined in draft; timelines uncodified.',
          co2_definition:
            'Law 2099 art.22 (as amended by PND art.264): large-scale capture for safe permanent storage or productive use.',
          cross_border_rules:
            'Caribbean-basin potential noted; no bilateral storage posture published.',
        },
      },
      zh: {
        description:
          '能源矿产部法令草案（公民参与文本）拟部分细化2099号法22/57条加2022-2026国家发展计划2294号法264条，在1073/2015号法令中加第八编，要求CCUS可行且环境安全：能矿部加环境部定注入与永久封存技术规则（听地质局、油气矿业矿管局、环评局意见），CCUS算1447号决议减排行动，地质局/油气/矿业三方建CICUAC研究中心，定中试技术特征，开创新商业模式沙盒，对齐MRV。正式颁布前这都是草案：诚实状态是Under development，有约束力的是2099号法加国家发展计划授权，地质奖品是亚诺斯与加勒比盆地（采收加海上）。颁布则第八编变操作许可，今天它是意图最详细的书面表达。',
        scope:
          '哥伦比亚CCUS监管草案中：第八编封存规则、注入技术规则、CICUAC研究中心、中试特征、监管沙盒、1447号MRV对齐。',
        tags: ['法令草案', '第八编', '2099号法', 'CICUAC', '沙盒', '1447号MRV'],
        impactAnalysis: {
          economic:
            '一旦颁布，第八编解锁中试的FENOGE及非传统能源相邻资金通道；作为草案，它给每个哥伦比亚封存对话定价了监管风险。',
          technical:
            '点名的技术规则（注入、永久封存）加三局一署输入加研究中心，给工程前置条件一个起草好、还没约束力的家。',
          environmental:
            '1447号减排行动定位加MRV对齐，预把未来封存绑上环境部计量脊柱；草案一日不颁布，这条环境承诺就一日停留在纸面。',
        },
        evolution: {
          clusters: ['2099号法授权', '2022-2026国家发展计划', '第八编草案'],
          milestones: [
            {
              date: '2021-07-10',
              event: '2099号法授权CCUS监管（22/57条），带税收优惠与净零MRV。',
            },
            {
              date: '2023-01-01',
              event: '2294号法264条修订CCUS定义与授权范围。',
            },
            {
              date: '2025-01-01',
              event:
                '能矿部公布第八编草案公民参与（技术规则、CICUAC、沙盒、中试）。',
            },
          ],
        },
        regulatory: {
          pore_space_rights: '国有地下（宪法）；第八编草案封存规则待颁布。',
          liability_transfer:
            '待技术规则定，听油气矿业环评三局意见；尚未法典化。',
          liability_period: '监测义务援引1447号；期限待技术规则。',
          financial_assurance: '中试合格后FENOGE相邻通道加2099号税收优惠。',
          permitting_lead_time: '草案定中试特征与沙盒；时间表未法典化。',
          co2_definition:
            '2099号法22条（2294号264条修订）：大规模捕集、安全永久封存或生产利用。',
          cross_border_rules: '加勒比盆地潜力已注记；无双边封存姿态发布。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 70,
        label: 'Pilot Finance Path',
        evidence:
          'FENOGE-adjacent channels plus Law 2099 tax benefits (ET 255/424, Ley 1715) open once pilots qualify under the title — finance gated on gazette, not absent.',
        citation: 'Draft Title VIII; Law 2099 art.22 par.2',
      },
      market: {
        score: 70,
        label: 'Sandbox Design',
        evidence:
          'A defined regulatory sandbox for innovative CCUS business models plus multi-user-friendly title design pre-builds market entry ahead of first storage.',
        citation: 'Draft Title VIII art.2.2.8.2.5',
      },
      mrv: {
        score: 80,
        label: 'Res.1447 Spine',
        evidence:
          'CCUS initiatives classified as Res.1447 mitigation actions inherit the environment ministry measurement, reporting and verification spine from day one.',
        citation: 'Draft Title VIII art.2.2.8.1.1/2.2.8.2.6',
      },
      statutory: {
        score: 80,
        label: 'Law Plus Draft',
        evidence:
          'Binding Law 2099/PND mandate with a published draft title and named technical regulators — one gazette away from an operative regime.',
        citation: 'Law 2099/2021; PND Law 2294/2023',
      },
      strategic: {
        score: 85,
        label: 'Basin Prize Framed',
        evidence:
          'Llanos and Caribbean basin potential (EOR plus offshore) framed inside a just-transition narrative makes the draft the gateway document for Colombian storage scale.',
        citation: 'Draft Title VIII recitals; PND 2022-2026',
      },
    },
  },
  {
    id: 'co-law-2099-energy-transition',
    core: {
      status: 'Active',
      category: 'Incentive',
      legalWeight: 'Primary Legislation',
    },
    i18n: {
      en: {
        description:
          'Law 2099 of 2021 (July 10, energy transition, market dynamisation, economic reactivation) carries CCUS in three load-bearing articles: art.21 promotes green/blue hydrogen with full Ley 1715 benefits and FENOGE finance; art.22 orders the government to regulate CCUS promotion and development (definition amended by PND Law 2294/2023 art.264: large-scale capture for safe permanent storage or productive use, with MME subsurface-storage regulation for all sectors); art.57 demands objective transparent measurement methodologies guaranteeing net-zero balance for hydrogen and CCUS under the Paris NDC. The money is in art.22 par.2: income-tax discount (ET art.255), VAT exclusion (ET art.424.16), accelerated depreciation (Ley 1715 art.14) — conditioned on National GHG Reduction Registry inscription plus UPME certification. Art.24 lets ANH/ANM reconvert mining-hydrocarbon projects with CCUS. This is the binding base the draft Title VIII decree would execute.',
        scope:
          'Colombian energy transition law: hydrogen promotion, CCUS regulation mandate with amended definition, net-zero MRV mandate, 1715/ET tax benefits with UPME certification, mining-hydrocarbon reconversion.',
        tags: [
          'Law 2099',
          'articles 21/22/57',
          'UPME certification',
          'FENOGE',
          'tax benefits',
          'PND amendment',
        ],
        impactAnalysis: {
          economic:
            'Income-tax discount with VAT exclusion and accelerated depreciation, once UPME-certified and registry-inscribed, is the operative Colombian CCS incentive — narrower than a credit, but enacted and claimable.',
          technical:
            'The art.24 reconversion mandate pushes CCUS into live mining-hydrocarbon contracts via ANH/ANM mechanisms, grafting capture onto producing assets.',
          environmental:
            'Art.57 net-zero-balance methodologies with transparent measurement tie every benefit to Paris-NDC compliance, not to installed equipment alone.',
        },
        evolution: {
          clusters: [
            'Law 2099 Enactment',
            'PND Amendment',
            'Title VIII Execution',
          ],
          milestones: [
            {
              date: '2021-07-10',
              event:
                'Law 2099 enacted with hydrogen/CCUS promotion, tax benefits and net-zero MRV mandates.',
            },
            {
              date: '2023-01-01',
              event:
                'PND Law 2294/2023 art.264 amended the CCUS definition and extended the MME regulation mandate.',
            },
            {
              date: '2025-01-01',
              event:
                'Draft Title VIII decree published to execute arts.22/57 (technical rules, CICUAC, sandbox).',
            },
          ],
        },
        regulatory: {
          pore_space_rights:
            'State-owned subsoil; MME subsurface-storage regulation for all sectors (art.22).',
          liability_transfer:
            'Via forthcoming technical regulations under the draft Title VIII track.',
          liability_period:
            'Net-zero-balance measurement horizons per art.57 methodologies (pending).',
          financial_assurance:
            'FENOGE channels plus art.255/424 and Ley 1715 benefits with UPME certification.',
          permitting_lead_time:
            'Reconversion mechanisms in live contracts (art.24) shorten greenfield permitting.',
          co2_definition:
            'Large-scale capture for safe permanent storage or productive use (PND-amended art.22).',
          cross_border_rules: 'No bilateral storage posture published.',
        },
      },
      zh: {
        description:
          '2021年7月10日第2099号法（能源转型、市场搞活、经济重启）三条承重条款带CCUS：21条推绿氢蓝氢（全套1715号法优惠加FENOGE融资），22条命令政府定CCUS促进发展规章（定义经2294号法264条修订：大规模捕集、安全永久封存或生产利用，能矿部定全行业地下封存规章），57条要求客观透明计量方法保证氢与CCUS净零平衡（巴黎NDC）。钱在22条第2款：所得税抵扣（税法典255条）、增值税排除（424条16款）、加速折旧（1715号法14条）——条件是国家温室气体减排登记加UPME认证。24条让油气矿管局在现合同里搞矿业油气项目转型加CCUS。这就是第八编草案要执行的有约束力底座。',
        scope:
          '哥伦比亚能源转型法：氢推广、CCUS监管授权与修订定义、净零MRV授权、1715/税法典税收优惠加UPME认证、矿业油气转型。',
        tags: [
          '2099号法',
          '21/22/57条',
          'UPME认证',
          'FENOGE',
          '税收优惠',
          '国家发展计划修订',
        ],
        impactAnalysis: {
          economic:
            'UPME认证加登记后的所得税抵扣、增值税排除与加速折旧，是哥伦比亚可操作CCS激励——比抵免窄，但已生效可领。',
          technical:
            '24条转型授权把CCUS推进活矿业油气合同（油气矿管局机制），给在产资产嫁接捕集。',
          environmental:
            '57条净零平衡计量把每项优惠绑在巴黎NDC合规上，不只看装了设备；拿不到UPME认证的减排量，一分钱优惠也兑现不了。',
        },
        evolution: {
          clusters: ['2099号法生效', '国家发展计划修订', '第八编执行'],
          milestones: [
            {
              date: '2021-07-10',
              event: '2099号法生效，氢/CCUS促进、税收优惠、净零MRV授权齐备。',
            },
            {
              date: '2023-01-01',
              event: '2294号法264条修订CCUS定义并扩展能矿部规章授权。',
            },
            {
              date: '2025-01-01',
              event: '第八编草案公布，执行22/57条（技术规则、CICUAC、沙盒）。',
            },
          ],
        },
        regulatory: {
          pore_space_rights: '国有地下；能矿部定全行业地下封存规章（22条）。',
          liability_transfer: '走第八编草案轨道的技术规则定；待定。',
          liability_period: '57条净零平衡计量期限（待定）。',
          financial_assurance:
            'FENOGE通道加255/424条与1715号优惠，UPME认证后领。',
          permitting_lead_time: '现合同转型机制（24条）缩短绿地审批。',
          co2_definition:
            '大规模捕集、安全永久封存或生产利用（国家发展计划修订的22条）。',
          cross_border_rules: '无双边封存姿态发布。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 85,
        label: 'Certified Tax Benefits',
        evidence:
          'Income-tax discount (ET 255), VAT exclusion (ET 424.16) and accelerated depreciation (Ley 1715 art.14) with UPME certification and registry inscription — claimable, not aspirational.',
        citation: 'Law 2099 art.22 par.2; CRA gestora record',
      },
      market: {
        score: 75,
        label: 'Hydrogen Market Pull',
        evidence:
          'Green/blue hydrogen promotion with FENOGE finance and full Ley 1715 benefits pulls CCUS through the hydrogen value chain it enables.',
        citation: 'Law 2099 arts.21/24',
      },
      mrv: {
        score: 75,
        label: 'Certification Required',
        evidence:
          'UPME certification plus National GHG Reduction Registry inscription gate every benefit, with art.57 net-zero-balance methodologies as the measurement backstop.',
        citation: 'Law 2099 arts.22/57',
      },
      statutory: {
        score: 85,
        label: 'National Legal Base',
        evidence:
          'Primary legislation with three load-bearing CCUS articles, PND-amended definitions and a draft execution title — the binding base Title VIII would operate.',
        citation: 'Law 2099/2021; PND Law 2294/2023',
      },
      strategic: {
        score: 85,
        label: 'Just-Transition Framing',
        evidence:
          'CCUS framed as just-transition leverage inside the 2022-2026 National Development Plan, with mining-hydrocarbon reconversion as the delivery vehicle.',
        citation: 'PND 2022-2026; Law 2099 art.24',
      },
    },
  },
  {
    id: 'cl-green-hydrogen-ccs-2025',
    core: {
      status: 'Active',
      category: 'Strategic',
      legalWeight: 'Strategic Guidance',
    },
    i18n: {
      en: {
        description:
          'Chile Green Hydrogen Action Plan 2023-2030 (Supreme Decree 76/2024, October 17, 2024) is the operative state policy for H2V and derivatives: participatory build (1,147 people, five instances, 1,900+ consultation inputs), two windows (2023-2026 investment signals and rules with ammonia tilt; 2026-2030 productive deployment with regional accent), Magallanes/Antofagasta as Hydrogen Valleys with ENAP coordinating aggregated demand and the Laredo terminal reconfiguration. The CCUS touchpoint is synthetic fuels: the IDB Magallanes prefeasibility study recommends green-H2-plus-CO2 methanol (DAC or unavoidable-source CCU), finding even optimistic LCOM double fossil methanol — hence the call for carbon markets, concessional finance and stronger regulation. Chile has no dedicated CCS storage statute; the record honest frame is H2V-led with CCU-for-efuels as the carbon-management interface.',
        scope:
          'Chile green hydrogen action to 2030: state H2V policy with regional valleys, ENAP coordination, synthetic-fuel CCU interface, investment-signal window, regulatory-enablement track.',
        tags: [
          'Green H2 Action Plan',
          'Magallanes',
          'Antofagasta',
          'e-fuels CCU',
          'Haru Oni',
          'no CCS statute',
        ],
        impactAnalysis: {
          economic:
            'State-backed valleys with land concessions (Calama 13 ha, Primavera/Tocopilla ~300 MW electrolysis) plus carbon-market and concessional-finance calls de-risk early H2V, with CCU economics explicitly flagged as gap-funded.',
          technical:
            'ENAP terminal reconfiguration with shared logistics planning (ports plan) gives e-fuel projects the physical aggregation the IDB study says methanol economics needs.',
          environmental:
            'Sustainability analysis embedded in plan methodology with biodiversity baselines (Magallanes DPS programme) keeps valley buildout inside environmental review from the start.',
        },
        evolution: {
          clusters: [
            'Chile H2V Policy',
            'Magallanes Valleys',
            'E-fuels Interface',
          ],
          milestones: [
            {
              date: '2020-03-01',
              event:
                'National Green Hydrogen Strategy published, opening the H2V decade.',
            },
            {
              date: '2022-03-28',
              event:
                'IDB Magallanes e-fuel prefeasibility recommended green-H2-plus-CO2 methanol with DAC-or-CCU sourcing.',
            },
            {
              date: '2024-10-17',
              event:
                'Supreme Decree 76/2024 formalised the 2023-2030 Action Plan with two implementation windows.',
            },
          ],
        },
        regulatory: {
          pore_space_rights:
            'State-owned subsurface; no CCS-specific storage licensing track exists.',
          liability_transfer:
            'No CCS liability regime codified; hydrogen/CCS cluster rules pending.',
          liability_period:
            'Uncodified; EIA Law 19.300 project review applies generally.',
          financial_assurance:
            'No CCS-dedicated assurance; DPS programme and state land concessions support H2V.',
          permitting_lead_time:
            'Multi-agency energy permitting; H2V valleys coordinate but do not shortcut review.',
          co2_definition:
            'E-fuel feedstock (unavoidable-source CCU preferred over DAC per IDB study).',
          cross_border_rules:
            'Asian methanol offtake strategy (Tokyo/Seoul/Beijing/Shanghai/HK routes noted).',
        },
      },
      zh: {
        description:
          '智利绿氢行动计划2023-2030（2024年第76号最高法令，10月17日）是H2V及衍生品的现行国家政策：参与式制定（1147人、五轨、1900余条咨询意见），两扇窗（2023-2026投资信号与规则、偏氨；2026-2030生产部署、偏区域），麦哲伦/安托法加斯塔为氢谷，ENAP统筹归集需求并改造Laredo终端。CCUS触点是合成燃料：泛美开发银行麦哲伦可研推荐绿氢加二氧化碳制甲醇（DAC或 unavoidable 源CCU），即便乐观LCOM仍两倍于化石甲醇——故呼吁碳市场、优惠融资与更强监管。智利无专门CCS封存法；诚实定位是氢领衔、合成燃料CCU为碳管理接口。',
        scope:
          '智利到2030年绿氢行动：国家H2V政策加区域氢谷、ENAP统筹、合成燃料CCU接口、投资信号窗口、监管赋能轨道。',
        tags: [
          '绿氢行动计划',
          '麦哲伦',
          '安托法加斯塔',
          '合成燃料CCU',
          'Haru Oni',
          '无CCS单行法',
        ],
        impactAnalysis: {
          economic:
            '国家背书氢谷加土地特许（卡拉马13公顷、普里马维拉/托科皮亚约300兆瓦电解）给早期H2V垫资，CCU经济性明确定位缺口资助。',
          technical:
            'ENAP终端改造加共享物流规划（港口计划）给合成燃料项目IDB研究说的物理归集——甲醇经济性要的就是这个。',
          environmental:
            '计划方法论内嵌可持续性分析加生物多样性基线（麦哲伦DPS项目），氢谷建设从第一天起就在环评里。',
        },
        evolution: {
          clusters: ['智利绿氢政策', '麦哲伦氢谷', '合成燃料接口'],
          milestones: [
            {
              date: '2020-03-01',
              event: '国家绿氢战略发布，开启H2V十年。',
            },
            {
              date: '2022-03-28',
              event:
                '泛美开发银行麦哲伦合成燃料可研推荐绿氢加二氧化碳制甲醇（DAC或CCU）。',
            },
            {
              date: '2024-10-17',
              event: '第76号最高法令正式确立2023-2030行动计划，开两扇实施窗。',
            },
          ],
        },
        regulatory: {
          pore_space_rights: '国有地下；无CCS专门封存许可轨道。',
          liability_transfer: '无CCS责任制度法典化；氢/CCS集群规则待定。',
          liability_period: '未法典化；19.300号环评法项目审查一般适用。',
          financial_assurance: '无CCS专用担保；DPS计划与国有土地特许支撑H2V。',
          permitting_lead_time: '多部门能源审批；氢谷协调不走捷径。',
          co2_definition:
            '合成燃料原料（按IDB研究 unavoidable 源CCU优先于DAC）。',
          cross_border_rules:
            '亚洲甲醇承购战略（东京/首尔/北京/上海/香港路线已注记）。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 70,
        label: 'Valley De-risking',
        evidence:
          'State land concessions with DPS programme backing andabloom valley coordination de-risk early H2V, with the IDB study explicitly calling gap funding for the CCU cost delta.',
        citation:
          'H2V Action Plan boost measures (2023); IDB CH-T1235 study (2022)',
      },
      market: {
        score: 70,
        label: 'E-fuels Offtake',
        evidence:
          'Asian methanol offtake strategy with existing Punta Arenas export routes plus Haru Oni first-mover proof gives e-fuels (and their CO2 sourcing) a demand horizon.',
        citation: 'IDB CH-T1235 study (2022)',
      },
      mrv: {
        score: 75,
        label: 'Sustainability Analysis',
        evidence:
          'Plan-embedded sustainability analysis with Magallanes biodiversity baselines and EIA Law 19.300 project review keeps valley buildout inside measured environmental bounds.',
        citation: 'H2V Action Plan methodology; Law 19.300',
      },
      statutory: {
        score: 75,
        label: 'Decree Formalisation',
        evidence:
          'Supreme Decree 76/2024 formalising a participatory 2023-2030 plan gives H2V state-policy rank; CCS-specific storage statute remains the stated gap.',
        citation: 'Supreme Decree 76/2024',
      },
      strategic: {
        score: 85,
        label: 'H2V-Led Interface',
        evidence:
          'H2V valleys with ENAP aggregation and e-fuel CCU as the carbon interface make Chile green-molecule exporter first, CCS jurisdiction second — sequenced honestly.',
        citation: 'H2V Action Plan 2023-2030',
      },
    },
  },
  {
    id: 'mx-sener-ccus-2025',
    core: {
      status: 'Active',
      category: 'Strategic',
      legalWeight: 'Executive Order/Framework',
    },
    i18n: {
      en: {
        description:
          'Mexico CCUS runs on revival momentum: a 2010-2018 programme (storage atlas in the North American atlas, CCUS-TRM roadmap with UNAM/IPN, Poza Rica capture plus Brillante EOR pilots, INEEL centre of excellence, World Bank support) paused with the 2018 presidency change, survived via the MeCCS virtual platform (2021), and restarted under President Sheinbaum — physicist, IPCC AR4/SR1.5 co-author — through the May 8, 2025 Carbon Visions MX event at UNAM where SENER (DG Adrián Ruiz) set the 2025 direction: 35% by 2030 needs CCUS, with a legal framework plus CCS clusters by 2027, R&D strengthening, ETS-mobilised finance, and international cooperation. Industry shows up: PEMEX (CO2-EOR interest, gas-plant CCS pilots, CCS-as-service ambition), CEMEX (net zero 2050, EU Innovation Fund cement plant, Knoxville test facility via US DOE), Ternium (green steel market). Direction set, statute pending — the honest status of a restart year.',
        scope:
          'Mexico CCUS revival: SENER 2025 direction (35% 2030, framework plus clusters by 2027), PEMEX/CFE state vehicles, CEMEX/Ternium industry pull, ETS finance track, 2010-18 legacy plus MeCCS continuity.',
        tags: [
          'Carbon Visions MX',
          'SENER direction',
          '35% 2030',
          'clusters by 2027',
          'PEMEX pilots',
          'MeCCS continuity',
        ],
        impactAnalysis: {
          economic:
            'ETS-mobilised finance named as the funding route avoids inventing a subsidy scheme from scratch, while PEMEX/CFE balance sheets offer state-vehicle delivery if the framework lands.',
          technical:
            'The 2010-18 legacy (atlas, TRM, three critical studies, Poza Rica/Brillante pilot designs) means revival starts from surveyed geology and trained people, not zero.',
          environmental:
            'Sheinbaum scientific credibility plus UNAM hosting frames the restart inside evidence culture — the process legitimacy thatEl Chichón-era oil politics never had.',
        },
        evolution: {
          clusters: [
            'Mexico CCUS Legacy',
            'MeCCS Continuity',
            'Sheinbaum Restart',
          ],
          milestones: [
            {
              date: '2018-01-01',
              event:
                'A decade of CCUS work (atlas, TRM, pilots, INEEL centre) paused with the presidency change.',
            },
            {
              date: '2021-01-01',
              event:
                'The MeCCS virtual platform kept momentum alive through the pause years.',
            },
            {
              date: '2025-05-08',
              event:
                'Carbon Visions MX at UNAM: SENER set 35%-by-2030 direction with framework-plus-clusters-by-2027 plan.',
            },
          ],
        },
        regulatory: {
          pore_space_rights:
            'Hydrocarbon-law tenure; dedicated storage rights await the promised framework.',
          liability_transfer:
            'Uncodified; EOR-adjacent practice under PEMEX operations only.',
          liability_period: 'Uncodified.',
          financial_assurance:
            'ETS-mobilised finance named; no dedicated assurance instrument exists.',
          permitting_lead_time:
            'Cluster-based permitting targeted by 2027 under SENER direction.',
          co2_definition:
            'Industrial decarbonisation stream with PEMEX/CFE state-vehicle focus.',
          cross_border_rules:
            'International cooperation and technology transfer named; no bilateral posture.',
        },
      },
      zh: {
        description:
          '墨西哥CCUS靠重启动量运转：2010-2018年计划（北美图集封存评价、UNAM/IPN的CCUS-TRM路线图、Poza Rica捕集加Brillante采收中试、INEEL卓越中心、世行支持）随2018年总统换届暂停，靠MeCCS虚拟平台（2021年）续命，在Sheinbaum总统（物理学家、IPCC报告作者之一）任内重启——2025年5月8日UNAM的Carbon Visions MX会上能源部（Adrián Ruiz司长）定2025年方向：2030年35%需要CCUS，法律框架加2027年前CCS集群、研发加强、ETS融资动员、国际合作。产业到场：PEMEX（采收兴趣、气厂CCS中试、CCS即服务 ambition）、CEMEX（2050净零、欧盟创新基金水泥厂、美国能源部诺克斯维尔试验设施）、Ternium（绿钢市场）。方向已定，法律待立——重启之年的诚实状态。',
        scope:
          '墨西哥CCUS重启：能源部2025年方向（2030年35%、框架加2027年前集群）、PEMEX/CFE国企载体、CEMEX/Ternium产业拉动、ETS融资轨道、2010-18遗产加MeCCS延续。',
        tags: [
          'Carbon Visions MX',
          '能源部方向',
          '2030年35%',
          '2027年前集群',
          'PEMEX中试',
          'MeCCS延续',
        ],
        impactAnalysis: {
          economic:
            '点名ETS动员融资，避免从零编补贴剧本；PEMEX/CFE资产负债表提供国企交付载体——如果框架落地。',
          technical:
            '2010-18遗产（图集、路线图、三项关键研究、Poza Rica/Brillante中试设计）意味着重启从勘测过的地质与培训过的人开始，而非从零。',
          environmental:
            'Sheinbaum科学信誉加UNAM主办把重启框在证据文化里——这是石油政治时代从没有的过程合法性。',
        },
        evolution: {
          clusters: ['墨西哥CCUS遗产', 'MeCCS延续', 'Sheinbaum重启'],
          milestones: [
            {
              date: '2018-01-01',
              event:
                '十年CCUS工作（图集、路线图、中试、INEEL中心）随总统换届暂停。',
            },
            {
              date: '2021-01-01',
              event: 'MeCCS虚拟平台在暂停年份续住动量。',
            },
            {
              date: '2025-05-08',
              event:
                'UNAM Carbon Visions MX：能源部定2030年35%方向，框架加2027年前集群计划。',
            },
          ],
        },
        regulatory: {
          pore_space_rights: '油气法矿权；专门封存权等承诺的框架。',
          liability_transfer: '未法典化；仅PEMEX作业内的采收关联实践。',
          liability_period: '未法典化。',
          financial_assurance: '点名ETS动员融资；无专门担保工具。',
          permitting_lead_time: '能源部方向下2027年前集群许可为目标。',
          co2_definition: '工业脱碳流，PEMEX/CFE国企载体聚焦。',
          cross_border_rules: '点名国际合作与技术转让；无双边姿态。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 65,
        label: 'ETS Finance Naming',
        evidence:
          'ETS-mobilised finance named as the funding route with CEMEX and Ternium industrial pull — direction without disbursement so far.',
        citation: 'Carbon Visions MX record (May 2025)',
      },
      market: {
        score: 70,
        label: 'State-Vehicle Plus Industry',
        evidence:
          'PEMEX pilots with CCS-as-service ambition beside CEMEX and Ternium demand form a state-plus-industry market shape awaiting its statute.',
        citation: 'Carbon Visions MX industry panel (May 2025)',
      },
      mrv: {
        score: 70,
        label: 'Legacy Atlas Base',
        evidence:
          'The North American atlas storage assessment with SENER/CFE national-regional evaluation gives revival MRV a surveyed geological base.',
        citation: 'North American Storage Atlas; SENER/CFE assessment',
      },
      statutory: {
        score: 70,
        label: 'Framework Promised',
        evidence:
          'A promised legal framework with 2027 cluster targets under a scientifically credible presidency — the most advanced pre-statute position in Latin America.',
        citation: 'SENER direction via Carbon Visions MX (May 2025)',
      },
      strategic: {
        score: 85,
        label: 'Restart With Memory',
        evidence:
          'Restart from a real 2010-18 legacy (atlas, TRM, pilots, INEEL, trained cohorts) via MeCCS continuity — revival with institutional memory, not a false dawn.',
        citation: 'MeCCS platform record; SSRN implementation paper',
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

export function applyContentDepthBatch3G(db, { auditDate = AUDIT_DATE } = {}) {
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
    const summary = applyContentDepthBatch3G(db);
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
    console.error(`Content-depth batch 3G migration failed: ${error.message}`);
    process.exit(1);
  });
}

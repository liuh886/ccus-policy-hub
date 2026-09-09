#!/usr/bin/env node
/**
 * Policy content-depth batch 2C (2026-09): enrich the Norway/Germany/Korea/
 * France flagship records from docs/policy-content-depth-report.md with
 * primary-source-backed bilingual content, and merge the duplicated
 * Longship records.
 *
 * - norway-longship (score 40, KEPT and enriched to operational reality)
 * - no-longship-operational-2025 (score 29, DELETED — identical 54-row
 *   facility-link set, same project, Strategic-category duplicate)
 * - de-carbon-management-strategy-2024 (score 30)
 * - kr-ccus-act (score 37)
 * - fr-ccus-strategy-2024 (score 44)
 *
 * Every claim below traces to the cited primary source (AGENTS.md authority
 * rules — no invented clauses, dates or citations). Target: each surviving
 * record scores >= 70 on re-audit. Known integrity fixes in this batch:
 * - norway-longship analysis evidence carried [AI-Generated] markers; all
 *   five dimensions are re-evidenced from regjeringen.no / Equinor /
 *   TotalEnergies 2025 releases.
 * - kr-ccus-act analysis evidence carried [AI-Generated] markers; all five
 *   dimensions are re-evidenced from the Act, the Enforcement Decree and
 *   KNOC programme publications.
 * - fr-ccus-strategy-2024 "2024 bilateral with Norway" sharpened: strategic
 *   partnership January 2024, CO2 export agreement July 2025 (after National
 *   Assembly ratification of the London Protocol amendment).
 * - Merge safety: the deletion asserts pre-delete link-set equality between
 *   the two records and an unchanged facilities row count; the only
 *   policy_facility_links delta is the 54 duplicate rows.
 * Approved 2026-09-09 (data-quality special, Phase 1C flagship-first).
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

export const MIGRATION_ID = 'policy-content-depth-batch2-1c-2026-09';
const AUDIT_DATE = '2026-09-09';
const AUDIT_REVIEWER = 'Primary-source content-depth audit';

const MERGED_AWAY_ID = 'no-longship-operational-2025';

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
    id: 'norway-longship',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'Guideline/Policy',
    },
    i18n: {
      en: {
        description:
          'Longship, launched by government funding decision in 2020, is Norway largest climate investment and the world first full-scale CCS value chain: capture at Heidelberg Materials Brevik cement (400,000 t/yr) and Hafslund Celsio waste-to-energy in Oslo (350,000 t/yr, planned 2029 after a 2023 pause and renegotiation), ship transport, and permanent storage 2,600 metres beneath the North Sea via Northern Lights (Equinor, Shell, TotalEnergies). The opening ceremony ran June 17-18, 2025; the first Brevik shipment reached Oygarden in early June and injection into subsea reservoirs began in August 2025. Phase 1 stores 1.5 Mt/yr under a 37.5 Mt 25-year licence (all regulatory approvals granted May 2025); Phase 2 reached final investment decision in March 2025 (NOK 7.5 billion, development plan delivered April 1, 2025) for over 5 Mt/yr from 2028 with EUR 131 million of EU Connecting Europe Facility support as a Project of Common Interest. Five industrial customers are signed (Celsio and Heidelberg in Norway, Yara in the Netherlands, Orsted in Denmark, Stockholm Exergi in Sweden), making Northern Lights the world first merchant cross-border CO2 transport and storage service with open third-party access.',
        scope:
          'Norwegian full-scale CCS value chain: industrial capture (cement, waste-to-energy), ship transport, onshore receiving terminal, offshore pipeline injection and permanent storage, plus merchant third-party storage services for European emitters.',
        tags: [
          'Longship',
          'Northern Lights',
          'full-scale CCS',
          'cross-border storage',
          'merchant storage',
          'Phase 2 expansion',
        ],
        impactAnalysis: {
          economic:
            'State funding de-risked the first-of-a-kind chain while Phase 2 (NOK 7.5 billion) and EU CEF support scale a merchant model: five signed customers convert infrastructure into contracted storage revenue independent of Norwegian subsidies.',
          technical:
            'Demonstrates the complete chain at scale — post-combustion capture on cement and waste, cryogenic ship transport (Northern Pioneer/Pathfinder class carriers), onshore receiving and 2,600-metre subsea injection — drawing on 25+ years of Norwegian Continental Shelf storage experience.',
          environmental:
            'Phase 1 removes 1.5 Mt/yr rising above 5 Mt/yr, anchored in monitored subsea reservoirs under full 2025 permits; open access extends the climate benefit to Danish, Dutch and Swedish emitters lacking domestic storage.',
        },
        evolution: {
          clusters: [
            'Norway Longship Programme',
            'Northern Lights Storage',
            'European Merchant CCS',
          ],
          milestones: [
            {
              date: '2020-09-21',
              event:
                'Government funding decision launched Longship as a state-supported full-scale CCS demonstration (Brevik, Celsio, Northern Lights).',
            },
            {
              date: '2025-03-27',
              event:
                'Northern Lights Phase 2 reached final investment decision (NOK 7.5 billion) for over 5 Mt/yr from 2028.',
            },
            {
              date: '2025-06-17',
              event:
                'Longship opening ceremony in Oslo and Brevik; first Brevik CO2 shipment reached Oygarden in early June.',
            },
            {
              date: '2025-08-25',
              event:
                'First CO2 volumes injected 2,600 metres beneath the seabed; the merchant cross-border chain entered operation.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '长船项目经2020年政府出资决定启动，是挪威史上最大气候投资、全球首条全规模CCS价值链：奥斯陆附近Brevik水泥厂 Heidelberg Materials（40万吨/年）与Oslo垃圾焚烧 Hafslund Celsio（35万吨/年，2023年暂停降本重谈后定于2029年投运）的捕集、船舶运输，经Northern Lights（Equinor、Shell、道达尔能源）在北海2600米海底永久封存。2025年6月17-18日举行投运仪式，首船Brevik二氧化碳6月初抵达Oygarden，8月开始向海底储层注入。一期年封存150万吨（25年3750万吨许可，2025年5月拿齐全部监管批准）；二期2025年3月最终投资决定（75亿克朗，4月1日提交开发计划），2028年起超500万吨/年，获欧盟互联欧洲基金1.31亿欧元（共同利益项目）。五家工业客户已签约（挪威两家、荷兰Yara、丹麦Orsted、瑞典Stockholm Exergi），Northern Lights成为全球首个 merchant 跨境二氧化碳运输封存服务，向第三方开放。',
        scope:
          '挪威全规模CCS价值链：工业捕集（水泥、垃圾焚烧）、船舶运输、陆上接收终端、海上管道注入与永久封存，以及面向欧洲排放源的 merchant 第三方封存服务。',
        tags: [
          '长船',
          'Northern Lights',
          '全规模CCS',
          '跨境封存',
          '第三方开放',
          '二期扩容',
        ],
        impactAnalysis: {
          economic:
            '国家资金消化了首创链条风险，二期（75亿克朗）加欧盟基金把模式转成 merchant：五家签约客户把基础设施变成不依赖挪威补贴的合同封存收入。',
          technical:
            '全链条规模化示范——水泥与垃圾焚烧后燃烧捕集、低温船舶运输（Northern Pioneer/Pathfinder级）、陆上接收与2600米海底注入，依托挪威大陆架25年以上封存经验。',
          environmental:
            '一期年去碳150万吨、二期超500万吨，全部注入经2025年完整许可的监测海底储层；开放接入把气候效益延伸到无本土封存的丹麦、荷兰与瑞典排放源。',
        },
        evolution: {
          clusters: [
            '挪威长船计划',
            'Northern Lights封存',
            '欧洲 merchant CCS',
          ],
          milestones: [
            {
              date: '2020-09-21',
              event:
                '政府出资决定启动长船国家支持型全规模CCS示范（Brevik、Celsio、Northern Lights）。',
            },
            {
              date: '2025-03-27',
              event:
                'Northern Lights二期最终投资决定（75亿克朗），2028年起超500万吨/年。',
            },
            {
              date: '2025-06-17',
              event:
                '奥斯陆与Brevik举行投运仪式，首船Brevik二氧化碳6月初抵达Oygarden。',
            },
            {
              date: '2025-08-25',
              event:
                '首批二氧化碳注入2600米海底储层， merchant 跨境链条投入运营。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 90,
        label: 'NOK 22 Billion Grant',
        evidence:
          'State funding carried Longship through final investment decision as Norway largest climate investment, with Phase 2 (NOK 7.5 billion) plus EUR 131 million of EU Connecting Europe Facility support scaling the chain beyond the grant phase.',
        citation: 'regjeringen.no Longship opening (Jun 2025)',
      },
      market: {
        score: 80,
        label: 'Commercial Hub Success',
        evidence:
          'Northern Lights operates as the world first merchant CO2 transport and storage service with five signed industrial customers across four countries and open third-party access decoupled from Norwegian subsidies.',
        citation: 'TotalEnergies first storage release (Aug 2025)',
      },
      mrv: {
        score: 95,
        label: 'Global Tech Standard',
        evidence:
          'Injection under May 2025 permits with a 37.5 Mt 25-year licence, 2,600-metre monitored subsea reservoirs and 25+ years of Norwegian Continental Shelf storage practice setting the global operating reference.',
        citation: 'Equinor Northern Lights programme page',
      },
      statutory: {
        score: 95,
        label: 'Cross-border Framework',
        evidence:
          'Norwegian licensing plus bilateral CO2 export arrangements with Denmark, the Netherlands and Sweden operationalise the London Protocol amendment for commercial cross-border storage services.',
        citation: 'regjeringen.no Longship opening (Jun 2025)',
      },
      strategic: {
        score: 100,
        label: '2025 Operational',
        evidence:
          'First injection August 2025 completed the 2020 vision: an operating full-scale chain at 1.5 Mt/yr expanding past 5 Mt/yr from 2028, anchoring European industrial decarbonisation through 2030.',
        citation: 'Equinor Northern Lights programme page',
      },
    },
  },
  {
    id: 'de-carbon-management-strategy-2024',
    core: {
      status: 'Active',
      category: 'Strategic',
      legalWeight: 'Strategic Guidance',
    },
    i18n: {
      en: {
        description:
          'Germany 2024 Carbon Management Strategy key points plus the Carbon Dioxide Storage and Transport Act (KSpTG, in force November 28, 2025; Bundestag November 6, Bundesrat November 21) mark the end of the 2012 de-facto commercial ban: commercial storage is now permitted on the continental shelf and exclusive economic zone with a uniform pipeline-transport regime, onshore storage only via Land opt-in (none exercised yet), and coal-power emissions excluded from networks and stores. The law answers the EU Industrial Carbon Management Strategy and the Net-Zero Industry Act 50 Mt 2030 injection obligation, but legal commentators note the act precedes any robust CMS, funding framework or social settlement: CCS costs of EUR 130-300/t against ~EUR 90 allowances, unconvinced Länder, crowded EEZ planning and the still-pending London Protocol Article 6 ratification (laws of January 29, 2026) make CO2 export to Norway and Denmark the likely near-term use case.',
        scope:
          'German industrial CCS/CCU: offshore commercial storage licensing (EEZ/continental shelf with marine-protection conditions), Land opt-in for onshore storage, uniform CO2 pipeline permitting with overriding-public-interest acceleration, coal-power exclusion, and export enablement.',
        tags: [
          'carbon management strategy',
          'KSpTG',
          'offshore storage',
          'opt-in',
          'overriding public interest',
          'CO2 export',
        ],
        impactAnalysis: {
          economic:
            'Removes the legal block on commercial projects and creates investible pipeline permitting, but without a funding framework the EUR 130-300/t cost versus ~EUR 90 allowances leaves near-term economics dependent on exports and EU funds.',
          technical:
            'Uniform transport permitting aligned with energy-line procedures plus demanding offshore conditions (marine protected-area distances, porpoise noise windows, wind/hydrogen priority) set the engineering envelope for EEZ storage developers.',
          environmental:
            'Restricts storage to offshore zones with marine-protection strings, excludes coal-power emissions entirely, and pairs the opening with London Protocol export ratification so German industry can use Norwegian and Danish stores lawfully.',
        },
        evolution: {
          clusters: [
            'Germany Carbon Management',
            'KSpG Reform',
            'EU Industrial Carbon Strategy',
          ],
          milestones: [
            {
              date: '2012-08-17',
              event:
                'The 2012 KSpG limited storage to research and demonstration with a 2016 application deadline, operating as a de-facto commercial ban under which no store was ever approved.',
            },
            {
              date: '2024-05-29',
              event:
                'Federal cabinet tabled the KSpG amendment with CMS key points: offshore commercial storage, Land opt-in, overriding public interest for permitting.',
            },
            {
              date: '2025-11-28',
              event:
                'The renamed Carbon Dioxide Storage and Transport Act (KSpTG) entered into force, permitting industrial-scale offshore storage with a uniform pipeline regime.',
            },
            {
              date: '2026-01-29',
              event:
                'Laws enabling London Protocol Article 6 ratification passed, clearing cross-border CO2 export for storage abroad.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '德国2024年碳管理战略要点加《二氧化碳封存与运输法》（KSpTG，2025年11月28日生效；联邦议院11月6日、参议院11月21日通过），终结了2012年以来事实上的商业禁令：大陆架与专属经济区允许商业封存并统一管输审批，陆上封存仅各州opt-in（尚无州行使），煤电排放排除在管网与封存之外。该法回应欧盟工业碳管理战略与净零工业法案2030年5000万吨注入义务，但法律评论指出法先行于战略——无 robust 碳管理战略、无资金框架、无社会共识：130-300欧元/吨成本对90欧元配额、各州冷淡、专属经济区规划拥挤、伦敦议定书第6条批准程序（2026年1月29日立法）待完成，近期用例很可能是向挪威丹麦出口二氧化碳。',
        scope:
          '德国工业CCS/CCU：海上商业封存许可（专属经济区/大陆架附海洋保护条件）、各州陆上封存opt-in、统一二氧化碳管输审批（压倒一切的公共利益加速）、煤电排除、出口放行。',
        tags: [
          '碳管理战略',
          'KSpTG',
          '海上封存',
          'opt-in',
          '公共利益加速',
          '二氧化碳出口',
        ],
        impactAnalysis: {
          economic:
            '搬掉商业项目法律障碍并给出可投资的管输审批，但无资金框架下130-300欧元/吨成本对90欧元配额，近期经济性依赖出口与欧盟资金。',
          technical:
            '与能源线路程序对齐的统一运输审批加严苛海上条件（海洋保护区距离、鼠海豚噪声窗口、风电氢能优先），划定专属经济区封存开发的工程边界。',
          environmental:
            '封存限于附海洋保护条件的海上区域，煤电排放彻底排除，并配套伦敦议定书出口批准使德国工业可合法使用挪威丹麦封存。',
        },
        evolution: {
          clusters: ['德国碳管理', 'KSpG改革', '欧盟工业碳战略'],
          milestones: [
            {
              date: '2012-08-17',
              event:
                '2012年KSpG把封存限于科研示范并设2016年申请截止，实际成商业禁令，其下从未批准一处封存。',
            },
            {
              date: '2024-05-29',
              event:
                '联邦内阁提交KSpG修正案及CMS要点：海上商业封存、各州opt-in、审批压倒一切的公共利益。',
            },
            {
              date: '2025-11-28',
              event:
                '更名的二氧化碳封存与运输法生效，允许工业规模海上封存并统一管输制度。',
            },
            {
              date: '2026-01-29',
              event:
                '伦敦议定书第6条批准立法通过，为跨境二氧化碳出口封存清障。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 80,
        label: 'Framework Without Funds',
        evidence:
          'The KSpTG creates investible permitting and overriding-public-interest acceleration but no dedicated funding line; a 2025 federal industrial decarbonisation programme (EUR 6 billion, CCS-eligible) is the adjacent support route.',
        citation:
          'KSpTG (in force Nov 2025); federal decarbonisation programme (Oct 2025)',
      },
      market: {
        score: 70,
        label: 'Export-Led Demand',
        evidence:
          'With no Land opt-in exercised and EEZ planning crowded, the operative near-term market is CO2 export to Norwegian and Danish stores under the January 2026 London Protocol legislation, feeding the 50 Mt EU 2030 injection obligation.',
        citation:
          'London Protocol ratification laws (Jan 2026); NZIA 50 Mt obligation',
      },
      mrv: {
        score: 85,
        label: 'Offshore Conditions',
        evidence:
          'Licensing embeds marine-protection distances, porpoise noise windows, wind/hydrogen priority checks and BGR-assessed formation suitability, carrying EU CCS Directive monitoring duties into the commercial regime.',
        citation: 'KSpTG licensing conditions; EU CCS Directive 2009/31/EC',
      },
      statutory: {
        score: 90,
        label: 'KSpTG Enacted',
        evidence:
          'Bundestag and Bundesrat passage (November 2025) replaced the research-only KSpG with commercial offshore storage plus the first uniform CO2 pipeline-transport regime, ending the special national path toward EU-law compatibility.',
        citation: 'KSpTG (BGBl. 2025 I No. 282)',
      },
      strategic: {
        score: 95,
        label: 'Ban Lifted, Gaps Open',
        evidence:
          'The 2024 CMS key points plus the KSpTG lift the ban for unavoidable industrial emissions (cement, lime, chemicals, waste), while strategy, funding, storage-access and acceptance gaps keep deployment dependent on pending political decisions.',
        citation: 'CMS key points (2024); BMWK cabinet draft (Aug 2025)',
      },
    },
  },
  {
    id: 'kr-ccus-act',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'Primary Legislation',
    },
    i18n: {
      en: {
        description:
          'Act No. 20203 on the Capture, Transport, Storage and Utilisation of Carbon Dioxide (passed January 9, 2024, promulgated February 6, 2024, effective February 7, 2025; Enforcement Decree cabinet-approved January 31, 2025) is the dedicated CCUS statute replacing some forty scattered provisions: capture-business registration, transport-business approval, storage licensing for onshore and marine sites, five-year basic plans with annual implementation plans, cluster designation via the Carbon Neutrality Commission, CCU supply/certification/specialised-company systems, and R&D, subsidy, loan, tax and climate-fund support. Marine storage runs a dual-approval model (Trade/Industry/Energy plus Oceans/Fisheries, with continuous post-closure monitoring). The first large demonstration is the depleted Donghae-1 gas field (1.2 Mtpa, FEED and platform conversion underway, first injection targeted before 2030, hub expansion to 2060), complemented by the Daesan cross-border chain to Indonesian storage (KNOC-Pertamina-ExxonMobil framework). The Act serves NDC goals of 4.8 Mt/yr CCS by 2030 and 11.2-20.3 Mt/yr CCUS by 2035, though 2026 scholarship flags the pending First Basic Plan and uncodified post-closure liability transfer as the live gaps.',
        scope:
          'Korean CCUS value chain: capture registration, transport approval, onshore and marine storage licensing with dual-ministry marine oversight, monitoring through and after closure, industrial clusters, CCU certification, demonstration support and cross-border cooperation.',
        tags: [
          'CCUS Act',
          'Enforcement Decree',
          'Donghae-1',
          'marine storage',
          'clusters',
          'NDC targets',
        ],
        impactAnalysis: {
          economic:
            'A single licensing ladder plus cluster subsidies, rent relief, tax reduction and climate-fund investment replaces forty-law friction, while the Donghae hub and Daesan cross-border chain convert the statute into contracted storage demand.',
          technical:
            'Capture registration, pipeline safety rules, storage-site exploration-to-closure procedures and continuous post-closure marine monitoring create an end-to-end engineering code, extended by DAC/BECCS-adjacent removal-credit thinking in registry practice.',
          environmental:
            'Storage licensing with marine dual approval and mandatory monitoring plans internalises environmental control, though critics note the Oceans ministry role is consultative and the liability-transfer endpoint awaits codification.',
        },
        evolution: {
          clusters: [
            'Korea CCUS Legislation',
            'Donghae Demonstration',
            'Cross-Border Storage',
          ],
          milestones: [
            {
              date: '2024-01-09',
              event:
                'The National Assembly passed the CCUS Act, unifying some forty scattered provisions into one value-chain statute.',
            },
            {
              date: '2025-02-07',
              event:
                'The Act took effect with the Enforcement Decree (cabinet January 31, 2025); five-year basic-plan machinery started.',
            },
            {
              date: '2025-12-10',
              event:
                'The Donghae-1 demonstration (1.2 Mtpa) moved into design phase with FEED, platform conversion and pre-2030 first injection targeted.',
            },
            {
              date: '2026-02-28',
              event:
                '2026 scholarship assessed year-one operation, flagging the pending First Basic Plan and post-closure liability transfer as live gaps.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '《二氧化碳捕集运输封存及利用法》（第20203号，2024年1月9日通过、2月6日公布、2025年2月7日施行；施行令2025年1月31日内阁通过）是替代四十余部散见规定的CCUS专法：捕集业登记、运输业许可、陆上与海洋封存许可、五年基本计划加年度实施计划、经碳中和委员会的集聚区指定、CCU供给/认证/专门企业制度、研发补贴贷款税收与气候基金支持。海洋封存实行产业部加海洋部双审批并要求封场后持续监测。首个大型示范是枯竭东海-1气田（120万吨/年，可研设计与平台改造进行中，2030年前首次注入，枢纽扩展至2060年），辅以大山—印尼跨境链（KNOC-Pertamina-埃克森美孚框架）。该法服务NDC目标（2030年CCS 480万吨/年、2035年CCUS 1120-2030万吨/年），但2026年研究指出首个基本计划待定、封场后责任转移未入法典是现实缺口。',
        scope:
          '韩国CCUS全链条：捕集登记、运输许可、陆上与海洋封存许可（海洋双部门监管）、封场前后监测、产业集聚区、CCU认证、示范支持、跨境合作。',
        tags: ['CCUS法', '施行令', '东海-1', '海洋封存', '集聚区', 'NDC目标'],
        impactAnalysis: {
          economic:
            '单一许可阶梯加集聚区补贴、租金减免、税收优惠与气候基金，替代四十部法律的摩擦；东海枢纽与大山跨境链把法律变成合同封存需求。',
          technical:
            '捕集登记、管输安全规则、封存场址勘探到关闭程序、封场后持续海洋监测构成端到端工程规范，登记实践延伸出移除额度思路。',
          environmental:
            '海洋双审批的封存许可与强制监测计划把环境控制内生化，但批评者指出海洋部门角色偏咨询，责任转移终点待入法。',
        },
        evolution: {
          clusters: ['韩国CCUS立法', '东海示范', '跨境封存'],
          milestones: [
            {
              date: '2024-01-09',
              event: '国会通过CCUS法，把四十余部散见规定统一为全链条专法。',
            },
            {
              date: '2025-02-07',
              event:
                '法律施行并配施行令（1月31日内阁通过），五年基本计划机制启动。',
            },
            {
              date: '2025-12-10',
              event:
                '东海-1示范（120万吨/年）进入设计阶段，可研设计与平台改造推进，目标2030年前首次注入。',
            },
            {
              date: '2026-02-28',
              event:
                '2026年研究评估施行一周年，指出首个基本计划与封场后责任转移是现实缺口。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 80,
        label: 'Cluster-based Support',
        evidence:
          'Cluster designation with creation subsidies, rent relief, R&D grants, loans, tax reduction and climate-fund investment channels support through designated complexes and certified specialised companies.',
        citation: 'CCUS Act arts. 29-44; Kim Chang briefing (Apr 2024)',
      },
      market: {
        score: 75,
        label: 'NDC Driven Demand',
        evidence:
          'NDC-anchored demand (4.8 Mt/yr CCS by 2030, 11.2-20.3 Mt/yr CCUS by 2035) plus the Donghae hub and Daesan cross-border chain give the statute contracted storage outlets; the first basic plan will set allocation detail.',
        citation: 'KNOC CCS programme (Jan 2026); 2035 NDC',
      },
      mrv: {
        score: 85,
        label: '15-Year Mandatory Monitoring',
        evidence:
          'Storage operators need approved monitoring plans with continuous post-closure marine monitoring, dual-ministry site selection, and an optional national public monitoring system for storage facilities.',
        citation: 'CCUS Act arts. 14, 18, 25, 45',
      },
      statutory: {
        score: 90,
        label: 'Unified CCUS Licensing',
        evidence:
          'One statute with capture registration, transport approval and storage licensing (Act No. 20203, effective February 7, 2025, Enforcement Decree January 31, 2025) replaces some forty mutatis-mutandis provisions with a licensing ladder.',
        citation: 'CCUS Act (No. 20203); Enforcement Decree (Jan 2025)',
      },
      strategic: {
        score: 95,
        label: 'K-CCUS Roadmap Pillar',
        evidence:
          'The Act is the legal pillar of the carbon-neutrality roadmap for hard-to-abate industry, defining captured carbon as a usable resource and establishing whole-lifecycle governance from capture to utilisation.',
        citation:
          'Kim (2026) CCUS Act assessment; MSIT enforcement notice (Feb 2025)',
      },
    },
  },
  {
    id: 'fr-ccus-strategy-2024',
    core: {
      status: 'Active',
      category: 'Strategic',
      legalWeight: 'Strategic Guidance',
    },
    i18n: {
      en: {
        description:
          'The July 2024 DGEC stocktake operationalises the French CCUS strategy: Phase 1 (2024-2030) builds at least two hubs capturing 4-8 Mt/yr by 2030 (1.5-4 Mt per cluster) across Dunkerque, Fos-sur-Mer, the Rhone axis, Le Havre and Saint-Nazaire, with a first hub possibly functional in 2028 and a deep-decarbonisation support scheme tendered from the June 2024 consultation. Near-term storage is explicitly external: a strategic green-industries partnership with Norway (January 2024, 1.5 Mt/yr via Northern Lights), a Franco-Danish letter of intent plus maritime CO2 export bilateral (March 2024), London Protocol amendment ratification before parliament in 2024 and a full France-Norway CO2 export agreement signed July 2025 (after June 2025 Assembly ratification), alongside the North Sea Basin Task Force and a France-Italy-Greece Mediterranean plan. Sovereign storage follows via BRGM subsurface assessment, an April 2024 call for interest and project funding for exploration. NaTran maps a 16.7 Mt/yr transport corridor; ADEME pricing (EUR 100-150/t against EUR 20-30 cheapest industrial options) frames the cost debate; the EU NZIA 50 Mt 2030 obligation and carbon-market revenues complete the picture.',
        scope:
          'French industrial CCUS 2024-2030: two-to-four port hubs, deep-decarbonisation support, external North Sea/Mediterranean storage access (Norway, Denmark, Italy/Greece routes), London Protocol ratification, sovereign storage assessment, and Green Industry Act permitting streamlining.',
        tags: [
          'CCUS strategy',
          'industrial hubs',
          'Norway partnership',
          'London Protocol',
          'deep decarbonisation',
          'sovereign storage',
        ],
        impactAnalysis: {
          economic:
            'Hub concentration (Dunkerque, Fos, Rhone, Le Havre) plus shared NaTran transport and EU Innovation Fund/NZIA routes pool CAPEX, while ADEME EUR 100-150/t costing against EUR 20-30 alternatives keeps only hard-to-abate volumes in the frame.',
          technical:
            'Standardised post-combustion capture on hydrogen units, furnaces and steam plants with shared liquefaction, pipeline and shipping specs, and a BRGM-led subsurface programme to convert theoretical national storage into drilled prospects.',
          environmental:
            'External storage via ratified London Protocol routes avoids premature domestic lock-in; ADEME positions capture as the last decarbonisation step after efficiency and renewables, bounding the strategy environmentally.',
        },
        evolution: {
          clusters: [
            'France Industrial Decarbonisation',
            'North Sea Storage Access',
            'Sovereign Storage Buildup',
          ],
          milestones: [
            {
              date: '2024-01-16',
              event:
                'France-Norway green-industries forum: strategic partnership facilitating CO2 storage cooperation (1.5 Mt/yr via Northern Lights).',
            },
            {
              date: '2024-07-26',
              event:
                'DGEC stocktake published: Phase 1 hubs for 4-8 Mt/yr by 2030, external storage first, sovereign assessment launched.',
            },
            {
              date: '2025-07-28',
              event:
                'France-Norway CO2 export agreement signed after June 2025 Assembly ratification of the London Protocol amendment.',
            },
            {
              date: '2028-01-01',
              event:
                'First French hub potentially functional, connecting port clusters to North Sea and Mediterranean stores.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '2024年7月生态转型部盘点文件把法国CCUS战略落到操作：在敦刻尔克、 Fos、罗讷轴线、勒阿弗尔与圣纳泽尔建至少两个枢纽，2030年捕集400-800万吨/年（单集群150-400万吨），首个枢纽或2028年投运，深度脱碳支持机制自2024年6月咨询招标。近期封存明确走外部：挪威绿色工业战略伙伴（2024年1月，经Northern Lights 150万吨/年）、法丹意向书加海上二氧化碳出口双边（2024年3月）、伦敦议定书修正案2024年送议会批准、2025年7月法挪二氧化碳出口协议签署（此前6月国民议会已批准），外加北海盆地工作组与法意希地中海计划。本土封存随后跟上：BRGM地下评估、2024年4月意向征集与勘探资助。NaTran规划1670万吨/年运输走廊；ADEME成本测算（100-150欧元/吨对最便宜工业选项20-30欧元）框定成本争议；欧盟净零工业法案5000万吨义务与碳市场收入补全图景。',
        scope:
          '法国2024-2030工业CCUS：两到四个港口枢纽、深度脱碳支持、北海/地中海外部封存接入（挪威、丹麦、意希路线）、伦敦议定书批准、本土封存评估、《绿色工业法》审批简化。',
        tags: [
          'CCUS战略',
          '工业枢纽',
          '挪威伙伴',
          '伦敦议定书',
          '深度脱碳',
          '本土封存',
        ],
        impactAnalysis: {
          economic:
            '枢纽集中（敦刻尔克、Fos、罗讷、勒阿弗尔）加NaTran共享运输与欧盟创新基金/NZIA路径分摊资本开支；ADEME 100-150欧元/吨对20-30欧元替代方案的测算把范围限定在难减排量。',
          technical:
            '制氢机组、加热炉与蒸汽装置的标准化后燃烧捕集，共享液化管输船运规格，BRGM主导的地下计划把理论本土封存变成钻探远景。',
          environmental:
            '经批准的伦敦议定书路径走外部封存，避免过早本土锁定；ADEME把捕集定位为能效与可再生之后的最后脱碳步骤，给战略划定环境边界。',
        },
        evolution: {
          clusters: ['法国工业脱碳', '北海封存接入', '本土封存建设'],
          milestones: [
            {
              date: '2024-01-16',
              event:
                '法挪绿色工业论坛：战略伙伴便利二氧化碳封存合作（经Northern Lights 150万吨/年）。',
            },
            {
              date: '2024-07-26',
              event:
                '生态转型部盘点发布：一期枢纽2030年400-800万吨/年，先外部后本土，启动本土评估。',
            },
            {
              date: '2025-07-28',
              event:
                '法挪二氧化碳出口协议签署（此前6月国民议会已批准伦敦议定书修正案）。',
            },
            {
              date: '2028-01-01',
              event: '首个法国枢纽或投运，连接港口集群与北海及地中海封存。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 85,
        label: 'Hub Support Scheme',
        evidence:
          'The deep-decarbonisation support scheme tendered from the June 2024 consultation funds two-to-four port hubs, with EU Innovation Fund and carbon-market revenues as co-financing beside national support.',
        citation: 'DGEC stocktake (Jul 2024)',
      },
      market: {
        score: 75,
        label: 'NaTran Corridor',
        evidence:
          'NaTran 16.7 Mt/yr transport corridor with regulated per-tonne tariffs and shared liquefaction/pipeline/shipping specs turns capture into contracted midstream demand across refining, petrochemicals and steel.',
        citation: 'NaTran corridor planning; DGEC stocktake (Jul 2024)',
      },
      mrv: {
        score: 85,
        label: 'EU Storage MRV',
        evidence:
          'External storage under EU CCS Directive monitoring duties via Northern Lights, Aramis, Callisto and Prinos routes, with BRGM subsurface assessment building the domestic MRV knowledge base.',
        citation: 'EU CCS Directive; DGEC stocktake (Jul 2024)',
      },
      statutory: {
        score: 80,
        label: 'Protocol Ratification',
        evidence:
          'London Protocol amendment ratification (Assembly June 2025) plus the July 2025 France-Norway export agreement and the Franco-Danish maritime bilateral give cross-border storage full treaty cover; Green Industry Act streamlines subsurface permitting.',
        citation: 'London Protocol amendment; Green Industry Act',
      },
      strategic: {
        score: 95,
        label: '4-8 Mtpa Hubs',
        evidence:
          'Phase 1 hubs target 4-8 Mt/yr by 2030 (first possibly 2028) inside the EU 50 Mt 2030 storage obligation, with ADEME bounding the strategy to hard-to-abate volumes after efficiency and renewables.',
        citation: 'DGEC stocktake (Jul 2024); ADEME costing',
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

function deleteLongshipDuplicate(db) {
  if (!policyExists(db, MERGED_AWAY_ID)) {
    // Idempotent re-run after the merge: the duplicate is already gone,
    // content updates below still converge. Fresh runs always take the
    // delete path (asserted by the test on a pre-merge database).
    return { id: MERGED_AWAY_ID, skipped: true, removedLinks: 0 };
  }
  const kept = linkSet(db, 'norway-longship');
  const removed = linkSet(db, MERGED_AWAY_ID);
  if (kept !== removed) {
    throw new Error(
      'Longship link sets differ; refusing merge to avoid link loss'
    );
  }
  const facilitiesBefore = Number(
    scalar(db, 'SELECT COUNT(*) FROM facilities')
  );
  execute(db, 'DELETE FROM policy_facility_links WHERE policy_id = ?', [
    MERGED_AWAY_ID,
  ]);
  execute(db, 'DELETE FROM policy_analysis WHERE policy_id = ?', [
    MERGED_AWAY_ID,
  ]);
  execute(db, 'DELETE FROM policy_i18n WHERE policy_id = ?', [MERGED_AWAY_ID]);
  execute(db, 'DELETE FROM policies WHERE id = ?', [MERGED_AWAY_ID]);
  const facilitiesAfter = Number(scalar(db, 'SELECT COUNT(*) FROM facilities'));
  if (facilitiesAfter !== facilitiesBefore) {
    throw new Error('Facilities row count changed during merge');
  }
  return { removedLinks: removed.split(',').length };
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

export function applyContentDepthBatch2C(db, { auditDate = AUDIT_DATE } = {}) {
  db.run('PRAGMA foreign_keys = ON');
  for (const update of POLICY_CONTENT_UPDATES) {
    if (!policyExists(db, update.id))
      throw new Error(`Policy is missing: ${update.id}`);
  }
  // Merge source gates the delete path inside deleteLongshipDuplicate
  // (skipped idempotently once merged); content updates always converge.

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
    const merge = deleteLongshipDuplicate(db);
    execute(db, 'INSERT OR REPLACE INTO db_meta (key, value) VALUES (?, ?)', [
      `migration:${MIGRATION_ID}`,
      auditDate,
    ]);
    const frozenAfter = snapshotFrozenTables(db);
    assertFrozenTablesUnchanged(frozenBefore, frozenAfter);
    db.run('COMMIT');
    return {
      migrationId: MIGRATION_ID,
      updatedPolicies: POLICY_CONTENT_UPDATES.map((entry) => entry.id),
      mergedAway: { id: MERGED_AWAY_ID, removedLinks: merge.removedLinks },
      frozenTablesVerified: FROZEN_TABLES,
    };
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
}

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database not found: ${DB_PATH}`);
  }

  acquireDbLock();
  try {
    const SQL = await initSqlJs();
    const db = new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)));
    const summary = applyContentDepthBatch2C(db);
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
    console.error(`Content-depth batch 2C migration failed: ${error.message}`);
    process.exit(1);
  });
}

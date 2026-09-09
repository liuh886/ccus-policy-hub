#!/usr/bin/env node
/**
 * Content-depth batch 3B (2026-09): enrich the four Denmark/Netherlands/
 * Norway/Germany records with primary-source-backed bilingual content.
 *
 * Scores before: dk-ccs-subsidy-scheme-2025 (25), nl-cdr-roadmap-2025 (25),
 * no-14th-licensing-round-2025 (43), de-icm-strategy (27).
 *
 * Integrity fixes: no-14th title corrected (the round is the 8th CO2
 * storage award process, not a 14th licensing round; the record description
 * already says so) and its pore-space regulatory field aligned; Danish
 * CCS Fund stated as tender-stage (state-aid approval pending, awards due
 * April 2026), not approved-and-disbursing; de-icm-strategy status
 * Upcoming -> Active (May 2024 cabinet adoption is a fact) with its
 * evolution pointing at the November 2025 KSpTG enactment; no-14th six
 * analysis dimensions normalised to five (liability folded into
 * statutory). Target: each record scores >= 70 on re-audit.
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

export const MIGRATION_ID = 'content-depth-batch3b-2026-09';
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

const CORRECTED_TITLES = {
  'no-14th-licensing-round-2025': {
    en: 'Norway 2025 CO2 Storage Licensing Round (EXL014)',
    zh: '挪威2025年二氧化碳封存许可轮（EXL014）',
  },
};

export const POLICY_CONTENT_UPDATES = [
  {
    id: 'dk-ccs-subsidy-scheme-2025',
    core: {
      status: 'Active',
      category: 'Incentive',
      legalWeight: 'State Aid Scheme',
    },
    i18n: {
      en: {
        description:
          'Denmark runs three CCS subsidy funds through the Danish Energy Agency: the CCUS Fund (DKK ~8 billion, Ørsted full-scale project at 430,000 t/yr from 2026 over 20 years, first capture possibly 2025), the NECCS Fund (DKK 2.5 billion for biogenic CO2, three contracts totalling 160,350 t/yr for 2026-2032 awarded April 2024), and the CCS Fund (DKK 28.7 billion over 2029-2044, per-tonne payment, minimum 100,000 t/yr, commissioning by December 2029, about 2.3 Mt/yr from 2030). The CCS Fund tender published October 2024 drew 16 applicants, 10 prequalified (May 2025), 8 indicative bids (August 2025), best-and-final offers due December 2025, awards expected April 2026 — implementation remains conditional on European Commission state-aid approval. Denmark pairs the funds with offshore storage licensing (Greensand first cross-border injection of Belgian CO2 in 2023; Bifrost, Norne, Stenlille, Rodby in the portfolio) and a 2030-2032 ambition near 52 Mt/yr of national storage capacity.',
        scope:
          'Danish CCS deployment finance: three competitive subsidy funds (CCUS, NECCS, CCS Fund) with per-tonne payment, state-aid discipline, full value-chain eligibility, and linkage to offshore storage licensing rounds.',
        tags: [
          'CCS Fund',
          'NECCS',
          'state aid',
          'competitive tender',
          'Greensand',
          'negative emissions',
        ],
        impactAnalysis: {
          economic:
            'DKK ~38 billion across three funds buys reductions by reverse auction (lowest cost per tonne wins), with the CCS Fund sizing at 2.3 Mt/yr from 2030 — the largest per-capita CCS commitment in Europe.',
          technical:
            'Full value-chain eligibility (capture, transport, storage, consortia or turnkey) with 100,000 t/yr minimum forces integrated project design, while NECCS 8-year terms keep cheap biogenic tonnes available for future utilisation.',
          environmental:
            'Biogenic-only NECCS delivers counted negative emissions from 2026; the CCS Fund covers fossil, biogenic and atmospheric CO2 with payment strictly on documented stored tonnes.',
        },
        evolution: {
          clusters: [
            'Denmark CCS Funds',
            'Offshore Storage Licensing',
            'EU State Aid',
          ],
          milestones: [
            {
              date: '2023-05-15',
              event:
                'Ørsted CCUS Fund contract finalised: 430,000 t/yr full-scale capture from 2026.',
            },
            {
              date: '2024-04-17',
              event:
                'NECCS Fund concluded with three biogenic contracts totalling 160,350 t/yr for 2026-2032.',
            },
            {
              date: '2024-10-09',
              event:
                'CCS Fund tender (DKK 28.7 billion, 2029-2044) published; 10 bidders prequalified May 2025, indicative bids August 2025.',
            },
            {
              date: '2026-04-01',
              event:
                'CCS Fund awards expected, conditional on European Commission state-aid approval.',
            },
          ],
        },
        regulatory: {
          pore_space_rights:
            'Streamlined licensing for offshore storage areas (e.g., Greensand, Bifrost).',
          liability_transfer:
            'Aligned with EU CCS Directive 2009/31/EC; state assumption of liability.',
          liability_period:
            'Standard 20-year period post-closure before state transfer (EU baseline).',
          financial_assurance:
            'DKK 28.7B CCS Fund plus DKK 2.5B NECCS and DKK 8B CCUS pool; mandatory operator guarantees.',
          permitting_lead_time:
            'Consolidated permitting for subsidy-awarded strategic projects.',
          co2_definition:
            'Emphasis on Carbon Dioxide Removal (CDR) and negative emissions from biomass.',
          cross_border_rules:
            'Greensand injected Belgian CO2 in 2023, first cross-border offshore storage in the EU.',
        },
      },
      zh: {
        description:
          '丹麦经能源署运行三个CCS补贴基金：CCUS基金（约80亿克朗，Ørsted全规模项目2026年起年捕集43万吨、20年期，最早2025年首捕）、NECCS基金（25亿克朗生物源，2024年4月签三家合计年16万吨、2026-2032年）、CCS基金（287亿克朗、2029-2044年、按吨付费、年10万吨起投、2029年12月前投运、2030年起年230万吨）。CCS基金2024年10月招标，16家申请、10家入围（2025年5月）、8家首轮报价（2025年8月）、终轮2025年12月、2026年4月授标——实施以欧盟国家援助批准为条件。配套海上封存许可（Greensand 2023年首注比利时二氧化碳；Bifrost、Norne、Stenlille、Rodby在列），2030-2032年本土封存能力目标近5200万吨/年。',
        scope:
          '丹麦CCS部署资金：三个竞争性补贴基金（CCUS、NECCS、CCS基金），按吨付费、国家援助纪律、全链条资格、挂钩海上封存许可。',
        tags: [
          'CCS基金',
          'NECCS',
          '国家援助',
          '竞争性招标',
          'Greensand',
          '负排放',
        ],
        impactAnalysis: {
          economic:
            '三基金约380亿克朗反向拍卖买减排（吨成本最低者得），CCS基金2030年起年230万吨——欧洲人均最高CCS承诺。',
          technical:
            '全链条资格（捕集运输封存、联合体或交钥匙）加年10万吨门槛逼出一体化设计；NECCS八年期让廉价生物源吨留给未来利用。',
          environmental:
            '纯生物源NECCS自2026年交付计数负排放；CCS基金覆盖化石生物大气二氧化碳，按实证封存吨付费。',
        },
        evolution: {
          clusters: ['丹麦CCS基金', '海上封存许可', '欧盟国家援助'],
          milestones: [
            {
              date: '2023-05-15',
              event: 'Ørsted CCUS基金合同敲定：2026年起年捕集封存43万吨。',
            },
            {
              date: '2024-04-17',
              event: 'NECCS基金收官，三家生物源合同合计年16万吨、2026-2032年。',
            },
            {
              date: '2024-10-09',
              event:
                'CCS基金招标（287亿克朗、2029-2044年）；2025年5月10家入围、8月8家首轮报价。',
            },
            {
              date: '2026-04-01',
              event: 'CCS基金预计授标，以欧盟国家援助批准为条件。',
            },
          ],
        },
        regulatory: {
          pore_space_rights:
            '离岸封存区域（如 Greensand、Bifrost）的简化许可。',
          liability_transfer: '符合欧盟 CCS 指令 2009/31/EC；国家承担责任。',
          liability_period:
            '闭坑后 20 年的标准期限，之后移交给国家（欧盟基准）。',
          financial_assurance:
            '287亿克朗CCS基金加25亿NECCS与80亿CCUS池；强制运营商担保。',
          permitting_lead_time: '为获得补贴的战略项目提供统一许可。',
          co2_definition: '强调二氧化碳移除 (CDR) 和来自生物质的负排放。',
          cross_border_rules:
            'Greensand 2023年注入比利时二氧化碳，欧盟首例跨境海上封存。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 95,
        label: 'DKK 38B Auction',
        evidence:
          'Three reverse-auction funds totalling about DKK 38 billion pay per stored tonne with the CCS Fund sizing 2.3 Mt/yr from 2030 — competitive price discovery instead of administered tariffs.',
        citation: 'Danish Energy Agency CCS Fund pages (2024-2025)',
      },
      market: {
        score: 85,
        label: 'Bidder Competition',
        evidence:
          'Sixteen applicants chased ten prequalification slots for the CCS Fund with eight indicative bids in August 2025, showing a genuine bidder market for Danish storage-backed capture.',
        citation: 'DEA tender update (Aug 2025)',
      },
      mrv: {
        score: 85,
        label: 'Stored-Tonne Payment',
        evidence:
          'Support pays only on documented stored tonnes with capture in Denmark counting to Danish climate accounts — payment conditional on verified storage, not capacity promises.',
        citation: 'CCS Fund tender specifications V5 (Dec 2025)',
      },
      statutory: {
        score: 90,
        label: 'State-Aid Discipline',
        evidence:
          'All three funds run as notified aid schemes under EU CEEAG Article 108 TFEU procedure, with the CCS Fund award conditional on prior Commission approval.',
        citation: 'CCS Fund tender specifications; TFEU Art.108',
      },
      strategic: {
        score: 95,
        label: '52 Mtpa Ambition',
        evidence:
          'Funds plus licensed stores (Greensand, Bifrost, Norne, Stenlille, Rodby) target near 52 Mt/yr national storage capacity in 2030-2032, positioning Denmark as the Central European storage hub.',
        citation: 'DEA storage portfolio; FR DGEC stocktake (Jul 2024)',
      },
    },
  },
  {
    id: 'nl-cdr-roadmap-2025',
    core: {
      status: 'Active',
      category: 'Strategic',
      legalWeight: 'Policy Roadmap',
    },
    i18n: {
      en: {
        description:
          'The March 2025 Netherlands Carbon Dioxide Removal Roadmap (57 pages, sent to parliament March 18, 2025) makes removal a second climate-policy track beside emission reduction, with an indicative 20-25 Mt/yr contribution between 2040 and 2050 (about 10% of 1990 emissions). Three overlapping phases run to ~2030 (startup: innovation plus regulation), the 2030s (scaling inside the EU carbon market), and the 2040s (net-negative contribution); three parallel tracks build international accounting rules, a European carbon market, and Dutch firm readiness through innovation. The technology portfolio spans BECCS, BioCCS, DACCS and mineralisation against EU CRCF certification, with Porthos (37 Mt total, due 2026) and Aramis (22 Mtpa design, operations from 2030) as the storage backbone and an explicit no-onshore-storage policy. Parliamentary motions behind the roadmap demand transparency on the removal share of climate targets.',
        scope:
          'Dutch carbon removal to 2050: BECCS/BioCCS/DACCS/mineralisation portfolio, EU CRCF alignment, Porthos/Aramis storage backbone, innovation tracks, and accounting rules for the national climate plan.',
        tags: ['CDR roadmap', 'BECCS', 'DACCS', 'Porthos', 'Aramis', 'CRCF'],
        impactAnalysis: {
          economic:
            'An indicative 20-25 Mt/yr removal demand signal to 2040-2050 gives BECCS, mineralisation and timber-build value chains an investment horizon, with SDE++ and the National Growth Fund as bridge finance.',
          technical:
            'The roadmap is frank on readiness gaps: technical-industrial routes hold the larger Dutch potential but several sit at low TRL, so the startup phase funds innovation before scale obligations bite.',
          environmental:
            'Removal is fenced as compensation for residuals and budget overshoot, not a substitute for reduction, with CRCF certification and biomass-import scrutiny guarding environmental integrity.',
        },
        evolution: {
          clusters: [
            'Netherlands CDR Policy',
            'Porthos and Aramis Backbone',
            'EU Certification',
          ],
          milestones: [
            {
              date: '2024-01-01',
              event:
                'Parliamentary motions demanded a negative-emissions roadmap and transparent removal shares in climate targets.',
            },
            {
              date: '2025-03-14',
              event:
                'The 57-page CDR Roadmap published: 20-25 Mt/yr indicative 2040-2050 contribution, three phases, three tracks.',
            },
            {
              date: '2026-01-01',
              event:
                'Porthos due into operation (37 Mt total), giving removals-grade storage to the Rotterdam cluster.',
            },
            {
              date: '2030-01-01',
              event:
                'Aramis operations targeted with 22 Mtpa design capacity, scaling the backbone for removals and CCS alike.',
            },
          ],
        },
        regulatory: {
          pore_space_rights:
            'Regulated offshore via Mining Act; priority given to Porthos and Aramis hubs.',
          liability_transfer:
            'Compliant with EU CCS Directive; state management after closure verification.',
          liability_period:
            'Standard EU-aligned 20-year post-closure monitoring.',
          financial_assurance:
            'SDE++ subsidy mechanism (carbon contract for difference); CO2 levy for greenhouse horticulture.',
          permitting_lead_time:
            'Cluster-based permitting via industrial hub coordinators.',
          co2_definition:
            'Strategic focus on permanent storage (CCS) and CDR removals (DACCS/BECCS).',
          cross_border_rules:
            'MoU with Norway and UK for cross-border storage and hub connectivity.',
        },
      },
      zh: {
        description:
          '2025年3月荷兰二氧化碳移除路线图（57页，3月18日送议会）把移除列为减排之外的第二气候政策轨道，2040-2050年指示性贡献2000-2500万吨/年（约1990年排放10%）。三阶段重叠：2030年前起步（创新加规则）、2030年代规模化（纳入欧盟碳市场）、2040年代净负贡献；三条并行轨道建国际核算规则、欧洲碳市场、本土企业备战。技术组合含BECCS、BioCCS、DACCS与矿化，对接欧盟CRCF认证；封存靠Porthos（总量3700万吨，2026年投运）与Aramis（设计2200万吨/年，2030年运营），明确不搞陆上封存。背后的议会动议要求气候目标中移除占比透明。',
        scope:
          '荷兰到2050年碳移除：BECCS/BioCCS/DACCS/矿化组合、欧盟CRCF对接、Porthos/Aramis封存骨干、创新轨道、国家气候计划核算规则。',
        tags: ['CDR路线图', 'BECCS', 'DACCS', 'Porthos', 'Aramis', 'CRCF'],
        impactAnalysis: {
          economic:
            '2040-2050年2000-2500万吨指示性需求给BECCS、矿化与木结构链投资期限，SDE++与国家增长基金作过渡融资。',
          technical:
            '路线图坦承就绪度缺口：技术工业路线潜力更大但多处低TRL，起步阶段先投创新、规模义务后到。',
          environmental:
            '移除被限定为补偿残余与预算超支、非减排替代，CRCF认证与生物质进口审查守住环境诚信。',
        },
        evolution: {
          clusters: ['荷兰CDR政策', 'Porthos与Aramis骨干', '欧盟认证'],
          milestones: [
            {
              date: '2024-01-01',
              event: '议会动议要求负排放路线图与气候目标移除占比透明。',
            },
            {
              date: '2025-03-14',
              event:
                '57页CDR路线图发布：2040-2050年2000-2500万吨指示性贡献、三阶段三轨道。',
            },
            {
              date: '2026-01-01',
              event:
                'Porthos投运在即（总量3700万吨），给鹿特丹集群移除级封存。',
            },
            {
              date: '2030-01-01',
              event: 'Aramis目标运营，设计2200万吨/年，移除与CCS共用骨干。',
            },
          ],
        },
        regulatory: {
          pore_space_rights:
            '通过《采矿法》对离岸进行监管；优先考虑 Porthos 和 Aramis 枢纽。',
          liability_transfer: '符合欧盟 CCS 指令；闭坑核实后由国家管理。',
          liability_period: '符合欧盟标准的 20 年闭坑后监测。',
          financial_assurance:
            'SDE++ 补贴机制（碳差价合约）；对温室园艺征收二氧化碳税。',
          permitting_lead_time: '通过工业枢纽协调员进行基于集群的许可。',
          co2_definition:
            '战略重点是永久封存 (CCS) 和 CDR 移除 (DACCS/BECCS)。',
          cross_border_rules: '与挪威和英国签署跨境封存和枢纽互联备忘录。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 80,
        label: 'Demand Signal',
        evidence:
          'The indicative 20-25 Mt/yr 2040-2050 contribution plus SDE++ bridge finance and National Growth Fund grower support convert a roadmap into bankable removal demand a decade out.',
        citation: 'CDR Roadmap (Mar 2025); Kamerstuk 32813-1500',
      },
      market: {
        score: 85,
        label: 'EU Market Track',
        evidence:
          'The dedicated European-carbon-market track with international accounting rules work positions Dutch removals inside the EU compliance market rather than a voluntary offset niche.',
        citation: 'CDR Roadmap three tracks (Mar 2025)',
      },
      mrv: {
        score: 85,
        label: 'CRCF Alignment',
        evidence:
          'Portfolio-wide alignment with EU CRCF certification for permanent and temporary removal, with Porthos/Aramis storage MRV under the Mining Act supervision chain.',
        citation: 'EU CRCF regulation; CDR Roadmap (Mar 2025)',
      },
      statutory: {
        score: 85,
        label: 'Parliamentary Mandate',
        evidence:
          'Motions-driven roadmap transmitted to parliament with Klimaatplan 2025-2035 anchoring and ministerial follow-up research commissioned — a mandated policy spine, not a study.',
        citation: 'Kamerstuk 32813-1500 (Mar 2025)',
      },
      strategic: {
        score: 90,
        label: 'Second Track',
        evidence:
          'Removal as a formal second track beside reduction, sized at ~10% of 1990 emissions by 2040-2050, with net-negative readiness as the stated end state.',
        citation: 'CDR Roadmap (Mar 2025)',
      },
    },
  },
  {
    id: 'no-14th-licensing-round-2025',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'Licensing Round',
    },
    i18n: {
      en: {
        description:
          'Norway announced one North Sea CO2 storage area on March 5, 2025 under the CO2 Storage Regulations ("Announcement 2025, round 1" — officially the eighth CO2 storage award process, not a fourteenth licensing round; the database ID is kept for compatibility). Following evaluation, Equinor Low Carbon Solutions was offered exploration licence EXL014 effective June 24, 2025. The round continues the Ministry of Energy practice of sequenced storage acreage awards that built the Smeaheia, Luna, Trudvang, Havstjerne and Poseidon pipeline alongside Northern Lights, with French-industry reporting noting several domestic emitters in advanced storage-contract talks. Licensing pairs with the full Norwegian storage regime: NPD resource management, PSA safety oversight, post-closure state stewardship, and London Protocol-compatible export arrangements that let European emitters book Norwegian capacity.',
        scope:
          'Norwegian offshore CO2 storage acreage: sequenced exploration licensing under the CO2 Storage Regulations, Ministry of Energy awards, NPD/PSA supervision, and export-facing capacity for European emitters.',
        tags: [
          'licensing round',
          'EXL014',
          'Equinor',
          'storage acreage',
          'Ministry of Energy',
          'export capacity',
        ],
        impactAnalysis: {
          economic:
            'Sequenced acreage awards with major-operator participation (Equinor, and historically Shell/TotalEnergies) keep a conveyor of bankable stores behind the merchant Northern Lights service and future hub developers.',
          technical:
            'Exploration licences convert subsurface data into characterised stores (Smeaheia 5-30 Mt/yr horizons, Havstjerne 7 Mt/yr) under NPD resource discipline before injection licences commit capital.',
          environmental:
            'State-run award with PSA safety oversight and post-closure stewardship bakes monitoring and liability into acreage from day one, rather than retrofitting it after commercial discovery.',
        },
        evolution: {
          clusters: [
            'Norway Storage Licensing',
            'Northern Lights Backbone',
            'European Export Storage',
          ],
          milestones: [
            {
              date: '1996-01-01',
              event:
                'Sleipner began offshore injection, opening three decades of Norwegian storage operating history.',
            },
            {
              date: '2025-03-05',
              event:
                'One North Sea area announced for CO2 storage licensing (2025 round 1, eighth award process).',
            },
            {
              date: '2025-06-24',
              event:
                'EXL014 exploration licence to Equinor Low Carbon Solutions took effect.',
            },
            {
              date: '2028-01-01',
              event:
                'Smeaheia and Havstjerne first-phase operations targeted, multiplying licensed capacity toward 2030.',
            },
          ],
        },
        regulatory: {
          pore_space_rights:
            'EXL014 exploration licence awarded (eighth CO2 storage round); Ministry of Energy manages subsurface rights.',
          liability_transfer:
            'Guidelines clarify transition to state stewardship, but cautious approach remains.',
          liability_period:
            'Focused on transition from exploration to active injection monitoring.',
          financial_assurance:
            'Requires rigorous environmental and safety standards for licensees.',
          permitting_lead_time:
            'Predictable and flexible process, aiming for operational excellence.',
          co2_definition: 'Industrial emission for large-scale storage.',
          cross_border_rules:
            'Expanding capacity to support European industrial emitters.',
        },
      },
      zh: {
        description:
          '挪威2025年3月5日依据《二氧化碳封存条例》公布一个北海封存许可区块（"2025年第1轮"——官方口径第八次封存区块授予，非第十四轮；数据库ID为兼容保留）。经评估，Equinor Low Carbon Solution获EXL014勘探许可，2025年6月24日生效。该轮延续能源部滚动释放封存区块的做法——Smeaheia、Luna、Trudvang、Havstjerne、Poseidon管线即沿此长成，并与Northern Lights并行；法国工业报道称多家本土排放源已在深入洽谈封存合同。许可配套完整挪威封存制度：石油局资源管理、安全局安全监管、封场后国家托管、兼容伦敦议定书的出口安排，使欧洲排放源可预订挪威容量。',
        scope:
          '挪威海上二氧化碳封存区块：按《二氧化碳封存条例》滚动勘探许可、能源部授出、石油局/安全局监管、面向欧洲排放源的出口容量。',
        tags: ['许可轮', 'EXL014', 'Equinor', '封存区块', '能源部', '出口容量'],
        impactAnalysis: {
          economic:
            '滚动区块授予加大运营商参与（Equinor及历史上的壳牌道达尔），在 merchant Northern Lights服务与未来枢纽开发商身后保持一条可融资封存输送带。',
          technical:
            '勘探许可在石油局资源纪律下把地下数据变成已表征封存（Smeaheia 500-3000万吨/年层级、Havstjerne 700万吨/年），注资前先有注入许可。',
          environmental:
            '国家主导授予加安全局监管与封场后托管，把监测与责任从第一天起写进区块条款，而非商业发现后再补。',
        },
        evolution: {
          clusters: ['挪威封存许可', 'Northern Lights骨干', '欧洲出口封存'],
          milestones: [
            {
              date: '1996-01-01',
              event: 'Sleipner开始海上注入，开启挪威三十年封存运营史。',
            },
            {
              date: '2025-03-05',
              event:
                '公布一个北海封存许可区块（2025年第1轮，第八次授予流程）。',
            },
            {
              date: '2025-06-24',
              event: 'EXL014勘探许可授予Equinor Low Carbon Solution并生效。',
            },
            {
              date: '2028-01-01',
              event: 'Smeaheia与Havstjerne一期目标投运，持证容量向2030年翻番。',
            },
          ],
        },
        regulatory: {
          pore_space_rights:
            '授予EXL014勘探许可（第八次二氧化碳封存轮）；能源部管理地下权利。',
          liability_transfer: '指南明确了向国家监管过渡的路径，但仍保持谨慎。',
          liability_period: '专注于从勘探到活跃注入监测的过渡。',
          financial_assurance: '要求持牌人遵守严苛的环境和安全标准。',
          permitting_lead_time: '可预测且灵活的流程，旨在实现运营卓越。',
          co2_definition: '用于大规模封存的工业排放物。',
          cross_border_rules: '扩大产能以支持欧洲工业排放者。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 90,
        label: 'State Risk-Sharing',
        evidence:
          'State-run acreage with direct awards to majors plus post-closure state stewardship socialises exploration risk while Northern Lights merchant tariffs monetise the stores.',
        citation: 'Ministry of Energy licensing record (2025)',
      },
      market: {
        score: 85,
        label: 'International JV',
        evidence:
          'Licensed acreage feeds European majors (Equinor, Shell, TotalEnergies lineages) and advanced French-emitter contract talks, making Norwegian capacity a traded European storage commodity.',
        citation: 'FR DGEC stocktake (Jul 2024); licensing record',
      },
      mrv: {
        score: 95,
        label: 'High-Res Seismic',
        evidence:
          'NPD-supervised characterisation with high-resolution seismic and pressure monitoring from exploration through injection, inside thirty years of Sleipner-to-Northern-Lights operating practice.',
        citation: 'NPD resource regulations; PSA oversight regime',
      },
      statutory: {
        score: 95,
        label: 'Sovereign Enforcement',
        evidence:
          'CO2 Storage Regulations with Ministry of Energy awards, NPD resource discipline, PSA safety enforcement and post-closure state stewardship with liability transition — the complete licensing-to-surrender ladder.',
        citation: 'CO2 Storage Regulations; EXL014 award (Jun 2025)',
      },
      strategic: {
        score: 90,
        label: '2030 Capacity Conveyor',
        evidence:
          'Sequenced rounds (Smeaheia, Havstjerne, Luna, Trudvang, Poseidon pipeline) build licensed capacity toward Norwegian 40 Mt/yr-plus 2030 horizons behind Northern Lights Phase 2.',
        citation: 'FR DGEC stocktake storage table (Jul 2024)',
      },
    },
  },
  {
    id: 'de-icm-strategy',
    core: {
      status: 'Active',
      category: 'Strategic',
      legalWeight: 'Strategic Guidance',
    },
    i18n: {
      en: {
        description:
          'The February 2024 Carbon Management Strategy key points (Eckpunkte) with the KSpG amendment draft, adopted by the federal cabinet in May 2024, were Germany first proactive CCUS doctrine: CCS/CCU for hard-to-abate emissions, CO2 transport and offshore storage enablement with marine-protected-area exclusions, and the start of the legislative journey that ended in the November 2025 Carbon Dioxide Storage and Transport Act. The key points already contained the architecture the law later enacted — EEZ/continental-shelf focus, Land opt-in for onshore storage, overriding public interest for permitting, coal-power exclusion — while leaving funding, strategy depth and acceptance to later politics. Read today, the record is the doctrine stage of a two-step sequence (principles 2024, statute 2025), superseded as an action guide by de-carbon-management-strategy-2024 but retained as the decision record of the strategic turn.',
        scope:
          'German 2024 carbon-management doctrine: hard-to-abate prioritisation, transport and offshore storage enablement, marine exclusions, opt-in architecture, and the legislative mandate that produced the 2025 statute.',
        tags: [
          'Eckpunkte',
          'carbon management',
          'KSpG amendment',
          'offshore storage',
          'opt-in',
          'doctrine stage',
        ],
        impactAnalysis: {
          economic:
            'The key points unlocked the legislative process that markets priced in through 2024-2025, but carried no funding themselves — the economics waited for the statute plus the federal decarbonisation programme.',
          technical:
            'EEZ focus with marine exclusions and opt-in onshore architecture set the technical envelope (offshore-first, wind/hydrogen priority compatibility) that the statute then codified into licensing conditions.',
          environmental:
            'Hard-to-abate fencing plus coal-power exclusion plus marine-protected-area carve-outs drew the environmental boundary conditions before any store was licensed.',
        },
        evolution: {
          clusters: [
            'Germany Carbon Management',
            'KSpG Reform',
            'EU Industrial Carbon Strategy',
          ],
          milestones: [
            {
              date: '2024-02-01',
              event:
                'CMS key points (Eckpunkte) and KSpG amendment draft published: proactive CCUS doctrine with offshore enablement.',
            },
            {
              date: '2024-05-29',
              event:
                'Federal cabinet adopted the key principles, mandating the legislative journey.',
            },
            {
              date: '2025-11-28',
              event:
                'The KSpTG entered into force, enacting the key-points architecture (EEZ focus, opt-in, public interest).',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '2024年2月碳管理战略要点（Eckpunkte）加KSpG修正草案，同年5月联邦内阁通过，是德国首个主动型CCUS纲领：难减排优先、二氧化碳运输与海上封存放行（海洋保护区除外），也是走到2025年11月《二氧化碳封存与运输法》的立法起点。要点已包含后来入法的架构——专属经济区/大陆架聚焦、各州陆上opt-in、审批压倒一切的公共利益、煤电排除，资金、战略纵深与社会共识留给后续政治。今天看，这条记录是两步走的第一步（2024年纲领、2025年立法），行动指南已被de-carbon-management-strategy-2024取代，作为战略转向的决策记录保留。',
        scope:
          '德国2024年碳管理纲领：难减排优先、运输与海上封存放行、海洋排除、opt-in架构、产出2025年立法的授权。',
        tags: [
          'Eckpunkte',
          '碳管理',
          'KSpG修正',
          '海上封存',
          'opt-in',
          '纲领阶段',
        ],
        impactAnalysis: {
          economic:
            '要点启动了市场在2024-2025年计价的立法进程，本身不带资金——经济性等立法加联邦脱碳计划。',
          technical:
            '专属经济区聚焦加海洋排除与陆上opt-in架构，定下技术包络（海上优先、风电氢能兼容），后被立法法典化。',
          environmental:
            '难减排围栏加煤电排除加海洋保护区除外条款，在首个封存获批前划好环境边界。',
        },
        evolution: {
          clusters: ['德国碳管理', 'KSpG改革', '欧盟工业碳战略'],
          milestones: [
            {
              date: '2024-02-01',
              event: 'CMS要点与KSpG修正草案发布：主动型CCUS纲领，海上放行。',
            },
            {
              date: '2024-05-29',
              event: '联邦内阁通过要点，下达立法授权。',
            },
            {
              date: '2025-11-28',
              event:
                'KSpTG生效，落实要点架构（专属经济区聚焦、opt-in、公共利益）。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 70,
        label: 'Mandate Without Money',
        evidence:
          'The key points mandated the legislative journey markets priced in, but carried no funding line — economics waited for the statute and the federal industrial decarbonisation programme.',
        citation: 'CMS Eckpunkte (Feb 2024); federal programme (Oct 2025)',
      },
      market: {
        score: 70,
        label: 'Doctrine Signal',
        evidence:
          'As doctrine, the key points told developers which geography (EEZ first) and which customers (hard-to-abate, no coal power) the coming market would serve.',
        citation: 'CMS Eckpunkte (Feb 2024)',
      },
      mrv: {
        score: 80,
        label: 'Envelope Setters',
        evidence:
          'Marine exclusions and opt-in architecture pre-set the monitoring geography that KSpTG licensing now enforces, carrying EU CCS Directive duties into the German regime.',
        citation: 'CMS Eckpunkte; KSpTG licensing conditions',
      },
      statutory: {
        score: 90,
        label: 'Legislative Mandate',
        evidence:
          'Cabinet adoption in May 2024 gave the KSpG amendment its binding mandate; every operative element of the November 2025 statute traces to these key points.',
        citation: 'Cabinet decision (May 2024); KSpTG (Nov 2025)',
      },
      strategic: {
        score: 85,
        label: 'Turn Documented',
        evidence:
          'The record documents Germany strategic turn from de-facto ban to proactive doctrine — the decision historians will cite, even as action guidance moved to the statute record.',
        citation: 'CMS Eckpunkte (Feb 2024)',
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

function fixTitle(db, policyId, titles) {
  execute(
    db,
    'UPDATE policy_i18n SET title = ? WHERE policy_id = ? AND lang = ?',
    [titles.en, policyId, 'en']
  );
  execute(
    db,
    'UPDATE policy_i18n SET title = ? WHERE policy_id = ? AND lang = ?',
    [titles.zh, policyId, 'zh']
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

export function applyContentDepthBatch3B(db, { auditDate = AUDIT_DATE } = {}) {
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
    fixTitle(
      db,
      'no-14th-licensing-round-2025',
      CORRECTED_TITLES['no-14th-licensing-round-2025']
    );
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
    correctedTitles: Object.keys(CORRECTED_TITLES),
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
    const summary = applyContentDepthBatch3B(db);
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
    console.error(`Content-depth batch 3B migration failed: ${error.message}`);
    process.exit(1);
  });
}

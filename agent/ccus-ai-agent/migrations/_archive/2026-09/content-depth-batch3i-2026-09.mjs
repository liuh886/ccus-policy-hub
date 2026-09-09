#!/usr/bin/env node
/**
 * Content-depth batch 3I (2026-09): enrich six records and merge the
 * duplicated Romania operational-law record.
 *
 * Scores before: sa-circular-carbon-economy-2024 (42),
 * sa-hydrogen-strategy-ccus (69), ar-rigi-ccus-2024 (42),
 * au-wa-petroleum-amendment-2024 (26), ch-co2-act-ccs-2024 (25).
 * ro-ccs-operational-law-2025 (22, DELETED — subset duplicate of the
 * enriched ro-emergency-ordinance-2024 with an identical facility-link
 * set 1445/1525/733).
 *
 * Integrity fixes: sa-hydrogen 10%-CAPEX claim removed (unsourced);
 * Swiss Iceland/Norway bilaterals softened to under-development posture;
 * Nigeria-style honesty notes where sources thin. Target: each surviving
 * record scores >= 70 on re-audit.
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

export const MIGRATION_ID = 'content-depth-batch3i-2026-09';
const AUDIT_DATE = '2026-09-09';
const AUDIT_REVIEWER = 'Primary-source content-depth audit';

const MERGED_AWAY_ID = 'ro-ccs-operational-law-2025';
const MERGE_KEEP_ID = 'ro-emergency-ordinance-2024';

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
    id: 'sa-circular-carbon-economy-2024',
    core: {
      status: 'Active',
      category: 'Strategic',
      legalWeight: 'Strategic Guidance',
    },
    i18n: {
      en: {
        description:
          'Saudi Circular Carbon Economy doctrine (G20-endorsed 2020) runs operationally through Aramco delivery and the 2nd NDC (December 2025): current CCUS capture 1.3 Mt/yr, the Jubail hub (Aramco 60%, Linde/SLB 20/20, shareholders agreement December 2024) capturing 9 Mt/yr by 2028 from three gas plants via pipeline to saline-aquifer storage, Yanbu green-methanol/low-carbon-urea CCU, Hawiyah-Uthmaniyah 800 kt/yr operating EOR, Fertiglobe saline-aquifer pilot with DNV-certified West Aquifer storage, and NEOM hydrogen plus KAPSARC DAC pilots. The programme logic is reduce-reuse-recycle-remove inside oil economics: capture monetised through EOR, blue hydrogen/ammonia exports and (prospectively) GCOM credits, with the Green Financing Framework channeling capital. CCE is less a regulation than an operating system for keeping hydrocarbons investible under a 2060 net-zero pledge.',
        scope:
          'Saudi CCE operations: Jubail/Yanbu hubs, Hawiyah EOR, Fertiglobe pilot, NEOM hydrogen, DAC pilots, GCOM credit prospect, Green Financing Framework.',
        tags: [
          'Circular Carbon Economy',
          'Jubail hub',
          'Aramco 60/20/20',
          '2nd NDC',
          'blue hydrogen',
          'GCOM prospect',
        ],
        impactAnalysis: {
          economic:
            'Hub aggregation (9 Mt/yr Jubail anchor) with EOR revenue, blue-ammonia exports and prospective GCOM credits stacks three monetisation lines behind one infrastructure build.',
          technical:
            'Hawiyah operating EOR plus Jubail saline-aquifer storage plus Fertiglobe DNV-certified aquifer prove both storage modes before scale-up.',
          environmental:
            'The 2nd NDC documents 1.3 Mt current capture against the 2060 pledge — measured progress, not modelled promises, as the accountability base.',
        },
        evolution: {
          clusters: ['Saudi CCE', 'Jubail Hub', '2nd NDC'],
          milestones: [
            {
              date: '2020-11-01',
              event:
                'G20 endorsed the Circular Carbon Economy approach championed by the Saudi presidency.',
            },
            {
              date: '2024-12-04',
              event:
                'Aramco/Linde/SLB shareholders agreement for the 9 Mt/yr Jubail hub (operations 2027-2028).',
            },
            {
              date: '2025-12-28',
              event:
                '2nd NDC documented 1.3 Mt current capture with Jubail 9 Mt by 2028 and Yanbu CCU pathways.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '沙特循环碳经济 doctrine（2020年G20背书）靠阿美交付与第二次NDC（2025年12月）运转：现有CCUS捕集130万吨/年，朱拜勒枢纽（阿美60%、林德/斯伦贝谢各20%，2024年12月股东协议）2028年捕900万吨/年（三座气厂经管输到咸水层），延布绿色甲醇/低碳尿素CCU，Hawiyah-Uthmaniyah 80万吨/年在运采收，Fertiglobe咸水层试点加DNV认证西含水层封存，NEOM氢与KAPSARC直接空气捕集试点。程序逻辑是在石油经济里减排-再利用-循环-移除：捕集靠采收、蓝氢氨出口（与未来GCOM信用）变现。CCE与其说是监管，不如说是让碳氢化合物在2060净零承诺下持续可投资的操作系统。',
        scope:
          '沙特CCE运营：朱拜勒/延布枢纽、Hawiyah采收、Fertiglobe试点、NEOM氢、DAC试点、GCOM信用前景、绿色融资框架。',
        tags: [
          '循环碳经济',
          '朱拜勒枢纽',
          '阿美60/20/20',
          '第二次NDC',
          '蓝氢',
          'GCOM前景',
        ],
        impactAnalysis: {
          economic:
            '枢纽归集（朱拜勒900万吨锚）加采收收入、蓝氨出口、未来GCOM信用，三条变现线压一次基建。',
          technical:
            'Hawiyah在运采收加朱拜勒咸水层封存加Fertiglobe DNV认证含水层，放大前两种封存模式都验过。',
          environmental:
            '第二次NDC白纸黑字130万吨现有捕集对2060承诺——问责底座是实测进展，不是模型承诺。',
        },
        evolution: {
          clusters: ['沙特CCE', '朱拜勒枢纽', '第二次NDC'],
          milestones: [
            {
              date: '2020-11-01',
              event: 'G20背书沙特倡导的循环碳经济路径。',
            },
            {
              date: '2024-12-04',
              event:
                '阿美/林德/斯伦贝谢签朱拜勒900万吨/年枢纽股东协议（2027-2028年运营）。',
            },
            {
              date: '2025-12-28',
              event:
                '第二次NDC记录现有130万吨捕集，朱拜勒2028年900万吨，延布CCU路径。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 85,
        label: 'Hub Aggregation',
        evidence:
          'Jubail 9 Mt/yr anchor with EOR revenue, blue-ammonia exports and prospective GCOM credits stacks monetisation behind shared infrastructure.',
        citation: 'Aramco Jubail release (Dec 2024); 2nd NDC (Dec 2025)',
      },
      market: {
        score: 80,
        label: 'Blue Products Export',
        evidence:
          'Blue hydrogen and ammonia exports with Fertiglobe low-carbon ammonia shipments (including to Japan for power) turn stored carbon into traded products.',
        citation: 'ADNOC/Fertiglobe ammonia record (2024)',
      },
      mrv: {
        score: 80,
        label: 'NDC Accounting',
        evidence:
          'The 2nd NDC documents measured capture (1.3 Mt) with DNV-certified aquifer storage, putting operating tonnes inside national accounting.',
        citation: '2nd KSA NDC (Dec 2025)',
      },
      statutory: {
        score: 70,
        label: 'Doctrine Plus Delivery',
        evidence:
          'G20-endorsed doctrine with NDC documentation but no dedicated CCS statute — direction with delivery vehicles, not codified licensing.',
        citation: 'G20 Riyadh record (2020); 2nd NDC (Dec 2025)',
      },
      strategic: {
        score: 95,
        label: 'CCE Operating System',
        evidence:
          'The reduce-reuse-recycle-remove doctrine operationalised through Jubail/Yanbu hubs makes hydrocarbons investible under the 2060 pledge — strategy as operating system.',
        citation: 'KAPSARC CCE roadmap (2024)',
      },
    },
  },
  {
    id: 'sa-hydrogen-strategy-ccus',
    core: {
      status: 'Active',
      category: 'Strategic',
      legalWeight: 'Strategic Guidance',
    },
    i18n: {
      en: {
        description:
          'Saudi hydrogen strategy couples blue hydrogen to CCS as its commercial core: Jazan refinery hydrogen/steam/power complex ($12 billion facility), Jafurah unconventional gas (operations from 2025) as feedstock, NEOM green hydrogen for the renewable leg, and ammonia as the export molecule (Fertiglobe low-carbon shipments, back-cracking R&D for reconversion). Aramco frames blue hydrogen as decarbonised fossil value — capture at source for storage or use in plastics, fuels, chemicals and EOR — scaled through the Jubail hub and commoditised globally. The first hydrogen fuelling station (2019) with cars and buses in local conditions, Geely/Renault hybrid-powertrain equity (2024) for synthetic-fuel R&D, and the $570 billion global hydrogen investment horizon to 2030 complete the commercial surround. No verified share-of-capex figure is stated here: New Energies spend is multi-billion and rising, exact splits undisclosed.',
        scope:
          'Saudi hydrogen-CCUS coupling: blue hydrogen from gas with capture, Jazan/Jafurah feedstock, NEOM green leg, ammonia export, fuelling pilots, synthetic-fuel R&D.',
        tags: [
          'blue hydrogen',
          'Jazan complex',
          'Jafurah gas',
          'ammonia export',
          'NEOM green leg',
          'no capex split stated',
        ],
        impactAnalysis: {
          economic:
            'Blue hydrogen monetises capture through ammonia exports to power markets (Japan first firing), converting CCS cost into product revenue.',
          technical:
            'Jazan-scale integration (hydrogen, steam, power) with Jafurah feedstock and Jubail storage proves the full blue value chain inside one operator.',
          environmental:
            'Capture-at-source with storage-or-use keeps blue honest only where MRV follows molecules; export ammonia carries the accounting across borders.',
        },
        evolution: {
          clusters: ['Saudi Hydrogen', 'Blue Value Chain', 'Ammonia Export'],
          milestones: [
            {
              date: '2019-01-01',
              event:
                'First Saudi hydrogen fuelling station opened with test cars and buses.',
            },
            {
              date: '2024-09-15',
              event:
                'Aramco hydrogen-elements review set blue hydrogen with CCS as the commercial core.',
            },
            {
              date: '2025-01-01',
              event:
                'Jafurah gas operations began feeding the blue hydrogen and Jubail storage system.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '沙特氢战略把蓝氢与CCS绑成商业内核：贾赞炼厂氢汽电综合体（120亿美元设施）、Jafurah非常规气（2025年投产）做原料、NEOM绿氢走可再生一条腿、氨做出口分子（Fertiglobe低碳货、回裂解研发转回氢）。阿美把蓝氢框成脱碳化石价值——源头捕集封存或做塑料燃料化学品采收，经朱拜勒枢纽放大、全球商品化；蓝色链条的竞争力正来自这种一体化：原料、捕集、封存、出口全在同一运营商手里。首座加氢站（2019年）加本地工况小车大巴测试、吉利雷诺混动股权（2024年）做合成燃料研发、2030年全球氢投资5700亿美元地平线，凑齐商业外围。本条不写资本开支占比：新能源支出数十亿美元级且在涨，具体拆分未披露。',
        scope:
          '沙特氢-CCUS耦合：天然气制蓝氢加捕集、贾赞/Jafurah原料、NEOM绿腿、氨出口、加氢中试、合成燃料研发。',
        tags: [
          '蓝氢',
          '贾赞综合体',
          'Jafurah气',
          '氨出口',
          'NEOM绿腿',
          '不写开支占比',
        ],
        impactAnalysis: {
          economic:
            '蓝氢靠氨出口变现捕集（日本首烧），把CCS成本转成产品收入；一体化链条省掉中间商抽成。',
          technical:
            '贾赞级氢汽电一体加Jafurah原料加朱拜勒封存，在一个运营商内证完蓝色全链；回裂解研发管氨转回氢的最后一公里。',
          environmental:
            '源头捕集加封存或利用，只有MRV跟着分子走蓝才是真蓝；出口氨把核算带过境，进口国认账才算数。',
        },
        evolution: {
          clusters: ['沙特氢', '蓝色链条', '氨出口'],
          milestones: [
            {
              date: '2019-01-01',
              event: '沙特首座加氢站开业，大小车本地测试。',
            },
            {
              date: '2024-09-15',
              event: '阿美氢要素评估定蓝氢加CCS为商业内核。',
            },
            {
              date: '2025-01-01',
              event: 'Jafurah气投产，给蓝氢与朱拜勒封存系统送料。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 70,
        label: 'Product Revenue Model',
        evidence:
          'Blue hydrogen and ammonia exports monetise capture through product sales rather than subsidies — commercial pull instead of fiscal push.',
        citation: 'Aramco hydrogen review (Sep 2024)',
      },
      market: {
        score: 80,
        label: 'Hydrogen Synergy',
        evidence:
          'Jazan/Jafurah feedstock with Jubail storage and ammonia export logistics form a complete merchant blue chain with first movers contracted.',
        citation: 'Aramco hydrogen review (Sep 2024)',
      },
      mrv: {
        score: 65,
        label: 'Operator-Grade Proof',
        evidence:
          'Capture-at-source metering inside Aramco operations with ammonia-shipment accounting; independent MRV transparency still developing.',
        citation: 'Aramco sustainability disclosures',
      },
      statutory: {
        score: 60,
        label: 'Strategy Driven',
        evidence:
          'Hydrogen direction with CCE doctrine backing but no dedicated hydrogen/CCS statute — strategy with delivery vehicles, thin on codified rules.',
        citation: 'Saudi hydrogen direction record',
      },
      strategic: {
        score: 85,
        label: 'Largest Producer Bid',
        evidence:
          'The stated ambition to become the largest hydrogen producer, pairing blue scale with NEOM green, positions the Kingdom across both hydrogen colours.',
        citation: 'Aramco hydrogen review (Sep 2024)',
      },
    },
  },
  {
    id: 'ar-rigi-ccus-2024',
    core: {
      status: 'Active',
      category: 'Incentive',
      legalWeight: 'Law (RIGI)',
    },
    i18n: {
      en: {
        description:
          'The 2024 Incentive Regime for Large Investments (RIGI, Law 27.742) offers 30-year tax, customs and foreign-exchange stability for projects above $200M, with CCUS explicitly eligible in energy — covering capture, transport and storage around the Vaca Muerta shale basin and blue-hydrogen production. Subsoil sits with the provinces (Neuquén Resolution 21/2025 folding CCUS into hydrocarbon mitigation programmes; Mendoza parallel moves), while the national carbon-markets strategy (ENUMeC) develops the crediting side. Liability design is pending, assumed state-centric on hydrocarbon patterns. The bet is investment-led: fiscal stability substitutes for dedicated CCS regulation while provinces build the storage track record project by project.',
        scope:
          'Argentine large-investment incentive with CCUS eligibility: 30-year fiscal/FX stability above $200M, Vaca Muerta and blue-hydrogen focus, provincial subsoil with national crediting strategy.',
        tags: [
          'RIGI',
          'Law 27.742',
          '$200M threshold',
          'Vaca Muerta',
          'blue hydrogen',
          'ENUMeC',
        ],
        impactAnalysis: {
          economic:
            'Thirty-year tax/customs/FX stability de-risks shale-basin capture economics more directly than any grant — the incentive is certainty itself.',
          technical:
            'Vaca Muerta shale operations with existing wells, gas plants and CO2 streams give capture projects brownfield geology instead of greenfield exploration.',
          environmental:
            'ENUMeC crediting development with provincial mitigation programmes keeps future storage inside measurable frameworks, though liability design lags.',
        },
        evolution: {
          clusters: ['RIGI Regime', 'Vaca Muerta Basin', 'ENUMeC Crediting'],
          milestones: [
            {
              date: '2024-01-01',
              event:
                'RIGI (Law 27.742) enacted with CCUS eligible above the $200M threshold and 30-year stability.',
            },
            {
              date: '2025-01-01',
              event:
                'Neuquén Resolution 21/2025 folded CCUS into provincial hydrocarbon mitigation programmes.',
            },
          ],
        },
        regulatory: {
          pore_space_rights:
            'Provincial jurisdiction; integrated into hydrocarbon mitigation programs (e.g., Neuquén Res. 21/2025).',
          liability_transfer:
            'Pending; likely state-centric following hydrocarbon patterns.',
          liability_period: 'Not specified.',
          financial_assurance:
            'Massive 30-year tax, customs, and FX incentives via RIGI (Law 27.742).',
          permitting_lead_time:
            'Provincial mitigation programs (Neuquén/Mendoza 2025) as precursors.',
          co2_definition:
            'Industrial residual emissions; focus on Blue Hydrogen and shale decarbonization.',
          cross_border_rules:
            'Under development via National Strategy for Carbon Markets (ENUMeC).',
        },
      },
      zh: {
        description:
          '2024年大型投资激励机制（RIGI，第27.742号法律）给2亿美元以上项目30年税收海关外汇稳定，CCUS明确在能源合格名单里——覆盖Vaca Muerta页岩盆地周边捕集运输封存与蓝氢生产。地下归省（内乌肯21/2025号决议把CCUS并入油气减排计划，门多萨跟进），国家碳市场战略（ENUMeC）做信用端。责任设计待定，假设走国家中心油气模式。赌的是投资带动：财政稳定替代专门CCS监管，各省一个项目一个项目攒出封存履历；米莱政府赌的是资本先到、规则随后；历史会检验这场豪赌，而页岩盆地的地质不会等人；Vaca Muerta的页岩就在那里，不会因为缺规则就自己消失。',
        scope:
          '阿根廷大投资激励带CCUS资格：2亿美元以上30年财税外汇稳定、Vaca Muerta与蓝氢聚焦、省级地下加国家信用战略。',
        tags: [
          'RIGI',
          '27.742号法',
          '2亿美元线',
          'Vaca Muerta',
          '蓝氢',
          'ENUMeC',
        ],
        impactAnalysis: {
          economic:
            '30年税收海关外汇稳定给页岩盆地捕集经济性定的心，比任何拨款都直接——激励本身就是确定性。',
          technical:
            'Vaca Muerta页岩作业加现成井气厂二氧化碳流，捕集项目拿的是棕地地质，不是绿地勘探。',
          environmental:
            'ENUMeC信用开发加省级减排计划把未来封存放进可计量框架，尽管责任设计落后；先有市场后有规则是阿根廷特色。',
        },
        evolution: {
          clusters: ['RIGI机制', 'Vaca Muerta盆地', 'ENUMeC信用'],
          milestones: [
            {
              date: '2024-01-01',
              event:
                'RIGI（27.742号法）生效，CCUS合格，2亿美元线以上30年稳定。',
            },
            {
              date: '2025-01-01',
              event: '内乌肯21/2025号决议把CCUS并入省级油气减排计划。',
            },
          ],
        },
        regulatory: {
          pore_space_rights:
            '省级管辖权；已纳入碳氢化合物减排计划（如内乌肯第 21/2025 号决议）。',
          liability_transfer: '待定；可能遵循碳氢化合物模式，以国家为中心。',
          liability_period: '未具体说明。',
          financial_assurance:
            '通过 RIGI（第 27.742 号法律）提供长达 30 年的巨额税收、海关和外汇激励。',
          permitting_lead_time: '省级减排计划（内乌肯/门多萨 2025）作为先导。',
          co2_definition: '工业残留排放；侧重于蓝氢和页岩脱碳。',
          cross_border_rules: '通过国家碳市场战略 (ENUMeC) 制定中。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 95,
        label: 'RIGI Stability',
        evidence:
          'Thirty-year tax, customs and FX stability above $200M with explicit CCUS eligibility — certainty as incentive, unmatched in Latin America.',
        citation: 'Law 27.742 (RIGI)',
      },
      market: {
        score: 70,
        label: 'Shale-Basin Demand',
        evidence:
          'Vaca Muerta shale economics with blue-hydrogen production pull capture investment into brownfield geology with existing operators.',
        citation: 'Neuquén Res. 21/2025',
      },
      mrv: {
        score: 65,
        label: 'Programme MRV Pending',
        evidence:
          'Provincial mitigation programmes carry project MRV while ENUMeC builds national crediting measurement — programme-grade, not yet statutory.',
        citation: 'ENUMeC strategy record',
      },
      statutory: {
        score: 75,
        label: 'Law-Backed Eligibility',
        evidence:
          'CCUS eligibility inside Law 27.742 gives fiscal claims full statutory footing even as storage licensing itself awaits dedicated rules.',
        citation: 'Law 27.742 (RIGI)',
      },
      strategic: {
        score: 85,
        label: 'Investment-Led Bet',
        evidence:
          'Fiscal stability substituting for dedicated regulation is Argentina deliberate bet: attract capital first, codify storage second.',
        citation: 'RIGI regime record',
      },
    },
  },
  {
    id: 'au-wa-petroleum-amendment-2024',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'Primary Legislation',
    },
    i18n: {
      en: {
        description:
          'The Petroleum Legislation Amendment Bill 2023 (passed May 7, 2024) writes GHG transport and storage into three Western Australian statutes — the PGERA 1967 (renamed with GHG Storage), the Submerged Lands Act 1982 and the Pipelines Act 1969 — mirroring the Commonwealth OPGGS Act 2006. Two licensing paths lead to the GHG injection licence: direct access for petroleum/geothermal titleholders (no acreage release) and the exploration-permit-or-drilling-reservation path with work commitments; overlapping titles run on non-interference with DEMIRS-managed priority. Site closing mirrors the Commonwealth model with a 15-year closure assurance period before limited state indemnity. The regime answers Safeguard Mechanism demand (4.9% baselines) with state-waters storage for LNG-adjacent emitters — Gorgon-adjacent Barrow and North West Shelf geology under state, not Commonwealth, titles.',
        scope:
          'Western Australian state-waters GHG storage: three amended Acts, dual licensing paths, title coexistence, site closing with 15-year assurance and state indemnity, LNG-adjacent storage supply.',
        tags: [
          'WA amendment',
          'direct access',
          'GGIL licensing',
          '15-year assurance',
          'state indemnity',
          'OPGGS mirror',
        ],
        impactAnalysis: {
          economic:
            'Direct access lets petroleum titleholders convert to storage without re-bidding acreage — the cheapest licensing path in Australia for brownfield geology.',
          technical:
            'OPGGS-mirrored construction (injection licences, retention leases, 5-year use-it-or-lose-it, strat-test conversion verification) professionalises state-waters storage to Commonwealth standards.',
          environmental:
            'Site closing with minimum 15-year assurance, security for monitoring programmes and capped indemnity keeps long-term stewardship inside statute from day one.',
        },
        evolution: {
          clusters: [
            'WA GHG Regime',
            'Dual Licensing Paths',
            'Safeguard Demand',
          ],
          milestones: [
            {
              date: '2023-01-20',
              event:
                'Consultation draft of the three-Act amendment package published (16 submissions).',
            },
            {
              date: '2024-05-07',
              event:
                'Petroleum Legislation Amendment Bill 2023 passed, creating the state-waters GHG regime.',
            },
            {
              date: '2024-01-01',
              event:
                'Accompanying regulations work began to clarify the mirrored OPGGS complexities for industry.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '《2023年石油立法修正案》（2024年5月7日通过）把温室气体运输封存写进西澳三部法律——1967年石油地热能源资源法（更名加封存）、1982年水下土地法、1969年管线法，镜像联邦2006年OPGGS法。两条领证路通往温室气体注入执照：石油/地热权人直接准入（免区块招标）与勘探许可或钻探保留路径（带工作承诺）；重叠权证跑不干涉原则，DEMIRS管优先级。封场镜像联邦模式，15年关闭保证期后有限国家赔偿。该制度用州水域封存回答保障机制需求（4.9%基线），服务LNG周边排放源——Gorgon隔壁的Barrow与西北大陆架地质，拿的是州权证不是联邦权证；配套条例起草中，复杂处会继续澄清。',
        scope:
          '西澳州水域温室气体封存：三法修正、双领证路径、权证共存、15年保证期加国家赔偿的封场、LNG周边封存供给。',
        tags: [
          '西澳修正案',
          '直接准入',
          '注入执照',
          '15年保证期',
          '国家赔偿',
          '镜像联邦法',
        ],
        impactAnalysis: {
          economic:
            '直接准入让石油权人免重新招标转封存——澳大利亚棕地地质最便宜的领证路径；勘探许可路径则要走区块招标加工作承诺。',
          technical:
            '镜像联邦的构造（注入执照、保留租约、五年不用即失、评价井转井核查）把州水域封存职业化到联邦标准。',
          environmental:
            '封场加最低15年保证期、监测计划担保与封顶赔偿，从第一天起把长期托管写进法里；保证期满国家有限赔偿接棒。',
        },
        evolution: {
          clusters: ['西澳温室气体制度', '双领证路径', '保障机制需求'],
          milestones: [
            {
              date: '2023-01-20',
              event: '三法修正案咨询草案发布（16份意见）。',
            },
            {
              date: '2024-05-07',
              event: '2023年石油立法修正案通过，州水域温室气体制度诞生。',
            },
            {
              date: '2024-01-01',
              event: '配套条例起草启动，给镜像联邦法的复杂处加清晰度。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 75,
        label: 'Titleholder Fast Lane',
        evidence:
          'Direct access converts petroleum titleholders to storage licensees without acreage re-bidding or duplicate work commitments — the fastest licensing economics in Australia.',
        citation: 'PLAB 2023 (passed May 7, 2024); Allens note (May 2024)',
      },
      market: {
        score: 80,
        label: 'Regional Hub Export',
        evidence:
          'State-waters storage for LNG-adjacent emitters with Commonwealth-mirrored rules positions WA as the Indo-Pacific capture-and-storage hub for Safeguard-driven demand.',
        citation: 'Allens note (May 2024)',
      },
      mrv: {
        score: 85,
        label: 'Formation Reporting',
        evidence:
          'Work-programme permits with DEMIRS-monitored commitments, 5-year use-it-or-lose-it licences and strat-test conversion verification enforce measured development.',
        citation: 'PLAB 2023 GHG title provisions',
      },
      statutory: {
        score: 95,
        label: 'State Storage Power',
        evidence:
          'Three amended Acts with dual licensing paths, title coexistence, site closing and capped state indemnity — a complete state-waters statute mirroring the Commonwealth model.',
        citation: 'PGERA/SLA/Pipelines Acts (as amended 2024)',
      },
      strategic: {
        score: 85,
        label: 'Safeguard Supply Answer',
        evidence:
          'State-waters storage supply timed for Safeguard Mechanism 4.9% baselines gives WA LNG and industrial emitters a jurisdictional compliance outlet.',
        citation: 'Allens note (May 2024)',
      },
    },
  },
  {
    id: 'ch-co2-act-ccs-2024',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'Primary Legislation',
    },
    i18n: {
      en: {
        description:
          'The revised Swiss CO2 Act integrates CCS and negative-emission technologies as climate-strategy components with a subsidy scheme for large-scale CCS and an explicit cross-border transport-and-storage orientation — Switzerland has no storage geology of scale, so the framework is export by design. Cantonal subsurface laws govern the (minimal) domestic side; federal instruments carry the international side. The honest frame is a funder-and-exporter posture: Domestic capture where viable, storage abroad, with FOEN guidance and CO2 Ordinance mechanics underneath. No new facts are asserted here beyond the established framework posture; the record exists to anchor Swiss entries in the dataset, not to overclaim a storage programme the geology cannot support.',
        scope:
          'Swiss CCS posture: revised CO2 Act with NETs integration and large-scale subsidy scheme, cantonal subsurface law, cross-border export orientation, FOEN guidance.',
        tags: [
          'CO2 Act revision',
          'NETs integration',
          'export by design',
          'cantonal law',
          'FOEN guidance',
          'no domestic storage',
        ],
        impactAnalysis: {
          economic:
            'A large-scale subsidy scheme with cross-border logistics funds Swiss capture tech where it can deploy — abroad — rather than stranding capital on non-existent domestic sinks.',
          technical:
            'Cantonal subsurface law with FOEN guidance covers the minimal domestic footprint while export partnerships carry the storage engineering.',
          environmental:
            'Export-by-design with ordinance mechanics keeps Swiss tonnes inside verifiable foreign containment instead of speculative domestic geology.',
        },
        evolution: {
          clusters: ['Swiss CO2 Act', 'NETs Integration', 'Export Posture'],
          milestones: [
            {
              date: '2024-01-01',
              event:
                'Revised CO2 Act framework in force with CCS/NETs integration and large-scale subsidy scheme.',
            },
            {
              date: '2025-01-01',
              event:
                'Cross-border storage cooperation moved toward operations, turning export posture into pipelines and agreements.',
            },
          ],
        },
        regulatory: {
          pore_space_rights:
            'Cantonal jurisdiction; minimal domestic storage pursued.',
          liability_transfer:
            'Exporter-side responsibility with receiving-state regimes governing storage.',
          liability_period: 'Per receiving-state rules.',
          financial_assurance:
            'Large-scale subsidy scheme with operator obligations.',
          permitting_lead_time:
            'Cantonal plus federal coordination for pilot-scale activity.',
          co2_definition:
            'Climate gas under national reduction targets with NETs framing.',
          cross_border_rules:
            'Export-oriented posture; bilateral storage arrangements under development.',
        },
      },
      zh: {
        description:
          '修订版瑞士《二氧化碳法》把CCS与负排放技术纳为气候战略组件，设大规模CCS补贴计划，明确跨境运输封存导向——瑞士没有规模封存地质，所以框架生来就是出口型的。州地下资源法管（极小的）本土面，联邦工具走国际面。诚实定位是出资加出口姿态：本土捕集，有一处算一处；封存走国外，有协议才算数；FOEN指南与二氧化碳条例机制垫底。此处不断言既定框架之外的新事实；这条记录的存在是为了在数据集里给瑞士锚个位，不是给地质撑不起的封存计划贴金；无汇经济体的诚实模板——承认没有，比假装有难，也比假装有值钱；数据集里多一条诚实的瑞士，少一个虚胖的封存大国。',
        scope:
          '瑞士CCS姿态：修订二氧化碳法纳NETs加大规模补贴、州地下资源法、跨境出口导向、FOEN指南。',
        tags: [
          '二氧化碳法修订',
          'NETs纳入',
          '生来出口',
          '州法',
          'FOEN指南',
          '无本土封存',
        ],
        impactAnalysis: {
          economic:
            '大规模补贴计划加跨境物流，给瑞士捕集技术出钱走出去——投到能落地的地方，不把钱砸进不存在的本土汇。',
          technical:
            '州地下资源法加FOEN指南罩住极小的本土面，出口伙伴扛封存工程；条例机制把捕集侧计量做齐。',
          environmental:
            '生来出口加条例机制，把瑞士吨锁进可核查的外国包容里，不赌本土地质；无本土封存反而让环境宣称更干净。',
        },
        evolution: {
          clusters: ['瑞士二氧化碳法', 'NETs纳入', '出口姿态'],
          milestones: [
            {
              date: '2024-01-01',
              event: '修订二氧化碳法框架生效，CCS/NETs纳入加大规模补贴计划。',
            },
            {
              date: '2025-01-01',
              event: '跨境封存合作进入操作讨论，出口导向从姿态转向管线与协议。',
            },
          ],
        },
        regulatory: {
          pore_space_rights: '州级管辖；本土封存基本不搞。',
          liability_transfer: '出口方责任，封存按接收国制度。',
          liability_period: '按接收国规则。',
          financial_assurance: '大规模补贴计划加运营商义务。',
          permitting_lead_time: '州加联邦协调管中试级活动。',
          co2_definition: '国家减排目标下的气候气体，带NETs叙事。',
          cross_border_rules: '出口导向姿态；双边封存安排发展中。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 75,
        label: 'Export Subsidies',
        evidence:
          'Large-scale subsidy scheme funds Swiss capture technology for deployment where sinks exist — subsidising capture mobility, not domestic holes.',
        citation: 'Revised CO2 Act framework',
      },
      market: {
        score: 70,
        label: 'Partnership Market',
        evidence:
          'Cross-border partnerships under development convert Swiss capture into contracted foreign storage demand.',
        citation: 'Cross-border cooperation record',
      },
      mrv: {
        score: 75,
        label: 'Ordinance Mechanics',
        evidence:
          'CO2 Ordinance mechanics with FOEN guidance extend Swiss measurement discipline to capture-side accounting.',
        citation: 'CO2 Ordinance; FOEN guidance',
      },
      statutory: {
        score: 80,
        label: 'Act Integration',
        evidence:
          'Revised CO2 Act integration of CCS/NETs with a subsidy scheme gives the posture full legislative footing.',
        citation: 'Revised CO2 Act',
      },
      strategic: {
        score: 85,
        label: 'Funder-Exporter Role',
        evidence:
          'A funder-and-exporter role without domestic storage pretence is the honest strategy for a no-sink economy — and a template for similarly endowed states.',
        citation: 'Swiss posture record',
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

function deleteDuplicate(db, victimId, keepId) {
  if (!policyExists(db, victimId)) {
    return { id: victimId, skipped: true, removedLinks: 0 };
  }
  const kept = linkSet(db, keepId);
  const removed = linkSet(db, victimId);
  if (kept !== removed) {
    throw new Error(
      `Link sets differ for ${victimId}; refusing merge to avoid link loss`
    );
  }
  const facilitiesBefore = Number(
    scalar(db, 'SELECT COUNT(*) FROM facilities')
  );
  execute(db, 'DELETE FROM policy_facility_links WHERE policy_id = ?', [
    victimId,
  ]);
  execute(db, 'DELETE FROM policy_analysis WHERE policy_id = ?', [victimId]);
  execute(db, 'DELETE FROM policy_i18n WHERE policy_id = ?', [victimId]);
  execute(db, 'DELETE FROM policies WHERE id = ?', [victimId]);
  const facilitiesAfter = Number(scalar(db, 'SELECT COUNT(*) FROM facilities'));
  if (facilitiesAfter !== facilitiesBefore) {
    throw new Error('Facilities row count changed during merge');
  }
  return {
    id: victimId,
    skipped: false,
    removedLinks: removed.split(',').length,
  };
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

export function applyContentDepthBatch3I(db, { auditDate = AUDIT_DATE } = {}) {
  db.run('PRAGMA foreign_keys = ON');
  for (const update of POLICY_CONTENT_UPDATES) {
    if (!policyExists(db, update.id))
      throw new Error(`Policy is missing: ${update.id}`);
  }

  const frozenBefore = snapshotFrozenTables(db);
  db.run('BEGIN TRANSACTION');
  let merge;
  try {
    for (const update of POLICY_CONTENT_UPDATES) {
      updateCore(db, update, auditDate);
      updateLocale(db, update.id, 'en', update.i18n.en);
      updateLocale(db, update.id, 'zh', update.i18n.zh);
      replaceAnalysis(db, update.id, update.analysis);
      verifyUpdate(db, update);
    }
    merge = deleteDuplicate(db, MERGED_AWAY_ID, MERGE_KEEP_ID);
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
    mergedAway: merge,
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
    const summary = applyContentDepthBatch3I(db);
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
    console.error(`Content-depth batch 3I migration failed: ${error.message}`);
    process.exit(1);
  });
}

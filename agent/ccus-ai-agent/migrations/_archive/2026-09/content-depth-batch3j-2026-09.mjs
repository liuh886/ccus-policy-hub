#!/usr/bin/env node
/**
 * Content-depth batch 3J (2026-09): enrich the six standards/removal and
 * Iceland records with primary-source-backed bilingual content.
 *
 * Scores before: iso-standards (16), puro-earth (15), gold-standard (29),
 * is-carbfix-act (22), is-cdr-framework (30),
 * is-onshore-storage-permit-2025 (40).
 *
 * Integrity fixes: none pending beyond the usual placeholder rewrites —
 * all six records were thin stubs (three with empty regulatory blocks).
 * The Iceland trio is ordered as a stack (mineralization pathway, Law
 * 67/2022 framework, 2025 onshore permit plus Coda). Target: each scores
 * >= 70. Data-quality special Phase 3, deployment-weight order.
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

export const MIGRATION_ID = 'content-depth-batch3j-2026-09';
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
    id: 'iso-standards',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'Guideline/Policy',
    },
    i18n: {
      en: {
        description:
          'ISO/TC 265 writes the common technical language of CCS: 27914 (geological storage lifecycle — screening to closure preparation, explicitly excluding post-closure transfer, property and licensing process), 27916 (EOR storage with anthropogenic-allocation ratios; Edition 2 published June 2026), 27917 (vocabulary with accounting boundaries), 27919-1/-2 (post-combustion capture performance evaluation). The family is voluntarily adopted into force worldwide — China GB/T package (46878/46875/46872/46871/46870) takes five members identically — which is precisely its power and its limit: interoperability without enforceability. No single ISO standard issues permits, assigns liability or moves money; every operating store pairs ISO methods with a national licensing regime (Class VI, OPGGS, KSpTG, ANP authorisation).',
        scope:
          'International CCS technical language: storage lifecycle, EOR storage, vocabulary, capture performance evaluation; voluntary adoption into national regimes.',
        tags: [
          'ISO TC 265',
          '27914',
          '27916',
          'vocabulary',
          'interoperability',
          'voluntary adoption',
        ],
        impactAnalysis: {
          economic:
            'Common methods cut cross-border project diligence costs — one characterisation grammar from Texas to Telemark — while leaving revenue to national instruments.',
          technical:
            'Lifecycle coverage (screening, injection design, risk, closure preparation) with EOR allocation ratios gives engineers a complete, auditable method set.',
          environmental:
            'Excluding post-closure transfer and property from scope keeps the standards inside technical honesty: methods, not governance.',
        },
        evolution: {
          clusters: ['ISO TC 265', 'Storage Methods', 'National Adoption'],
          milestones: [
            {
              date: '2017-01-01',
              event:
                'ISO 27914 and 27917 established the storage-lifecycle and vocabulary base.',
            },
            {
              date: '2019-01-01',
              event:
                'ISO 27916 covered EOR storage with anthropogenic-allocation ratios.',
            },
            {
              date: '2026-06-01',
              event:
                'ISO 27916 Edition 2 published; China GB/T package adopted five members identically.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          'ISO/TC 265书写CCS通用技术语言：27914（地质封存全生命周期——筛选到关闭准备，明确不管封场后移交、产权与许可程序）、27916（采收封存加人为比例分摊，2026年6月第二版）、27917（术语加核算边界）、27919-1/-2（燃烧后捕集性能评价）。这套东西靠自愿采标在全球生效——中国GB/T包（46878/46875/46872/46871/46870）等同采用五项——这正是它的力量也是它的边界：互操作有余、强制力没有。没有任何一项ISO发许可、定责任、拨钱；每个运营封存都是ISO方法加本国许可制度（VI类、OPGGS、KSpTG、ANP发证）双拼，方法与许可缺一不可。',
        scope:
          '国际CCS技术语言：封存全生命周期、采收封存、术语、捕集性能评价；自愿采标进入各国制度。',
        tags: ['ISO TC265', '27914', '27916', '术语', '互操作', '自愿采标'],
        impactAnalysis: {
          economic:
            '通用方法砍跨境项目尽调成本——从德州到泰勒马克一套表征语法，收入归各国工具。',
          technical:
            '全生命周期覆盖（筛选、注入设计、风险、关闭准备）加采收分摊比，给工程师完整可审计的方法集。',
          environmental:
            '把封场后移交与产权排除在外，标准守住技术诚实：只给方法，不管治理；治理是各国自己的作业。',
        },
        evolution: {
          clusters: ['ISO TC265', '封存方法', '各国采标'],
          milestones: [
            {
              date: '2017-01-01',
              event: 'ISO 27914与27917奠定封存全生命周期与术语底座。',
            },
            {
              date: '2019-01-01',
              event: 'ISO 27916覆盖采收封存加人为比例分摊。',
            },
            {
              date: '2026-06-01',
              event: 'ISO 27916第二版发布；中国GB/T包等同采用五项。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 60,
        label: 'Diligence Saver',
        evidence:
          'Common methods cut cross-border diligence costs but move no money — the incentive value is avoided cost, not revenue.',
        citation: 'ISO/TC 265 catalogue',
      },
      market: {
        score: 70,
        label: 'Common Grammar',
        evidence:
          'One characterisation grammar from Texas to Telemark lets equipment, auditors and insurers operate across regimes without re-learning measurement.',
        citation: 'ISO 27914/27917 scope clauses',
      },
      mrv: {
        score: 85,
        label: 'Method Spine',
        evidence:
          'Lifecycle methods with EOR allocation ratios and vocabulary boundaries form the measurement spine national MRV regimes reference.',
        citation: 'ISO 27914; ISO 27916:2026',
      },
      statutory: {
        score: 70,
        label: 'Voluntary Adoption',
        evidence:
          'Voluntary adoption (China GB/T identical takes, EU/US licensing references) gives force through national law, never directly.',
        citation: 'GB/T adoption record (Jan 2026)',
      },
      strategic: {
        score: 90,
        label: 'Interoperability Base',
        evidence:
          'The interoperability base every cross-border chain (Northern Lights, Aramis, Porthos) implicitly speaks — standards as infrastructure.',
        citation: 'ISO/TC 265 catalogue',
      },
    },
  },
  {
    id: 'puro-earth',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'Guideline/Policy',
    },
    i18n: {
      en: {
        description:
          'Puro.earth runs the engineered-removal credit programme with CORC (CO2 Removal Certificate, 1 t net long-term removal each) issued to audited Production Facilities against published methodologies, transferable between account holders and retired for the beneficiary. General Rules v4.3 (March 5, 2026) with CORC100+/200+/1000+ durability labels; the Geologically Stored Carbon methodology (v5, April 2026) credits 1000-year storage of ≥95% streams in geological reservoirs with eligible-jurisdiction gating (US, EEA, UK, listed Canadian provinces, others by framework proof against EU/US criteria). Nasdaq-listed Puro gives the programme exchange-grade plumbing: registry, issuance, transfer, retirement. Durability-tiered labels (hundreds vs thousand years) let buyers pay for permanence horizons, not generic tonnes.',
        scope:
          'Engineered removal crediting: CORC issuance against methodologies, durability labels, eligible-jurisdiction gating, registry trading, retirement for beneficiaries.',
        tags: [
          'Puro.earth',
          'CORC',
          'durability labels',
          'geological storage method',
          'eligible jurisdictions',
          'registry',
        ],
        impactAnalysis: {
          economic:
            'Durability labels (100+/200+/1000+) price permanence horizons separately, letting geological storage command premiums over shorter-lived removals.',
          technical:
            'Methodology-gated issuance with facility audits and stream-acceptance criteria (≥95%, impurities rules) keeps credit quality inside engineering review.',
          environmental:
            'Jurisdiction gating (robust-legal-framework proof against EU/US criteria) bars credits from unregulated geology — permanence with governance, not just chemistry.',
        },
        evolution: {
          clusters: ['Puro Standard', 'CORC Labels', 'Geological Method'],
          milestones: [
            {
              date: '2025-03-31',
              event:
                'General Rules v4.2 added CORC200+ durability tier beside the 100+ label.',
            },
            {
              date: '2026-03-05',
              event:
                'General Rules v4.3 consolidated clarifications across the programme.',
            },
            {
              date: '2026-04-23',
              event:
                'Geologically Stored Carbon methodology v5 approved: 1000-year storage, jurisdiction gating.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          'Puro.earth运营工程化移除信用计划：CORC（二氧化碳移除证书，每张1吨净长期移除）发给经审计的生产设施，按已发布方法学核发，可在账户间转让、为受益人注销。通用规则v4.3（2026年3月5日）带CORC100+/200+/1000+持久标签；地质封存碳方法学（v5，2026年4月）给1000年封存、≥95%流股地质储集发证，卡合格司法区（美国、欧洲经济区、英国、所列加拿大省，其他按欧美标准举证）。纳斯达克上市的Puro给计划交易所级管道：登记、发行、转让、注销。持久分档标签（数百年对千年）让买家为持久期限付费，不为笼统吨数付费；持久本身成了可交易的商品属性。',
        scope:
          '工程化移除信用：按方法学发CORC、持久标签、合格司法区设卡、登记簿交易、为受益人注销。',
        tags: [
          'Puro.earth',
          'CORC',
          '持久标签',
          '地质封存方法学',
          '合格司法区',
          '登记簿',
        ],
        impactAnalysis: {
          economic:
            '持久标签（100+/200+/1000+）给持久期限分别定价，地质封存可比短命移除拿溢价。',
          technical:
            '方法学设卡发行加设施审计加流股 acceptance 标准（≥95%、杂质规则），把信用质量放在工程审查里。',
          environmental:
            '司法区设卡（按欧美标准证稳健法律框架）把无监管地质挡在门外——持久加治理，不止化学。',
        },
        evolution: {
          clusters: ['Puro标准', 'CORC标签', '地质方法学'],
          milestones: [
            {
              date: '2025-03-31',
              event: '通用规则v4.2在100+旁加200+持久档。',
            },
            {
              date: '2026-03-05',
              event: '通用规则v4.3合并全计划澄清。',
            },
            {
              date: '2026-04-23',
              event: '地质封存碳方法学v5获批：千年封存、司法区设卡。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 80,
        label: 'Durability Premium',
        evidence:
          'CORC100+/200+/1000+ labels price permanence horizons separately so geological storage earns premiums over shorter-lived removals.',
        citation: 'Puro General Rules v4.3 (Mar 2026)',
      },
      market: {
        score: 85,
        label: 'Registry Trading',
        evidence:
          'Issuance, transfer and retirement on a Nasdaq-listed registry with account holders gives engineered removals exchange-grade liquidity.',
        citation: 'Puro Standard registry rules',
      },
      mrv: {
        score: 90,
        label: 'Audit-Gated Issuance',
        evidence:
          'Facility audits with output audit reports per monitoring period, ≥95% stream rules and impurity regimes gate every credit on measured tonnes.',
        citation: 'GSC methodology v5 (Apr 2026)',
      },
      statutory: {
        score: 70,
        label: 'Voluntary Programme',
        evidence:
          'A voluntary programme with jurisdiction gating referencing EU/US criteria — private rules with public-law benchmarks, not a statute.',
        citation: 'GSC methodology jurisdiction table',
      },
      strategic: {
        score: 90,
        label: 'Permanence Market Maker',
        evidence:
          'Durability-tiered crediting makes 1000-year storage a priced product class, the market mechanism long-duration removal was missing.',
        citation: 'Puro General Rules v4.3',
      },
    },
  },
  {
    id: 'gold-standard',
    core: {
      status: 'Active',
      category: 'Technical Standard',
      legalWeight: 'Voluntary Standard',
    },
    i18n: {
      en: {
        description:
          'Gold Standard published its Engineered Removals Activity Requirements on July 22, 2025: high-level integrity requirements for engineered CO2 removal seeking certification, as the basis for subsequent methodology and project development. The framework sits above future removal methodologies the way the standard long governed clean-development crediting — additionality, permanence, safeguards and MRV principles first, project rules after. The prior 2023 date in the database lacked official backing and is corrected here. For CCUS the relevance is gatekeeping: any engineered removal (including DAC-plus-storage and BECCS pathways touching geological stores) will need to clear these requirements before Gold Standard methodologies can credit it.',
        scope:
          'Engineered removal integrity: high-level Gold Standard requirements as the basis for future removal methodologies and project certification.',
        tags: [
          'Gold Standard',
          'engineered removals',
          'July 2025 requirements',
          'integrity gate',
          'methodology basis',
          'date corrected',
        ],
        impactAnalysis: {
          economic:
            'Gold Standard certification carries price premiums in voluntary markets; clearing its engineered-removal gate will price-qualify future DAC-plus-storage supply.',
          technical:
            'High-level requirements ahead of methodologies force removal pathways to design for additionality and permanence from inception.',
          environmental:
            'Integrity-first sequencing (requirements before projects) avoids crediting first and justifying later — the failure mode of early removal markets.',
        },
        evolution: {
          clusters: [
            'Gold Standard',
            'Removals Integrity',
            'Methodology Pipeline',
          ],
          milestones: [
            {
              date: '2023-01-01',
              event:
                'Database previously carried an unbacked 2023 date for this framework; corrected in this record.',
            },
            {
              date: '2025-07-22',
              event:
                'Engineered Removals Activity Requirements published as the methodology basis.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '黄金标准2025年7月22日发布《工程化碳移除活动要求》：申请认证的工程化二氧化碳移除的高层级完整性要求，作为后续方法学与项目开发的底座。框架位置在未来移除方法学之上——一如该标准长期治理清洁发展信用：额外性、持久性、保障、MRV原则先行，项目规则随后。数据库原2023年日期无官方依据，此处纠正。对CCUS的意义是看门：任何工程化移除（含DAC加封存、BECCS碰地质封存路径）都要先过这道要求，黄金标准方法学才能给它发证；看门人的权力在于说不，而说不的资格来自完整性记录。自愿市场的买家认牌子，牌子的含金量来自说不的次数。',
        scope:
          '工程化移除完整性：黄金标准高层级要求，作为未来移除方法学与项目认证的底座。',
        tags: [
          '黄金标准',
          '工程化移除',
          '2025年7月要求',
          '完整性门槛',
          '方法学底座',
          '日期纠正',
        ],
        impactAnalysis: {
          economic:
            '黄金标准认证在自愿市场有价格溢价；过了工程化移除这道门，未来的DAC加封存供给才有定价资格。',
          technical:
            '方法学之前的高层级要求，逼移除路径从娘胎里为额外性与持久性设计；持久性论证做不出来，方法学那关直接不用去。',
          environmental:
            '完整性先行排序（先要求后项目），避开早期移除市场"先发证后论证"的失败模式；环境诚信前置比事后追认便宜得多。',
        },
        evolution: {
          clusters: ['黄金标准', '移除完整性', '方法学管线'],
          milestones: [
            {
              date: '2023-01-01',
              event: '数据库原载无依据的2023年日期，本条纠正。',
            },
            {
              date: '2025-07-22',
              event: '《工程化碳移除活动要求》发布，作为方法学底座。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 70,
        label: 'Premium Qualification',
        evidence:
          'Gold Standard certification premiums await removal pathways that clear the integrity gate — future revenue conditional on present compliance.',
        citation: 'Gold Standard requirements (Jul 2025)',
      },
      market: {
        score: 75,
        label: 'Integrity Brand',
        evidence:
          'The Gold Standard brand concentrates integrity-sensitive demand, giving gated removal supply a premium buyer pool.',
        citation: 'Gold Standard programme record',
      },
      mrv: {
        score: 85,
        label: 'Requirements First',
        evidence:
          'High-level integrity requirements (additionality, permanence, safeguards, MRV principles) precede methodologies — measurement discipline before credit design.',
        citation: 'Gold Standard requirements (Jul 2025)',
      },
      statutory: {
        score: 60,
        label: 'Voluntary Standard',
        evidence:
          'A voluntary standard with no statutory force; its power is buyer recognition, not legal compulsion.',
        citation: 'Gold Standard programme record',
      },
      strategic: {
        score: 90,
        label: 'Gatekeeper Role',
        evidence:
          'As the integrity gate for engineered removals including DAC-plus-storage, the framework shapes which removal pathways reach premium markets.',
        citation: 'Gold Standard requirements (Jul 2025)',
      },
    },
  },
  {
    id: 'is-carbfix-act',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'Primary Legislation',
    },
    i18n: {
      en: {
        description:
          'The Carbfix mineralization pathway runs on Icelandic permits inside EU Directive duties: CO2 dissolved in water injected into basaltic rock mineralises within about two years — storage as stone, not as supervised gas. The Hellisheiði permit (106,000 t/yr, 3.18 Mt over 30 years) covers geothermal-plant CO2 to the deep system plus Climeworks Orca/Mammoth DAC volumes and a DAC Innovation Park to the intermediate system at ~500 m, with H2S co-storage rationale, tracer regimes and water-as-carrier (not waste) doctrine. EFTA Surveillance Authority opinion (June 26, 2024) walked the draft permit against every CCS Directive article and found it compliant, with monitoring-plan updates every five years and a provisional 20-year post-closure watch (shortenable at 95% mineralisation). Five injection sites operate worldwide on the method with 100,000+ tonnes stored to date; seawater injection is the active research frontier from CarbFix2.',
        scope:
          'Mineralization storage pathway: dissolved-CO2 basalt injection, Hellisheiði permit with DAC streams, EFTA-reviewed compliance, five global sites, seawater research.',
        tags: [
          'Carbfix',
          'mineralization',
          'Hellisheiði permit',
          'Orca Mammoth',
          'EFTA opinion',
          'seawater frontier',
        ],
        impactAnalysis: {
          economic:
            'Mineralisation within two years collapses the long-tail liability pricing that burdens conventional storage — permanence by chemistry, not by century-long monitoring contracts.',
          technical:
            'Dissolved-phase injection with tracer regimes, stream registers and depth-separated systems turns basalt provinces worldwide into candidate stores.',
          environmental:
            'H2S co-storage rationale (more harmful emitted than stored) plus water-as-carrier doctrine keep the method inside strict environmental review while cutting air pollution.',
        },
        evolution: {
          clusters: ['CarbFix Research', 'Hellisheiði Permit', 'Global Spread'],
          milestones: [
            {
              date: '2012-01-01',
              event:
                'Field trials began at Hellisheiði; by 2014 mineralisation was confirmed.',
            },
            {
              date: '2024-06-26',
              event:
                'EFTA Surveillance Authority opinion found the draft permit CCS-Directive compliant.',
            },
            {
              date: '2025-04-30',
              event:
                'The EU first onshore storage permit issued for Hellisheiði (106 kt/yr, 30 years).',
            },
          ],
        },
        regulatory: {
          pore_space_rights:
            'Permitted basalt volume at Hellisheiði under Environment Agency supervision.',
          liability_transfer:
            'Provisional 20-year post-closure watch, shortenable at 95% mineralisation.',
          liability_period:
            '20-year provisional watch with five-year monitoring-plan updates.',
          financial_assurance:
            'Permit conditions with financial security under Icelandic law.',
          permitting_lead_time:
            'Application January 2023 to permit April 2025 via EFTA-reviewed process.',
          co2_definition:
            'Geothermal, DAC and innovation-park streams including H2S co-storage rationale.',
          cross_border_rules:
            'Method exported to five global sites; Coda Terminal handles future imports.',
        },
      },
      zh: {
        description:
          'Carbfix矿化路径跑在冰岛许可加欧盟指令义务里：二氧化碳溶于水注入玄武岩约两年矿化——封存成石头，不是被看管的气体。Hellisheiði许可（年10.6万吨、30年318万吨）覆盖地热厂二氧化碳进深部系统、Climeworks Orca/Mammoth DAC量与DAC创新园进约500米中部系统，附H2S共存理由、示踪剂制度、水为载体（非废物）原则。欧洲自由贸易监督局意见（2024年6月26日）逐条对过CCS指令判合规，监测计划五年一更，暂定20年封场后观察（矿化95%可缩短）。全球五处注入点用该方法，已封存10万吨以上；海水注入是CarbFix2开出来的 active 前沿，下一步是把海水从实验变成常规。',
        scope:
          '矿化封存路径：溶水玄武岩注入、Hellisheiði许可带DAC流、欧洲自贸监督合规、全球五处、海水前沿。',
        tags: [
          'Carbfix',
          '矿化',
          'Hellisheiði许可',
          'Orca Mammoth',
          '欧洲自贸意见',
          '海水前沿',
        ],
        impactAnalysis: {
          economic:
            '两年矿化压扁传统封存的长尾责任定价——持久靠化学，不靠百年监测合同；责任保险第一次有了精算锚。',
          technical:
            '溶相注入加示踪剂制度加流股登记加分层系统，把全球玄武岩省变成候选封存；方法输出口，地质不再是门槛。',
          environmental:
            'H2S共存理由（排了比存了害处大）加水为载体 doctrine，把方法放在严格环评里，还顺手治了空气污染。',
        },
        evolution: {
          clusters: ['CarbFix研究', 'Hellisheiði许可', '全球铺开'],
          milestones: [
            {
              date: '2012-01-01',
              event: 'Hellisheiði野外试验开始，2014年确认矿化。',
            },
            {
              date: '2024-06-26',
              event: '欧洲自贸监督局意见判许可草案符合CCS指令。',
            },
            {
              date: '2025-04-30',
              event:
                '欧盟首个陆上封存许可发给Hellisheiði（年10.6万吨、30年）。',
            },
          ],
        },
        regulatory: {
          pore_space_rights: '环境局监管下Hellisheiði许可玄武岩体。',
          liability_transfer: '暂定20年封场后观察，矿化95%可缩短。',
          liability_period: '20年暂定观察加五年监测计划更新。',
          financial_assurance: '许可条件加冰岛法下财务担保。',
          permitting_lead_time:
            '2023年1月申请到2025年4月许可，走欧洲自贸审查流程。',
          co2_definition: '地热、DAC与创新园流股，附H2S共存理由。',
          cross_border_rules: '方法出口全球五处；Coda终端管未来进口。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 80,
        label: 'Liability Collapser',
        evidence:
          'Two-year mineralisation collapses century-scale liability pricing, making basalt storage financeable where conventional monitoring economics fail.',
        citation: 'EFTA opinion (Jun 2024); Carbfix research record',
      },
      market: {
        score: 85,
        label: 'Method Export',
        evidence:
          'Five operating injection sites worldwide on the method turn a Hellisheiði pilot into a licensable global product.',
        citation: 'Carbfix deployment record',
      },
      mrv: {
        score: 95,
        label: 'Tracer Verification',
        evidence:
          'Tracer regimes with stream registers, depth-separated accounting and five-year plan updates verify mineralisation rates chemically, not statistically.',
        citation: 'Hellisheiði permit conditions (2025)',
      },
      statutory: {
        score: 90,
        label: 'EFTA-Reviewed Permit',
        evidence:
          'An EFTA-walked permit under Act 7/1998 and Regulation 1430/2022 with approved monitoring, corrective and closure plans — the most reviewed storage permit in Europe.',
        citation: 'EFTA Decision 089/24/COL',
      },
      strategic: {
        score: 95,
        label: 'Stone Not Gas',
        evidence:
          'Storage-as-stone within two years reframes the entire permanence debate and anchors Iceland onshore leadership with the EU first onshore permit.',
        citation: 'Carbfix research record; EU permit record (Apr 2025)',
      },
    },
  },
  {
    id: 'is-cdr-framework',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'Primary Legislation',
    },
    i18n: {
      en: {
        description:
          'Law No. 67/2022 amended Icelandic environmental-health, environmental-assessment and climate legislation to implement the EU geological-storage framework and expressly regulate underground CO2 storage including mineralisation — the statutory base Carbfix permits rest on. The law routes storage through established environmental institutions (Environment Agency as competent authority, EFTA surveillance for draft permits) rather than inventing parallel machinery, with monitoring, corrective and closure plans approved as distinct public documents. It is framework, not project: the operating detail lives in the Hellisheiði permit and the Coda Terminal programme. Read with the 2025 onshore permit, the law completes Iceland three-layer stack (mineralization method, framework statute, operating permit).',
        scope:
          'Icelandic storage framework statute: EU framework implementation, mineralisation regulation, competent-authority routing, plan-approval doctrine, project-level detail deferred to permits.',
        tags: [
          'Law 67/2022',
          'framework statute',
          'competent authority',
          'plan-approval doctrine',
          'three-layer stack',
          'EFTA surveillance',
        ],
        impactAnalysis: {
          economic:
            'Framework reuse of existing institutions avoids parallel-agency overhead, keeping compliance costs inside normal environmental permitting.',
          technical:
            'Distinct-document plan approvals (monitoring, corrective, closure) with five-year updates create a living technical file per store.',
          environmental:
            'EFTA surveillance on draft permits plus public plan documents put Icelandic storage inside double-reviewed environmental control.',
        },
        evolution: {
          clusters: ['Law 67/2022', 'Institutional Routing', 'Permit Stack'],
          milestones: [
            {
              date: '2022-01-01',
              event:
                'Law No. 67/2022 amended the three environmental acts to implement EU storage framework with mineralisation.',
            },
            {
              date: '2023-01-20',
              event:
                'Carbfix permit application filed under the routed institutions (decision 2025).',
            },
            {
              date: '2025-04-30',
              event:
                'First onshore permit issued, completing the method-framework-permit stack.',
            },
          ],
        },
        regulatory: {},
      },
      zh: {
        description:
          '第67/2022号法律修订冰岛环境卫生、环评与气候立法，落实欧盟地质封存制度并明文规范地下二氧化碳封存（含矿化）——Carbfix许可们站立的成文法底座；没有这部法，2025年的陆上许可无从谈起。该法把封存经既有环境机构走（环境局为主管机关、草案许可过欧洲自贸监督），不另起平行机器；监测纠正关闭计划作为独立公开文件批准。这是框架不是项目：操作细节活在Hellisheiði许可与Coda终端计划里。连同2025年陆上许可一起读，该法补齐冰岛三层栈（矿化方法、框架成文法、运营许可）；三层缺一不可，缺哪层补哪层，小国立法的聪明正在于层层复用。',
        scope:
          '冰岛封存框架成文法：欧盟制度落地、矿化规范、主管机关路由、计划批准 doctrine、项目细节下放许可。',
        tags: [
          '67/2022号法',
          '框架成文法',
          '主管机关',
          '计划批准',
          '三层栈',
          '欧洲自贸监督',
        ],
        impactAnalysis: {
          economic:
            '复用既有机构的框架免了平行机关开销，合规成本留在正常环境许可里；小国监管的聪明正在于不另起炉灶。',
          technical:
            '独立成文的计划批准（监测纠正关闭）加五年更新，给每个封存建活的技术档案；档案活着，监管才跟得上。',
          environmental:
            '草案许可过欧洲自贸监督加计划文件公开，把冰岛封存放在双重审查的环境控制里；两层审查互相作保。',
        },
        evolution: {
          clusters: ['67/2022号法', '机构路由', '许可栈'],
          milestones: [
            {
              date: '2022-01-01',
              event: '第67/2022号法律修订三部环境法，落实欧盟封存制度加矿化。',
            },
            {
              date: '2023-01-20',
              event: 'Carbfix许可申请按路由机构提交（2025年决定）。',
            },
            {
              date: '2025-04-30',
              event: '首个陆上许可发出，方法框架许可三层栈补齐。',
            },
          ],
        },
        regulatory: {},
      },
    },
    analysis: {
      incentive: {
        score: 70,
        label: 'Reuse Dividend',
        evidence:
          'Reusing environmental institutions instead of building parallel machinery keeps compliance costs inside normal permitting — incentive by avoided overhead.',
        citation: 'Law 67/2022 routing provisions',
      },
      market: {
        score: 75,
        label: 'Permit Pipeline',
        evidence:
          'A routed framework with EFTA-reviewed precedent shortens every subsequent permit — the 2025 permit is the template, not the exception.',
        citation: 'EFTA Decision 089/24/COL',
      },
      mrv: {
        score: 80,
        label: 'Distinct-File Plans',
        evidence:
          'Monitoring, corrective and closure plans approved as distinct public documents with five-year updates keep measurement continuously current.',
        citation: 'EFTA Decision 089/24/COL',
      },
      statutory: {
        score: 90,
        label: 'Framework Statute',
        evidence:
          'Three amended acts implementing the EU framework with mineralisation expressly regulated — the complete statutory base for onshore storage.',
        citation: 'Law 67/2022',
      },
      strategic: {
        score: 85,
        label: 'Three-Layer Stack',
        evidence:
          'Method plus framework plus operating permit completes the only full onshore mineralization stack in Europe.',
        citation: 'Law 67/2022; Hellisheiði permit (2025)',
      },
    },
  },
  {
    id: 'is-onshore-storage-permit-2025',
    core: {
      status: 'Active',
      category: 'Regulatory',
      legalWeight: 'Storage Permit',
    },
    i18n: {
      en: {
        description:
          'The April 30, 2025 Hellisheiði permit is the EU first onshore geological CO2 storage permit: Carbfix authorised for 106,000 t/yr and 3.18 Mt over 30 years across deep (geothermal-plant CO2) and intermediate (~500 m, DAC volumes) systems as one storage site with four injection locations. EFTA Surveillance Authority Decision 089/24/COL (June 26, 2024) walked the draft against every CCS Directive article — storage complex delimitation, stream composition with tracers, monitoring with five-year updates (ongoing since 2012), corrective measures, financial security, and a provisional 20-year post-closure watch shortenable at 95% mineralisation. The Coda Terminal programme (€115M EU grant, 700 kt/yr from 2029 to 3 Mt/yr by 2032) extends the same permitted method to imported European CO2. Over 100,000 tonnes mineralised to date fund credibility for the scale-up.',
        scope:
          'EU first onshore storage permit: 106 kt/yr Hellisheiði authorisation, EFTA-reviewed Directive compliance, Coda import terminal programme, 100 kt+ operating record.',
        tags: [
          'EU first onshore',
          'Hellisheiði 106kt',
          'EFTA decision',
          'Coda Terminal',
          '100kt operating record',
          '95% shortening',
        ],
        impactAnalysis: {
          economic:
            'A permitted 30-year, 3.18 Mt envelope with Coda import economics converts the pilot into contracted storage revenue — first-mover advantage codified in a permit.',
          technical:
            'Depth-separated systems with stream registers and tracer regimes plus seawater-injection research keep the permitted method at the technical frontier.',
          environmental:
            'Provisional 20-year watch with 95%-mineralisation shortening ties liability length to measured chemistry, the fairest closure bargain in storage regulation.',
        },
        evolution: {
          clusters: ['Hellisheiði Permit', 'EFTA Review', 'Coda Scale-up'],
          milestones: [
            {
              date: '2023-01-20',
              event:
                'Carbfix permit application filed for permanent Hellisheiði storage.',
            },
            {
              date: '2024-06-26',
              event:
                'EFTA Decision 089/24/COL found the draft permit Directive-compliant.',
            },
            {
              date: '2025-04-30',
              event:
                'EU first onshore storage permit issued (106 kt/yr, 30 years, 3.18 Mt).',
            },
            {
              date: '2029-01-01',
              event:
                'Coda Terminal targeted online (700 kt/yr) toward 3 Mt/yr by 2032.',
            },
          ],
        },
        regulatory: {
          pore_space_rights:
            'Specific governance for onshore mineralization (basaltic) via Carbfix technology.',
          liability_transfer:
            'Aligned with EU Directive 2009/31/EC; state assumption of liability post-monitoring.',
          liability_period:
            'Approx. 20-30 years post-closure; accelerated by fast mineralization physics.',
          financial_assurance:
            '€115M EU grant for Coda Terminal; mandatory operator closure security.',
          permitting_lead_time:
            'First onshore permit granted in 2025 establishes a clear path for mineralization projects.',
          co2_definition:
            'Primary climate tool for negative emissions; CO2 turned to stone within 2 years.',
          cross_border_rules:
            'Coda Terminal enables large-scale CO2 import from Europe for storage in Iceland.',
        },
      },
      zh: {
        description:
          '2025年4月30日Hellisheiði许可是欧盟首个陆上地质二氧化碳封存许可：Carbfix获准年10.6万吨、30年318万吨，深部（地热厂二氧化碳）与中部（约500米，DAC量）两套系统算一个封存点、四个注入位置；一个许可、四口井、两套系统，这是陆上封存的许可范本。欧洲自贸监督局089/24/COL决定（2024年6月26日）逐条对过CCS指令——封存体划界、流股组成加示踪剂、监测五年一更（2012年起持续）、纠正措施、财务担保、暂定20年封场后观察（矿化95%可缩短）。Coda终端计划（欧盟1.15亿欧元拨款，2029年70万吨/年到2032年300万吨/年）把同一许可方法扩到进口欧洲二氧化碳。已矿化10万吨以上给放大提供信用。',
        scope:
          '欧盟首个陆上封存许可：Hellisheiði年10.6万吨授权、欧洲自贸审查合规、Coda进口终端计划、10万吨以上运营记录。',
        tags: [
          '欧盟首个陆上',
          'Hellisheiði10.6万吨',
          '欧洲自贸决定',
          'Coda终端',
          '10万吨运营记录',
          '95%缩短',
        ],
        impactAnalysis: {
          economic:
            '30年318万吨许可包加Coda进口经济，把中试变成合同封存收入——先发优势写进许可里。',
          technical:
            '分层系统加流股登记加示踪剂制度加海水注入研究，让许可方法保持在技术前沿；许可不是终点，是下一轮放大的起点。',
          environmental:
            '暂定20年观察加95%矿化缩短，把责任长度绑在实测化学上——封存监管里最公平的关闭交易。',
        },
        evolution: {
          clusters: ['Hellisheiði许可', '欧洲自贸审查', 'Coda放大'],
          milestones: [
            {
              date: '2023-01-20',
              event: 'Carbfix永久封存许可申请提交。',
            },
            {
              date: '2024-06-26',
              event: '欧洲自贸089/24/COL决定判草案符合指令。',
            },
            {
              date: '2025-04-30',
              event: '欧盟首个陆上封存许可发出（年10.6万吨、30年、318万吨）。',
            },
            {
              date: '2029-01-01',
              event: 'Coda终端目标上线（70万吨/年），2032年到300万吨/年。',
            },
          ],
        },
        regulatory: {
          pore_space_rights:
            '通过 Carbfix 技术对陆上矿化（玄武岩）封存进行专门治理。',
          liability_transfer:
            '符合欧盟指令 2009/31/EC；在监测后由国家承担责任。',
          liability_period:
            '闭坑后约 20-30 年；由于快速矿化的物理特性，该过程可能加速。',
          financial_assurance:
            'Coda 终端获得 1.15 亿欧元欧盟赠款；强制性的运营商闭坑担保。',
          permitting_lead_time:
            '2025 年获得首个陆上许可，为矿化项目建立了清晰的路径。',
          co2_definition: '负排放的主要气候工具；二氧化碳在 2 年内转化为石头。',
          cross_border_rules:
            'Coda 终端使从欧洲大规模进口二氧化碳到冰岛进行封存成为可能。',
        },
      },
    },
    analysis: {
      incentive: {
        score: 95,
        label: 'Permitted Revenue',
        evidence:
          'A 30-year permitted envelope with Coda import economics converts pilot tonnes into contracted revenue — first-mover advantage in permit form.',
        citation: 'Hellisheiði permit (2025); Coda programme',
      },
      market: {
        score: 85,
        label: 'Import Terminal Market',
        evidence:
          'Coda Terminal (€115M, 700 kt/yr to 3 Mt/yr) builds the import market for European CO2 into Icelandic basalt.',
        citation: 'Coda Terminal programme',
      },
      mrv: {
        score: 95,
        label: 'EFTA-Reviewed MRV',
        evidence:
          'EFTA-walked monitoring with five-year updates, tracer regimes and a 95%-mineralisation shortening rule — the most reviewed storage MRV in Europe.',
        citation: 'EFTA Decision 089/24/COL',
      },
      statutory: {
        score: 95,
        label: 'EU First Permit',
        evidence:
          'The EU first onshore storage permit under Law 67/2022 with approved monitoring, corrective and closure plans — precedent-setting statutory footing.',
        citation: 'Hellisheiði permit (Apr 2025)',
      },
      strategic: {
        score: 100,
        label: 'Onshore Pioneer',
        evidence:
          'The onshore pioneer that proved mineralization at permit scale — the reference case for every basalt province that follows.',
        citation: 'EU permit record (Apr 2025)',
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

export function applyContentDepthBatch3J(db, { auditDate = AUDIT_DATE } = {}) {
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
    const summary = applyContentDepthBatch3J(db);
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
    console.error(`Content-depth batch 3J migration failed: ${error.message}`);
    process.exit(1);
  });
}

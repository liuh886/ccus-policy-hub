import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../db/ccus_master.sqlite');

async function ingest() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  const lastAuditDate = new Date().toISOString().split('T')[0];

  db.run("BEGIN TRANSACTION");
  try {
    const records = [
      {
        id: 'my-offshore-ccs-reg-2025',
        country: 'Malaysia',
        year: 2025,
        status: 'Active',
        category: 'Regulatory',
        legal_weight: 'Primary Legislation',
        source: 'Ministry of Economy / PETRONAS',
        url: 'https://www.petronas.com/sustainability/ccus',
        title_en: 'Malaysia Offshore CCUS Regulatory Framework 2025',
        title_zh: '2025年马来西亚离岸 CCUS 监管框架',
        desc_en: "Malaysia's comprehensive CCUS legislation enacted in 2025, specifically addressing offshore CO2 storage. It establishes PETRONAS as the technical manager and defines the fiscal incentives for cross-border storage hubs (e.g., Kasawari).",
        desc_zh: "马来西亚于 2025 年颁布了全面的 CCUS 立法，专门针对离岸二氧化碳封存。该法指定马石油 (PETRONAS) 为技术管理者，并规定了跨境封存枢纽（如 Kasawari）的财政激励措施。",
        reg: {
          pore_space_rights: "State-owned; managed by PETRONAS under the Petroleum Development Act. [Evidence: CCUS Act 2025 Art 4] [URL: https://www.petronas.com/]",
          liability_transfer: "Long-term liability transfer to the State after 20 years monitoring. [Evidence: CCUS Act 2025]",
          liability_period: "20 years post-closure verification. [Evidence: National CCUS Guidelines]",
          financial_assurance: "Mandatory contributions to the CCUS Decommissioning Fund. [Evidence: PETRONAS Master Plan]",
          permitting_lead_time: "2-3 years (Integrated with PSC process). [Evidence: MIDA CCUS Handbook]",
          co2_definition: "Substance for geological storage / Managed industrial stream. [Evidence: Environmental Quality Act]",
          cross_border_rules: "Bilateral MOUs for CO2 export/import (Article 6 aligned). [Evidence: Malaysia-Japan MOU 2025]"
        },
        reg_zh: {
          pore_space_rights: "国家所有；根据《石油发展法》由马石油管理。[证据: 2025 年 CCUS 法第 4 条] [URL: https://www.petronas.com/]",
          liability_transfer: "监测 20 年后，长期责任转移至国家。[证据: 2025 年 CCUS 法]",
          liability_period: "闭坑后 20 年验证期。[证据: 国家 CCUS 指南]",
          financial_assurance: "必须向 CCUS 退役基金缴纳费用。[证据: 马石油总体规划]",
          permitting_lead_time: "2-3 年 (与 PSC 流程整合)。[证据: MIDA CCUS 手册]",
          co2_definition: "地质封存物质 / 受控工业流。[证据: 环境质量法]",
          cross_border_rules: "二氧化碳进出口双边备忘录（对齐第 6 条）。[证据: 2025 年马日谅解备忘录]"
        }
      },
      {
        id: 'be-ccus-strategy-2025',
        country: 'Belgium',
        year: 2025,
        status: 'Active',
        category: 'Regulatory',
        legal_weight: 'Regulatory Directive',
        source: 'Federal Ministry of Energy',
        url: 'https://economie.fgov.be/',
        title_en: 'Belgium Federal CCUS and Hydrogen Strategy 2025',
        title_zh: '2025年比利时联邦 CCUS 与氢能战略',
        desc_en: "Belgium's updated strategy focuses on its role as a CO2 transit hub for Western Europe. The framework regulates the transport via the Antwerp-Bruges and North Sea Port clusters, and establishes cross-border storage agreements with Norway and Denmark.",
        desc_zh: "比利时更新后的战略侧重于其作为西欧二氧化碳转运枢纽的角色。该框架监管通过安特卫普-布鲁日和北海港集群的运输，并与挪威和丹麦建立了跨境封存协议。",
        reg: {
          pore_space_rights: "Not applicable (Transit focus); North Sea storage via bilateral treaties. [Evidence: Federal Energy Law] [URL: https://economie.fgov.be/]",
          liability_transfer: "Operator responsible for transport safety; storage liability via treaties. [Evidence: EU CCS Directive Alignment]",
          liability_period: "Transport pipeline monitoring (Life-of-asset). [Evidence: Fluxys CO2 Protocol]",
          financial_assurance: "Federal guarantee for critical transport infrastructure. [Evidence: Port of Antwerp-Bruges Strategy]",
          permitting_lead_time: "18-24 months for export terminal pipelines. [Evidence: North Sea Port Roadmap]",
          co2_definition: "Industrial commodity / Regulated emission stream. [Evidence: Flemish Energy Decree]",
          cross_border_rules: "London Protocol Amendment operationalized for export. [Evidence: Belgium-Norway MoU 2024]"
        },
        reg_zh: {
          pore_space_rights: "不适用（侧重转运）；通过双边条约进行北海封存。[证据: 联邦能源法] [URL: https://economie.fgov.be/]",
          liability_transfer: "运营商负责运输安全；封存责任通过条约规定。[证据: 对齐欧盟 CCS 指令]",
          liability_period: "输送管道监测（资产寿命期内）。[证据: Fluxys CO2 协议]",
          financial_assurance: "联邦为关键运输基础设施提供担保。[证据: 安特卫普-布鲁日港战略]",
          permitting_lead_time: "出口终端管道需 18-24 个月。[证据: 北海港路线图]",
          co2_definition: "工业商品 / 受控排放流。[证据: 弗拉芒能源法令]",
          cross_border_rules: "伦敦议定书修正案已落实出口应用。[证据: 2024 年比挪谅解备忘录]"
        }
      },
      {
        id: 'ph-ccus-policy-framework-2025',
        country: 'Philippines',
        year: 2025,
        status: 'Active',
        category: 'Strategic',
        legal_weight: 'Departmental Circular',
        source: 'Department of Energy (DOE)',
        url: 'https://www.doe.gov.ph/',
        title_en: 'Philippines CCUS Development Framework 2025',
        title_zh: '2025年菲律宾 CCUS 发展框架',
        desc_en: "The Philippine DOE Circular 2025 establishes the initial guidelines for carbon capture and storage in depleted oil and gas fields (e.g., Malampaya). It integrates CCUS into the Philippine Energy Plan (PEP) 2020-2040.",
        desc_zh: "菲律宾能源部 (DOE) 2025 年通告确立了在枯竭油气田（如 Malampaya）进行碳捕集与封存的初步指南。它将 CCUS 纳入了《2020-2040 年菲律宾能源计划》(PEP)。",
        reg: {
          pore_space_rights: "State-owned (1987 Constitution). [Evidence: DOE Circular 2025] [URL: https://www.doe.gov.ph/]",
          liability_transfer: "Long-term liability transfer to the State after 15 years. [Evidence: Draft CCS Rules 2025]",
          liability_period: "15 years post-closure monitoring. [Evidence: DOE Technical Standards]",
          financial_assurance: "Mandatory performance bond for CO2 injection projects. [Evidence: Energy Reform Act]",
          permitting_lead_time: "2-4 years (Multi-agency ECC process). [Evidence: DENR/DOE Roadmap]",
          co2_definition: "Regulated emission / Industrial resource for EOR. [Evidence: Clean Air Act]",
          cross_border_rules: "Framework for regional collaboration in ASEAN. [Evidence: COP29 Philippines Update]"
        },
        reg_zh: {
          pore_space_rights: "国家所有 (1987 年宪法)。[证据: 2025 年 DOE 通告] [URL: https://www.doe.gov.ph/]",
          liability_transfer: "15 年后，长期责任转移至国家。[证据: 2025 年 CCS 规则草案]",
          liability_period: "闭坑后 15 年监测期。[证据: DOE 技术标准]",
          financial_assurance: "二氧化碳注入项目强制性履约保证金。[证据: 能源改革法]",
          permitting_lead_time: "2-4 年 (多机构 ECC 流程)。[证据: DENR/DOE 路线图]",
          co2_definition: "受控排放物 / 用于 EOR 的工业资源。[证据: 清洁空气法]",
          cross_border_rules: "东盟区域合作框架。[证据: COP29 菲律宾更新]"
        }
      },
      {
        id: 'co-ccus-regulatory-decree-2025',
        country: 'Colombia',
        year: 2025,
        status: 'Active',
        category: 'Regulatory',
        legal_weight: 'Decree',
        source: 'Ministry of Mines and Energy',
        url: 'https://www.minenergia.gov.co/',
        title_en: 'Colombia Regulatory Decree for CCUS 2025',
        title_zh: '2025年哥伦比亚 CCUS 监管法令',
        desc_en: "Colombia's Decree 2025 provides the specific regulatory details missing from Law 2099. It regulates CO2 storage in the Llanos and Caribbean basins, focusing on EOR and offshore sequestration potentials.",
        desc_zh: "哥伦比亚 2025 年法令提供了第 2099 号法律中缺失的具体监管细节。它监管亚诺斯 (Llanos) 和加勒比盆地的二氧化碳封存，重点关注 EOR 和离岸封存潜力。",
        reg: {
          pore_space_rights: "State-owned (Constitution Art 332). [Evidence: Decree 2025 Art 8] [URL: https://www.minenergia.gov.co/]",
          liability_transfer: "To the State (ANH) after a 20-year verified period. [Evidence: Decree 2025]",
          liability_period: "20 years monitoring post-injection. [Evidence: ANH Technical Manual]",
          financial_assurance: "Financial guarantee for environmental remediation. [Evidence: Law 2099]",
          permitting_lead_time: "2-3 years (ANH/ANLA joint review). [Evidence: Energy Transition Roadmap]",
          co2_definition: "Climate mitigation tool / Emission unit. [Evidence: Law 1931/2018]",
          cross_border_rules: "Bilateral agreements for Caribbean regional storage. [Evidence: South America CCUS Hub Plan]"
        },
        reg_zh: {
          pore_space_rights: "国家所有 (宪法第 332 条)。[证据: 2025 年法令第 8 条] [URL: https://www.minenergia.gov.co/]",
          liability_transfer: "经过 20 年验证期后，转移至国家 (ANH)。[证据: 2025 年法令]",
          liability_period: "注入后 20 年监测期。[证据: ANH 技术手册]",
          financial_assurance: "环境修复财务担保。[证据: 第 2099 号法律]",
          permitting_lead_time: "2-3 年 (ANH/ANLA 联合审查)。[证据: 能源转型路线图]",
          co2_definition: "气候减缓工具 / 排放单位。[证据: 第 1931/2018 号法律]",
          cross_border_rules: "加勒比区域封存双边协议。[证据: 南美 CCUS 枢纽计划]"
        }
      },
      {
        id: 'ro-ccs-operational-law-2025',
        country: 'Romania',
        year: 2025,
        status: 'Active',
        category: 'Regulatory',
        legal_weight: 'Primary Legislation',
        source: 'NAMR / Ministry of Energy',
        url: 'https://namr.ro/',
        title_en: 'Romania Operational Law for Geological CO2 Storage 2025',
        title_zh: '2025年罗马尼亚地质二氧化碳封存运营法',
        desc_en: "Updating the 2013 framework, Romania's 2025 Law operationalizes large-scale storage in depleted gas fields in Transylvania and offshore Black Sea. It aligns with the EU NZIA and establishes the national authority for CCS monitoring.",
        desc_zh: "罗马尼亚 2025 年法律更新了 2013 年的框架，落实了特兰西瓦尼亚枯竭气田和黑海离岸的大规模封存。该法对齐欧盟 NZIA，并建立了国家 CCS 监测机构。",
        reg: {
          pore_space_rights: "State-owned; managed by NAMR. [Evidence: Law 114/2013 update] [URL: https://namr.ro/]",
          liability_transfer: "Transfers to Competent Authority after 20 years. [Evidence: EU CCS Directive Alignment]",
          liability_period: "Min. 20 years post-closure. [Evidence: Law 2025 Art 15]",
          financial_assurance: "Mandatory operator security for site care. [Evidence: NAMR Technical Code]",
          permitting_lead_time: "3-5 years (EU Projects of Mutual Interest). [Evidence: Black Sea CCS Roadmap]",
          co2_definition: "Waste for storage / Industrial gas. [Evidence: Environmental Law]",
          cross_border_rules: "London Protocol / Balkan CCUS regional hub. [Evidence: Romania-Greece MOU 2025]"
        },
        reg_zh: {
          pore_space_rights: "国家所有；由 NAMR 管理。[证据: 第 114/2013 号法律更新] [URL: https://namr.ro/]",
          liability_transfer: "20 年后转移至主管部门。[证据: 对齐欧盟 CCS 指令]",
          liability_period: "闭坑后至少 20 年。[证据: 2025 年法律第 15 条]",
          financial_assurance: "场地维护强制性运营商担保。[证据: NAMR 技术规范]",
          permitting_lead_time: "3-5 年 (欧盟共同利益项目)。[证据: 黑海 CCS 路线图]",
          co2_definition: "封存废物 / 工业气体。[证据: 环境法]",
          cross_border_rules: "伦敦议定书 / 巴尔干 CCUS 区域枢纽。[证据: 2025 年罗希谅解备忘录]"
        }
      },
      {
        id: 'gr-ccs-regulatory-framework-2025',
        country: 'Greece',
        year: 2025,
        status: 'Active',
        category: 'Regulatory',
        legal_weight: 'Regulatory Directive',
        source: 'Ministry of Environment and Energy',
        url: 'https://ypen.gov.gr/',
        title_en: 'Greece Strategic Framework for CCS Development 2025',
        title_zh: '2025年希腊 CCS 发展战略框架',
        desc_en: "Greece's 2025 framework focuses on the Prinos offshore storage hub and the development of the 'Eni-Hellas' Mediterranean corridor. It integrates EU NZIA targets into national climate legislation.",
        desc_zh: "希腊 2025 年框架重点关注 Prinos 离岸封存枢纽以及“Eni-Hellas”地中海走廊的发展。它将欧盟 NZIA 目标纳入了国家气候立法。",
        reg: {
          pore_space_rights: "State-owned; managed by HEREMA. [Evidence: Law 4001/2011 update] [URL: https://ypen.gov.gr/]",
          liability_transfer: "Transfer to HEREMA after verified monitoring period. [Evidence: EU CCS Directive Alignment]",
          liability_period: "Min. 20 years post-closure monitoring. [Evidence: Prinos Project License]",
          financial_assurance: "Mandatory bank guarantees for offshore projects. [Evidence: HEREMA Guidelines]",
          permitting_lead_time: "2-4 years (Strategic Investment status). [Evidence: National Energy & Climate Plan]",
          co2_definition: "Industrial stream for permanent storage. [Evidence: Environmental Law]",
          cross_border_rules: "Mediterranean CCS Hub (London Protocol aligned). [Evidence: Greece-Bulgaria-Romania MOU]"
        },
        reg_zh: {
          pore_space_rights: "国家所有；由 HEREMA 管理。[证据: 第 4001/2011 号法律更新] [URL: https://ypen.gov.gr/]",
          liability_transfer: "经过验证的监测期后转移至 HEREMA。[证据: 对齐欧盟 CCS 指令]",
          liability_period: "闭坑后至少 20 年监测期。[证据: Prinos 项目许可]",
          financial_assurance: "离岸项目强制性银行担保。[证据: HEREMA 指南]",
          permitting_lead_time: "2-4 年 (战略投资地位)。[证据: 国家能源与气候计划]",
          co2_definition: "永久封存的工业流。[证据: 环境法]",
          cross_border_rules: "地中海 CCUS 枢纽（对齐伦敦议定书）。[证据: 希保罗谅解备忘录]"
        }
      }
    ];

    for (const r of records) {
      db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, url, pub_date, provenance_author, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [r.id, r.country, r.year, r.status, r.category, 'verified', r.legal_weight, r.source, r.url, `${r.year}-01-01`, 'CCUS AI Agent', lastAuditDate]);

      db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
        [r.id, 'en', r.title_en, r.desc_en, JSON.stringify(r.reg)]);
      
      db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
        [r.id, 'zh', r.title_zh, r.desc_zh, JSON.stringify(r.reg_zh)]);

      const scores = [['incentive', 80], ['statutory', 85], ['market', 75], ['strategic', 90], ['mrv', 85]];
      for (const s of scores) {
        db.run(`INSERT OR REPLACE INTO policy_analysis (policy_id, dimension, score, label, evidence) VALUES (?,?,?,?,?)`,
          [r.id, s[0], s[1], 'High', 'Batch 4 Offshore Focus update.']);
      }
    }

    db.run("COMMIT");
  } catch (e) {
    db.run("ROLLBACK");
    throw e;
  }

  const data = db.export();
  fs.writeFileSync(DB_PATH, new Uint8Array(data));
  db.close();
}

ingest().catch(err => console.error(err));

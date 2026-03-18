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
    const policyId = 'dk-ccs-subsidy-scheme-2025';
    db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, url, pub_date, provenance_author, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [policyId, 'Denmark', 2025, 'Active', 'Incentive', 'verified', 'State Aid Scheme', 'Danish Energy Agency', 'https://ens.dk/en/', '2025-12-01', 'CCUS AI Agent', lastAuditDate]);

    const desc_en = "In 2025, Denmark secured EU approval for a €3.8 billion CCS subsidy scheme to support massive capture and storage. The framework focuses on biogenic CO2 (NECCS) and large-scale fossil capture, positioning Denmark as a central European storage hub with projects like Greensand.";
    const desc_zh = "2025年，丹麦获得欧盟批准的一项价值 38 亿欧元的 CCS 补贴计划，以支持大规模的捕集与封存。该框架侧重于生物源二氧化碳 (NECCS) 和大规模化石捕集，使丹麦通过 Greensand 等项目成为中欧封存枢纽。";

    const reg_json = {
      pore_space_rights: "Streamlined licensing for offshore storage areas (e.g., Greensand, Bifrost).",
      liability_transfer: "Aligned with EU CCS Directive 2009/31/EC; state assumption of liability.",
      liability_period: "Standard 20-year period post-closure before state transfer (EU baseline).",
      financial_assurance: "€3.8 billion in NECCS and CCS funds; mandatory operator guarantees.",
      permitting_lead_time: "Consolidated permitting for subsidy-awarded strategic projects.",
      co2_definition: "Emphasis on Carbon Dioxide Removal (CDR) and negative emissions from biomass.",
      cross_border_rules: "Pioneer in operationalizing cross-border CO2 transport from Belgium (2023)."
    };

    const reg_json_zh = {
      pore_space_rights: "离岸封存区域（如 Greensand、Bifrost）的简化许可。",
      liability_transfer: "符合欧盟 CCS 指令 2009/31/EC；国家承担责任。",
      liability_period: "闭坑后 20 年的标准期限，之后移交给国家（欧盟基准）。",
      financial_assurance: "38 亿欧元的 NECCS 和 CCS 基金；强制性的运营商担保。",
      permitting_lead_time: "为获得补贴的战略项目提供统一许可。",
      co2_definition: "强调二氧化碳移除 (CDR) 和来自生物质的负排放。",
      cross_border_rules: "在落实来自比利时的跨境二氧化碳运输方面处于领先地位 (2023)。"
    };

    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'en', 'Danish CCS Subsidy Scheme 2025', desc_en, JSON.stringify(reg_json)]);
    
    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'zh', '2025年丹麦 CCS 补贴计划', desc_zh, JSON.stringify(reg_json_zh)]);

    const scores = [['incentive', 100], ['statutory', 90], ['market', 85], ['strategic', 95], ['mrv', 90]];
    for (const s of scores) {
      db.run(`INSERT OR REPLACE INTO policy_analysis (policy_id, dimension, score, label, evidence) VALUES (?,?,?,?,?)`,
        [policyId, s[0], s[1], 'High', 'Massive state aid and biogenic carbon focus.']);
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

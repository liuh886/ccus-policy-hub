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
    const policyId = 'ae-federal-climate-law-2024';
    db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, url, pub_date, provenance_author, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [policyId, 'United Arab Emirates', 2024, 'Active', 'Regulatory', 'verified', 'Federal Decree', 'Ministry of Climate Change and Environment', 'https://www.moccae.gov.ae/', '2024-05-30', 'CCUS AI Agent', lastAuditDate]);

    const desc_en = "Federal Decree-Law No. (11) of 2024 mandates GHG MRV for all entities starting May 2025. In early 2026, Abu Dhabi launched a dedicated Carbon Capture Policy to support its 2050 Net Zero goal, establishing a regulatory framework and a National Register for Carbon Credits (NRCC).";
    const desc_zh = "2024年第 (11) 号联邦法令规定，从2025年5月开始，所有实体都必须进行温室气体 MRV 监测。2026年初，阿布扎比发布了专门的碳捕集政策，以支持其 2050 年净零排放目标，建立了监管框架和国家碳信用登记簿 (NRCC)。";

    const reg_json = {
      pore_space_rights: "Managed at Federal and Emirate level (Abu Dhabi SCFEA).",
      liability_transfer: "Federal mandate for emission reporting and liability for GHG accuracy.",
      liability_period: "MRV mandated starting May 2025 with annual reporting cycles.",
      financial_assurance: "National Register for Carbon Credits (NRCC) and credit-based incentives.",
      permitting_lead_time: "Mandatory registration for emitters exceeding 0.5M tons CO2e.",
      co2_definition: "Integrated into National GHG Inventory and Net Zero 2050 framework.",
      cross_border_rules: "Aligned with Paris Agreement Article 6 for international credit trading."
    };

    const reg_json_zh = {
      pore_space_rights: "在联邦和酋长国层面（阿布扎比 SCFEA）进行管理。",
      liability_transfer: "联邦授权进行排放报告，并对温室气体数据的准确性负责。",
      liability_period: "从2025年5月开始强制执行 MRV，并设有年度报告周期。",
      financial_assurance: "国家碳信用登记簿 (NRCC) 和基于信用的激励措施。",
      permitting_lead_time: "排放量超过 50 万吨二氧化碳当量的实体必须进行强制登记。",
      co2_definition: "纳入国家温室气体清单和 2050 年净零排放框架。",
      cross_border_rules: "符合《巴黎协定》第六条，支持国际信用交易。"
    };

    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'en', 'Federal Decree-Law No. (11) of 2024 & Abu Dhabi Carbon Capture Policy', desc_en, JSON.stringify(reg_json)]);
    
    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'zh', '2024年第 (11) 号联邦法令及阿布扎比碳捕集政策', desc_zh, JSON.stringify(reg_json_zh)]);

    const scores = [['incentive', 75], ['statutory', 85], ['market', 80], ['strategic', 90], ['mrv', 95]];
    for (const s of scores) {
      db.run(`INSERT OR REPLACE INTO policy_analysis (policy_id, dimension, score, label, evidence) VALUES (?,?,?,?,?)`,
        [policyId, s[0], s[1], 'High', 'Strong mandatory MRV and federal climate legislation.']);
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

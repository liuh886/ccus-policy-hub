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
    const policyId = 'in-national-mission-ccus-2024';
    db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, url, pub_date, provenance_author, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [policyId, 'India', 2024, 'Planned', 'Strategic', 'verified', 'Strategic Guidance', 'NITI Aayog', 'https://niti.gov.in/', '2024-07-01', 'CCUS AI Agent', lastAuditDate]);

    const desc_en = "The 2024 National Mission for CCUS, led by NITI Aayog, establishes a comprehensive framework including Viability Gap Funding (VGF), regional hub development, and a regulatory roadmap for pore space and liability. It integrates with the Indian Carbon Market (CCTS) to monetize emissions reductions.";
    const desc_zh = "由 NITI Aayog 领导的 2024 年“国家 CCUS 任务”建立了一个综合框架，包括可行性缺口资金 (VGF)、区域枢纽开发以及孔隙权和责任转移的监管路线图。它与印度碳市场 (CCTS) 集成，以实现减排量的商业化。";

    const reg_json = {
      pore_space_rights: "Leaning towards State Ownership; unified federal policy under draft.",
      liability_transfer: "Proposed transfer to State after 20-year post-closure monitoring.",
      liability_period: "Approx. 20 years (Proposed).",
      financial_assurance: "Viability Gap Funding (VGF) and Production Linked Incentives (PLI).",
      permitting_lead_time: "Streamlined via National Mission testbeds (Estimated 3-4 years).",
      co2_definition: "Industrial Resource/Carbon Asset under CCTS.",
      cross_border_rules: "Focus on domestic market; London Protocol alignment pending."
    };

    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'en', 'National Mission for CCUS & Regulatory Roadmap', desc_en, JSON.stringify(reg_json)]);
    
    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'zh', '国家 CCUS 任务与监管路线图', desc_zh, JSON.stringify(reg_json)]);

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

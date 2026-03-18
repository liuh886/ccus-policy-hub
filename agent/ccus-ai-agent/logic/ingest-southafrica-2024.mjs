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
    const policyId = 'za-climate-change-act-2024';
    db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, url, pub_date, provenance_author, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [policyId, 'South Africa', 2024, 'Active', 'Statutory', 'verified', 'Act of Parliament', 'Government of South Africa', 'https://www.gov.za/', '2024-07-23', 'CCUS AI Agent', lastAuditDate]);

    const desc_en = "The Climate Change Act No. 22 of 2024 establishes mandatory carbon budgets and sectoral emission targets. It integrates CCUS as a key technology for hard-to-abate sectors, supported by the national pilot project in Mpumalanga (confirming 34Gt storage capacity) and a transitioning carbon tax regime reaching R308/t by 2026.";
    const desc_zh = "2024年第22号气候变化法案确立了强制性碳预算和部门排放目标。它将 CCUS 作为难减排部门的关键技术，并得到了姆普马兰加省国家试点项目（确认了340亿吨封存能力）和正在转型的碳税制度的支持（到2026年达到308兰特/吨）。";

    const reg_json = {
      pore_space_rights: "Governed by MPRDA; 34Gt capacity confirmed at Leandra pilot site via Council for Geoscience (CGS).",
      liability_transfer: "Post-closure transfer to state under evaluation via national pilot project.",
      liability_period: "TBD based on Phase 2 pilot injection results (2025/26).",
      financial_assurance: "Transitioning Carbon Tax (R236/t in 2025, R308/t in 2026) with increased offset allowances.",
      permitting_lead_time: "Mandatory Carbon Budgets replacing voluntary systems (Commenced March 2025).",
      co2_definition: "Enabler for cleaner coal use (IRP 2023) and heavy industry (Sasol).",
      cross_border_rules: "Not yet defined; focus on domestic mitigation."
    };

    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'en', 'Climate Change Act (No. 22 of 2024)', desc_en, JSON.stringify(reg_json)]);
    
    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'zh', '气候变化法案 (2024年第22号)', desc_zh, JSON.stringify(reg_json)]);

    // Scores
    const scores = [['incentive', 75], ['statutory', 95], ['market', 80], ['strategic', 85], ['mrv', 85]];
    for (const s of scores) {
      db.run(`INSERT OR REPLACE INTO policy_analysis (policy_id, dimension, score, label, evidence) VALUES (?,?,?,?,?)`,
        [policyId, s[0], s[1], s[1] >= 80 ? 'High' : 'Medium', 'Enactment of Climate Change Act provides solid statutory basis with mandatory carbon budgets.']);
    }

    db.run("COMMIT");
    console.log("Ingested South Africa 2024 policy.");
  } catch (e) {
    db.run("ROLLBACK");
    throw e;
  }

  const data = db.export();
  fs.writeFileSync(DB_PATH, new Uint8Array(data));
  db.close();
}

ingest().catch(err => console.error(err));

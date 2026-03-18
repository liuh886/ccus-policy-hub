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
    const policyId = 'it-law-11-2024-modernization';
    db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, url, pub_date, provenance_author, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [policyId, 'Italy', 2024, 'Active', 'Regulatory', 'verified', 'Primary Legislation', 'MASE', 'https://www.mase.gov.it/', '2024-02-02', 'CCUS AI Agent', lastAuditDate]);

    const desc_en = "Law 11/2024 modernizes Italy's CCUS framework by amending Legislative Decree 162/2011. It designates offshore depleted reservoirs as legally suitable for storage, introduces a 20-year minimum liability transfer window, and exempts small-scale pilot projects (<100kt) from Environmental Impact Assessments. It supports the development of the Ravenna CCS hub and the Callisto Mediterranean Network.";
    const desc_zh = "第11/2024号法律通过修订第162/2011号法令，实现了意大利 CCUS 框架的现代化。该法律规定离岸枯竭油气田在法律上被视为合适的封存场址，引入了最少 20 年的责任转移窗口，并豁免了小规模试点项目（<10万吨）的环境影响评估。它支持拉文纳 (Ravenna) CCS 枢纽和 Callisto 地中海网络的发展。";

    const reg_json = {
      pore_space_rights: "Depleted offshore hydrocarbon reservoirs legally designated as suitable sites (Law 11/2024).",
      liability_transfer: "Responsibility transfers to State (MASE) after confirmation of CO2 stability.",
      liability_period: "Minimum 20 years post-closure (competitive compared to EU standard).",
      financial_assurance: "Mandatory operator security for closure and long-term monitoring.",
      permitting_lead_time: "Exemption from EIA for pilots <100kt; streamlined industrial licensing.",
      co2_definition: "Strategic decarbonization asset with non-discriminatory access rules under study.",
      cross_border_rules: "Developing Mediterranean export/import hub via Callisto Project of Common Interest (PCI)."
    };

    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'en', 'Law 11/2024 - CCUS Regulatory Modernization', desc_en, JSON.stringify(reg_json)]);
    
    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'zh', '第11/2024号法律 - CCUS 监管现代化', desc_zh, JSON.stringify(reg_json)]);

    // Scores
    const scores = [['incentive', 75], ['statutory', 95], ['market', 80], ['strategic', 90], ['mrv', 85]];
    for (const s of scores) {
      db.run(`INSERT OR REPLACE INTO policy_analysis (policy_id, dimension, score, label, evidence) VALUES (?,?,?,?,?)`,
        [policyId, s[0], s[1], 'High', 'Project-driven legislative update with focus on Mediterranean hubs.']);
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

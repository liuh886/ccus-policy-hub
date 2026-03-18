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
    const policyId = 'sa-circular-carbon-economy-2024';
    db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, url, pub_date, provenance_author, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [policyId, 'Saudi Arabia', 2024, 'Active', 'Strategic', 'verified', 'Strategic Guidance', 'Ministry of Energy', 'https://www.moenergy.gov.sa/', '2024-03-01', 'CCUS AI Agent', lastAuditDate]);

    const desc_en = "The Saudi Circular Carbon Economy (CCE) National Program framework, strengthened in 2024, establishes the Kingdom's regulatory path for the Jubail CCS Hub. It integrates the Green Financing Framework for CCUS funding and the GCOM (GHG Crediting and Offsetting Mechanism) for carbon monetization. The Ministry of Energy manages pore space as a state asset via concessions.";
    const desc_zh = "2024年强化的沙特循环碳经济 (CCE) 国家计划框架，确立了朱拜勒 (Jubail) CCS 枢纽的监管路径。它集成了用于 CCUS 融资的《绿色融资框架》和用于碳货币化的 GCOM（温室气体信贷与抵消机制）。能源部作为国家资产，通过特许权管理孔隙空间。";

    const reg_json = {
      pore_space_rights: "State-owned subsurface; concessions granted by Ministry of Energy.",
      liability_transfer: "Responsibility transfers to State after stability monitoring period.",
      liability_period: "Performance-based period (Estimated 20-30 years post-injection).",
      financial_assurance: "Green Financing Framework (2024); Green Bonds/Sukuk; Project-level guarantees.",
      permitting_lead_time: "Streamlined via Multi-user Hub infrastructure planning.",
      co2_definition: "Economic Resource/Asset under CCE framework and GCOM.",
      cross_border_rules: "Leading international producer forums; focused on Blue Hydrogen and export standards."
    };

    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'en', 'Circular Carbon Economy (CCE) National Program', desc_en, JSON.stringify(reg_json)]);
    
    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'zh', '循环碳经济 (CCE) 国家计划', desc_zh, JSON.stringify(reg_json)]);

    // Scores
    const scores = [['incentive', 90], ['statutory', 80], ['market', 85], ['strategic', 95], ['mrv', 90]];
    for (const s of scores) {
      db.run(`INSERT OR REPLACE INTO policy_analysis (policy_id, dimension, score, label, evidence) VALUES (?,?,?,?,?)`,
        [policyId, s[0], s[1], 'High', 'National program driving massive industrial hubs and carbon credit systems.']);
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

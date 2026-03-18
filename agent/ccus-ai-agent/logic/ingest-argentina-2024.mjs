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
    const policyId = 'ar-rigi-ccus-2024';
    db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, url, pub_date, provenance_author, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [policyId, 'Argentina', 2024, 'Active', 'Incentive', 'verified', 'Law (RIGI)', 'Government of Argentina', 'https://www.boletinoficial.gob.ar/', '2024-07-08', 'CCUS AI Agent', lastAuditDate]);

    const desc_en = "The 2024 Incentive Regime for Large Investments (RIGI, Law 27.742) establishes massive tax, customs, and foreign exchange incentives for projects exceeding $200M. CCUS is explicitly listed as an eligible activity within the energy sector, supporting the capture, transport, and storage of CO2, particularly for the Vaca Muerta shale basin and 'Blue Hydrogen' production.";
    const desc_zh = "2024年大型投资激励机制 (RIGI，第27.742号法律) 为超过2亿美元的项目提供了巨大的税收、海关和外汇激励。CCUS被明确列为能源部门的一项合格活动，支持二氧化碳的捕集、运输和封存，特别是针对 Vaca Muerta 页岩盆地和“蓝氢”生产。";

    const reg_json = {
      pore_space_rights: "Provincial jurisdiction; integrated into hydrocarbon mitigation programs (e.g., Neuquén Res. 21/2025).",
      liability_transfer: "TBD; likely state-centric following hydrocarbon patterns.",
      liability_period: "Not specified.",
      financial_assurance: "Massive 30-year tax, customs, and FX incentives via RIGI (Law 27.742).",
      permitting_lead_time: "Provincial mitigation programs (Neuquén/Mendoza 2025) as precursors.",
      co2_definition: "Industrial residual emissions; focus on Blue Hydrogen and shale decarbonization.",
      cross_border_rules: "Under development via National Strategy for Carbon Markets (ENUMeC)."
    };

    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'en', 'Incentive Regime for Large Investments (RIGI - CCUS 2024)', desc_en, JSON.stringify(reg_json)]);
    
    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'zh', '大型投资激励机制 (RIGI - 2024 CCUS)', desc_zh, JSON.stringify(reg_json)]);

    // Scores
    const scores = [['incentive', 95], ['statutory', 75], ['market', 70], ['strategic', 85], ['mrv', 60]];
    for (const s of scores) {
      db.run(`INSERT OR REPLACE INTO policy_analysis (policy_id, dimension, score, label, evidence) VALUES (?,?,?,?,?)`,
        [policyId, s[0], s[1], s[1] >= 80 ? 'High' : 'Medium', 'Massive financial incentives via Law 27.742 with explicit CCUS eligibility.']);
    }

    db.run("COMMIT");
    console.log("Ingested Argentina 2024 policy.");
  } catch (e) {
    db.run("ROLLBACK");
    throw e;
  }

  const data = db.export();
  fs.writeFileSync(DB_PATH, new Uint8Array(data));
  db.close();
}

ingest().catch(err => console.error(err));

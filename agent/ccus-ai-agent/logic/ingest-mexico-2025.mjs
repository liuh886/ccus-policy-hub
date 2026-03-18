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
    const policyId = 'mx-sener-ccus-2025';
    db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, url, pub_date, provenance_author, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [policyId, 'Mexico', 2025, 'Active', 'Strategic', 'verified', 'Executive Order/Framework', 'SENER', 'https://www.gob.mx/sener', '2025-05-15', 'CCUS AI Agent', lastAuditDate]);

    const desc_en = "The 2025 SENER CCUS Legal Framework re-integrates carbon capture into Mexico's national climate strategy, aiming for a 35% emissions reduction by 2030. It plans the development of CCS clusters by 2027 and prioritizes state-led initiatives via PEMEX (CO2-EOR) and CFE (Plan México) while leveraging subnational leadership in states like Tamaulipas and Querétaro.";
    const desc_zh = "2025年 SENER CCUS 法律框架将碳捕集重新纳入墨西哥的国家气候战略，目标是到2030年减排35%。它计划在2027年之前开发 CCS 集群，并优先考虑通过 PEMEX (CO2-EOR) 和 CFE (Plan México) 实施的国家主导举措，同时利用塔毛利帕斯州和克雷塔罗州等地方政府的领导力。";

    const reg_json = {
      pore_space_rights: "Currently under national hydrocarbon law; new state-led framework to clarify specific storage rights.",
      liability_transfer: "TBD by 2025 SENER Legal Framework.",
      liability_period: "TBD.",
      financial_assurance: "State-level carbon tax offsets (e.g., Querétaro 50% offset limit).",
      permitting_lead_time: "Targeting cluster-based permitting by 2027.",
      co2_definition: "Essential for industrial decarbonization; focus on state-owned PEMEX/CFE assets.",
      cross_border_rules: "Proposed regional cooperation via Tamaulipas hub."
    };

    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'en', 'SENER CCUS Legal Framework & CCS Cluster Strategy (2025)', desc_en, JSON.stringify(reg_json)]);
    
    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'zh', 'SENER CCUS 法律框架与 CCS 集群战略 (2025)', desc_zh, JSON.stringify(reg_json)]);

    // Scores
    const scores = [['incentive', 65], ['statutory', 75], ['market', 60], ['strategic', 90], ['mrv', 70]];
    for (const s of scores) {
      db.run(`INSERT OR REPLACE INTO policy_analysis (policy_id, dimension, score, label, evidence) VALUES (?,?,?,?,?)`,
        [policyId, s[0], s[1], s[1] >= 80 ? 'High' : 'Medium', 'Renewed strategic focus under Sheinbaum administration with specific cluster targets.']);
    }

    db.run("COMMIT");
    console.log("Ingested Mexico 2025 policy.");
  } catch (e) {
    db.run("ROLLBACK");
    throw e;
  }

  const data = db.export();
  fs.writeFileSync(DB_PATH, new Uint8Array(data));
  db.close();
}

ingest().catch(err => console.error(err));

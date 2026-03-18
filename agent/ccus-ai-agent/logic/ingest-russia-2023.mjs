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
    const policyId = 'ru-climate-doctrine-2023';
    db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, url, pub_date, provenance_author, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [policyId, 'Russia', 2023, 'Active', 'Strategic', 'verified', 'Presidential Decree', 'President of Russia', 'http://kremlin.ru/', '2023-10-26', 'CCUS AI Agent', lastAuditDate]);

    const desc_en = "The updated 2023 Climate Doctrine of the Russian Federation reaffirms carbon neutrality by 2060 and prioritizes CCUS development. It is supported by mandatory carbon reporting for large emitters (starting 2023) and the Sakhalin Carbon Experiment, which aims for regional neutrality by 2025 through a quota-based system and domestic technological sovereignty.";
    const desc_zh = "更新后的2023年俄罗斯联邦气候条约重申了到2060年实现碳中和的目标，并优先发展 CCUS。该条约得到了大型排放源强制性碳报告（从2023年开始）和萨哈林碳实验的支持，后者旨在通过配额制度和国内技术自主实现2025年区域碳中和。";

    const reg_json = {
      pore_space_rights: "Federal ownership of subsurface resources; utilization of depleted reservoirs by state firms (Rosneft/Gazprom Neft).",
      liability_transfer: "State-centric model; TBD specifics in new regulatory framework.",
      liability_period: "Not specified.",
      financial_assurance: "Penalties for exceeding quotas (Sakhalin: 1,000 RUB/ton); focus on domestic R&D funding.",
      permitting_lead_time: "Mandatory reporting thresholds (>50k tons by 2025) and quota compliance by July 2025.",
      co2_definition: "Critical for 'Blue Hydrogen' and industrial technological sovereignty.",
      cross_border_rules: "Mutual recognition of carbon units within BRICS and EAEU frameworks."
    };

    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'en', 'Climate Doctrine of the Russian Federation (2023 Update)', desc_en, JSON.stringify(reg_json)]);
    
    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'zh', '俄罗斯联邦气候条约 (2023年更新)', desc_zh, JSON.stringify(reg_json)]);

    // Scores
    const scores = [['incentive', 60], ['statutory', 80], ['market', 65], ['strategic', 85], ['mrv', 75]];
    for (const s of scores) {
      db.run(`INSERT OR REPLACE INTO policy_analysis (policy_id, dimension, score, label, evidence) VALUES (?,?,?,?,?)`,
        [policyId, s[0], s[1], s[1] >= 80 ? 'High' : 'Medium', 'Formalization of carbon reporting and regional pilot experiments with quota-based compliance.']);
    }

    db.run("COMMIT");
    console.log("Ingested Russia 2023 policy.");
  } catch (e) {
    db.run("ROLLBACK");
    throw e;
  }

  const data = db.export();
  fs.writeFileSync(DB_PATH, new Uint8Array(data));
  db.close();
}

ingest().catch(err => console.error(err));

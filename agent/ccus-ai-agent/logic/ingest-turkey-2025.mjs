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
    const policyId = 'tr-climate-law-2025';
    db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, url, pub_date, provenance_author, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [policyId, 'Turkey', 2025, 'Active', 'Statutory', 'verified', 'Law No. 7552', 'Grand National Assembly of Turkey', 'https://www.resmigazete.gov.tr/', '2025-07-09', 'CCUS AI Agent', lastAuditDate]);

    const desc_en = "Climate Law No. 7552 (2025) provides the legal foundation for a national Emissions Trading System (TR ETS) and a 2053 Net-Zero target. It targets carbon-intensive sectors (Cement, Steel, Electricity) for CBAM alignment and introduces 'Green Taxonomy' regulations to unlock CCUS infrastructure financing.";
    const desc_zh = "2025年第7552号气候法案为国家排放交易体系 (TR ETS) 和2053年净零排放目标奠定了法律基础。它针对碳密集型行业（水泥、钢铁、电力）进行 CBAM 对接，并引入“绿色分类法”法规以解锁 CCUS 基础设施融资。";

    const reg_json = {
      pore_space_rights: "Identified in LTS 2053 for industrial clusters; detailed storage rights to be defined via Green Taxonomy 2025.",
      liability_transfer: "TBD under ETS regulatory framework.",
      liability_period: "TBD.",
      financial_assurance: "Administrative penalties (up to 50m TRY); TR ETS cap-and-trade system (Pilot 2026).",
      permitting_lead_time: "Mandatory ETS permits for installations >50k tons CO2/year.",
      co2_definition: "Primary decarbonization route for cement and steel sectors via LTS 2053 roadmaps.",
      cross_border_rules: "Strong alignment with EU CBAM definitive period (2026) for export protection."
    };

    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'en', 'Climate Law (No. 7552 of 2025)', desc_en, JSON.stringify(reg_json)]);
    
    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'zh', '气候法 (2025年第7552号)', desc_zh, JSON.stringify(reg_json)]);

    // Scores
    const scores = [['incentive', 70], ['statutory', 95], ['market', 85], ['strategic', 90], ['mrv', 80]];
    for (const s of scores) {
      db.run(`INSERT OR REPLACE INTO policy_analysis (policy_id, dimension, score, label, evidence) VALUES (?,?,?,?,?)`,
        [policyId, s[0], s[1], s[1] >= 80 ? 'High' : 'Medium', 'New framework law establishes TR ETS and mandatory compliance for industrial sectors.']);
    }

    db.run("COMMIT");
    console.log("Ingested Turkey 2025 policy.");
  } catch (e) {
    db.run("ROLLBACK");
    throw e;
  }

  const data = db.export();
  fs.writeFileSync(DB_PATH, new Uint8Array(data));
  db.close();
}

ingest().catch(err => console.error(err));

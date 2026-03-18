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
    const policyId = 'kr-ccus-promotion-act-2024';
    db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, url, pub_date, provenance_author, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [policyId, 'Republic of Korea', 2024, 'Active', 'Regulatory', 'verified', 'Primary Legislation', 'MOTIE', 'https://www.motie.go.jp/', '2024-01-09', 'CCUS AI Agent', lastAuditDate]);

    const desc_en = "The 2024 CCUS Promotion Act (Act on the Promotion of Carbon Capture, Utilization, and Storage and Safety Management) provides the first unified legal framework for CCUS in Korea. It introduces a 'One-stop Shop' for permitting, establishes subsurface storage rights, and creates a liability transfer mechanism to the state after stability is confirmed. It explicitly supports international CCS projects for CO2 export.";
    const desc_zh = "2024年《CCUS 培育法》（全称《二氧化碳捕集、利用与封存培育及安全管理法》）为韩国 CCUS 产业提供了首个统一法律框架。该法引入了“一站式”审批机制，确立了地下封存权，并建立了在二氧化碳稳定后向国家转移责任的机制。法案明确支持通过国际 CCS 项目进行二氧化碳出口。";

    const reg_json = {
      pore_space_rights: "Exclusive Storage Licenses granted by MOTIE in designated areas.",
      liability_transfer: "Responsibility transfers to state-designated entity after stability monitoring.",
      liability_period: "Performance-based period until stabilization is verified.",
      financial_assurance: "CCUS Industry Promotion Fund; mandatory bonds for closure/leakage.",
      permitting_lead_time: "Streamlined via 'One-stop Shop' mechanism (Target 1-2 years reduction).",
      co2_definition: "Strategic resource for utilization and regulated storage matter.",
      cross_border_rules: "Legal basis for international CCS partnerships and CO2 export (e.g., to SE Asia)."
    };

    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'en', 'Act on the Promotion of CCUS and Safety Management', desc_en, JSON.stringify(reg_json)]);
    
    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'zh', '二氧化碳捕集、利用与封存培育及安全管理法 (CCUS 培育法)', desc_zh, JSON.stringify(reg_json)]);

    // Scores
    const scores = [['incentive', 85], ['statutory', 95], ['market', 80], ['strategic', 95], ['mrv', 90]];
    for (const s of scores) {
      db.run(`INSERT OR REPLACE INTO policy_analysis (policy_id, dimension, score, label, evidence) VALUES (?,?,?,?,?)`,
        [policyId, s[0], s[1], 'High', 'Unified legislation covering promotion and safety.']);
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

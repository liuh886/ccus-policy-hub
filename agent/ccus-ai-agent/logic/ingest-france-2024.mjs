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
    const policyId = 'fr-ccus-strategy-2024';
    db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, url, pub_date, provenance_author, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [policyId, 'France', 2024, 'Active', 'Strategic', 'verified', 'Strategic Guidance', 'MTE', 'https://www.ecologie.gouv.fr/', '2024-07-01', 'CCUS AI Agent', lastAuditDate]);

    const desc_en = "The 2024 French CCUS Strategy establishes a comprehensive roadmap to capture 4-8 Mtpa of CO2 by 2030. It prioritizes hard-to-abate sectors, implements a Carbon Contract for Difference (CCfD) subsidy mechanism, and establishes the legal basis for cross-border CO2 transport through a 2024 bilateral agreement with Norway. It also streamlines subsurface permitting via the Green Industry Act.";
    const desc_zh = "2024年法国 CCUS 战略确立了到2030年每年捕集 400-800 万吨二氧化碳的综合路线图。该战略优先考虑难减排行业，实施碳差价合约 (CCfD) 补贴机制，并于2024年通过与挪威签署双边协议，建立了跨境二氧化碳运输的法律基础。它还通过《绿色工业法》简化了地下资源开发的审批。";

    const reg_json = {
      pore_space_rights: "Strong State control; streamlined site conversion via Green Industry Act.",
      liability_transfer: "Responsibility transfers to State after stability confirmation (post-closure).",
      liability_period: "Approx. 20-30 years (aligned with EU Directive 2009/31/EC).",
      financial_assurance: "15-year Carbon Contract for Difference (CCfD) mechanism.",
      permitting_lead_time: "Streamlined via 4 primary industrial hubs (Dunkirk, Le Havre, etc.).",
      co2_definition: "Strictly reserved for unavoidable industrial residual emissions.",
      cross_border_rules: "Leading advocate for London Protocol compliance; 2024 bilateral export agreement with Norway."
    };

    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'en', 'Strategy for Decarbonising Industry (CCUS Roadmap 2024)', desc_en, JSON.stringify(reg_json)]);
    
    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'zh', '工业脱碳战略 (2024 CCUS 路线图)', desc_zh, JSON.stringify(reg_json)]);

    // Scores
    const scores = [['incentive', 85], ['statutory', 80], ['market', 75], ['strategic', 95], ['mrv', 85]];
    for (const s of scores) {
      db.run(`INSERT OR REPLACE INTO policy_analysis (policy_id, dimension, score, label, evidence) VALUES (?,?,?,?,?)`,
        [policyId, s[0], s[1], 'High', 'Strategic roadmap with financial instruments and international agreements.']);
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

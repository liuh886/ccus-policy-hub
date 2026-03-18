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
    // 1. EU Base Directive
    const euId = 'eu-ccs-directive-2009';
    db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, url, pub_date, provenance_author, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [euId, 'European Union', 2009, 'Active', 'Regulatory', 'verified', 'Primary Legislation', 'EU Commission', 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32009L0031', '2009-04-23', 'CCUS AI Agent', lastAuditDate]);

    // 2. Germany CMS 2024
    const deId = 'de-carbon-management-strategy-2024';
    db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, url, pub_date, provenance_author, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [deId, 'Germany', 2024, 'Active', 'Strategic', 'verified', 'Strategic Guidance', 'BMWK', 'https://www.bmwk.de/Redaktion/EN/Pressemitteilungen/2024/02/20240226-habeck-paves-the-way-for-ccs-in-germany.html', '2024-08-01', 'CCUS AI Agent', lastAuditDate]);

    const desc_en = "The 2024 Carbon Management Strategy (CMS) and the KSpG amendment mark Germany's pivotal shift towards proactive CCUS implementation. It permits offshore storage in the EEZ, grants federal states 'opt-in' powers for onshore storage, and defines CCUS as being in the 'overriding public interest' to accelerate permitting. Coal-fired power is excluded.";
    const desc_zh = "2024年发布的《碳管理战略》(CMS) 及《二氧化碳封存法》(KSpG) 修订版标志着德国转向积极实施 CCUS。该战略允许在专属经济区（EEZ）进行离岸封存，授予联邦州对陆上封存的“选择性加入”权，并将 CCUS 定义为“压倒一切的公共利益”以加速审批。煤电被排除在外。";

    const reg_json = {
      pore_space_rights: "Offshore storage permitted in EEZ; Onshore is 'Opt-in' by Federal States.",
      liability_transfer: "Standardized 40-year monitoring period post-closure before state transfer.",
      liability_period: "Approx. 40 years (aligned with EU Directive 2009/31/EC).",
      financial_assurance: "EUR 3.3 billion KTF funding; mandatory operator security for site closure.",
      permitting_lead_time: "Accelerated via 'Overriding Public Interest' status.",
      co2_definition: "Strategic tool for hard-to-abate industries; coal-sector exclusion.",
      cross_border_rules: "Ratifying London Protocol amendment to enable CO2 export."
    };

    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [deId, 'en', 'Carbon Management Strategy (CMS) & KSpG Amendment', desc_en, JSON.stringify(reg_json)]);
    
    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [deId, 'zh', '碳管理战略 (CMS) 与二氧化碳封存法修订案', desc_zh, JSON.stringify(reg_json)]);

    // 3. Scores
    const scores = [['incentive', 80], ['statutory', 90], ['market', 70], ['strategic', 95], ['mrv', 85]];
    for (const s of scores) {
      db.run(`INSERT OR REPLACE INTO policy_analysis (policy_id, dimension, score, label, evidence) VALUES (?,?,?,?,?)`,
        [deId, s[0], s[1], 'High', 'Aligned with 2045 Climate Neutrality target.']);
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

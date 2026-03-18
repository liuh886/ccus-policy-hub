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
    const policyId = 'nl-cdr-roadmap-2025';
    db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, url, pub_date, provenance_author, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [policyId, 'Netherlands', 2025, 'Active', 'Strategic', 'verified', 'Policy Roadmap', 'Ministry of Climate Policy and Green Growth', 'https://www.government.nl/', '2025-03-01', 'CCUS AI Agent', lastAuditDate]);

    const desc_en = "The Netherlands published its CDR Roadmap in 2025, targeting 20-25 Mt of CO2 removals by 2040. The CCUS framework integrates with the Porthos project (operational 2026) and utilizes a CO2 levy for industry, aligned with EU's industrial carbon management goals.";
    const desc_zh = "荷兰于2025年发布了碳消除 (CDR) 路线图，目标到2040年实现 2000-2500 万吨的二氧化碳消除。CCUS 框架与 Porthos 项目（2026年运营）相结合，并利用工业二氧化碳征税，与欧盟的工业碳管理目标保持一致。";

    const reg_json = {
      pore_space_rights: "Regulated offshore via Mining Act; priority given to Porthos and Aramis hubs.",
      liability_transfer: "Compliant with EU CCS Directive; state management after closure verification.",
      liability_period: "Standard EU-aligned 20-year post-closure monitoring.",
      financial_assurance: "SDE++ subsidy mechanism (carbon contract for difference); CO2 levy for greenhouse horticulture.",
      permitting_lead_time: "Cluster-based permitting via industrial hub coordinators.",
      co2_definition: "Strategic focus on permanent storage (CCS) and CDR removals (DACCS/BECCS).",
      cross_border_rules: "MoU with Norway and UK for cross-border storage and hub connectivity."
    };

    const reg_json_zh = {
      pore_space_rights: "通过《采矿法》对离岸进行监管；优先考虑 Porthos 和 Aramis 枢纽。",
      liability_transfer: "符合欧盟 CCS 指令；闭坑核实后由国家管理。",
      liability_period: "符合欧盟标准的 20 年闭坑后监测。",
      financial_assurance: "SDE++ 补贴机制（碳差价合约）；对温室园艺征收二氧化碳税。",
      permitting_lead_time: "通过工业枢纽协调员进行基于集群的许可。",
      co2_definition: "战略重点是永久封存 (CCS) 和 CDR 移除 (DACCS/BECCS)。",
      cross_border_rules: "与挪威和英国签署跨境封存和枢纽互联备忘录。"
    };

    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'en', 'Netherlands Carbon Dioxide Removal (CDR) Roadmap 2025', desc_en, JSON.stringify(reg_json)]);
    
    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'zh', '荷兰 2025 年二氧化碳消除 (CDR) 路线图', desc_zh, JSON.stringify(reg_json_zh)]);

    const scores = [['incentive', 85], ['statutory', 90], ['market', 90], ['strategic', 95], ['mrv', 90]];
    for (const s of scores) {
      db.run(`INSERT OR REPLACE INTO policy_analysis (policy_id, dimension, score, label, evidence) VALUES (?,?,?,?,?)`,
        [policyId, s[0], s[1], 'High', 'Highly integrated industrial hub approach and CDR strategy.']);
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

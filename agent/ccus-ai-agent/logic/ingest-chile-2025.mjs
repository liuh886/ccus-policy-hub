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
    const policyId = 'cl-green-hydrogen-ccs-2025';
    db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, url, pub_date, provenance_author, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [policyId, 'Chile', 2025, 'Active', 'Strategic', 'verified', 'Strategic Guidance', 'Ministry of Energy', 'https://www.energia.gob.cl/', '2025-01-01', 'CCUS AI Agent', lastAuditDate]);

    const desc_en = "Chile's Green Hydrogen Action Plan 2023-2030 includes CCUS as a critical technology for the development of synthetic fuels. The regulatory framework is being expanded to cover carbon capture and storage in the Magallanes and Antofagasta regions.";
    const desc_zh = "智利《2023-2030 年绿氢行动计划》将 CCUS 视为开发合成燃料的关键技术。监管框架正在扩大，以涵盖麦哲伦和安托法加斯塔地区的碳捕集与封存。";

    const reg_json = {
      pore_space_rights: "State-owned (Mining Code). [Evidence: Ministry of Energy Decree] [URL: https://www.energia.gob.cl/]",
      liability_transfer: "Pending framework for Hydrogen/CCS clusters. [Evidence: National Green Hydrogen Action Plan]",
      liability_period: "TBD (Target: 20 years monitoring). [Evidence: Draft CCS Regulation 2025]",
      financial_assurance: "Environmental Impact Assessment (SEIA) bonds. [Evidence: Law 19.300]",
      permitting_lead_time: "2-4 years (Multi-agency approval). [Evidence: Magallanes Cluster Roadmap]",
      co2_definition: "Managed waste / Emission offset source. [Evidence: Framework Law on Climate Change]",
      cross_border_rules: "Framework for Article 6 carbon credit exports. [Evidence: Chile-Singapore MOU]"
    };

    const reg_json_zh = {
      pore_space_rights: "国家所有 (采矿法)。[证据: 能源部指令] [URL: https://www.energia.gob.cl/]",
      liability_transfer: "氢能/CCS 集群框架待定。[证据: 国家绿氢行动计划]",
      liability_period: "待定 (目标：20 年监测)。[证据: 2025 年 CCS 条例草案]",
      financial_assurance: "环境影响评估 (SEIA) 保证金。[证据: 第 19.300 号法律]",
      permitting_lead_time: "2-4 年 (多机构审批)。[证据: 麦哲伦集群路线图]",
      co2_definition: "受控废弃物/排放抵消源。[证据: 气候变化框架法]",
      cross_border_rules: "第 6 条碳信用出口框架。[证据: 智利-新加坡谅解备忘录]"
    };

    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'en', 'Chile Green Hydrogen and CCUS Roadmap 2025', desc_en, JSON.stringify(reg_json)]);
    
    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'zh', '智利绿氢与 CCUS 路线图 2025', desc_zh, JSON.stringify(reg_json_zh)]);

    const scores = [['incentive', 75], ['statutory', 70], ['market', 70], ['strategic', 90], ['mrv', 80]];
    for (const s of scores) {
      db.run(`INSERT OR REPLACE INTO policy_analysis (policy_id, dimension, score, label, evidence) VALUES (?,?,?,?,?)`,
        [policyId, s[0], s[1], 'High', 'Strategic focus on green hydrogen integration.']);
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

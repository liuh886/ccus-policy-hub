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
    const policyId = 'vn-carbon-market-decree-2025';
    db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, url, pub_date, provenance_author, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [policyId, 'Vietnam', 2025, 'Active', 'Regulatory', 'verified', 'Decree', 'Ministry of Natural Resources and Environment (MONRE)', 'https://monre.gov.vn/', '2025-10-01', 'CCUS AI Agent', lastAuditDate]);

    const desc_en = "Vietnam's Decree 119/2025 and 29/2026 establish the legal framework for the domestic carbon market. In 2026, pilot GHG quotas were authorized for 110 large facilities, totaling 243 Mt CO2e. The full ETS official operation is scheduled for 2029.";
    const desc_zh = "越南 119/2025 号和 29/2026 号法令为国内碳市场建立了法律框架。2026 年，政府批准为 110 家大型设施发放温室气体配额试点，共计 2.43 亿吨二氧化碳当量。全规模碳排放交易系统 (ETS) 计划于 2029 年正式运行。";

    const reg_json = {
      pore_space_rights: "Managed under the Mineral Resources Law and new carbon decrees.",
      liability_transfer: "Pilot phase focuses on quota allocation; long-term liability transfer details pending.",
      liability_period: "Annual compliance cycles for the 110 facilities under the pilot phase.",
      financial_assurance: "Creation of the domestic carbon exchange to facilitate credit trading.",
      permitting_lead_time: "Consolidated MRV reporting required for facilities to receive quotas.",
      co2_definition: "Defined as an industrial emissions factor subject to national quota management.",
      cross_border_rules: "Framework preparing for integration with international carbon markets (Article 6)."
    };

    const reg_json_zh = {
      pore_space_rights: "根据《矿产资源法》和新的碳法令进行管理。",
      liability_transfer: "试点阶段重点在于配额分配；长期责任转移详情待定。",
      liability_period: "试点阶段下 110 家设施的年度合规周期。",
      financial_assurance: "创建国内碳交易所，以促进信用交易。",
      permitting_lead_time: "设施接收配额需要提交统一的 MRV 报告。",
      co2_definition: "定义为受国家配额管理的工业排放因子。",
      cross_border_rules: "正在准备与国际碳市场接轨的框架（第 6 条）。"
    };

    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'en', 'Vietnam Domestic Carbon Market Framework 2025', desc_en, JSON.stringify(reg_json)]);
    
    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'zh', '越南国内碳市场框架 2025', desc_zh, JSON.stringify(reg_json_zh)]);

    const scores = [['incentive', 80], ['statutory', 85], ['market', 90], ['strategic', 85], ['mrv', 90]];
    for (const s of scores) {
      db.run(`INSERT OR REPLACE INTO policy_analysis (policy_id, dimension, score, label, evidence) VALUES (?,?,?,?,?)`,
        [policyId, s[0], s[1], 'High', 'Operational pilot carbon exchange and quota system.']);
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

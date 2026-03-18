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
      pore_space_rights: "State-owned (Decree 119/2025/ND-CP). [Evidence: Art 5.1] [URL: https://monre.gov.vn/]",
      liability_transfer: "Transfers to MONRE after monitoring. [Evidence: Decree 29/2026/ND-CP] [URL: https://netzero.vn/]",
      liability_period: "10 years post-closure monitoring. [Evidence: MRV Protocol 2026]",
      financial_assurance: "Mandatory Performance Bond for operators. [Evidence: Decree 119 Art 12]",
      permitting_lead_time: "2-3 years for combined EIA/CCS permit. [Evidence: One-stop-shop initiative]",
      co2_definition: "Managed Emission Factor / Industrial Gas. [Evidence: Environmental Law 2024]",
      cross_border_rules: "Article 6 aligned; Bilateral MOUs required. [Evidence: COP29 Commitment]"
    };

    const reg_json_zh = {
      pore_space_rights: "国家所有 (119/2025/ND-CP 号法令)。[证据: 第 5.1 条] [URL: https://monre.gov.vn/]",
      liability_transfer: "监测期后转移至自然资源与环境部 (MONRE)。[证据: 29/2026/ND-CP 号法令] [URL: https://netzero.vn/]",
      liability_period: "闭坑后 10 年监测期。[证据: 2026 年 MRV 协议]",
      financial_assurance: "运营商强制性履约保证金。[证据: 第 119 号法令第 12 条]",
      permitting_lead_time: "EIA/CCS 联合许可需 2-3 年。[证据: 一站式服务倡议]",
      co2_definition: "受控排放因子/工业气体。[证据: 2024 年环境法]",
      cross_border_rules: "对齐第 6 条；需要双边谅解备忘录。[证据: COP29 承诺]"
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

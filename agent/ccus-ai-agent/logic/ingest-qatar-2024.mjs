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
    const policyId = 'qa-national-climate-strategy-2024';
    db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, url, pub_date, provenance_author, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [policyId, 'Qatar', 2024, 'Active', 'Strategic', 'verified', 'National Strategy', 'Ministry of Environment and Climate Change', 'https://www.mecc.gov.qa/', '2024-05-01', 'CCUS AI Agent', lastAuditDate]);

    const desc_en = "Qatar's refreshed National Environment and Climate Change Strategy (2024) focuses on integrating CCUS into its LNG expansion. It targets a 25% GHG reduction by 2030 and aims to capture 11 Mt CO2/year by 2035, supported by new MRV systems and regulatory standards for carbon management.";
    const desc_zh = "卡塔尔 2024 年更新的国家环境与气候变化战略侧重于将 CCUS 纳入其液化天然气 (LNG) 扩张中。该战略目标到 2030 年减少 25% 的温室气体排放，并计划到 2035 年每年捕集 1100 万吨二氧化碳，并辅之以新的 MRV 系统和碳管理监管标准。";

    const reg_json = {
      pore_space_rights: "Managed by the State via QatarEnergy and the Ministry of Environment.",
      liability_transfer: "Long-term liability for permanent storage overseen by state-led QatarEnergy framework.",
      liability_period: "Aligned with project lifecycle (typically 25+ years) with state oversight.",
      financial_assurance: "Investment largely driven by state-owned QatarEnergy North Field expansion.",
      permitting_lead_time: "Streamlined integration with large-scale LNG infrastructure permits.",
      co2_definition: "Strategic industrial emission for sequestration and enhanced oil recovery (EOR).",
      cross_border_rules: "Focus on Article 6 international credit trading for national decarbonization."
    };

    const reg_json_zh = {
      pore_space_rights: "由国家通过卡塔尔能源公司 (QatarEnergy) 和环境部进行管理。",
      liability_transfer: "永久封存的长期责任由国家主导的卡塔尔能源框架监督。",
      liability_period: "与项目生命周期（通常为 25 年以上）保持一致，受国家监督。",
      financial_assurance: "投资主要由国有的卡塔尔能源公司北场 (North Field) 扩建项目推动。",
      permitting_lead_time: "与大型 LNG 基础设施许可流程简化整合。",
      co2_definition: "用于封存和提高石油采收率 (EOR) 的战略工业排放。",
      cross_border_rules: "侧重于利用第 6 条国际信用交易来实现国家脱碳。"
    };

    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'en', 'Qatar National Environment and Climate Change Strategy 2024', desc_en, JSON.stringify(reg_json)]);
    
    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'zh', '卡塔尔国家环境与气候变化战略 2024', desc_zh, JSON.stringify(reg_json_zh)]);

    const scores = [['incentive', 80], ['statutory', 75], ['market', 70], ['strategic', 95], ['mrv', 85]];
    for (const s of scores) {
      db.run(`INSERT OR REPLACE INTO policy_analysis (policy_id, dimension, score, label, evidence) VALUES (?,?,?,?,?)`,
        [policyId, s[0], s[1], 'High', 'Highly integrated into massive national LNG infrastructure.']);
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

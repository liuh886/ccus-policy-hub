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
    const policyId = 'eg-carbon-market-framework-2024';
    db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, url, pub_date, provenance_author, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [policyId, 'Egypt', 2024, 'Active', 'Regulatory', 'verified', 'Regulatory Directive', 'Financial Regulatory Authority (FRA)', 'https://fra.gov.eg/', '2024-08-01', 'CCUS AI Agent', lastAuditDate]);

    const desc_en = "Egypt launched Africa's first regulated Voluntary Carbon Market (VCM) in 2024. By early 2026, a new directive mandates that large non-bank financial institutions offset 20% of their annual emissions through carbon credits. Egypt also implemented a carbon tax (1% of coal price) targeting the cement industry.";
    const desc_zh = "埃及于 2024 年启动了非洲首个受监管的自愿碳市场 (VCM)。到 2026 年初，一项新指令要求大型非银行金融机构通过碳信用抵消其 20% 的年度排放。埃及还对水泥行业实施了碳税（占煤炭价格的 1%）。";

    const reg_json = {
      pore_space_rights: "Controlled via the Ministry of Petroleum and Mineral Resources.",
      liability_transfer: "Regulatory oversight by the FRA for credit validity; project liability via state framework.",
      liability_period: "Aligned with credit vintage and long-term storage monitoring requirements.",
      financial_assurance: "Regulated carbon credit exchange and mandatory 20% offset for FIs.",
      permitting_lead_time: "FRA acts as a central authority for carbon project registration and credit issuance.",
      co2_definition: "Industrial asset for carbon credit generation under the FRA framework.",
      cross_border_rules: "Focus on regional carbon hub leadership in Africa and Article 6 cooperation."
    };

    const reg_json_zh = {
      pore_space_rights: "由石油和矿产资源部控制。",
      liability_transfer: "FRA 对信用有效性进行监管；项目责任通过国家框架管理。",
      liability_period: "根据信用年份和长期封存监测要求保持一致。",
      financial_assurance: "受监管的碳信用交易所，及针对金融机构的强制性 20% 抵消要求。",
      permitting_lead_time: "FRA 作为碳项目登记和信用发放的中央机构。",
      co2_definition: "在 FRA 框架下产生碳信用的工业资产。",
      cross_border_rules: "侧重于非洲区域碳枢纽的领导地位和第 6 条下的合作。"
    };

    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'en', 'Egypt Carbon Market Regulatory Framework 2024', desc_en, JSON.stringify(reg_json)]);
    
    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'zh', '埃及碳市场监管框架 2024', desc_zh, JSON.stringify(reg_json_zh)]);

    const scores = [['incentive', 85], ['statutory', 80], ['market', 90], ['strategic', 85], ['mrv', 85]];
    for (const s of scores) {
      db.run(`INSERT OR REPLACE INTO policy_analysis (policy_id, dimension, score, label, evidence) VALUES (?,?,?,?,?)`,
        [policyId, s[0], s[1], 'High', 'First regulated VCM in Africa and mandatory offsets.']);
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

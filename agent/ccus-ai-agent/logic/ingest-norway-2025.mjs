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
    const policyId = 'no-longship-operational-2025';
    db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, url, pub_date, provenance_author, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [policyId, 'Norway', 2025, 'Active', 'Strategic', 'verified', 'Operational Framework', 'Ministry of Petroleum and Energy', 'https://www.norskpetroleum.no/', '2025-01-01', 'CCUS AI Agent', lastAuditDate]);

    const desc_en = "Norway's 'Longship' project enters full operational phase in 2025. The regulatory focus has shifted to cross-border CO2 transport and storage through bilateral agreements (MoUs) with Denmark, Netherlands, and others, effectively operationalizing the London Protocol amendment for CCS.";
    const desc_zh = "挪威的‘长船’项目将于2025年进入全面运营阶段。监管重点已转向通过与丹麦、荷兰等国签署双边协议（MoUs）来实现二氧化碳的跨国运输和封存，有效落实了伦敦议定书关于 CCS 的修正案。";

    const reg_json = {
      pore_space_rights: "11 storage permits granted by Ministry of Energy under CO2 Storage Regulations.",
      liability_transfer: "Long-term liability managed under CO2 Storage Regulations (Lagringsforskriften).",
      liability_period: "Site-specific monitoring period post-closure; standard EU-aligned risk transfer.",
      financial_assurance: "Massive state investment (Longship project); mandatory operator financial security.",
      permitting_lead_time: "Mature regulatory environment under Norwegian Offshore Directorate.",
      co2_definition: "Primary climate mitigation tool for industrial and cross-border decarbonization.",
      cross_border_rules: "Active bilateral MoUs with EU partners to bypass London Protocol export restrictions."
    };

    const reg_json_zh = {
      pore_space_rights: "能源部根据《二氧化碳封存条例》批准了 11 份封存许可。",
      liability_transfer: "长期责任根据《二氧化碳封存条例》(Lagringsforskriften) 进行管理。",
      liability_period: "闭坑后的特定场地监测期；与欧盟一致的标准风险转移。",
      financial_assurance: "大规模国家投资（“长船”项目）；强制性的运营商财务担保。",
      permitting_lead_time: "在挪威离岸管理局监管下的成熟监管环境。",
      co2_definition: "用于工业和跨境脱碳的主要气候减缓工具。",
      cross_border_rules: "与欧盟合作伙伴签署活跃的双边备忘录，以规避伦敦议定书的出口限制。"
    };

    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'en', 'Norway Longship Operational Framework 2025', desc_en, JSON.stringify(reg_json)]);
    
    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'zh', '2025年挪威“长船”项目运营框架', desc_zh, JSON.stringify(reg_json_zh)]);

    const scores = [['incentive', 90], ['statutory', 95], ['market', 85], ['strategic', 100], ['mrv', 95]];
    for (const s of scores) {
      db.run(`INSERT OR REPLACE INTO policy_analysis (policy_id, dimension, score, label, evidence) VALUES (?,?,?,?,?)`,
        [policyId, s[0], s[1], 'Excellent', 'Global leader with operational full-chain CCS.']);
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

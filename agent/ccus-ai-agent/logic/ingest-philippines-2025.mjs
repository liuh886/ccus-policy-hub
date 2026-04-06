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
    const policyId = 'ph-doe-circular-2025';
    db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, url, pub_date, provenance_author, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [policyId, 'Philippines', 2025, 'Active', 'Regulatory', 'verified', 'Department Circular', 'Department of Energy (DOE)', 'https://www.doe.gov.ph/', '2025-10-15', 'CCUS AI Agent', lastAuditDate]);

    const desc_en = "The DOE Circular DC2025-09-0018 establishes the comprehensive regulatory framework for Carbon Capture, Utilization, and Storage (CCUS) in the Philippines. It defines CO2 as a 'mitigation outcome' to align with Article 6 of the Paris Agreement, utilizes a Service Contract model for pore space access, and mandates financial assurance for long-term monitoring and remediation.";
    const desc_zh = "能源部第 DC2025-09-0018 号循环公告确立了菲律宾碳捕集、利用与封存 (CCUS) 的全面监管框架。它将二氧化碳定义为“减排成果”，以符合《巴黎协定》第6条的规定，利用服务合同模型进行孔隙空间准入，并强制要求为长期监测和修复提供财务保证。";

    const reg_json = {
      pore_space_rights: "State-owned (Regalian Doctrine); Managed via DOE Service Contracts.",
      liability_transfer: "Operator-led during injection; State transfer post-closure (20 years) under legislative discussion.",
      liability_period: "25-30 years (Operational) + 20 years (Closure monitoring).",
      financial_assurance: "Mandatory performance bonds and insurance for remediation and decommissioning.",
      permitting_lead_time: "2-3 years (Integrated DOE and DENR review process).",
      co2_definition: "Defined as 'Mitigation Outcome' or 'GHG Substance' to facilitate market trading (not waste).",
      cross_border_rules: "Aligned with Article 6.2; Bilateral agreement signed with Singapore (2024)."
    };

    const reg_json_zh = {
      pore_space_rights: "国家所有（雷加利亚学说）；通过能源部 (DOE) 服务合同管理。",
      liability_transfer: "注入期间由运营商负责；立法讨论中建议封存后（20年）转移至国家。",
      liability_period: "25-30年（运营期）+ 20年（封存监测期）。",
      financial_assurance: "强制性履行保证金和保险，用于修复和退役。",
      permitting_lead_time: "2-3年（能源部和环境部综合审查程序）。",
      co2_definition: "定义为“减排成果”或“温室气体物质”，以促进市场交易（非废物）。",
      cross_border_rules: "符合《巴黎协定》第6.2条；2024年与新加坡签署双边协议。"
    };

    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'en', 'DOE Circular DC2025-09-0018: CCUS Regulatory Framework', desc_en, JSON.stringify(reg_json)]);
    
    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'zh', '能源部第 DC2025-09-0018 号循环公告：CCUS 监管框架', desc_zh, JSON.stringify(reg_json_zh)]);

    // Scores
    const scores = [['incentive', 75], ['statutory', 90], ['market', 85], ['strategic', 95], ['mrv', 80]];
    for (const s of scores) {
      db.run(`INSERT OR REPLACE INTO policy_analysis (policy_id, dimension, score, label, evidence) VALUES (?,?,?,?,?)`,
        [policyId, s[0], s[1], s[1] >= 80 ? 'High' : 'Medium', 'Strong regulatory alignment with international standards and Article 6 mechanism.']);
    }

    db.run("COMMIT");
    console.log("Ingested Philippines 2025 policy.");
  } catch (e) {
    db.run("ROLLBACK");
    throw e;
  }

  const data = db.export();
  fs.writeFileSync(DB_PATH, new Uint8Array(data));
  db.close();
}

ingest().catch(err => console.error(err));

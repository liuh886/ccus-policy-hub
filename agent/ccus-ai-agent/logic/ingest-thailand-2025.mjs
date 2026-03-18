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
    const policyId = 'th-draft-climate-change-act-2025';
    db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, url, pub_date, provenance_author, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [policyId, 'Thailand', 2025, 'Active', 'Regulatory', 'verified', 'Primary Legislation', 'Department of Mineral Fuels (DMF)', 'https://www.dmf.go.th/', '2025-12-01', 'CCUS AI Agent', lastAuditDate]);

    const desc_en = "Thailand's draft Climate Change Act, approved in Dec 2025, establishes a centralized governance framework under the National Climate Change Policy Committee (NCCPC). It introduces a preliminary carbon tax (THB 200/ton) and designates the Department of Mineral Fuels (DMF) as the lead for CCS, focusing on the Upper Gulf of Thailand.";
    const desc_zh = "泰国 2025 年 12 月批准的《气候变化法》草案在国家气候变化政策委员会 (NCCPC) 下建立了集中治理框架。该法案引入了初步的碳税（200 泰铢/吨），并指定矿产燃料部 (DMF) 为 CCS 的牵头机构，重点关注泰国湾上部。";

    const reg_json = {
      pore_space_rights: "State-owned; managed by the Department of Mineral Fuels (DMF) for offshore storage.",
      liability_transfer: "Draft framework suggests state assumption after a verified monitoring period.",
      liability_period: "Under discussion; expected to align with international standards (20-50 years).",
      financial_assurance: "Preliminary carbon tax (THB 200/ton) implemented on petroleum products.",
      permitting_lead_time: "DMF designated as the technical lead to streamline CCUS project permitting.",
      co2_definition: "Regulated as a managed substance under the new Climate Change Act framework.",
      cross_border_rules: "Aligning with EU CBAM by 2026; bilateral cooperation on regional storage."
    };

    const reg_json_zh = {
      pore_space_rights: "国家所有；由矿产燃料部 (DMF) 负责离岸封存管理。",
      liability_transfer: "草案框架建议在经过验证的监测期后由国家承担。",
      liability_period: "讨论中；预计将与国际标准（20-50 年）保持一致。",
      financial_assurance: "对石油产品实施初步碳税（200 泰铢/吨）。",
      permitting_lead_time: "DMF 被指定为技术牵头机构，以简化 CCUS 项目的许可。",
      co2_definition: "在新的《气候变化法》框架下作为受控物质进行监管。",
      cross_border_rules: "到 2026 年与欧盟 CBAM 对齐；开展区域封存方面的双边合作。"
    };

    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'en', 'Thailand Draft Climate Change Act 2025', desc_en, JSON.stringify(reg_json)]);
    
    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'zh', '泰国气候变化法草案 2025', desc_zh, JSON.stringify(reg_json_zh)]);

    const scores = [['incentive', 75], ['statutory', 80], ['market', 70], ['strategic', 85], ['mrv', 75]];
    for (const s of scores) {
      db.run(`INSERT OR REPLACE INTO policy_analysis (policy_id, dimension, score, label, evidence) VALUES (?,?,?,?,?)`,
        [policyId, s[0], s[1], 'Medium-High', 'Significant legislative progress with draft Act approval.']);
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

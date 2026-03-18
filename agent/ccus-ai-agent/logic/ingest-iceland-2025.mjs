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
    const policyId = 'is-onshore-storage-permit-2025';
    db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, url, pub_date, provenance_author, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [policyId, 'Iceland', 2025, 'Active', 'Regulatory', 'verified', 'Storage Permit', 'Environment Agency of Iceland', 'https://www.ust.is/', '2025-04-01', 'CCUS AI Agent', lastAuditDate]);

    const desc_en = "In April 2025, Carbfix received the first-ever EU onshore CO2 storage permit for mineralization in Iceland. This milestone operationalizes the EU CCS Directive for onshore basaltic mineralization. Iceland is also developing the Coda Terminal, an €115M EU-funded cross-border hub for CO2 import and permanent storage.";
    const desc_zh = "2025 年 4 月，Carbfix 获得了冰岛有史以来首个欧盟陆上二氧化碳矿化封存许可。这一里程碑在陆上玄武岩矿化方面落实了欧盟 CCS 指令。冰岛还正在建设 Coda 终端，这是一个耗资 1.15 亿欧元的欧盟资助的二氧化碳进口与永久封存跨境枢纽。";

    const reg_json = {
      pore_space_rights: "Specific governance for onshore mineralization (basaltic) via Carbfix technology.",
      liability_transfer: "Aligned with EU Directive 2009/31/EC; state assumption of liability post-monitoring.",
      liability_period: "Approx. 20-30 years post-closure; accelerated by fast mineralization physics.",
      financial_assurance: "€115M EU grant for Coda Terminal; mandatory operator closure security.",
      permitting_lead_time: "First onshore permit granted in 2025 establishes a clear path for mineralization projects.",
      co2_definition: "Primary climate tool for negative emissions; CO2 turned to stone within 2 years.",
      cross_border_rules: "Coda Terminal enables large-scale CO2 import from Europe for storage in Iceland."
    };

    const reg_json_zh = {
      pore_space_rights: "通过 Carbfix 技术对陆上矿化（玄武岩）封存进行专门治理。",
      liability_transfer: "符合欧盟指令 2009/31/EC；在监测后由国家承担责任。",
      liability_period: "闭坑后约 20-30 年；由于快速矿化的物理特性，该过程可能加速。",
      financial_assurance: "Coda 终端获得 1.15 亿欧元欧盟赠款；强制性的运营商闭坑担保。",
      permitting_lead_time: "2025 年获得首个陆上许可，为矿化项目建立了清晰的路径。",
      co2_definition: "负排放的主要气候工具；二氧化碳在 2 年内转化为石头。",
      cross_border_rules: "Coda 终端使从欧洲大规模进口二氧化碳到冰岛进行封存成为可能。"
    };

    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'en', 'Iceland Onshore Mineralization Storage Framework 2025', desc_en, JSON.stringify(reg_json)]);
    
    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'zh', '冰岛陆上矿化封存框架 2025', desc_zh, JSON.stringify(reg_json_zh)]);

    const scores = [['incentive', 95], ['statutory', 95], ['market', 85], ['strategic', 100], ['mrv', 95]];
    for (const s of scores) {
      db.run(`INSERT OR REPLACE INTO policy_analysis (policy_id, dimension, score, label, evidence) VALUES (?,?,?,?,?)`,
        [policyId, s[0], s[1], 'Excellent', 'World leader in mineralization and onshore EU-aligned storage.']);
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

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
    const policyId = 'my-ccus-bill-2025';
    db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, url, pub_date, provenance_author, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [policyId, 'Malaysia', 2025, 'Active', 'Regulatory', 'verified', 'Primary Legislation', 'Ministry of Economy', 'https://www.ekonomi.gov.my/', '2025-03-01', 'CCUS AI Agent', lastAuditDate]);

    const desc_en = "The Malaysia CCUS Bill 2025 provides a comprehensive regulatory framework for the entire CCUS value chain. It establishes MyCCUS as a one-stop agency and introduces a Post-Closure Stewardship Fund via an injection levy. The bill permits CO2 import for storage but prohibits utilization of imported CO2.";
    const desc_zh = "2025年马来西亚 CCUS 法案为整个 CCUS 价值链提供了全面的监管框架。该法案设立了 MyCCUS 作为一站式机构，并通过注入征费引入了闭坑后管理基金。该法案允许进口二氧化碳进行封存，但禁止利用进口的二氧化碳。";

    const reg_json = {
      pore_space_rights: "Two-phased authorization: Assessment Permits (geological study) and Storage Permits (operation).",
      liability_transfer: "Post-Closure Stewardship Fund manages long-term monitoring and risk transfer.",
      liability_period: "Managed via Post-Closure Stewardship Fund with injection levy.",
      financial_assurance: "Mandatory contribution to Post-Closure Stewardship Fund; operational security required.",
      permitting_lead_time: "One-stop regulatory center via Malaysia CCUS Agency (MyCCUS).",
      co2_definition: "Regulates entire value chain: capture, transport, utilization, and permanent storage.",
      cross_border_rules: "Permits CO2 import for storage; prohibits utilization of imported CO2."
    };

    const reg_json_zh = {
      pore_space_rights: "分两个阶段授权：评估许可（地质研究）和封存许可（运营）。",
      liability_transfer: "闭坑后管理基金负责长期监测和风险转移。",
      liability_period: "通过注入征费建立的闭坑后管理基金进行管理。",
      financial_assurance: "强制缴纳闭坑后管理基金；需要运营担保。",
      permitting_lead_time: "通过马来西亚 CCUS 机构 (MyCCUS) 实现一站式监管。",
      co2_definition: "监管整个价值链：捕集、运输、利用和永久封存。",
      cross_border_rules: "允许进口二氧化碳进行封存；禁止利用进口二氧化碳。"
    };

    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'en', 'Malaysia CCUS Bill 2025', desc_en, JSON.stringify(reg_json)]);
    
    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, regulatory_json) VALUES (?,?,?,?,?)`,
      [policyId, 'zh', '2025年马来西亚 CCUS 法案', desc_zh, JSON.stringify(reg_json_zh)]);

    const scores = [['incentive', 85], ['statutory', 95], ['market', 75], ['strategic', 90], ['mrv', 80]];
    for (const s of scores) {
      db.run(`INSERT OR REPLACE INTO policy_analysis (policy_id, dimension, score, label, evidence) VALUES (?,?,?,?,?)`,
        [policyId, s[0], s[1], 'High', 'Comprehensive national legislation established in 2025.']);
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

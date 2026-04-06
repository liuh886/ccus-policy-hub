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

  const policyId = 'jp-ccs-business-act-2024';
  const lastAuditDate = new Date().toISOString().split('T')[0];

  console.log(`Updating ${policyId} with Dynamic Verification results...`);

  db.run("BEGIN TRANSACTION");
  try {
    // 1. Policies Table (Keep as 2024 but update provenance)
    db.run(`UPDATE policies SET provenance_last_audit_date = ?, provenance_author = ? WHERE id = ?`,
      [lastAuditDate, 'CCUS AI Agent (DV Update)', policyId]);

    // 2. Policy i18n
    const desc_en = "The Act on Carbon Dioxide Storage Business (CCS Business Act) established a comprehensive legal framework for the entire CCS value chain in Japan. Passed in May 2024, the Act follows a phased implementation: prospecting rights became effective in Nov 2024, with full enforcement (including storage rights and liability transfer) mandated by May 2026. 2025 serves as the critical window for FEED implementation of JOGMEC-supported projects. The Act creates 'Quasi-real Rights' (Mina-shi Bukken) for storage, allowing for registration and mortgage/financing. It provides for the transfer of monitoring responsibilities to JOGMEC after CO2 stabilization, while maintaining a strict liability (no-fault) regime for operators.";
    const desc_zh = "日本《二氧化碳存储业务法》（CCS 业务法）为全产业链建立了首个综合性法律框架。该法案于 2024 年 5 月颁布，采取分阶段生效模式：试掘权于 2024 年 11 月生效，全部条款（包括储集权、责任移交）将于 2026 年 5 月前全面施行。2025 年是 JOGMEC 支持的示范项目进入基础工程设计 (FEED) 的关键年。法案将“储集权”定义为“拟制物权”，受法律保护且可用于抵押融资。二氧化碳达到稳定状态后，监测职责可移交给 JOGMEC，但运营商需承担无过错责任。";
    
    const reg_json = {
      pore_space_rights: "拟制物权 (Quasi-real Rights / Mina-shi Bukken).",
      liability_transfer: "Monitoring/Management responsibility transfers to JOGMEC after stability confirmation.",
      liability_period: "Phase-in from 2024-2026; monitoring contribution required during operation.",
      financial_assurance: "Mandatory Monitoring Reserves (Contributions) paid to JOGMEC.",
      permitting_lead_time: "Approx. 2-3 years via METI Specified Area licensing.",
      co2_definition: "Regulated industrial commodity with strict environmental safety standards.",
      cross_border_rules: "Aligned with London Protocol (Art 6) to enable Asia-Pacific hubs."
    };

    const impact_json = {
      economic: "Enables project financing through real-right registration; reduces long-term liability costs via JOGMEC transfer.",
      technical: "Establishes 'Stable Behavior' as the legal threshold for monitoring transfer, driving 4D seismic adoption.",
      environmental: "Legal backbone for Japan's 2030 target of 6-12 Mtpa storage capacity."
    };

    db.run(`UPDATE policy_i18n SET title = ?, description = ?, impact_analysis_json = ?, regulatory_json = ? WHERE policy_id = ? AND lang = ?`,
      ['Act on Carbon Dioxide Storage Business (2025 Phase-in)', desc_en, JSON.stringify(impact_json), JSON.stringify(reg_json), policyId, 'en']);
    
    db.run(`UPDATE policy_i18n SET title = ?, description = ?, impact_analysis_json = ?, regulatory_json = ? WHERE policy_id = ? AND lang = ?`,
      ['二氧化碳存储业务法 (2025年生效)', desc_zh, JSON.stringify(impact_json), JSON.stringify(reg_json), policyId, 'zh']);

    // 3. Analysis Scores (Slight boost to market/incentive due to real-right status)
    const scores = [
      ['incentive', 75, 'Quasi-real right status enables bankability and mortgage financing.', 'Art. 45 & Mina-shi Bukken'],
      ['statutory', 98, 'Primary legislation with clear phased enforcement timeline.', 'Full Act'],
      ['market', 80, 'Open access mandate and real-right tradability.', 'Chapter 4'],
      ['strategic', 95, 'Cornerstone of GX strategy and Asia CCUS Network.', 'METI Strategy'],
      ['mrv', 90, 'Clear legal definition of "Stability" for JOGMEC transfer.', 'Section 5']
    ];

    for (const s of scores) {
      db.run(`UPDATE policy_analysis SET score = ?, evidence = ?, citation = ? WHERE policy_id = ? AND dimension = ?`,
        [s[1], s[2], s[3], policyId, s[0]]);
    }

    db.run("COMMIT");
    console.log(`SUCCESS: ${policyId} updated with 2025 verification data.`);
  } catch (e) {
    db.run("ROLLBACK");
    throw e;
  }

  const data = db.export();
  fs.writeFileSync(DB_PATH, new Uint8Array(data));
  db.close();
}

ingest().catch(err => console.error(err));

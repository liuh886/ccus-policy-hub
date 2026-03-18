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

  console.log(`Ingesting ${policyId}...`);

  db.run("BEGIN TRANSACTION");
  try {
    // 1. Policies Table
    db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, url, pub_date, provenance_author, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [policyId, 'Japan', 2024, 'Active', 'Regulatory', 'verified', 'Primary Legislation', 'METI', 'https://www.meti.go.jp/english/press/2024/0517_001.html', '2024-05-17', 'CCUS AI Agent', lastAuditDate]);

    // 2. Policy i18n
    const desc_en = "The Act on Carbon Dioxide Storage Business (CCS Business Act) established a comprehensive legal framework for the entire CCS value chain in Japan. It creates 'Storage Rights' as a real right, implements a licensing system by METI, and provides for the transfer of monitoring responsibilities to JOGMEC after the CO2 is stabilized. Crucially, it introduces a strict liability (no-fault) regime for storage operators.";
    const desc_zh = "《二氧化碳封存业务法》（简称 CCS 业务法）为日本 CCUS 全产业链建立了首个综合性法律框架。该法案创设了“存储权”这一物权概念，由经济产业省（METI）统一授信。它规定在二氧化碳达到稳定状态后，可将监测责任移交给 JOGMEC。关键创新在于为封存运营商引入了“无过错责任（Strict Liability）”制度。";
    
    const reg_json = {
      pore_space_rights: "Established as 'Storage Right' (Real Right) granted by METI.",
      liability_transfer: "Monitoring responsibility transfers to JOGMEC after stability confirmation.",
      liability_period: "Post-injection period until CO2 stability is verified.",
      financial_assurance: "Mandatory Monitoring Reserves to be accumulated during injection.",
      permitting_lead_time: "Approx. 2-3 years via Specified Area licensing.",
      co2_definition: "Regulated industrial commodity with Open Access mandate.",
      cross_border_rules: "Aligned with London Protocol for export potential."
    };

    const impact_json = {
      economic: "Reduces legal uncertainty for investors; provides funding mechanism for long-term monitoring.",
      technical: "Enables large-scale offshore storage through clear subsurface rights.",
      environmental: "Targeting 6-12 million tons of annual storage by 2030."
    };

    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, impact_analysis_json, regulatory_json) VALUES (?,?,?,?,?,?)`,
      [policyId, 'en', 'Act on Carbon Dioxide Storage Business (CCS Business Act)', desc_en, JSON.stringify(impact_json), JSON.stringify(reg_json)]);
    
    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, impact_analysis_json, regulatory_json) VALUES (?,?,?,?,?,?)`,
      [policyId, 'zh', '二氧化碳封存业务法 (CCS 业务法)', desc_zh, JSON.stringify(impact_json), JSON.stringify(reg_json)]);

    // 3. Analysis Scores
    const scores = [
      ['incentive', 65, 'Legal certainty facilitates funding', 'Art. 45'],
      ['statutory', 95, 'Primary legislation for CCUS business', 'Full Act'],
      ['market', 75, 'Open access and business transparency', 'Chapter 4'],
      ['strategic', 90, 'Alignment with 2030 Roadmap', 'METI Strategy'],
      ['mrv', 85, 'Mandatory monitoring and reserve accumulation', 'Section 5']
    ];

    for (const s of scores) {
      db.run(`INSERT OR REPLACE INTO policy_analysis (policy_id, dimension, score, label, evidence, citation) VALUES (?,?,?,?,?,?)`,
        [policyId, s[0], s[1], 'High', s[2], s[3]]);
    }

    db.run("COMMIT");
    console.log(`SUCCESS: ${policyId} ingested.`);
  } catch (e) {
    db.run("ROLLBACK");
    throw e;
  }

  const data = db.export();
  fs.writeFileSync(DB_PATH, new Uint8Array(data));
  db.close();
}

ingest().catch(err => console.error(err));

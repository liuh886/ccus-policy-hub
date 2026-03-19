import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'agent/ccus-ai-agent/db/ccus_master.sqlite');

async function ingest() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  const lastAuditDate = new Date().toISOString().split('T')[0];

  console.log(`Starting China 2025 Calibration...`);

  db.run("BEGIN TRANSACTION");
  try {
    // 1. NDRC/MEE Demonstration Plan
    const demoId = 'cn-demo-tech-2024';
    db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, pub_date, provenance_author, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [demoId, 'China', 2024, 'Active', 'Strategic', 'verified', 'Guideline', 'NDRC/MEE', '2023-08-01', 'CCUS AI Agent', lastAuditDate]);

    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, impact_analysis_json) VALUES (?,?,?,?,?)`,
      [demoId, 'en', 'Implementation Plan for Green and Low-Carbon Advanced Technology Demonstration Projects', 
      '## Policy Core\nIssued by NDRC and MEE, this plan selects large-scale CCUS demonstration projects for financial and resource support. Requirements include >500k t/y for petrochemical/oil and >100k t/y for power/steel/cement. First batch (47 projects) released in April 2024, second batch (101 projects) in April 2025.',
      JSON.stringify({ economic: "Direct central budget support and green finance access.", technical: "Promotes full-chain integration and cluster development." })]);

    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description, impact_analysis_json) VALUES (?,?,?,?,?)`,
      [demoId, 'zh', '绿色低碳先进技术示范项目实施方案', 
      '## 政策核心\n由国家发改委和生态环境部发布，旨在遴选大规模 CCUS 示范项目并提供资金和资源支持。规模要求：石化/火电/油气行业年捕集量 >50 万吨，电力/钢铁/水泥行业 >10 万吨。首批 47 个项目于 2024 年 4 月发布，第二批 101 个项目于 2025 年 4 月发布。',
      JSON.stringify({ economic: "获得中央预算内投资支持及绿色金融优先支持。", technical: "推动全流程集成和集群化发展。" })]);

    // 2. CCUS Roadmap 2025
    const roadmapId = 'cn-ccus-roadmap-2025';
    db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, pub_date, provenance_author, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [roadmapId, 'China', 2025, 'Active', 'Strategic', 'verified', 'Strategic Roadmap', 'NDRC/ACCA21', '2025-10-15', 'CCUS AI Agent', lastAuditDate]);

    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description) VALUES (?,?,?,?)`,
      [roadmapId, 'en', 'China CCUS Technology Development Roadmap (2025)', 'Official 2025 update shifting strategic focus from technical verification to large-scale commercial application and hub-based clusters.']);
    
    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description) VALUES (?,?,?,?)`,
      [roadmapId, 'zh', '中国 CCUS 技术发展路线图 (2025)', '2025 年官方路线图更新，战略重点从技术验证转向大规模商业化应用和基于枢纽的集群化发展。']);

    // 3. National Standards 2024
    const standardsId = 'cn-standards-2024';
    db.run(`INSERT OR REPLACE INTO policies (id, country, year, status, category, review_status, legal_weight, source, pub_date, provenance_author, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [standardsId, 'China', 2024, 'Active', 'Regulatory', 'verified', 'National Standards', 'NDRC/SAMR', '2024-12-01', 'CCUS AI Agent', lastAuditDate]);

    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description) VALUES (?,?,?,?)`,
      [standardsId, 'en', 'Batch Release of CCUS National Standards (2024)', 'NDRC and SAMR released 12+ national standards covering carbon accounting, storage safety, and leakage monitoring, providing the technical basis for liability transfer.']);
    
    db.run(`INSERT OR REPLACE INTO policy_i18n (policy_id, lang, title, description) VALUES (?,?,?,?)`,
      [standardsId, 'zh', 'CCUS 国家标准批量发布 (2024)', '国家发改委和国家标准委发布了 12+ 项国家标准，涵盖碳核算、封存安全和泄漏监测，为责任转移提供了技术依据。']);

    // 4. Update cn-ccer with 2025 data
    db.run(`UPDATE policy_i18n SET description = ?, impact_analysis_json = ? WHERE policy_id = 'cn-ccer' AND lang = 'en'`,
      ['## Policy Core\nFormally relaunched in 2024, CCER is a critical voluntary emission reduction mechanism. First batch of 9.48M tonnes certified in 2025. Specific CCUS methodologies for steel, cement, and chemical industries are being expedited to provide clear monetization pathways.',
       JSON.stringify({ economic: "Projected market size of 73.5B CNY by 2030; CEA prices >100 RMB/t.", environmental: "First 9.48M tons certified in 2025.", technical: "CCUS methodologies for steel/cement expedited in 2025." })]);

    db.run(`UPDATE policy_i18n SET description = ?, impact_analysis_json = ? WHERE policy_id = 'cn-ccer' AND lang = 'zh'`,
      ['## 政策概览\nCCER 于 2024 年正式重启。2025 年首批核证减排量达 948 万吨。钢铁、水泥和化工行业的 CCUS 专项方法学正在加速制定中，旨在为 CCUS 项目提供清晰的商业化收益路径。',
       JSON.stringify({ economic: "预计 2030 年市场规模 735 亿元；碳价突破 100 元/吨。", environmental: "2025 年首批核证量 948 万吨。", technical: "2025 年加速制定钢铁/水泥行业 CCUS 方法学。" })]);

    // 5. Update 7-Pillar data in country_i18n
    const pore_en = "State-owned; 2024 decoupling from mineral rights initiated; Sea area use rights integrated for offshore.";
    const pore_zh = "国家所有；2024 年启动封存权与矿权剥离试点；海上项目已整合海域使用权。";
    const liab_en = "Staged Responsibility Model (20-30y monitoring); Financial Assurance Fund under development (2025).";
    const liab_zh = "阶段性责任模型（20-30 年监测期）；2025 年启动国家财务保证基金建设。";
    const period_en = "Draft 2025 standards suggest 20-30 years post-closure.";
    const period_zh = "2025 年标准草案建议封存后监测期为 20-30 年。";

    db.run(`UPDATE country_i18n SET pore_space_rights = ?, liability_transfer = ?, liability_period = ? WHERE country_id = 'China' AND lang = 'en'`,
      [pore_en, liab_en, period_en]);
    db.run(`UPDATE country_i18n SET pore_space_rights = ?, liability_transfer = ?, liability_period = ? WHERE country_id = 'China' AND lang = 'zh'`,
      [pore_zh, liab_zh, period_zh]);

    db.run("COMMIT");
    console.log(`SUCCESS: China 2025 Calibration Complete.`);
  } catch (e) {
    db.run("ROLLBACK");
    throw e;
  }

  const data = db.export();
  fs.writeFileSync(DB_PATH, new Uint8Array(data));
  db.close();
}

ingest().catch(err => console.error(err));

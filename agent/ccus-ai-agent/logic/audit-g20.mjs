import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../db/ccus_master.sqlite');

const G20_MEMBERS = [
  "Argentina", "Australia", "Brazil", "Canada", "China", "France", "Germany", 
  "India", "Indonesia", "Italy", "Japan", "Republic of Korea", "Mexico", 
  "Russia", "Saudi Arabia", "South Africa", "Turkey", "United Kingdom", 
  "United States", "European Union"
];

const REG_FIELDS = [
  'pore_space_rights', 'liability_transfer', 'liability_period', 
  'financial_assurance', 'permitting_lead_time', 'co2_definition', 
  'cross_border_rules'
];

async function runAudit() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  console.log("=== G20 Governance Audit Report ===");
  console.log(`Target Members: ${G20_MEMBERS.length}`);
  console.log("-----------------------------------");

  const results = [];

  for (const country of G20_MEMBERS) {
    // 1. Check Country Profile
    const profileStmt = db.prepare("SELECT * FROM country_profiles WHERE id = ?");
    profileStmt.bind([country]);
    const exists = profileStmt.step();
    profileStmt.free();

    // 2. Count Policies
    const policyStmt = db.prepare("SELECT COUNT(*) as count FROM policies WHERE country = ?");
    policyStmt.bind([country]);
    policyStmt.step();
    const policyCount = policyStmt.get()[0];
    policyStmt.free();

    // 3. Check Regulatory Pillars (English)
    const i18nStmt = db.prepare("SELECT * FROM country_i18n WHERE country_id = ? AND lang = 'en'");
    i18nStmt.bind([country]);
    
    let filledCount = 0;
    const details = {};

    if (i18nStmt.step()) {
      const row = i18nStmt.get();
      const columns = i18nStmt.getColumnNames();
      
      REG_FIELDS.forEach(field => {
        const colIdx = columns.indexOf(field);
        const val = row[colIdx];
        const isFilled = val && !["Pending", "---", "待定", ""].includes(val);
        if (isFilled) filledCount++;
        details[field] = val || "Pending";
      });
    }
    i18nStmt.free();

    const fillRate = (filledCount / REG_FIELDS.length) * 100;

    results.push({
      country,
      exists,
      policyCount,
      fillRate: fillRate.toFixed(1) + "%",
      filledCount,
      details
    });
  }

  // Sort by fill rate descending
  results.sort((a, b) => parseFloat(b.fillRate) - parseFloat(a.fillRate));

  results.forEach(r => {
    const status = r.exists ? "✅" : "❌";
    console.log(`${status} ${r.country.padEnd(17)} | Policies: ${String(r.policyCount).padEnd(2)} | Pillars: ${r.fillRate.padStart(6)} (${r.filledCount}/7)`);
  });

  const reportsDir = path.join(__dirname, '../governance/reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(path.join(reportsDir, 'G20_GAP_ANALYSIS.json'), JSON.stringify(results, null, 2));

  console.log("-----------------------------------");
  console.log(`Report saved to: agent/ccus-ai-agent/governance/reports/G20_GAP_ANALYSIS.json`);
  
  db.close();
}

runAudit().catch(err => console.error(err));

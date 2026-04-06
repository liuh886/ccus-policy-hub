import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../db/ccus_master.sqlite');

async function seed() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  db.run("BEGIN TRANSACTION");
  try {
    const missing = [
      { id: 'Kazakhstan', en: 'Kazakhstan', zh: '哈萨克斯坦' },
      { id: 'Kuwait', en: 'Kuwait', zh: '科威特' }
    ];

    for (const c of missing) {
      db.run("INSERT OR IGNORE INTO country_profiles (id, region) VALUES (?, ?)", [c.id, 'Global']);
      db.run(`INSERT OR IGNORE INTO country_i18n (country_id, lang, name, summary, pore_space_rights, liability_transfer, liability_period, financial_assurance, permitting_lead_time, co2_definition, cross_border_rules) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [c.id, 'en', c.en, `Profile for ${c.en}`, 'Pending', 'Pending', 'Pending', 'Pending', 'Pending', 'Pending', 'Pending']);
      db.run(`INSERT OR IGNORE INTO country_i18n (country_id, lang, name, summary, pore_space_rights, liability_transfer, liability_period, financial_assurance, permitting_lead_time, co2_definition, cross_border_rules) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [c.id, 'zh', c.zh, `Profile for ${c.zh}`, '待定', '待定', '待定', '待定', '待定', '待定', '待定']);
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

seed().catch(err => console.error(err));

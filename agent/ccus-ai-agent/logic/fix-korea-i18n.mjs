import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../db/ccus_master.sqlite');

async function fix() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  db.run("BEGIN TRANSACTION");
  try {
    const id = 'Republic of Korea';
    db.run("INSERT OR IGNORE INTO country_profiles (id, region) VALUES (?,?)", [id, 'East Asia']);
    db.run("INSERT OR IGNORE INTO country_i18n (country_id, lang, name) VALUES (?,'en',?)", [id, 'South Korea']);
    db.run("INSERT OR IGNORE INTO country_i18n (country_id, lang, name) VALUES (?,'zh',?)", [id, '韩国']);
    db.run("COMMIT");
    console.log("Korea i18n initialized.");
  } catch (e) {
    db.run("ROLLBACK");
    throw e;
  }

  const data = db.export();
  fs.writeFileSync(DB_PATH, new Uint8Array(data));
  db.close();
}

fix().catch(err => console.error(err));

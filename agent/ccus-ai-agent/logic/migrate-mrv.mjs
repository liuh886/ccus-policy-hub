import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../db/ccus_master.sqlite');

async function migrate() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  console.log("MIGRATION: Adding Digital MRV Layer...");

  db.run("BEGIN TRANSACTION");
  try {
    // Add mrv_json to facilities table
    // SQLite doesn't have IF NOT EXISTS for ALTER TABLE, so we use a try-catch pattern or check table info
    // Check table info using exec
    const tableInfoRes = db.exec("PRAGMA table_info(facilities)");
    const tableInfo = tableInfoRes.length > 0 ? tableInfoRes[0].values : [];
    if (!tableInfo.some(col => col[1] === 'mrv_json')) {
      db.run("ALTER TABLE facilities ADD COLUMN mrv_json TEXT;");
      console.log("  - Added 'mrv_json' column to 'facilities' table.");
    }

    // Add mrv_criteria to policy_i18n
    const policyInfoRes = db.exec("PRAGMA table_info(policy_i18n)");
    const policyInfo = policyInfoRes.length > 0 ? policyInfoRes[0].values : [];
    if (!policyInfo.some(col => col[1] === 'mrv_criteria')) {
      db.run("ALTER TABLE policy_i18n ADD COLUMN mrv_criteria TEXT;");
      console.log("  - Added 'mrv_criteria' column to 'policy_i18n' table.");
    }

    db.run("COMMIT");
  } catch (e) {
    db.run("ROLLBACK");
    console.error("Migration FAILED:", e);
    process.exit(1);
  }

  const data = db.export();
  fs.writeFileSync(DB_PATH, new Uint8Array(data));
  db.close();
  console.log("MIGRATION DONE.");
}

migrate().catch(err => console.error(err));

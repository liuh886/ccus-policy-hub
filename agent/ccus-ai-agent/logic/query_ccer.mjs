import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';

async function query() {
  const SQL = await initSqlJs();
  const dbBuffer = fs.readFileSync('agent/ccus-ai-agent/db/ccus_master.sqlite');
  const db = new SQL.Database(dbBuffer);

  function all(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  console.log('--- POLICY DETAILS: cn-ccer ---');
  const ccer_en = all("SELECT * FROM policy_i18n WHERE policy_id = 'cn-ccer' AND lang = 'en'");
  const ccer_zh = all("SELECT * FROM policy_i18n WHERE policy_id = 'cn-ccer' AND lang = 'zh'");
  console.log('EN:', JSON.stringify(ccer_en, null, 2));
  console.log('ZH:', JSON.stringify(ccer_zh, null, 2));

  db.close();
}

query().catch(console.error);

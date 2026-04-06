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

  console.log('--- POLICIES FOR CHINA ---');
  const policies = all("SELECT id, country, year, status, category FROM policies WHERE country = 'China'");
  console.log(JSON.stringify(policies, null, 2));
  console.log(`Count: ${policies.length}`);

  console.log('\n--- 7-PILLAR DATA FOR CHINA ---');
  const pillars = all(`
    SELECT 
      country_id, 
      lang, 
      pore_space_rights, 
      liability_transfer, 
      liability_period, 
      financial_assurance, 
      permitting_lead_time, 
      co2_definition, 
      cross_border_rules 
    FROM country_i18n 
    WHERE country_id = 'China' OR country_id = (SELECT canonical FROM dict_country_alias WHERE alias = 'China' LIMIT 1)
  `);
  console.log(JSON.stringify(pillars, null, 2));

  db.close();
}

query().catch(console.error);

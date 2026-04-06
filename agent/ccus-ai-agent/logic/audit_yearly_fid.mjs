import fs from 'fs';
import initSqlJs from 'sql.js';

async function main() {
  const SQL = await initSqlJs();
  const dbPath = 'agent/ccus-ai-agent/db/ccus_master.sqlite';
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  console.log('--- 2015-2025 FID DETAILED AUDIT ---');
  
  for (let year = 2015; year <= 2025; year++) {
    const query = `
      SELECT 
        f.id, 
        i.name, 
        i.type, 
        f.estimated_capacity,
        i.fid
      FROM facilities f
      JOIN facility_i18n i ON f.id = i.facility_id
      WHERE i.lang = 'en' 
        AND i.fid LIKE '${year}%'
        AND i.fid GLOB '[1-2][0-9][0-9][0-9]*'
      ORDER BY f.estimated_capacity DESC
    `;
    const res = db.exec(query);
    
    if (res.length > 0 && res[0].values.length > 0) {
      const rows = res[0].values;
      const count = rows.length;
      const totalCapacity = rows.reduce((sum, r) => sum + (r[3] || 0), 0);
      
      console.log(`\n[YEAR ${year}] Count: ${count}, Total Capacity: ${totalCapacity.toFixed(2)} Mtpa`);
      // 列出该年份排名前 3 的项目作为证据
      rows.slice(0, 3).forEach(r => {
        console.log(`  - ID: ${r[0]}, Name: ${r[1]}, Type: ${r[2]}, Cap: ${r[3]} Mtpa, FID: ${r[4]}`);
      });
      if (count > 3) console.log(`  ... and ${count - 3} more projects.`);
    } else {
      console.log(`\n[YEAR ${year}] No FID records found.`);
    }
  }
}

main().catch(console.error);

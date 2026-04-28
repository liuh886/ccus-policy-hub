
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'agent/ccus-ai-agent/db/ccus_master.sqlite');

async function compare() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  const query = (sql) => {
    const stmt = db.prepare(sql);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  };

  const totalFacilities = query("SELECT count(*) as count FROM facilities")[0].count;
  const totalCapacity = query("SELECT sum(COALESCE(estimated_capacity, (announced_capacity_min + announced_capacity_max)/2, 0)) as sum FROM facilities")[0].sum;
  const chinaFacilities = query("SELECT count(*) as count FROM facilities WHERE country = 'China'")[0].count;
  const chinaCapacity = query("SELECT sum(COALESCE(estimated_capacity, (announced_capacity_min + announced_capacity_max)/2, 0)) as sum FROM facilities WHERE country = 'China'")[0].sum;
  
  // Clusters: check type or hub in facility_i18n
  const clusters = query(`
    SELECT count(DISTINCT f.id) as count 
    FROM facilities f
    JOIN facility_i18n i ON f.id = i.facility_id
    WHERE i.lang = 'en' AND (i.type LIKE '%Cluster%' OR i.type LIKE '%Hub%' OR i.hub IS NOT NULL AND i.hub != '')
  `)[0].count;

  // Sectoral distribution (Top 5)
  const sectors = query(`
    SELECT i.sector, count(*) as count, sum(COALESCE(f.estimated_capacity, (f.announced_capacity_min + f.announced_capacity_max)/2, 0)) as capacity 
    FROM facilities f
    JOIN facility_i18n i ON f.id = i.facility_id
    WHERE i.lang = 'en'
    GROUP BY i.sector 
    ORDER BY count DESC 
    LIMIT 5
  `);

  console.log(JSON.stringify({
    db: {
      total_facilities: totalFacilities,
      total_capacity_mtpa: totalCapacity,
      china_facilities: chinaFacilities,
      china_capacity_mtpa: chinaCapacity,
      clusters: clusters,
      sectors: sectors
    },
    article: {
      total_facilities: 1110,
      total_capacity_mtpa: 2464, // 24.64 亿吨 = 2464 Mtpa
      china_facilities: 120,
      china_capacity_mtpa: 9.4,
      clusters: 140
    }
  }, null, 2));

  db.close();
}

compare().catch(console.error);

import fs from 'fs';
import initSqlJs from 'sql.js';

async function main() {
  const SQL = await initSqlJs();
  const dbPath = 'agent/ccus-ai-agent/db/ccus_master.sqlite';
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  // 1. FID Count & Capacity (2015-2025)
  // 从 facility_i18n 的 fid 字段提取年份
  const fidQuery = `
    SELECT 
      SUBSTR(i.fid, 1, 4) as year, 
      COUNT(*) as count, 
      SUM(COALESCE(f.estimated_capacity, 0)) as capacity 
    FROM facilities f
    JOIN facility_i18n i ON f.id = i.facility_id
    WHERE i.lang = 'en' 
      AND i.fid IS NOT NULL 
      AND i.fid GLOB '[1-2][0-9][0-9][0-9]*'
      AND year >= '2015' AND year <= '2025'
    GROUP BY year 
    ORDER BY year
  `;
  const fidRes = db.exec(fidQuery);

  // 2. Structural Evolution (2015-2025)
  const typeQuery = `
    SELECT 
      SUBSTR(i.fid, 1, 4) as year,
      CASE 
        WHEN i.type LIKE '%Capture%' THEN 'Capture'
        WHEN i.type LIKE '%Full Chain%' THEN 'Full Chain'
        WHEN i.type IN ('Storage', 'Transport', 'T&S', 'Infrastructure') THEN 'Infrastructure'
        WHEN i.type LIKE '%CCU%' OR i.type LIKE '%Utilization%' THEN 'CCU'
        ELSE 'Other'
      END as category,
      COUNT(*) as count
    FROM facilities f
    JOIN facility_i18n i ON f.id = i.facility_id
    WHERE i.lang = 'en'
      AND i.fid IS NOT NULL 
      AND i.fid GLOB '[1-2][0-9][0-9][0-9]*'
      AND year >= '2015' AND year <= '2025'
    GROUP BY year, category
    ORDER BY year, category
  `;
  const typeRes = db.exec(typeQuery);

  console.log('\n--- FID YEARLY DATA (Year, Count, Capacity Mtpa) ---');
  if (fidRes.length > 0) {
    fidRes[0].values.forEach(row => console.log(`${row[0]}, ${row[1]}, ${row[2].toFixed(2)}`));
  } else {
    console.log('No data found for FID years.');
  }

  console.log('\n--- STRUCTURAL COMPOSITION (Year, Category, Count) ---');
  if (typeRes.length > 0) {
    typeRes[0].values.forEach(row => console.log(`${row[0]}, ${row[1]}, ${row[2]}`));
  }
}

main().catch(console.error);

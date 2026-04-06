import fs from 'fs';
import initSqlJs from 'sql.js';

async function main() {
  const SQL = await initSqlJs();
  const dbPath = 'agent/ccus-ai-agent/db/ccus_master.sqlite';
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  // 1. Hub 模式的物理证据：hub 字段的填充率
  // 我们观察不同 FID 年份的项目中，hub 字段不为空（即明确归属于某个 Hub）的项目比例
  const hubAffiliation = db.exec(`
    SELECT 
      SUBSTR(f_i18n.fid, 1, 4) as year,
      COUNT(*) as total_count,
      COUNT(CASE WHEN f_i18n.hub IS NOT NULL AND f_i18n.hub != '' THEN 1 END) as hub_affiliated_count,
      AVG(f.estimated_capacity) as avg_cap
    FROM facility_i18n f_i18n
    JOIN facilities f ON f_i18n.facility_id = f.id
    WHERE year BETWEEN '2021' AND '2025' AND f_i18n.lang = 'en'
    GROUP BY year
  `);

  console.log('--- HUB AFFILIATION TRENDS (FID Year) ---');
  hubAffiliation[0].values.forEach(row => {
    const percent = (row[2] / row[1] * 100).toFixed(1);
    console.log(`Year ${row[0]}: Total=${row[1]}, Hub-Affiliated=${row[2]} (${percent}%), Avg Cap=${row[3]?.toFixed(2)} Mtpa`);
  });

  // 2. 泛基建 (Infrastructure/T&S) 的爆发
  const specialization = db.exec(`
    SELECT 
      SUBSTR(f_i18n.fid, 1, 4) as year,
      COUNT(CASE WHEN f_i18n.type = 'Full Chain' THEN 1 END) as VerticalCount,
      COUNT(CASE WHEN f_i18n.type IN ('Infrastructure', 'Storage', 'Transport', 'T&S') THEN 1 END) as HubBackboneCount
    FROM facility_i18n f_i18n
    WHERE year BETWEEN '2021' AND '2025' AND f_i18n.lang = 'en'
    GROUP BY year
  `);

  console.log('\n--- VERTICAL INTEGRATION VS HUB BACKBONES ---');
  specialization[0].values.forEach(row => {
    console.log(`Year ${row[0]}: Full Chain=${row[1]}, Infrastructure (Hubs)=${row[2]}`);
  });

  // 3. 2026 审计中的 Hub 巨头
  const giants = db.exec(`
    SELECT f_i18n.name, f.estimated_capacity, f.country
    FROM facility_i18n f_i18n
    JOIN facilities f ON f_i18n.facility_id = f.id
    WHERE f.provenance_last_audit_date LIKE '2026%' AND f_i18n.lang = 'en'
    AND (f_i18n.name LIKE '%Hub%' OR f_i18n.name LIKE '%Cluster%' OR f_i18n.hub IS NOT NULL)
    ORDER BY f.estimated_capacity DESC
    LIMIT 8
  `);

  console.log('\n--- 2026 REFRESH: TOP HUB PROJECTS ---');
  giants[0].values.forEach(row => {
    console.log(`- ${row[0]} (${row[2]}): ${row[1]} Mtpa`);
  });
}

main().catch(console.error);

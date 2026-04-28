import fs from 'fs';
import initSqlJs from 'sql.js';

async function factCheck() {
  const SQL = await initSqlJs();
  const dbPath = '/mnt/GitHub/ccus-policy-hub/agent/ccus-ai-agent/db/ccus_master.sqlite';
  if (!fs.existsSync(dbPath)) throw new Error('Database not found at ' + dbPath);
  
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  console.log('--- [FACT CHECK RESULTS] ---');

  // 1. FID 2025 数据验证
  const fid2025 = db.exec(`
    SELECT COUNT(*), SUM(estimated_capacity) 
    FROM facilities f 
    JOIN facility_i18n i ON f.id = i.facility_id 
    WHERE i.lang = 'en' AND i.fid LIKE '2025%';
  `);
  console.log(`FID 2025: Count = ${fid2025[0].values[0][0]}, Total Capacity = ${fid2025[0].values[0][1].toFixed(2)} Mtpa`);

  // 2. Hub 关联度验证 (Capacity-based)
  const hubPercent = db.exec(`
    SELECT 
      SUM(CASE WHEN (hub IS NOT NULL AND hub != '') OR (name LIKE '%Hub%' OR name LIKE '%Cluster%') THEN estimated_capacity ELSE 0 END) * 100.0 / SUM(estimated_capacity)
    FROM facility_i18n i
    JOIN facilities f ON f.id = i.facility_id
    WHERE i.lang = 'en' AND i.fid LIKE '2025%';
  `);
  console.log(`2025 FID Hub-Linked Capacity %: ${hubPercent[0].values[0][0].toFixed(2)}%`);

  // 3. Cancelled 项目审计 (区分 2026 更新中标记为 Cancelled 的项目)
  const cancelledAudit = db.exec(`
    SELECT COUNT(*), AVG(estimated_capacity)
    FROM facilities 
    WHERE status = 'Cancelled';
  `);
  console.log(`Total Cancelled in DB: ${cancelledAudit[0].values[0][0]} projects, Avg Capacity = ${cancelledAudit[0].values[0][1].toFixed(2)} Mtpa`);

  // 4. 2026 周期内新增项目数 (基于审计日期)
  const new2026 = db.exec(`
    SELECT COUNT(*) 
    FROM facilities 
    WHERE provenance_last_audit_date LIKE '2026-03-28%';
  `);
  // 注意：这个数字可能包含状态更新的项目
  console.log(`Facilities processed/touched in March 2026 refresh: ${new2026[0].values[0][0]}`);

}

factCheck().catch(err => {
  console.error(err);
  process.exit(1);
});

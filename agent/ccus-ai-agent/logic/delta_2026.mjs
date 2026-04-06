import fs from 'fs';
import initSqlJs from 'sql.js';

async function main() {
  const SQL = await initSqlJs();
  const dbPath = 'agent/ccus-ai-agent/db/ccus_master.sqlite';
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  // 1. 状态分布 (2025 vs 2026)
  // 获取所有项目的状态分布
  const statusRes = db.exec(`
    SELECT status, COUNT(*) as count, SUM(estimated_capacity) as total_cap
    FROM facilities
    GROUP BY status
    ORDER BY count DESC
  `);

  // 2. 2026 年审计到的“新动态”
  // 核心关注点：在此周期中新录入 (Newly Added) 或 状态更新 (Status Transitions)
  // 我们已知报告中提到了 124 个新增项目和 75 个取消项目。
  // 我们在此提取区域维度的 Delta 贡献：
  const regionDeltaRes = db.exec(`
    SELECT country, COUNT(*) as count, SUM(estimated_capacity) as cap
    FROM facilities
    WHERE provenance_last_audit_date LIKE '2026%'
    GROUP BY country
    ORDER BY cap DESC
    LIMIT 6
  `);

  console.log('--- STATUS DISTRIBUTION ---');
  statusRes[0].values.forEach(row => console.log(`${row[0]}: ${row[1]} projects, ${row[2].toFixed(2)} Mtpa`));

  console.log('\n--- 2026 REFRESH REGIONAL CONTRIBUTORS (Top 6) ---');
  regionDeltaRes[0].values.forEach(row => console.log(`${row[0]}: ${row[1]} projects, ${row[2].toFixed(2)} Mtpa`));
}

main().catch(console.error);

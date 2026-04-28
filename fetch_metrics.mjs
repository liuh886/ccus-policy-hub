import initSqlJs from 'sql.js';
import fs from 'fs';

async function fetchMetrics() {
  const SQL = await initSqlJs();
  const dbFile = fs.readFileSync('agent/ccus-ai-agent/db/ccus_master.sqlite');
  const db = new SQL.Database(dbFile);

  const queries = {
    // 1. Hub vs Standalone by FID Year (2021-2025)
    hubTrend: `
      SELECT 
        SUBSTR(i.fid, 1, 4) as year,
        COUNT(CASE WHEN i.hub IS NOT NULL AND i.hub != '' THEN 1 END) as hub_count,
        SUM(CASE WHEN i.hub IS NOT NULL AND i.hub != '' THEN f.estimated_capacity ELSE 0 END) as hub_cap,
        COUNT(CASE WHEN i.hub IS NULL OR i.hub = '' THEN 1 END) as standalone_count,
        SUM(CASE WHEN i.hub IS NULL OR i.hub = '' THEN f.estimated_capacity ELSE 0 END) as standalone_cap
      FROM facility_i18n i
      JOIN facilities f ON i.facility_id = f.id
      WHERE year BETWEEN '2021' AND '2025' AND i.lang = 'en'
      GROUP BY year
    `,
    // 2. Storage Type in 2025 FID
    storage2025: `
      SELECT 
        i.storage_type,
        COUNT(*) as count,
        SUM(f.estimated_capacity) as cap
      FROM facility_i18n i
      JOIN facilities f ON i.facility_id = f.id
      WHERE SUBSTR(i.fid, 1, 4) = '2025' AND i.lang = 'en'
      GROUP BY i.storage_type
    `,
    // 3. Country-level MRV Depth vs FID Success
    countryCorrelation: `
      WITH CountryMRV AS (
        SELECT 
          p.country,
          AVG(LENGTH(pa.evidence)) as avg_mrv_len
        FROM policies p
        JOIN policy_analysis pa ON p.id = pa.policy_id
        WHERE pa.dimension = 'mrv'
        GROUP BY p.country
      ),
      CountryFID AS (
        SELECT 
          country,
          SUM(estimated_capacity) as total_fid_cap,
          COUNT(*) as fid_count
        FROM facilities
        WHERE status IN ('Operational', 'Under construction')
        GROUP BY country
      )
      SELECT 
        m.country,
        m.avg_mrv_len,
        f.total_fid_cap,
        f.fid_count
      FROM CountryMRV m
      JOIN CountryFID f ON m.country = f.country
      ORDER BY m.avg_mrv_len DESC
    `,
    // 4. Cancelled projects metabolism
    metabolism: `
      SELECT 
        AVG(estimated_capacity) as avg_cap
      FROM facilities
      WHERE status = 'Cancelled'
    `
  };

  const results = {};
  for (const [key, sql] of Object.entries(queries)) {
    try {
      const res = db.exec(sql);
      results[key] = res.length > 0 ? res[0].values : [];
    } catch (e) {
      results[key] = `Error: ${e.message}`;
    }
  }

  console.log(JSON.stringify(results, null, 2));
}

fetchMetrics();

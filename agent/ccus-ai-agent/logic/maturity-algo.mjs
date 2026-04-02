import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../db/ccus_master.sqlite');

async function compute() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  console.log("Computing Global Maturity Matrix (XY)...");

  const countries = db.exec("SELECT id FROM country_profiles");
  if (countries.length === 0) return;

  db.run("BEGIN TRANSACTION");
  const peakQuery = db.prepare(`
    SELECT
      COALESCE(MAX(CASE WHEN a.dimension = 'incentive' THEN a.score END), 0) AS incentive,
      COALESCE(MAX(CASE WHEN a.dimension = 'statutory' THEN a.score END), 0) AS statutory,
      COALESCE(MAX(CASE WHEN a.dimension = 'market' THEN a.score END), 0) AS market,
      COALESCE(MAX(CASE WHEN a.dimension = 'strategic' THEN a.score END), 0) AS strategic,
      COALESCE(MAX(CASE WHEN a.dimension = 'mrv' THEN a.score END), 0) AS mrv
    FROM policy_analysis a
    JOIN policies p ON a.policy_id = p.id
    WHERE p.country = ? AND p.status IN ('Active', '运行中', '现行')
  `);
  
  for (const row of countries[0].values) {
    const countryId = row[0];

    // X-Axis: Capacity (Operational + Under Construction)
    const capStmt = db.prepare(`
      SELECT SUM(estimated_capacity) FROM facilities 
      WHERE country = ? AND (status = 'Operational' OR status = 'Under construction' OR status = '运行中' OR status = '建设中')
    `);
    capStmt.bind([countryId]);
    capStmt.step();
    const totalCap = capStmt.get()[0] || 0;
    capStmt.free();

    // Y-Axis: Peak governance score across the 5 dimensions.
    peakQuery.bind([countryId]);
    peakQuery.step();
    const peakScores = peakQuery.get();
    peakQuery.reset();
    const governanceScorePeak = Math.min(
      500,
      peakScores.reduce(
        (sum, score) => sum + Math.min(100, Math.max(0, Number(score || 0))),
        0
      )
    );

    // Update DB
    db.run("UPDATE country_profiles SET maturity_x = ?, maturity_y = ? WHERE id = ?", [totalCap, governanceScorePeak, countryId]);
    console.log(`  - ${countryId.padEnd(15)} | X (Cap): ${totalCap.toFixed(2)} | Y (Gov Peak): ${governanceScorePeak}`);
  }

  db.run("COMMIT");
  peakQuery.free();
  const data = db.export();
  fs.writeFileSync(DB_PATH, new Uint8Array(data));
  db.close();
  console.log("Maturity Computation DONE.");
}

compute().catch(err => console.error(err));

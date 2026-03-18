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

    // Y-Axis: FSRTM Sum of Peaks
    const dims = ['incentive', 'statutory', 'market', 'strategic', 'mrv'];
    let fsrtmSum = 0;
    for (const dim of dims) {
      const scoreStmt = db.prepare(`
        SELECT MAX(score) FROM policy_analysis a
        JOIN policies p ON a.policy_id = p.id
        WHERE p.country = ? AND a.dimension = ? AND p.status IN ('Active', '运行中', '现行')
      `);
      scoreStmt.bind([countryId, dim]);
      scoreStmt.step();
      fsrtmSum += (scoreStmt.get()[0] || 0);
      scoreStmt.free();
    }

    // Update DB
    db.run("UPDATE country_profiles SET maturity_x = ?, maturity_y = ? WHERE id = ?", [totalCap, fsrtmSum, countryId]);
    console.log(`  - ${countryId.padEnd(15)} | X (Cap): ${totalCap.toFixed(2)} | Y (FSRTM): ${fsrtmSum}`);
  }

  db.run("COMMIT");
  const data = db.export();
  fs.writeFileSync(DB_PATH, new Uint8Array(data));
  db.close();
  console.log("Maturity Computation DONE.");
}

compute().catch(err => console.error(err));

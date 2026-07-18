import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = path.join(__dirname, '../db/ccus_master.sqlite');
const DIMENSIONS = ['incentive', 'statutory', 'market', 'strategic', 'mrv'];

const hasColumn = (db, table, column) => {
  const result = db.exec(`PRAGMA table_info(${table})`);
  if (!result.length) return false;
  const nameIndex = result[0].columns.indexOf('name');
  return result[0].values.some((row) => row[nameIndex] === column);
};

const ensureColumn = (db, name, definition) => {
  if (!hasColumn(db, 'country_profiles', name)) {
    db.run(`ALTER TABLE country_profiles ADD COLUMN ${name} ${definition}`);
  }
};

const rowObject = (statement) => {
  if (!statement.step()) return null;
  const columns = statement.getColumnNames();
  const values = statement.get();
  return Object.fromEntries(columns.map((column, index) => [column, values[index]]));
};

const capacityExpression = `
  CASE
    WHEN COALESCE(estimated_capacity, 0) > 0 THEN estimated_capacity
    WHEN COALESCE(announced_capacity_min, 0) > 0
      AND COALESCE(announced_capacity_max, 0) > 0
      THEN (announced_capacity_min + announced_capacity_max) / 2.0
    WHEN COALESCE(announced_capacity_max, 0) > 0 THEN announced_capacity_max
    WHEN COALESCE(announced_capacity_min, 0) > 0 THEN announced_capacity_min
    ELSE 0
  END
`;

export async function computeGovernanceDeployment(dbPath = DEFAULT_DB_PATH) {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  ensureColumn(db, 'deployment_capacity_mtpa', 'REAL NOT NULL DEFAULT 0');
  ensureColumn(db, 'governance_capability_index', 'REAL NOT NULL DEFAULT 0');

  // Keep the previous fields as one-release compatibility aliases. They are
  // written from the explicit fields and should no longer be used by new code.
  ensureColumn(db, 'maturity_x', 'REAL NOT NULL DEFAULT 0');
  ensureColumn(db, 'maturity_y', 'REAL NOT NULL DEFAULT 0');

  db.run(`
    UPDATE country_profiles
    SET deployment_capacity_mtpa = COALESCE(
      NULLIF(deployment_capacity_mtpa, 0),
      maturity_x,
      0
    ),
    governance_capability_index = COALESCE(
      NULLIF(governance_capability_index, 0),
      maturity_y / ${DIMENSIONS.length}.0,
      0
    )
  `);

  const countries = db.exec('SELECT id FROM country_profiles ORDER BY id');
  if (!countries.length) {
    db.close();
    return;
  }

  const peakQuery = db.prepare(`
    SELECT
      COALESCE(MAX(CASE WHEN a.dimension = 'incentive' THEN a.score END), 0) AS incentive,
      COALESCE(MAX(CASE WHEN a.dimension = 'statutory' THEN a.score END), 0) AS statutory,
      COALESCE(MAX(CASE WHEN a.dimension = 'market' THEN a.score END), 0) AS market,
      COALESCE(MAX(CASE WHEN a.dimension = 'strategic' THEN a.score END), 0) AS strategic,
      COALESCE(MAX(CASE WHEN a.dimension = 'mrv' THEN a.score END), 0) AS mrv
    FROM policy_analysis a
    JOIN policies p ON a.policy_id = p.id
    WHERE p.country = ? AND p.status IN ('Active', 'Operational', '运行中', '现行')
  `);
  const capacityQuery = db.prepare(`
    SELECT COALESCE(SUM(${capacityExpression}), 0) AS committed_capacity
    FROM facilities
    WHERE country = ?
      AND status IN ('Operational', 'Under construction', '运行中', '建设中')
  `);
  const update = db.prepare(`
    UPDATE country_profiles
    SET deployment_capacity_mtpa = ?,
        governance_capability_index = ?,
        maturity_x = ?,
        maturity_y = ?
    WHERE id = ?
  `);

  db.run('BEGIN TRANSACTION');
  try {
    for (const [countryId] of countries[0].values) {
      peakQuery.bind([countryId]);
      const peaks = rowObject(peakQuery) || {};
      peakQuery.reset();

      const scores = DIMENSIONS.map((dimension) =>
        Math.min(100, Math.max(0, Number(peaks[dimension] || 0)))
      );
      const governanceIndex =
        scores.reduce((sum, score) => sum + score, 0) / DIMENSIONS.length;

      capacityQuery.bind([countryId]);
      const capacity = Number(rowObject(capacityQuery)?.committed_capacity || 0);
      capacityQuery.reset();

      update.run([
        capacity,
        governanceIndex,
        capacity,
        governanceIndex * DIMENSIONS.length,
        countryId,
      ]);
      update.reset();
      console.log(
        `${String(countryId).padEnd(24)} deployment=${capacity.toFixed(2)} Mtpa governance=${governanceIndex.toFixed(1)}/100`
      );
    }
    db.run('COMMIT');
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  } finally {
    peakQuery.free();
    capacityQuery.free();
    update.free();
  }

  const data = db.export();
  fs.writeFileSync(dbPath, new Uint8Array(data));
  db.close();
  console.log('Governance–deployment metrics updated.');
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  computeGovernanceDeployment().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

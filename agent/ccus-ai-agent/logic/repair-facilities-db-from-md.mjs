import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(ROOT, 'governance', 'db', 'ccus_master.sqlite');
const REPAIR_JSON = path.join(
  ROOT,
  'governance',
  'reports',
  'facilities_db_repair_from_md.json'
);
const APPLY_REPORT_JSON = path.join(
  ROOT,
  'governance',
  'reports',
  'facilities_db_repair_apply_report.json'
);
const BACKUP_DIR = path.join(ROOT, 'governance', 'db', 'backups');

const FACILITIES_SCALAR_COLUMNS = new Set([
  'country',
  'status',
  'announced_capacity_raw',
  'investment_scale',
  'provenance_author',
  'provenance_reviewer',
  'provenance_last_audit_date',
]);

const ORDERED_ROW_TABLES = {
  facility_partners: { valueColumn: 'partner' },
  facility_links: { valueColumn: 'link' },
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadRepairPlan(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Repair plan not found: ${filePath}`);
  }
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!parsed || !Array.isArray(parsed.actions)) {
    throw new Error(`Invalid repair plan (missing actions array): ${filePath}`);
  }
  return parsed;
}

function timestampTag() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function writeApplyReport(report) {
  ensureDir(path.dirname(APPLY_REPORT_JSON));
  fs.writeFileSync(APPLY_REPORT_JSON, JSON.stringify(report, null, 2));
}

async function applyRepairPlan({ dryRun = false } = {}) {
  const repairPlan = loadRepairPlan(REPAIR_JSON);
  const SQL = await initSqlJs();
  const originalBytes = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(new Uint8Array(originalBytes));

  let backupPath = null;
  const applied = [];
  const skipped = [];

  try {
    db.run('PRAGMA foreign_keys = ON;');
    db.run('BEGIN TRANSACTION;');

    for (const action of repairPlan.actions) {
      if (action.type === 'update_facilities_scalar') {
        const { id, column, value } = action;
        if (!FACILITIES_SCALAR_COLUMNS.has(column)) {
          throw new Error(`Unsupported facilities scalar column: ${column}`);
        }
        const sql = `UPDATE facilities SET ${column} = ? WHERE id = ?`;
        db.run(sql, [value ?? '', String(id)]);
        applied.push(action);
        continue;
      }

      if (action.type === 'replace_ordered_rows') {
        const { table, id, lang, values } = action;
        const tableMeta = ORDERED_ROW_TABLES[table];
        if (!tableMeta) {
          throw new Error(`Unsupported ordered row table: ${table}`);
        }
        db.run(
          `DELETE FROM ${table} WHERE facility_id = ? AND lang = ?`,
          [String(id), String(lang)]
        );
        (Array.isArray(values) ? values : []).forEach((rawValue, index) => {
          db.run(
            `INSERT INTO ${table} (facility_id, lang, order_index, ${tableMeta.valueColumn}) VALUES (?, ?, ?, ?)`,
            [String(id), String(lang), index, String(rawValue ?? '')]
          );
        });
        applied.push(action);
        continue;
      }

      skipped.push({
        action,
        reason: `Unsupported action type: ${action.type}`,
      });
      throw new Error(`Unsupported action type: ${action.type}`);
    }

    if (dryRun) {
      db.run('ROLLBACK;');
    } else {
      db.run('COMMIT;');
      ensureDir(BACKUP_DIR);
      backupPath = path.join(
        BACKUP_DIR,
        `ccus_master.sqlite.before-facilities-md-repair.${timestampTag()}.bak`
      );
      fs.copyFileSync(DB_PATH, backupPath);
      const updatedBytes = db.export();
      fs.writeFileSync(DB_PATH, Buffer.from(updatedBytes));
    }

    const report = {
      generatedAt: new Date().toISOString(),
      dryRun,
      dbPath: path.relative(ROOT, DB_PATH).replace(/\\/g, '/'),
      repairPlanPath: path.relative(ROOT, REPAIR_JSON).replace(/\\/g, '/'),
      backupPath: backupPath
        ? path.relative(ROOT, backupPath).replace(/\\/g, '/')
        : null,
      totals: {
        planned: repairPlan.actions.length,
        applied: applied.length,
        skipped: skipped.length,
      },
      countsByType: applied.reduce((acc, action) => {
        acc[action.type] = (acc[action.type] || 0) + 1;
        return acc;
      }, {}),
      skipped,
    };

    writeApplyReport(report);
    return report;
  } finally {
    try {
      db.close();
    } catch {
      // ignore close errors on failed transaction paths
    }
  }
}

export async function main() {
  const dryRun = process.argv.includes('--dry-run');
  try {
    const report = await applyRepairPlan({ dryRun });
    console.log(
      `Facilities DB repair ${dryRun ? 'DRY-RUN' : 'APPLIED'} | planned=${report.totals.planned} | applied=${report.totals.applied} | skipped=${report.totals.skipped}`
    );
    if (report.backupPath) console.log(`Backup: ${report.backupPath}`);
    console.log(
      `Apply report: ${path.relative(ROOT, APPLY_REPORT_JSON).replace(/\\/g, '/')}`
    );
  } catch (error) {
    console.error(`Facilities DB repair failed: ${error.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}


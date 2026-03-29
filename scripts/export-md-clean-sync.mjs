import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'agent/ccus-ai-agent/db/ccus_master.sqlite');

function rowsFromQuery(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  const columns = stmt.getColumnNames();
  while (stmt.step()) {
    const values = stmt.get();
    const row = {};
    for (let i = 0; i < columns.length; i += 1) {
      row[columns[i]] = values[i];
    }
    rows.push(row);
  }
  stmt.free();
  return rows;
}

function slugifyCountryId(id) {
  return String(id).toLowerCase().replace(/ /g, '-');
}

function toExpectedMarkdownSet(rows, key) {
  return new Set(rows.map((row) => `${row[key]}.md`));
}

function toExpectedCountryMarkdownSet(rows, key) {
  return new Set(rows.map((row) => `${slugifyCountryId(row[key])}.md`));
}

export function pruneMarkdownDirectory(dirPath, expectedFiles) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const deleted = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (path.extname(entry.name) !== '.md') continue;
    if (expectedFiles.has(entry.name)) continue;
    fs.unlinkSync(path.join(dirPath, entry.name));
    deleted.push(entry.name);
  }

  deleted.sort();
  return { deleted };
}

export function buildExpectedMarkdownSetsFromRows({
  policyI18nRows,
  facilityI18nRows,
  countryI18nRows,
}) {
  return {
    policies: {
      en: toExpectedMarkdownSet(
        policyI18nRows.filter((row) => row.lang === 'en'),
        'policy_id'
      ),
      zh: toExpectedMarkdownSet(
        policyI18nRows.filter((row) => row.lang === 'zh'),
        'policy_id'
      ),
    },
    facilities: {
      en: toExpectedMarkdownSet(
        facilityI18nRows.filter((row) => row.lang === 'en'),
        'facility_id'
      ),
      zh: toExpectedMarkdownSet(
        facilityI18nRows.filter((row) => row.lang === 'zh'),
        'facility_id'
      ),
    },
    countries: {
      en: toExpectedCountryMarkdownSet(
        countryI18nRows.filter((row) => row.lang === 'en'),
        'country_id'
      ),
      zh: toExpectedCountryMarkdownSet(
        countryI18nRows.filter((row) => row.lang === 'zh'),
        'country_id'
      ),
    },
  };
}

function buildExpectedMarkdownSets(db) {
  const expected = buildExpectedMarkdownSetsFromRows({
    policyI18nRows: rowsFromQuery(
      db,
      'SELECT policy_id, lang FROM policy_i18n'
    ),
    facilityI18nRows: rowsFromQuery(
      db,
      'SELECT facility_id, lang FROM facility_i18n'
    ),
    countryI18nRows: rowsFromQuery(
      db,
      'SELECT country_id, lang FROM country_i18n'
    ),
  });

  return {
    [path.join(ROOT, 'src/content/policies/en')]: expected.policies.en,
    [path.join(ROOT, 'src/content/policies/zh')]: expected.policies.zh,
    [path.join(ROOT, 'src/content/facilities/en')]: expected.facilities.en,
    [path.join(ROOT, 'src/content/facilities/zh')]: expected.facilities.zh,
    [path.join(ROOT, 'src/content/countries/en')]: expected.countries.en,
    [path.join(ROOT, 'src/content/countries/zh')]: expected.countries.zh,
  };
}

export async function runCleanExportSync() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database file not found: ${DB_PATH}`);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)));
  const targets = buildExpectedMarkdownSets(db);
  db.close();

  const pruned = [];
  for (const [dirPath, expectedFiles] of Object.entries(targets)) {
    const result = pruneMarkdownDirectory(dirPath, expectedFiles);
    pruned.push({
      directory: path.relative(ROOT, dirPath).replace(/\\/g, '/'),
      deleted_count: result.deleted.length,
      deleted_files: result.deleted,
    });
  }

  execFileSync('node', ['agent/ccus-ai-agent/logic/manage.mjs', 'db:export:md'], {
    cwd: ROOT,
    stdio: 'inherit',
  });

  const summary = {
    generated_at: new Date().toISOString(),
    db_path: DB_PATH,
    pruned,
    total_deleted: pruned.reduce((sum, item) => sum + item.deleted_count, 0),
  };

  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCleanExportSync().catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  });
}

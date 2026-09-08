/**
 * Shared SQLite access layer for the CCUS maintenance CLI.
 *
 * Single home for:
 * - well-known repository paths (so `logic/` and `logic/commands/` never
 *   recompute them and drift apart);
 * - `SqlJsDatabase`, the sql.js adapter every managed command must use;
 * - `loadDb`, the only sanctioned way to open the master database.
 *
 * Write safety contract (see `scripts/lib/db-write.mjs`):
 * - persist through `SqlJsDatabase.save()` (atomic tmp-file + rename);
 * - hold `acquireDbLock()` for the whole command (released by the caller).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWriteDb } from '../../../scripts/lib/db-write.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Absolute path of `agent/ccus-ai-agent/logic/`, wherever this file moves. */
export const LOGIC_DIR = __dirname;

export const DB_PATH = path.join(__dirname, '../db/ccus_master.sqlite');
export const SCHEMA_PATH = path.join(__dirname, '../db/schema.sql');
export const LEGACY_I18N_PATH = path.join(
  __dirname,
  '../../../src/data/i18n_dictionary.json'
);
export const REPORTS_DIR = path.join(__dirname, '../governance/reports');
export const THRESHOLDS_PATH = path.join(
  __dirname,
  '../governance/audit_thresholds.json'
);
export const FACILITY_COORD_REPORT_JSON = path.join(
  REPORTS_DIR,
  'facility_coordinate_governance_report.json'
);
export const FACILITY_COORD_REPORT_MD = path.join(
  REPORTS_DIR,
  'facility_coordinate_governance_report.md'
);

export class SqlJsDatabase {
  constructor(SQL, buffer = null) {
    this.db = new SQL.Database(buffer);
    this.db.run('PRAGMA foreign_keys = ON;');
    this.db.run("PRAGMA encoding = 'UTF-8';");
  }
  close() {
    this.db.close();
  }
  exec(sql) {
    this.db.run(sql);
  }
  run(sql, params = []) {
    this.db.run(
      sql,
      params.map((p) => (p === undefined ? null : p))
    );
  }
  all(sql, params = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params.map((p) => (p === undefined ? null : p)));
    const rows = [];
    const columnNames = stmt.getColumnNames();
    while (stmt.step()) {
      const values = stmt.get();
      const row = {};
      for (let i = 0; i < columnNames.length; i++)
        row[columnNames[i]] = values[i];
      rows.push(row);
    }
    stmt.free();
    return rows;
  }
  get(sql, params = []) {
    const rows = this.all(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }
  save() {
    atomicWriteDb(DB_PATH, this.db.export());
  }
  transaction(fn) {
    this.db.run('BEGIN TRANSACTION');
    try {
      fn();
      this.db.run('COMMIT');
    } catch (e) {
      this.db.run('ROLLBACK');
      throw e;
    }
  }
}

export function loadDb(SQL) {
  if (!fs.existsSync(DB_PATH)) throw new Error('Database file missing.');
  return new SqlJsDatabase(SQL, new Uint8Array(fs.readFileSync(DB_PATH)));
}

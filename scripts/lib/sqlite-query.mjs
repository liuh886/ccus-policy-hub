/**
 * Shared sql.js query helpers. Every script that reads the SQLite SSOT
 * should import from here instead of re-implementing the prepare/step loop.
 *
 * `db` is a sql.js `Database` instance.
 */

/** Run a query and return rows as objects keyed by column name. */
export function queryRows(db, sql, params = []) {
  const statement = db.prepare(sql);
  statement.bind(params);
  const columns = statement.getColumnNames();
  const rows = [];
  while (statement.step()) {
    const values = statement.get();
    rows.push(
      Object.fromEntries(
        columns.map((column, index) => [column, values[index]])
      )
    );
  }
  statement.free();
  return rows;
}

/** Run a query and return the first cell of the first row (0 when empty). */
export function queryScalar(db, sql, params = []) {
  const rows = queryRows(db, sql, params);
  if (rows.length === 0) return 0;
  return Object.values(rows[0])[0];
}

/** Parse a JSON string field safely, returning `fallback` on failure. */
export function parseJsonSafe(value, fallback = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * Return the latest non-empty `provenance_last_audit_date` across policies,
 * facilities, and country_profiles, or `null` when none is set.
 * Accepts either a raw sql.js `Database` or a `SqlJsDatabase` wrapper.
 */
export function getDatasetAsOf(db) {
  const rawDb = typeof db?.prepare === 'function' ? db : db?.db;
  const rows = queryRows(
    rawDb,
    `SELECT MAX(d) AS m FROM (
      SELECT NULLIF(provenance_last_audit_date, '') AS d FROM policies
      UNION ALL SELECT NULLIF(provenance_last_audit_date, '') FROM facilities
      UNION ALL SELECT NULLIF(provenance_last_audit_date, '') FROM country_profiles
    )`
  );
  return rows[0]?.m ?? null;
}

/**
 * Return the deterministic ISO-8601 `data_as_of` timestamp derived from
 * `getDatasetAsOf(db)`, falling back to Unix epoch when no audit date exists.
 */
export function getDatasetAsOfIso(db) {
  const date = getDatasetAsOf(db);
  return date ? `${date}T00:00:00.000Z` : '1970-01-01T00:00:00.000Z';
}

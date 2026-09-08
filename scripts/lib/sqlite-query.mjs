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

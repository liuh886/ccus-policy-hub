// Direct tests for the db:peek allowlist in logic/db.mjs: CLI-supplied
// table/column identifiers must resolve to real schema objects, otherwise
// the router refuses before any SQL is interpolated.
import assert from 'node:assert/strict';
import test from 'node:test';
import initSqlJs from 'sql.js';
import {
  SqlJsDatabase,
  assertKnownColumn,
  assertKnownTable,
  knownTables,
} from '../db.mjs';

async function makeDb() {
  const SQL = await initSqlJs();
  const db = new SqlJsDatabase(SQL);
  db.exec('CREATE TABLE policies (id TEXT PRIMARY KEY, country TEXT);');
  return db;
}

test('accepts real tables and rejects the rest', async () => {
  const db = await makeDb();
  try {
    assert.deepEqual([...knownTables(db)], ['policies']);
    assertKnownTable(db, 'policies');
    assert.throws(() => assertKnownTable(db, 'nope'), /Unknown table/);
    assert.throws(() => assertKnownTable(db, undefined), /Unknown table/);
    assert.throws(
      () => assertKnownTable(db, 'policies; DROP TABLE policies'),
      /Unknown table/
    );
    assert.throws(() => assertKnownTable(db, 'sqlite_master'), /Unknown table/);
  } finally {
    db.close();
  }
});

test('accepts real columns and rejects the rest', async () => {
  const db = await makeDb();
  try {
    assertKnownColumn(db, 'policies', 'country');
    assert.throws(
      () => assertKnownColumn(db, 'policies', 'nope'),
      /Unknown column/
    );
    assert.throws(
      () => assertKnownColumn(db, 'policies', 'country || id'),
      /Unknown column/
    );
    assert.throws(() => assertKnownColumn(db, 'nope', 'id'), /Unknown table/);
  } finally {
    db.close();
  }
});

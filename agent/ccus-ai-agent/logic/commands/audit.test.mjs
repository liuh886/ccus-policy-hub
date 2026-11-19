// Direct tests for the heart path dbAuditDeep: gate evaluation against an
// in-memory database. The master database is never touched.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import initSqlJs from 'sql.js';
import { SCHEMA_PATH, SqlJsDatabase } from '../db.mjs';
import { dbAuditDeep } from './audit.mjs';

const THRESHOLDS = {
  min_policy_count: 1,
  min_facility_count: 1,
  min_regulatory_fill_rate: 0,
};

function makeDb(SQL) {
  const db = new SqlJsDatabase(SQL);
  db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  return db;
}

function seedPassing(db) {
  db.run(`INSERT INTO policies (id, country, year, status) VALUES (?,?,?,?)`, [
    'p1',
    'Brazil',
    2024,
    'Active',
  ]);
  db.run(
    `INSERT INTO facilities (id, country, lat, lng, precision) VALUES (?,?,?,?,?)`,
    ['f1', 'Brazil', -22.9, -43.2, 'exact']
  );
}

test('passes and stamps metadata in one transaction when all gates hold', async () => {
  const SQL = await initSqlJs();
  const db = makeDb(SQL);
  try {
    seedPassing(db);
    await dbAuditDeep(SQL, { db, thresholds: THRESHOLDS });
    const meta = db.get(
      "SELECT value FROM db_meta WHERE key = 'last_audit_pass'"
    );
    assert.equal(meta.value, 'true');
    const dateMeta = db.get(
      "SELECT value FROM db_meta WHERE key = 'last_audit_date'"
    );
    const ruleMeta = db.get(
      "SELECT value FROM db_meta WHERE key = 'last_audit_rule_version'"
    );
    assert.match(dateMeta.value, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(ruleMeta.value, '2026-07-v1');
  } finally {
    db.close();
  }
});

test('fails loudly, stamps false, and does not stamp audit date when counts fall short', async () => {
  const SQL = await initSqlJs();
  const db = makeDb(SQL);
  try {
    seedPassing(db);
    await assert.rejects(
      dbAuditDeep(SQL, {
        db,
        thresholds: { ...THRESHOLDS, min_policy_count: 999 },
      }),
      /Audit FAILED/
    );
    const meta = db.get(
      "SELECT value FROM db_meta WHERE key = 'last_audit_pass'"
    );
    assert.equal(meta.value, 'false');
    const dateMeta = db.get(
      "SELECT value FROM db_meta WHERE key = 'last_audit_date'"
    );
    assert.equal(dateMeta, null);
  } finally {
    db.close();
  }
});

test('fails when coordinates cannot be resolved', async () => {
  const SQL = await initSqlJs();
  const db = makeDb(SQL);
  try {
    db.run(
      `INSERT INTO policies (id, country, year, status) VALUES (?,?,?,?)`,
      ['p1', 'Nowhere-Land', 2024, 'Active']
    );
    db.run(`INSERT INTO facilities (id, country, precision) VALUES (?,?,?)`, [
      'f1',
      'Nowhere-Land',
      'country',
    ]);
    await assert.rejects(
      dbAuditDeep(SQL, { db, thresholds: THRESHOLDS }),
      /Audit FAILED/
    );
  } finally {
    db.close();
  }
});

test('readOnly mode passes without mutating db_meta', async () => {
  const SQL = await initSqlJs();
  const db = makeDb(SQL);
  try {
    seedPassing(db);
    await dbAuditDeep(SQL, { db, thresholds: THRESHOLDS, readOnly: true });
    const meta = db.get(
      "SELECT value FROM db_meta WHERE key = 'last_audit_pass'"
    );
    assert.equal(meta, null);
  } finally {
    db.close();
  }
});

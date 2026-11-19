import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import initSqlJs from 'sql.js';
import { SCHEMA_PATH, SqlJsDatabase } from '../db.mjs';
import { dbSeedCountries, dbSyncCountryProfiles } from './seed.mjs';

function makeDb(SQL) {
  const db = new SqlJsDatabase(SQL);
  db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  return db;
}

test('dbSeedCountries uses upsert to preserve country_profiles audit and deployment columns', async () => {
  const SQL = await initSqlJs();
  const db = makeDb(SQL);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seed-test-'));
  const countriesPath = path.join(tmpDir, 'countries.json');
  fs.writeFileSync(
    countriesPath,
    JSON.stringify({ Brazil: { en: 'Brazil', zh: '巴西' } })
  );
  try {
    db.run(
      `INSERT INTO country_profiles (
        id, region, deployment_capacity_mtpa, governance_capability_index,
        provenance_reviewer, provenance_last_audit_date
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      ['Brazil', 'Americas', 12.5, 68.4, 'Reviewer X', '2026-10-01']
    );
    db.run(
      `INSERT INTO country_i18n (country_id, lang, name, summary) VALUES (?, 'en', ?, ?)`,
      ['Brazil', 'Brazil', 'Existing summary']
    );

    await dbSeedCountries(SQL, { db, countriesPath });

    const profile = db.get('SELECT * FROM country_profiles WHERE id = ?', [
      'Brazil',
    ]);
    assert.equal(profile.region, 'Global');
    assert.equal(profile.deployment_capacity_mtpa, 12.5);
    assert.equal(profile.governance_capability_index, 68.4);
    assert.equal(profile.provenance_reviewer, 'Reviewer X');
    assert.equal(profile.provenance_last_audit_date, '2026-10-01');

    const langs = db
      .all('SELECT lang FROM country_i18n WHERE country_id = ? ORDER BY lang', [
        'Brazil',
      ])
      .map((r) => r.lang);
    assert.deepEqual(langs, ['en', 'zh']);
  } finally {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('dbSyncCountryProfiles rolls up valid pillars and surfaces malformed regulatory_json errors', async () => {
  const SQL = await initSqlJs();
  const db = makeDb(SQL);
  const originalError = console.error;
  const logged = [];
  console.error = (msg) => logged.push(String(msg));
  try {
    db.run(`INSERT INTO country_profiles (id, region) VALUES (?, ?)`, [
      'Brazil',
      'Global',
    ]);
    db.run(
      `INSERT INTO country_i18n (country_id, lang, name) VALUES (?, 'en', ?)`,
      ['Brazil', 'Brazil']
    );
    db.run(
      `INSERT INTO country_i18n (country_id, lang, name) VALUES (?, 'zh', ?)`,
      ['Brazil', '巴西']
    );
    db.run(`INSERT INTO policies (id, country, year) VALUES (?, ?, ?)`, [
      'br-law-1',
      'Brazil',
      2024,
    ]);
    db.run(
      `INSERT INTO policy_i18n (policy_id, lang, title, regulatory_json) VALUES (?, 'en', ?, ?)`,
      [
        'br-law-1',
        'Brazil Law',
        JSON.stringify({ pore_space_rights: 'State Owned' }),
      ]
    );
    db.run(
      `INSERT INTO policy_i18n (policy_id, lang, title, regulatory_json) VALUES (?, 'zh', ?, ?)`,
      ['br-law-1', '巴西法律', '{not-valid-json']
    );

    await assert.rejects(
      dbSyncCountryProfiles(SQL, { db }),
      /Malformed regulatory_json for policy br-law-1 \(Brazil\/zh\)/
    );
    // Transaction rolled back: English pillar must not persist when zh fails.
    const enRow = db.get(
      "SELECT pore_space_rights FROM country_i18n WHERE country_id = 'Brazil' AND lang = 'en'"
    );
    assert.equal(enRow.pore_space_rights, 'Pending');
    assert.equal(logged.length, 1);
    assert.equal(JSON.parse(logged[0]).event, 'malformed_regulatory_json');
  } finally {
    console.error = originalError;
    db.close();
  }
});

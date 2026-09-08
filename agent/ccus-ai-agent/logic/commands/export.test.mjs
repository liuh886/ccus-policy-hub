// Direct tests for the heart path dbExportMd: bilingual markdown export.
// Runs against an in-memory database built from the governed schema.sql plus
// fixture rows, and writes into a temp directory — the master database and
// src/content are never touched.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import matter from 'gray-matter';
import initSqlJs from 'sql.js';
import { REVIEWER_PLACEHOLDER } from '../../../../scripts/lib/i18n-translate.mjs';
import { SCHEMA_PATH, SqlJsDatabase } from '../db.mjs';
import { dbExportMd } from './export.mjs';

function makeDb(SQL) {
  const db = new SqlJsDatabase(SQL);
  db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  return db;
}

function seedPolicy(db) {
  db.run(
    `INSERT INTO policies (id, country, year, status, category, review_status, legal_weight, source, url, pub_date, provenance_author, provenance_reviewer, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      'p1',
      'Brazil',
      2024,
      'Active',
      'Regulatory',
      'verified',
      'Law',
      'Ministry',
      'https://example.com/p1',
      '2024-01-01',
      'tester',
      'reviewer',
      '2026-01-01',
    ]
  );
  for (const lang of ['en', 'zh']) {
    db.run(
      `INSERT INTO policy_i18n (policy_id, lang, title, description, interpretation, impact_analysis_json, evolution_json, regulatory_json) VALUES (?,?,?,?,?,?,?,?)`,
      [
        'p1',
        lang,
        `Title ${lang}`,
        `${lang} description ` + 'x'.repeat(600),
        null,
        '{}',
        '{}',
        '{}',
      ]
    );
  }
  db.run(
    `INSERT INTO policy_analysis (policy_id, dimension, score, label, evidence, citation, audit_note) VALUES (?,?,?,?,?,?,?)`,
    ['p1', 'incentive', 40, 'Defined', 'Some evidence', '', '']
  );
}

function seedFacility(db, { id, reviewer, auditDate }) {
  db.run(
    `INSERT INTO facilities (id, country, status, announced_capacity_max, estimated_capacity, lat, lng, precision, provenance_author, provenance_reviewer, provenance_last_audit_date) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      'Brazil',
      'Operational',
      1.5,
      1.25,
      -22.9,
      -43.2,
      'exact',
      'tester',
      reviewer,
      auditDate,
    ]
  );
  for (const lang of ['en', 'zh']) {
    db.run(
      `INSERT INTO facility_i18n (facility_id, lang, name, description, region, type, sector, hub, operator) VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        id,
        lang,
        `Facility ${lang}`,
        `Body ${lang}`,
        'Region',
        'Capture',
        'Power',
        null,
        null,
      ]
    );
  }
  db.run(
    `INSERT INTO facility_partners (facility_id, lang, order_index, partner) VALUES (?,?,?,?)`,
    [id, 'en', 0, 'Partner A']
  );
  db.run(
    `INSERT INTO facility_links (facility_id, lang, order_index, link) VALUES (?,?,?,?)`,
    [id, 'en', 0, 'https://example.com/f']
  );
  db.run(
    `INSERT INTO policy_facility_links (policy_id, facility_id) VALUES (?,?)`,
    ['p1', id]
  );
}

function writeDict(dir) {
  const dictPath = path.join(dir, 'dict.json');
  fs.writeFileSync(
    dictPath,
    JSON.stringify({
      countries: { 巴西: 'Brazil' },
      ui: {
        status: { Active: { zh: '运行中', en: 'Active' } },
        categories: { Regulatory: { zh: '法律监管', en: 'Regulatory' } },
        dimensions: {},
      },
    })
  );
  return dictPath;
}

const readFm = (file) => matter(fs.readFileSync(file, 'utf8')).data;

test('exports bilingual policy markdown with translated zh values', async () => {
  const SQL = await initSqlJs();
  const db = makeDb(SQL);
  seedPolicy(db);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'export-test-'));
  try {
    await dbExportMd(SQL, {
      db,
      contentRoot: tmp,
      dictPath: writeDict(tmp),
    });
    const zh = readFm(path.join(tmp, 'policies/zh/p1.md'));
    assert.equal(zh.country, '巴西');
    assert.equal(zh.status, '运行中');
    assert.equal(zh.category, '法律监管');
    assert.equal(zh.description.length, 500);
    assert.deepEqual(zh.relatedFacilities, []);
    assert.equal(zh.analysis.incentive.score, 40);
    const en = readFm(path.join(tmp, 'policies/en/p1.md'));
    assert.equal(en.country, 'Brazil');
    assert.equal(en.status, 'Active');
  } finally {
    db.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('exports facilities with sorted links and reviewer fallback', async () => {
  const SQL = await initSqlJs();
  const db = makeDb(SQL);
  seedPolicy(db);
  seedFacility(db, { id: 'f1', reviewer: null, auditDate: '2026-03-01' });
  seedFacility(db, { id: 'f2', reviewer: null, auditDate: null });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'export-test-'));
  try {
    await dbExportMd(SQL, {
      db,
      contentRoot: tmp,
      dictPath: writeDict(tmp),
    });
    const zh = readFm(path.join(tmp, 'facilities/zh/f1.md'));
    assert.equal(zh.country, '巴西');
    assert.deepEqual(zh.relatedPolicies, ['p1']);
    assert.equal(zh.provenance.reviewer, REVIEWER_PLACEHOLDER);
    assert.equal(zh.provenance.lastAuditDate, '2026-03-01');
    const fallback = readFm(path.join(tmp, 'facilities/zh/f2.md'));
    assert.match(fallback.provenance.lastAuditDate, /^\d{4}-\d{2}-\d{2}$/);
  } finally {
    db.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

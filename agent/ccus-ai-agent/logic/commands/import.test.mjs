// Direct tests for the heart path dbImportMdReverse: fixture markdown
// round-trips back into an in-memory database. The master database and
// src/content are never touched.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import initSqlJs from 'sql.js';
import { SCHEMA_PATH, SqlJsDatabase } from '../db.mjs';
import { REVERSE_SYNC_MIGRATION_FLAG, dbImportMdReverse } from './import.mjs';

function makeDb(SQL) {
  const db = new SqlJsDatabase(SQL);
  db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  return db;
}

function writeMd(dir, rel, frontmatter, body) {
  const file = path.join(dir, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    `---\n${JSON.stringify(frontmatter, null, 2)}\n---\n\n${body}\n`
  );
}

function seedEnPolicy(tmp) {
  writeMd(
    tmp,
    'policies/en/p1.md',
    {
      id: 'p1',
      country: 'Brazil',
      year: 2024,
      status: 'Active',
      category: 'Regulatory',
      reviewStatus: 'verified',
      legalWeight: 'Law',
      source: 'Ministry',
      url: 'https://example.com/p1',
      pubDate: '2024-01-01',
      title: 'Title en',
      analysis: {
        incentive: {
          score: 40,
          label: 'L',
          evidence: 'E',
          citation: '',
          auditNote: '',
        },
      },
      provenance: {
        author: 'tester',
        reviewer: 'reviewer',
        lastAuditDate: '2026-01-01',
      },
    },
    'English body'
  );
}

function seedZhPolicy(tmp) {
  writeMd(
    tmp,
    'policies/zh/p1.md',
    {
      id: 'p1',
      country: '巴西',
      year: 2024,
      status: '运行中',
      category: '法律监管',
      reviewStatus: 'verified',
      title: '标题',
      provenance: {
        author: 'tester',
        reviewer: '',
        lastAuditDate: '2026-01-01',
      },
    },
    '中文正文'
  );
}

function seedContent(tmp, { bilingualPolicy = true } = {}) {
  seedEnPolicy(tmp);
  if (bilingualPolicy) seedZhPolicy(tmp);
  writeMd(
    tmp,
    'facilities/en/f1.md',
    {
      id: 'f1',
      name: 'Facility en',
      country: 'Brazil',
      status: 'Operational',
      coordinates: [-22.9, -43.2],
      precision: 'exact',
      partners: ['Partner A'],
      links: ['https://example.com/f'],
      relatedPolicies: ['p1'],
      provenance: {
        author: 'tester',
        reviewer: '',
        lastAuditDate: '2026-01-01',
      },
    },
    'Facility body'
  );
}

test('refuses reverse sync without the acknowledgement flag', async () => {
  const SQL = await initSqlJs();
  const db = makeDb(SQL);
  try {
    await assert.rejects(
      dbImportMdReverse(SQL, [], { db, contentRoot: os.tmpdir() }),
      /migration-only/
    );
  } finally {
    db.close();
  }
});

test('imports policy and facility markdown into the database', async () => {
  const SQL = await initSqlJs();
  const db = makeDb(SQL);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'import-test-'));
  try {
    // Single-language policy fixture: asserts full import fidelity.
    seedContent(tmp, { bilingualPolicy: false });
    await dbImportMdReverse(SQL, [REVERSE_SYNC_MIGRATION_FLAG], {
      db,
      contentRoot: tmp,
    });
    const policy = db.get('SELECT * FROM policies WHERE id = ?', ['p1']);
    assert.equal(policy.country, 'Brazil');
    assert.equal(policy.review_status, 'verified');
    const i18n = db.all(
      'SELECT lang, title, description FROM policy_i18n WHERE policy_id = ? ORDER BY lang',
      ['p1']
    );
    assert.deepEqual(
      i18n.map((r) => r.lang),
      ['en']
    );
    assert.equal(i18n[0].description, 'English body');
    const analysis = db.get(
      'SELECT score, evidence FROM policy_analysis WHERE policy_id = ? AND dimension = ?',
      ['p1', 'incentive']
    );
    assert.equal(analysis.score, 40);
    assert.equal(analysis.evidence, 'E');
    const facility = db.get('SELECT * FROM facilities WHERE id = ?', ['f1']);
    assert.equal(facility.lat, -22.9);
    assert.equal(facility.precision, 'exact');
    const partners = db.all(
      'SELECT partner FROM facility_partners WHERE facility_id = ?',
      ['f1']
    );
    assert.deepEqual(
      partners.map((r) => r.partner),
      ['Partner A']
    );
    const links = db.all(
      'SELECT policy_id FROM policy_facility_links WHERE facility_id = ?',
      ['f1']
    );
    assert.deepEqual(
      links.map((r) => r.policy_id),
      ['p1']
    );
  } finally {
    db.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// Bilingual imports must preserve both languages. Parent rows use UPSERT
// (not REPLACE) precisely so the second language pass cannot cascade-wipe
// the first language's i18n / analysis / partner rows (all ON DELETE
// CASCADE). Scalar shared columns still follow last-write-wins (zh last).
test('preserves both languages on bilingual import (no cascade loss)', async () => {
  const SQL = await initSqlJs();
  const db = makeDb(SQL);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'import-test-'));
  try {
    seedContent(tmp, { bilingualPolicy: true });
    writeMd(
      tmp,
      'facilities/zh/f1.md',
      {
        id: 'f1',
        name: '设施',
        country: '巴西',
        status: '运行中',
        coordinates: [-22.9, -43.2],
        precision: 'exact',
        provenance: {
          author: 'tester',
          reviewer: '',
          lastAuditDate: '2026-01-01',
        },
      },
      '设施正文'
    );
    await dbImportMdReverse(SQL, [REVERSE_SYNC_MIGRATION_FLAG], {
      db,
      contentRoot: tmp,
    });
    const policyLangs = db
      .all('SELECT lang FROM policy_i18n WHERE policy_id = ? ORDER BY lang', [
        'p1',
      ])
      .map((r) => r.lang);
    assert.deepEqual(policyLangs, ['en', 'zh']);
    assert.equal(
      db.get(
        'SELECT score FROM policy_analysis WHERE policy_id = ? AND dimension = ?',
        ['p1', 'incentive']
      ).score,
      40
    );
    const facilityLangs = db
      .all(
        'SELECT lang FROM facility_i18n WHERE facility_id = ? ORDER BY lang',
        ['f1']
      )
      .map((r) => r.lang);
    assert.deepEqual(facilityLangs, ['en', 'zh']);
    assert.deepEqual(
      db
        .all('SELECT partner FROM facility_partners WHERE facility_id = ?', [
          'f1',
        ])
        .map((r) => r.partner),
      ['Partner A']
    );
    assert.deepEqual(
      db
        .all(
          'SELECT policy_id FROM policy_facility_links WHERE facility_id = ?',
          ['f1']
        )
        .map((r) => r.policy_id),
      ['p1']
    );
  } finally {
    db.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

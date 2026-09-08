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

// KNOWN DATA-LOSS ISSUE — read before touching this test.
//
// en is imported before zh and both branches run
// `INSERT OR REPLACE INTO policies` on the same row. REPLACE is DELETE +
// INSERT, and every child table carries ON DELETE CASCADE, so the zh pass
// silently wipes the en policy_i18n row (and its policy_analysis rows).
// The same trap applies to bilingual facility imports.
//
// Do NOT "fix" this test to expect both languages: fix the implementation
// (UPSERT the parent rows instead of REPLACE) after explicit governance
// approval — reverse sync is a governed migration tool (see SAFETY.md).
test('documents bilingual cascade loss on parent REPLACE (known issue)', async () => {
  const SQL = await initSqlJs();
  const db = makeDb(SQL);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'import-test-'));
  try {
    seedContent(tmp, { bilingualPolicy: true });
    await dbImportMdReverse(SQL, [REVERSE_SYNC_MIGRATION_FLAG], {
      db,
      contentRoot: tmp,
    });
    const langs = db
      .all('SELECT lang FROM policy_i18n WHERE policy_id = ? ORDER BY lang', [
        'p1',
      ])
      .map((r) => r.lang);
    assert.deepEqual(langs, ['zh']);
    assert.equal(
      db.all('SELECT * FROM policy_analysis WHERE policy_id = ?', ['p1'])
        .length,
      0
    );
  } finally {
    db.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

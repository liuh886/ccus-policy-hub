import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import initSqlJs from 'sql.js';
import {
  SCHEMA_PATH,
  SqlJsDatabase,
} from '../agent/ccus-ai-agent/logic/db.mjs';
import { dbFixRelationships } from '../agent/ccus-ai-agent/logic/commands/maintenance.mjs';
import {
  applyRelationshipEvidence,
  runCli,
} from './apply-relationship-evidence.mjs';

async function createTempFixtureDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rel-evidence-test-'));
  const dbPath = path.join(dir, 'test.sqlite');
  const lockPath = path.join(dir, '.lock');
  const backupDir = path.join(dir, 'backups');
  const SQL = await initSqlJs();
  const rawDb = new SQL.Database();
  rawDb.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  rawDb.run(
    `INSERT INTO policies (id, country, year, status) VALUES
      ('norway-longship', 'Norway', 2020, 'Active'),
      ('eu-innovation-fund', 'European Union', 2024, 'Active')`
  );
  rawDb.run(
    `INSERT INTO facilities (id, country, status) VALUES
      ('302', 'Norway', 'Under construction'),
      ('1461', 'France', 'Planned')`
  );
  rawDb.run(
    `INSERT INTO facility_i18n (facility_id, lang, name) VALUES
      ('302', 'en', 'Hafslund Oslo Celsio'),
      ('1461', 'en', 'VAIA project Montalieu-Vercieu site')`
  );
  rawDb.run(
    `INSERT INTO policy_facility_links (policy_id, facility_id, link_type, confidence, review_status)
     VALUES ('norway-longship', '302', 'country', 0.3, 'draft')`
  );
  fs.writeFileSync(dbPath, rawDb.export());
  rawDb.close();
  return { SQL, dir, dbPath, lockPath, backupDir };
}

function readLinks(SQL, dbPath) {
  const db = new SQL.Database(fs.readFileSync(dbPath));
  try {
    const stmt = db.prepare(
      'SELECT policy_id, facility_id, link_type, confidence, evidence, source_url, review_status, created_at, updated_at FROM policy_facility_links ORDER BY policy_id, facility_id'
    );
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  } finally {
    db.close();
  }
}

test('dry-run leaves DB bytes untouched and --write commits backup + upserts over country link', async () => {
  const { SQL, dir, dbPath, lockPath, backupDir } = await createTempFixtureDb();
  try {
    const inputPath = path.join(dir, 'evidence.json');
    fs.writeFileSync(
      inputPath,
      JSON.stringify({
        as_of: '2026-11-21',
        links: [
          {
            policy_id: 'norway-longship',
            facility_id: '302',
            link_type: 'evidence',
            confidence: 0.95,
            evidence:
              'Gassnova Longship report names Klemetsrud waste-to-energy capture.',
            source_url:
              'https://gassnova.no/app/uploads/2020/11/Gassnova-Developing-Longship-FINAL-1.pdf',
            review_status: 'draft',
            reviewer: null,
          },
          {
            policy_id: 'eu-innovation-fund',
            facility_id: '1461',
            link_type: 'evidence',
            confidence: 0.95,
            evidence:
              'Vicat announced EU Innovation Fund grant award for VAIA.',
            source_url:
              'https://www.vicat.com/en/news/vicat-group-has-officially-been-awarded-innovation-fund-grant-its-vaia-project',
            review_status: 'draft',
            reviewer: null,
          },
        ],
      })
    );

    const beforeBytes = fs.readFileSync(dbPath);
    const beforeSha16 = crypto
      .createHash('sha256')
      .update(beforeBytes)
      .digest('hex')
      .slice(0, 16);

    const drySummary = await runCli(['--file', inputPath], {
      dbPath,
      lockPath,
      backupDir,
    });
    assert.equal(drySummary.dry_run, true);
    assert.equal(drySummary.count, 2);
    assert.deepEqual(fs.readFileSync(dbPath), beforeBytes);
    assert.equal(fs.existsSync(backupDir), false);

    const writeSummary = await runCli(['--file', inputPath, '--write'], {
      dbPath,
      lockPath,
      backupDir,
    });
    assert.equal(writeSummary.dry_run, false);
    assert.equal(writeSummary.changes[0].action, 'update');
    assert.equal(writeSummary.changes[0].previous_link_type, 'country');
    assert.equal(writeSummary.changes[1].action, 'insert');
    assert.equal(writeSummary.changes[1].previous_link_type, null);

    const backupFile = path.join(backupDir, `${beforeSha16}.sqlite`);
    assert.equal(fs.existsSync(backupFile), true);
    assert.deepEqual(fs.readFileSync(backupFile), beforeBytes);

    const links = readLinks(SQL, dbPath);
    assert.equal(links.length, 2);
    assert.equal(links[0].policy_id, 'eu-innovation-fund');
    assert.equal(links[0].link_type, 'evidence');
    assert.equal(links[0].review_status, 'draft');
    assert.equal(links[1].policy_id, 'norway-longship');
    assert.equal(links[1].link_type, 'evidence');
    assert.equal(links[1].confidence, 0.95);
    assert.equal(links[1].review_status, 'draft');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('rejects unknown policy/facility, non-HTTPS URL, empty evidence, invalid confidence, and duplicates', async () => {
  const { SQL, dir, dbPath } = await createTempFixtureDb();
  try {
    const db = new SQL.Database(fs.readFileSync(dbPath));
    try {
      const validItem = {
        policy_id: 'norway-longship',
        facility_id: '302',
        link_type: 'evidence',
        confidence: 0.95,
        evidence: 'Gassnova Longship report names Klemetsrud.',
        source_url: 'https://gassnova.no/en/longship',
        review_status: 'draft',
      };

      assert.throws(
        () =>
          applyRelationshipEvidence(db, {
            as_of: '2026-11-21',
            links: [{ ...validItem, policy_id: 'missing-policy' }],
          }),
        /Unknown policy_id/
      );

      assert.throws(
        () =>
          applyRelationshipEvidence(db, {
            as_of: '2026-11-21',
            links: [{ ...validItem, facility_id: '999999' }],
          }),
        /Unknown facility_id/
      );

      assert.throws(
        () =>
          applyRelationshipEvidence(db, {
            as_of: '2026-11-21',
            links: [
              { ...validItem, source_url: 'http://insecure.example/doc' },
            ],
          }),
        /https/
      );

      assert.throws(
        () =>
          applyRelationshipEvidence(db, {
            as_of: '2026-11-21',
            links: [{ ...validItem, evidence: '   ' }],
          }),
        /non-empty/
      );

      assert.throws(
        () =>
          applyRelationshipEvidence(db, {
            as_of: '2026-11-21',
            links: [{ ...validItem, confidence: 0 }],
          }),
        /confidence/
      );

      assert.throws(
        () =>
          applyRelationshipEvidence(db, {
            as_of: '2026-11-21',
            links: [validItem, validItem],
          }),
        /Duplicate/
      );

      // Verify transaction rolled back completely on failure
      const rows = db.exec(
        'SELECT link_type FROM policy_facility_links WHERE policy_id="norway-longship" AND facility_id="302"'
      )[0].values;
      assert.deepEqual(rows, [['country']]);
    } finally {
      db.close();
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('enforces honest review gating and dbFixRelationships --force preserves evidence links', async () => {
  const { SQL, dir, dbPath } = await createTempFixtureDb();
  try {
    const db = new SqlJsDatabase(SQL, fs.readFileSync(dbPath));
    try {
      const result = applyRelationshipEvidence(db.db, {
        as_of: '2026-11-21',
        links: [
          {
            policy_id: 'norway-longship',
            facility_id: '302',
            link_type: 'evidence',
            confidence: 0.95,
            evidence: 'Verified reviewer missing -> forced draft.',
            source_url: 'https://gassnova.no/en/longship',
            review_status: 'verified',
            reviewer: null,
            reviewed_at: '2026-11-21',
          },
          {
            policy_id: 'eu-innovation-fund',
            facility_id: '1461',
            link_type: 'evidence',
            confidence: 0.98,
            evidence: 'Explicitly reviewed by Gatekeeper.',
            source_url: 'https://www.vicat.com/en/news/vaia',
            review_status: 'verified',
            reviewer: 'Gatekeeper Signoff',
            reviewed_at: '2026-11-21',
          },
        ],
      });

      assert.equal(result[0].review_status, 'draft');
      assert.equal(result[0].forced_draft, true);
      assert.equal(result[1].review_status, 'verified');
      assert.equal(result[1].forced_draft, false);

      await dbFixRelationships(SQL, ['--force'], { db });

      const links = db.all(
        'SELECT policy_id, facility_id, link_type, review_status, evidence FROM policy_facility_links ORDER BY policy_id, facility_id'
      );
      assert.deepEqual(links, [
        {
          policy_id: 'eu-innovation-fund',
          facility_id: '1461',
          link_type: 'evidence',
          review_status: 'verified',
          evidence: 'Explicitly reviewed by Gatekeeper.',
        },
        {
          policy_id: 'norway-longship',
          facility_id: '302',
          link_type: 'evidence',
          review_status: 'draft',
          evidence: 'Verified reviewer missing -> forced draft.',
        },
      ]);
    } finally {
      db.close();
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

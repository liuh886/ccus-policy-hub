import assert from 'node:assert/strict';
import test from 'node:test';
import initSqlJs from 'sql.js';

import { SqlJsDatabase } from '../agent/ccus-ai-agent/logic/db.mjs';
import {
  buildAuditMetadata,
  stampAuditMetadataOnDb,
} from './stamp-audit-metadata.mjs';

test('buildAuditMetadata produces deterministic governed metadata', () => {
  const metadata = buildAuditMetadata({
    date: new Date('2026-07-21T12:34:56.000Z'),
    revision: 'abcdef1234567890',
  });

  assert.equal(metadata.last_audit_date, '2026-07-21');
  assert.equal(metadata.last_audit_rule_version, '2026-07-v1');
  assert.equal(metadata.last_audit_source_revision, 'abcdef1234567890');
  assert.match(metadata.last_audit_summary, /Deep audit passed/);
  assert.match(metadata.last_audit_summary, /2026-07-v1/);
  assert.match(metadata.last_audit_summary, /abcdef1234567890/);
});

test('buildAuditMetadata uses a transparent local revision fallback', () => {
  const metadata = buildAuditMetadata({
    date: new Date('2026-07-21T00:00:00.000Z'),
    revision: '',
  });

  assert.equal(metadata.last_audit_source_revision, 'local-worktree');
  assert.match(metadata.last_audit_summary, /local-worktree/);
});

test('stampAuditMetadataOnDb stamps when last_audit_pass is true and refuses otherwise', async () => {
  const SQL = await initSqlJs();
  const db = new SqlJsDatabase(SQL);
  db.exec('CREATE TABLE db_meta (key TEXT PRIMARY KEY, value TEXT);');
  try {
    assert.throws(
      () => stampAuditMetadataOnDb(db),
      /Refusing to stamp audit metadata/
    );

    db.run(
      "INSERT OR REPLACE INTO db_meta (key, value) VALUES ('last_audit_pass', 'false')"
    );
    assert.throws(
      () => stampAuditMetadataOnDb(db),
      /Refusing to stamp audit metadata/
    );

    db.run(
      "INSERT OR REPLACE INTO db_meta (key, value) VALUES ('last_audit_pass', 'true')"
    );
    const stamped = stampAuditMetadataOnDb(db, {
      date: new Date('2026-07-21T00:00:00.000Z'),
      revision: 'deadbeef1234',
    });
    assert.equal(stamped.last_audit_date, '2026-07-21');
    assert.equal(
      db.get("SELECT value FROM db_meta WHERE key = 'last_audit_date'").value,
      '2026-07-21'
    );
    assert.equal(
      db.get(
        "SELECT value FROM db_meta WHERE key = 'last_audit_source_revision'"
      ).value,
      'deadbeef1234'
    );
  } finally {
    db.close();
  }
});

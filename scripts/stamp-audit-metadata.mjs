#!/usr/bin/env node
/**
 * Persist trustworthy audit metadata after the blocking deep audit succeeds.
 *
 * This script must run only after `db:audit:deep`. It refuses to stamp a
 * database whose last recorded audit did not pass.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(
  __dirname,
  '../agent/ccus-ai-agent/db/ccus_master.sqlite'
);
const AUDIT_RULE_VERSION = '2026-07-v1';

function isoDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function normalizeRevision(value) {
  const revision = String(value || '').trim();
  return revision ? revision.slice(0, 40) : 'local-worktree';
}

export function buildAuditMetadata({
  date = new Date(),
  revision = process.env.GITHUB_SHA,
} = {}) {
  const auditDate = isoDate(date);
  const sourceRevision = normalizeRevision(revision);

  return {
    last_audit_date: auditDate,
    last_audit_rule_version: AUDIT_RULE_VERSION,
    last_audit_source_revision: sourceRevision,
    last_audit_summary:
      `Deep audit passed under ${AUDIT_RULE_VERSION}; ` +
      `policy, facility, regulatory-fill and coordinate-governance gates satisfied; ` +
      `source revision ${sourceRevision}.`,
  };
}

async function stampAuditMetadata() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database not found at: ${DB_PATH}`);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)));
  const passResult = db.exec(
    "SELECT value FROM db_meta WHERE key = 'last_audit_pass' LIMIT 1"
  );
  const lastAuditPassed = passResult[0]?.values?.[0]?.[0] === 'true';

  if (!lastAuditPassed) {
    db.close();
    throw new Error(
      'Refusing to stamp audit metadata because last_audit_pass is not true.'
    );
  }

  const metadata = buildAuditMetadata();
  const statement = db.prepare(
    'INSERT OR REPLACE INTO db_meta (key, value) VALUES (?, ?)'
  );

  for (const [key, value] of Object.entries(metadata)) {
    statement.run([key, value]);
  }
  statement.free();

  const bytes = db.export();
  db.close();
  fs.writeFileSync(DB_PATH, new Uint8Array(bytes));

  console.log(`Audit metadata stamped: ${metadata.last_audit_date}`);
  console.log(`Audit rule version: ${metadata.last_audit_rule_version}`);
  console.log(`Source revision: ${metadata.last_audit_source_revision}`);
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  stampAuditMetadata().catch((error) => {
    console.error(`Failed to stamp audit metadata: ${error.message}`);
    process.exit(1);
  });
}

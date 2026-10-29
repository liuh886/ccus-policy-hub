#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';
import { inspectEvidence, EvidenceError } from './lib/source-evidence.mjs';
import { queryRows } from './lib/sqlite-query.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const proposedSchemaPath = path.join(
  ROOT,
  'agent/ccus-ai-agent/migrations/2026-10-source-evidence/proposed-schema.sql'
);

export function loadEvidencePacket(file) {
  file = file instanceof URL ? fileURLToPath(file) : file;
  const input = JSON.parse(fs.readFileSync(file, 'utf8'));
  // The raw file is deliberately a fixed sibling, never an input-controlled path.
  const raw = fs.readFileSync(path.join(path.dirname(file), 'source.html'));
  return { input, raw };
}

// Proposal preparation only. A fresh in-memory clone receives the DDL and is
// closed without export. There is intentionally no --write option in this PR.
export function stageEvidenceCandidate(db, input, raw) {
  const result = inspectEvidence(input, raw);
  if (
    input.review.status !== 'draft' ||
    input.anchors.some((a) => a.review.status !== 'draft')
  )
    throw new EvidenceError(
      'REVIEW_PROMOTION_FORBIDDEN',
      'Candidate staging accepts draft evidence only.'
    );
  db.run('PRAGMA foreign_keys=ON');
  db.run('BEGIN');
  try {
    db.run(fs.readFileSync(proposedSchemaPath, 'utf8'));
    const old = queryRows(db, 'SELECT * FROM source_documents WHERE id=?', [
      input.document_id,
    ])[0];
    if (
      old &&
      (old.policy_id !== input.policy_id ||
        old.source_url !== input.source_url ||
        old.title_en !== input.title.en ||
        old.title_zh !== input.title.zh)
    )
      throw new EvidenceError(
        'DOCUMENT_ID_CONFLICT',
        'The document ID already denotes different metadata.'
      );
    db.run('INSERT OR IGNORE INTO source_documents VALUES (?,?,?,?,?,?)', [
      input.document_id,
      input.policy_id,
      input.title.en,
      input.title.zh,
      input.source_url,
      'en',
    ]);
    const versionKey = [
      input.document_id,
      input.raw_sha256,
      input.extractor_version,
    ];
    const previous = queryRows(
      db,
      'SELECT normalized_sha256, normalized_text FROM source_document_versions WHERE document_id=? AND raw_sha256=? AND extractor_version=?',
      versionKey
    )[0];
    if (
      previous &&
      (previous.normalized_sha256 !== input.normalized_sha256 ||
        previous.normalized_text !== result.normalized_text)
    )
      throw new EvidenceError(
        'VERSION_CONFLICT',
        'A pinned version cannot be replaced.'
      );
    db.run(
      `INSERT OR IGNORE INTO source_document_versions
      (document_id,raw_sha256,extractor_version,normalized_sha256,raw_content,normalized_text,edition,fetched_at,published_at,source_current_through)
      VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        ...versionKey,
        input.normalized_sha256,
        raw,
        result.normalized_text,
        input.edition,
        input.fetched_at,
        input.published_at,
        input.source_current_through,
      ]
    );
    for (const anchor of result.anchors) {
      const previousAnchor = queryRows(
        db,
        'SELECT locator,exact_quote,start_offset,end_offset FROM source_document_anchors WHERE document_id=? AND raw_sha256=? AND extractor_version=? AND anchor_id=?',
        [...versionKey, anchor.id]
      )[0];
      if (
        previousAnchor &&
        (previousAnchor.locator !== anchor.locator ||
          previousAnchor.exact_quote !== anchor.exact_quote ||
          previousAnchor.start_offset !== anchor.start_offset ||
          previousAnchor.end_offset !== anchor.end_offset)
      )
        throw new EvidenceError(
          'ANCHOR_CONFLICT',
          'A pinned anchor cannot be replaced.'
        );
      db.run(
        `INSERT OR IGNORE INTO source_document_anchors
        (document_id,raw_sha256,extractor_version,anchor_id,locator,exact_quote,start_offset,end_offset)
        VALUES (?,?,?,?,?,?,?,?)`,
        [
          ...versionKey,
          anchor.id,
          anchor.locator,
          anchor.exact_quote,
          anchor.start_offset,
          anchor.end_offset,
        ]
      );
    }
    if (queryRows(db, 'PRAGMA foreign_key_check').length)
      throw new EvidenceError(
        'FOREIGN_KEY_VIOLATION',
        'The candidate breaks database integrity.'
      );
    db.run('COMMIT');
    return result;
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
}

export async function previewEvidenceMigration(dbPath, input, raw) {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(dbPath));
  try {
    const tables = () =>
      queryRows(
        db,
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      ).map((row) => row.name);
    const before = tables();
    stageEvidenceCandidate(db, input, raw);
    const added = tables().filter((name) => !before.includes(name));
    const foreignKeys = queryRows(db, 'PRAGMA foreign_key_check');
    const candidateRows = Object.fromEntries(
      [
        'source_documents',
        'source_document_versions',
        'source_document_anchors',
      ].map((name) => [
        name,
        queryRows(db, `SELECT COUNT(*) AS n FROM ${name}`)[0].n,
      ])
    );
    return {
      dry_run: true,
      schema_approval_required: true,
      added_tables: added,
      candidate_table_rows: candidateRows,
      condition_drafts_persisted: false,
      foreign_key_violations: foreignKeys.length,
      source_database_written: false,
    };
  } finally {
    db.close();
  }
}

export function parseEvidenceArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--preview-migration') options.preview = true;
    else if (['--file', '--observed-file'].includes(arg)) {
      if (!args[i + 1] || args[i + 1].startsWith('--'))
        throw new EvidenceError('INVALID_ARGUMENT', `${arg} requires a file.`);
      options[arg === '--file' ? 'file' : 'observed'] = args[++i];
    } else
      throw new EvidenceError(
        'INVALID_ARGUMENT',
        `Unsupported argument: ${arg}`
      );
  }
  if (!options.file || (options.observed && options.preview))
    throw new EvidenceError(
      'INVALID_ARGUMENT',
      'Use --file <packet.json>; observations and migration preview are separate operations.'
    );
  return options;
}

async function main() {
  const options = parseEvidenceArgs(process.argv.slice(2));
  const { input, raw } = loadEvidencePacket(path.resolve(options.file));
  const result = inspectEvidence(
    input,
    raw,
    options.observed ? { observedRaw: fs.readFileSync(options.observed) } : {}
  );
  const { normalized_text: text, ...report } = result;
  report.normalized_characters = text.length;
  if (options.preview)
    report.migration = await previewEvidenceMigration(
      path.join(ROOT, 'agent/ccus-ai-agent/db/ccus_master.sqlite'),
      input,
      raw
    );
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error) => {
    process.stderr.write(
      JSON.stringify({
        error: {
          code: error.code || 'EVIDENCE_INSPECTION_FAILED',
          message: error.message,
        },
      }) + '\n'
    );
    process.exitCode = 1;
  });

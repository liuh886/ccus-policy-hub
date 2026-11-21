#!/usr/bin/env node
// Governed importer for direct policy-facility `evidence` links.
// Default is a dry run; `--write` commits atomically under DB lock + backup.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';
import { z } from 'astro/zod';
import { acquireDbLock, atomicWriteDb } from './lib/db-write.mjs';
import { queryRows } from './lib/sqlite-query.mjs';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const RelationshipEvidenceLinkSchema = z.object({
  policy_id: z.string().trim().min(1, 'policy_id must be a non-empty string'),
  facility_id: z
    .string()
    .trim()
    .min(1, 'facility_id must be a non-empty string'),
  link_type: z.literal('evidence'),
  confidence: z
    .number()
    .finite()
    .gt(0, 'confidence must be > 0')
    .max(1, 'confidence must be <= 1'),
  evidence: z.string().trim().min(1, 'evidence must be a non-empty string'),
  source_url: z
    .string()
    .trim()
    .refine(
      (value) => {
        try {
          const parsed = new URL(value);
          return parsed.protocol === 'https:' && Boolean(parsed.hostname);
        } catch {
          return false;
        }
      },
      { message: 'source_url must be a valid https:// URL' }
    ),
  review_status: z.enum(['draft', 'verified']).optional().default('draft'),
  reviewer: z.string().trim().nullable().optional(),
  reviewed_at: z
    .union([z.string().trim().regex(DATE_RE), z.literal(''), z.null()])
    .optional(),
});

export const RelationshipEvidenceInputSchema = z.object({
  as_of: z.string().regex(DATE_RE, 'as_of must be YYYY-MM-DD'),
  links: z
    .array(RelationshipEvidenceLinkSchema)
    .min(1, 'links must contain at least one entry'),
});

export function resolveEffectiveReviewStatus(item) {
  const hasReviewer =
    typeof item.reviewer === 'string' && item.reviewer.trim().length > 0;
  const hasReviewedAt =
    typeof item.reviewed_at === 'string' &&
    DATE_RE.test(item.reviewed_at.trim());
  if (item.review_status === 'verified' && hasReviewer && hasReviewedAt) {
    return 'verified';
  }
  return 'draft';
}

export function validateRelationshipEvidenceInput(rawInput) {
  const parsed = RelationshipEvidenceInputSchema.parse(rawInput);
  const seen = new Set();
  for (const link of parsed.links) {
    const key = `${link.policy_id}\0${link.facility_id}`;
    if (seen.has(key)) {
      throw new Error(
        `Duplicate (policy_id, facility_id) entry: ${link.policy_id} <-> ${link.facility_id}`
      );
    }
    seen.add(key);
  }
  return parsed;
}

export function applyRelationshipEvidence(db, rawInput) {
  const input = validateRelationshipEvidenceInput(rawInput);
  const changes = [];

  db.run('PRAGMA foreign_keys = ON');
  db.run('BEGIN');
  try {
    for (const item of input.links) {
      const policyExists = queryRows(db, 'SELECT id FROM policies WHERE id=?', [
        item.policy_id,
      ]).length;
      if (!policyExists) {
        throw new Error(`Unknown policy_id: ${item.policy_id}`);
      }

      const facilityExists = queryRows(
        db,
        'SELECT id FROM facilities WHERE id=?',
        [item.facility_id]
      ).length;
      if (!facilityExists) {
        throw new Error(`Unknown facility_id: ${item.facility_id}`);
      }

      const existing = queryRows(
        db,
        'SELECT link_type, review_status FROM policy_facility_links WHERE policy_id=? AND facility_id=?',
        [item.policy_id, item.facility_id]
      )[0];

      const effectiveReviewStatus = resolveEffectiveReviewStatus(item);
      const forcedDraft =
        item.review_status === 'verified' && effectiveReviewStatus === 'draft';

      db.run(
        `INSERT INTO policy_facility_links (
          policy_id, facility_id, link_type, confidence, evidence, source_url, review_status, created_at, updated_at
        ) VALUES (?, ?, 'evidence', ?, ?, ?, ?, ?, ?)
        ON CONFLICT(policy_id, facility_id) DO UPDATE SET
          link_type = 'evidence',
          confidence = excluded.confidence,
          evidence = excluded.evidence,
          source_url = excluded.source_url,
          review_status = excluded.review_status,
          updated_at = excluded.updated_at`,
        [
          item.policy_id,
          item.facility_id,
          item.confidence,
          item.evidence.trim(),
          item.source_url.trim(),
          effectiveReviewStatus,
          input.as_of,
          input.as_of,
        ]
      );

      changes.push({
        policy_id: item.policy_id,
        facility_id: item.facility_id,
        action: existing ? 'update' : 'insert',
        previous_link_type: existing ? existing.link_type : null,
        requested_review_status: item.review_status,
        review_status: effectiveReviewStatus,
        forced_draft: forcedDraft,
        confidence: item.confidence,
        source_url: item.source_url.trim(),
      });
    }
    db.run('COMMIT');
    return changes;
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
}

export async function runCli(
  args = process.argv.slice(2),
  {
    dbPath = path.resolve('agent/ccus-ai-agent/db/ccus_master.sqlite'),
    lockPath,
    backupDir = path.join(os.homedir(), '.codex', 'backups', 'ccus-policy-hub'),
  } = {}
) {
  const fileIndex = args.indexOf('--file');
  if (fileIndex < 0 || !args[fileIndex + 1]) {
    throw new Error('--file <evidence JSON> required');
  }
  const write = args.includes('--write');
  const input = JSON.parse(fs.readFileSync(args[fileIndex + 1], 'utf8'));
  const release = acquireDbLock(lockPath);
  try {
    const bytes = fs.readFileSync(dbPath);
    const SQL = await initSqlJs();
    // Pass a defensive copy so sql.js MEMFS writes cannot mutate `bytes` before backup.
    const db = new SQL.Database(new Uint8Array(bytes));
    try {
      const changes = applyRelationshipEvidence(db, input);
      const summary = {
        dry_run: !write,
        count: changes.length,
        changes,
      };
      console.log(JSON.stringify(summary, null, 2));
      if (write) {
        const sha = crypto
          .createHash('sha256')
          .update(bytes)
          .digest('hex')
          .slice(0, 16);
        const backup = path.join(backupDir, `${sha}.sqlite`);
        fs.mkdirSync(path.dirname(backup), { recursive: true });
        if (!fs.existsSync(backup)) fs.writeFileSync(backup, bytes);
        atomicWriteDb(dbPath, db.export());
        console.log(`Backup: ${backup}`);
      }
      return summary;
    } finally {
      db.close();
    }
  } finally {
    release();
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  runCli().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

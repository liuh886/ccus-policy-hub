#!/usr/bin/env node
// Explicit, reviewable patch input. Default is a dry run; writes are atomic,
// locked and backed up. Never executes SQL from the input file.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';
import { acquireDbLock, atomicWriteDb } from './lib/db-write.mjs';
import { queryRows } from './lib/sqlite-query.mjs';

export const localizationSchema = `CREATE TABLE IF NOT EXISTS policy_analysis_i18n (
  policy_id TEXT NOT NULL, dimension TEXT NOT NULL, lang TEXT NOT NULL CHECK(lang IN ('zh')),
  label TEXT NOT NULL, evidence TEXT NOT NULL, source_evidence TEXT NOT NULL,
  reviewed_at TEXT NOT NULL,
  PRIMARY KEY(policy_id, dimension, lang),
  FOREIGN KEY(policy_id, dimension) REFERENCES policy_analysis(policy_id, dimension) ON DELETE CASCADE
)`;

export function applyPolicyReview(db, input) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.as_of))
    throw new Error('as_of required');
  const changes = [];
  db.run('PRAGMA foreign_keys = ON');
  db.run('BEGIN');
  try {
    db.run(localizationSchema);
    for (const patch of input.policies) {
      if (
        !queryRows(db, 'SELECT id FROM policies WHERE id=?', [patch.id]).length
      )
        throw new Error(`Unknown policy ${patch.id}`);
      if (
        !patch.sources?.length ||
        patch.sources.some((s) => !/^https:\/\//.test(s.url) || !s.finding)
      )
        throw new Error(`Sources required: ${patch.id}`);
      const allowedPolicy = [
        'url',
        'source',
        'review_status',
        'pub_date',
        'year',
        'legal_weight',
      ];
      for (const [key, value] of Object.entries(patch.record || {})) {
        if (!allowedPolicy.includes(key))
          throw new Error(`Unsupported policy field ${key}`);
        db.run(`UPDATE policies SET ${key}=? WHERE id=?`, [value, patch.id]);
      }
      for (const [lang, fields] of Object.entries(patch.locales || {})) {
        if (!['en', 'zh'].includes(lang)) throw new Error('Invalid locale');
        for (const [key, value] of Object.entries(fields)) {
          if (
            ![
              'title',
              'description',
              'scope',
              'tags_json',
              'impact_analysis_json',
              'interpretation',
              'evolution_json',
              'regulatory_json',
            ].includes(key)
          )
            throw new Error(`Unsupported locale field ${key}`);
          db.run(
            `UPDATE policy_i18n SET ${key}=? WHERE policy_id=? AND lang=?`,
            [
              typeof value === 'object' ? JSON.stringify(value) : value,
              patch.id,
              lang,
            ]
          );
        }
      }
      for (const [dimension, item] of Object.entries(patch.analysis || {})) {
        // Numerical scores are excluded. Descriptive labels may be corrected
        // with their evidence, e.g. removing an unsupported subsidy amount.
        db.run(
          'UPDATE policy_analysis SET evidence=?, citation=?, audit_note=? WHERE policy_id=? AND dimension=?',
          [
            item.en,
            item.citation,
            `Source text reviewed ${input.as_of}; score unchanged.`,
            patch.id,
            dimension,
          ]
        );
        if (!db.getRowsModified())
          throw new Error(`Unknown dimension ${dimension}`);
        if (item.label_en)
          db.run(
            'UPDATE policy_analysis SET label=? WHERE policy_id=? AND dimension=?',
            [item.label_en, patch.id, dimension]
          );
        db.run(
          `INSERT INTO policy_analysis_i18n VALUES (?, ?, 'zh', ?, ?, ?, ?)
          ON CONFLICT(policy_id,dimension,lang) DO UPDATE SET label=excluded.label,
          evidence=excluded.evidence, source_evidence=excluded.source_evidence, reviewed_at=excluded.reviewed_at`,
          [patch.id, dimension, item.label_zh, item.zh, item.en, input.as_of]
        );
      }
      if (patch.source_reviewed === true) {
        db.run('UPDATE policies SET provenance_last_audit_date=? WHERE id=?', [
          input.as_of,
          patch.id,
        ]);
      }
      db.run(
        `INSERT INTO db_meta(key,value) VALUES (?,?)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
        [
          `policy_review_attempt:${patch.id}`,
          JSON.stringify({
            reviewed_at: input.as_of,
            source_reviewed: patch.source_reviewed === true,
            disposition:
              patch.review_disposition ||
              (patch.source_reviewed === true
                ? 'source_reviewed'
                : 'editorial_only'),
            note:
              patch.review_note ||
              (patch.source_reviewed === true
                ? 'Bilingual text corrected against cited primary sources; canonical scores retained.'
                : 'Editorial structuring only; factual sources not reverified.'),
            sources: patch.sources,
          }),
        ]
      );
      changes.push({
        id: patch.id,
        sources: patch.sources.length,
        translated_dimensions: Object.keys(patch.analysis || {}).length,
      });
    }
    db.run('COMMIT');
    return changes;
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const fileIndex = args.indexOf('--file');
  if (fileIndex < 0) throw new Error('--file <reviewed JSON> required');
  const dbPath = path.resolve('agent/ccus-ai-agent/db/ccus_master.sqlite');
  const input = JSON.parse(fs.readFileSync(args[fileIndex + 1], 'utf8'));
  const release = acquireDbLock();
  try {
    const bytes = fs.readFileSync(dbPath);
    const SQL = await initSqlJs();
    const db = new SQL.Database(bytes);
    const changes = applyPolicyReview(db, input);
    console.log(
      JSON.stringify({ dry_run: !args.includes('--write'), changes }, null, 2)
    );
    if (args.includes('--write')) {
      const sha = crypto
        .createHash('sha256')
        .update(bytes)
        .digest('hex')
        .slice(0, 16);
      const backup = path.join(
        os.homedir(),
        '.codex',
        'backups',
        'ccus-policy-hub',
        `${sha}.sqlite`
      );
      fs.mkdirSync(path.dirname(backup), { recursive: true });
      if (!fs.existsSync(backup)) fs.writeFileSync(backup, bytes);
      atomicWriteDb(dbPath, db.export());
      console.log(`Backup: ${backup}`);
    }
    db.close();
  } finally {
    release();
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

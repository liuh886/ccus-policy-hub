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

const REQUIRED_INSERT_RECORD_FIELDS = [
  'country',
  'year',
  'status',
  'category',
  'legal_weight',
  'source',
  'url',
  'pub_date',
];
const ALLOWED_POLICY_UPDATE_FIELDS = [
  'url',
  'source',
  'review_status',
  'pub_date',
  'year',
  'legal_weight',
];
const ALLOWED_LOCALE_FIELDS = [
  'title',
  'description',
  'scope',
  'tags_json',
  'impact_analysis_json',
  'interpretation',
  'evolution_json',
  'regulatory_json',
];
const REQUIRED_INSERT_LOCALE_FIELDS = ['title', 'description', 'scope'];
const STANDARD_DIMENSIONS = [
  'incentive',
  'market',
  'mrv',
  'statutory',
  'strategic',
];
const DEFAULT_DIMENSION_LABELS = {
  incentive: { en: 'Economic', zh: '经济激励' },
  market: { en: 'Market', zh: '市场机制' },
  mrv: { en: 'Technical', zh: '技术规范' },
  statutory: { en: 'Statutory', zh: '法律监管' },
  strategic: { en: 'Strategic', zh: '战略引导' },
};

function requireNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function loadDimensionLabels(db) {
  const labels = new Map(
    Object.entries(DEFAULT_DIMENSION_LABELS).map(([k, v]) => [k, { ...v }])
  );
  const hasTable = queryRows(
    db,
    "SELECT name FROM sqlite_master WHERE type='table' AND name='ui_dimension'"
  ).length;
  if (hasTable) {
    for (const row of queryRows(
      db,
      'SELECT key, label_en, label_zh FROM ui_dimension'
    )) {
      labels.set(row.key, { en: row.label_en, zh: row.label_zh });
    }
  }
  return labels;
}

function loadAllowedEnumValues(db, tableName) {
  const hasTable = queryRows(
    db,
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
    [tableName]
  ).length;
  if (!hasTable) return null;
  const rows = queryRows(db, `SELECT key FROM ${tableName}`);
  return rows.length > 0 ? new Set(rows.map((r) => r.key)) : null;
}

function serializeLocaleValue(value) {
  if (value === undefined || value === null) return null;
  return typeof value === 'object' ? JSON.stringify(value) : value;
}

function insertPolicyRecord(db, patch, input, dimensionLabels) {
  const id = requireNonEmptyString(patch.id, 'patch.id');
  const record = patch.record;
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error(`record object required for insert: ${id}`);
  }
  const allowedInsertRecordKeys = new Set([
    ...REQUIRED_INSERT_RECORD_FIELDS,
    'review_status',
  ]);
  for (const key of Object.keys(record)) {
    if (!allowedInsertRecordKeys.has(key)) {
      throw new Error(`Unsupported policy field ${key}`);
    }
  }
  for (const field of REQUIRED_INSERT_RECORD_FIELDS) {
    if (record[field] === undefined || record[field] === null) {
      throw new Error(`Missing required record.${field} for insert: ${id}`);
    }
  }
  const country = requireNonEmptyString(
    record.country,
    `record.country (${id})`
  );
  if (
    !Number.isInteger(record.year) ||
    record.year < 1900 ||
    record.year > 2100
  ) {
    throw new Error(`Invalid record.year for insert: ${id}`);
  }
  const status = requireNonEmptyString(record.status, `record.status (${id})`);
  const category = requireNonEmptyString(
    record.category,
    `record.category (${id})`
  );
  const allowedStatuses = loadAllowedEnumValues(db, 'ui_status');
  if (allowedStatuses && !allowedStatuses.has(status)) {
    throw new Error(`Invalid record.status "${status}" for insert: ${id}`);
  }
  const allowedCategories = loadAllowedEnumValues(db, 'ui_category');
  if (allowedCategories && !allowedCategories.has(category)) {
    throw new Error(`Invalid record.category "${category}" for insert: ${id}`);
  }
  const legalWeight = requireNonEmptyString(
    record.legal_weight,
    `record.legal_weight (${id})`
  );
  const source = requireNonEmptyString(record.source, `record.source (${id})`);
  const url = requireNonEmptyString(record.url, `record.url (${id})`);
  if (!/^https?:\/\//.test(url)) {
    throw new Error(`Invalid record.url for insert: ${id}`);
  }
  const pubDate = requireNonEmptyString(
    record.pub_date,
    `record.pub_date (${id})`
  );
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pubDate)) {
    throw new Error(`Invalid record.pub_date (YYYY-MM-DD) for insert: ${id}`);
  }

  const locales = patch.locales;
  if (!locales || typeof locales !== 'object' || Array.isArray(locales)) {
    throw new Error(`locales.en and locales.zh required for insert: ${id}`);
  }
  for (const lang of Object.keys(locales)) {
    if (!['en', 'zh'].includes(lang)) throw new Error('Invalid locale');
  }
  for (const lang of ['en', 'zh']) {
    const fields = locales[lang];
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
      throw new Error(`locales.${lang} required for insert: ${id}`);
    }
    for (const key of Object.keys(fields)) {
      if (!ALLOWED_LOCALE_FIELDS.includes(key)) {
        throw new Error(`Unsupported locale field ${key}`);
      }
    }
    for (const reqField of REQUIRED_INSERT_LOCALE_FIELDS) {
      requireNonEmptyString(
        fields[reqField],
        `locales.${lang}.${reqField} (${id})`
      );
    }
  }

  const analysis = patch.analysis;
  if (!analysis || typeof analysis !== 'object' || Array.isArray(analysis)) {
    throw new Error(`analysis required for insert: ${id}`);
  }
  for (const dim of Object.keys(analysis)) {
    if (!STANDARD_DIMENSIONS.includes(dim)) {
      throw new Error(`Unknown dimension ${dim}`);
    }
  }
  for (const dim of STANDARD_DIMENSIONS) {
    if (!analysis[dim] || typeof analysis[dim] !== 'object') {
      throw new Error(`Missing required analysis dimension ${dim} for ${id}`);
    }
  }
  for (const [dimension, item] of Object.entries(analysis)) {
    if (!Number.isInteger(item.score) || item.score < 0 || item.score > 100) {
      throw new Error(
        `analysis.${dimension}.score must be an integer 0-100 for ${id}`
      );
    }
    requireNonEmptyString(item.en, `analysis.${dimension}.en (${id})`);
    requireNonEmptyString(
      item.citation,
      `analysis.${dimension}.citation (${id})`
    );
    if (item.zh !== undefined && item.zh !== null) {
      requireNonEmptyString(item.zh, `analysis.${dimension}.zh (${id})`);
    }
  }

  const sourceReviewed = patch.source_reviewed === true;
  const reviewer =
    typeof patch.reviewer === 'string' ? patch.reviewer.trim() : '';
  const requestedVerified = record.review_status === 'verified';
  const reviewStatus =
    requestedVerified && sourceReviewed && reviewer.length > 0
      ? 'verified'
      : 'draft';
  const provenanceAuthor =
    (typeof patch.author === 'string' && patch.author.trim()) ||
    reviewer ||
    'policy-review-ingest';
  const provenanceReviewer =
    sourceReviewed && reviewer.length > 0 ? reviewer : null;
  const provenanceLastAuditDate = sourceReviewed ? input.as_of : null;

  db.run(
    `INSERT INTO policies (
      id, country, year, status, category, review_status, legal_weight,
      source, url, pub_date, provenance_author, provenance_reviewer, provenance_last_audit_date
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      country,
      record.year,
      status,
      category,
      reviewStatus,
      legalWeight,
      source,
      url,
      pubDate,
      provenanceAuthor,
      provenanceReviewer,
      provenanceLastAuditDate,
    ]
  );

  for (const lang of ['en', 'zh']) {
    const f = locales[lang];
    db.run(
      `INSERT INTO policy_i18n (
        policy_id, lang, title, description, scope, tags_json,
        impact_analysis_json, interpretation, evolution_json, regulatory_json
      ) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        lang,
        f.title.trim(),
        f.description.trim(),
        f.scope.trim(),
        serializeLocaleValue(f.tags_json),
        serializeLocaleValue(f.impact_analysis_json),
        serializeLocaleValue(f.interpretation),
        serializeLocaleValue(f.evolution_json),
        serializeLocaleValue(f.regulatory_json),
      ]
    );
  }

  let translatedDimensions = 0;
  for (const [dimension, item] of Object.entries(analysis)) {
    const dimLabels = dimensionLabels.get(dimension) || {
      en: dimension,
      zh: dimension,
    };
    const labelEn =
      typeof item.label_en === 'string' && item.label_en.trim()
        ? item.label_en.trim()
        : dimLabels.en;
    const auditNote = sourceReviewed
      ? `Source text reviewed ${input.as_of}; initial governed insert.`
      : `Draft insert ${input.as_of}; primary source unverified.`;

    db.run(
      `INSERT INTO policy_analysis (
        policy_id, dimension, score, label, evidence, citation, audit_note
      ) VALUES (?,?,?,?,?,?,?)`,
      [
        id,
        dimension,
        item.score,
        labelEn,
        item.en.trim(),
        item.citation.trim(),
        auditNote,
      ]
    );

    if (typeof item.zh === 'string' && item.zh.trim().length > 0) {
      const labelZh =
        typeof item.label_zh === 'string' && item.label_zh.trim()
          ? item.label_zh.trim()
          : dimLabels.zh;
      db.run(
        `INSERT INTO policy_analysis_i18n VALUES (?, ?, 'zh', ?, ?, ?, ?)`,
        [id, dimension, labelZh, item.zh.trim(), item.en.trim(), input.as_of]
      );
      translatedDimensions++;
    }
  }

  return { reviewStatus, translatedDimensions };
}

export function applyPolicyReview(db, input, { allowInsert = false } = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.as_of))
    throw new Error('as_of required');
  const changes = [];
  db.run('PRAGMA foreign_keys = ON');
  db.run('BEGIN');
  try {
    db.run(localizationSchema);
    const dimensionLabels = loadDimensionLabels(db);
    for (const patch of input.policies) {
      if (
        !patch.sources?.length ||
        patch.sources.some((s) => !/^https:\/\//.test(s.url) || !s.finding)
      )
        throw new Error(`Sources required: ${patch.id}`);

      const exists = queryRows(db, 'SELECT id FROM policies WHERE id=?', [
        patch.id,
      ]).length;

      if (!exists) {
        if (!allowInsert) throw new Error(`Unknown policy ${patch.id}`);
        const inserted = insertPolicyRecord(db, patch, input, dimensionLabels);
        db.run(
          `INSERT INTO db_meta(key,value) VALUES (?,?)
          ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
          [
            `policy_review_attempt:${patch.id}`,
            JSON.stringify({
              reviewed_at: input.as_of,
              source_reviewed: patch.source_reviewed === true,
              reviewer:
                typeof patch.reviewer === 'string' && patch.reviewer.trim()
                  ? patch.reviewer.trim()
                  : null,
              disposition:
                patch.review_disposition ||
                (inserted.reviewStatus === 'verified'
                  ? 'insert_verified'
                  : 'insert_draft'),
              note:
                patch.review_note ||
                (inserted.reviewStatus === 'verified'
                  ? 'New policy inserted after primary-source review.'
                  : 'New policy inserted as draft pending full verification.'),
              sources: patch.sources,
            }),
          ]
        );
        changes.push({
          id: patch.id,
          action: 'insert',
          review_status: inserted.reviewStatus,
          sources: patch.sources.length,
          translated_dimensions: inserted.translatedDimensions,
        });
        continue;
      }

      for (const [key, value] of Object.entries(patch.record || {})) {
        if (!ALLOWED_POLICY_UPDATE_FIELDS.includes(key))
          throw new Error(`Unsupported policy field ${key}`);
        db.run(`UPDATE policies SET ${key}=? WHERE id=?`, [value, patch.id]);
      }
      for (const [lang, fields] of Object.entries(patch.locales || {})) {
        if (!['en', 'zh'].includes(lang)) throw new Error('Invalid locale');
        for (const [key, value] of Object.entries(fields)) {
          if (!ALLOWED_LOCALE_FIELDS.includes(key))
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
        // Numerical scores are excluded on existing policies. Canonical
        // evidence, citation, label and audit_note are only updated when
        // primary sources were reviewed.
        if (item.score !== undefined) {
          throw new Error(
            `Cannot modify score for existing policy ${patch.id}.${dimension}`
          );
        }
        const existing = queryRows(
          db,
          'SELECT evidence FROM policy_analysis WHERE policy_id=? AND dimension=?',
          [patch.id, dimension]
        )[0];
        if (!existing) throw new Error(`Unknown dimension ${dimension}`);

        const sourceReviewed = patch.source_reviewed === true;
        const sourceEvidence = sourceReviewed
          ? item.en
          : (item.en ?? existing.evidence);

        if (sourceReviewed) {
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
          if (item.label_en)
            db.run(
              'UPDATE policy_analysis SET label=? WHERE policy_id=? AND dimension=?',
              [item.label_en, patch.id, dimension]
            );
        } else if (item.en !== undefined && item.en !== existing.evidence) {
          throw new Error(
            `Cannot modify canonical evidence for ${patch.id}.${dimension} without source_reviewed: true`
          );
        }

        db.run(
          `INSERT INTO policy_analysis_i18n VALUES (?, ?, 'zh', ?, ?, ?, ?)
          ON CONFLICT(policy_id,dimension,lang) DO UPDATE SET label=excluded.label,
          evidence=excluded.evidence, source_evidence=excluded.source_evidence, reviewed_at=excluded.reviewed_at`,
          [
            patch.id,
            dimension,
            item.label_zh,
            item.zh,
            sourceEvidence,
            input.as_of,
          ]
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
  const allowInsert = args.includes('--allow-insert');
  const dbPath = path.resolve('agent/ccus-ai-agent/db/ccus_master.sqlite');
  const input = JSON.parse(fs.readFileSync(args[fileIndex + 1], 'utf8'));
  const release = acquireDbLock();
  try {
    const bytes = fs.readFileSync(dbPath);
    const SQL = await initSqlJs();
    const db = new SQL.Database(bytes);
    const changes = applyPolicyReview(db, input, { allowInsert });
    console.log(
      JSON.stringify(
        {
          dry_run: !args.includes('--write'),
          allow_insert: allowInsert,
          changes,
        },
        null,
        2
      )
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

#!/usr/bin/env node
/**
 * Verify that policy Markdown and public JSON are faithful projections of the
 * SQLite single source of truth.
 *
 * This audit intentionally ignores facilities and coordinates. It checks only
 * policy records and their policy-owned relationships.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_PATHS = {
  dbPath: path.join(ROOT, 'agent/ccus-ai-agent/db/ccus_master.sqlite'),
  enDir: path.join(ROOT, 'src/content/policies/en'),
  zhDir: path.join(ROOT, 'src/content/policies/zh'),
  publicPath: path.join(ROOT, 'public/data/policies.json'),
  dictionaryPath: path.join(ROOT, 'src/data/i18n_dictionary.json'),
  reportJsonPath: path.join(ROOT, 'docs/policy-db-consistency-report.json'),
  reportMarkdownPath: path.join(ROOT, 'docs/policy-db-consistency-report.md'),
};

function cleanString(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function queryRows(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  const columns = stmt.getColumnNames();
  while (stmt.step()) {
    const values = stmt.get();
    rows.push(
      Object.fromEntries(
        columns.map((column, index) => [column, values[index]])
      )
    );
  }
  stmt.free();
  return rows;
}

function parseJsonSafe(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function deepClean(value) {
  if (Array.isArray(value)) return value.map(deepClean);
  if (value !== null && typeof value === 'object') {
    const cleaned = {};
    for (const key of Object.keys(value).sort()) {
      const child = deepClean(value[key]);
      if (child !== undefined) cleaned[key] = child;
    }
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }
  return value === null || value === undefined ? undefined : value;
}

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, normalize(value[key])])
    );
  }
  return value;
}

function equalValues(left, right) {
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}

function translate(dictionary, key, domain, lang) {
  if (lang === 'en' || !key) return key;
  if (domain === 'country') {
    for (const [alias, canonical] of Object.entries(
      dictionary.countries || {}
    )) {
      if (canonical === key && /[\u4e00-\u9fa5]/.test(alias)) return alias;
    }
  }
  if (domain === 'status' && dictionary.ui?.status?.[key]?.zh) {
    return dictionary.ui.status[key].zh;
  }
  if (domain === 'category' && dictionary.ui?.categories?.[key]?.zh) {
    return dictionary.ui.categories[key].zh;
  }
  return key;
}

function listMarkdownIds(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory)
    .filter((name) => name.endsWith('.md'))
    .map((name) => name.slice(0, -3))
    .sort();
}

function setDiff(left, right) {
  const rightSet = new Set(right);
  return left.filter((value) => !rightSet.has(value));
}

function loadPolicySnapshot(db) {
  const policies = queryRows(
    db,
    `SELECT id, country, year, status, category, review_status, legal_weight,
            source, url, pub_date, provenance_author, provenance_reviewer,
            provenance_last_audit_date
     FROM policies
     ORDER BY id`
  );

  return policies.map((policy) => {
    const i18nRows = queryRows(
      db,
      `SELECT lang, title, description, scope, tags_json,
              impact_analysis_json, evolution_json, regulatory_json
       FROM policy_i18n
       WHERE policy_id = ?
       ORDER BY lang`,
      [policy.id]
    );
    const analysisRows = queryRows(
      db,
      `SELECT dimension, score, label, evidence, citation, audit_note
       FROM policy_analysis
       WHERE policy_id = ?
       ORDER BY dimension`,
      [policy.id]
    );
    const relatedFacilities = queryRows(
      db,
      `SELECT facility_id
       FROM policy_facility_links
       WHERE policy_id = ?
       ORDER BY facility_id`,
      [policy.id]
    ).map((row) => row.facility_id);

    return {
      ...policy,
      i18n: Object.fromEntries(i18nRows.map((row) => [row.lang, row])),
      analysisRows,
      relatedFacilities,
    };
  });
}

export function expectedMarkdownPolicy(policy, localized, lang, dictionary) {
  const analysis = {};
  for (const row of policy.analysisRows) {
    analysis[row.dimension] = deepClean({
      score: row.score,
      label: row.label,
      evidence: row.evidence,
      citation: row.citation,
      auditNote: row.audit_note,
    });
  }

  return {
    frontmatter: deepClean({
      id: policy.id,
      title: localized.title,
      country: translate(dictionary, policy.country, 'country', lang),
      year: policy.year,
      status: translate(dictionary, policy.status, 'status', lang),
      category: translate(dictionary, policy.category, 'category', lang),
      pubDate: policy.pub_date,
      reviewStatus: policy.review_status,
      legalWeight: policy.legal_weight,
      source: policy.source,
      url: policy.url,
      description: (localized.description || '')
        .substring(0, 500)
        .replace(/\n/g, ' '),
      analysis,
      impactAnalysis: parseJsonSafe(localized.impact_analysis_json, {}),
      evolution: parseJsonSafe(localized.evolution_json, {}),
      regulatory: parseJsonSafe(localized.regulatory_json, {}),
      relatedFacilities: policy.relatedFacilities,
      provenance: {
        author: policy.provenance_author,
        reviewer: policy.provenance_reviewer,
        lastAuditDate: policy.provenance_last_audit_date,
      },
    }),
    body: cleanString(localized.description),
  };
}

export function expectedPublicPolicy(policy) {
  const i18n = {};
  for (const [lang, localized] of Object.entries(policy.i18n)) {
    i18n[lang] = {
      title: localized.title,
      description: localized.description,
      scope: localized.scope,
      tags: parseJsonSafe(localized.tags_json, null),
    };
  }

  const analysis = {};
  for (const row of policy.analysisRows) {
    analysis[row.dimension] = {
      score: row.score,
      label: row.label,
      evidence: row.evidence,
      citation: row.citation,
    };
  }

  return {
    id: policy.id,
    country: policy.country,
    year: policy.year,
    status: policy.status,
    category: policy.category,
    review_status: policy.review_status,
    legal_weight: policy.legal_weight,
    source: policy.source,
    url: policy.url,
    pub_date: policy.pub_date,
    provenance_author: policy.provenance_author,
    provenance_reviewer: policy.provenance_reviewer,
    provenance_last_audit_date: policy.provenance_last_audit_date,
    i18n,
    analysis,
  };
}

function addMismatch(mismatches, mismatch) {
  mismatches.push({
    policy_id: mismatch.policyId || null,
    artifact: mismatch.artifact,
    field: mismatch.field,
    expected: mismatch.expected,
    actual: mismatch.actual,
  });
}

function auditMarkdownPolicy({
  policy,
  lang,
  directory,
  dictionary,
  mismatches,
}) {
  const localized = policy.i18n[lang];
  if (!localized) return;

  const filePath = path.join(directory, `${policy.id}.md`);
  if (!fs.existsSync(filePath)) return;

  const parsed = matter(fs.readFileSync(filePath, 'utf8'));
  const expected = expectedMarkdownPolicy(policy, localized, lang, dictionary);

  if (!equalValues(parsed.data, expected.frontmatter)) {
    addMismatch(mismatches, {
      policyId: policy.id,
      artifact: `markdown:${lang}`,
      field: 'frontmatter',
      expected: expected.frontmatter,
      actual: parsed.data,
    });
  }

  if (cleanString(parsed.content) !== expected.body) {
    addMismatch(mismatches, {
      policyId: policy.id,
      artifact: `markdown:${lang}`,
      field: 'body',
      expected: expected.body,
      actual: cleanString(parsed.content),
    });
  }
}

function renderMarkdownReport(report) {
  const lines = [
    '# Policy DB consistency report',
    '',
    'This report compares policy-owned artifacts with the SQLite single source of truth.',
    'Facilities and coordinates are intentionally outside its scope.',
    '',
    '## Summary',
    '',
    `- SQLite policies: **${report.summary.db_policies}**`,
    `- English policy files: **${report.summary.en_markdown_files}**`,
    `- Chinese policy files: **${report.summary.zh_markdown_files}**`,
    `- Public policy records: **${report.summary.public_records}**`,
    `- Consistency mismatches: **${report.summary.mismatches}**`,
    `- Result: **${report.pass ? 'PASS' : 'FAIL'}**`,
    '',
    '## Rules',
    '',
    '1. SQLite is the only writable source of policy truth.',
    '2. Markdown and public JSON may project fields but may not invent values.',
    '3. Missing provenance or analysis values remain absent or null; export time is not an audit date.',
    '4. Policy IDs and bilingual records must have exact parity across governed artifacts.',
    '5. Facility contents and coordinates are not evaluated or changed by this audit.',
  ];

  if (report.mismatches.length > 0) {
    lines.push('', '## Mismatches', '');
    for (const mismatch of report.mismatches) {
      lines.push(
        `- \`${mismatch.policy_id || 'dataset'}\` · ${mismatch.artifact} · ${mismatch.field}`
      );
    }
  }

  return `${lines.join('\n')}\n`;
}

export async function auditPolicyArtifactConsistency(paths = {}) {
  const resolved = { ...DEFAULT_PATHS, ...paths };
  for (const requiredPath of [
    resolved.dbPath,
    resolved.dictionaryPath,
    resolved.publicPath,
  ]) {
    if (!fs.existsSync(requiredPath)) {
      throw new Error(
        `Required consistency-audit input is missing: ${requiredPath}`
      );
    }
  }

  const dictionary = JSON.parse(
    fs.readFileSync(resolved.dictionaryPath, 'utf8')
  );
  const publicPayload = JSON.parse(
    fs.readFileSync(resolved.publicPath, 'utf8')
  );
  const SQL = await initSqlJs();
  const db = new SQL.Database(new Uint8Array(fs.readFileSync(resolved.dbPath)));
  const policies = loadPolicySnapshot(db);
  db.close();

  const mismatches = [];
  const dbIds = policies.map((policy) => policy.id).sort();
  const enIds = listMarkdownIds(resolved.enDir);
  const zhIds = listMarkdownIds(resolved.zhDir);
  const publicIds = (publicPayload.records || [])
    .map((record) => record.id)
    .sort();

  for (const [artifact, ids] of [
    ['markdown:en', enIds],
    ['markdown:zh', zhIds],
    ['public-json', publicIds],
  ]) {
    for (const missingId of setDiff(dbIds, ids)) {
      addMismatch(mismatches, {
        policyId: missingId,
        artifact,
        field: 'missing_record',
        expected: 'present',
        actual: 'missing',
      });
    }
    for (const orphanId of setDiff(ids, dbIds)) {
      addMismatch(mismatches, {
        policyId: orphanId,
        artifact,
        field: 'orphan_record',
        expected: 'absent',
        actual: 'present',
      });
    }
  }

  const publicById = new Map(
    (publicPayload.records || []).map((record) => [record.id, record])
  );
  for (const policy of policies) {
    auditMarkdownPolicy({
      policy,
      lang: 'en',
      directory: resolved.enDir,
      dictionary,
      mismatches,
    });
    auditMarkdownPolicy({
      policy,
      lang: 'zh',
      directory: resolved.zhDir,
      dictionary,
      mismatches,
    });

    const publicPolicy = publicById.get(policy.id);
    if (publicPolicy) {
      const expected = expectedPublicPolicy(policy);
      if (!equalValues(publicPolicy, expected)) {
        addMismatch(mismatches, {
          policyId: policy.id,
          artifact: 'public-json',
          field: 'record',
          expected,
          actual: publicPolicy,
        });
      }
    }
  }

  if (publicPayload.count !== policies.length) {
    addMismatch(mismatches, {
      artifact: 'public-json',
      field: 'count',
      expected: policies.length,
      actual: publicPayload.count,
    });
  }

  const report = {
    audit_version: '2026-07-v1',
    scope: 'policies-only',
    pass: mismatches.length === 0,
    summary: {
      db_policies: policies.length,
      en_markdown_files: enIds.length,
      zh_markdown_files: zhIds.length,
      public_records: publicIds.length,
      mismatches: mismatches.length,
    },
    mismatches,
  };

  fs.mkdirSync(path.dirname(resolved.reportJsonPath), { recursive: true });
  fs.writeFileSync(
    resolved.reportJsonPath,
    `${JSON.stringify(report, null, 2)}\n`
  );
  fs.writeFileSync(resolved.reportMarkdownPath, renderMarkdownReport(report));

  console.log(JSON.stringify(report.summary, null, 2));
  if (!report.pass) {
    throw new Error(
      `Policy artifact consistency audit failed with ${mismatches.length} mismatch(es).`
    );
  }

  return report;
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  auditPolicyArtifactConsistency().catch((error) => {
    console.error(`Policy consistency audit failed: ${error.message}`);
    process.exit(1);
  });
}

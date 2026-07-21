#!/usr/bin/env node
/**
 * Export policy Markdown only from the SQLite single source of truth.
 *
 * This command intentionally does not read or write facility or coordinate
 * records. It is run after the legacy full Markdown exporter so policy pages
 * cannot inherit export-time fallback provenance or analysis values.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

import { expectedMarkdownPolicy } from './audit-policy-artifact-consistency.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'agent/ccus-ai-agent/db/ccus_master.sqlite');
const DICTIONARY_PATH = path.join(ROOT, 'src/data/i18n_dictionary.json');
const POLICY_ROOT = path.join(ROOT, 'src/content/policies');

function queryRows(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  const columns = stmt.getColumnNames();
  while (stmt.step()) {
    const values = stmt.get();
    rows.push(Object.fromEntries(columns.map((column, index) => [column, values[index]])));
  }
  stmt.free();
  return rows;
}

function loadPolicies(db) {
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

export async function exportPolicyMarkdown({
  dbPath = DB_PATH,
  dictionaryPath = DICTIONARY_PATH,
  policyRoot = POLICY_ROOT,
} = {}) {
  if (!fs.existsSync(dbPath)) throw new Error(`Database not found: ${dbPath}`);
  if (!fs.existsSync(dictionaryPath)) {
    throw new Error(`Translation dictionary not found: ${dictionaryPath}`);
  }

  const dictionary = JSON.parse(fs.readFileSync(dictionaryPath, 'utf8'));
  const SQL = await initSqlJs();
  const db = new SQL.Database(new Uint8Array(fs.readFileSync(dbPath)));
  const policies = loadPolicies(db);
  db.close();

  let written = 0;
  for (const policy of policies) {
    for (const lang of ['en', 'zh']) {
      const localized = policy.i18n[lang];
      if (!localized) continue;
      const projection = expectedMarkdownPolicy(
        policy,
        localized,
        lang,
        dictionary
      );
      const directory = path.join(policyRoot, lang);
      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(
        path.join(directory, `${policy.id}.md`),
        `---\n${JSON.stringify(projection.frontmatter, null, 2)}\n---\n\n${projection.body}\n`
      );
      written += 1;
    }
  }

  const expectedFiles = new Set(
    policies.flatMap((policy) =>
      ['en', 'zh']
        .filter((lang) => policy.i18n[lang])
        .map((lang) => `${lang}/${policy.id}.md`)
    )
  );
  for (const lang of ['en', 'zh']) {
    const directory = path.join(policyRoot, lang);
    if (!fs.existsSync(directory)) continue;
    for (const filename of fs.readdirSync(directory)) {
      if (!filename.endsWith('.md')) continue;
      const relative = `${lang}/${filename}`;
      if (!expectedFiles.has(relative)) {
        fs.unlinkSync(path.join(directory, filename));
      }
    }
  }

  const summary = {
    policies: policies.length,
    markdown_files_written: written,
    facilities_touched: 0,
    coordinates_touched: 0,
  };
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  exportPolicyMarkdown().catch((error) => {
    console.error(`Policy Markdown export failed: ${error.message}`);
    process.exit(1);
  });
}

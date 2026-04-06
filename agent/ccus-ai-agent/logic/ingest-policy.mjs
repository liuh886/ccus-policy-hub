import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../db/ccus_master.sqlite');

/**
 * Generic Policy Ingester (V2.2)
 * Usage: node logic/ingest-policy.mjs --json '{"id": "test-policy", "country": "Norway", ...}'
 */
async function ingest() {
  const args = process.argv.slice(2);
  const jsonArgIdx = args.indexOf('--json');
  const fileArgIdx = args.indexOf('--file');
  let policy;

  if (jsonArgIdx !== -1 && args[jsonArgIdx + 1]) {
    policy = JSON.parse(args[jsonArgIdx + 1]);
  } else if (fileArgIdx !== -1 && args[fileArgIdx + 1]) {
    policy = JSON.parse(fs.readFileSync(args[fileArgIdx + 1], 'utf8'));
  } else {
    console.error("Usage: node logic/ingest-policy.mjs --json '<json_string>' OR --file <path>");
    process.exit(1);
  }
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  const lastAuditDate = new Date().toISOString().split('T')[0];

  db.run("BEGIN TRANSACTION");
  try {
    // 1. Ingest into policies table
    db.run(`INSERT OR REPLACE INTO policies (
      id, country, year, status, category, review_status, 
      legal_weight, source, url, pub_date, 
      provenance_author, provenance_last_audit_date
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, [
      policy.id,
      policy.country || 'Unknown',
      policy.year || null,
      policy.status || 'Active',
      policy.category || 'Regulatory',
      policy.review_status || 'draft',
      policy.legal_weight || null,
      policy.source || null,
      policy.url || null,
      policy.pub_date || lastAuditDate,
      policy.provenance_author || 'CCUS AI Agent',
      lastAuditDate
    ]);

    // 2. Ingest into policy_i18n (English)
    db.run(`INSERT OR REPLACE INTO policy_i18n (
      policy_id, lang, title, description, scope, 
      tags_json, impact_analysis_json, interpretation, 
      evolution_json, regulatory_json
    ) VALUES (?,?,?,?,?,?,?,?,?,?)`, [
      policy.id, 'en',
      policy.en?.title || policy.id,
      policy.en?.description || null,
      policy.en?.scope || 'National',
      JSON.stringify(policy.en?.tags || []),
      JSON.stringify(policy.en?.impact_analysis || {}),
      policy.en?.interpretation || null,
      JSON.stringify(policy.en?.evolution || {}),
      JSON.stringify(policy.en?.regulatory_json || {})
    ]);

    // 3. Ingest into policy_i18n (Chinese)
    db.run(`INSERT OR REPLACE INTO policy_i18n (
      policy_id, lang, title, description, scope, 
      tags_json, impact_analysis_json, interpretation, 
      evolution_json, regulatory_json
    ) VALUES (?,?,?,?,?,?,?,?,?,?)`, [
      policy.id, 'zh',
      policy.zh?.title || policy.en?.title || policy.id,
      policy.zh?.description || policy.en?.description || null,
      policy.zh?.scope || policy.en?.scope || 'National',
      JSON.stringify(policy.zh?.tags || policy.en?.tags || []),
      JSON.stringify(policy.zh?.impact_analysis || policy.en?.impact_analysis || {}),
      policy.zh?.interpretation || policy.en?.interpretation || null,
      JSON.stringify(policy.zh?.evolution || policy.en?.evolution || {}),
      JSON.stringify(policy.zh?.regulatory_json || policy.en?.regulatory_json || {})
    ]);

    // 4. Analysis Scores
    if (policy.analysis) {
      db.run("DELETE FROM policy_analysis WHERE policy_id = ?", [policy.id]);
      for (const [dim, v] of Object.entries(policy.analysis)) {
        db.run(`INSERT INTO policy_analysis (
          policy_id, dimension, score, label, evidence, citation, audit_note
        ) VALUES (?,?,?,?,?,?,?)`, [
          policy.id, dim, v.score || 0, v.label || null, v.evidence || null, v.citation || null, v.audit_note || null
        ]);
      }
    }

    db.run("COMMIT");
    console.log(`Policy '${policy.id}' ingested successfully.`);
  } catch (e) {
    db.run("ROLLBACK");
    console.error(`Failed to ingest policy '${policy.id}':`, e);
    process.exit(1);
  }

  const data = db.export();
  fs.writeFileSync(DB_PATH, new Uint8Array(data));
  db.close();
}

ingest().catch(err => console.error(err));

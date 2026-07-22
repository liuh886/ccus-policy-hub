#!/usr/bin/env node
/**
 * Generate a jurisdiction-by-governance-function policy coverage matrix from
 * a curated framework whose evidence anchors are policy IDs in SQLite.
 *
 * The framework does not infer legal sufficiency from category labels. Human
 * review assigns covered/partial/missing; this audit verifies that every
 * referenced policy exists in the SQLite single source of truth, belongs to an
 * allowed jurisdiction, and is verified when used as evidence for "covered".
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_PATHS = {
  dbPath: path.join(ROOT, 'agent/ccus-ai-agent/db/ccus_master.sqlite'),
  frameworkPath: path.join(
    ROOT,
    'agent/ccus-ai-agent/config/policy-coverage-framework.json'
  ),
  reportJsonPath: path.join(ROOT, 'docs/policy-coverage-matrix.json'),
  reportMarkdownPath: path.join(ROOT, 'docs/policy-coverage-matrix.md'),
};

const VALID_STATUSES = new Set([
  'covered',
  'partial',
  'missing',
  'not_applicable',
]);
const VALID_PRIORITIES = new Set(['high', 'medium', 'low']);

function queryRows(db, sql, params = []) {
  const statement = db.prepare(sql);
  statement.bind(params);
  const columns = statement.getColumnNames();
  const rows = [];
  while (statement.step()) {
    const values = statement.get();
    rows.push(
      Object.fromEntries(
        columns.map((column, index) => [column, values[index]])
      )
    );
  }
  statement.free();
  return rows;
}

function loadPolicies(db) {
  const rows = queryRows(
    db,
    `SELECT p.id, p.country, p.year, p.status, p.category, p.review_status,
            p.legal_weight, p.source, p.url, i.title AS title_en
       FROM policies p
       LEFT JOIN policy_i18n i
         ON i.policy_id = p.id AND i.lang = 'en'
      ORDER BY p.id`
  );
  return new Map(rows.map((row) => [row.id, row]));
}

function validateFrameworkShape(framework) {
  const errors = [];
  const dimensionIds = new Set();

  for (const dimension of framework.dimensions || []) {
    if (!dimension.id || dimensionIds.has(dimension.id)) {
      errors.push(
        `Invalid or duplicate dimension ID: ${dimension.id || '(blank)'}`
      );
    }
    dimensionIds.add(dimension.id);
  }

  const jurisdictionIds = new Set();
  for (const jurisdiction of framework.jurisdictions || []) {
    if (!jurisdiction.id || jurisdictionIds.has(jurisdiction.id)) {
      errors.push(
        `Invalid or duplicate jurisdiction ID: ${jurisdiction.id || '(blank)'}`
      );
    }
    jurisdictionIds.add(jurisdiction.id);

    for (const dimensionId of dimensionIds) {
      if (!jurisdiction.coverage?.[dimensionId]) {
        errors.push(
          `${jurisdiction.id} is missing coverage entry for ${dimensionId}`
        );
      }
    }

    for (const dimensionId of Object.keys(jurisdiction.coverage || {})) {
      if (!dimensionIds.has(dimensionId)) {
        errors.push(
          `${jurisdiction.id} references unknown dimension ${dimensionId}`
        );
      }
    }
  }

  return errors;
}

export function evaluateCoverage(framework, policies) {
  const errors = validateFrameworkShape(framework);
  const cells = [];

  for (const jurisdiction of framework.jurisdictions || []) {
    const allowedCountries = new Set(
      jurisdiction.allowed_policy_countries || []
    );

    for (const dimension of framework.dimensions || []) {
      const entry = jurisdiction.coverage[dimension.id];
      const status = entry.status;
      const priority = entry.priority;
      const policyIds = [...(entry.policy_ids || [])];

      if (!VALID_STATUSES.has(status)) {
        errors.push(
          `${jurisdiction.id}/${dimension.id} has invalid status ${status}`
        );
      }
      if (!VALID_PRIORITIES.has(priority)) {
        errors.push(
          `${jurisdiction.id}/${dimension.id} has invalid priority ${priority}`
        );
      }
      if (status === 'missing' && policyIds.length > 0) {
        errors.push(
          `${jurisdiction.id}/${dimension.id} is missing but references policy IDs`
        );
      }
      if (['covered', 'partial'].includes(status) && policyIds.length === 0) {
        errors.push(
          `${jurisdiction.id}/${dimension.id} is ${status} without evidence policy IDs`
        );
      }

      const evidence = [];
      for (const policyId of policyIds) {
        const policy = policies.get(policyId);
        if (!policy) {
          errors.push(
            `${jurisdiction.id}/${dimension.id} references unknown policy ${policyId}`
          );
          continue;
        }
        if (!allowedCountries.has(policy.country)) {
          errors.push(
            `${jurisdiction.id}/${dimension.id} policy ${policyId} belongs to ${policy.country}, not an allowed country`
          );
        }
        if (
          framework.guardrails?.require_verified_policy_ids_for_covered &&
          status === 'covered' &&
          String(policy.review_status).toLowerCase() !== 'verified'
        ) {
          errors.push(
            `${jurisdiction.id}/${dimension.id} uses non-verified policy ${policyId} as covered evidence`
          );
        }
        evidence.push(policy);
      }

      cells.push({
        jurisdiction_id: jurisdiction.id,
        jurisdiction_name: jurisdiction.name,
        dimension_id: dimension.id,
        dimension_label: dimension.label,
        status,
        priority,
        policy_ids: policyIds,
        evidence,
        rationale: entry.rationale,
      });
    }
  }

  const count = (predicate) => cells.filter(predicate).length;
  const summary = {
    jurisdictions: (framework.jurisdictions || []).length,
    dimensions: (framework.dimensions || []).length,
    cells: cells.length,
    covered: count((cell) => cell.status === 'covered'),
    partial: count((cell) => cell.status === 'partial'),
    missing: count((cell) => cell.status === 'missing'),
    not_applicable: count((cell) => cell.status === 'not_applicable'),
    high_priority_missing: count(
      (cell) => cell.status === 'missing' && cell.priority === 'high'
    ),
    medium_priority_missing: count(
      (cell) => cell.status === 'missing' && cell.priority === 'medium'
    ),
  };

  const maximumHighPriorityMissing =
    framework.guardrails?.maximum_high_priority_missing;
  if (
    Number.isInteger(maximumHighPriorityMissing) &&
    summary.high_priority_missing > maximumHighPriorityMissing
  ) {
    errors.push(
      `High-priority missing coverage increased to ${summary.high_priority_missing}; maximum is ${maximumHighPriorityMissing}`
    );
  }

  return { cells, summary, errors };
}

function statusSymbol(status) {
  return {
    covered: '✅ Covered',
    partial: '⚠️ Partial',
    missing: '❌ Missing',
    not_applicable: '— N/A',
  }[status];
}

function renderMarkdown(framework, result) {
  const dimensions = framework.dimensions || [];
  const cellsByKey = new Map(
    result.cells.map((cell) => [
      `${cell.jurisdiction_id}:${cell.dimension_id}`,
      cell,
    ])
  );

  const lines = [
    '# Policy coverage matrix',
    '',
    `As of **${framework.as_of}**. This matrix is a curated research control backed by policy IDs in the SQLite single source of truth. A missing entry means the database has no verified direct record for that function; it does not prove that no policy exists.`,
    '',
    '## Summary',
    '',
    `- Jurisdictions: **${result.summary.jurisdictions}**`,
    `- Governance dimensions: **${result.summary.dimensions}**`,
    `- Covered cells: **${result.summary.covered}**`,
    `- Partial cells: **${result.summary.partial}**`,
    `- Missing cells: **${result.summary.missing}**`,
    `- High-priority missing cells: **${result.summary.high_priority_missing}**`,
    `- Audit result: **${result.errors.length === 0 ? 'PASS' : 'FAIL'}**`,
    '',
    '## Matrix',
    '',
    `| Jurisdiction | ${dimensions.map((dimension) => dimension.label).join(' | ')} |`,
    `|---|${dimensions.map(() => '---').join('|')}|`,
  ];

  for (const jurisdiction of framework.jurisdictions || []) {
    const values = dimensions.map((dimension) => {
      const cell = cellsByKey.get(`${jurisdiction.id}:${dimension.id}`);
      return statusSymbol(cell.status);
    });
    lines.push(`| ${jurisdiction.name} | ${values.join(' | ')} |`);
  }

  const gaps = result.cells.filter((cell) =>
    ['missing', 'partial'].includes(cell.status)
  );
  lines.push('', '## Research gaps and partial coverage', '');
  for (const cell of gaps) {
    const policies =
      cell.policy_ids.length > 0
        ? ` Evidence: ${cell.policy_ids.map((id) => `\`${id}\``).join(', ')}.`
        : '';
    lines.push(
      `- **${cell.jurisdiction_name} — ${cell.dimension_label}** · ${cell.priority} priority · ${cell.status}. ${cell.rationale}${policies}`
    );
  }

  lines.push(
    '',
    '## Governance rules',
    '',
    '1. Coverage status is curated from official-source review and is not inferred from policy category or keyword matching.',
    '2. Every covered or partial cell must cite one or more policy IDs that exist in SQLite.',
    '3. Covered cells may use only policies whose review status is `verified`.',
    '4. A new policy should close or materially improve a documented gap; policy count alone is not a success metric.',
    '5. Facilities, capacities and coordinates are outside this audit and must not be modified by coverage maintenance.',
    '6. Update SQLite first, regenerate policy artifacts, then refresh this matrix.',
    ''
  );

  if (result.errors.length > 0) {
    lines.push('## Audit errors', '');
    for (const error of result.errors) lines.push(`- ${error}`);
    lines.push('');
  }

  return lines.join('\n');
}

export async function auditPolicyCoverage(paths = {}) {
  const resolved = { ...DEFAULT_PATHS, ...paths };
  for (const inputPath of [resolved.dbPath, resolved.frameworkPath]) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(
        `Required policy coverage input is missing: ${inputPath}`
      );
    }
  }

  const framework = JSON.parse(fs.readFileSync(resolved.frameworkPath, 'utf8'));
  const SQL = await initSqlJs();
  const db = new SQL.Database(new Uint8Array(fs.readFileSync(resolved.dbPath)));
  const policies = loadPolicies(db);
  db.close();

  const result = evaluateCoverage(framework, policies);
  const report = {
    schema_version: framework.schema_version,
    as_of: framework.as_of,
    purpose: framework.purpose,
    summary: result.summary,
    pass: result.errors.length === 0,
    errors: result.errors,
    cells: result.cells.map((cell) => ({
      jurisdiction_id: cell.jurisdiction_id,
      jurisdiction_name: cell.jurisdiction_name,
      dimension_id: cell.dimension_id,
      dimension_label: cell.dimension_label,
      status: cell.status,
      priority: cell.priority,
      policy_ids: cell.policy_ids,
      evidence: cell.evidence.map((policy) => ({
        id: policy.id,
        title: policy.title_en,
        country: policy.country,
        year: policy.year,
        status: policy.status,
        review_status: policy.review_status,
        source: policy.source,
        url: policy.url,
      })),
      rationale: cell.rationale,
    })),
  };

  fs.mkdirSync(path.dirname(resolved.reportJsonPath), { recursive: true });
  fs.writeFileSync(
    resolved.reportJsonPath,
    `${JSON.stringify(report, null, 2)}\n`
  );
  fs.writeFileSync(
    resolved.reportMarkdownPath,
    `${renderMarkdown(framework, result)}\n`
  );

  console.log(JSON.stringify(report.summary, null, 2));
  if (!report.pass) {
    for (const error of report.errors)
      console.error(`Coverage error: ${error}`);
    process.exitCode = 1;
  }
  return report;
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  auditPolicyCoverage().catch((error) => {
    console.error(`Policy coverage audit failed: ${error.message}`);
    process.exit(1);
  });
}

#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'agent/ccus-ai-agent/db/ccus_master.sqlite');
const JSON_OUTPUT = path.join(ROOT, 'docs/policy-content-depth-report.json');
const MARKDOWN_OUTPUT = path.join(ROOT, 'docs/policy-content-depth-report.md');

const PLACEHOLDER_PATTERNS = [
  /no direct .* found/i,
  /not specified/i,
  /no specific .* rules/i,
  /baseline strategic alignment/i,
  /initial assessment/i,
  /standard reporting required/i,
  /upgraded from baseline/i,
  /to be confirmed/i,
  /insufficient evidence/i,
  /暂无(?:直接|具体|明确)/,
  /尚未明确/,
  /初步评估/,
  /基线评估/,
];

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function textLength(value) {
  return String(value ?? '').trim().length;
}

function objectCompleteness(value, requiredKeys) {
  const object = parseJson(value, {});
  return requiredKeys.filter((key) => textLength(object?.[key]) >= 35).length;
}

function milestoneCount(value) {
  const object = parseJson(value, {});
  return Array.isArray(object?.milestones) ? object.milestones.length : 0;
}

function regulatoryFieldCount(value) {
  const object = parseJson(value, {});
  return Object.values(object).filter((entry) => textLength(entry) >= 20)
    .length;
}

function tagsCount(value) {
  const tags = parseJson(value, []);
  return Array.isArray(tags) ? tags.filter(Boolean).length : 0;
}

function hasPlaceholder(value) {
  const text = String(value ?? '');
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text));
}

export function assessPolicyContent(policy) {
  const en = policy.locales.en ?? {};
  const zh = policy.locales.zh ?? {};
  const enDescriptionLength = textLength(en.description);
  const zhDescriptionLength = textLength(zh.description);
  const enImpactFields = objectCompleteness(en.impact_analysis_json, [
    'economic',
    'technical',
    'environmental',
  ]);
  const zhImpactFields = objectCompleteness(zh.impact_analysis_json, [
    'economic',
    'technical',
    'environmental',
  ]);
  const analysisEvidence = policy.analysis.map((entry) => entry.evidence ?? '');
  const placeholderAnalysisCount =
    analysisEvidence.filter(hasPlaceholder).length;
  const specificAnalysisCount = analysisEvidence.filter(
    (entry) => textLength(entry) >= 60 && !hasPlaceholder(entry)
  ).length;

  let score = 0;
  score += Math.min(enDescriptionLength / 500, 1) * 18;
  score += Math.min(zhDescriptionLength / 260, 1) * 18;
  score += textLength(en.scope) >= 50 ? 6 : 0;
  score += textLength(zh.scope) >= 25 ? 6 : 0;
  score += (Math.min(tagsCount(en.tags_json), 4) / 4) * 4;
  score += (Math.min(tagsCount(zh.tags_json), 4) / 4) * 4;
  score += (enImpactFields / 3) * 8;
  score += (zhImpactFields / 3) * 8;
  score += (Math.min(milestoneCount(en.evolution_json), 2) / 2) * 4;
  score += (Math.min(milestoneCount(zh.evolution_json), 2) / 2) * 4;
  score += (Math.min(specificAnalysisCount, 5) / 5) * 12;
  score += policy.analysis.length === 5 ? 8 : 0;

  const flags = [];
  if (enDescriptionLength < 220) flags.push('short-en-description');
  if (zhDescriptionLength < 120) flags.push('short-zh-description');
  if (textLength(en.scope) < 30 || textLength(zh.scope) < 15) {
    flags.push('missing-or-thin-scope');
  }
  if (enImpactFields < 3 || zhImpactFields < 3) {
    flags.push('incomplete-impact-analysis');
  }
  if (
    milestoneCount(en.evolution_json) === 0 ||
    milestoneCount(zh.evolution_json) === 0
  ) {
    flags.push('missing-evolution');
  }
  if (placeholderAnalysisCount > 0) flags.push('placeholder-analysis');
  if (specificAnalysisCount < 4) flags.push('thin-analysis-evidence');

  const roundedScore = Math.round(score);
  const severity =
    enDescriptionLength < 120 ||
    zhDescriptionLength < 60 ||
    placeholderAnalysisCount >= 2 ||
    roundedScore < 45
      ? 'critical'
      : roundedScore < 65
        ? 'high'
        : roundedScore < 80
          ? 'medium'
          : 'healthy';

  return {
    id: policy.id,
    country: policy.country,
    year: policy.year,
    reviewStatus: policy.review_status,
    category: policy.category,
    score: roundedScore,
    severity,
    flags,
    metrics: {
      enDescriptionLength,
      zhDescriptionLength,
      enScopeLength: textLength(en.scope),
      zhScopeLength: textLength(zh.scope),
      enTags: tagsCount(en.tags_json),
      zhTags: tagsCount(zh.tags_json),
      enImpactFields,
      zhImpactFields,
      enMilestones: milestoneCount(en.evolution_json),
      zhMilestones: milestoneCount(zh.evolution_json),
      enRegulatoryFields: regulatoryFieldCount(en.regulatory_json),
      zhRegulatoryFields: regulatoryFieldCount(zh.regulatory_json),
      analysisDimensions: policy.analysis.length,
      specificAnalysisCount,
      placeholderAnalysisCount,
    },
    titles: {
      en: en.title ?? '',
      zh: zh.title ?? '',
    },
  };
}

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

function scalar(db, sql, params = []) {
  const statement = db.prepare(sql);
  statement.bind(params);
  const value = statement.step() ? statement.get()[0] : null;
  statement.free();
  return value;
}

export function buildReport(db, asOf) {
  if (!asOf) throw new Error('A deterministic as-of date is required');

  const policies = queryRows(
    db,
    `SELECT id, country, year, status, category, review_status
       FROM policies
      ORDER BY country, year DESC, id`
  );
  const localizedRows = queryRows(
    db,
    `SELECT policy_id, lang, title, description, scope, tags_json,
            impact_analysis_json, evolution_json, regulatory_json
       FROM policy_i18n`
  );
  const analysisRows = queryRows(
    db,
    `SELECT policy_id, dimension, evidence, citation, audit_note
       FROM policy_analysis`
  );

  const localesByPolicy = new Map();
  for (const row of localizedRows) {
    const locales = localesByPolicy.get(row.policy_id) ?? {};
    locales[row.lang] = row;
    localesByPolicy.set(row.policy_id, locales);
  }
  const analysisByPolicy = new Map();
  for (const row of analysisRows) {
    const entries = analysisByPolicy.get(row.policy_id) ?? [];
    entries.push(row);
    analysisByPolicy.set(row.policy_id, entries);
  }

  const assessments = policies
    .map((policy) =>
      assessPolicyContent({
        ...policy,
        locales: localesByPolicy.get(policy.id) ?? {},
        analysis: analysisByPolicy.get(policy.id) ?? [],
      })
    )
    .sort((a, b) => a.score - b.score || a.id.localeCompare(b.id));

  const severityCounts = Object.fromEntries(
    ['critical', 'high', 'medium', 'healthy'].map((severity) => [
      severity,
      assessments.filter((entry) => entry.severity === severity).length,
    ])
  );
  const verifiedNeedsWork = assessments.filter(
    (entry) => entry.reviewStatus === 'verified' && entry.severity !== 'healthy'
  );

  return {
    schemaVersion: 1,
    asOf,
    totalPolicies: assessments.length,
    severityCounts,
    verifiedNeedsWork: verifiedNeedsWork.length,
    lowestScore: assessments.at(0)?.score ?? null,
    medianScore: assessments.length
      ? assessments[Math.floor(assessments.length / 2)].score
      : null,
    assessments,
  };
}

export function renderMarkdown(report) {
  const lines = [
    '# Policy content-depth report',
    '',
    `As of **${report.asOf}**. This audit evaluates the explanatory depth of policy records in SQLite. It does not judge whether a policy is substantively strong; it tests whether the page explains the instrument with enough bilingual, analytical and lifecycle context.`,
    '',
    '## Summary',
    '',
    `- Policies assessed: **${report.totalPolicies}**`,
    `- Critical: **${report.severityCounts.critical}**`,
    `- High: **${report.severityCounts.high}**`,
    `- Medium: **${report.severityCounts.medium}**`,
    `- Healthy: **${report.severityCounts.healthy}**`,
    `- Verified policies needing improvement: **${report.verifiedNeedsWork}**`,
    `- Median score: **${report.medianScore}/100**`,
    '',
    '## Priority queue',
    '',
    '| Score | Severity | Policy | Jurisdiction | Review | Main gaps |',
    '| ---: | --- | --- | --- | --- | --- |',
  ];

  for (const entry of report.assessments
    .filter((item) => item.severity !== 'healthy')
    .slice(0, 40)) {
    lines.push(
      `| ${entry.score} | ${entry.severity} | \`${entry.id}\` — ${entry.titles.en || entry.titles.zh} | ${entry.country} | ${entry.reviewStatus} | ${entry.flags.join(', ')} |`
    );
  }

  lines.push(
    '',
    '## Scoring principles',
    '',
    '1. Both English and Chinese descriptions should explain the instrument, mechanism, implementation boundary and CCUS relevance.',
    '2. Scope, tags, three-part impact analysis and lifecycle milestones should be populated where the official source supports them.',
    '3. Five governance-analysis dimensions should contain policy-specific evidence rather than migration placeholders.',
    '4. Regulatory subfields are reported but not universally required because not every strategy, incentive or standard is a permitting instrument.',
    '5. A low score is a curation priority, not evidence that the underlying policy is weak or invalid.',
    ''
  );

  return `${lines.join('\n')}\n`;
}

async function main() {
  if (!fs.existsSync(DB_PATH))
    throw new Error(`Database not found: ${DB_PATH}`);
  const SQL = await initSqlJs();
  const db = new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)));
  const asOf =
    process.env.POLICY_CONTENT_AS_OF ||
    scalar(db, 'SELECT MAX(provenance_last_audit_date) FROM policies') ||
    scalar(db, "SELECT value FROM db_meta WHERE key = 'last_audit_date'");
  if (!asOf)
    throw new Error('Unable to resolve policy content audit date from SQLite');
  const report = buildReport(db, asOf);
  db.close();
  fs.writeFileSync(JSON_OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(MARKDOWN_OUTPUT, renderMarkdown(report));
  console.log(
    JSON.stringify(
      {
        asOf: report.asOf,
        totalPolicies: report.totalPolicies,
        severityCounts: report.severityCounts,
        verifiedNeedsWork: report.verifiedNeedsWork,
        medianScore: report.medianScore,
      },
      null,
      2
    )
  );
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  main().catch((error) => {
    console.error(`Policy content-depth audit failed: ${error.message}`);
    process.exit(1);
  });
}

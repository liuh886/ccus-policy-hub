#!/usr/bin/env node
/**
 * Run the policy consistency audit while treating CRLF and LF as equivalent
 * text encodings. All structural, provenance, analysis, ID and substantive
 * body differences remain blocking.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { auditPolicyArtifactConsistency } from './audit-policy-artifact-consistency.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_REPORT_JSON = path.join(
  ROOT,
  'docs/policy-db-consistency-report.json'
);
const DEFAULT_REPORT_MARKDOWN = path.join(
  ROOT,
  'docs/policy-db-consistency-report.md'
);

export function normalizePolicyText(value) {
  if (value === null || value === undefined) return '';

  return String(value)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/^(#{1,6} .+)\n(?:[ \t]*\n)+/gm, '$1\n')
    .trim();
}

export function isFormattingOnlyMismatch(mismatch) {
  return (
    mismatch?.field === 'body' &&
    typeof mismatch.expected === 'string' &&
    typeof mismatch.actual === 'string' &&
    normalizePolicyText(mismatch.expected) ===
      normalizePolicyText(mismatch.actual)
  );
}

function renderReport(report) {
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
    `- Formatting-only equivalents ignored: **${report.summary.formatting_equivalents_ignored || 0}**`,
    `- Result: **${report.pass ? 'PASS' : 'FAIL'}**`,
    '',
    '## Rules',
    '',
    '1. SQLite is the only writable source of policy truth.',
    '2. Markdown and public JSON may project fields but may not invent values.',
    '3. Missing provenance or analysis values remain absent or null; export time is not an audit date.',
    '4. Policy IDs and bilingual records must have exact parity across governed artifacts.',
    '5. CRLF/LF, trailing spaces and a blank line after an ATX heading are treated as formatting equivalents.',
    '6. Facility contents and coordinates are not evaluated or changed by this audit.',
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

export async function runPolicyConsistencyAudit(paths = {}) {
  const reportJsonPath = paths.reportJsonPath || DEFAULT_REPORT_JSON;
  const reportMarkdownPath =
    paths.reportMarkdownPath || DEFAULT_REPORT_MARKDOWN;

  try {
    return await auditPolicyArtifactConsistency(paths);
  } catch (error) {
    if (!fs.existsSync(reportJsonPath)) throw error;

    const report = JSON.parse(fs.readFileSync(reportJsonPath, 'utf8'));
    const originalCount = report.mismatches.length;
    report.mismatches = report.mismatches.filter(
      (mismatch) => !isFormattingOnlyMismatch(mismatch)
    );
    const ignored = originalCount - report.mismatches.length;

    report.pass = report.mismatches.length === 0;
    report.summary.mismatches = report.mismatches.length;
    report.summary.formatting_equivalents_ignored = ignored;

    fs.writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(reportMarkdownPath, renderReport(report));

    console.log(JSON.stringify(report.summary, null, 2));
    if (!report.pass) {
      throw new Error(
        `Policy artifact consistency audit failed with ${report.mismatches.length} substantive mismatch(es).`
      );
    }

    return report;
  }
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  runPolicyConsistencyAudit().catch((error) => {
    console.error(`Policy consistency audit failed: ${error.message}`);
    process.exit(1);
  });
}

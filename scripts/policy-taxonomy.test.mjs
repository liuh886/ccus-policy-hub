/**
 * policy-taxonomy.test.mjs
 *
 * CI guard for issue #69: every policy markdown frontmatter must carry a
 * category/status inside POLICY_CATEGORIES / POLICY_STATUSES, and every
 * facility markdown a status inside FACILITY_STATUSES. New out-of-enum
 * values fail here (and in astro check via z.enum) before merge.
 *
 * The enum source of truth is src/content/enums.generated.ts, parsed as
 * text because node --test cannot import TypeScript.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function parseEnumBlock(source, name) {
  const match = source.match(
    new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const`)
  );
  assert.ok(match, `enum block found: ${name}`);
  return new Set([...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]));
}

const generated = fs.readFileSync(
  path.join(ROOT, 'src/content/enums.generated.ts'),
  'utf8'
);
const POLICY_CATEGORIES = parseEnumBlock(generated, 'POLICY_CATEGORIES');
const POLICY_STATUSES = parseEnumBlock(generated, 'POLICY_STATUSES');
const FACILITY_STATUSES = parseEnumBlock(generated, 'FACILITY_STATUSES');

// zh markdown carries translated labels (export translates canonical en via
// ui_category/ui_status). Valid zh values = the dictionary's zh label sets.
const dictionary = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src/data/i18n_dictionary.json'), 'utf8')
);
const zhValues = (block) =>
  new Set(Object.values(block || {}).map((entry) => entry.zh));
const ZH_CATEGORIES = zhValues(dictionary.ui?.categories);
const ZH_STATUSES = zhValues(dictionary.ui?.status);
const ZH_FACILITY_STATUSES = ZH_STATUSES; // facilities share the status dictionary

// Same parser as the consistency audit (scripts/audit-policy-artifact-
// consistency.mjs): committed markdown carries single-quote frontmatter
// after prettier normalization, which is not strict JSON.
function readFrontmatter(filePath) {
  return matter(fs.readFileSync(filePath, 'utf8')).data;
}

function listMd(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.join(dir, f));
}

describe('policy taxonomy enums (#69)', () => {
  it('every en policy file has enum-clean category and status', () => {
    const files = listMd(path.join(ROOT, 'src/content/policies/en'));
    assert.ok(
      files.length >= 130,
      `expected 130 en policy files, got ${files.length}`
    );
    const violations = [];
    for (const file of files) {
      const data = readFrontmatter(file);
      if (!POLICY_CATEGORIES.has(data.category)) {
        violations.push(
          `${path.basename(file)}: category=${JSON.stringify(data.category)}`
        );
      }
      if (!POLICY_STATUSES.has(data.status)) {
        violations.push(
          `${path.basename(file)}: status=${JSON.stringify(data.status)}`
        );
      }
    }
    assert.deepStrictEqual(violations, [], 'out-of-enum en policy values');
  });

  it('every zh policy file carries a known translated label', () => {
    const files = listMd(path.join(ROOT, 'src/content/policies/zh'));
    assert.ok(
      files.length >= 130,
      `expected 130 zh policy files, got ${files.length}`
    );
    const violations = [];
    for (const file of files) {
      const data = readFrontmatter(file);
      if (!ZH_CATEGORIES.has(data.category)) {
        violations.push(
          `${path.basename(file)}: category=${JSON.stringify(data.category)}`
        );
      }
      if (!ZH_STATUSES.has(data.status)) {
        violations.push(
          `${path.basename(file)}: status=${JSON.stringify(data.status)}`
        );
      }
    }
    assert.deepStrictEqual(violations, [], 'unknown zh policy labels');
  });

  it('every facility file has enum-clean status', () => {
    const enFiles = listMd(path.join(ROOT, 'src/content/facilities/en'));
    const zhFiles = listMd(path.join(ROOT, 'src/content/facilities/zh'));
    assert.ok(enFiles.length > 0, 'facility files exist');
    const violations = [];
    for (const file of enFiles) {
      const data = readFrontmatter(file);
      if (!FACILITY_STATUSES.has(data.status)) {
        violations.push(
          `${path.basename(file)}: status=${JSON.stringify(data.status)}`
        );
      }
    }
    for (const file of zhFiles) {
      const data = readFrontmatter(file);
      if (!ZH_FACILITY_STATUSES.has(data.status)) {
        violations.push(
          `${path.basename(file)}: status=${JSON.stringify(data.status)}`
        );
      }
    }
    assert.deepStrictEqual(violations, [], 'out-of-enum facility values');
  });
});

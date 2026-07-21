#!/usr/bin/env node
/**
 * Synchronize policy relationship projections from the SQLite single source of truth.
 *
 * This script is deliberately narrow: it may change only facility Markdown
 * `relatedPolicies` arrays and public/data/facilities.json `linked_policies`
 * arrays. Facility facts, capacities, coordinates, partners, links and prose
 * must remain byte-for-byte unchanged apart from formatting of the relationship
 * arrays themselves.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'agent/ccus-ai-agent/db/ccus_master.sqlite');
const FACILITY_ROOT = path.join(ROOT, 'src/content/facilities');
const PUBLIC_FACILITIES_PATH = path.join(ROOT, 'public/data/facilities.json');

function queryRows(db, sql, params = []) {
  const statement = db.prepare(sql);
  statement.bind(params);
  const columns = statement.getColumnNames();
  const rows = [];
  while (statement.step()) {
    const values = statement.get();
    const row = {};
    columns.forEach((column, index) => {
      row[column] = values[index];
    });
    rows.push(row);
  }
  statement.free();
  return rows;
}

export function normalizeIds(values = []) {
  return [...new Set((values || []).map((value) => String(value)))].sort();
}

export function sameIds(left = [], right = []) {
  const a = normalizeIds(left);
  const b = normalizeIds(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function findArrayBounds(frontmatter, key = 'relatedPolicies') {
  const keyPattern = new RegExp(`(?:['\"]?${key}['\"]?)\\s*:`);
  const match = keyPattern.exec(frontmatter);
  if (!match) return null;

  const arrayStart = frontmatter.indexOf('[', match.index + match[0].length);
  if (arrayStart < 0) throw new Error(`Expected an array for ${key}`);

  let quote = null;
  let escaped = false;
  let depth = 0;
  for (let index = arrayStart; index < frontmatter.length; index += 1) {
    const char = frontmatter[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === '[') depth += 1;
    if (char === ']') {
      depth -= 1;
      if (depth === 0) return { start: arrayStart, end: index + 1 };
    }
  }
  throw new Error(`Unterminated array for ${key}`);
}

export function replaceRelatedPolicies(text, expectedIds) {
  const expected = normalizeIds(expectedIds);
  const firstMarker = text.indexOf('---');
  const secondMarker = text.indexOf('\n---', firstMarker + 3);
  if (firstMarker !== 0 || secondMarker < 0) {
    throw new Error(
      'Facility Markdown does not contain a valid frontmatter block'
    );
  }

  const frontmatterStart = firstMarker + 3;
  const frontmatter = text.slice(frontmatterStart, secondMarker);
  const parsed = matter(text);
  const current = normalizeIds(parsed.data?.relatedPolicies || []);
  if (sameIds(current, expected)) {
    return { text, changed: false, current, expected };
  }

  const bounds = findArrayBounds(frontmatter);
  let nextFrontmatter;
  const rendered = JSON.stringify(expected);
  if (bounds) {
    nextFrontmatter =
      frontmatter.slice(0, bounds.start) +
      rendered +
      frontmatter.slice(bounds.end);
  } else {
    const closingBrace = frontmatter.lastIndexOf('}');
    if (closingBrace < 0)
      throw new Error('Facility frontmatter is not an object');
    nextFrontmatter =
      frontmatter.slice(0, closingBrace) +
      `  'relatedPolicies': ${rendered},\n` +
      frontmatter.slice(closingBrace);
  }

  return {
    text:
      text.slice(0, frontmatterStart) +
      nextFrontmatter +
      text.slice(secondMarker),
    changed: true,
    current,
    expected,
  };
}

function loadExpectedLinks(db) {
  const map = new Map();
  for (const row of queryRows(
    db,
    `SELECT facility_id, policy_id
     FROM policy_facility_links
     ORDER BY facility_id, policy_id`
  )) {
    const facilityId = String(row.facility_id);
    if (!map.has(facilityId)) map.set(facilityId, []);
    map.get(facilityId).push(String(row.policy_id));
  }
  for (const [facilityId, ids] of map) map.set(facilityId, normalizeIds(ids));
  return map;
}

function assertNoOrphanLinks(db) {
  const orphans = queryRows(
    db,
    `SELECT pfl.facility_id, pfl.policy_id
     FROM policy_facility_links pfl
     LEFT JOIN facilities f ON f.id = pfl.facility_id
     LEFT JOIN policies p ON p.id = pfl.policy_id
     WHERE f.id IS NULL OR p.id IS NULL`
  );
  if (orphans.length > 0) {
    throw new Error(`SQLite contains ${orphans.length} orphan policy links`);
  }
}

function inspectMarkdown(expectedLinks, { write = false } = {}) {
  const mismatches = [];
  const changedFiles = [];
  for (const lang of ['en', 'zh']) {
    const dir = path.join(FACILITY_ROOT, lang);
    for (const file of fs
      .readdirSync(dir)
      .filter((name) => name.endsWith('.md'))) {
      const filePath = path.join(dir, file);
      const facilityId = file.replace(/\.md$/i, '');
      const expected = expectedLinks.get(facilityId) || [];
      const original = fs.readFileSync(filePath, 'utf8');
      const result = replaceRelatedPolicies(original, expected);
      if (!result.changed) continue;
      mismatches.push({
        surface: `markdown:${lang}`,
        facilityId,
        current: result.current,
        expected: result.expected,
      });
      if (write) {
        fs.writeFileSync(filePath, result.text);
        changedFiles.push(path.relative(ROOT, filePath).replace(/\\/g, '/'));
      }
    }
  }
  return { mismatches, changedFiles };
}

function inspectPublicJson(expectedLinks, { write = false } = {}) {
  const payload = JSON.parse(fs.readFileSync(PUBLIC_FACILITIES_PATH, 'utf8'));
  const mismatches = [];
  let changed = false;
  for (const record of payload.records || []) {
    const facilityId = String(record.id);
    const expected = expectedLinks.get(facilityId) || [];
    const current = normalizeIds(record.linked_policies || []);
    if (sameIds(current, expected)) continue;
    mismatches.push({
      surface: 'public-json',
      facilityId,
      current,
      expected,
    });
    if (write) {
      record.linked_policies = expected;
      changed = true;
    }
  }
  if (write && changed) {
    fs.writeFileSync(
      PUBLIC_FACILITIES_PATH,
      `${JSON.stringify(payload, null, 2)}\n`
    );
  }
  return {
    mismatches,
    changedFiles:
      write && changed
        ? [path.relative(ROOT, PUBLIC_FACILITIES_PATH).replace(/\\/g, '/')]
        : [],
  };
}

export async function syncPolicyLinkProjections({ write = false } = {}) {
  if (!fs.existsSync(DB_PATH))
    throw new Error(`Database not found: ${DB_PATH}`);
  const SQL = await initSqlJs();
  const db = new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)));
  try {
    assertNoOrphanLinks(db);
    const expectedLinks = loadExpectedLinks(db);
    const markdown = inspectMarkdown(expectedLinks, { write });
    const publicJson = inspectPublicJson(expectedLinks, { write });
    const mismatches = [...markdown.mismatches, ...publicJson.mismatches];
    const changedFiles = [...markdown.changedFiles, ...publicJson.changedFiles];
    return {
      mode: write ? 'write' : 'check',
      facilitiesWithLinks: expectedLinks.size,
      mismatches,
      changedFiles,
      pass: write || mismatches.length === 0,
    };
  } finally {
    db.close();
  }
}

async function main() {
  const write = process.argv.includes('--write');
  const result = await syncPolicyLinkProjections({ write });
  console.log(JSON.stringify(result, null, 2));
  if (!write && !result.pass) process.exit(2);
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  main().catch((error) => {
    console.error(`Policy-link projection sync failed: ${error.message}`);
    process.exit(1);
  });
}

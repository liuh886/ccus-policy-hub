import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import matter from 'gray-matter';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(ROOT, 'governance', 'db', 'ccus_master.sqlite');
const REPORT_DIR = path.join(ROOT, 'governance', 'reports');
const REPORT_JSON = path.join(REPORT_DIR, 'facilities_parity_report.json');
const REPORT_MD = path.join(REPORT_DIR, 'facilities_parity_report.md');
const REPAIR_JSON = path.join(
  REPORT_DIR,
  'facilities_db_repair_from_md.json'
);
const REPAIR_MD = path.join(
  REPORT_DIR,
  'facilities_db_repair_from_md.md'
);
const FACILITY_MD_DIR = path.join(ROOT, 'src', 'content', 'facilities');

const CJK_RE = /[\u4e00-\u9fff]/;
const FLOAT_EPSILON = 1e-9;

export function normalizeBody(input) {
  return String(input ?? '')
    .replace(/\r\n/g, '\n')
    .trim();
}

export function normalizeValueForCompare(value) {
  if (value === undefined || value === null) return '';
  return value;
}

export function floatEqual(a, b, epsilon = FLOAT_EPSILON) {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isNaN(na) && Number.isNaN(nb)) return true;
  return Math.abs(na - nb) <= epsilon;
}

export function compareStringArrays(dbArr = [], mdArr = []) {
  const db = (dbArr || []).map((v) => String(v ?? ''));
  const md = (mdArr || []).map((v) => String(v ?? ''));
  const dbSorted = [...db].sort();
  const mdSorted = [...md].sort();
  const sameSet =
    dbSorted.length === mdSorted.length &&
    dbSorted.every((v, idx) => v === mdSorted[idx]);
  const sameOrder =
    db.length === md.length && db.every((v, idx) => v === md[idx]);
  return { sameSet, sameOrder, db, md };
}

class SqlJsDatabase {
  constructor(SQL, buffer) {
    this.db = new SQL.Database(buffer);
  }
  all(sql, params = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    const cols = stmt.getColumnNames();
    while (stmt.step()) {
      const vals = stmt.get();
      const row = {};
      for (let i = 0; i < cols.length; i++) row[cols[i]] = vals[i];
      rows.push(row);
    }
    stmt.free();
    return rows;
  }
  get(sql, params = []) {
    return this.all(sql, params)[0] ?? null;
  }
  close() {
    this.db.close();
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function toSlugSetFromDir(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/i, ''));
}

function loadFacilityMarkdown(lang) {
  const dir = path.join(FACILITY_MD_DIR, lang);
  const map = new Map();
  const duplicateIds = [];
  if (!fs.existsSync(dir)) return { map, duplicateIds };

  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.md')) continue;
    const fullPath = path.join(dir, file);
    const parsed = matter(fs.readFileSync(fullPath, 'utf8'));
    const data = parsed.data || {};
    const fileSlug = file.replace(/\.md$/i, '');
    const id = String(data.id ?? fileSlug);
    if (map.has(id)) duplicateIds.push(id);
    map.set(id, {
      id,
      lang,
      filePath: fullPath,
      fileSlug,
      frontmatter: data,
      body: parsed.content ?? '',
    });
  }
  return { map, duplicateIds };
}

function buildMaps(rows, keyFn) {
  const map = new Map();
  for (const row of rows) map.set(keyFn(row), row);
  return map;
}

function buildArrayMap(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

function fallbackFacilityDescription({ lang, displayCountry, displayStatus, i }) {
  if (lang === 'zh') {
    return `### 项目概览

该项目位于 ${displayCountry}${i.region ? ` (${i.region})` : ''}，属于 ${i.sector || 'CCUS'} 领域。设施类型为 ${i.type || '捕集设施'}，当前状态为 ${displayStatus}。${i.hub ? `作为 ${i.hub} 枢纽的一部分，` : ''}${i.operator ? `由 ${i.operator} 负责运营。` : ''}`;
  }
  return `### Project Overview

This project is located in ${displayCountry}${i.region ? ` (${i.region})` : ''}, within the ${i.sector || 'CCUS'} sector. The facility is classified as ${i.type || 'Capture'} and is currently ${displayStatus}. ${i.hub ? `As part of the ${i.hub} hub, ` : ''}${i.operator ? `it is operated by ${i.operator}.` : ''}`;
}

export function projectFacilityForLang({
  f,
  i,
  lang,
  partners,
  links,
  relatedPolicies,
}) {
  // Facilities markdown currently keeps shared canonical values (e.g. country/status)
  // in both en/zh frontmatter. Audit compares against that contract directly.
  const displayCountry = f.country ?? '';
  const displayStatus = f.status ?? '';
  const coordinates =
    (Number(f.lat) !== 0 || Number(f.lng) !== 0)
      ? [Number(f.lat), Number(f.lng)]
      : [0.001, 0.001];
  const description =
    i.description && String(i.description).trim()
      ? i.description
      : fallbackFacilityDescription({
          lang,
          displayCountry,
          displayStatus,
          i,
        });

  return {
    frontmatter: {
      id: String(f.id),
      name: i.name ?? '',
      lang,
      country: displayCountry ?? '',
      region: i.region ?? '',
      type: i.type ?? '',
      status: displayStatus ?? '',
      announcedCapacityMin: f.announced_capacity_min ?? 0,
      announcedCapacityMax: f.announced_capacity_max ?? 0,
      announcedCapacityRaw: f.announced_capacity_raw ?? '',
      estimatedCapacity: f.estimated_capacity ?? 0,
      coordinates,
      precision: f.precision || 'country',
      sector: i.sector ?? '',
      fateOfCarbon: i.fate_of_carbon ?? '',
      hub: i.hub ?? '',
      operator: i.operator ?? '',
      captureTechnology: i.capture_technology ?? '',
      storageType: i.storage_type ?? '',
      investmentScale: f.investment_scale ?? '',
      phase: i.phase ?? '',
      announcement: i.announcement ?? '',
      fid: i.fid ?? '',
      operation: i.operation ?? '',
      suspensionDate: i.suspension_date ?? '',
      relatedPolicies: [...relatedPolicies].sort(),
      partners: [...partners],
      links: [...links],
      provenance: {
        author: f.provenance_author ?? '',
        reviewer: f.provenance_reviewer ?? '',
        lastAuditDate: f.provenance_last_audit_date ?? '',
      },
    },
    body: normalizeBody(description),
    displayCountry,
    displayStatus,
  };
}

export function resolveSharedMdValue(field, enFrontmatter = {}, zhFrontmatter = {}) {
  const enVal = normalizeValueForCompare(enFrontmatter?.[field]);
  const zhVal = normalizeValueForCompare(zhFrontmatter?.[field]);
  const enPresent = String(enVal) !== '';
  const zhPresent = String(zhVal) !== '';
  if (enPresent && zhPresent && String(enVal) !== String(zhVal)) {
    throw new Error(`Inconsistent shared MD field: ${field}`);
  }
  if (enPresent) return enVal;
  if (zhPresent) return zhVal;
  return '';
}

function pushMismatch(store, item) {
  store.push({
    severity: item.severity || 'error',
    type: item.type || 'field_mismatch',
    id: item.id ?? '',
    lang: item.lang ?? null,
    field: item.field ?? null,
    db: item.db,
    md: item.md,
    note: item.note ?? '',
  });
}

function compareScalarField({
  mismatches,
  id,
  lang,
  field,
  expected,
  actual,
  numeric = false,
  severity = 'error',
}) {
  const exp = normalizeValueForCompare(expected);
  const act = normalizeValueForCompare(actual);
  const same = numeric ? floatEqual(exp, act) : String(exp) === String(act);
  if (!same) {
    pushMismatch(mismatches, {
      severity,
      id,
      lang,
      field,
      db: exp,
      md: act,
    });
  }
}

function compareCoordinates({ mismatches, id, lang, expected, actual }) {
  const exp = Array.isArray(expected) ? expected : [];
  const act = Array.isArray(actual) ? actual : [];
  if (exp.length !== 2 || act.length !== 2) {
    pushMismatch(mismatches, {
      id,
      lang,
      field: 'coordinates',
      db: exp,
      md: act,
      note: 'invalid coordinate array shape',
    });
    return;
  }
  if (!floatEqual(exp[0], act[0]) || !floatEqual(exp[1], act[1])) {
    pushMismatch(mismatches, {
      id,
      lang,
      field: 'coordinates',
      db: exp,
      md: act,
    });
  }
}

function stableStringify(value) {
  return JSON.stringify(value ?? null);
}

function arraysExactEqual(a = [], b = []) {
  if (a.length !== b.length) return false;
  return a.every((v, i) => String(v ?? '') === String(b[i] ?? ''));
}

function buildFacilitiesDbRepairList({
  dbIds,
  facilityMap,
  mdEn,
  mdZh,
  partnersMap,
  linksMap,
}) {
  const actions = [];
  const warnings = [];

  const seenScalar = new Set();
  const pushFacilityScalar = (id, column, value) => {
    const key = `${id}::${column}`;
    if (seenScalar.has(key)) return;
    seenScalar.add(key);
    actions.push({
      type: 'update_facilities_scalar',
      table: 'facilities',
      id,
      column,
      value,
    });
  };

  const pushReplaceRows = (table, id, lang, values) => {
    actions.push({
      type: 'replace_ordered_rows',
      table,
      id,
      lang,
      values: values.map((v) => String(v ?? '')),
    });
  };

  for (const facilityId of dbIds) {
    const f = facilityMap.get(facilityId);
    const mdEnRec = mdEn.get(facilityId);
    const mdZhRec = mdZh.get(facilityId);
    if (!f || !mdEnRec || !mdZhRec) continue;

    const enFm = mdEnRec.frontmatter ?? {};
    const zhFm = mdZhRec.frontmatter ?? {};

    const sharedFieldMap = [
      ['country', 'country'],
      ['status', 'status'],
      ['announcedCapacityRaw', 'announced_capacity_raw'],
      ['investmentScale', 'investment_scale'],
    ];

    for (const [mdField, dbColumn] of sharedFieldMap) {
      let mdValue;
      try {
        mdValue = resolveSharedMdValue(mdField, enFm, zhFm);
      } catch (error) {
        warnings.push({
          type: 'md_inconsistent_shared_field',
          id: facilityId,
          field: mdField,
          note: error.message,
          en: enFm?.[mdField],
          zh: zhFm?.[mdField],
        });
        continue;
      }
      const dbValue = normalizeValueForCompare(f[dbColumn]);
      if (String(dbValue) !== String(normalizeValueForCompare(mdValue))) {
        pushFacilityScalar(facilityId, dbColumn, mdValue);
      }
    }

    const mdProvEn = enFm.provenance ?? {};
    const mdProvZh = zhFm.provenance ?? {};
    for (const [mdField, dbColumn] of [
      ['author', 'provenance_author'],
      ['reviewer', 'provenance_reviewer'],
      ['lastAuditDate', 'provenance_last_audit_date'],
    ]) {
      let mdValue;
      try {
        mdValue = resolveSharedMdValue(mdField, mdProvEn, mdProvZh);
      } catch (error) {
        warnings.push({
          type: 'md_inconsistent_shared_field',
          id: facilityId,
          field: `provenance.${mdField}`,
          note: error.message,
          en: mdProvEn?.[mdField],
          zh: mdProvZh?.[mdField],
        });
        continue;
      }
      const dbValue = normalizeValueForCompare(f[dbColumn]);
      if (String(dbValue) !== String(normalizeValueForCompare(mdValue))) {
        pushFacilityScalar(facilityId, dbColumn, mdValue);
      }
    }

    for (const lang of ['en', 'zh']) {
      const mdRec = lang === 'en' ? mdEnRec : mdZhRec;
      const mdFm = mdRec.frontmatter ?? {};
      const dbPartners = (partnersMap.get(`${facilityId}::${lang}`) ?? []).map((r) =>
        String(r.partner)
      );
      const dbLinks = (linksMap.get(`${facilityId}::${lang}`) ?? []).map((r) =>
        String(r.link)
      );
      const mdPartners = Array.isArray(mdFm.partners) ? mdFm.partners : [];
      const mdLinks = Array.isArray(mdFm.links) ? mdFm.links : [];

      if (!arraysExactEqual(dbPartners, mdPartners)) {
        pushReplaceRows('facility_partners', facilityId, lang, mdPartners);
      }
      if (!arraysExactEqual(dbLinks, mdLinks)) {
        pushReplaceRows('facility_links', facilityId, lang, mdLinks);
      }
    }
  }

  const countsByType = {};
  for (const action of actions) {
    countsByType[action.type] = (countsByType[action.type] || 0) + 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    dbPath: path.relative(ROOT, DB_PATH).replace(/\\/g, '/'),
    summary: {
      totalActions: actions.length,
      totalWarnings: warnings.length,
      countsByType,
    },
    actions,
    warnings,
  };
}

function repairMarkdownReport(repairPlan) {
  const lines = [];
  lines.push('# Facilities DB Repair List (MD Truth)');
  lines.push('');
  lines.push(`- Generated At: ${repairPlan.generatedAt}`);
  lines.push(`- DB Path: \`${repairPlan.dbPath}\``);
  lines.push(`- Total Actions: ${repairPlan.summary.totalActions}`);
  lines.push(`- Total Warnings: ${repairPlan.summary.totalWarnings}`);
  lines.push('');
  lines.push('## Action Counts');
  lines.push('');
  if (Object.keys(repairPlan.summary.countsByType).length === 0) {
    lines.push('- None');
  } else {
    for (const [k, v] of Object.entries(repairPlan.summary.countsByType)) {
      lines.push(`- ${k}: ${v}`);
    }
  }
  lines.push('');
  lines.push('## Sample Actions');
  lines.push('');
  for (const action of repairPlan.actions.slice(0, 50)) {
    lines.push(`- ${stableStringify(action)}`);
  }
  if (repairPlan.actions.length === 0) lines.push('- None');
  lines.push('');
  lines.push('## Warnings');
  lines.push('');
  for (const warning of repairPlan.warnings.slice(0, 50)) {
    lines.push(`- ${stableStringify(warning)}`);
  }
  if (repairPlan.warnings.length === 0) lines.push('- None');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function markdownReport(report) {
  const { summary, counts, errors, warnings, mismatchCounts } = report;
  const topFields = Object.entries(mismatchCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  const lines = [];
  lines.push('# Facilities Parity Audit Report');
  lines.push('');
  lines.push(`- Status: **${summary.pass ? 'PASS' : 'FAIL'}**`);
  lines.push(`- Generated At: ${summary.generatedAt}`);
  lines.push(`- DB Path: \`${summary.dbPath}\``);
  lines.push('');
  lines.push('## Counts');
  lines.push('');
  for (const [k, v] of Object.entries(counts)) lines.push(`- ${k}: ${v}`);
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  lines.push(`- Errors: ${errors.length}`);
  lines.push(`- Warnings: ${warnings.length}`);
  lines.push('');
  lines.push('## Top Mismatch Fields');
  lines.push('');
  if (topFields.length === 0) {
    lines.push('- None');
  } else {
    for (const [field, count] of topFields) lines.push(`- ${field}: ${count}`);
  }
  lines.push('');
  lines.push('## Sample Errors');
  lines.push('');
  if (errors.length === 0) {
    lines.push('- None');
  } else {
    for (const e of errors.slice(0, 50)) {
      lines.push(
        `- [${e.type}] id=${e.id}${e.lang ? ` lang=${e.lang}` : ''}${e.field ? ` field=${e.field}` : ''}${e.note ? ` note=${e.note}` : ''}`
      );
    }
  }
  lines.push('');
  lines.push('## Sample Warnings');
  lines.push('');
  if (warnings.length === 0) {
    lines.push('- None');
  } else {
    for (const w of warnings.slice(0, 50)) {
      lines.push(
        `- [${w.type}] id=${w.id}${w.lang ? ` lang=${w.lang}` : ''}${w.field ? ` field=${w.field}` : ''}${w.note ? ` note=${w.note}` : ''}`
      );
    }
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function runAudit() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database not found: ${DB_PATH}`);
  }

  const SQL = await initSqlJs();
  const db = new SqlJsDatabase(SQL, new Uint8Array(fs.readFileSync(DB_PATH)));

  try {
    const facilities = db.all('SELECT * FROM facilities');
    const facilityI18n = db.all('SELECT * FROM facility_i18n');
    const partnersRows = db.all(
      'SELECT * FROM facility_partners ORDER BY facility_id, lang, order_index'
    );
    const linksRows = db.all(
      'SELECT * FROM facility_links ORDER BY facility_id, lang, order_index'
    );
    const relRows = db.all(
      'SELECT * FROM policy_facility_links ORDER BY facility_id, policy_id'
    );
    const policyIds = new Set(
      db.all('SELECT id FROM policies').map((row) => String(row.id))
    );

    const { map: mdEn, duplicateIds: mdEnDup } = loadFacilityMarkdown('en');
    const { map: mdZh, duplicateIds: mdZhDup } = loadFacilityMarkdown('zh');

    const facilityMap = buildMaps(facilities, (r) => String(r.id));
    const facilityI18nMap = buildMaps(
      facilityI18n,
      (r) => `${r.facility_id}::${r.lang}`
    );
    const partnersMap = buildArrayMap(
      partnersRows,
      (r) => `${r.facility_id}::${r.lang}`
    );
    const linksMap = buildArrayMap(linksRows, (r) => `${r.facility_id}::${r.lang}`);
    const relatedPoliciesMap = buildArrayMap(relRows, (r) => String(r.facility_id));

    const errors = [];
    const warnings = [];

    const dbIds = new Set(facilities.map((f) => String(f.id)));
    const mdEnIds = new Set([...mdEn.keys()]);
    const mdZhIds = new Set([...mdZh.keys()]);
    const allIds = new Set([...dbIds, ...mdEnIds, ...mdZhIds]);

    for (const id of allIds) {
      const inDb = dbIds.has(id);
      const inEn = mdEnIds.has(id);
      const inZh = mdZhIds.has(id);
      if (!inDb) errors.push({ type: 'missing_in_db', id, severity: 'error' });
      if (!inEn) errors.push({ type: 'missing_in_md_en', id, severity: 'error' });
      if (!inZh) errors.push({ type: 'missing_in_md_zh', id, severity: 'error' });
    }

    for (const id of mdEnDup) {
      errors.push({ type: 'duplicate_md_id', id, lang: 'en', severity: 'error' });
    }
    for (const id of mdZhDup) {
      errors.push({ type: 'duplicate_md_id', id, lang: 'zh', severity: 'error' });
    }

    for (const facilityId of dbIds) {
      const f = facilityMap.get(facilityId);
      if (!f) continue;

      if (CJK_RE.test(String(f.country ?? ''))) {
        warnings.push({
          type: 'canonical_drift',
          id: facilityId,
          field: 'facilities.country',
          severity: 'warning',
          note: 'Main facilities.country contains CJK/localized value',
          db: f.country,
          md: null,
        });
      }
      if (CJK_RE.test(String(f.status ?? ''))) {
        warnings.push({
          type: 'canonical_drift',
          id: facilityId,
          field: 'facilities.status',
          severity: 'warning',
          note: 'Main facilities.status contains CJK/localized value',
          db: f.status,
          md: null,
        });
      }

      const relatedPolicyRows = relatedPoliciesMap.get(facilityId) ?? [];
      const relatedPoliciesRaw = relatedPolicyRows.map((r) => String(r.policy_id));
      for (const pid of relatedPoliciesRaw) {
        if (!policyIds.has(pid)) {
          errors.push({
            type: 'orphan_policy_link',
            id: facilityId,
            field: 'relatedPolicies',
            severity: 'error',
            note: `policy_id ${pid} not found in policies table`,
            db: pid,
            md: null,
          });
        }
      }

      for (const lang of ['en', 'zh']) {
        const mdRec = lang === 'en' ? mdEn.get(facilityId) : mdZh.get(facilityId);
        if (!mdRec) continue;

        const i = facilityI18nMap.get(`${facilityId}::${lang}`);
        if (!i) {
          errors.push({
            type: 'missing_i18n_row',
            id: facilityId,
            lang,
            severity: 'error',
          });
          continue;
        }

        const partners = (partnersMap.get(`${facilityId}::${lang}`) ?? []).map((r) =>
          String(r.partner)
        );
        const links = (linksMap.get(`${facilityId}::${lang}`) ?? []).map((r) =>
          String(r.link)
        );
        const projected = projectFacilityForLang({
          f,
          i,
          lang,
          partners,
          links,
          relatedPolicies: relatedPoliciesRaw,
        });

        const mdFm = mdRec.frontmatter ?? {};

        const scalarStringFields = [
          'id',
          'name',
          'lang',
          'country',
          'region',
          'type',
          'status',
          'precision',
          'sector',
          'fateOfCarbon',
          'hub',
          'operator',
          'captureTechnology',
          'storageType',
          'investmentScale',
          'phase',
          'announcement',
          'fid',
          'operation',
          'suspensionDate',
          'announcedCapacityRaw',
        ];
        const scalarNumericFields = [
          'announcedCapacityMin',
          'announcedCapacityMax',
          'estimatedCapacity',
        ];

        for (const field of scalarStringFields) {
          compareScalarField({
            mismatches: errors,
            id: facilityId,
            lang,
            field,
            expected: projected.frontmatter[field],
            actual: mdFm[field],
          });
        }
        for (const field of scalarNumericFields) {
          compareScalarField({
            mismatches: errors,
            id: facilityId,
            lang,
            field,
            expected: projected.frontmatter[field],
            actual: mdFm[field],
            numeric: true,
          });
        }

        compareCoordinates({
          mismatches: errors,
          id: facilityId,
          lang,
          expected: projected.frontmatter.coordinates,
          actual: mdFm.coordinates,
        });

        const relatedPoliciesCmp = compareStringArrays(
          projected.frontmatter.relatedPolicies,
          mdFm.relatedPolicies || []
        );
        if (!relatedPoliciesCmp.sameSet) {
          pushMismatch(errors, {
            id: facilityId,
            lang,
            field: 'relatedPolicies',
            db: projected.frontmatter.relatedPolicies,
            md: mdFm.relatedPolicies || [],
          });
        }

        const partnersCmp = compareStringArrays(
          projected.frontmatter.partners,
          mdFm.partners || []
        );
        if (!partnersCmp.sameSet) {
          pushMismatch(errors, {
            id: facilityId,
            lang,
            field: 'partners',
            db: projected.frontmatter.partners,
            md: mdFm.partners || [],
          });
        } else if (!partnersCmp.sameOrder) {
          pushMismatch(warnings, {
            severity: 'warning',
            type: 'order_mismatch',
            id: facilityId,
            lang,
            field: 'partners',
            db: projected.frontmatter.partners,
            md: mdFm.partners || [],
            note: 'Same set but different order',
          });
        }

        const linksCmp = compareStringArrays(
          projected.frontmatter.links,
          mdFm.links || []
        );
        if (!linksCmp.sameSet) {
          pushMismatch(errors, {
            id: facilityId,
            lang,
            field: 'links',
            db: projected.frontmatter.links,
            md: mdFm.links || [],
          });
        } else if (!linksCmp.sameOrder) {
          pushMismatch(warnings, {
            severity: 'warning',
            type: 'order_mismatch',
            id: facilityId,
            lang,
            field: 'links',
            db: projected.frontmatter.links,
            md: mdFm.links || [],
            note: 'Same set but different order',
          });
        }

        const mdProv = mdFm.provenance || {};
        compareScalarField({
          mismatches: errors,
          id: facilityId,
          lang,
          field: 'provenance.author',
          expected: projected.frontmatter.provenance.author,
          actual: mdProv.author,
        });
        compareScalarField({
          mismatches: errors,
          id: facilityId,
          lang,
          field: 'provenance.reviewer',
          expected: projected.frontmatter.provenance.reviewer,
          actual: mdProv.reviewer,
        });
        compareScalarField({
          mismatches: errors,
          id: facilityId,
          lang,
          field: 'provenance.lastAuditDate',
          expected: projected.frontmatter.provenance.lastAuditDate,
          actual: mdProv.lastAuditDate,
        });

        const mdBody = normalizeBody(mdRec.body);
        if (mdBody !== projected.body) {
          pushMismatch(warnings, {
            severity: 'warning',
            type: 'body_mismatch',
            id: facilityId,
            lang,
            field: 'body',
            db: projected.body.slice(0, 240),
            md: mdBody.slice(0, 240),
            note:
              normalizeBody(i.description || '') === ''
                ? 'DB description empty; markdown may contain generated/edited narrative'
                : 'DB description differs from markdown body',
          });
        }
      }
    }

    const mismatchCounts = {};
    for (const item of [...errors, ...warnings]) {
      const key = item.field || item.type || 'unknown';
      mismatchCounts[key] = (mismatchCounts[key] || 0) + 1;
    }

    const counts = {
      db_facilities: facilities.length,
      db_facility_i18n_rows: facilityI18n.length,
      db_policy_facility_links: relRows.length,
      md_facilities_en: mdEn.size,
      md_facilities_zh: mdZh.size,
      total_unique_ids_checked: allIds.size,
    };

    const summary = {
      pass: errors.length === 0,
      generatedAt: new Date().toISOString(),
      dbPath: path.relative(ROOT, DB_PATH).replace(/\\/g, '/'),
      exitCode: errors.length === 0 ? 0 : 2,
    };

    const repairPlan = buildFacilitiesDbRepairList({
      dbIds,
      facilityMap,
      mdEn,
      mdZh,
      partnersMap,
      linksMap,
    });

    const report = {
      summary,
      counts,
      errors,
      warnings,
      mismatchCounts,
      repairPlanSummary: repairPlan.summary,
    };

    ensureDir(REPORT_DIR);
    fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2));
    fs.writeFileSync(REPORT_MD, markdownReport(report));
    fs.writeFileSync(REPAIR_JSON, JSON.stringify(repairPlan, null, 2));
    fs.writeFileSync(REPAIR_MD, repairMarkdownReport(repairPlan));

    return report;
  } finally {
    db.close();
  }
}

export async function main() {
  try {
    const report = await runAudit();
    const { summary, counts, errors, warnings } = report;
    console.log(
      `Facilities parity audit ${summary.pass ? 'PASSED' : 'FAILED'} | db=${counts.db_facilities} | en=${counts.md_facilities_en} | zh=${counts.md_facilities_zh} | errors=${errors.length} | warnings=${warnings.length}`
    );
    console.log(`JSON report: ${path.relative(ROOT, REPORT_JSON)}`);
    console.log(`MD report: ${path.relative(ROOT, REPORT_MD)}`);
    console.log(`Repair JSON: ${path.relative(ROOT, REPAIR_JSON)}`);
    console.log(`Repair MD: ${path.relative(ROOT, REPAIR_MD)}`);
    if (!summary.pass) process.exit(2);
  } catch (error) {
    console.error(`Facilities parity audit error: ${error.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

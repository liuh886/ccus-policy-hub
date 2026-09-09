/**
 * Export commands: publish the SQLite SSOT to derived artifacts.
 *
 * Moved verbatim from `logic/manage.mjs` (behavior-preserving split) with
 * two mechanical substitutions:
 * - `__dirname` -> `LOGIC_DIR` (same directory, see `logic/db.mjs`);
 * - the local `translate` closure -> shared `createTranslator` from
 *   `scripts/lib/i18n-translate.mjs` (identical semantics, single contract).
 */

import fs from 'fs';
import path from 'path';
import { resolveFacilityCoordinates } from '../../../../scripts/content-export-utils.mjs';
import {
  REVIEWER_PLACEHOLDER,
  createTranslator,
} from '../../../../scripts/lib/i18n-translate.mjs';
import { LEGACY_I18N_PATH, LOGIC_DIR, loadDb } from '../db.mjs';

export async function dbExportMd(
  SQL,
  {
    db: injectedDb = null,
    contentRoot = null,
    dictPath = LEGACY_I18N_PATH,
  } = {}
) {
  // Test seam: pass { db } to run against an in-memory database without
  // touching the master file; { contentRoot, dictPath } redirect file IO.
  // Production callers pass only SQL, so default behavior is unchanged.
  const db = injectedDb ?? loadDb(SQL);
  const auditPass = db.get(
    "SELECT value FROM db_meta WHERE key = 'last_audit_pass'"
  );
  if (!auditPass || auditPass.value !== 'true') {
    console.warn(
      'WARNING: Export proceeding without full audit pass. (Gate B2 Bypassed for development)'
    );
  }

  const deepClean = (obj) => {
    if (Array.isArray(obj)) return obj.map(deepClean);
    if (obj !== null && typeof obj === 'object') {
      const n = {};
      Object.keys(obj)
        .sort()
        .forEach((k) => {
          const v = deepClean(obj[k]);
          if (v !== undefined) n[k] = v;
        });
      return Object.keys(n).length > 0 ? n : undefined;
    }
    return obj === null ? undefined : obj;
  };
  const cleanStr = (s) => (s || '').replace(/\n/g, '\n').trim();

  const dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
  const translate = createTranslator(dict);
  // Deterministic audit-date fallback: records without their own
  // provenance_last_audit_date inherit the dataset as-of date (MAX over all
  // audit dates), never the wall-clock export date. Export output must be a
  // pure function of the database file, so regeneration is byte-identical.
  const datasetAsOf =
    db.get(`SELECT MAX(d) AS m FROM (
      SELECT provenance_last_audit_date AS d FROM policies
      UNION ALL SELECT provenance_last_audit_date FROM facilities
      UNION ALL SELECT provenance_last_audit_date FROM country_profiles
    )`)?.m ?? null;
  const CONTENT_ROOT =
    contentRoot ?? path.join(LOGIC_DIR, '../../../src/content');

  db.all('SELECT * FROM policies').forEach((p) => {
    const analysis = {};
    db.all('SELECT * FROM policy_analysis WHERE policy_id=?', [p.id]).forEach(
      (a) => {
        analysis[a.dimension] = {
          score: a.score,
          label: a.label,
          evidence: a.evidence,
          citation: a.citation,
          auditNote: a.audit_note,
        };
      }
    );
    const relatedFacilities = db
      .all(
        'SELECT facility_id FROM policy_facility_links WHERE policy_id = ? ORDER BY facility_id',
        [p.id]
      )
      .map((r) => r.facility_id);

    ['en', 'zh'].forEach((lang) => {
      const i = db.get(
        'SELECT * FROM policy_i18n WHERE policy_id=? AND lang=?',
        [p.id, lang]
      );
      if (!i) return;
      const fm = deepClean({
        id: p.id,
        title: i.title,
        country: translate(p.country, 'country', lang),
        year: p.year,
        status: translate(p.status, 'status', lang),
        category: translate(p.category, 'category', lang),
        pubDate: p.pub_date,
        reviewStatus: p.review_status,
        legalWeight: p.legal_weight,
        source: p.source,
        url: p.url,
        description: (i.description || '')
          .substring(0, 500)
          .replace(/\n/g, ' '),
        analysis,
        impactAnalysis: JSON.parse(i.impact_analysis_json || '{}'),
        evolution: JSON.parse(i.evolution_json || '{}'),
        regulatory: JSON.parse(i.regulatory_json || '{}'),
        relatedFacilities,
        provenance: {
          author: p.provenance_author,
          reviewer: p.provenance_reviewer,
          lastAuditDate: p.provenance_last_audit_date,
        },
      });
      const dir = path.join(CONTENT_ROOT, 'policies', lang);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, `${p.id}.md`),
        `---\n${JSON.stringify(fm, null, 2)}\n---\n\n${cleanStr(i.description)}\n`
      );
    });
  });

  db.all('SELECT * FROM facilities').forEach((f) => {
    const relatedPolicies = db
      .all('SELECT policy_id FROM policy_facility_links WHERE facility_id=?', [
        f.id,
      ])
      .map((r) => r.policy_id);
    ['en', 'zh'].forEach((lang) => {
      const i = db.get(
        'SELECT * FROM facility_i18n WHERE facility_id=? AND lang=?',
        [f.id, lang]
      );
      if (!i) return;
      const partners = db
        .all(
          'SELECT partner FROM facility_partners WHERE facility_id=? AND lang=? ORDER BY order_index',
          [f.id, lang]
        )
        .map((r) => r.partner);
      const links = db
        .all(
          'SELECT link FROM facility_links WHERE facility_id=? AND lang=? ORDER BY order_index',
          [f.id, lang]
        )
        .map((r) => r.link);

      const displayCountry = translate(f.country, 'country', lang);
      const displayStatus = translate(f.status, 'status', lang);

      let description = i.description;
      if (!description || description.trim() === i.name) {
        if (lang === 'zh') {
          description = `### 项目概览\n\n该项目位于 ${displayCountry}${i.region ? ` (${i.region})` : ''}，属于 ${i.sector || 'CCUS'} 领域。设施类型为 ${i.type || '捕集设施'}，当前状态为 ${displayStatus}。${i.hub ? `作为 ${i.hub} 枢纽的一部分，` : ''}${i.operator ? `由 ${i.operator} 负责运营。` : ''}`;
        } else {
          description = `### Project Overview\n\nThis project is located in ${displayCountry}${i.region ? ` (${i.region})` : ''}, within the ${i.sector || 'CCUS'} sector. The facility is classified as ${i.type || 'Capture'} and is currently ${displayStatus}. ${i.hub ? `As part of the ${i.hub} hub, ` : ''}${i.operator ? `it is operated by ${i.operator}.` : ''}`;
        }
      }

      const coordinates = resolveFacilityCoordinates({
        country: f.country,
        precision: f.precision || 'country',
        lat: f.lat,
        lng: f.lng,
        defaultFallback: null,
      });

      const fm = deepClean({
        id: f.id,
        name: i.name,
        lang,
        country: displayCountry,
        region: i.region,
        type: i.type,
        status: displayStatus,
        announcedCapacityMin: f.announced_capacity_min,
        announcedCapacityMax: f.announced_capacity_max,
        announcedCapacityRaw: f.announced_capacity_raw,
        estimatedCapacity: f.estimated_capacity,
        coordinates,
        precision: f.precision || 'country',
        sector: i.sector,
        fateOfCarbon: i.fate_of_carbon,
        hub: i.hub,
        operator: i.operator,
        captureTechnology: i.capture_technology,
        storageType: i.storage_type,
        investmentScale: f.investment_scale,
        phase: i.phase,
        announcement: i.announcement,
        fid: i.fid,
        operation: i.operation,
        suspensionDate: i.suspension_date,
        relatedPolicies: relatedPolicies.sort(),
        partners: partners.sort(),
        links: links.sort(),
        provenance: {
          author: f.provenance_author || 'IEA Ingestion',
          reviewer: f.provenance_reviewer || REVIEWER_PLACEHOLDER,
          lastAuditDate: f.provenance_last_audit_date || datasetAsOf,
        },
      });
      const dir = path.join(CONTENT_ROOT, 'facilities', lang);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, `${f.id}.md`),
        `---\n${JSON.stringify(fm, null, 2)}\n---\n\n${cleanStr(description)}\n`
      );
    });
  });

  db.all('SELECT * FROM country_profiles').forEach((c) => {
    ['en', 'zh'].forEach((lang) => {
      const i = db.get(
        'SELECT * FROM country_i18n WHERE country_id=? AND lang=?',
        [c.id, lang]
      );
      if (!i) return;
      const fm = deepClean({
        id: c.id,
        name: i.name,
        lang,
        region: c.region,
        summary: i.summary,
        regulatory: {
          pore_space_rights: i.pore_space_rights,
          liability_transfer: i.liability_transfer,
          liability_period: i.liability_period,
          financial_assurance: i.financial_assurance,
          permitting_lead_time: i.permitting_lead_time,
          co2_definition: i.co2_definition,
          cross_border_rules: i.cross_border_rules,
        },
        maturity: {
          x: c.maturity_x || 0,
          y: c.maturity_y || 0,
        },
        strategicTargets: {
          capture2030: c.capture_2030,
          storage2050: c.storage_2050,
          netZeroYear: c.net_zero_year,
        },
        provenance: {
          author: c.provenance_author || 'System',
          reviewer:
            c.provenance_reviewer && c.provenance_reviewer.trim() !== ''
              ? c.provenance_reviewer
              : REVIEWER_PLACEHOLDER,
          lastAuditDate: c.provenance_last_audit_date || datasetAsOf,
        },
      });
      const dir = path.join(CONTENT_ROOT, 'countries', lang);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, `${c.id.toLowerCase().replace(/ /g, '-')}.md`),
        `---\n${JSON.stringify(fm, null, 2)}\n---\n\n${cleanStr(i.summary)}\n`
      );
    });
  });

  // Export is read-only on the database: no timestamps are stamped back into
  // db_meta (a wall-clock write would dirty the SSOT on every export and
  // break byte-identical regeneration). All DB writes go through
  // scripts/lib/db-write.mjs.
  console.log('EXPORT DONE.');
}

export async function dbExportI18n(SQL) {
  const db = loadDb(SQL);
  console.log('EXPORTING I18N DICTIONARY...');

  const dict = {
    countries: {},
    regions: {},
    sectors: {},
    types: {},
    fates: {},
    sourceAliases: {},
    ui: { categories: {}, status: {}, dimensions: {} },
  };

  db.all('SELECT alias, canonical FROM dict_country_alias').forEach(
    (r) => (dict.countries[r.alias] = r.canonical)
  );
  db.all('SELECT en, zh FROM dict_region_alias').forEach(
    (r) => (dict.regions[r.en] = r.zh)
  );
  db.all('SELECT alias, canonical FROM dict_source_alias').forEach(
    (r) => (dict.sourceAliases[r.alias] = r.canonical)
  );

  const domains = { sector: 'sectors', type: 'types', fate: 'fates' };
  db.all('SELECT domain, canonical, zh FROM dict_term').forEach((r) => {
    const plural = domains[r.domain];
    if (plural) dict[plural][r.canonical] = r.zh;
  });

  db.all('SELECT key, zh, en FROM ui_category').forEach(
    (r) => (dict.ui.categories[r.key] = { zh: r.zh, en: r.en })
  );
  db.all('SELECT key, zh, en FROM ui_status').forEach(
    (r) => (dict.ui.status[r.key] = { zh: r.zh, en: r.en })
  );
  db.all(
    'SELECT key, label_zh, label_en, desc_zh, desc_en FROM ui_dimension'
  ).forEach(
    (r) =>
      (dict.ui.dimensions[r.key] = {
        label: { zh: r.label_zh, en: r.label_en },
        desc: { zh: r.desc_zh, en: r.desc_en },
      })
  );

  fs.writeFileSync(LEGACY_I18N_PATH, JSON.stringify(dict, null, 2));
  console.log('EXPORT I18N DONE.');
}

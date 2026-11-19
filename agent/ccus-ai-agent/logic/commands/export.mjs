/**
 * Export commands: publish the SQLite SSOT to derived artifacts.
 *
 * Uses shared `projectFacilityForLang` from `logic/facility-projector.mjs`
 * (single canonical projector shared with `audit-facilities-parity.mjs`) and
 * bulk Map preloading to avoid per-row N+1 SQLite queries.
 */

import fs from 'fs';
import path from 'path';
import {
  REVIEWER_PLACEHOLDER,
  createTranslator,
} from '../../../../scripts/lib/i18n-translate.mjs';
import { LEGACY_I18N_PATH, LOGIC_DIR, getDatasetAsOf, loadDb } from '../db.mjs';
import {
  deepClean,
  groupBy,
  indexBy,
  normalizeBody,
  projectFacilityForLang,
} from '../facility-projector.mjs';

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

  const dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
  const translate = createTranslator(dict);
  // Deterministic audit-date fallback: records without their own
  // provenance_last_audit_date inherit the dataset as-of date (MAX over all
  // audit dates), never the wall-clock export date. Export output must be a
  // pure function of the database file, so regeneration is byte-identical.
  const datasetAsOf = getDatasetAsOf(db);
  const CONTENT_ROOT =
    contentRoot ?? path.join(LOGIC_DIR, '../../../src/content');

  for (const entity of ['policies', 'facilities', 'countries']) {
    for (const lang of ['en', 'zh']) {
      fs.mkdirSync(path.join(CONTENT_ROOT, entity, lang), { recursive: true });
    }
  }

  // Bulk-preload all relation tables once to avoid per-row N+1 SQLite queries.
  const allPolicyFacilityLinks = db.all(
    'SELECT policy_id, facility_id FROM policy_facility_links ORDER BY policy_id, facility_id'
  );
  const facilitiesByPolicy = groupBy(
    allPolicyFacilityLinks,
    (r) => r.policy_id
  );
  const policiesByFacility = groupBy(allPolicyFacilityLinks, (r) =>
    String(r.facility_id)
  );

  const policyAnalysisByPolicy = groupBy(
    db.all('SELECT * FROM policy_analysis'),
    (r) => r.policy_id
  );
  const policyI18nMap = indexBy(
    db.all('SELECT * FROM policy_i18n'),
    (r) => `${r.policy_id}::${r.lang}`
  );

  db.all('SELECT * FROM policies').forEach((p) => {
    const analysis = {};
    for (const a of policyAnalysisByPolicy.get(p.id) ?? []) {
      analysis[a.dimension] = {
        score: a.score,
        label: a.label,
        evidence: a.evidence,
        citation: a.citation,
        auditNote: a.audit_note,
      };
    }
    const relatedFacilities = (facilitiesByPolicy.get(p.id) ?? []).map(
      (r) => r.facility_id
    );

    ['en', 'zh'].forEach((lang) => {
      const i = policyI18nMap.get(`${p.id}::${lang}`);
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
        scope: i.scope,
        description: (i.description || '')
          .substring(0, 500)
          .replace(/\n/g, ' '),
        tags: JSON.parse(i.tags_json || '[]'),
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
      fs.writeFileSync(
        path.join(CONTENT_ROOT, 'policies', lang, `${p.id}.md`),
        `---\n${JSON.stringify(fm, null, 2)}\n---\n\n${normalizeBody(i.description)}\n`
      );
    });
  });

  const facilityI18nMap = indexBy(
    db.all('SELECT * FROM facility_i18n'),
    (r) => `${r.facility_id}::${r.lang}`
  );
  const facilityPartnersMap = groupBy(
    db.all(
      'SELECT facility_id, lang, partner FROM facility_partners ORDER BY facility_id, lang, order_index'
    ),
    (r) => `${r.facility_id}::${r.lang}`
  );
  const facilityLinksMap = groupBy(
    db.all(
      'SELECT facility_id, lang, link FROM facility_links ORDER BY facility_id, lang, order_index'
    ),
    (r) => `${r.facility_id}::${r.lang}`
  );
  const facilityNewsMap = groupBy(
    db.all(
      `SELECT facility_id, lang, url, title, publisher, published_date, tier
       FROM facility_news ORDER BY facility_id, lang, order_index`
    ),
    (r) => `${r.facility_id}::${r.lang}`
  );

  db.all('SELECT * FROM facilities').forEach((f) => {
    const facilityKey = String(f.id);
    const relatedPolicies = (policiesByFacility.get(facilityKey) ?? []).map(
      (r) => r.policy_id
    );
    ['en', 'zh'].forEach((lang) => {
      const i = facilityI18nMap.get(`${facilityKey}::${lang}`);
      if (!i) return;
      const partners = (
        facilityPartnersMap.get(`${facilityKey}::${lang}`) ?? []
      ).map((r) => r.partner);
      const links = (facilityLinksMap.get(`${facilityKey}::${lang}`) ?? []).map(
        (r) => r.link
      );
      const news = facilityNewsMap.get(`${facilityKey}::${lang}`) ?? [];

      const projected = projectFacilityForLang({
        f,
        i,
        lang,
        partners,
        links,
        news,
        relatedPolicies,
        translate,
        datasetAsOf,
      });

      fs.writeFileSync(
        path.join(CONTENT_ROOT, 'facilities', lang, `${f.id}.md`),
        `---\n${JSON.stringify(projected.frontmatter, null, 2)}\n---\n\n${projected.body}\n`
      );
    });
  });

  const countryI18nMap = indexBy(
    db.all('SELECT * FROM country_i18n'),
    (r) => `${r.country_id}::${r.lang}`
  );

  db.all('SELECT * FROM country_profiles').forEach((c) => {
    ['en', 'zh'].forEach((lang) => {
      const i = countryI18nMap.get(`${c.id}::${lang}`);
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
        governanceDeployment: {
          deploymentCapacityMtpa: c.deployment_capacity_mtpa || 0,
          governanceCapabilityIndex: c.governance_capability_index || 0,
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
      fs.writeFileSync(
        path.join(
          CONTENT_ROOT,
          'countries',
          lang,
          `${c.id.toLowerCase().replace(/ /g, '-')}.md`
        ),
        `---\n${JSON.stringify(fm, null, 2)}\n---\n\n${normalizeBody(i.summary)}\n`
      );
    });
  });

  // Export is read-only on the database: no timestamps are stamped back into
  // db_meta (a wall-clock write would dirty the SSOT on every export and
  // break byte-identical regeneration). All DB writes go through
  // scripts/lib/db-write.mjs.
  console.log('EXPORT DONE.');
}

export async function dbExportI18n(
  SQL,
  { db: injectedDb = null, dictPath = LEGACY_I18N_PATH } = {}
) {
  const db = injectedDb ?? loadDb(SQL);
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

  fs.writeFileSync(dictPath, JSON.stringify(dict, null, 2));
  console.log('EXPORT I18N DONE.');
}

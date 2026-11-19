/**
 * Canonical facility projection shared by Markdown export (`commands/export.mjs`)
 * and the facilities parity audit (`audit-facilities-parity.mjs`).
 *
 * Single home for frontmatter deep-cleaning, description fallback, coordinate
 * resolution, sorted relation lists, and provenance defaults so export and
 * parity verification can never drift apart.
 */

import { resolveFacilityCoordinates } from '../../../scripts/content-export-utils.mjs';
import { REVIEWER_PLACEHOLDER } from '../../../scripts/lib/i18n-translate.mjs';

export function normalizeBody(input) {
  return String(input ?? '')
    .replace(/\r\n/g, '\n')
    .trim();
}

export function deepClean(obj) {
  if (Array.isArray(obj)) return obj.map(deepClean);
  if (obj !== null && typeof obj === 'object') {
    const cleaned = {};
    for (const key of Object.keys(obj).sort()) {
      const value = deepClean(obj[key]);
      if (value !== undefined) cleaned[key] = value;
    }
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }
  return obj === null ? undefined : obj;
}

export function indexBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) map.set(keyFn(row), row);
  return map;
}

export function groupBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    let bucket = map.get(key);
    if (!bucket) {
      bucket = [];
      map.set(key, bucket);
    }
    bucket.push(row);
  }
  return map;
}

export function fallbackFacilityDescription({
  lang,
  displayCountry,
  displayStatus,
  i,
}) {
  if (lang === 'zh') {
    return `### 项目概览

该项目位于 ${displayCountry}${i.region ? ` (${i.region})` : ''}，属于 ${i.sector || 'CCUS'} 领域。设施类型为 ${i.type || '捕集设施'}，当前状态为 ${displayStatus}。${i.hub ? `作为 ${i.hub} 枢纽的一部分，` : ''}${i.operator ? `由 ${i.operator} 负责运营。` : ''}`;
  }
  return `### Project Overview

This project is located in ${displayCountry}${i.region ? ` (${i.region})` : ''}, within the ${i.sector || 'CCUS'} sector. The facility is classified as ${i.type || 'Capture'} and is currently ${displayStatus}. ${i.hub ? `As part of the ${i.hub} hub, ` : ''}${i.operator ? `it is operated by ${i.operator}.` : ''}`;
}

/**
 * Project curated, tier-ordered facility news rows into frontmatter shape.
 * Order is meaningful (press releases first), so it is preserved as-is.
 */
export function projectFacilityNews(news = []) {
  return news.map((r) => ({
    url: r.url,
    title: r.title,
    publisher: r.publisher,
    date: r.published_date,
    tier: r.tier,
  }));
}

export function projectFacilityForLang({
  f,
  i,
  lang,
  partners = [],
  links = [],
  news = [],
  relatedPolicies = [],
  translate = (key) => key,
  datasetAsOf = null,
}) {
  const displayCountry = translate(f.country ?? '', 'country', lang) ?? '';
  const displayStatus = translate(f.status ?? '', 'status', lang) ?? '';

  const coordinates = resolveFacilityCoordinates({
    country: f.country,
    precision: f.precision || 'country',
    lat: f.lat,
    lng: f.lng,
    defaultFallback: null,
  });

  const rawDescription = i.description;
  const trimmedDescription = String(rawDescription ?? '').trim();
  const trimmedName = String(i.name ?? '').trim();
  const description =
    !trimmedDescription || (trimmedName && trimmedDescription === trimmedName)
      ? fallbackFacilityDescription({
          lang,
          displayCountry,
          displayStatus,
          i,
        })
      : rawDescription;

  const frontmatter = deepClean({
    id: String(f.id),
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
    relatedPolicies: [...relatedPolicies].map(String).sort(),
    partners: [...partners].map(String).sort(),
    links: [...links].map(String).sort(),
    news: projectFacilityNews(news),
    provenance: {
      author: f.provenance_author || 'IEA Ingestion',
      reviewer: f.provenance_reviewer || REVIEWER_PLACEHOLDER,
      lastAuditDate: f.provenance_last_audit_date || datasetAsOf,
    },
  });

  return {
    frontmatter,
    body: normalizeBody(description),
    displayCountry,
    displayStatus,
  };
}

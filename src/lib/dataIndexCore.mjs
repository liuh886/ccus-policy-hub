import { isVerifiedProjectEvidence } from './relationshipTrust.mjs';
import { sortFacilities } from './facilityPagination.mjs';
import { toFacilityListItem } from './facilityListPayload.mjs';
import { computeFacilityStats } from './facilityListQuery.mjs';
import { toMapFacility } from './mapPayload.mjs';

export const POLICY_RELATED_FACILITIES_SSR_CAP = 12;

const SPECIAL_COUNTRY_LABELS_ZH = Object.freeze({
  Unknown: '未知',
  'Multiple Europe': '欧洲多国',
  'Chinese Taipei': '中国台北',
  International: '国际',
  Transnational: '跨国',
});

export function normalizePolicySlug(id) {
  return String(id ?? '').replace(/^(zh|en)\//, '');
}

/**
 * Trust priority rank for policy-facility links (lower is higher priority):
 * 0: verified project evidence
 * 1: unverified evidence
 * 2: sector relevance
 * 3: subnational match
 * 4: country context
 * 5: unclassified / missing
 */
export function getRelationshipTrustRank(relationship) {
  if (isVerifiedProjectEvidence(relationship)) return 0;
  switch (relationship?.link_type) {
    case 'evidence':
      return 1;
    case 'sector':
      return 2;
    case 'subnational_region':
      return 3;
    case 'country':
      return 4;
    default:
      return 5;
  }
}

export function buildRelationshipByPair(records = []) {
  const map = new Map();
  for (const record of records ?? []) {
    if (!record?.policy_id || !record?.facility_id) continue;
    const key = `${record.policy_id}::${record.facility_id}`;
    const existing = map.get(key);
    if (
      !existing ||
      getRelationshipTrustRank(record) < getRelationshipTrustRank(existing)
    ) {
      map.set(key, record);
    }
  }
  return map;
}

export function buildLocalizationsByPolicyId(records = []) {
  const map = new Map();
  for (const record of records ?? []) {
    const policyId = record?.policy_id;
    if (!policyId) continue;
    const list = map.get(policyId);
    if (list) {
      list.push(record);
    } else {
      map.set(policyId, [record]);
    }
  }
  return map;
}

export function sortRelatedFacilities(
  facilities = [],
  policyId,
  relationshipByPair
) {
  const slug = normalizePolicySlug(policyId);
  return [...(facilities ?? [])].sort((a, b) => {
    const relA =
      relationshipByPair?.get(`${slug}::${a?.id}`) ??
      relationshipByPair?.get(`${policyId}::${a?.id}`);
    const relB =
      relationshipByPair?.get(`${slug}::${b?.id}`) ??
      relationshipByPair?.get(`${policyId}::${b?.id}`);

    const rankDiff =
      getRelationshipTrustRank(relA) - getRelationshipTrustRank(relB);
    if (rankDiff !== 0) return rankDiff;

    const capA = Number(a?.data?.estimatedCapacity) || 0;
    const capB = Number(b?.data?.estimatedCapacity) || 0;
    if (capB !== capA) return capB - capA;

    return String(a?.id ?? '').localeCompare(String(b?.id ?? ''), undefined, {
      numeric: true,
    });
  });
}

export function sliceRelatedFacilities(
  sortedFacilities = [],
  cap = POLICY_RELATED_FACILITIES_SSR_CAP
) {
  const list = Array.isArray(sortedFacilities) ? sortedFacilities : [];
  const safeCap = Math.max(0, Number(cap) || 0);
  return {
    visible: list.slice(0, safeCap),
    total: list.length,
    hasMore: list.length > safeCap,
    cap: safeCap,
  };
}

export function normalizeCountryName(country, countryDict = {}) {
  const raw = String(country ?? '');
  return countryDict?.[raw] || raw;
}

export function translateCountryLabel(country, countryMap = {}) {
  const direct =
    countryMap?.[country]?.zh || SPECIAL_COUNTRY_LABELS_ZH[country];
  if (direct) return direct;

  if (!/[,\-/&，、]/.test(country)) return country;

  return country
    .split(/(\s*[-/,&，、]\s*)/)
    .map((part) => {
      if (/^\s*[-/,&，、]\s*$/.test(part)) return part;
      const trimmed = part.trim();
      return (
        countryMap?.[trimmed]?.zh ||
        SPECIAL_COUNTRY_LABELS_ZH[trimmed] ||
        trimmed
      );
    })
    .join('');
}

export function normalizeFacilityTypeLabel(type, lang = 'zh') {
  return lang !== 'en' && (type === 'Full chain' || type === 'fullchain')
    ? '全产业链'
    : type;
}

/**
 * @param {unknown} coordinates
 * @returns {coordinates is [number, number]}
 */
export function hasRenderableCoordinates(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return false;
  }
  const lat = Number(coordinates[0]);
  const lng = Number(coordinates[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false;
  }
  // `0.001, 0.001` is used in the dataset as a placeholder for missing coordinates.
  return !(Math.abs(lat) < 0.01 && Math.abs(lng) < 0.01);
}

export function buildMapFacilities(facilities = []) {
  const countryPrecisionTotals = new Map();

  for (const facility of facilities ?? []) {
    const { precision, country, coordinates } = facility?.data ?? {};
    if (precision !== 'country' || !hasRenderableCoordinates(coordinates)) {
      continue;
    }
    const key = String(country || '');
    const current = countryPrecisionTotals.get(key) || {
      lat: 0,
      lng: 0,
      count: 0,
    };
    current.lat += coordinates[0];
    current.lng += coordinates[1];
    current.count += 1;
    countryPrecisionTotals.set(key, current);
  }

  const canonicalCountryCoordinates = new Map(
    [...countryPrecisionTotals.entries()].map(([country, totals]) => [
      country,
      [
        Number((totals.lat / totals.count).toFixed(4)),
        Number((totals.lng / totals.count).toFixed(4)),
      ],
    ])
  );

  return (facilities ?? []).map((facility) => {
    const { id, data = {} } = facility;
    const isCountryPrecision = data.precision === 'country';
    const coordinates =
      isCountryPrecision &&
      canonicalCountryCoordinates.has(String(data.country))
        ? canonicalCountryCoordinates.get(String(data.country))
        : hasRenderableCoordinates(data.coordinates)
          ? data.coordinates
          : null;

    return toMapFacility({
      id,
      name: data.name,
      coordinates,
      precision: data.precision,
      status: data.status,
      estimatedCapacity: data.estimatedCapacity,
      announcedCapacityMax: data.announcedCapacityMax,
      type: data.type,
    });
  });
}

export function buildDirectoryMeta({
  facilities = [],
  sortedFacilities,
  lang = 'zh',
  countryMap = {},
} = {}) {
  const isEn = lang === 'en';
  const ordered = sortedFacilities ?? sortFacilities(facilities);

  const countries = Array.from(new Set(facilities.map((f) => f.data.country)))
    .sort()
    .map((canon) => ({
      canon,
      display: isEn ? canon : translateCountryLabel(canon, countryMap),
    }));

  const sectors = Array.from(new Set(facilities.map((f) => f.data.sector)))
    .filter(Boolean)
    .sort();
  const types = Array.from(
    new Set(
      facilities.map((f) => normalizeFacilityTypeLabel(f.data.type, lang))
    )
  ).sort();
  const statuses = Array.from(
    new Set(facilities.map((f) => f.data.status))
  ).sort();

  const listItems = ordered.map((facility) => ({
    ...toFacilityListItem(facility),
    type: normalizeFacilityTypeLabel(facility.data.type, lang),
  }));

  const initialStats = computeFacilityStats(listItems);
  const mapData = buildMapFacilities(ordered);

  return {
    countries,
    sectors,
    types,
    statuses,
    listItems,
    initialStats,
    mapData,
  };
}

/**
 * @param {{
 *   policies?: any[],
 *   facilities?: any[],
 *   lang?: 'zh' | 'en',
 *   relationshipByPair?: Map<string, any>,
 *   countryDict?: Record<string, string>,
 *   countryMap?: Record<string, Record<string, string>>,
 * }} params
 */
export function buildLocaleIndexData({
  policies = [],
  facilities = [],
  lang = 'zh',
  relationshipByPair,
  countryDict = {},
  countryMap = {},
} = {}) {
  const sortedFacilities = sortFacilities(facilities);

  const policyById = new Map();
  const policiesByCountry = new Map();
  for (const policy of policies) {
    policyById.set(policy.id, policy);
    const slug = normalizePolicySlug(policy.id);
    if (slug !== policy.id) policyById.set(slug, policy);

    const canonicalCountry = normalizeCountryName(
      policy.data?.country,
      countryDict
    );
    const group = policiesByCountry.get(canonicalCountry);
    if (group) group.push(policy);
    else policiesByCountry.set(canonicalCountry, [policy]);
  }

  const facilityById = new Map();
  const facilitiesByCountry = new Map();
  for (const facility of facilities) {
    facilityById.set(facility.id, facility);
    const canonicalCountry = normalizeCountryName(
      facility.data?.country,
      countryDict
    );
    const group = facilitiesByCountry.get(canonicalCountry);
    if (group) group.push(facility);
    else facilitiesByCountry.set(canonicalCountry, [facility]);
  }

  const allCountries = new Set([
    ...policiesByCountry.keys(),
    ...facilitiesByCountry.keys(),
  ]);
  const countrySummaryByCountry = new Map();
  for (const country of allCountries) {
    const countryPolicies = policiesByCountry.get(country) ?? [];
    const countryFacilities = facilitiesByCountry.get(country) ?? [];

    const aggregateAnalysis = {
      incentive: Math.max(
        ...countryPolicies.map((p) => p.data.analysis?.incentive?.score || 0),
        0
      ),
      statutory: Math.max(
        ...countryPolicies.map((p) => p.data.analysis?.statutory?.score || 0),
        0
      ),
      market: Math.max(
        ...countryPolicies.map((p) => p.data.analysis?.market?.score || 0),
        0
      ),
      strategic: Math.max(
        ...countryPolicies.map((p) => p.data.analysis?.strategic?.score || 0),
        0
      ),
      mrv: Math.max(
        ...countryPolicies.map((p) => p.data.analysis?.mrv?.score || 0),
        0
      ),
    };

    const stats = {
      policies: countryPolicies.length,
      facilities: countryFacilities.length,
      operational: countryFacilities
        .filter(
          (f) => f.data.status === 'Operational' || f.data.status === '运行中'
        )
        .reduce((acc, f) => acc + (f.data.estimatedCapacity || 0), 0),
      construction: countryFacilities
        .filter(
          (f) =>
            f.data.status === 'Under construction' || f.data.status === '建设中'
        )
        .reduce((acc, f) => acc + (f.data.estimatedCapacity || 0), 0),
      planned: countryFacilities
        .filter(
          (f) => f.data.status === 'Planned' || f.data.status === '计划中'
        )
        .reduce((acc, f) => acc + (f.data.estimatedCapacity || 0), 0),
    };

    countrySummaryByCountry.set(country, { stats, aggregateAnalysis });
  }

  const facilityMapByPolicy = new Map();
  const addFacilityToPolicy = (policySlug, facility) => {
    if (!policySlug || !facility) return;
    let map = facilityMapByPolicy.get(policySlug);
    if (!map) {
      map = new Map();
      facilityMapByPolicy.set(policySlug, map);
    }
    map.set(facility.id, facility);
  };

  for (const policy of policies) {
    const slug = normalizePolicySlug(policy.id);
    for (const facilityId of policy.data?.relatedFacilities ?? []) {
      const facility = facilityById.get(facilityId);
      if (facility) addFacilityToPolicy(slug, facility);
    }
  }

  for (const facility of facilities) {
    for (const policyId of facility.data?.relatedPolicies ?? []) {
      addFacilityToPolicy(normalizePolicySlug(policyId), facility);
    }
  }

  const relatedFacilitiesByPolicyId = new Map();
  for (const policy of policies) {
    const slug = normalizePolicySlug(policy.id);
    const candidates = facilityMapByPolicy.get(slug);
    relatedFacilitiesByPolicyId.set(
      slug,
      candidates
        ? sortRelatedFacilities(
            Array.from(candidates.values()),
            slug,
            relationshipByPair
          )
        : []
    );
  }

  const directoryMeta = buildDirectoryMeta({
    facilities,
    sortedFacilities,
    lang,
    countryMap,
  });

  return {
    policies,
    facilities,
    sortedFacilities,
    policyById,
    facilityById,
    policiesByCountry,
    facilitiesByCountry,
    countrySummaryByCountry,
    relatedFacilitiesByPolicyId,
    directoryMeta,
  };
}

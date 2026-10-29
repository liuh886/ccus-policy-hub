// Labels describe the recorded match; confidence never proves legal applicability.
export const relationshipCopy = {
  country: { zh: '同国背景关联', en: 'Country context' },
  subnational_region: { zh: '地方行政区匹配', en: 'Subnational match' },
  sector: { zh: '行业相关', en: 'Sector relevance' },
  evidence: { zh: '项目直接证据', en: 'Direct project evidence' },
  unknown: { zh: '类型待确认', en: 'Unclassified association' },
};

export function relationshipLabel(link, lang = 'en') {
  return (relationshipCopy[link?.link_type] || relationshipCopy.unknown)[lang];
}

export function isVerifiedProjectEvidence(link) {
  let source;
  try {
    source = new URL(link?.source_url);
  } catch {
    return false;
  }
  return (
    link?.link_type === 'evidence' &&
    link.review_status === 'verified' &&
    Boolean(link.evidence?.trim()) &&
    ['http:', 'https:'].includes(source.protocol)
  );
}

export function summarizeRelationships(rows) {
  const result = {
    total: rows.length,
    country_level: 0,
    subnational_level: 0,
    sector_level: 0,
    evidence_level: 0,
    unclassified: 0,
    verified_project_evidence: 0,
  };
  const fields = {
    country: 'country_level',
    subnational_region: 'subnational_level',
    sector: 'sector_level',
    evidence: 'evidence_level',
  };
  for (const row of rows) {
    result[fields[row.link_type] || 'unclassified'] += 1;
    if (isVerifiedProjectEvidence(row)) result.verified_project_evidence += 1;
  }
  return result;
}

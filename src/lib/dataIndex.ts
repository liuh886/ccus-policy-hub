import { getCollection, type CollectionEntry } from 'astro:content';
import relationships from '../../public/data/relationships.json';
import analysisLocales from '../../public/data/policy-analysis-localizations.json';
import i18nDict from '../data/i18n_dictionary.json';
import countryData from '../data/countries.json';
import {
  POLICY_RELATED_FACILITIES_SSR_CAP,
  buildLocalizationsByPolicyId,
  buildLocaleIndexData,
  buildRelationshipByPair,
  normalizeCountryName,
  normalizePolicySlug,
  sliceRelatedFacilities,
} from './dataIndexCore.mjs';

export {
  POLICY_RELATED_FACILITIES_SSR_CAP,
  normalizeCountryName,
  normalizePolicySlug,
  sliceRelatedFacilities,
};

export type Locale = 'zh' | 'en';
export type PolicyEntry =
  | CollectionEntry<'policies_zh'>
  | CollectionEntry<'policies_en'>;
export type FacilityEntry =
  | CollectionEntry<'facilities_zh'>
  | CollectionEntry<'facilities_en'>;

export interface RelationshipRecord {
  policy_id: string;
  facility_id: string;
  link_type?: string | null;
  confidence?: number | null;
  evidence?: string | null;
  source_url?: string | null;
  review_status?: string | null;
}

export interface LocalizationRecord {
  policy_id: string;
  dimension: string;
  lang: string;
  label: string;
  evidence: string;
  source_evidence: string;
  reviewed_at?: string;
}

export interface CountrySummary {
  stats: {
    policies: number;
    facilities: number;
    operational: number;
    construction: number;
    planned: number;
  };
  aggregateAnalysis: {
    incentive: number;
    statutory: number;
    market: number;
    strategic: number;
    mrv: number;
  };
}

export interface DirectoryMeta {
  countries: Array<{ canon: string; display: string }>;
  sectors: string[];
  types: string[];
  statuses: string[];
  listItems: Array<Record<string, unknown>>;
  initialStats: {
    count: number;
    capacity: number;
    operational: number;
    operationalCap: number;
    constructionCap: number;
  };
  mapData: Array<Record<string, unknown>>;
}

export interface LocaleDataIndex {
  policies: PolicyEntry[];
  facilities: FacilityEntry[];
  sortedFacilities: FacilityEntry[];
  policyById: Map<string, PolicyEntry>;
  facilityById: Map<string, FacilityEntry>;
  policiesByCountry: Map<string, PolicyEntry[]>;
  facilitiesByCountry: Map<string, FacilityEntry[]>;
  countrySummaryByCountry: Map<string, CountrySummary>;
  relatedFacilitiesByPolicyId: Map<string, FacilityEntry[]>;
  directoryMeta: DirectoryMeta;
}

let cachedRelationshipByPair: Map<string, RelationshipRecord> | null = null;
let cachedLocalizationsByPolicyId: Map<string, LocalizationRecord[]> | null =
  null;
const localeIndexPromises = new Map<Locale, Promise<LocaleDataIndex>>();

export function getRelationshipByPair(): Map<string, RelationshipRecord> {
  if (!cachedRelationshipByPair) {
    cachedRelationshipByPair = buildRelationshipByPair(
      relationships.records as RelationshipRecord[]
    ) as Map<string, RelationshipRecord>;
  }
  return cachedRelationshipByPair;
}

export function getLocalizationsByPolicyId(): Map<
  string,
  LocalizationRecord[]
> {
  if (!cachedLocalizationsByPolicyId) {
    cachedLocalizationsByPolicyId = buildLocalizationsByPolicyId(
      analysisLocales.records as LocalizationRecord[]
    ) as Map<string, LocalizationRecord[]>;
  }
  return cachedLocalizationsByPolicyId;
}

export function getLocaleDataIndex(lang: Locale): Promise<LocaleDataIndex> {
  const normalizedLang: Locale = lang === 'en' ? 'en' : 'zh';
  const existing = localeIndexPromises.get(normalizedLang);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    const isEn = normalizedLang === 'en';
    const [policies, facilities] = await Promise.all([
      getCollection(isEn ? 'policies_en' : 'policies_zh'),
      getCollection(isEn ? 'facilities_en' : 'facilities_zh'),
    ]);

    return buildLocaleIndexData({
      policies,
      facilities,
      lang: normalizedLang,
      relationshipByPair: getRelationshipByPair(),
      countryDict: i18nDict.countries as Record<string, string>,
      countryMap: countryData as Record<string, Record<string, string>>,
    }) as LocaleDataIndex;
  })().catch((error) => {
    localeIndexPromises.delete(normalizedLang);
    throw error;
  });

  localeIndexPromises.set(normalizedLang, promise);
  return promise;
}

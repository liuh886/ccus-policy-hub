/**
 * comparePresets.mjs
 *
 * Shareable comparison entry points for /compare/ (proposal §4 L1).
 *
 * - `DEFAULT_COMPARE_COUNTRIES` guarantees a meaningful first paint: direct
 *   visits with no selection render these four systems instead of an
 *   empty state.
 * - `COMPARE_PRESETS` are curated, frontend-only groupings. Each preset
 *   carries a `copyKey` into `governanceComparisonCopy` (labels) and a list
 *   of canonical country keys (see `src/data/countries.json`).
 * - `resolveCountryToken` normalises `?countries=` URL tokens (ISO2 codes,
 *   slugs, zh names, canonical English names) to canonical keys so shared
 *   links resolve unambiguously against the existing `countryMap`.
 */

export const MAX_COMPARE_COUNTRIES = 6;

export const DEFAULT_COMPARE_COUNTRIES = Object.freeze([
  'United States',
  'China',
  'United Kingdom',
  'Norway',
]);

export const COMPARE_PRESETS = Object.freeze([
  Object.freeze({
    id: 'big3',
    copyKey: 'presetBig3',
    countries: Object.freeze(['United States', 'China', 'Germany']),
  }),
  Object.freeze({
    id: 'anglosphere',
    copyKey: 'presetAnglo',
    countries: Object.freeze(['United States', 'United Kingdom', 'Australia']),
  }),
  Object.freeze({
    id: 'gulf',
    copyKey: 'presetGulf',
    countries: Object.freeze(['United Arab Emirates', 'Saudi Arabia']),
  }),
  Object.freeze({
    id: 'nordic',
    copyKey: 'presetNordic',
    countries: Object.freeze(['Norway', 'Denmark', 'Iceland']),
  }),
]);

const ISO2_TO_COUNTRY = Object.freeze({
  us: 'United States',
  cn: 'China',
  gb: 'United Kingdom',
  uk: 'United Kingdom',
  no: 'Norway',
  de: 'Germany',
  au: 'Australia',
  ca: 'Canada',
  ae: 'United Arab Emirates',
  sa: 'Saudi Arabia',
  qa: 'Qatar',
  dk: 'Denmark',
  is: 'Iceland',
  nl: 'Netherlands',
  fr: 'France',
  jp: 'Japan',
  kr: 'South Korea',
  in: 'India',
  br: 'Brazil',
  my: 'Malaysia',
  it: 'Italy',
  es: 'Spain',
  se: 'Sweden',
  fi: 'Finland',
});

export function slugifyCountry(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Map any country spelling to its canonical English key in `countryMap`
 * (keys of `src/data/countries.json`). Returns `null` when unresolvable.
 */
export function countryKeyOf(value, countryMap = {}) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (countryMap[raw]) return raw;
  const lower = raw.toLowerCase();
  const slug = slugifyCountry(raw);
  for (const [key, translations] of Object.entries(countryMap)) {
    if (key.toLowerCase() === lower) return key;
    if (String(translations?.en || '').toLowerCase() === lower) return key;
    if (translations?.zh && raw === translations.zh) return key;
    if (slug && slugifyCountry(translations?.en || '') === slug) return key;
  }
  return null;
}

export function resolveCountryToken(token, countryMap = {}) {
  const raw = String(token || '').trim();
  if (!raw) return null;
  const iso = ISO2_TO_COUNTRY[raw.toLowerCase()];
  if (iso && countryMap[iso]) return iso;
  return countryKeyOf(raw, countryMap);
}

export function countriesToQuery(countries = []) {
  return countries.map((country) => slugifyCountry(country)).join(',');
}

export function queryToCountries(query, countryMap = {}) {
  return String(query || '')
    .split(',')
    .map((token) => resolveCountryToken(token, countryMap))
    .filter(Boolean)
    .filter((country, index, list) => list.indexOf(country) === index)
    .slice(0, MAX_COMPARE_COUNTRIES);
}
